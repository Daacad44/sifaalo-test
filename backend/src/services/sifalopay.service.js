import crypto from 'node:crypto';
import axios from 'axios';
import config from '../config/index.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';
import { getPaymentMethod } from '../constants/paymentMethods.js';

/**
 * SifaloPay payment client.
 *
 * Authenticates with HTTP Basic Auth using the merchant dashboard credentials:
 *   - API username (SIFALO_API_USERNAME)
 *   - API key (SIFALO_API_KEY) — treat like a password; backend only.
 *
 * Live API reference: official Sifalo Pay WooCommerce plugin
 * (POST https://api.sifalopay.com/gateway/ with Basic auth).
 *
 * When `config.testMode` is true the client is fully simulated.
 */
class SifaloPayService {
  constructor() {
    this.testMode = config.testMode;
    this.cfg = config.sifalo;

    this.http = axios.create({
      timeout: this.cfg.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  // ------------------------------------------------------------------ helpers

  /** HTTP Basic Auth: base64(api_username:api_key) */
  authHeaders() {
    if (!this.cfg.apiUsername || !this.cfg.apiKey) {
      return { 'Content-Type': 'application/json' };
    }
    const token = Buffer.from(
      `${this.cfg.apiUsername}:${this.cfg.apiKey}`,
      'utf8'
    ).toString('base64');
    return {
      'Content-Type': 'application/json',
      Authorization: `Basic ${token}`,
    };
  }

  assertCredentials() {
    if (this.testMode) return;
    if (!this.cfg.apiUsername || !this.cfg.apiKey) {
      throw ApiError.gateway(
        'SifaloPay credentials are not configured. Set SIFALO_API_USERNAME and SIFALO_API_KEY from your merchant dashboard (https://pay.sifalo.com/business/merchant/api).',
        { code: 'MISSING_CREDENTIALS' }
      );
    }
  }

  static computeSignature(rawBody, secret) {
    return crypto
      .createHmac('sha256', secret || '')
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');
  }

  static safeCompare(a = '', b = '') {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  verifyWebhookSignature(rawBody, signature) {
    if (this.testMode || !this.cfg.webhookSecret) {
      return true;
    }
    if (!signature) return false;
    const expected = SifaloPayService.computeSignature(
      rawBody,
      this.cfg.webhookSecret
    );
    return SifaloPayService.safeCompare(expected, signature);
  }

  // ----------------------------------------------------------------- payments

  /**
   * Create a direct mobile-money charge via SifaloPay gateway API.
   * @returns {Promise<{transactionId:string,status:string,checkoutUrl?:string,raw:object}>}
   */
  async createPayment({
    order,
    customerPhone,
    paymentMethod,
    description,
    clientIp,
  }) {
    const wallet = getPaymentMethod(paymentMethod || order.paymentMethod);
    const gateway = wallet?.gateway || 'zaad';

    if (this.testMode) {
      return this.#simulateCreate(order, wallet);
    }

    this.assertCredentials();

    const requestBody = {
      amount: Number(order.amount),
      account: customerPhone,
      gateway,
      currency: this.cfg.currency,
      channel: this.cfg.channel,
      txn_order_id: order.id,
      url: this.cfg.storeUrl,
      ip: clientIp || '127.0.0.1',
      billing: {
        name: order.customerName,
        email: order.customerEmail,
        phone: customerPhone,
        address: description || `${order.customerName}, ${order.customerEmail}`,
      },
    };

    try {
      const { data } = await this.http.post(this.cfg.gatewayUrl, requestBody, {
        headers: this.authHeaders(),
      });
      return this.#parsePurchaseResponse(data, order);
    } catch (error) {
      throw this.#wrapHttpError(error, 'create payment');
    }
  }

  /**
   * Verify payment status via SifaloPay verify endpoint.
   */
  async verifyPayment(transactionId, orderId) {
    if (this.testMode) {
      return this.#simulateVerify(transactionId);
    }

    const body =
      transactionId && String(transactionId).length > 0
        ? { sid: transactionId, order_id: orderId }
        : { order_id: String(orderId) };

    try {
      const { data } = await this.http.post(this.cfg.verifyUrl, body, {
        headers: { 'Content-Type': 'application/json' },
      });
      return this.#parseVerifyResponse(data, transactionId, orderId);
    } catch (error) {
      throw this.#wrapHttpError(error, 'verify payment');
    }
  }

  #parsePurchaseResponse(data, order) {
    const code = String(data?.code ?? '');
    const transactionId =
      data?.sid || data?.transaction_id || data?.transactionId || order.id;

    // Official plugin: code 601 = payment received.
    if (code === '601') {
      return {
        transactionId: String(transactionId),
        status: 'PAID',
        raw: data,
      };
    }

    const friendly = this.#mapGatewayError(data);
    throw ApiError.gateway(friendly, { code: 'GATEWAY_ERROR', details: data });
  }

  #parseVerifyResponse(data, transactionId, orderId) {
    const code = String(data?.code ?? '');
    const txnId = data?.sid || transactionId || orderId;

    if (code === '601') {
      return {
        transactionId: String(txnId),
        status: 'PAID',
        raw: data,
      };
    }
    if (data?.status === 'failure') {
      return {
        transactionId: String(txnId),
        status: 'FAILED',
        raw: data,
      };
    }
    return {
      transactionId: String(txnId),
      status: 'PROCESSING',
      raw: data,
    };
  }

  #mapGatewayError(data) {
    const code = String(data?.code ?? '');
    const errors = {
      '602': 'Transaction failed. Please check your wallet number and try again.',
      '603': 'Insufficient balance. Please top up your wallet and try again.',
      '604': 'Invalid wallet number. Please verify and try again.',
      '605': 'Transaction timed out. Please try again.',
      '606': 'SifaloPay is temporarily unavailable. Please try again later.',
    };
    if (errors[code]) return errors[code];
    return (
      data?.response ||
      data?.message ||
      'SifaloPay could not complete the payment. Please try again.'
    );
  }

  #mapStatus(providerStatus) {
    const status = String(providerStatus || '').toLowerCase();
    if (['paid', 'success', 'successful', 'completed', 'approved', '601'].includes(status)) {
      return 'PAID';
    }
    if (['failed', 'declined', 'rejected', 'cancelled', 'canceled', 'error'].includes(status)) {
      return 'FAILED';
    }
    if (['processing', 'in_progress', 'pending_confirmation'].includes(status)) {
      return 'PROCESSING';
    }
    return 'PENDING';
  }

