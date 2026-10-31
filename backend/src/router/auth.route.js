import express from "express";
import rateLimit from "express-rate-limit";
import {
  login,
  logout,
  me,
  register,
  setupStatus,
} from "../controller/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const authRouter = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({
      success: false,
      message: "Too many login attempts. Please try again later.",
    }),
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({
      success: false,
      message: "Too many registration attempts. Please try again later.",
    }),
});

authRouter.get("/setup-status", setupStatus);
authRouter.post("/register", registerLimiter, register);
authRouter.post("/login", loginLimiter, login);
authRouter.post("/logout", logout);
authRouter.get("/me", protect, me);

export default authRouter;