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
      const data = error.response.data;
      const apiError = data?.error;
      if (apiError?.message) {
        message = apiError.message;
        code = apiError.code || code;
        details = apiError.details;
      } else if (typeof data === 'string' && data.includes('could not be found')) {
        message =
          'API request failed. Ensure the backend is running and VITE_API_URL is set to /api in development.';
        code = 'API_UNAVAILABLE';
      } else if (error.response.status === 404) {
        message = 'API endpoint not found. Check that the backend is running on port 4000.';
        code = 'NOT_FOUND';
      }
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
