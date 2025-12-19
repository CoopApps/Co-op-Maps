const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate JWT tokens
 * Expects Authorization header: Bearer <token>
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expired' });
            }
            return res.status(403).json({ error: 'Invalid token' });
        }

        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email
        };

        next();
    });
}

/**
 * Optional authentication - sets req.user if valid token, but continues anyway
 * Useful for public endpoints that behave differently for authenticated users
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (!err) {
            req.user = {
                userId: decoded.userId,
                email: decoded.email
            };
        }
        next();
    });
}

/**
 * Middleware to check if user has specific membership level
 * Must be used after authenticateToken
 */
function requireMembershipLevel(minLevel) {
    return async (req, res, next) => {
        try {
            const { query } = require('../db/connection');
            const result = await query(
                'SELECT membership_level FROM users WHERE id = $1',
                [req.user.userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const userLevel = result.rows[0].membership_level;

            if (userLevel < minLevel) {
                return res.status(403).json({
                    error: 'Insufficient membership level',
                    required: minLevel,
                    current: userLevel
                });
            }

            req.user.membershipLevel = userLevel;
            next();
        } catch (error) {
            logger.error('Membership check error:', error);
            res.status(500).json({ error: 'Failed to verify membership' });
        }
    };
}

/**
 * Middleware to verify user is active
 * Must be used after authenticateToken
 */
async function requireActiveUser(req, res, next) {
    try {
        const { query } = require('../db/connection');
        const result = await query(
            'SELECT is_active FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!result.rows[0].is_active) {
            return res.status(403).json({ error: 'Account is disabled' });
        }

        next();
    } catch (error) {
        logger.error('Active user check error:', error);
        res.status(500).json({ error: 'Failed to verify user status' });
    }
}

module.exports = {
    authenticateToken,
    optionalAuth,
    requireMembershipLevel,
    requireActiveUser
};
