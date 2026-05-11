const isLocalhost = location.hostname === 'localhost';

export const API_BASE_URL = isLocalhost
    ? 'http://localhost:{{API_PORT}}'
    : `https://api.${location.hostname}`;

export default {
    apiBaseUrl: API_BASE_URL
};
