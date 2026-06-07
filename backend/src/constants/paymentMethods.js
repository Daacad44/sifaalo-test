/**
 * Somali mobile-money wallets supported via SifaloPay.
 *
 * Gateway codes match the official Sifalo Pay WooCommerce plugin:
 * https://wordpress.org/plugins/sifalo-pay/
 * EVC Plus, ZAAD, and Sahal share the `zaad` gateway (wallet is inferred from
 * the customer's mobile number).
 */
export const PAYMENT_METHODS = [
  {
    id: 'evc_plus',
    label: 'EVC Plus',
    gateway: 'zaad',
    operator: 'Hormuud',
    description: 'Pay with your EVC Plus mobile wallet',
  },
  {
    id: 'zaad',
    label: 'ZAAD',
    gateway: 'zaad',
    operator: 'Telesom',
    description: 'Pay with your ZAAD mobile wallet',
  },
  {
    id: 'sahal',
    label: 'Sahal',
    gateway: 'zaad',
    operator: 'Golis',
    description: 'Pay with your Sahal mobile wallet',
  },
  {
    id: 'edahab',
    label: 'e-Dahab',
    gateway: 'edahab',
    operator: 'Dahabshiil',
    description: 'Pay with your e-Dahab mobile wallet',
  },
  {
    id: 'somnet',
    label: 'Somnet',
    gateway: 'somnet',
    operator: 'Somnet',
    description: 'Pay with your Somnet mobile wallet',
  },
];

export const PAYMENT_METHOD_IDS = PAYMENT_METHODS.map((m) => m.id);

export function getPaymentMethod(id) {
  return PAYMENT_METHODS.find((m) => m.id === id);
}

export function getPaymentMethodLabel(id) {
  return getPaymentMethod(id)?.label || id || 'SifaloPay';
}

export function getPaymentGateway(id) {
  return getPaymentMethod(id)?.gateway || 'zaad';
}
