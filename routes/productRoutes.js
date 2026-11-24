
const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const validateProduct = require("../middleware/validateProduct");

const router = express.Router();

// Create Product
router.post("/", validateProduct, async (req, res, next) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json(product);
    } catch (error) {
        next(error);
    }
});

// Get All Products with Filtering, Sorting and Pagination
router.get("/", async (req, res, next) => {
    try {
        const {
            category,
            minPrice,
            maxPrice,
            sort = "createdAt",
            order = "desc",
            page = 1,
            limit = 10
        } = req.query;

        const filter = {};

        if (category) filter.category = category;

        if (minPrice !== undefined || maxPrice !== undefined) {
            filter.price = {};

            if (minPrice !== undefined) {
                filter.price.$gte = Number(minPrice);
            }

            if (maxPrice !== undefined) {
                filter.price.$lte = Number(maxPrice);
            }

            if (
                Object.values(filter.price).some(value => !Number.isFinite(value))
            ) {
                return res.status(400).json({ message: "Invalid price filter" });
            }
        }

        const pageNumber = Number(page);
        const limitNumber = Number(limit);

        if (
            !Number.isInteger(pageNumber) || pageNumber < 1 ||
            !Number.isInteger(limitNumber) || limitNumber < 1 ||
            limitNumber > 100
        ) {
            return res.status(400).json({ message: "Invalid pagination values" });
        }

        const sortOrder = order === "asc" ? 1 : order === "desc" ? -1 : null;

        if (!sortOrder) {
            return res.status(400).json({ message: "Order must be asc or desc" });
        }

        const allowedSort = ["name", "price", "quantity", "createdAt"];

        if (!allowedSort.includes(sort)) {
            return res.status(400).json({ message: "Invalid sort field" });
        }

        const products = await Product.find(filter)
            .sort({ [sort]: sortOrder })
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber);

        const total = await Product.countDocuments(filter);

        res.json({
            total,
            page: pageNumber,
            totalPages: Math.ceil(total / limitNumber),
            products
        });
    } catch (error) {
        next(error);
    }
});

// Low Stock Report
router.get("/low-stock", async (req, res, next) => {
    try {
        const products = await Product.find({
            $expr: {
                $lte: ["$quantity", "$lowStockThreshold"]
            }
        });

        res.json({
            count: products.length,
            products
        });
    } catch (error) {
        next(error);
    }
});

// Category-wise Inventory Summary
router.get("/category-summary", async (req, res, next) => {
    try {
        const summary = await Product.aggregate([
            {
                $group: {
                    _id: "$category",
                    totalProducts: { $sum: 1 },
                    totalQuantity: { $sum: "$quantity" },
                    totalValue: {
                        $sum: { $multiply: ["$price", "$quantity"] }
                    }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        res.json(summary);
    } catch (error) {
        next(error);
    }
});

// Get Single Product
router.get("/:id", async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json(product);
    } catch (error) {
        next(error);
    }
});

// Update Product
router.put("/:id", validateProduct, async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json(product);
    } catch (error) {
        next(error);
    }
});

// Safe Stock Adjustment
router.patch("/:id/stock", async (req, res, next) => {
    try {
        const { change } = req.body;

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        if (!Number.isInteger(change) || change === 0) {
            return res.status(400).json({
                message: "Change must be a non-zero integer"
            });
        }

        const filter = { _id: req.params.id };

        if (change < 0) {
            filter.quantity = { $gte: -change };
        }

        const product = await Product.findOneAndUpdate(
            filter,
            { $inc: { quantity: change } },
            { new: true, runValidators: true }
        );

        if (!product) {
            const exists = await Product.exists({ _id: req.params.id });

            if (!exists) {
                return res.status(404).json({ message: "Product not found" });
            }

            return res.status(400).json({
                message: "Insufficient stock"
            });
        }

        res.json({
            message: "Stock adjusted successfully",
            product
        });
    } catch (error) {
        next(error);
    }
});

// Delete Product
router.delete("/:id", async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json({ message: "Product deleted successfully" });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
