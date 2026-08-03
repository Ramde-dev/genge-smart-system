const db = require('../config/db');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// ── Get all products (with optional category filter & unit) ──
exports.getProducts = async (req, res) => {
    try {
        const { category } = req.query;
        let sql = "SELECT id, name, price, description, image_url, category, unit FROM products WHERE deleted_at IS NULL";
        const params = [];
        if (category) {
            sql += " AND category = ?";
            params.push(category);
        }
        const [products] = await db.execute(sql, params);
        const formattedProducts = products.map(p => ({
            ...p,
            imageUrl: p.image_url ? `http://localhost:5000${p.image_url}` : null
        }));
        res.json(formattedProducts);
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ message: "Error fetching products", error: err.message });
    }
};

// ── Get single product by ID (with category & unit) ──
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute(
            `SELECT 
                p.id, 
                p.name, 
                p.price, 
                p.description, 
                p.image_url,
                p.category,
                p.unit,
                p.seller_id,
                u.name AS seller_name,
                u.phone AS seller_phone
             FROM products p
             LEFT JOIN users u ON p.seller_id = u.id
             WHERE p.id = ? AND p.deleted_at IS NULL`,
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }
        const product = rows[0];
        product.imageUrl = product.image_url ? `http://localhost:5000${product.image_url}` : null;
        delete product.image_url; // clean response
        res.json(product);
    } catch (err) {
        console.error("Get product by ID error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ── Get buyer profile ──
exports.getProfile = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "User ID not found in request" });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (err) {
        console.error("Get profile error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ── Update buyer profile ──
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "User ID not found in request" });
        }
        const { name, phone, address } = req.body;
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (phone !== undefined) updates.phone = phone;
        if (address !== undefined) updates.address = address;

        if (req.file) {
            const currentUser = await User.findById(userId);
            if (currentUser && currentUser.avatar_url) {
                const oldPath = path.join(__dirname, '..', currentUser.avatar_url);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            updates.avatar_url = '/uploads/avatars/' + req.file.filename;
        }

        const updated = await User.update(userId, updates);
        if (!updated) {
            return res.status(404).json({ message: "User not found or no changes applied" });
        }
        const updatedUser = await User.findById(userId);
        res.json(updatedUser);
    } catch (err) {
        console.error("Update profile error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ── Get buyer orders ──
exports.getOrders = async (req, res) => {
    try {
        const buyerId = req.userId;
        if (!buyerId) {
            return res.status(401).json({ message: "User ID not found in request" });
        }
        const [orders] = await db.execute(
            `SELECT id, total_price, status, created_at 
             FROM orders 
             WHERE buyer_id = ? 
             ORDER BY created_at DESC`,
            [buyerId]
        );
        if (orders.length === 0) {
            return res.json([]);
        }
        const orderIds = orders.map(o => o.id);
        const placeholders = orderIds.map(() => '?').join(',');
        const [items] = await db.execute(
            `SELECT 
                oi.order_id,
                oi.quantity,
                oi.price,
                p.id AS product_id,
                p.name AS product_name,
                p.image_url
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id IN (${placeholders})`,
            orderIds
        );
        const itemsMap = {};
        items.forEach(item => {
            if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
            itemsMap[item.order_id].push({
                id: item.product_id,
                name: item.product_name,
                quantity: item.quantity,
                price: item.price,
                imageUrl: item.image_url ? `http://localhost:5000${item.image_url}` : null,
            });
        });
        const result = orders.map(order => ({
            ...order,
            items: itemsMap[order.id] || [],
        }));
        res.json(result);
    } catch (err) {
        console.error("Get orders error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ── Create a new order ──
exports.createOrder = async (req, res) => {
    try {
        const buyerId = req.userId;
        if (!buyerId) {
            return res.status(401).json({ message: "User ID not found" });
        }
        const { items, address, phone, paymentMethod } = req.body;
        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }
        const productIds = items.map(item => item.id);
        if (productIds.some(id => !id)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }
        const placeholders = productIds.map(() => '?').join(',');
        const [products] = await db.execute(
            `SELECT id, price, seller_id FROM products WHERE id IN (${placeholders})`,
            productIds
        );
        if (products.length !== productIds.length) {
            const foundIds = products.map(p => p.id);
            const missingIds = productIds.filter(id => !foundIds.includes(id));
            return res.status(400).json({
                message: `Some products not found: ${missingIds.join(', ')}`
            });
        }
        const sellerId = products[0]?.seller_id;
        if (!sellerId) {
            return res.status(400).json({ message: "No seller associated with products" });
        }
        const priceMap = {};
        products.forEach(p => priceMap[p.id] = p.price);
        let totalPrice = 0;
        const orderItems = items.map(item => {
            const price = priceMap[item.id];
            if (!price) throw new Error(`Product ${item.id} not found`);
            totalPrice += price * item.quantity;
            return {
                product_id: item.id,
                quantity: item.quantity,
                price: price,
            };
        });
        const [orderResult] = await db.execute(
            `INSERT INTO orders (buyer_id, seller_id, total_price, status) VALUES (?, ?, ?, 'pending')`,
            [buyerId, sellerId, totalPrice]
        );
        const orderId = orderResult.insertId;
        for (const item of orderItems) {
            await db.execute(
                `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
                [orderId, item.product_id, item.quantity, item.price]
            );
        }
        res.status(201).json({
            message: "Order placed successfully",
            orderId,
            totalPrice,
        });
    } catch (err) {
        console.error("Create order error:", err);
        res.status(500).json({
            message: "Failed to place order",
            error: err.message,
            stack: err.stack
        });
    }
};

// ── Get all tracking info for buyer ──
exports.getTracking = async (req, res) => {
    try {
        const buyerId = req.userId;
        if (!buyerId) {
            return res.status(401).json({ message: "User ID not found" });
        }
        const [orders] = await db.execute(
            `SELECT id, tracking_number, estimated_delivery, status, created_at 
             FROM orders 
             WHERE buyer_id = ? 
             ORDER BY created_at DESC`,
            [buyerId]
        );
        const result = [];
        for (const order of orders) {
            const [events] = await db.execute(
                `SELECT status, description, created_at 
                 FROM tracking_events 
                 WHERE order_id = ? 
                 ORDER BY created_at ASC`,
                [order.id]
            );
            result.push({
                ...order,
                trackingHistory: events,
            });
        }
        res.json(result);
    } catch (err) {
        console.error("Get tracking error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ── Get detailed tracking for a specific order ──
exports.getTrackingDetail = async (req, res) => {
    try {
        const buyerId = req.userId;
        if (!buyerId) {
            return res.status(401).json({ message: "User ID not found" });
        }
        const { orderId } = req.params;
        const [order] = await db.execute(
            `SELECT id, tracking_number, estimated_delivery, status, created_at 
             FROM orders 
             WHERE id = ? AND buyer_id = ?`,
            [orderId, buyerId]
        );
        if (order.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }
        const [events] = await db.execute(
            `SELECT status, description, created_at 
             FROM tracking_events 
             WHERE order_id = ? 
             ORDER BY created_at ASC`,
            [orderId]
        );
        res.json({
            ...order[0],
            trackingHistory: events,
        });
    } catch (err) {
        console.error("Get tracking detail error:", err);
        res.status(500).json({ message: "Server error" });
    }
};