const jwt = require('jsonwebtoken');

// ── Authenticate Token Middleware ──
const authenticateToken = (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "No token, authorization denied"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key');
        req.user = decoded;
        req.userId = decoded.id || decoded.userId;
        next();
    } catch (err) {
        console.error('Token verification error:', err.message);
        
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Token has expired"
            });
        }
        
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }
        
        return res.status(401).json({
            success: false,
            message: "Token is not valid"
        });
    }
};

// ── Authorize Roles Middleware ──
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userRole = req.user.role ? req.user.role.toString().toLowerCase() : '';
        const allowedRoles = (Array.isArray(roles) ? roles : [roles]).map((role) => role.toString().toLowerCase());

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
                currentRole: req.user.role
            });
        }

        next();
    };
};

// ── Optional: Allow multiple role checks ──
const hasRole = (req, role) => {
    if (!req.user) return false;
    return req.user.role && req.user.role.toString().toLowerCase() === role.toString().toLowerCase();
};

const hasAnyRole = (req, roles) => {
    if (!req.user) return false;
    const userRole = req.user.role ? req.user.role.toString().toLowerCase() : '';
    return roles.some((role) => role.toString().toLowerCase() === userRole);
};

// ── Optional: Get current user ──
const getCurrentUser = (req) => {
    return req.user || null;
};

// ── Optional: Check if authenticated ──
const isAuthenticated = (req) => {
    return !!req.user;
};

// ── Export functions ──
module.exports = {
    authenticateToken,
    authorize,
    hasRole,
    hasAnyRole,
    getCurrentUser,
    isAuthenticated
};