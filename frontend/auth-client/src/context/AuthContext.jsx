import { createContext, useState, useEffect, useContext, useRef } from "react";
import { queryClient } from "../queryClient";
import {
  loginUser,
  registerUser,
  googleLogin,
  logoutUser,
  getMe,
  updateMe,
} from "../api/auth";
import {
  setAccessToken,
  refreshAccessToken,
  setTokenRefreshedHandler,
  setAuthFailureHandler,
} from "../api/axios";

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const normalizeUser = (user) => {
  if (!user || typeof user !== "object") return null;
  const id = user.id ?? user._id;
  return id == null ? user : { ...user, id: String(id) };
};

// Decode a JWT's `exp` (seconds) → ms, without any library.
const getExpiryMs = (token) => {
  try {
    let payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = payload.length % 4;
    if (pad) payload += "=".repeat(4 - pad);
    const { exp } = JSON.parse(atob(payload));
    return exp ? exp * 1000 : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const clearRefreshTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // PROACTIVE: refresh shortly before the access token expires.
  // Skew is adaptive so very short-lived tokens don't cause a tight loop.
  const scheduleProactiveRefresh = (token) => {
    clearRefreshTimer();
    const expMs = getExpiryMs(token);
    if (!expMs) return;

    const lifetime = expMs - Date.now();
    if (lifetime <= 0) {
      refreshAccessToken().catch(() => {});
      return;
    }

    const skew = Math.min(60_000, Math.floor(lifetime * 0.25)); // up to 60s early
    const delay = Math.max(lifetime - skew, 10_000); // never sooner than 10s

    timerRef.current = setTimeout(() => {
      // If this fails, the reactive interceptor / onAuthFailure handles it.
      refreshAccessToken().catch(() => {});
    }, delay);
  };

  useEffect(() => {
    // Register hooks BEFORE bootstrapping so the first refresh schedules itself.
    setTokenRefreshedHandler((token) => scheduleProactiveRefresh(token));
    setAuthFailureHandler(() => {
      clearRefreshTimer();
      queryClient.clear();
      setAccessToken(null);
      setUser(null);
    });

    // BOOTSTRAP: recover a session on load. Goes through the shared
    // refreshAccessToken(), so StrictMode's double-mount fires only ONE
    // /refresh — avoiding the reuse-detection session wipe.
    (async () => {
      try {
        await refreshAccessToken(); // sets token + schedules via onTokenRefreshed
        const me = await getMe();
        if (me.data.success) setUser(normalizeUser(me.data.user));
      } catch (_) {
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      clearRefreshTimer();
      setTokenRefreshedHandler(null);
      setAuthFailureHandler(null);
    };
  }, []);

  const login = async (email, password, remember = true) => {
    const res = await loginUser({ email, password, remember });
    queryClient.clear();
    setAccessToken(res.data.accessToken);
    scheduleProactiveRefresh(res.data.accessToken);
    setUser(normalizeUser(res.data.user));
    return res.data;
  };

  const register = async (username, email, password) => {
    const res = await registerUser({ username, email, password });
    return res.data;
  };

  const loginWithGoogle = async (idToken) => {
    const res = await googleLogin(idToken);
    queryClient.clear();
    setAccessToken(res.data.accessToken);
    scheduleProactiveRefresh(res.data.accessToken);
    setUser(normalizeUser(res.data.user));
    return res.data;
  };

  const updateUser = async (data) => {
    const res = await updateMe(data);
    if (res.data.success) setUser(normalizeUser(res.data.user));
    return res.data;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (_) {
    } finally {
      clearRefreshTimer();
      queryClient.clear();
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, loginWithGoogle, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};