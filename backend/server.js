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
const chatRoutes = require('./routes/chat.routes');
const ensureTables = require('./database/ensureTables');
const rateLimit = require('./middleware/rateLimit');

const app = express();

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be configured before starting the API');
}

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
app.disable('x-powered-by');
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── MOUNT ROUTES ──
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: 'Too many authentication attempts. Please try again later.' }), authRoutes);
// Mount buyer routes before the authenticated dashboard router so public catalog routes work.
app.use('/api/buyer/notifications', notificationRoutes);
app.use('/api/agent/notifications', notificationRoutes);
app.use('/api/buyer', buyerRoutes);
// Dashboard routes apply authentication to every request entering their router.
app.use('/api', dashboardRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/seller/analytics', analyticsRoutes); // mount analytics on its exact base path
app.use('/api/seller', orderRoutes);
app.use('/api/seller', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/chat', rateLimit({ windowMs: 60 * 1000, max: 30, message: 'Too many chat requests. Please wait a moment.' }), chatRoutes);

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
            headers: { ...req.headers, authorization: '[REDACTED]' },
            body: '[REDACTED]',
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
ensureTables().then(() => app.listen(PORT, () => {
    console.log('Backend connected successfully');
})).catch((error) => {
    console.error('Database schema initialization failed:', error);
    process.exit(1);
});

module.exports = app;