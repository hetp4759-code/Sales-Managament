import salesModel from "../model/salesInfo.model.js";
import Purchase from "../model/purchase.model.js";
import Product from "../model/product.model.js";

/* ---------------------------------------------------------------
   Helpers
---------------------------------------------------------------- */

const IST_OFFSET_MINUTES = 330; // India = UTC+5:30
const MAX_RANGE_DAYS = 366;
const DEFAULT_DAYS = 30; // koi filter na ho to last 30 din
const PAYMENT_STATUSES = ["Paid", "Partial", "Pending"];

// YYYY-MM-DD format + real calendar date check
const isValidDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    return (
        parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month - 1 &&
        parsed.getUTCDate() === day
    );
};

const istDayStart = (value, addDays = 0) => {
    const [year, month, day] = value.split("-").map(Number);

    return new Date(
        Date.UTC(year, month - 1, day + addDays) - IST_OFFSET_MINUTES * 60 * 1000
    );
};

// Last N din (aaj milakar), IST ke hisaab se.
// Example: N = 30 → aaj se 29 din pehle tak, kul 30 din.
const getLastNDaysRange = (n) => {
    const nowIst = new Date(Date.now() + IST_OFFSET_MINUTES * 60 * 1000);

    const end = new Date(
        Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate())
    );

    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (n - 1));

    return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
    };
};

const eachDay = (startDate, endDate) => {
    const days = [];
    const cursor = new Date(`${startDate}T00:00:00Z`);
    const last = new Date(`${endDate}T00:00:00Z`);

    while (cursor <= last) {
        days.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return days;
};

const getPreviousPeriodStart = (startDate, endDate, start, end) => {
    const [year, month, day] = startDate.split("-").map(Number);
    const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const monthEnd = `${startDate.slice(0, 7)}-${String(lastDayOfMonth).padStart(2, "0")}`;

    if (day === 1 && endDate === monthEnd) {
        // Pichle mahine ki 1 tareekh (IST)
        return new Date(
            Date.UTC(year, month - 2, 1) - IST_OFFSET_MINUTES * 60 * 1000
        );
    }

    return new Date(start.getTime() - (end.getTime() - start.getTime()));
};

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

const percentChange = (current, previous) => {
    if (!previous) return current ? null : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
};

const summaryPipeline = (from, to) => [
    { $match: { saleDate: { $gte: from, $lt: to } } },
    {
        $group: {
            _id: null,
            totalSales: { $sum: "$totalAmount" },
            totalReceived: { $sum: "$amountReceived" },
            pendingAmount: { $sum: "$remainingBalance" },
            outputGst: { $sum: { $ifNull: ["$totalGst", 0] } },
            totalTransactions: { $sum: 1 },
        },
    },
];

const emptySummary = {
    totalSales: 0,
    totalReceived: 0,
    pendingAmount: 0,
    outputGst: 0,
    totalTransactions: 0,
};

const purchaseSummaryPipeline = (from, to) => [
    { $match: { status: "Received", purchaseDate: { $gte: from, $lt: to } } },
    {
      $group: {
        _id: null,
        totalPurchases: { $sum: "$productSnapshot.invoiceTotal" },
        inputGst: { $sum: "$productSnapshot.totalGst" },
        amountPaid: { $sum: "$amountPaid" },
        supplierPayables: { $sum: "$outstandingPayable" },
      },
    },
];

const outstandingExpression = {
    $max: [
        {
            $ifNull: [
                "$outstandingPayable",
                {
                    $subtract: [
                        "$productSnapshot.invoiceTotal",
                        { $ifNull: ["$amountPaid", 0] },
                    ],
                },
            ],
        },
        0,
    ],
};

const purchaseDashboardPipeline = (from, to) => [
    { $match: { status: "Received" } },
    {
        $facet: {
            summary: [
                { $match: { purchaseDate: { $gte: from, $lt: to } } },
                {
                    $group: {
                        _id: null,
                        totalPurchases: { $sum: "$productSnapshot.invoiceTotal" },
                        inputGst: { $sum: "$productSnapshot.totalGst" },
                        amountPaid: { $sum: "$amountPaid" },
                        supplierPayables: { $sum: outstandingExpression },
                    },
                },
            ],
            trend: [
                { $match: { purchaseDate: { $gte: from, $lt: to } } },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$purchaseDate",
                                timezone: "+05:30",
                            },
                        },
                        total: { $sum: "$productSnapshot.invoiceTotal" },
                        count: { $sum: 1 },
                    },
                },
            ],
            paymentStatus: [
                { $match: { purchaseDate: { $gte: from, $lt: to } } },
                {
                    $group: {
                        _id: "$paymentStatus",
                        count: { $sum: 1 },
                        outstanding: { $sum: outstandingExpression },
                    },
                },
            ],
            suppliers: [
                {
                    $project: {
                        supplierName: 1,
                        supplierKey: 1,
                        purchaseDate: 1,
                        invoiceTotal: "$productSnapshot.invoiceTotal",
                        amountPaid: { $ifNull: ["$amountPaid", 0] },
                        outstandingPayable: outstandingExpression,
                        inRange: {
                            $and: [
                                { $gte: ["$purchaseDate", from] },
                                { $lt: ["$purchaseDate", to] },
                            ],
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            $cond: [
                                { $ne: [{ $ifNull: ["$supplierKey", ""] }, ""] },
                                "$supplierKey",
                                {
                                    $toLower: {
                                        $trim: {
                                            input: { $ifNull: ["$supplierName", ""] },
                                        },
                                    },
                                },
                            ],
                        },
                        supplierName: { $first: "$supplierName" },
                        periodPurchases: {
                            $sum: { $cond: ["$inRange", "$invoiceTotal", 0] },
                        },
                        periodAmountPaid: {
                            $sum: { $cond: ["$inRange", "$amountPaid", 0] },
                        },
                        periodOutstanding: {
                            $sum: { $cond: ["$inRange", "$outstandingPayable", 0] },
                        },
                        overallOutstanding: { $sum: "$outstandingPayable" },
                        lastPurchaseDate: { $max: "$purchaseDate" },
                    },
                },
                { $match: { _id: { $ne: "" }, periodPurchases: { $gt: 0 } } },
                { $sort: { periodPurchases: -1, supplierName: 1 } },
                { $limit: 5 },
            ],
            overallPayable: [
                {
                    $group: {
                        _id: null,
                        total: { $sum: outstandingExpression },
                    },
                },
            ],
            recent: [
                { $match: { purchaseDate: { $gte: from, $lt: to } } },
                { $sort: { purchaseDate: -1, createdAt: -1 } },
                { $limit: 5 },
                {
                    $project: {
                        purchaseDate: 1,
                        supplierName: 1,
                        invoiceNumber: 1,
                        productSnapshot: 1,
                        amountPaid: 1,
                        outstandingPayable: 1,
                        paymentStatus: 1,
                    },
                },
            ],
        },
    },
];

