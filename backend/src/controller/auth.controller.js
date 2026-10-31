import bcrypt from "bcryptjs";
import { timingSafeEqual } from "node:crypto";
import Admin from "../model/admin.model.js";
import {
  COOKIE_NAME,
  getCookieOptions,
  signToken,
} from "../utils/authToken.js";

const DUMMY_PASSWORD_HASH =
  "$2b$12$MzpB7qaFvS61FEgPCuC38OPYaD8weaj6qg9v8WYMHc40/j8zHGrHm";

const serializeAdmin = (admin) => ({
  id: String(admin._id),
  name: admin.name,
  email: admin.email,
  role: admin.role,
});

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidSetupKey = (providedKey, expectedKey) => {
  if (typeof providedKey !== "string") return false;

  const providedBuffer = Buffer.from(providedKey);
  const expectedBuffer = Buffer.from(expectedKey);

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
};

export const setupStatus = async (_req, res) => {
  try {
    const adminExists = await Admin.exists({ role: "admin" });

    return res.status(200).json({
      success: true,
      registrationOpen: !adminExists,
      setupKeyRequired: Boolean(process.env.ADMIN_SETUP_KEY),
    });
  } catch (error) {
    console.error("Admin setup status lookup failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to check admin setup status.",
    });
  }
};

export const register = async (req, res) => {
  const { name, email, password, setupKey } = req.body ?? {};

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Enter your name, email and password.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid email address.",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters.",
    });
  }

  const expectedSetupKey = process.env.ADMIN_SETUP_KEY;
  if (
    expectedSetupKey &&
    !isValidSetupKey(setupKey, expectedSetupKey)
  ) {
    return res.status(403).json({
      success: false,
      message: "Invalid setup key.",
    });
  }

  try {
    // Unique role index registration ke concurrent requests ko bhi rokta hai.
    await Admin.init();

    const adminExists = await Admin.exists({ role: "admin" });
    if (adminExists) {
      return res.status(403).json({
        success: false,
        message: "Admin registration is closed.",
      });
    }

    const admin = new Admin({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: "admin",
      lastLoginAt: new Date(),
    });

    const token = signToken({ id: admin._id, role: admin.role });
    await admin.save();
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully.",
      admin: serializeAdmin(admin),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(403).json({
        success: false,
        message: "Admin registration is closed.",
      });
    }

    console.error("Admin registration failed:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid admin details.",
      });
    }

    if (error.code === "JWT_SECRET_MISSING") {
      return res.status(500).json({
        success: false,
        message: "Authentication is not configured.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create the admin account. Please try again.",
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required.",
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const admin = await Admin.findOne({ email: normalizedEmail }).select(
      "+password"
    );
    const passwordMatches = admin
      ? await admin.comparePassword(password)
      : await bcrypt.compare(password, DUMMY_PASSWORD_HASH);

    if (!admin || !passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    const token = signToken({ id: admin._id, role: admin.role });
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      admin: serializeAdmin(admin),
    });
  } catch (error) {
    console.error("Admin login failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to log in. Please try again.",
    });
  }
};

export const logout = (req, res) => {
  const cookieOptions = getCookieOptions();
  delete cookieOptions.maxAge;
  res.clearCookie(COOKIE_NAME, cookieOptions);

  return res.status(200).json({
    success: true,
    message: "Logout successful.",
  });
};

export const me = (req, res) =>
  res.status(200).json({
    success: true,
    message: "Session restored.",
    admin: serializeAdmin(req.admin),
  });