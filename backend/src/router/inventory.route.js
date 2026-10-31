import express from "express";
import {
  adjustProductStock,
  createProduct,
  getBusinessProfile,
  getProducts,
  getStockMovements,
  patchBusinessProfile,
  updateBusinessProfile,
  updateProduct,
} from "../controller/inventory.controller.js";

const inventoryRouter = express.Router();

inventoryRouter.get("/business-profile", getBusinessProfile);
inventoryRouter.patch("/business-profile", patchBusinessProfile);
inventoryRouter.put("/business-profile", updateBusinessProfile);
inventoryRouter.get("/products", getProducts);
inventoryRouter.post("/products", createProduct);
inventoryRouter.put("/products/:id", updateProduct);
inventoryRouter.post("/products/:id/stock-adjustments", adjustProductStock);
inventoryRouter.get("/movements", getStockMovements);

export default inventoryRouter;
