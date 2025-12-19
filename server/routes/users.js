const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db/connection');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const {
    validateRequest,
    updateProfile,
    changePassword
} = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/users/me
 * Get current user profile
 */
router.get('/me', asyncHandler(async (req, res) => {
    const { userId } = req.user;

    const result = await query(
        `SELECT id, email, full_name, organization, membership_level,
                membership_expires_at, created_at, last_login_at, preferences
         FROM users WHERE id = $1`,
        [userId]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({
        user: result.rows[0]
    });
}));

/**
 * PUT /api/users/me
 * Update current user profile
 */
router.put('/me', updateProfile, validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { full_name, organization, preferences } = req.body;

    // Build dynamic update
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (full_name !== undefined) {
        updates.push(`full_name = $${paramCount}`);
        values.push(full_name);
        paramCount++;
    }

    if (organization !== undefined) {
        updates.push(`organization = $${paramCount}`);
        values.push(organization);
        paramCount++;
    }

    if (preferences !== undefined) {
        updates.push(`preferences = $${paramCount}`);
        values.push(JSON.stringify(preferences));
        paramCount++;
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);

    const result = await query(
        `UPDATE users SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING id, email, full_name, organization, membership_level,
                   membership_expires_at, preferences`,
        values
    );

    logger.info(`User profile updated: ${userId}`);

    res.json({
        user: result.rows[0]
    });
}));

/**
 * POST /api/users/me/change-password
 * Change user password
 */
router.post('/me/change-password', changePassword, validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { current_password, new_password } = req.body;

    // Get current password hash
    const userResult = await query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
    );

    if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
    if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    // Update password
    await query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [newPasswordHash, userId]
    );

    // Revoke all existing refresh tokens for security
    await query(
        'UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1',
        [userId]
    );

    logger.info(`Password changed for user: ${userId}`);

    res.json({
        message: 'Password changed successfully. Please log in again.'
    });
}));

/**
 * GET /api/users/me/stats
 * Get user statistics
 */
router.get('/me/stats', asyncHandler(async (req, res) => {
    const { userId } = req.user;

    // Get diagram count
    const diagramCountResult = await query(
        'SELECT COUNT(*) as count FROM diagrams WHERE user_id = $1 AND deleted_at IS NULL',
        [userId]
    );

    // Get shared diagram count
    const sharedCountResult = await query(
        `SELECT COUNT(*) as count FROM diagram_collaborators
         WHERE user_id = $1 AND accepted_at IS NOT NULL`,
        [userId]
    );

    // Get total view count
    const viewCountResult = await query(
        'SELECT SUM(view_count) as total FROM diagrams WHERE user_id = $1 AND deleted_at IS NULL',
        [userId]
    );

    // Get total fork count
    const forkCountResult = await query(
        'SELECT SUM(fork_count) as total FROM diagrams WHERE user_id = $1 AND deleted_at IS NULL',
        [userId]
    );

    // Get public diagram count
    const publicCountResult = await query(
        'SELECT COUNT(*) as count FROM diagrams WHERE user_id = $1 AND is_public = TRUE AND deleted_at IS NULL',
        [userId]
    );

    // Get template count
    const templateCountResult = await query(
        'SELECT COUNT(*) as count FROM diagrams WHERE user_id = $1 AND is_template = TRUE AND deleted_at IS NULL',
        [userId]
    );

    res.json({
        stats: {
            diagrams_created: parseInt(diagramCountResult.rows[0].count),
            diagrams_shared: parseInt(sharedCountResult.rows[0].count),
            total_views: parseInt(viewCountResult.rows[0].total || 0),
            total_forks: parseInt(forkCountResult.rows[0].total || 0),
            public_diagrams: parseInt(publicCountResult.rows[0].count),
            templates: parseInt(templateCountResult.rows[0].count)
        }
    });
}));

/**
 * GET /api/users/me/recent-diagrams
 * Get recently accessed diagrams
 */
router.get('/me/recent-diagrams', asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const limit = req.query.limit || 10;

    const result = await query(
        `SELECT d.id, d.title, d.updated_at, d.is_public,
                CASE
                    WHEN d.user_id = $1 THEN true
                    ELSE false
                END as is_owner
         FROM diagrams d
         LEFT JOIN diagram_collaborators dc ON d.id = dc.diagram_id AND dc.user_id = $1
         WHERE (d.user_id = $1 OR dc.user_id = $1)
           AND d.deleted_at IS NULL
         ORDER BY d.updated_at DESC
         LIMIT $2`,
        [userId, limit]
    );

    res.json({
        diagrams: result.rows
    });
}));

/**
 * DELETE /api/users/me
 * Delete user account (soft delete)
 */
router.delete('/me', asyncHandler(async (req, res) => {
    const { userId } = req.user;

    // Deactivate account
    await query(
        'UPDATE users SET is_active = FALSE WHERE id = $1',
        [userId]
    );

    // Revoke all refresh tokens
    await query(
        'UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1',
        [userId]
    );

    // Soft delete all user diagrams
    await query(
        'UPDATE diagrams SET deleted_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND deleted_at IS NULL',
        [userId]
    );

    logger.info(`User account deleted: ${userId}`);

    res.json({
        message: 'Account deleted successfully'
    });
}));

/**
 * GET /api/users/:id/public-profile
 * Get public profile of another user
 */
router.get('/:id/public-profile', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await query(
        `SELECT id, full_name, organization, created_at
         FROM users WHERE id = $1 AND is_active = TRUE`,
        [id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Get public diagram count
    const diagramCountResult = await query(
        'SELECT COUNT(*) as count FROM diagrams WHERE user_id = $1 AND is_public = TRUE AND deleted_at IS NULL',
        [id]
    );

    res.json({
        user: result.rows[0],
        public_diagrams: parseInt(diagramCountResult.rows[0].count)
    });
}));

module.exports = router;
