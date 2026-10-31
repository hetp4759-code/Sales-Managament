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
const clientUrl =
  process.env.CLIENT_URL ||
  (process.env.NODE_ENV === "production"
    ? undefined
    : "http://localhost:5173");

if (!clientUrl) {
  throw new Error("CLIENT_URL must be configured in production.");
}

app.use(cors({ origin: clientUrl, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/sales", protect, adminOnly, salesRouter);
app.use("/api/dashboard", protect, adminOnly, dashboardRouter);
app.use("/api/inventory", protect, adminOnly, inventoryRouter);
app.use("/api/purchases", protect, adminOnly, purchaseRouter);

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