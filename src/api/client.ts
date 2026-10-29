import axios from 'axios';
import { useAuthStore } from '../store/auth';

export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return 'http://127.0.0.1:8070';
};

export const getSocketUrl = (): string => {
  return getApiBaseUrl();
};

export const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject JWT token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    const currentBranchId = useAuthStore.getState().currentBranchId;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Inject tenant & branch header details for scoped DB requests
    if (currentBranchId) {
      config.headers['X-Branch-ID'] = currentBranchId;
    }
    
    const user = useAuthStore.getState().user;
    if (user && user.tenant_id) {
      config.headers['X-Tenant-ID'] = user.tenant_id;
    }
    
    // Add CSRF token from meta tag or cookie
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Refresh on 401
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }
      
      try {
        const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refresh_token: refreshToken,
        });
        
        const { access_token, refresh_token: new_refresh_token } = data;
        const user = useAuthStore.getState().user;
        
        if (user) {
          useAuthStore.getState().setAuth(access_token, new_refresh_token, user);
        }
        
        apiClient.defaults.headers.common.Authorization = `Bearer ${access_token}`;
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        
        processQueue(null, access_token);
        isRefreshing = false;
        
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    
    if (error.response?.status !== 401) {
      const detail = error.response?.data?.detail || error.response?.data?.message || error.message || 'An unexpected error occurred';
      // Import dynamically or at the top of the file
      const { useToastStore } = await import('../store/toast');
      useToastStore.getState().addToast(detail, 'error');
    }
    
    return Promise.reject(error);
  }
);
