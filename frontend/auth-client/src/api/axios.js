import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

const api = axios.create({
  baseURL,
  withCredentials: true,
});

// ─────────────────────────────────────────────
// In-memory token store
// Lives in module scope so interceptors can access it
// without depending on React context.
// ─────────────────────────────────────────────
let currentAccessToken = null;

export const setAccessToken = (token) => {
  currentAccessToken = token;
};

export const getAccessToken = () => currentAccessToken;

// ─────────────────────────────────────────────
// Hooks the AuthProvider registers
// onTokenRefreshed → reschedule the proactive timer with the new token
// onAuthFailure    → drop the user + clear the timer when refresh dies
// ─────────────────────────────────────────────
let onTokenRefreshed = null;
let onAuthFailure = null;
export const setTokenRefreshedHandler = (fn) => { onTokenRefreshed = fn; };
export const setAuthFailureHandler = (fn) => { onAuthFailure = fn; };

// ─────────────────────────────────────────────
// REQUEST INTERCEPTOR
// Attach access token to every outgoing request.
// ─────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (currentAccessToken) {
      config.headers.Authorization = `Bearer ${currentAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────
// SINGLE-FLIGHT REFRESH
// One shared in-flight /auth/refresh, no matter how many callers want
// it (reactive 401s, the proactive timer, StrictMode double-mount).
// This is what keeps the backend from seeing the same rotated cookie
// twice and wiping every session.
// ─────────────────────────────────────────────
let refreshPromise = null;

export const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      // Bare axios (not `api`) so this request skips the interceptors
      // and can never recurse into itself.
      const res = await axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true });
      const newToken = res.data.accessToken;
      setAccessToken(newToken);
      if (onTokenRefreshed) onTokenRefreshed(newToken);
      return newToken;
    })();

    // Clear the slot once settled (success or failure) so the next
    // expiry can refresh again. The catch here only guards the cleanup
    // chain; the original promise still rejects to its awaiters.
    refreshPromise.catch(() => {}).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

// ─────────────────────────────────────────────
// RESPONSE INTERCEPTOR (reactive)
// On 401 → run the shared refresh → retry the original request once.
// Skip auth-credential endpoints: a 401 there means bad credentials,
// not an expired access token. /auth/me is allowed to refresh.
// ─────────────────────────────────────────────
const NO_REFRESH = ["/auth/refresh", "/auth/login", "/auth/register", "/auth/google", "/auth/logout"];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const skip = !original || NO_REFRESH.some((p) => (original.url || "").includes(p));

    if (status === 401 && original && !original._retry && !skip) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        setAccessToken(null);
        if (onAuthFailure) onAuthFailure();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;