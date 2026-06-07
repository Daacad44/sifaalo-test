import client from './client.js';

export const getConfig = () => client.get('/config').then((r) => r.data.data);

export const getProducts = () =>
  client.get('/products').then((r) => r.data.data);

export const createPayment = (payload) =>
  client.post('/payment/create', payload).then((r) => r.data.data);

export const verifyPayment = (payload) =>
  client.post('/payment/verify', payload).then((r) => r.data.data);

export const getPaymentStatus = (id) =>
  client.get(`/payment/status/${id}`).then((r) => r.data.data);

// TEST MODE helpers: ask backend to build a webhook payload, then deliver it.
export const simulatePayment = (orderId, outcome = 'PAID') =>
  client.post('/payment/simulate', { orderId, outcome }).then((r) => r.data.data);

export const deliverWebhook = ({ payload, signature }) =>
  client.post('/webhooks/sifalopay', payload, {
    headers: { 'x-sifalo-signature': signature },
  });

export const getAdminStats = () =>
  client.get('/admin/stats').then((r) => r.data.data);

export const getAdminOrders = (params) =>
  client.get('/admin/orders', { params }).then((r) => r.data);