  // -------------------------------------------------------- test-mode helpers

  #simulateCreate(order, wallet) {
    const transactionId = `TEST-${Date.now()}-${crypto
      .randomBytes(4)
      .toString('hex')}`;
    const walletLabel = wallet?.label || order.paymentMethod || 'mobile wallet';
    logger.info(`[TEST MODE] Simulated SifaloPay payment created`, {
      orderId: order.id,
      transactionId,
      gateway: wallet?.gateway,
      amount: String(order.amount),
    });
    return Promise.resolve({
      transactionId,
      status: 'PROCESSING',
      checkoutUrl: `${config.sifalo.returnUrl}?orderId=${order.id}&simulate=1`,
      raw: {
        test_mode: true,
        code: 'processing',
        message: `Simulated ${walletLabel} payment prompt sent to ${order.customerPhone}.`,
        transaction_id: transactionId,
        gateway: wallet?.gateway,
        payment_method: wallet?.id || order.paymentMethod,
      },
    });
  }

  #simulateVerify(transactionId) {
    logger.info(`[TEST MODE] Simulated SifaloPay verification`, { transactionId });
    return Promise.resolve({
      transactionId,
      status: 'PAID',
      raw: {
        test_mode: true,
        code: '601',
        transaction_id: transactionId,
        status: 'paid',
        message: 'Simulated verification - marked as paid.',
      },
    });
  }

  buildSimulatedWebhook(order, outcome = 'PAID') {
    const status = outcome === 'FAILED' ? 'failed' : 'paid';
    const wallet = getPaymentMethod(order.paymentMethod);
    const payload = {
      event: `payment.${status}`,
      test_mode: true,
      data: {
        reference: order.id,
        transaction_id: order.transactionId,
        amount: Number(order.amount),
        currency: this.cfg.currency,
        status,
        gateway: wallet?.gateway,
        payment_method: wallet?.id || order.paymentMethod,
      },
      timestamp: new Date().toISOString(),
    };
    const signature = SifaloPayService.computeSignature(
      payload,
      this.cfg.webhookSecret
    );
    return { payload, signature };
  }

  #wrapHttpError(error, action) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return ApiError.gateway(
          `SifaloPay request timed out while trying to ${action}. Please try again.`,
          { code: 'GATEWAY_TIMEOUT' }
        );
      }
      if (!error.response) {
        return ApiError.gateway(
          `Could not reach SifaloPay to ${action}. Please check your connection and try again.`,
          { code: 'NETWORK_ERROR' }
        );
      }
      const data = error.response.data;
      logger.error(`SifaloPay ${action} failed`, {
        status: error.response.status,
        data,
      });
      const message =
        typeof data === 'object' && data !== null
          ? this.#mapGatewayError(data)
          : `SifaloPay rejected the request to ${action}.`;
      return ApiError.gateway(message, { code: 'GATEWAY_ERROR', details: data });
    }
    return error instanceof ApiError
      ? error
      : ApiError.gateway(`Unexpected error during ${action}.`);
  }
}

const sifaloPayService = new SifaloPayService();
export default sifaloPayService;
export { SifaloPayService };
