import User from "../models/User.js";
import bcrypt from "bcryptjs";
import generateAccessToken from "../utils/generateAccessToken.js";
import generateRefreshToken from "../utils/generateRefreshToken.js";
import hashToken from "../utils/hashToken.js";
import generateSessionId from "../utils/generateSessionId.js";
import jwt from "jsonwebtoken";
import verifyGoogleToken from "../utils/verifyGoogleToken.js";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";
import logger from "../config/logger.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createAlert } from "../services/alertService.js";

/** Remove expired refresh tokens from a user's array. */
const pruneExpiredTokens = (user) => {
  user.refreshTokens = user.refreshTokens.filter(
    (token) => token.expiresAt > new Date()
  );
};

const MAX_SESSIONS = 5;
const REFRESH_TOKEN_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_MS = 30 * 60 * 1000; // 30 minutes

const reqMeta = (req) => ({
  ip: req.ip,
  userAgent: req.get("User-Agent") || undefined,
});

/** Issue access + refresh tokens, rotate refresh token, set httpOnly cookie. */
const issueTokenResponse = async (user, res, remember = true) => {
  pruneExpiredTokens(user);

  if (user.refreshTokens.length >= MAX_SESSIONS) {
    user.refreshTokens.shift();
  }

  const accessToken = generateAccessToken(user);
  const refreshTokenValue = generateRefreshToken(user);
  const sessionId = generateSessionId();

  user.refreshTokens.push({
    tokenHash: hashToken(refreshTokenValue),
    sessionId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_MS),
  });

  await user.save();

  const persist = remember !== false;

  res.cookie(process.env.REFRESH_COOKIE_NAME, refreshTokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    path: "/api/v1/auth",
    ...(persist ? { maxAge: REFRESH_TOKEN_MS } : {}),
  });

  return {
    accessToken,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  };
};

export const registerUser = asyncHandler(async (req, res) => {
  let { username, email, password } = req.body;

  username = username.trim().toLowerCase();
  email = email.trim().toLowerCase();

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw new ApiError("User already exists", 409);
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(process.env.BCRYPT_SALT_ROUNDS) || 12
  );

  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    provider: "local",
    role: "user",
  });

  logger.info(`New user registered: ${email}`);

  await createAlert({
    type: "user_registered",
    category: "authentication",
    severity: "INFO",
    title: "New user registration",
    description: `A new account was registered with email ${email}`,
    userEmail: email,
    ...reqMeta(req),
  });

  return res.status(201).json({
    success: true,
    message: "User registered successfully",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  let { email, password, remember } = req.body;

  email = email.trim().toLowerCase();

  const user = await User.findOne({ email });

  if (!user) {
    await createAlert({
      type: "login_failed_unknown_user",
      category: "authentication",
      severity: "WARNING",
      title: "Login attempt with unknown email",
      description: `Login attempted with an unregistered email: ${email}`,
      userEmail: email,
      ...reqMeta(req),
      notify: true,
    });
    throw new ApiError("Invalid credentials", 401);
  }

  if (user.provider === "google") {
    throw new ApiError("Please continue with Google", 400);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    await createAlert({
      type: "login_failed_wrong_password",
      category: "authentication",
      severity: "WARNING",
      title: "Failed login attempt",
      description: `Incorrect password for account ${email}`,
      userId: user._id,
      userEmail: email,
      ...reqMeta(req),
      notify: true,
    });
    throw new ApiError("Invalid credentials", 401);
  }

  const result = await issueTokenResponse(user, res, remember);

  logger.info(`User logged in: ${email}`);

  await createAlert({
    type: "login_success",
    category: "authentication",
    severity: "INFO",
    title: "Successful login",
    description: `User ${email} logged in successfully`,
    userId: user._id,
    userEmail: email,
    ...reqMeta(req),
  });

  return res.status(200).json({
    success: true,
    message: "Login successful",
    ...result,
  });
});

