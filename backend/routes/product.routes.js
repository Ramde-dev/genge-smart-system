const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// ── Ensure upload directory exists ──
const uploadDir = './uploads/products';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ── Multer config ──
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

// ── PUBLIC ROUTES (No authentication required) ──


// 1. GET all unique categories (public)
router.get('/categories', async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != "" AND deleted_at IS NULL ORDER BY category ASC'
        );
        res.status(200).json({
            success: true,
            categories: rows.map(row => row.category)
        });
    } catch (error) {
        console.error('Categories error:', error);
        res.status(500).json({ 
            success: false,
            message: "Failed to fetch categories" 
        });
    }
});

// 2. GET all products (public)
router.get('/', async (req, res) => {
    try {
        const { search, category, limit = 20, offset = 0 } = req.query;
        let sql = 'SELECT * FROM products WHERE deleted_at IS NULL AND status = "active"';
        let params = [];

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

        const [rows] = await db.execute(sql, params);
        
        // Get total count
        let countSql = 'SELECT COUNT(*) as total FROM products WHERE deleted_at IS NULL AND status = "active"';
        let countParams = [];
        if (search) {
            countSql += ' AND (name LIKE ? OR description LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`);
        }
        if (category) {
            countSql += ' AND category = ?';
            countParams.push(category);
        }
        const [countResult] = await db.execute(countSql, countParams);

        res.status(200).json({
            success: true,
            products: rows,
            pagination: {
                total: countResult[0].total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Get all products error:', error);
        res.status(500).json({ 
            success: false,
            message: "Failed to fetch products" 
        });
    }
});

// ── PROTECTED ROUTES (Require authentication and Seller role) ──

// 3. GET seller's products (protected)
router.get('/my-products', authenticateToken, authorize(['Seller']), async (req, res) => {
    try {
        const sellerId = req.user.id;
        console.log('[DEBUG] GET /my-products requested by seller:', sellerId);
        const { search, category } = req.query;

        let sql = 'SELECT * FROM products WHERE seller_id = ? AND deleted_at IS NULL';
        let params = [sellerId];

        if (search) {
            sql += ' AND (name LIKE ? OR description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }

        const [rows] = await db.execute(sql + ' ORDER BY created_at DESC', params);
        console.log('[DEBUG] Seller products found count:', Array.isArray(rows) ? rows.length : 0);
        // Always return 200 with an array (empty if no products)
        return res.status(200).json({
            success: true,
            products: rows || []
        });
    } catch (error) {
        console.error('Get seller products error:', error);
        res.status(500).json({ 
            success: false,
            message: "Failed to fetch products" 
        });
    }
});

// 4. GET product by ID (public)
// Use an explicit path to avoid accidental collisions with other named routes like '/my-products'
router.get('/product/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute(
            'SELECT * FROM products WHERE id = ? AND deleted_at IS NULL',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: "Product not found" 
            });
        }
        res.status(200).json({
            success: true,
            product: rows[0]
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ 
            success: false,
            message: "Failed to fetch product" 
        });
    }
});

// 5. POST new product (protected)
router.post('/products', authenticateToken, authorize(['Seller']), upload.single('image'), async (req, res) => {
    try {
        const { name, price, description, category, unit, stock } = req.body;
        const sellerId = req.user.id;
        const imageUrl = req.file ? `/uploads/products/${req.file.filename}` : null;

        const sql = 'INSERT INTO products (name, price, description, category, unit, stock, image_url, seller_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        await db.execute(sql, [name, price, description, category, unit || 'Piece', stock || 0, imageUrl, sellerId]);

        res.status(201).json({ 
            success: true,
            message: "Product created successfully!" 
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ 
            success: false,
            message: "Failed to save product" 
        });
    }
});

