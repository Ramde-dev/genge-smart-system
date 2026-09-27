const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationCodeEmail, sendPasswordResetCodeEmail } = require('../utils/email');

const createVerificationCode = () => String(crypto.randomInt(100000, 1000000));
const hashVerificationCode = (code) => crypto.createHash('sha256').update(code).digest('hex');

const sendVerificationCode = async (userId, email) => {
    const code = createVerificationCode();
    await sendVerificationCodeEmail(email, code);
    await pool.query(
        `UPDATE users SET verification_code_hash = ?, verification_expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE id = ?`,
        [hashVerificationCode(code), userId]
    );
};

// ── Register a new user ──
exports.register = async (req, res) => {
    const { name, password, role, phone } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();

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
        if (!['buyer', 'seller'].includes(userRole)) {
            userRole = 'buyer';
        }
        if (userRole === 'seller' && (!phone || !phone.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required for seller registration'
            });
        }

        const verificationCode = createVerificationCode();
        await sendVerificationCodeEmail(email, verificationCode);

        await pool.query(
            `INSERT INTO users
             (name, email, password, role, phone, status, email_verified, verification_code_hash, verification_expires_at)
             VALUES (?, ?, ?, ?, ?, 'active', FALSE, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
            [name, email, hashedPassword, userRole, phone?.trim() || null, hashVerificationCode(verificationCode)]
        );

        res.status(201).json({ 
            success: true,
            message: 'Verification code sent to your email',
            requiresVerification: true,
            email,
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
    const email = String(req.body.email || '').trim().toLowerCase();
    const { password } = req.body;

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

        if (user.role !== 'agent' && (user.email_verified === 0 || user.email_verified === false)) {
            return res.status(403).json({
                success: false,
                requiresVerification: true,
                message: 'Please verify your email before signing in.'
            });
        }
        
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
            process.env.JWT_SECRET,
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
            process.env.JWT_SECRET,
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

        const code = createVerificationCode();
        await sendPasswordResetCodeEmail(rows[0].email, code);
        await pool.query(
            `UPDATE users SET reset_code_hash = ?, reset_code_expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE id = ?`,
            [hashVerificationCode(code), rows[0].id]
        );
        res.json({ success: true, message: 'Password reset code sent to your email.' });
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
        if (['seller', 'Seller'].includes(req.user.role) && (!phone || !phone.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Seller phone number is required for receiving payments'
            });
        }

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

exports.verifyEmail = async (req, res) => {
    const email = req.body.email.trim().toLowerCase();
    const code = req.body.code.trim();
    try {
        const [rows] = await pool.query(
            `SELECT id, email_verified, verification_code_hash, verification_expires_at
             FROM users WHERE email = ?`,
            [email]
        );
        if (rows.length === 0) return res.status(400).json({ message: 'Invalid verification request.' });
        const user = rows[0];
        if (user.email_verified) return res.json({ success: true, message: 'Email is already verified.' });
        if (!user.verification_code_hash || !user.verification_expires_at || new Date(user.verification_expires_at) < new Date()) {
            return res.status(400).json({ message: 'This verification code has expired. Request a new one.' });
        }
        if (hashVerificationCode(code) !== user.verification_code_hash) {
            return res.status(400).json({ message: 'Invalid verification code.' });
        }
        await pool.query(
            `UPDATE users SET email_verified = TRUE, verification_code_hash = NULL, verification_expires_at = NULL WHERE id = ?`,
            [user.id]
        );
        res.json({ success: true, message: 'Email verified successfully. You can now sign in.' });
    } catch (err) {
        console.error('Email verification error:', err);
        res.status(500).json({ message: 'Failed to verify email.' });
    }
};

exports.resendVerification = async (req, res) => {
    const email = req.body.email.trim().toLowerCase();
    try {
        const [rows] = await pool.query('SELECT id, email, email_verified FROM users WHERE email = ?', [email]);
        if (rows.length === 0 || rows[0].email_verified) {
            return res.json({ success: true, message: 'If the account requires verification, a new code has been sent.' });
        }
        await sendVerificationCode(rows[0].id, rows[0].email);
        res.json({ success: true, message: 'A new verification code has been sent.' });
    } catch (err) {
        console.error('Resend verification error:', err);
        res.status(500).json({ message: 'Could not send a new verification code.' });
    }
};

const findValidResetCode = async (email, code) => {
    const [rows] = await pool.query(
        `SELECT id, reset_code_hash, reset_code_expires_at FROM users WHERE email = ?`,
        [email]
    );
    if (rows.length === 0) return null;
    const user = rows[0];
    if (!user.reset_code_hash || !user.reset_code_expires_at || new Date(user.reset_code_expires_at) < new Date()) return null;
    return hashVerificationCode(code) === user.reset_code_hash ? user : null;
};

exports.verifyResetCode = async (req, res) => {
    const email = req.body.email.trim().toLowerCase();
    const code = req.body.code.trim();
    try {
        const user = await findValidResetCode(email, code);
        if (!user) return res.status(400).json({ message: 'Invalid or expired reset code.' });
        res.json({ success: true, message: 'Code verified. You can now set a new password.' });
    } catch (err) {
        console.error('Verify reset code error:', err);
        res.status(500).json({ message: 'Failed to verify reset code.' });
    }
};

exports.resetPassword = async (req, res) => {
    const email = req.body.email.trim().toLowerCase();
    const code = req.body.code.trim();
    try {
        const user = await findValidResetCode(email, code);
        if (!user) return res.status(400).json({ message: 'Invalid or expired reset code.' });
        const passwordHash = await bcrypt.hash(req.body.password, 10);
        await pool.query(
            `UPDATE users SET password = ?, reset_code_hash = NULL, reset_code_expires_at = NULL WHERE id = ?`,
            [passwordHash, user.id]
        );
        res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: 'Failed to reset password.' });
    }
};