/* ---------------------------------------------------------------
   GET DASHBOARD STATS
   Range 3 tareeke se chun sakte ho:
   1. Kuch nahi do                  → last 30 din (default)
   2. ?days=10 / 25 / 60 ...        → last N din
   3. ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD → custom range
---------------------------------------------------------------- */
export const getDashboardStats = async (req, res) => {
    try {
        let { startDate, endDate } = req.query;
        const daysParam = req.query.days;

        const isCustomRange = Boolean(startDate || endDate);

        // days aur custom dates ek saath nahi chalenge
        if (daysParam && isCustomRange) {
            return res.status(400).json({
                success: false,
                message: "Use either days or startDate/endDate, not both.",
            });
        }

        if (isCustomRange) {
            // Dono dates ya to dono do, ya dono mat do
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: "Provide both startDate and endDate.",
                });
            }
        } else {
            const lastDays = daysParam ? Number(daysParam) : DEFAULT_DAYS;

            if (
                !Number.isInteger(lastDays) ||
                lastDays < 1 ||
                lastDays > MAX_RANGE_DAYS
            ) {
                return res.status(400).json({
                    success: false,
                    message: `days must be a whole number between 1 and ${MAX_RANGE_DAYS}.`,
                });
            }

            ({ startDate, endDate } = getLastNDaysRange(lastDays));
        }

        if (!isValidDate(startDate) || !isValidDate(endDate)) {
            return res.status(400).json({
                success: false,
                message: "Invalid date. Use YYYY-MM-DD.",
            });
        }

        if (startDate > endDate) {
            return res.status(400).json({
                success: false,
                message: "startDate cannot be after endDate.",
            });
        }

        const days = eachDay(startDate, endDate);

        if (days.length > MAX_RANGE_DAYS) {
            return res.status(400).json({
                success: false,
                message: `Date range cannot be more than ${MAX_RANGE_DAYS} days.`,
            });
        }

        const start = istDayStart(startDate);
        const end = istDayStart(endDate, 1);

        const previousStart = isCustomRange
            ? getPreviousPeriodStart(startDate, endDate, start, end)
            : new Date(start.getTime() - (end.getTime() - start.getTime()));

        // Current stats + previous summary ek saath
        const [
            currentResult,
            previousResult,
            previousPurchases,
            inventorySummary,
            purchaseAnalyticsResult,
        ] = await Promise.all([
            salesModel.aggregate([
                { $match: { saleDate: { $gte: start, $lt: end } } },
                {
                    $facet: {
                        summary: [
                            {
                                $group: {
                                    _id: null,
                                    totalSales: { $sum: "$totalAmount" },
                                    totalReceived: { $sum: "$amountReceived" },
                                    pendingAmount: { $sum: "$remainingBalance" },
                                    outputGst: { $sum: { $ifNull: ["$totalGst", 0] } },
                                    totalTransactions: { $sum: 1 },
                                },
                            },
                        ],
                        trend: [
                            {
                                $group: {
                                    _id: {
                                        $dateToString: {
                                            format: "%Y-%m-%d",
                                            date: "$saleDate",
                                            timezone: "+05:30",
                                        },
                                    },
                                    total: { $sum: "$totalAmount" },
                                    count: { $sum: 1 },
                                },
                            },
                        ],
                        status: [
                            { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
                        ],
                    },
                },
            ]),
            salesModel.aggregate(summaryPipeline(previousStart, start)),
            Purchase.aggregate(purchaseSummaryPipeline(previousStart, start)),
            Product.aggregate([
                { $match: { active: true } },
                {
                    $group: {
                        _id: null,
                        currentStockValue: {
                            $sum: { $multiply: ["$stock", "$purchasePrice"] },
                        },
                        lowStockProducts: {
                            $sum: {
                                $cond: [
                                    { $lte: ["$stock", "$minimumStock"] },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]),
            Purchase.aggregate(purchaseDashboardPipeline(start, end)),
        ]);

        const current = { ...emptySummary, ...(currentResult[0]?.summary[0] || {}) };
        const previous = { ...emptySummary, ...(previousResult[0] || {}) };
        const purchaseAnalytics = purchaseAnalyticsResult[0] || {};
        const currentPurchase = purchaseAnalytics.summary?.[0] || {};
        const previousPurchase = previousPurchases[0] || {};
        const inventory = inventorySummary[0] || {
            currentStockValue: 0,
            lowStockProducts: 0,
        };

        const trendMap = new Map(
            (currentResult[0]?.trend || []).map((item) => [item._id, item])
        );

        const salesTrend = days.map((date) => ({
            date,
            total: round2(trendMap.get(date)?.total),
            count: trendMap.get(date)?.count || 0,
        }));
        const purchaseTrendMap = new Map(
            (purchaseAnalytics.trend || []).map((item) => [item._id, item])
        );
        const combinedTrend = salesTrend.map((item) => ({
            ...item,
            purchaseTotal: round2(purchaseTrendMap.get(item.date)?.total),
            purchaseCount: purchaseTrendMap.get(item.date)?.count || 0,
        }));

        const statusMap = new Map(
            (currentResult[0]?.status || []).map((item) => [item._id, item.count])
        );

        const paymentStatus = PAYMENT_STATUSES.map((status) => ({
            status,
            count: statusMap.get(status) || 0,
        }));
        const purchaseStatusMap = new Map(
            (purchaseAnalytics.paymentStatus || []).map((item) => [item._id, item])
        );
        const purchasePaymentStatus = PAYMENT_STATUSES.map((status) => ({
            status,
            count: purchaseStatusMap.get(status)?.count || 0,
            outstanding: round2(purchaseStatusMap.get(status)?.outstanding),
        }));
        const overallSupplierPayable =
            purchaseAnalytics.overallPayable?.[0]?.total || 0;

        return res.status(200).json({
            success: true,
            range: {
                startDate,
                endDate,
                days: days.length,
                mode: isCustomRange ? "custom" : "lastDays",
            },
            summary: {
                totalSales: round2(current.totalSales),
                totalReceived: round2(current.totalReceived),
                pendingAmount: round2(current.pendingAmount),
                totalTransactions: current.totalTransactions,
                outputGst: round2(current.outputGst),
                totalPurchases: round2(currentPurchase.totalPurchases),
                inputGst: round2(currentPurchase.inputGst),
                supplierPayables: round2(currentPurchase.supplierPayables),
                periodSupplierPayables: round2(currentPurchase.supplierPayables),
                overallSupplierPayable: round2(overallSupplierPayable),
                amountPaidToSuppliers: round2(currentPurchase.amountPaid),
                purchaseChange: percentChange(
                    currentPurchase.totalPurchases || 0,
                    previousPurchase.totalPurchases || 0
                ),
                change: {
                    totalSales: percentChange(current.totalSales, previous.totalSales),
                    totalReceived: percentChange(
                        current.totalReceived,
                        previous.totalReceived
                    ),
                    pendingAmount: percentChange(
                        current.pendingAmount,
                        previous.pendingAmount
                    ),
                    totalTransactions: percentChange(
                        current.totalTransactions,
                        previous.totalTransactions
                    ),
                },
            },
            inventory: {
                currentStockValue: round2(inventory.currentStockValue),
                lowStockProducts: inventory.lowStockProducts || 0,
            },
            salesTrend: combinedTrend,
            purchaseTrend: combinedTrend.map(({ date, purchaseTotal, purchaseCount }) => ({
                date,
                total: purchaseTotal,
                count: purchaseCount,
            })),
            paymentStatus,
            purchasePaymentStatus,
            topSuppliers: (purchaseAnalytics.suppliers || []).map((supplier) => ({
                key: String(supplier._id),
                name: supplier.supplierName || "Unnamed supplier",
                totalPurchases: round2(supplier.periodPurchases),
                amountPaid: round2(supplier.periodAmountPaid),
                periodOutstanding: round2(supplier.periodOutstanding),
                overallOutstanding: round2(supplier.overallOutstanding),
                lastPurchaseDate: supplier.lastPurchaseDate,
            })),
            recentPurchases: (purchaseAnalytics.recent || []).map((purchase) => ({
                ...purchase,
                outstandingPayable: round2(
                    purchase.outstandingPayable ??
                        Math.max(
                            (purchase.productSnapshot?.invoiceTotal || 0) -
                                (purchase.amountPaid || 0),
                            0
                        )
                ),
            })),
        });
    } catch (error) {
        console.error("Get dashboard stats error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard stats.",
        });
    }
};

/* ---------------------------------------------------------------
   GET RECENT SALES (paginated)
   @ GET /api/sales/dashboard/recent?page=1&limit=5
---------------------------------------------------------------- */
export const getRecentSales = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 50);
        let { startDate, endDate } = req.query;
        const daysParam = req.query.days;
        const hasCustomRange = Boolean(startDate || endDate);

        if (daysParam && hasCustomRange) {
            return res.status(400).json({
                success: false,
                message: "Use either days or startDate/endDate, not both.",
            });
        }

        if (daysParam) {
            const days = Number(daysParam);
            if (!Number.isInteger(days) || days < 1 || days > MAX_RANGE_DAYS) {
                return res.status(400).json({
                    success: false,
                    message: `days must be a whole number between 1 and ${MAX_RANGE_DAYS}.`,
                });
            }
            ({ startDate, endDate } = getLastNDaysRange(days));
        } else if (hasCustomRange) {
            if (
                !startDate ||
                !endDate ||
                !isValidDate(startDate) ||
                !isValidDate(endDate)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Provide valid startDate and endDate values in YYYY-MM-DD format.",
                });
            }
            if (startDate > endDate) {
                return res.status(400).json({
                    success: false,
                    message: "startDate cannot be after endDate.",
                });
            }
            if (eachDay(startDate, endDate).length > MAX_RANGE_DAYS) {
                return res.status(400).json({
                    success: false,
                    message: `Date range cannot be more than ${MAX_RANGE_DAYS} days.`,
                });
            }
        }

        const filter = {};
        if (startDate && endDate) {
            filter.saleDate = {
                $gte: istDayStart(startDate),
                $lt: istDayStart(endDate, 1),
            };
        }

        const [sales, totalItems] = await Promise.all([
            salesModel
                .find(filter)
                .sort({ saleDate: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            salesModel.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            sales,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.max(Math.ceil(totalItems / limit), 1),
            },
        });
    } catch (error) {
        console.error("Get recent sales error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch recent sales.",
        });
    }
};