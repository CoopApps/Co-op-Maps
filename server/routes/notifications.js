const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/notifications
 * Get user's notifications
 */
router.get('/', asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { unreadOnly, limit = 50, offset = 0 } = req.query;

    let sql = `
        SELECT * FROM user_notifications_detailed
        WHERE user_id = $1
    `;
    const params = [userId];

    if (unreadOnly === 'true') {
        sql += ' AND is_read = FALSE';
    }

    sql += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get unread count
    const countResult = await query(
        'SELECT get_unread_notification_count($1) as count',
        [userId]
    );

    res.json({
        notifications: result.rows,
        unreadCount: parseInt(countResult.rows[0].count)
    });
}));

/**
 * POST /api/notifications/mark-read
 * Mark notifications as read
 */
router.post('/mark-read', asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds)) {
        return res.status(400).json({ error: 'notificationIds must be an array' });
    }

    const result = await query(
        'SELECT mark_notifications_read($1, $2) as count',
        [userId, notificationIds]
    );

    res.json({
        markedAsRead: parseInt(result.rows[0].count)
    });
}));

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.post('/mark-all-read', asyncHandler(async (req, res) => {
    const { userId } = req.user;

    const result = await query(
        `UPDATE notifications
         SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND is_read = FALSE`,
        [userId]
    );

    res.json({
        markedAsRead: result.rowCount
    });
}));

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;

    const result = await query(
        'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
        [id, userId]
    );

    if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
}));

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', asyncHandler(async (req, res) => {
    const { userId } = req.user;

    const result = await query(
        'SELECT get_unread_notification_count($1) as count',
        [userId]
    );

    res.json({ count: parseInt(result.rows[0].count) });
}));

module.exports = router;
