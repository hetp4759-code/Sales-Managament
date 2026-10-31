import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import salesRouter from "./router/salesinfo.route.js";
import dashboardRouter from "./router/dashboard.route.js";
import morgan from "morgan";
import authRouter from "./router/auth.route.js";
import inventoryRouter from "./router/inventory.route.js";
import purchaseRouter from "./router/purchase.route.js";
import { adminOnly, protect } from "./middleware/auth.middleware.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const frontendUrl =
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === "production"
    ? undefined
    : "http://localhost:5173");

if (!frontendUrl) {
  throw new Error("FRONTEND_URL must be configured in production.");
}

const allowedOrigins = new Set(["http://localhost:5173", frontendUrl]);
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const corsOptions = {
  origin: (origin, callback) => {
    callback(null, !origin || allowedOrigins.has(origin));
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
  const origin = req.get("Origin");

  if (
    origin &&
    !safeMethods.has(req.method) &&
    !allowedOrigins.has(origin)
  ) {
    return res.status(403).json({
      success: false,
      message: "Origin not allowed.",
    });
  }

  return next();
});
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/sales", protect, adminOnly, salesRouter);
app.use("/api/dashboard", protect, adminOnly, dashboardRouter);
app.use("/api/inventory", protect, adminOnly, inventoryRouter);
app.use("/api/purchases", protect, adminOnly, purchaseRouter);

/*
  Production me React (frontend/dist) isi server se serve hoga.
  Ye block saare /api routes ke BAAD aur 404 handler se PEHLE hona chahiye.
  Path apne folder ke hisaab se check karna:
  app.js agar backend/ me hai to "../frontend/dist", backend/src me ho to "../../frontend/dist".
*/
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../frontend/dist");

  if (fs.existsSync(path.join(distPath, "index.html"))) {
    app.use(express.static(distPath));

    // React Router ke routes (/login, /dashboard...) par index.html bhejo.
    // /api wale unknown routes neeche ke JSON 404 handler tak jayenge.
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api")) return next();
      return res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    console.warn(
      `frontend build not found at ${distPath}. Run "npm run build" in frontend/.`
    );
  }
}

app.use((_req, res) =>
  res.status(404).json({
    success: false,
    message: "Route not found.",
  })
);

app.use((error, _req, res, next) => {
  console.error("Unhandled request error:", error);

  if (res.headersSent) {
    return next(error);
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  return res.status(status).json({
    success: false,
    message: status < 500 ? "Invalid request." : "Internal server error.",
  });
});

export default app;