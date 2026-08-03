const pool = require('../config/db');

// ── 1. SELLER DASHBOARD ──
exports.getDashboard = async (req, res) => {
    try {
        const sellerId = req.user.id;

        // Get seller stats
        const [stats] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM products WHERE seller_id = ? AND deleted_at IS NULL) as total_products,
                (SELECT COUNT(*) FROM orders WHERE seller_id = ?) as total_orders,
                (SELECT COUNT(*) FROM orders WHERE seller_id = ? AND status = 'pending') as pending_orders,
                (SELECT COUNT(*) FROM orders WHERE seller_id = ? AND status = 'delivered') as completed_orders,
                (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE seller_id = ? AND status = 'delivered') as total_sales
        `, [sellerId, sellerId, sellerId, sellerId, sellerId]);

        // Get recent orders
        const [recentOrders] = await pool.query(`
            SELECT 
                o.id,
                o.total_price,
                o.status,
                o.created_at,
                u.name as buyer_name,
                u.email as buyer_email,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
            FROM orders o
            JOIN users u ON o.buyer_id = u.id
            WHERE o.seller_id = ?
            ORDER BY o.created_at DESC
            LIMIT 10
        `, [sellerId]);

        // Get low stock products
        const [lowStockProducts] = await pool.query(`
            SELECT 
                id,
                name,
                price,
                stock,
                category,
                created_at
            FROM products
            WHERE seller_id = ? AND stock <= 10 AND deleted_at IS NULL
            ORDER BY stock ASC
            LIMIT 10
        `, [sellerId]);

        // Get monthly sales data
        const [monthlySales] = await pool.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COALESCE(SUM(total_price), 0) as total,
                COUNT(*) as orders
            FROM orders
            WHERE seller_id = ? 
            AND status = 'delivered'
            AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        `, [sellerId]);

        res.json({
            success: true,
            stats: stats[0] || {
                total_products: 0,
                total_orders: 0,
                pending_orders: 0,
                completed_orders: 0,
                total_sales: 0
            },
            recent_orders: recentOrders || [],
            low_stock_products: lowStockProducts || [],
            monthly_sales: monthlySales || []
        });

    } catch (err) {
        console.error('Seller dashboard error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: err.message
        });
    }
};

// ── 2. MANAGE PRODUCTS ──

// Get all products for seller
exports.getProducts = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { search, category, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT 
                id,
                name,
                description,
                price,
                stock,
                category,
                image_url,
                status,
                created_at,
                updated_at
            FROM products
            WHERE seller_id = ? AND deleted_at IS NULL
        `;
        const params = [sellerId];

        if (search) {
            sql += ' AND (name LIKE ? OR description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [products] = await pool.query(sql, params);

        // Get total count
        let countSql = 'SELECT COUNT(*) as total FROM products WHERE seller_id = ? AND deleted_at IS NULL';
        const countParams = [sellerId];
        if (search) {
            countSql += ' AND (name LIKE ? OR description LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`);
        }
        if (category) {
            countSql += ' AND category = ?';
            countParams.push(category);
        }
        const [countResult] = await pool.query(countSql, countParams);

        res.json({
            success: true,
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total || 0,
                totalPages: Math.ceil((countResult[0].total || 0) / limit)
            }
        });

    } catch (err) {
        console.error('Get products error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: err.message
        });
    }
};

