/** Mirrors backend PAYMENT_METHODS for checkout UI. */
export const PAYMENT_METHODS = [
  {
    id: 'evc_plus',
    label: 'EVC Plus',
    operator: 'Hormuud',
    description: 'Hormuud EVC Plus',
  },
  {
    id: 'zaad',
    label: 'ZAAD',
    operator: 'Telesom',
    description: 'Telesom ZAAD',
  },
  {
    id: 'sahal',
    label: 'Sahal',
    operator: 'Golis',
    description: 'Golis Sahal',
  },
  {
    id: 'edahab',
    label: 'e-Dahab',
    operator: 'Dahabshiil',
    description: 'Dahabshiil e-Dahab',
  },
  {
    id: 'somnet',
    label: 'Somnet',
    operator: 'Somnet',
    description: 'Somnet mobile money',
  },
];

export function getPaymentMethodLabel(id) {
  return PAYMENT_METHODS.find((m) => m.id === id)?.label || id || 'SifaloPay';
}
