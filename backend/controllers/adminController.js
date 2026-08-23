const pool = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getPayouts = async (req, res) => {
    try {
        const [payouts] = await pool.query(`
                 SELECT sp.id, sp.order_id, sp.seller_id, sp.amount, sp.status, sp.paid_at,
                     sp.created_at, u.name AS seller_name, u.email AS seller_email,
                     u.phone AS seller_phone
            FROM seller_payouts sp
            JOIN users u ON u.id = sp.seller_id
            ORDER BY sp.created_at DESC
        `);
        res.json({ success: true, payouts });
    } catch (err) {
        console.error('Get payouts error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch seller payouts' });
    }
};

exports.paySellerPayout = async (req, res) => {
    try {
        const [payout] = await pool.query(
            `SELECT sp.id, u.phone AS seller_phone
             FROM seller_payouts sp
             JOIN users u ON u.id = sp.seller_id
             WHERE sp.id = ? AND sp.status = 'pending'`,
            [req.params.payoutId]
        );
        if (!payout.length) {
            return res.status(404).json({ success: false, message: 'Pending payout not found' });
        }
        if (!payout[0].seller_phone || !payout[0].seller_phone.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Seller must add a phone number before payment can be released'
            });
        }

        const [result] = await pool.query(
            `UPDATE seller_payouts SET status = 'paid', paid_at = NOW()
             WHERE id = ? AND status = 'pending'`,
            [req.params.payoutId]
        );
        if (!result.affectedRows) {
            return res.status(404).json({ success: false, message: 'Pending payout not found' });
        }
        res.json({ success: true, message: 'Seller payout marked as paid' });
    } catch (err) {
        console.error('Pay seller payout error:', err);
        res.status(500).json({ success: false, message: 'Failed to pay seller payout' });
    }
};

// ── 1. DASHBOARD ──
exports.getDashboard = async (req, res) => {
    try {
        const [totalUsers] = await pool.query('SELECT COUNT(*) as count FROM users');
        const [totalSellers] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "Seller"');

        let fraudCount = 0;
        try {
            const [fraudAlerts] = await pool.query('SELECT COUNT(*) as count FROM fraud_alerts WHERE status = "pending"');
            fraudCount = fraudAlerts[0].count || 0;
        } catch (err) {
            console.warn('Fraud alerts table missing – using fallback');
        }

        let avgQuality = 0;
        try {
            const [avgQualityResult] = await pool.query('SELECT ROUND(AVG(score), 1) as avg FROM quality_scores');
            avgQuality = avgQualityResult[0].avg || 0;
        } catch (err) {
            console.warn('Quality scores table missing – using fallback');
        }

        let recommendations = [];
        try {
            const [recs] = await pool.query(`
                SELECT 
                    CONCAT('Seller "', u.name, '" has low quality score – review') as message,
                    CASE 
                        WHEN qs.score < 2.5 THEN 'critical'
                        WHEN qs.score < 3.5 THEN 'high'
                        ELSE 'medium'
                    END as priority
                FROM users u
                JOIN quality_scores qs ON u.id = qs.seller_id
                WHERE qs.score < 4.0
                ORDER BY qs.score ASC
                LIMIT 5
            `);
            recommendations = recs;
        } catch (err) {
            console.warn('Could not fetch recommendations');
        }

        let sellerAnalytics = [];
        try {
            const [sellers] = await pool.query(`
                SELECT 
                    u.name, 
                    COALESCE(SUM(o.total_price), 0) as sales, 
                    COALESCE(AVG(qs.score), 0) as rating
                FROM users u
                LEFT JOIN orders o ON u.id = o.seller_id AND o.status = 'delivered'
                LEFT JOIN quality_scores qs ON u.id = qs.seller_id
                WHERE u.role = 'Seller'
                GROUP BY u.id
                ORDER BY sales DESC
                LIMIT 5
            `);
            sellerAnalytics = sellers.map(s => ({
                name: s.name,
                sales: Number(s.sales) || 0,
                rating: Number(s.rating) || 0,
            }));
        } catch (err) {
            console.warn('Could not fetch seller analytics');
        }

        let recentActivity = [];
        try {
            const [activity] = await pool.query(`
                (SELECT 
                    CONCAT('New user "', name, '" registered') as action,
                    created_at as time
                FROM users 
                ORDER BY created_at DESC 
                LIMIT 3)
                UNION ALL
                (SELECT 
                    CONCAT('Fraud alert for "', u.name, '"') as action,
                    fa.created_at as time
                FROM fraud_alerts fa
                JOIN users u ON fa.user_id = u.id
                ORDER BY fa.created_at DESC 
                LIMIT 2)
                ORDER BY time DESC
                LIMIT 5
            `);
            recentActivity = activity.map(a => ({
                action: a.action,
                time: a.time,
            }));
        } catch (err) {
            console.warn('Could not fetch recent activity');
        }

        let chartData = [];
        try {
            const [rows] = await pool.query(`
                SELECT DATE(created_at) as date, SUM(total_price) as value
                FROM orders
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `);
            chartData = rows.map(row => ({
                date: row.date,
                value: Number(row.value) || 0,
            }));
        } catch (err) {
            console.warn('Could not fetch chart data – orders table may be missing');
        }

        res.json({
            stats: {
                totalUsers: totalUsers[0].count || 0,
                totalSellers: totalSellers[0].count || 0,
                fraudAlerts: fraudCount,
                avgQualityScore: avgQuality,
            },
            recommendations,
            sellerAnalytics,
            recentActivity,
            chartData,
        });
    } catch (err) {
        console.error('Admin dashboard error:', err);
        res.status(500).json({ message: 'Failed to fetch dashboard data', error: err.message });
    }
};