// Add new product
exports.addProduct = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { name, description, price, stock, category, image_url } = req.body;

        if (!name || !price) {
            return res.status(400).json({
                success: false,
                message: 'Name and price are required'
            });
        }

        const [result] = await pool.query(`
            INSERT INTO products 
            (seller_id, name, description, price, stock, category, image_url, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [sellerId, name, description || null, price, stock || 0, category || null, image_url || null, 'active']);

        const [newProduct] = await pool.query(
            'SELECT * FROM products WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Product added successfully',
            product: newProduct[0]
        });

    } catch (err) {
        console.error('Add product error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to add product',
            error: err.message
        });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { productId } = req.params;
        const { name, description, price, stock, category, image_url, status } = req.body;

        const updates = [];
        const values = [];

        if (name) {
            updates.push('name = ?');
            values.push(name);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (price !== undefined) {
            updates.push('price = ?');
            values.push(price);
        }
        if (stock !== undefined) {
            updates.push('stock = ?');
            values.push(stock);
        }
        if (category !== undefined) {
            updates.push('category = ?');
            values.push(category);
        }
        if (image_url !== undefined) {
            updates.push('image_url = ?');
            values.push(image_url);
        }
        if (status && ['active', 'inactive'].includes(status)) {
            updates.push('status = ?');
            values.push(status);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        values.push(productId);
        values.push(sellerId);

        const [result] = await pool.query(
            `UPDATE products SET ${updates.join(', ')} WHERE id = ? AND seller_id = ? AND deleted_at IS NULL`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const [updatedProduct] = await pool.query(
            'SELECT * FROM products WHERE id = ?',
            [productId]
        );

        res.json({
            success: true,
            message: 'Product updated successfully',
            product: updatedProduct[0]
        });

    } catch (err) {
        console.error('Update product error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to update product',
            error: err.message
        });
    }
};

// Delete product (soft delete)
exports.deleteProduct = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { productId } = req.params;

        const [result] = await pool.query(
            'UPDATE products SET deleted_at = NOW(), status = "inactive" WHERE id = ? AND seller_id = ?',
            [productId, sellerId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (err) {
        console.error('Delete product error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to delete product',
            error: err.message
        });
    }
};

// ── 3. MANAGE ORDERS ──

// Get all orders for seller
exports.getOrders = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT 
                o.id,
                o.total_price,
                o.status,
                o.created_at,
                o.updated_at,
                u.name as buyer_name,
                u.email as buyer_email,
                u.phone as buyer_phone,
                u.address as buyer_address,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('name', p.name, 'quantity', oi.quantity, 'price', oi.price)) 
                 FROM order_items oi 
                 JOIN products p ON oi.product_id = p.id 
                 WHERE oi.order_id = o.id) as items
            FROM orders o
            JOIN users u ON o.buyer_id = u.id
            WHERE o.seller_id = ?
        `;
        const params = [sellerId];

        if (status) {
            sql += ' AND o.status = ?';
            params.push(status);
        }

        sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [orders] = await pool.query(sql, params);

        // Get total count
        let countSql = 'SELECT COUNT(*) as total FROM orders WHERE seller_id = ?';
        const countParams = [sellerId];
        if (status) {
            countSql += ' AND status = ?';
            countParams.push(status);
        }
        const [countResult] = await pool.query(countSql, countParams);

        res.json({
            success: true,
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total || 0,
                totalPages: Math.ceil((countResult[0].total || 0) / limit)
            }
        });

    } catch (err) {
        console.error('Get orders error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: err.message
        });
    }
};

// Get single order details
exports.getOrderDetails = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { orderId } = req.params;

        const [order] = await pool.query(`
            SELECT 
                o.*,
                u.name as buyer_name,
                u.email as buyer_email,
                u.phone as buyer_phone,
                u.address as buyer_address,
                a.name as agent_name,
                a.phone as agent_phone,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                    'product_id', p.id,
                    'product_name', p.name,
                    'quantity', oi.quantity,
                    'price', oi.price,
                    'subtotal', oi.quantity * oi.price,
                    'image_url', p.image_url
                )) FROM order_items oi 
                JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = o.id) as items
            FROM orders o
            JOIN users u ON o.buyer_id = u.id
            LEFT JOIN users a ON o.agent_id = a.id
            WHERE o.id = ? AND o.seller_id = ?
        `, [orderId, sellerId]);

        if (order.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            order: order[0]
        });

    } catch (err) {
        console.error('Get order details error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order details',
            error: err.message
        });
    }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { orderId } = req.params;
        const { status, notes } = req.body;

        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const [orderCheck] = await pool.query(
            'SELECT id, buyer_id FROM orders WHERE id = ? AND seller_id = ?',
            [orderId, sellerId]
        );

        if (orderCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        await pool.query(
            'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, orderId]
        );

        // Create notification for buyer
        const statusMessages = {
            'pending': 'Your order is pending confirmation',
            'processing': 'Your order is being processed',
            'shipped': 'Your order has been shipped!',
            'delivered': 'Your order has been delivered!',
            'cancelled': 'Your order has been cancelled'
        };

        await pool.query(`
            INSERT INTO notifications 
            (user_id, order_id, title, message, type) 
            VALUES (?, ?, ?, ?, ?)
        `, [
            orderCheck[0].buyer_id,
            orderId,
            `Order #${orderId} Updated`,
            statusMessages[status] || `Order status updated to: ${status}`,
            'order'
        ]);

        res.json({
            success: true,
            message: `Order status updated to ${status}`
        });

    } catch (err) {
        console.error('Update order status error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: err.message
        });
    }
};

