/**
 * Token Refresh Middleware
 * Automatically refreshes expired access tokens using refresh tokens
 * Provides seamless authentication experience for users
 */

const jwt = require('jsonwebtoken');
const { pool } = require('../db/connection');
const logger = require('../utils/logger');

/**
 * Middleware to automatically refresh expired access tokens
 * Checks if token is expired and refreshes if valid refresh token exists
 */
async function autoRefreshToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next(); // No token, let auth middleware handle it
    }

    try {
        // Try to verify token
        jwt.verify(token, process.env.JWT_SECRET);
        return next(); // Token is valid, continue
    } catch (error) {
        if (error.name !== 'TokenExpiredError') {
            return next(); // Not an expiry error, let auth middleware handle it
        }

        // Token is expired, attempt to refresh
        const refreshToken = req.headers['x-refresh-token'];

        if (!refreshToken) {
            return next(); // No refresh token provided, let auth middleware handle
        }

        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

            // Check if refresh token exists and is valid in database
            const tokenResult = await pool.query(
                `SELECT rt.user_id, u.email, u.full_name, u.organization
                 FROM refresh_tokens rt
                 JOIN users u ON rt.user_id = u.id
                 WHERE rt.token = $1
                   AND rt.is_revoked = FALSE
                   AND rt.expires_at > CURRENT_TIMESTAMP
                   AND u.is_active = TRUE`,
                [refreshToken]
            );

            if (tokenResult.rows.length === 0) {
                return next(); // Invalid refresh token, let auth middleware handle
            }

            const { user_id, email, full_name, organization } = tokenResult.rows[0];

            // Generate new access token
            const newAccessToken = jwt.sign(
                {
                    userId: user_id,
                    email: email,
                    fullName: full_name,
                    organization: organization
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
            );

            // Set new token in response header for client to update
            res.setHeader('X-New-Access-Token', newAccessToken);

            // Update request with new token for current request
            req.headers['authorization'] = `Bearer ${newAccessToken}`;

            logger.info(`Token auto-refreshed for user: ${user_id}`);

            next();
        } catch (refreshError) {
            logger.error('Token refresh error:', refreshError);
            next(); // Let auth middleware handle the error
        }
    }
}

/**
 * Optional middleware to require fresh tokens (no auto-refresh)
 * Use for sensitive operations like password changes
 */
function requireFreshToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check token age (issued at timestamp)
        const tokenAge = Date.now() / 1000 - decoded.iat;
        const maxAge = 5 * 60; // 5 minutes

        if (tokenAge > maxAge) {
            return res.status(401).json({
                error: 'Token too old for this operation',
                message: 'Please log in again to perform this action'
            });
        }

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = {
    autoRefreshToken,
    requireFreshToken
};