// ── 2. MANAGE USERS ──
exports.getUsers = async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, name, email, role, status, created_at as joined FROM users ORDER BY created_at DESC'
        );
        res.json(users);
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};

exports.updateUserStatus = async (req, res) => {
    const { userId, status } = req.body;
    try {
        await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, userId]);
        res.json({ message: 'User status updated' });
    } catch (err) {
        console.error('Update user status error:', err);
        res.status(500).json({ message: 'Failed to update user status' });
    }
};

// ── 3. MANAGE SELLERS ──
exports.getSellers = async (req, res) => {
    try {
        const [sellers] = await pool.query(`
            SELECT 
                id, 
                name as store_name, 
                email, 
                shopName, 
                status,
                created_at
            FROM users 
            WHERE role = 'Seller'
            ORDER BY created_at DESC
        `);

        const result = [];
        for (const seller of sellers) {
            let rating = null;
            let orders = 0;

            try {
                const [ratingResult] = await pool.query(
                    'SELECT AVG(score) as avg_rating FROM quality_scores WHERE seller_id = ?',
                    [seller.id]
                );
                rating = ratingResult[0]?.avg_rating || null;
            } catch (err) {
                console.warn('Could not fetch rating for seller', seller.id);
            }

            try {
                const [ordersResult] = await pool.query(
                    'SELECT COUNT(*) as count FROM orders WHERE seller_id = ?',
                    [seller.id]
                );
                orders = ordersResult[0]?.count || 0;
            } catch (err) {
                console.warn('Could not fetch orders for seller', seller.id);
            }

            result.push({
                ...seller,
                rating: rating,
                orders: orders,
            });
        }

        res.json(result);
    } catch (err) {
        console.error('Get sellers error:', err);
        res.status(500).json({ message: 'Failed to fetch sellers', error: err.message });
    }
};

exports.approveSeller = async (req, res) => {
    const { sellerId } = req.params;
    try {
        await pool.query('UPDATE users SET status = "active" WHERE id = ? AND role = "Seller"', [sellerId]);
        res.json({ message: 'Seller approved successfully' });
    } catch (err) {
        console.error('Approve seller error:', err);
        res.status(500).json({ message: 'Failed to approve seller' });
    }
};

exports.suspendSeller = async (req, res) => {
    const { sellerId } = req.params;
    try {
        await pool.query('UPDATE users SET status = "suspended" WHERE id = ? AND role = "Seller"', [sellerId]);
        res.json({ message: 'Seller suspended successfully' });
    } catch (err) {
        console.error('Suspend seller error:', err);
        res.status(500).json({ message: 'Failed to suspend seller' });
    }
};

