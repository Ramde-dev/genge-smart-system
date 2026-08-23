const windows = new Map();

function rateLimit({ windowMs, max, message }) {
    return (req, res, next) => {
        const key = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const current = windows.get(key);
        if (!current || now - current.startedAt >= windowMs) {
            windows.set(key, { startedAt: now, count: 1 });
            return next();
        }
        if (current.count >= max) {
            return res.status(429).json({ success: false, message });
        }
        current.count += 1;
        return next();
    };
}

module.exports = rateLimit;