export const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  const payload = await verifyGoogleToken(idToken);

  const { sub: googleId, email, email_verified, name } = payload;

  if (!email_verified) {
    await createAlert({
      type: "google_login_failed_unverified_email",
      category: "authentication",
      severity: "WARNING",
      title: "Google login failed — email not verified",
      description: `Google account ${email} has an unverified email address`,
      userEmail: normalizedEmail,
      ...reqMeta(req),
      notify: true,
    });
    throw new ApiError("Google email not verified", 401);
  }

  const normalizedEmail = email.toLowerCase();

  let user = await User.findOne({ googleId });

  if (user) {
    // Existing Google account — log directly into it.
    // Google already verified the email; ensure the flag is set.
    if (user.email !== normalizedEmail) {
      await createAlert({
        type: "google_login_failed_email_mismatch",
        category: "authentication",
        severity: "CRITICAL",
        title: "Google login failed — email mismatch",
        description: `Google ID ${googleId} associated with a different email (${user.email}) than the ID token (${normalizedEmail})`,
        userEmail: normalizedEmail,
        ...reqMeta(req),
        notify: true,
      });
      throw new ApiError("Google authentication failed", 401);
    }
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      user.emailVerifiedAt = new Date();
      await user.save();
    }
  } else {
    // No Google account with this googleId. Check for an account by email.
    user = await User.findOne({ email: normalizedEmail });

    if (user) {
      // Account exists with this email — link the verified Google identity.
      // verifyGoogleToken already confirmed this Google account owns the email.
      user.googleId = googleId;
      user.provider = "google";
      user.isEmailVerified = true;
      user.emailVerifiedAt = new Date();
      await user.save();
    } else {
      // No account exists — create a new Google account.
      // Google already verified the email, so mark it verified.
      let username = name
        ?.trim()
        .toLowerCase()
        .replace(/\s+/g, "");

      if (!username) {
        username = normalizedEmail.split("@")[0].toLowerCase();
      }

      let finalUsername = username;
      let counter = 1;

      while (await User.findOne({ username: finalUsername })) {
        finalUsername = `${username}${counter++}`;
      }

      user = await User.create({
        username: finalUsername,
        email: normalizedEmail,
        provider: "google",
        googleId,
        role: "user",
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      });
    }
  }

  pruneExpiredTokens(user);

  if (user.refreshTokens.length >= MAX_SESSIONS) {
    user.refreshTokens.shift();
  }

  const accessToken = generateAccessToken(user);
  const refreshTokenValue = generateRefreshToken(user);
  const sessionId = generateSessionId();

  user.refreshTokens.push({
    tokenHash: hashToken(refreshTokenValue),
    sessionId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_MS),
  });

  await user.save();

  res.cookie(process.env.REFRESH_COOKIE_NAME, refreshTokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/auth",
    maxAge: REFRESH_TOKEN_MS,
  });

  logger.info(`Google login: ${normalizedEmail}`);

  await createAlert({
    type: "google_login_success",
    category: "authentication",
    severity: "INFO",
    title: "Successful Google login",
    description: `User ${normalizedEmail} logged in via Google`,
    userId: user._id,
    userEmail: normalizedEmail,
    ...reqMeta(req),
  });

  return res.status(200).json({
    success: true,
    message: "Google login successful",
    accessToken,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies[process.env.REFRESH_COOKIE_NAME];

  if (!incomingRefreshToken) {
    throw new ApiError("Refresh token missing", 401);
  }

  const decoded = jwt.verify(
    incomingRefreshToken,
    process.env.JWT_REFRESH_SECRET
  );

  const user = await User.findById(decoded.userId);

  if (!user) {
    throw new ApiError("Invalid refresh token", 401);
  }

  pruneExpiredTokens(user);

  const hashedToken = hashToken(incomingRefreshToken);

  const existingToken = user.refreshTokens.find(
    (token) => token.tokenHash === hashedToken
  );

  if (!existingToken) {
    // Refresh-token reuse detected. Invalidate only the suspicious session
    // instead of wiping every session, and log a security event.
    logger.warn(
      `Refresh token reuse detected for user ${user.email} (id ${user._id})`
    );
    await createAlert({
      type: "refresh_token_reuse",
      category: "security",
      severity: "CRITICAL",
      title: "Refresh token reuse detected",
      description: `Possible token replay attack for user ${user.email}`,
      userId: user._id,
      userEmail: user.email,
      ...reqMeta(req),
      notify: true,
    });
    user.refreshTokens = user.refreshTokens.filter(
      (token) => token.tokenHash !== hashedToken
    );
    await user.save();

    res.clearCookie(process.env.REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/v1/auth",
    });

    throw new ApiError("Refresh token reuse detected", 401);
  }

  const sessionId = existingToken.sessionId;

  user.refreshTokens = user.refreshTokens.filter(
    (token) => token.tokenHash !== hashedToken
  );

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  user.refreshTokens.push({
    tokenHash: hashToken(newRefreshToken),
    sessionId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_MS),
  });

  await user.save();

  res.cookie(process.env.REFRESH_COOKIE_NAME, newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/auth",
    maxAge: REFRESH_TOKEN_MS,
  });

  return res.status(200).json({
    success: true,
    accessToken: newAccessToken,
  });
});