// ── 4. FRAUD ALERTS ──
exports.getFraudAlerts = async (req, res) => {
    try {
        const [alerts] = await pool.query(`
            SELECT 
                fa.*, 
                u.name as user_name,
                u.email as user_email
            FROM fraud_alerts fa
            JOIN users u ON fa.user_id = u.id
            ORDER BY fa.created_at DESC
        `);
        res.json(alerts);
    } catch (err) {
        console.error('Get fraud alerts error:', err);
        res.status(500).json({ message: 'Failed to fetch fraud alerts' });
    }
};

exports.resolveFraudAlert = async (req, res) => {
    const { alertId } = req.params;
    try {
        await pool.query('UPDATE fraud_alerts SET status = "resolved" WHERE id = ?', [alertId]);
        res.json({ message: 'Alert resolved' });
    } catch (err) {
        console.error('Resolve fraud alert error:', err);
        res.status(500).json({ message: 'Failed to resolve alert' });
    }
};

// ── 5. QUALITY SCORES ──
exports.getQualityScores = async (req, res) => {
    try {
        const [scores] = await pool.query(`
            SELECT 
                u.name as seller,
                qs.score,
                qs.calculated_at,
                COUNT(o.id) as orders,
                COALESCE(AVG(o.total_price), 0) as avg_order_value
            FROM quality_scores qs
            JOIN users u ON qs.seller_id = u.id
            LEFT JOIN orders o ON u.id = o.seller_id AND o.status = 'delivered'
            GROUP BY qs.id
            ORDER BY qs.calculated_at DESC
        `);
        res.json(scores);
    } catch (err) {
        console.error('Get quality scores error:', err);
        res.status(500).json({ message: 'Failed to fetch quality scores' });
    }
};

// ── 6. REPORTS ──
exports.getReports = async (req, res) => {
    try {
        const [reports] = await pool.query(
            `SELECT id, name, report_date AS date, type, status, created_at
             FROM reports ORDER BY created_at DESC`
        );
        res.json(reports);
    } catch (err) {
        console.error('Get reports error:', err);
        res.status(500).json({ message: 'Failed to fetch reports' });
    }
};

exports.generateReport = async (req, res) => {
    try {
        const [[sales]] = await pool.query(`
            SELECT COUNT(*) AS orders, COALESCE(SUM(total_price), 0) AS revenue
            FROM orders WHERE status = 'delivered'
        `);
        const [[users]] = await pool.query('SELECT COUNT(*) AS total FROM users');
        const [[fraud]] = await pool.query('SELECT COUNT(*) AS total FROM fraud_logs');
        const report = {
            sales: { orders: Number(sales.orders), revenue: Number(sales.revenue) },
            users: { total: Number(users.total) },
            fraud: { total: Number(fraud.total) },
        };
        const [result] = await pool.query(
            `INSERT INTO reports (name, report_date, type, status, data_json)
             VALUES (?, CURDATE(), 'System', 'ready', ?)`,
            [`System Report ${new Date().toISOString().slice(0, 10)}`, JSON.stringify(report)]
        );
        res.status(201).json({ message: 'Report generated', reportId: result.insertId });
    } catch (err) {
        console.error('Generate report error:', err);
        res.status(500).json({ message: 'Failed to generate report' });
    }
};

exports.downloadReport = async (req, res) => {
    try {
        const [reports] = await pool.query(
            'SELECT name, report_date, type, status, data_json FROM reports WHERE id = ?',
            [req.params.reportId]
        );
        if (!reports.length) return res.status(404).json({ message: 'Report not found' });
        const report = reports[0];
        const data = typeof report.data_json === 'string' ? JSON.parse(report.data_json) : report.data_json;
        const rows = [['Report', report.name], ['Date', report.report_date], ['Type', report.type], ['Status', report.status]];
        Object.entries(data).forEach(([section, values]) => {
            Object.entries(values).forEach(([key, value]) => rows.push([`${section} ${key}`, value]));
        });
        const csv = rows
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${report.name.replace(/[^a-z0-9]+/gi, '_')}.csv"`);
        res.send(csv);
    } catch (err) {
        console.error('Download report error:', err);
        res.status(500).json({ message: 'Failed to download report' });
    }
};

