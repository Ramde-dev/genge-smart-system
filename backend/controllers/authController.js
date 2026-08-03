const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ── Register a new user ──
exports.register = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Name, email and password are required' 
            });
        }

        // Check if user already exists
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Email already registered' 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        // Normalize roles to lower-case values supported by the enum
        let userRole = (role || 'buyer').toString().toLowerCase();
        if (!['buyer', 'seller', 'admin', 'agent'].includes(userRole)) {
            userRole = 'buyer';
        }

        // Insert user with status 'active' by default
        await pool.query(
            'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, userRole, 'active']
        );

        res.status(201).json({ 
            success: true,
            message: 'User registered successfully',
            role: userRole
        });
    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ 
            success: false,
            message: 'Database error', 
            error: err.message 
        });
    }
};

// ── Login user (for all roles: buyer, seller, admin) ──
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Email and password are required' 
            });
        }

        // Get user by email
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (rows.length === 0) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }

        const user = rows[0];
        
        // Check if account is active
        if (user.status && user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Your account is not active. Please contact admin.'
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }

        // Generate token with user id and role from database
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET || 'your_super_secret_key',
            { expiresIn: '7d' }
        );

        // Return user info (exclude password)
        delete user.password;
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar_url: user.avatar_url || null,
                phone: user.phone || '',
                address: user.address || '',
                shopName: user.shopName || '',
                bio: user.bio || '',
                status: user.status || 'active'
            },
            message: 'Login successful'
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ 
            success: false,
            message: 'Database error', 
            error: err.message 
        });
    }
};

// ── Agent Login (only for agents) ──
exports.agentLogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Get agent by email with role check
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE email = ? AND role = "agent"',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = rows[0];

        // Check if account is active
        if (user.status && user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Your account is not active. Please contact admin.'
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                role: user.role,
                agentId: user.agent_id || null
            },
            process.env.JWT_SECRET || 'your_super_secret_key',
            { expiresIn: '24h' }
        );

        // Remove password from response
        delete user.password;

        res.status(200).json({
            success: true,
            message: 'Agent login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                agentId: user.agent_id || null,
                status: user.status || 'active',
                phone: user.phone || '',
                avatar_url: user.avatar_url || null,
                address: user.address || '',
            }
        });

    } catch (err) {
        console.error('Agent Login Error:', err);
        res.status(500).json({
            success: false,
            message: 'Database error',
            error: err.message
        });
    }
};

// ── Forgot Password ──
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        // Check if email exists
        const [rows] = await pool.query('SELECT id, name, email FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email'
            });
        }

        // TODO: Send reset email
        res.json({ 
            success: true,
            message: 'If an account exists for that email, a reset link has been sent.' 
        });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
};

// ── Get user profile ──
exports.getProfile = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, name, email, role, status, shopName, phone, address, bio, avatar_url 
             FROM users WHERE id = ?`,
            [req.user.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        res.json({
            success: true,
            user: rows[0]
        });
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ 
            success: false,
            message: 'Database error', 
            error: err.message 
        });
    }
};

// ── Get Agent Profile ──
exports.getAgentProfile = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT u.id, u.name, u.email, u.role, u.status, u.phone, u.address, u.avatar_url, u.created_at,
                    da.id as delivery_agent_id, da.is_available
             FROM users u
             LEFT JOIN delivery_agents da ON u.id = da.user_id
             WHERE u.id = ? AND u.role = "agent"`,
            [req.user.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        res.status(200).json({
            success: true,
            user: rows[0]
        });
    } catch (err) {
        console.error('Get agent profile error:', err);
        res.status(500).json({
            success: false,
            message: 'Database error',
            error: err.message
        });
    }
};

// ── Update profile ──
exports.updateProfile = async (req, res) => {
    const { name, phone, address, shopName, bio } = req.body;
    try {
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

        values.push(req.user.id);

        await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
        
        res.json({ 
            success: true,
            message: 'Profile updated successfully' 
        });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ 
            success: false,
            message: 'Database error', 
            error: err.message 
        });
    }
};

// ── Update password ──
exports.updateSecurity = async (req, res) => {
    const { current, new: newPassword } = req.body;
    try {
        if (!current || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        const isMatch = await bcrypt.compare(current, rows[0].password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false,
                message: 'Current password is incorrect' 
            });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, req.user.id]);

        res.json({ 
            success: true,
            message: 'Password updated successfully' 
        });
    } catch (err) {
        console.error('Update security error:', err);
        res.status(500).json({ 
            success: false,
            message: 'Database error', 
            error: err.message 
        });
    }
};

// ── Upload avatar / logo ──
exports.uploadLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                message: 'No file provided' 
            });
        }

        const avatarPath = `/uploads/${req.file.filename}`;
        await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarPath, req.user.id]);

        res.json({ 
            success: true,
            message: 'Avatar updated successfully', 
            avatarPath 
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ 
            success: false,
            message: 'Database error', 
            error: err.message 
        });
    }
};

// ── DEBUG: Check user by email ──
exports.debugUser = async (req, res) => {
    const { email } = req.query;
    try {
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email parameter is required'
            });
        }

        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (rows.length === 0) {
            return res.json({
                success: true,
                found: false,
                message: 'User not found'
            });
        }

        // Remove password for security
        const user = rows[0];
        delete user.password;

        res.json({
            success: true,
            found: true,
            user: user,
            message: 'User found'
        });
    } catch (err) {
        console.error('Debug user error:', err);
        res.status(500).json({
            success: false,
            message: 'Database error',
            error: err.message
        });
    }
};