// ── 4. ASSIGN AGENT TO ORDER ──

// Get available agents
exports.getAvailableAgents = async (req, res) => {
    try {
        const [agents] = await pool.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.phone,
                u.avatar_url,
                da.id as delivery_agent_id,
                da.is_available,
                (SELECT COUNT(*) FROM orders WHERE agent_id = u.id AND status NOT IN ('delivered', 'cancelled')) as active_deliveries
            FROM users u
            JOIN delivery_agents da ON u.id = da.user_id
            WHERE u.role = 'agent' 
            AND u.status = 'active'
            AND da.is_available = true
            ORDER BY u.name ASC
        `);

        res.json({
            success: true,
            agents
        });

    } catch (err) {
        console.error('Get available agents error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch available agents',
            error: err.message
        });
    }
};

// Assign agent to order
exports.assignAgent = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { orderId } = req.params;
        const { agentId } = req.body;

        if (!agentId) {
            return res.status(400).json({
                success: false,
                message: 'Agent ID is required'
            });
        }

        // Verify order belongs to seller
        const [orderCheck] = await pool.query(
            'SELECT id, buyer_id, status FROM orders WHERE id = ? AND seller_id = ?',
            [orderId, sellerId]
        );

        if (orderCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Verify agent exists and is available
        const [agentCheck] = await pool.query(`
            SELECT u.id, u.name, u.email, u.phone, da.is_available 
            FROM users u
            JOIN delivery_agents da ON u.id = da.user_id
            WHERE u.id = ? AND u.role = 'agent' AND da.is_available = true
        `, [agentId]);

        if (agentCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Agent not available'
            });
        }

        // Check if agent already assigned to this order
        const [existing] = await pool.query(
            'SELECT agent_id FROM orders WHERE id = ? AND agent_id IS NOT NULL',
            [orderId]
        );

        if (existing.length > 0 && existing[0].agent_id) {
            return res.status(400).json({
                success: false,
                message: 'Order already has an assigned agent'
            });
        }

        // Assign agent to order
        await pool.query(
            'UPDATE orders SET agent_id = ?, agent_assigned_at = NOW(), status = "assigned" WHERE id = ?',
            [agentId, orderId]
        );

        // Add tracking event
        await pool.query(`
            INSERT INTO tracking_events (order_id, agent_id, status) 
            VALUES (?, ?, 'assigned')
        `, [orderId, agentId]);

        // Notify buyer
        await pool.query(`
            INSERT INTO notifications 
            (user_id, order_id, title, message, type) 
            VALUES (?, ?, ?, ?, ?)
        `, [
            orderCheck[0].buyer_id,
            orderId,
            '✅ Delivery Agent Assigned',
            `Your order #${orderId} has been assigned to ${agentCheck[0].name} for delivery. You can track your order in real-time.`,
            'order'
        ]);

        // Notify agent
        await pool.query(`
            INSERT INTO notifications 
            (user_id, order_id, title, message, type) 
            VALUES (?, ?, ?, ?, ?)
        `, [
            agentId,
            orderId,
            '📦 New Delivery Assignment',
            `You have been assigned to deliver order #${orderId}. Please check your dashboard for details.`,
            'order'
        ]);

        res.json({
            success: true,
            message: 'Agent assigned successfully',
            agent: agentCheck[0],
            order_id: orderId
        });

    } catch (err) {
        console.error('Assign agent error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to assign agent',
            error: err.message
        });
    }
};

// ── 5. SELLER PROFILE ──

