import api from "./axios";

export const registerUser = (data) =>
  api.post("/auth/register", data);

export const loginUser = (data) =>
  api.post("/auth/login", data);

export const googleLogin = (idToken) =>
  api.post("/auth/google", { idToken });

export const getMe = () =>
  api.get("/auth/me");

export const refreshToken = () =>
  api.post("/auth/refresh");

export const logoutUser = () =>
  api.post("/auth/logout");

export const updateMe = (data) => 
  api.patch("/auth/me", data);

export const forgotPassword = (email) =>
  api.post("/auth/forgot-password", { email });
 
export const resetPassword = (token, password) =>
  api.post("/auth/reset-password", { token, password });