// ── 7. MANAGE PRODUCTS ──
exports.getProducts = async (req, res) => {
    try {
        const { search, category } = req.query;
        let sql = `
            SELECT p.*, u.name as seller_name, u.email as seller_email
            FROM products p
            LEFT JOIN users u ON p.seller_id = u.id
            WHERE p.deleted_at IS NULL
        `;
        const params = [];
        if (search) {
            sql += ' AND (p.name LIKE ? OR p.description LIKE ? OR u.name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (category) {
            sql += ' AND p.category = ?';
            params.push(category);
        }
        sql += ' ORDER BY p.created_at DESC';
        const [products] = await pool.query(sql, params);
        res.json(products);
    } catch (err) {
        console.error('Get products error:', err);
        res.status(500).json({ message: 'Failed to fetch products' });
    }
};

exports.deleteProduct = async (req, res) => {
    const { productId } = req.params;
    try {
        await pool.query('UPDATE products SET deleted_at = NOW() WHERE id = ?', [productId]);
        res.json({ message: 'Product removed from buyer view' });
    } catch (err) {
        console.error('Delete product error:', err);
        res.status(500).json({ message: 'Failed to delete product' });
    }
};

// ── 8. MANAGE AGENTS ──

// Get all agents with delivery_agent info
exports.getAgents = async (req, res) => {
    try {
        const [agents] = await pool.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.role,
                u.status,
                u.phone,
                u.address,
                u.avatar_url,
                u.shopName,
                u.bio,
                u.created_at,
                da.id as delivery_agent_id,
                da.is_available
            FROM users u
            LEFT JOIN delivery_agents da ON u.id = da.user_id
            WHERE u.role = 'agent'
            ORDER BY u.created_at DESC
        `);

        // If no agents found, return empty array
        if (!agents || agents.length === 0) {
            return res.status(200).json({
                success: true,
                agents: [],
                message: 'No agents found'
            });
        }

        // Remove passwords from response
        const safeAgents = agents.map(agent => {
            const { password, ...safeAgent } = agent;
            return safeAgent;
        });

        res.status(200).json({
            success: true,
            agents: safeAgents
        });

    } catch (err) {
        console.error('Get agents error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch agents',
            error: err.message
        });
    }
};

// Add a new agent with delivery_agent record
exports.addAgent = async (req, res) => {
    try {
        const { name, email, password, phone, address, shopName, bio } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Name, email and password are required' 
            });
        }

        // Check if email already exists
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Email already registered' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert into users table with role 'agent'
        const [userResult] = await pool.query(
            `INSERT INTO users 
            (name, email, password, role, status, phone, address, shopName, bio) 
            VALUES (?, ?, ?, 'agent', 'active', ?, ?, ?, ?)`,
            [name, email, hashedPassword, phone || null, address || null, shopName || null, bio || null]
        );

        const userId = userResult.insertId;

        // ── Insert into delivery_agents table ──
        let deliveryAgentId = null;
        try {
            // Check if delivery_agents table exists
            const [tableCheck] = await pool.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = 'delivery_agents'
            `);

            if (tableCheck[0].count > 0) {
                // Check columns in delivery_agents table
                const [columns] = await pool.query(`
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'delivery_agents'
                `);
                const columnNames = columns.map(col => col.COLUMN_NAME);

                // Build dynamic insert for delivery_agents
                let agentFields = ['user_id', 'name'];
                let agentPlaceholders = ['?', '?'];
                let agentValues = [userId, name];

                if (columnNames.includes('phone')) {
                    agentFields.push('phone');
                    agentPlaceholders.push('?');
                    agentValues.push(phone || null);
                }
                if (columnNames.includes('email')) {
                    agentFields.push('email');
                    agentPlaceholders.push('?');
                    agentValues.push(email);
                }
                if (columnNames.includes('address')) {
                    agentFields.push('address');
                    agentPlaceholders.push('?');
                    agentValues.push(address || null);
                }
                if (columnNames.includes('is_available')) {
                    agentFields.push('is_available');
                    agentPlaceholders.push('?');
                    agentValues.push(true);
                }
                if (columnNames.includes('status')) {
                    agentFields.push('status');
                    agentPlaceholders.push('?');
                    agentValues.push('active');
                }

                const [deliveryResult] = await pool.query(
                    `INSERT INTO delivery_agents (${agentFields.join(', ')}) VALUES (${agentPlaceholders.join(', ')})`,
                    agentValues
                );
                deliveryAgentId = deliveryResult.insertId;
                
                console.log(`✅ Agent inserted into delivery_agents table: ${name}`);
            } else {
                console.warn('⚠️ delivery_agents table does not exist - skipping insert');
            }
        } catch (err) {
            console.error('Error inserting into delivery_agents:', err.message);
            // Don't fail the request - user was created successfully
        }

        // Get the created agent with delivery_agent info
        const [newAgent] = await pool.query(`
            SELECT 
                u.id, 
                u.name, 
                u.email, 
                u.role, 
                u.status, 
                u.phone, 
                u.address, 
                u.shopName, 
                u.bio, 
                u.created_at,
                da.id as delivery_agent_id,
                da.is_available
            FROM users u
            LEFT JOIN delivery_agents da ON u.id = da.user_id
            WHERE u.id = ?
        `, [userId]);

        res.status(201).json({
            success: true,
            message: 'Agent created successfully',
            agent: newAgent[0],
            delivery_agent_id: deliveryAgentId
        });

    } catch (err) {
        console.error('Add agent error:', err);
        res.status(500).json({ 
            success: false,
            message: 'Server error', 
            error: err.message 
        });
    }
};

