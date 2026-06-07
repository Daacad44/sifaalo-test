import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// Normalise errors into a consistent { message, code, details } shape so the
// UI can always show a friendly message.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'Something went wrong. Please try again.';
    let code = 'ERROR';
    let details;

    if (error.response) {
      const apiError = error.response.data?.error;
      message = apiError?.message || message;
      code = apiError?.code || code;
      details = apiError?.details;
    } else if (error.code === 'ECONNABORTED') {
      message = 'The request timed out. Please try again.';
      code = 'TIMEOUT';
    } else if (error.request) {
      message = 'Network error. Could not reach the server.';
      code = 'NETWORK_ERROR';
    }

    return Promise.reject({ message, code, details });
  }
);

export default client;
