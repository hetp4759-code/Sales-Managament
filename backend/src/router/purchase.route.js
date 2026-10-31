import express from "express";
import {
  createPurchase,
  getPurchase,
  getPurchases,
  receivePurchase,
  updatePurchase,
  updatePurchasePayment,
} from "../controller/purchase.controller.js";

const purchaseRouter = express.Router();

purchaseRouter.get("/", getPurchases);
purchaseRouter.post("/", createPurchase);
purchaseRouter.get("/:id", getPurchase);
purchaseRouter.patch("/:id", updatePurchase);
purchaseRouter.post("/:id/receive", receivePurchase);
purchaseRouter.patch("/:id/payment", updatePurchasePayment);

export default purchaseRouter;
