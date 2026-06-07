import crypto from 'node:crypto';
import axios from 'axios';
import config from '../config/index.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

/**
 * SifaloPay payment client.
 *
 * Everything (credentials, base URL, endpoint paths) is read from the
 * environment via `config`, so keys can be rotated and endpoints changed
 * WITHOUT modifying this source file.
 *
 * When `config.testMode` is true the client is fully simulated: no network
 * calls are made and deterministic fake responses are returned so the whole
 * order -> payment -> webhook -> status workflow can be exercised end to end.
 */
class SifaloPayService {
  constructor() {
    this.testMode = config.testMode;
    this.cfg = config.sifalo;

    this.http = axios.create({
      baseURL: this.cfg.baseUrl,
      timeout: this.cfg.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  // ------------------------------------------------------------------ helpers

  authHeaders() {
    return {
      'X-API-Key': this.cfg.apiKey,
      Authorization: `Bearer ${this.cfg.secretKey}`,
      ...(this.cfg.merchantId ? { 'X-Merchant-Id': this.cfg.merchantId } : {}),
    };
  }

  /**
   * Compute an HMAC-SHA256 signature of a raw payload using the webhook
   * secret. Used to validate inbound webhooks.
   */
  static computeSignature(rawBody, secret) {
    return crypto
      .createHmac('sha256', secret || '')
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');
  }

  /**
   * Constant-time comparison so webhook signature checks are not vulnerable to
   * timing attacks.
   */
  static safeCompare(a = '', b = '') {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  verifyWebhookSignature(rawBody, signature) {
    // In test mode (or when no secret is configured) we accept everything but
    // still log it so behaviour is transparent.
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
   * Create a payment / charge request with SifaloPay.
   * @returns {Promise<{transactionId:string,status:string,checkoutUrl?:string,raw:object}>}
   */
  async createPayment({ order, customerPhone, description }) {
    const requestBody = {
      merchant_id: this.cfg.merchantId || undefined,
      amount: Number(order.amount),
      currency: 'USD',
      reference: order.id,
      phone: customerPhone,
      description: description || `Order ${order.id}`,
      callback_url: this.cfg.callbackUrl,
      return_url: `${this.cfg.returnUrl}?orderId=${order.id}`,
    };

    if (this.testMode) {
      return this.#simulateCreate(order);
    }

    try {
      const { data } = await this.http.post(this.cfg.createPath, requestBody, {
        headers: this.authHeaders(),
      });

      const transactionId =
        data.transaction_id || data.transactionId || data.id || data.reference;

      if (!transactionId) {
        throw ApiError.gateway('SifaloPay did not return a transaction id', {
          details: data,
        });
      }

      return {
        transactionId: String(transactionId),
        status: this.#mapStatus(data.status),
        checkoutUrl: data.checkout_url || data.redirect_url || data.payment_url,
        raw: data,
      };
    } catch (error) {
      throw this.#wrapHttpError(error, 'create payment');
    }
  }

  /**
   * Verify / poll the status of a payment with SifaloPay.
   */
  async verifyPayment(transactionId) {
    if (this.testMode) {
      return this.#simulateVerify(transactionId);
    }

    try {
      const url = `${this.cfg.verifyPath}/${encodeURIComponent(transactionId)}`;
      const { data } = await this.http.get(url, { headers: this.authHeaders() });
      return {
        transactionId: String(
          data.transaction_id || data.transactionId || data.id || transactionId
        ),
        status: this.#mapStatus(data.status),
        raw: data,
      };
    } catch (error) {
      throw this.#wrapHttpError(error, 'verify payment');
    }
  }

  // ----------------------------------------------------- status normalisation

  /**
   * Normalise the wide variety of provider status strings into our internal
   * enum (PENDING | PROCESSING | PAID | FAILED).
   */
  #mapStatus(providerStatus) {
    const status = String(providerStatus || '').toLowerCase();
    if (['paid', 'success', 'successful', 'completed', 'approved'].includes(status)) {
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

  #simulateCreate(order) {
    const transactionId = `TEST-${Date.now()}-${crypto
      .randomBytes(4)
      .toString('hex')}`;
    logger.info(`[TEST MODE] Simulated SifaloPay payment created`, {
      orderId: order.id,
      transactionId,
      amount: String(order.amount),
    });
    return Promise.resolve({
      transactionId,
      status: 'PROCESSING',
      checkoutUrl: `${config.sifalo.returnUrl}?orderId=${order.id}&simulate=1`,
      raw: {
        test_mode: true,
        message: 'Simulated payment intent created.',
        transaction_id: transactionId,
        status: 'processing',
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
        transaction_id: transactionId,
        status: 'paid',
        message: 'Simulated verification - marked as paid.',
      },
    });
  }

  /**
   * Build a simulated webhook payload (used by the /simulate test endpoint).
   */
  buildSimulatedWebhook(order, outcome = 'PAID') {
    const status = outcome === 'FAILED' ? 'failed' : 'paid';
    const payload = {
      event: `payment.${status}`,
      test_mode: true,
      data: {
        reference: order.id,
        transaction_id: order.transactionId,
        amount: Number(order.amount),
        currency: 'USD',
        status,
      },
      timestamp: new Date().toISOString(),
    };
    const signature = SifaloPayService.computeSignature(
      payload,
      this.cfg.webhookSecret
    );
    return { payload, signature };
  }

  // -------------------------------------------------------------- error utils

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
      return ApiError.gateway(
        data?.message || `SifaloPay rejected the request to ${action}.`,
        { code: 'GATEWAY_ERROR', details: data }
      );
    }
    return error instanceof ApiError
      ? error
      : ApiError.gateway(`Unexpected error during ${action}.`);
  }
}

const sifaloPayService = new SifaloPayService();
export default sifaloPayService;
export { SifaloPayService };