// Update agent status (also updates delivery_agents status if exists)
exports.updateAgentStatus = async (req, res) => {
    try {
        const { agentId } = req.params;
        const { status } = req.body;

        if (!['active', 'inactive', 'suspended'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be active, inactive, or suspended'
            });
        }

        // Update users table
        const [result] = await pool.query(
            'UPDATE users SET status = ? WHERE id = ? AND role = "agent"',
            [status, agentId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        // Also update delivery_agents if table exists
        try {
            const [tableCheck] = await pool.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = 'delivery_agents'
            `);

            if (tableCheck[0].count > 0) {
                const deliveryStatus = status === 'active' ? 'active' : 'inactive';
                await pool.query(
                    'UPDATE delivery_agents SET status = ? WHERE user_id = ?',
                    [deliveryStatus, agentId]
                );
                console.log(`✅ Delivery agent status updated to ${deliveryStatus}`);
            }
        } catch (err) {
            console.warn('Could not update delivery_agents status:', err.message);
        }

        res.json({
            success: true,
            message: `Agent status updated to ${status}`
        });

    } catch (err) {
        console.error('Update agent status error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to update agent status',
            error: err.message
        });
    }
};

// Update agent details
exports.updateAgent = async (req, res) => {
    try {
        const { agentId } = req.params;
        const { name, phone, address, status, shopName, bio } = req.body;

        // Build update query dynamically for users table
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
        if (status && ['active', 'inactive', 'suspended'].includes(status)) {
            updates.push('status = ?');
            values.push(status);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        values.push(agentId);

        const [result] = await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND role = 'agent'`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        // Also update delivery_agents if table exists
        try {
            const [tableCheck] = await pool.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = 'delivery_agents'
            `);

            if (tableCheck[0].count > 0) {
                const deliveryUpdates = [];
                const deliveryValues = [];

                if (name) {
                    deliveryUpdates.push('name = ?');
                    deliveryValues.push(name);
                }
                if (phone !== undefined) {
                    deliveryUpdates.push('phone = ?');
                    deliveryValues.push(phone);
                }
                if (address !== undefined) {
                    deliveryUpdates.push('address = ?');
                    deliveryValues.push(address);
                }

                if (deliveryUpdates.length > 0) {
                    deliveryValues.push(agentId);
                    await pool.query(
                        `UPDATE delivery_agents SET ${deliveryUpdates.join(', ')} WHERE user_id = ?`,
                        deliveryValues
                    );
                    console.log('✅ Delivery agent updated successfully');
                }
            }
        } catch (err) {
            console.warn('Could not update delivery_agents:', err.message);
        }

        res.json({
            success: true,
            message: 'Agent updated successfully'
        });

    } catch (err) {
        console.error('Update agent error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to update agent',
            error: err.message
        });
    }
};

// Delete/Remove agent (soft delete)
exports.deleteAgent = async (req, res) => {
    try {
        const { agentId } = req.params;

        // Update users table
        const [result] = await pool.query(
            'UPDATE users SET status = "inactive" WHERE id = ? AND role = "agent"',
            [agentId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        // Also update delivery_agents if table exists
        try {
            const [tableCheck] = await pool.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = 'delivery_agents'
            `);

            if (tableCheck[0].count > 0) {
                await pool.query(
                    'UPDATE delivery_agents SET status = "inactive", is_available = false WHERE user_id = ?',
                    [agentId]
                );
                console.log('✅ Delivery agent deactivated successfully');
            }
        } catch (err) {
            console.warn('Could not update delivery_agents:', err.message);
        }

        res.json({
            success: true,
            message: 'Agent deactivated successfully'
        });

    } catch (err) {
        console.error('Delete agent error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to delete agent',
            error: err.message
        });
    }
};

