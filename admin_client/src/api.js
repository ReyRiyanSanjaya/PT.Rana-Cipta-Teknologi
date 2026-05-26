import axios from 'axios';
import { getToken, isTokenExpired, logout } from './lib/auth';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

// Log API URL in development for debugging
if (import.meta.env.DEV) {
    console.log('API URL:', api.defaults.baseURL);
}

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        if (isTokenExpired()) {
            logout();
            return config;
        }
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.message;

        if (
            status === 401 ||
            (status === 403 && message === 'Invalid Token')
        ) {
            logout();
        }

        return Promise.reject(error);
    }
);

export default api;
