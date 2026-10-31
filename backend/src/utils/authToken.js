import jwt from "jsonwebtoken";

export const COOKIE_NAME = "admin_token";
export const SESSION_SECONDS = 8 * 60 * 60;

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (typeof secret !== "string" || secret.length < 32) {
    const error = new Error("JWT_SECRET must be at least 32 characters.");
    error.code = "JWT_SECRET_MISSING";
    throw error;
  }

  return secret;
};

export const getCookieOptions = () => {
  const configuredSameSite = process.env.COOKIE_SAMESITE?.toLowerCase();
  const sameSite = ["strict", "lax", "none"].includes(configuredSameSite)
    ? configuredSameSite
    : "lax";

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite,
    path: "/",
    maxAge: SESSION_SECONDS * 1000,
  };
};

export const signToken = ({ id, role }) =>
  jwt.sign({ id: String(id), role }, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: SESSION_SECONDS,
  });

export const verifyToken = (token) =>
  jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
