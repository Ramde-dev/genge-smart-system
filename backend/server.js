const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const sellerRoutes = require('./routes/sellerRoutes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const buyerRoutes = require('./routes/buyerRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const agentRoutes = require('./routes/agentRoutes');
const trackingRoutes = require('./routes/trackingRoutes');

const app = express();

const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:5173'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error(`CORS policy does not allow access from origin ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// ── MOUNT ROUTES ──
app.use('/api/auth', authRoutes);
// Mount dashboard routes first so they can provide /api/seller/dashboard
app.use('/api', dashboardRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/seller/analytics', analyticsRoutes); // mount analytics on its exact base path
app.use('/api/seller', orderRoutes);
app.use('/api/seller', productRoutes);
app.use('/api/buyer/notifications', notificationRoutes);
app.use('/api/buyer', buyerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/tracking', trackingRoutes);

app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'Genge Smart System API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    try {
        const logEntry = {
            time: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl,
            headers: req.headers,
            body: req.body,
            error: err.stack || err.message || err
        };
        fs.appendFileSync('request-error.log', JSON.stringify(logEntry, null, 2) + '\n---\n');
    } catch (logErr) {
        console.error('Failed to write request error log:', logErr);
    }
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    res.status(status).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('========================================');
    console.log('Genge Smart System API');
    console.log('========================================');
    console.log(`Server running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
    console.log('========================================');
    console.log('Routes mounted:');
    console.log('  /api/auth');
    console.log('  /api/seller');
    console.log('  /api/buyer');
    console.log('  /api/admin');
    console.log('  /api/delivery');
    console.log('  /api/agent');
    console.log('  /api/tracking');
    console.log('========================================');
});

module.exports = app;