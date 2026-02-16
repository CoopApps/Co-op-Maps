const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/connection');
const logger = require('../utils/logger');
const { rateLimiters } = require('../middleware/rateLimiter');

// Validation middleware
const registerValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('full_name').optional().trim().isLength({ max: 255 }),
    body('organization').optional().trim().isLength({ max: 255 })
];

const loginValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
];

// Helper function to generate tokens
function generateTokens(user) {
    const accessToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return { accessToken, refreshToken };
}

// POST /api/auth/register - Rate limited to prevent abuse
router.post('/register', rateLimiters.auth, registerValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, full_name, organization } = req.body;

        // Check if user already exists
        const existingUser = await query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Create user
        const result = await query(
            `INSERT INTO users (email, password_hash, full_name, organization, membership_level)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, email, full_name, organization, membership_level, created_at`,
            [email, password_hash, full_name, organization, 1]
        );

        const user = result.rows[0];

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user);

        // Store refresh token
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, refreshToken, expiresAt]
        );

        logger.info(`New user registered: ${email}`);

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                organization: user.organization,
                membership_level: user.membership_level
            },
            accessToken,
            refreshToken
        });

    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /api/auth/login - Rate limited to prevent brute force attacks
router.post('/login', rateLimiters.auth, loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Find user
        const result = await query(
            `SELECT id, email, password_hash, full_name, organization, membership_level,
                    membership_expires_at, is_active
             FROM users WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Check if account is active
        if (!user.is_active) {
            return res.status(403).json({ error: 'Account is disabled' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user);

        // Store refresh token
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, refreshToken, expiresAt]
        );

        // Update last login
        await query(
            'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        logger.info(`User logged in: ${email}`);

        res.json({
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                organization: user.organization,
                membership_level: user.membership_level,
                membership_expires_at: user.membership_expires_at
            },
            accessToken,
            refreshToken
        });

    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token required' });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Check if refresh token exists and is valid
        const tokenResult = await query(
            `SELECT rt.id, rt.user_id, u.email
             FROM refresh_tokens rt
             JOIN users u ON rt.user_id = u.id
             WHERE rt.token = $1
               AND rt.is_revoked = FALSE
               AND rt.expires_at > CURRENT_TIMESTAMP
               AND u.is_active = TRUE`,
            [refreshToken]
        );

        if (tokenResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        const { user_id, email } = tokenResult.rows[0];

        // Generate new tokens
        const tokens = generateTokens({ id: user_id, email });

        // Revoke old refresh token
        await query(
            'UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = $1',
            [refreshToken]
        );

        // Store new refresh token
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user_id, tokens.refreshToken, expiresAt]
        );

        res.json(tokens);

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }
        logger.error('Token refresh error:', error);
        res.status(500).json({ error: 'Token refresh failed' });
    }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            // Revoke refresh token
            await query(
                'UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = $1',
                [refreshToken]
            );
        }

        res.json({ message: 'Logged out successfully' });

    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [body('email').isEmail()], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;

        // Check if user exists
        const userResult = await query(
            'SELECT id, email, full_name FROM users WHERE email = $1',
            [email]
        );

        // Always return success (security: don't reveal if email exists)
        if (userResult.rows.length === 0) {
            logger.info(`Password reset requested for non-existent email: ${email}`);
            return res.json({ message: 'If that email exists, a password reset link has been sent' });
        }

        const user = userResult.rows[0];

        // Generate reset token
        const resetToken = jwt.sign(
            { email, userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Store reset token
        await query(
            `UPDATE users
             SET password_reset_token = $1,
                 password_reset_expires = $2
             WHERE email = $3`,
            [resetToken, new Date(Date.now() + 3600000), email]
        );

        // Send password reset email
        const emailService = require('../services/emailService');
        const APP_URL = process.env.APP_URL || 'http://localhost:3000';
        const resetLink = `${APP_URL}/reset-password.html?token=${resetToken}`;

        await emailService.queueEmail({
            to: email,
            toUserId: user.id,
            subject: 'Reset your Co-opMaps password',
            templateName: 'password-reset',
            templateData: {
                fullName: user.full_name || 'there',
                resetLink: resetLink,
                expiryHours: 1
            },
            priority: 1
        });

        logger.info(`Password reset email sent to: ${email}`);

        res.json({ message: 'If that email exists, a password reset link has been sent' });

    } catch (error) {
        logger.error('Forgot password error:', error);
        res.status(500).json({ error: 'Password reset failed' });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { token, newPassword } = req.body;

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ error: 'Invalid or expired reset token' });
        }

        // Check if token exists in database and hasn't expired
        const userResult = await query(
            `SELECT id, email, full_name, password_reset_token, password_reset_expires
             FROM users
             WHERE email = $1
               AND password_reset_token = $2
               AND password_reset_expires > CURRENT_TIMESTAMP`,
            [decoded.email, token]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid or expired reset token' });
        }

        const user = userResult.rows[0];

        // Hash new password
        const password_hash = await bcrypt.hash(newPassword, 10);

        // Update password and clear reset token
        await query(
            `UPDATE users
             SET password_hash = $1,
                 password_reset_token = NULL,
                 password_reset_expires = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [password_hash, user.id]
        );

        // Revoke all existing refresh tokens for security
        await query(
            'UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1',
            [user.id]
        );

        logger.info(`Password reset successful for: ${user.email}`);

        // Send confirmation email
        const emailService = require('../services/emailService');
        await emailService.queueEmail({
            to: user.email,
            toUserId: user.id,
            subject: 'Your password has been reset',
            templateName: 'password-reset-confirmation',
            templateData: {
                fullName: user.full_name || 'there'
            },
            priority: 1
        });

        res.json({ message: 'Password reset successful. You can now log in with your new password.' });

    } catch (error) {
        logger.error('Reset password error:', error);
        res.status(500).json({ error: 'Password reset failed' });
    }
});

// POST /api/auth/contact-admin
router.post('/contact-admin', rateLimiters.auth, [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('message').trim().isLength({ min: 10, max: 2000 }).withMessage('Message must be 10-2000 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, subject, message } = req.body;

        // Send email to admin
        const emailService = require('../services/emailService');
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@principle5.coop';

        await emailService.queueEmail({
            to: ADMIN_EMAIL,
            subject: `[Co-opMaps Contact] ${subject}`,
            templateName: 'admin-contact',
            templateData: {
                name,
                email,
                subject,
                message,
                timestamp: new Date().toISOString()
            },
            priority: 2
        });

        // Send confirmation to user
        await emailService.queueEmail({
            to: email,
            subject: 'We received your message',
            templateName: 'contact-confirmation',
            templateData: {
                name,
                subject
            },
            priority: 3
        });

        logger.info(`Admin contact form submitted by: ${email} - Subject: ${subject}`);

        res.json({ message: 'Your message has been sent to the admin team. We\'ll get back to you soon!' });

    } catch (error) {
        logger.error('Contact admin error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

module.exports = router;