// 6. PUT update product (protected)
router.put(
    '/products/:id',
    authenticateToken,
    authorize(['Seller']),
    (req, res, next) => {
        console.log('[DEBUG] PUT /products/:id before multer', {
            method: req.method,
            path: req.path,
            contentType: req.headers['content-type']
        });
        next();
    },
    upload.single('image'),
    async (req, res) => {
        console.log('[DEBUG] PUT /products/:id after multer', {
            file: req.file ? {
                fieldname: req.file.fieldname,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            } : null,
            body: req.body,
            params: req.params
        });

        try {
            const { id } = req.params;
            const { name, price, description, category, unit, stock } = req.body;
            const sellerId = req.user.id;

            let sql, params;
            if (req.file) {
                const imageUrl = `/uploads/products/${req.file.filename}`;
                sql = 'UPDATE products SET name = ?, price = ?, description = ?, category = ?, unit = ?, stock = ?, image_url = ? WHERE id = ? AND seller_id = ? AND deleted_at IS NULL';
                params = [name, price, description, category, unit || 'Piece', stock || 0, imageUrl, id, sellerId];
            } else {
                sql = 'UPDATE products SET name = ?, price = ?, description = ?, category = ?, unit = ?, stock = ? WHERE id = ? AND seller_id = ? AND deleted_at IS NULL';
                params = [name, price, description, category, unit || 'Piece', stock || 0, id, sellerId];
            }

            const [result] = await db.execute(sql, params);
            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false,
                    message: "Product not found or unauthorized" 
                });
            }

            res.status(200).json({ 
                success: true,
                message: "Product updated successfully!" 
            });
        } catch (error) {
            const logEntry = {
                time: new Date().toISOString(),
                error: error.stack || error.message || error,
                body: req.body,
                file: req.file ? {
                    fieldname: req.file.fieldname,
                    originalname: req.file.originalname,
                    encoding: req.file.encoding,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                    destination: req.file.destination,
                    filename: req.file.filename,
                    path: req.file.path
                } : null,
                params: req.params,
                query: req.query
            };
            try {
                const fs = require('fs');
                fs.appendFileSync('update-error.log', JSON.stringify(logEntry, null, 2) + '\n---\n');
            } catch (logErr) {
                console.error('Failed to write update error log:', logErr);
            }
            console.error('Update product error:', error.stack || error);
            res.status(500).json({ 
                success: false,
                message: "Failed to update product",
                error: error.message
            });
        }
    }
);

// 7. DELETE product (soft delete) (protected)
router.delete('/products/:id', authenticateToken, authorize(['Seller']), async (req, res) => {
    try {
        const { id } = req.params;
        const sellerId = req.user.id;

        const [product] = await db.execute(
            'SELECT id FROM products WHERE id = ? AND seller_id = ? AND deleted_at IS NULL',
            [id, sellerId]
        );
        if (product.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: "Product not found or already removed" 
            });
        }

        await db.execute('UPDATE products SET deleted_at = NOW() WHERE id = ?', [id]);
        res.status(200).json({ 
            success: true,
            message: "Product archived successfully" 
        });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ 
            success: false,
            message: "Failed to delete product" 
        });
    }
});

// 8. PATCH update product stock (protected)
router.patch('/products/:id/stock', authenticateToken, authorize(['Seller']), async (req, res) => {
    try {
        const { id } = req.params;
        const { stock } = req.body;
        const sellerId = req.user.id;

        if (stock === undefined || stock < 0) {
            return res.status(400).json({
                success: false,
                message: "Valid stock quantity is required"
            });
        }

        const [result] = await db.execute(
            'UPDATE products SET stock = ? WHERE id = ? AND seller_id = ? AND deleted_at IS NULL',
            [stock, id, sellerId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                message: "Product not found or unauthorized" 
            });
        }

        res.status(200).json({ 
            success: true,
            message: "Stock updated successfully" 
        });
    } catch (error) {
        console.error('Update stock error:', error);
        res.status(500).json({ 
            success: false,
            message: "Failed to update stock" 
        });
    }
});

// 9. PATCH toggle product status (protected)
router.patch('/products/:id/status', authenticateToken, authorize(['Seller']), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const sellerId = req.user.id;

        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be 'active' or 'inactive'"
            });
        }

        const [result] = await db.execute(
            'UPDATE products SET status = ? WHERE id = ? AND seller_id = ? AND deleted_at IS NULL',
            [status, id, sellerId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                message: "Product not found or unauthorized" 
            });
        }

        res.status(200).json({ 
            success: true,
            message: `Product ${status === 'active' ? 'activated' : 'deactivated'} successfully` 
        });
    } catch (error) {
        console.error('Toggle status error:', error);
        res.status(500).json({ 
            success: false,
            message: "Failed to update product status" 
        });
    }
});

// Debug: print route registration order for troubleshooting
try {
    if (router && router.stack) {
        router.stack.forEach((layer) => {
            if (layer.route && layer.route.path) {
                const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
            }
        });
    }
} catch (e) {
    console.error('Route debug error:', e);
}

module.exports = router;