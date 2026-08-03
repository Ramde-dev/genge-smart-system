const express = require('express');

const router = express.Router();

const db = require('../config/db');

const authMiddleware = require('../middleware/authMiddleware'); // Import this

const multer = require('multer');

const path = require('path');



const storage = multer.diskStorage({

    destination: './uploads/',

    filename: (req, file, cb) => {

        cb(null, `${Date.now()}-${file.originalname}`);

    }

});

const upload = multer({ storage });



// 1. GET all unique categories (Should be public)

router.get('/categories', async (req, res) => {

    try {

        const [rows] = await db.execute(

            'SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ""'

        );

        res.status(200).json(rows.map(row => row.category));

    } catch (error) {

        res.status(500).json({ message: "Failed to fetch categories" });

    }

});



// 2. GET products (Updated to show only the logged-in seller's products)

router.get('/products', authMiddleware, async (req, res) => {

    try {

        const sellerId = req.user.id;

        const { search, category } = req.query;

       

        let sql = 'SELECT * FROM products WHERE seller_id = ?';

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

        res.status(200).json(rows);

    } catch (error) {

        res.status(500).json({ message: "Failed to fetch products" });

    }

});



// 3. POST new product (Added seller_id)

router.post('/products', authMiddleware, upload.single('image'), async (req, res) => {

    try {

        const { name, price, description, category } = req.body;

        const sellerId = req.user.id; // Get ID from token

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

       

        const sql = 'INSERT INTO products (name, price, description, category, image_url, seller_id) VALUES (?, ?, ?, ?, ?, ?)';

        await db.execute(sql, [name, price, description, category, imageUrl, sellerId]);

       

        res.status(201).json({ message: "Product created successfully!" });

    } catch (error) {

        res.status(500).json({ message: "Failed to save product" });

    }

});



// 4. PUT (Update) product (Ensures only owner can update)

router.put('/products/:id', authMiddleware, upload.single('image'), async (req, res) => {

    try {

        const { id } = req.params;

        const { name, price, description, category } = req.body;

        const sellerId = req.user.id;

       

        let sql, params;

        if (req.file) {

            const imageUrl = `/uploads/${req.file.filename}`;

            sql = 'UPDATE products SET name = ?, price = ?, description = ?, category = ?, image_url = ? WHERE id = ? AND seller_id = ?';

            params = [name, price, description, category, imageUrl, id, sellerId];

        } else {

            sql = 'UPDATE products SET name = ?, price = ?, description = ?, category = ? WHERE id = ? AND seller_id = ?';

            params = [name, price, description, category, id, sellerId];

        }



        const [result] = await db.execute(sql, params);

        if (result.affectedRows === 0) return res.status(404).json({ message: "Product not found or unauthorized" });

       

        res.status(200).json({ message: "Product updated successfully!" });

    } catch (error) {

        res.status(500).json({ message: "Failed to update product" });

    }

});



// 5. DELETE product (Ensures only owner can delete)

router.delete('/products/:id', authMiddleware, async (req, res) => {

    try {

        const { id } = req.params;

        const sellerId = req.user.id;

        const [result] = await db.execute('DELETE FROM products WHERE id = ? AND seller_id = ?', [id, sellerId]);

       

        if (result.affectedRows === 0) return res.status(404).json({ message: "Product not found or unauthorized" });

        res.status(200).json({ message: "Product deleted successfully" });

    } catch (error) {

        res.status(500).json({ message: "Failed to delete product" });

    }

});



module.exports = router;