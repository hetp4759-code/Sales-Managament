import Admin from "../model/admin.model.js";
import { COOKIE_NAME, verifyToken } from "../utils/authToken.js";

export const protect = async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  let payload;

  try {
    payload = verifyToken(token);
  } catch (error) {
    if (error.code === "JWT_SECRET_MISSING") {
      console.error("Authentication configuration error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Authentication is not configured.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  try {
    const admin = await Admin.findById(payload.id).select("-password");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    req.admin = admin;
    return next();
  } catch (error) {
    console.error("Authentication lookup failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify the current session.",
    });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.admin?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
  }

  return next();
};
