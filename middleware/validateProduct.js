
const validateProduct = (req, res, next) => {
    const { name, category, price, quantity, lowStockThreshold } = req.body;

    if (req.method === "POST") {
        if (!name || !category || price === undefined || quantity === undefined) {
            return res.status(400).json({
                message: "Name, category, price and quantity are required"
            });
        }
    }

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
        return res.status(400).json({ message: "Invalid product name" });
    }

    if (category !== undefined && (typeof category !== "string" || !category.trim())) {
        return res.status(400).json({ message: "Invalid category" });
    }

    if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
        return res.status(400).json({ message: "Price must be a non-negative number" });
    }

    if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 0)) {
        return res.status(400).json({ message: "Quantity must be a non-negative integer" });
    }

    if (lowStockThreshold !== undefined &&
        (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0)) {
        return res.status(400).json({ message: "Invalid low stock threshold" });
    }

    next();
};

module.exports = validateProduct;
