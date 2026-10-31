import express from "express"
import { createSale, getAllSales, getSalesHistory, getSingleSale, updateSale } from "../controller/sales.controller.js"

const salesRouter = express.Router()

salesRouter.post("/sales-info", createSale)
salesRouter.get("/sales-info",getAllSales)
salesRouter.get("/sales-info/:id",getSingleSale)
salesRouter.get("/sales-history",getSalesHistory)
salesRouter.put("/sales-info/:id",updateSale)

export default salesRouter