export const logoutUser = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies[process.env.REFRESH_COOKIE_NAME];

  if (incomingRefreshToken) {
    try {
      const decoded = jwt.verify(
        incomingRefreshToken,
        process.env.JWT_REFRESH_SECRET
      );

      const user = await User.findById(decoded.userId);

      if (user) {
        const hashedToken = hashToken(incomingRefreshToken);

        user.refreshTokens = user.refreshTokens.filter(
          (token) => token.tokenHash !== hashedToken
        );

        await user.save();
      }
    } catch (error) {
      // Token may already be expired/invalid. Continue with logout.
    }
  }

  res.clearCookie(process.env.REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/auth",
  });

  await createAlert({
    type: "logout",
    category: "authentication",
    severity: "INFO",
    title: "User logged out",
    description: `User ${req.user.email} logged out`,
    userId: req.user.userId,
    userEmail: req.user.email,
    ...reqMeta(req),
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select(
    "-password -refreshTokens"
  );

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  return res.status(200).json({
    success: true,
    user,
  });
});

export const updateCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  let { username, email } = req.body;

  const user = await User.findById(userId);
  if (!user) throw new ApiError("User not found", 404);

  const updates = {};

  if (username !== undefined) {
    username = String(username).trim().toLowerCase();
    if (username.length < 3 || username.length > 30)
      throw new ApiError("Username must be 3–30 characters", 400);
    updates.username = username;
  }

  if (email !== undefined) {
    if (user.provider === "google")
      throw new ApiError(
        "Email is managed by your Google account and can't be changed",
        400
      );
    email = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new ApiError("Please enter a valid email", 400);
    updates.email = email;
  }

  if (Object.keys(updates).length === 0)
    throw new ApiError("Nothing to update", 400);

  const orClauses = [];
  if (updates.username) orClauses.push({ username: updates.username });
  if (updates.email) orClauses.push({ email: updates.email });
  const clash = await User.findOne({ _id: { $ne: userId }, $or: orClauses });
  if (clash) throw new ApiError("Username or email already in use", 409);

  Object.assign(user, updates);
  await user.save();

  const updated = await User.findById(userId).select("-password -refreshTokens");
  return res.status(200).json({ success: true, message: "Profile updated", user: updated });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  let { email } = req.body;
  if (!email) throw new ApiError("Email is required", 400);
  email = email.trim().toLowerCase();

  const user = await User.findOne({ email });

  const generic = {
    success: true,
    message: "If an account exists for that email, a reset link has been sent.",
  };

  if (user && user.provider === "local") {
    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetTokenHash = hashToken(rawToken);
    user.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_MS);
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;

    await createAlert({
      type: "password_reset_requested",
      category: "authentication",
      severity: "INFO",
      title: "Password reset requested",
      description: `Password reset requested for account ${email}`,
      userEmail: email,
      ...reqMeta(req),
    });

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your VocabTrainer password",
        html: `
          <div style="font-family:Georgia,serif;max-width:480px;margin:auto;color:#1a1a1a">
            <h2>Reset your password</h2>
            <p>We received a request to reset your VocabTrainer password.</p>
            <p style="margin:24px 0">
              <a href="${resetUrl}"
                 style="background:#6c63ff;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">
                Reset Password
              </a>
            </p>
            <p style="color:#666;font-size:13px">This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.</p>
          </div>`,
        text: `Reset your VocabTrainer password: ${resetUrl} (expires in 30 minutes).`,
      });
    } catch (mailErr) {
      logger.error("Reset email send failed:", mailErr.message);
    }
  }

  return res.status(200).json(generic);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password)
    throw new ApiError("Token and new password are required", 400);
  if (password.length < 8)
    throw new ApiError("Password must be at least 8 characters long", 400);

  const tokenHash = hashToken(token);
  const user = await User.findOne({
    resetTokenHash: tokenHash,
    resetTokenExpiresAt: { $gt: new Date() },
  });

  if (!user)
    throw new ApiError("Invalid or expired reset link", 400);

  user.password = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS) || 12);
  user.resetTokenHash = null;
  user.resetTokenExpiresAt = null;
  user.refreshTokens = []; // log out every existing session after a reset
  await user.save();

  await createAlert({
    type: "password_reset_completed",
    category: "authentication",
    severity: "WARNING",
    title: "Password reset completed",
    description: `Password reset completed for account ${user.email}. All sessions invalidated.`,
    userId: user._id,
    userEmail: user.email,
    ...reqMeta(req),
    notify: true,
  });

  res.clearCookie(process.env.REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/auth",
  });

  return res.status(200).json({ success: true, message: "Password reset successful. Please log in." });
});
