import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { registerUser, loginUser } from "../services/auth.service.js";
import {
  authCookieOptions,
  clearAuthCookieOptions,
} from "../utils/cookieOptions.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("auth.controller");

export const register = asyncHandler(async function register(req, res) {
  const { name, email, password } = req.body;
  const { user, token } = await registerUser({ name, email, password });
  // Log before setting cookie so we can verify it in Render logs.
  log.debug("Setting auth cookie for new user", {
    user: user.id,
    sameSite: authCookieOptions.sameSite,
    secure: authCookieOptions.secure,
  });
  res.cookie("token", token, authCookieOptions);
  return new ApiResponse(
    201,
    { user, token },
    "Account created successfully",
  ).send(res);
});

export const login = asyncHandler(async function login(req, res) {
  const { email, password } = req.body;
  const { user, token } = await loginUser({ email, password });
  // Log cookie set attempt for debugging in production logs.
  log.debug("Setting auth cookie on login", {
    user: user.id,
    sameSite: authCookieOptions.sameSite,
    secure: authCookieOptions.secure,
  });
  res.cookie("token", token, authCookieOptions);
  return new ApiResponse(200, { user, token }, "Logged in successfully").send(
    res,
  );
});

export const logout = asyncHandler(async function logout(req, res) {
  res.clearCookie("token", clearAuthCookieOptions);
  return new ApiResponse(200, null, "Logged out successfully").send(res);
});

export const getMe = asyncHandler(async function getMe(req, res) {
  return new ApiResponse(200, { user: req.user.toSafeObject() }).send(res);
});
