import express from "express"
import { getDashboardStats, getRecentSales } from "../controller/dashboard.controller.js";

const dashboardRouter = express.Router()

dashboardRouter.get("/", getDashboardStats);
dashboardRouter.get("/recent", getRecentSales);

export default dashboardRouter