// Get seller profile
exports.getProfile = async (req, res) => {
    try {
        const sellerId = req.user.id;

        const [profile] = await pool.query(
            `SELECT 
                id,
                name,
                email,
                phone,
                address,
                avatar_url,
                shopName,
                bio,
                status,
                created_at
            FROM users 
            WHERE id = ? AND role = 'Seller'`,
            [sellerId]
        );

        if (profile.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Seller not found'
            });
        }

        // Get seller stats
        const [stats] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM products WHERE seller_id = ? AND deleted_at IS NULL) as total_products,
                (SELECT COUNT(*) FROM orders WHERE seller_id = ?) as total_orders,
                (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE seller_id = ? AND status = 'delivered') as total_sales,
                (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE seller_id = ?) as avg_rating
        `, [sellerId, sellerId, sellerId, sellerId]);

        res.json({
            success: true,
            profile: profile[0],
            stats: stats[0] || {
                total_products: 0,
                total_orders: 0,
                total_sales: 0,
                avg_rating: 0
            }
        });

    } catch (err) {
        console.error('Get seller profile error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile',
            error: err.message
        });
    }
};

// Update seller profile
exports.updateProfile = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { name, phone, address, shopName, bio } = req.body;

        const updates = [];
        const values = [];

        if (name) {
            updates.push('name = ?');
            values.push(name);
        }
        if (phone !== undefined) {
            updates.push('phone = ?');
            values.push(phone);
        }
        if (address !== undefined) {
            updates.push('address = ?');
            values.push(address);
        }
        if (shopName !== undefined) {
            updates.push('shopName = ?');
            values.push(shopName);
        }
        if (bio !== undefined) {
            updates.push('bio = ?');
            values.push(bio);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        values.push(sellerId);

        await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND role = 'Seller'`,
            values
        );

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (err) {
        console.error('Update seller profile error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: err.message
        });
    }
};

// ── 6. ANALYTICS ──

// Get sales analytics
exports.getAnalytics = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { period = 'month' } = req.query;

        let dateFormat;
        let interval;
        switch (period) {
            case 'week':
                dateFormat = '%Y-%m-%d';
                interval = '7 DAY';
                break;
            case 'month':
                dateFormat = '%Y-%m-%d';
                interval = '30 DAY';
                break;
            case 'year':
                dateFormat = '%Y-%m';
                interval = '365 DAY';
                break;
            default:
                dateFormat = '%Y-%m-%d';
                interval = '30 DAY';
        }

        // Sales over time
        const [salesData] = await pool.query(`
            SELECT 
                DATE_FORMAT(created_at, ?) as date,
                COALESCE(SUM(total_price), 0) as total_sales,
                COUNT(*) as order_count
            FROM orders
            WHERE seller_id = ? 
            AND status = 'delivered'
            AND created_at >= DATE_SUB(NOW(), INTERVAL ${interval})
            GROUP BY DATE_FORMAT(created_at, ?)
            ORDER BY date ASC
        `, [dateFormat, sellerId, dateFormat]);

        // Top products
        const [topProducts] = await pool.query(`
            SELECT 
                p.id,
                p.name,
                p.price,
                COALESCE(SUM(oi.quantity), 0) as total_sold,
                COALESCE(SUM(oi.quantity * oi.price), 0) as revenue
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'delivered'
            WHERE p.seller_id = ? AND p.deleted_at IS NULL
            GROUP BY p.id
            ORDER BY total_sold DESC
            LIMIT 10
        `, [sellerId]);

        // Category breakdown
        const [categoryData] = await pool.query(`
            SELECT 
                p.category,
                COUNT(DISTINCT p.id) as product_count,
                COALESCE(SUM(oi.quantity * oi.price), 0) as revenue
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'delivered'
            WHERE p.seller_id = ? AND p.deleted_at IS NULL
            GROUP BY p.category
            ORDER BY revenue DESC
        `, [sellerId]);

        res.json({
            success: true,
            sales_data: salesData,
            top_products: topProducts,
            category_data: categoryData
        });

    } catch (err) {
        console.error('Get analytics error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics',
            error: err.message
        });
    }
};