// Get single agent details
exports.getAgentById = async (req, res) => {
    try {
        const { agentId } = req.params;

        const [agent] = await pool.query(`
            SELECT 
                u.id, 
                u.name, 
                u.email, 
                u.role, 
                u.status, 
                u.phone, 
                u.address, 
                u.avatar_url,
                u.shopName,
                u.bio,
                u.created_at,
                da.id as delivery_agent_id,
                da.is_available
            FROM users u
            LEFT JOIN delivery_agents da ON u.id = da.user_id
            WHERE u.id = ? AND u.role = 'agent'
        `, [agentId]);

        if (agent.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        res.json({
            success: true,
            agent: agent[0]
        });

    } catch (err) {
        console.error('Get agent by id error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch agent details',
            error: err.message
        });
    }
};

// Reset agent password
exports.resetAgentPassword = async (req, res) => {
    try {
        const { agentId } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const [result] = await pool.query(
            'UPDATE users SET password = ? WHERE id = ? AND role = "agent"',
            [hashedPassword, agentId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        res.json({
            success: true,
            message: 'Agent password reset successfully'
        });

    } catch (err) {
        console.error('Reset agent password error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password',
            error: err.message
        });
    }
};

// ── 9. TOGGLE AGENT AVAILABILITY (For Sellers) ──
exports.toggleAgentAvailability = async (req, res) => {
    try {
        const { agentId } = req.params;
        
        // Get current availability from delivery_agents
        const [agent] = await pool.query(
            'SELECT is_available FROM delivery_agents WHERE id = ?',
            [agentId]
        );

        if (agent.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Delivery agent not found'
            });
        }

        const newStatus = !agent[0].is_available;

        await pool.query(
            'UPDATE delivery_agents SET is_available = ? WHERE id = ?',
            [newStatus, agentId]
        );

        res.status(200).json({
            success: true,
            message: `Agent is now ${newStatus ? 'available' : 'unavailable'}`,
            is_available: newStatus
        });

    } catch (err) {
        console.error('Toggle agent availability error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle agent availability',
            error: err.message
        });
    }
};

// ── 10. GET AVAILABLE AGENTS (For Sellers) ──
exports.getAvailableAgents = async (req, res) => {
    try {
        const [agents] = await pool.query(`
            SELECT 
                da.id,
                da.name,
                da.phone,
                da.is_available,
                u.email,
                u.address,
                u.shopName,
                u.avatar_url
            FROM delivery_agents da
            JOIN users u ON da.user_id = u.id
            WHERE da.is_available = true 
            AND u.status = 'active'
            ORDER BY da.name ASC
        `);

        res.status(200).json({
            success: true,
            agents: agents || []
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