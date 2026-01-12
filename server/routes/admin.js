/**
 * Admin Routes
 * Handles admin panel operations for moderating community maps
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, param, query, validationResult } = require('express-validator');
const { pool } = require('../db/connection');
const logger = require('../utils/logger');
const {
    sendMapApprovedEmail,
    sendMapRejectedEmail,
    sendMapChangesRequestedEmail,
    sendMapUnpublishedEmail
} = require('../services/emailService');

// ============================================================
// ADMIN AUTHENTICATION MIDDLEWARE
// ============================================================

const validateAdminPassword = async (req, res, next) => {
    const adminPassword = req.headers['x-admin-password'];

    if (!adminPassword) {
        return res.status(401).json({
            success: false,
            message: 'Admin password is required'
        });
    }

    try {
        // Get admin password hash from config
        const result = await pool.query(
            `SELECT value FROM admin_config WHERE key = 'admin_password_hash'`
        );

        if (result.rows.length === 0) {
            return res.status(500).json({
                success: false,
                message: 'Admin configuration not found'
            });
        }

        const passwordHash = result.rows[0].value;
        const passwordMatch = await bcrypt.compare(adminPassword, passwordHash);

        if (!passwordMatch) {
            logger.warn('Failed admin authentication attempt');
            return res.status(401).json({
                success: false,
                message: 'Invalid admin password'
            });
        }

        next();
    } catch (error) {
        logger.error('Error validating admin password:', error.message, error.stack);
        res.status(500).json({
            success: false,
            message: 'Authentication failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============================================================
// ADMIN ROUTES
// ============================================================

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
router.get('/stats', validateAdminPassword, async (req, res) => {
    try {
        const stats = await pool.query(`SELECT * FROM get_moderation_stats()`);

        // Get recent activity
        const recentActivity = await pool.query(
            `SELECT
                mh.action,
                mh.created_at,
                cm.title as map_title,
                u.full_name as moderator_name
            FROM map_moderation_history mh
            LEFT JOIN community_maps cm ON mh.map_id = cm.id
            LEFT JOIN users u ON mh.moderator_id = u.id
            ORDER BY mh.created_at DESC
            LIMIT 10`
        );

        res.json({
            success: true,
            stats: stats.rows[0],
            recentActivity: recentActivity.rows
        });
    } catch (error) {
        logger.error('Error fetching admin stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
});

/**
 * GET /api/admin/submissions
 * Get all submissions with filtering and sorting
 */
router.get('/submissions', [
    validateAdminPassword,
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'changes_requested', 'published']),
    query('author').optional().trim(),
    query('search').optional().trim(),
    query('sort').optional().isIn(['submitted_at', 'title', 'author', 'status']),
    query('order').optional().isIn(['asc', 'desc']),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const {
            status,
            author,
            search,
            sort = 'submitted_at',
            order = 'desc',
            limit = 50,
            offset = 0
        } = req.query;

        let queryText = `
            SELECT
                id, title, author, author_email, author_organization,
                status, submitted_at, last_edited_at, reviewed_at,
                is_public, is_featured, view_count,
                changes_requested, changes_requested_at,
                rejection_reason
            FROM community_maps
            WHERE deleted_at IS NULL
        `;

        const queryParams = [];
        let paramIndex = 1;

        if (status) {
            queryText += ` AND status = $${paramIndex}`;
            queryParams.push(status);
            paramIndex++;
        }

        if (author) {
            queryText += ` AND author ILIKE $${paramIndex}`;
            queryParams.push(`%${author}%`);
            paramIndex++;
        }

        if (search) {
            queryText += ` AND search_vector @@ plainto_tsquery('english', $${paramIndex})`;
            queryParams.push(search);
            paramIndex++;
        }

        queryText += ` ORDER BY ${sort} ${order.toUpperCase()} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(limit, offset);

        const result = await pool.query(queryText, queryParams);

        // Get total count
        let countQuery = `SELECT COUNT(*) as total FROM community_maps WHERE deleted_at IS NULL`;
        const countParams = [];
        let countParamIndex = 1;

        if (status) {
            countQuery += ` AND status = $${countParamIndex}`;
            countParams.push(status);
            countParamIndex++;
        }

        if (author) {
            countQuery += ` AND author ILIKE $${countParamIndex}`;
            countParams.push(`%${author}%`);
            countParamIndex++;
        }

        if (search) {
            countQuery += ` AND search_vector @@ plainto_tsquery('english', $${countParamIndex})`;
            countParams.push(search);
        }

        const countResult = await pool.query(countQuery, countParams);

        res.json({
            success: true,
            submissions: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit,
                offset,
                hasMore: offset + result.rows.length < parseInt(countResult.rows[0].total)
            }
        });
    } catch (error) {
        logger.error('Error fetching submissions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch submissions'
        });
    }
});

/**
 * GET /api/admin/submissions/:id
 * Get detailed submission information
 */
router.get('/submissions/:id', [
    validateAdminPassword,
    param('id').isUUID().withMessage('Invalid submission ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id } = req.params;

        const result = await pool.query(
            `SELECT * FROM community_maps WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        // Get moderation history
        const history = await pool.query(
            `SELECT
                mh.*,
                u.full_name as moderator_name
            FROM map_moderation_history mh
            LEFT JOIN users u ON mh.moderator_id = u.id
            WHERE mh.map_id = $1
            ORDER BY mh.created_at DESC`,
            [id]
        );

        // Get tags
        const tags = await pool.query(
            `SELECT tag FROM community_map_tags WHERE map_id = $1`,
            [id]
        );

        res.json({
            success: true,
            submission: result.rows[0],
            history: history.rows,
            tags: tags.rows.map(row => row.tag)
        });
    } catch (error) {
        logger.error('Error fetching submission details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch submission'
        });
    }
});

/**
 * POST /api/admin/submissions/:id/approve
 * Approve a submission and assign official WDR number
 */
router.post('/submissions/:id/approve', [
    validateAdminPassword,
    param('id').isUUID().withMessage('Invalid submission ID'),
    body('adminNotes').optional().trim(),
    body('customWdr').optional().trim().matches(/^WDR-\d{4}$/).withMessage('Custom WDR must be in format WDR-0000'),
    body('notifyAuthor').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id } = req.params;
        const { adminNotes, customWdr, notifyAuthor = true } = req.body;

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get the next WDR number (or use custom if provided)
            let officialWdr;
            if (customWdr) {
                // Check if custom WDR is already in use
                const existingWdr = await client.query(
                    `SELECT id FROM community_maps WHERE official_wdr = $1`,
                    [customWdr]
                );
                if (existingWdr.rows.length > 0) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        success: false,
                        message: `WDR ${customWdr} is already assigned to another map`
                    });
                }
                officialWdr = customWdr;
            } else {
                // Auto-generate next WDR
                const wdrResult = await client.query(`SELECT get_next_wdr_number() as wdr`);
                officialWdr = wdrResult.rows[0].wdr;
            }

            // Update map status and assign official WDR
            const result = await client.query(
                `UPDATE community_maps
                SET status = 'approved', is_public = TRUE, published_at = CURRENT_TIMESTAMP,
                    admin_notes = $1, reviewed_at = CURRENT_TIMESTAMP,
                    official_wdr = $2, wdr_status = 'official'
                WHERE id = $3 AND deleted_at IS NULL AND status = 'pending'
                RETURNING *`,
                [adminNotes, officialWdr, id]
            );

            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: 'Submission not found or already processed'
                });
            }

            // Record moderation action with WDR
            await client.query(
                `INSERT INTO map_moderation_history (map_id, action, previous_status, new_status, notes)
                VALUES ($1, 'approve', 'pending', 'approved', $2)`,
                [id, `Assigned WDR: ${officialWdr}. ${adminNotes || ''}`]
            );

            await client.query('COMMIT');

            // Send notification email if requested
            if (notifyAuthor && result.rows[0].author_email) {
                try {
                    await sendMapApprovedEmail(result.rows[0]);
                    logger.info(`Approval email queued for map: ${id}`);
                } catch (emailError) {
                    logger.error('Failed to queue approval email:', emailError);
                }
            }

            logger.info(`Map approved with WDR ${officialWdr}: ${id}`);

            res.json({
                success: true,
                message: `Submission approved and published with ${officialWdr}`,
                officialWdr: officialWdr,
                map: result.rows[0]
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Error approving submission:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve submission'
        });
    }
});

/**
 * POST /api/admin/submissions/:id/request-changes
 * Request changes from the author
 */
router.post('/submissions/:id/request-changes', [
    validateAdminPassword,
    param('id').isUUID().withMessage('Invalid submission ID'),
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('checklist').optional().isArray()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id } = req.params;
        const { message, checklist = [] } = req.body;

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Update map status
            const result = await client.query(
                `UPDATE community_maps
                SET status = 'changes_requested',
                    changes_requested = $1,
                    changes_requested_at = CURRENT_TIMESTAMP,
                    reviewed_at = CURRENT_TIMESTAMP
                WHERE id = $2 AND deleted_at IS NULL
                RETURNING *`,
                [JSON.stringify({ message, checklist }), id]
            );

            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: 'Submission not found'
                });
            }

            // Record moderation action
            await client.query(
                `INSERT INTO map_moderation_history (map_id, action, new_status, message)
                VALUES ($1, 'request_changes', 'changes_requested', $2)`,
                [id, message]
            );

            await client.query('COMMIT');

            // Send notification email to author
            if (result.rows[0].author_email) {
                try {
                    await sendMapChangesRequestedEmail(result.rows[0], message, checklist);
                    logger.info(`Changes requested email queued for map: ${id}`);
                } catch (emailError) {
                    logger.error('Failed to queue changes requested email:', emailError);
                }
            }

            logger.info(`Changes requested for map: ${id}`);

            res.json({
                success: true,
                message: 'Changes requested from author'
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Error requesting changes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to request changes'
        });
    }
});

/**
 * POST /api/admin/submissions/:id/reject
 * Reject a submission
 */
router.post('/submissions/:id/reject', [
    validateAdminPassword,
    param('id').isUUID().withMessage('Invalid submission ID'),
    body('reason').trim().notEmpty().withMessage('Reason is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('deleteMap').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id } = req.params;
        const { reason, message, deleteMap = false } = req.body;

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get map data first (for email notification)
            const mapResult = await client.query(
                `SELECT id, title, author, author_email FROM community_maps WHERE id = $1 AND deleted_at IS NULL`,
                [id]
            );

            if (mapResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: 'Submission not found'
                });
            }

            const mapData = mapResult.rows[0];

            if (deleteMap) {
                // Soft delete the map
                await client.query(
                    `UPDATE community_maps
                    SET status = 'rejected', deleted_at = CURRENT_TIMESTAMP,
                        rejection_reason = $1, rejection_message = $2,
                        reviewed_at = CURRENT_TIMESTAMP
                    WHERE id = $3 AND deleted_at IS NULL`,
                    [reason, message, id]
                );
            } else {
                // Just mark as rejected
                await client.query(
                    `UPDATE community_maps
                    SET status = 'rejected',
                        rejection_reason = $1, rejection_message = $2,
                        reviewed_at = CURRENT_TIMESTAMP
                    WHERE id = $3 AND deleted_at IS NULL`,
                    [reason, message, id]
                );
            }

            // Record moderation action
            await client.query(
                `INSERT INTO map_moderation_history (map_id, action, new_status, reason, message)
                VALUES ($1, 'reject', 'rejected', $2, $3)`,
                [id, reason, message]
            );

            await client.query('COMMIT');

            // Send notification email to author
            if (mapData.author_email) {
                try {
                    await sendMapRejectedEmail(mapData, reason, message);
                    logger.info(`Rejection email queued for map: ${id}`);
                } catch (emailError) {
                    logger.error('Failed to queue rejection email:', emailError);
                }
            }

            logger.info(`Map rejected: ${id} (deleted: ${deleteMap})`);

            res.json({
                success: true,
                message: deleteMap ? 'Submission rejected and deleted' : 'Submission rejected'
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Error rejecting submission:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject submission'
        });
    }
});

/**
 * POST /api/admin/maps/:id/unpublish
 * Unpublish a published map
 */
router.post('/maps/:id/unpublish', [
    validateAdminPassword,
    param('id').isUUID().withMessage('Invalid map ID'),
    body('reason').trim().notEmpty().withMessage('Reason is required'),
    body('notifyAuthor').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id } = req.params;
        const { reason, notifyAuthor = true } = req.body;

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const result = await client.query(
                `UPDATE community_maps
                SET is_public = FALSE, status = 'approved'
                WHERE id = $1 AND deleted_at IS NULL AND status = 'published'
                RETURNING *`,
                [id]
            );

            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: 'Map not found or not published'
                });
            }

            // Record moderation action
            await client.query(
                `INSERT INTO map_moderation_history (map_id, action, previous_status, new_status, reason)
                VALUES ($1, 'unpublish', 'published', 'approved', $2)`,
                [id, reason]
            );

            await client.query('COMMIT');

            // Send notification email if requested
            if (notifyAuthor && result.rows[0].author_email) {
                try {
                    await sendMapUnpublishedEmail(result.rows[0], reason);
                    logger.info(`Unpublish email queued for map: ${id}`);
                } catch (emailError) {
                    logger.error('Failed to queue unpublish email:', emailError);
                }
            }

            logger.info(`Map unpublished: ${id}`);

            res.json({
                success: true,
                message: 'Map unpublished successfully'
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Error unpublishing map:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unpublish map'
        });
    }
});

/**
 * GET /api/admin/maps/:id/history
 * Get moderation history for a map
 */
router.get('/maps/:id/history', [
    validateAdminPassword,
    param('id').isUUID().withMessage('Invalid map ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id } = req.params;

        const result = await pool.query(
            `SELECT
                mh.*,
                u.full_name as moderator_name,
                u.email as moderator_email
            FROM map_moderation_history mh
            LEFT JOIN users u ON mh.moderator_id = u.id
            WHERE mh.map_id = $1
            ORDER BY mh.created_at DESC`,
            [id]
        );

        res.json({
            success: true,
            history: result.rows
        });
    } catch (error) {
        logger.error('Error fetching moderation history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch history'
        });
    }
});

/**
 * POST /api/admin/bulk-action
 * Perform bulk action on multiple maps
 */
router.post('/bulk-action', [
    validateAdminPassword,
    body('action').isIn(['approve', 'reject', 'delete', 'feature', 'unfeature']).withMessage('Invalid action'),
    body('mapIds').isArray({ min: 1 }).withMessage('Map IDs array is required'),
    body('data').optional()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { action, mapIds, data = {} } = req.body;

        const client = await pool.connect();
        const results = { success: 0, failed: 0, errors: [] };

        try {
            await client.query('BEGIN');

            for (const mapId of mapIds) {
                try {
                    switch (action) {
                        case 'approve':
                            await client.query(
                                `UPDATE community_maps
                                SET status = 'approved', is_public = TRUE, published_at = CURRENT_TIMESTAMP
                                WHERE id = $1 AND deleted_at IS NULL`,
                                [mapId]
                            );
                            break;

                        case 'reject':
                            await client.query(
                                `UPDATE community_maps
                                SET status = 'rejected'
                                WHERE id = $1 AND deleted_at IS NULL`,
                                [mapId]
                            );
                            break;

                        case 'delete':
                            await client.query(
                                `UPDATE community_maps
                                SET deleted_at = CURRENT_TIMESTAMP
                                WHERE id = $1`,
                                [mapId]
                            );
                            break;

                        case 'feature':
                            await client.query(
                                `UPDATE community_maps
                                SET is_featured = TRUE
                                WHERE id = $1 AND deleted_at IS NULL`,
                                [mapId]
                            );
                            break;

                        case 'unfeature':
                            await client.query(
                                `UPDATE community_maps
                                SET is_featured = FALSE
                                WHERE id = $1 AND deleted_at IS NULL`,
                                [mapId]
                            );
                            break;
                    }

                    // Record action in history
                    await client.query(
                        `INSERT INTO map_moderation_history (map_id, action)
                        VALUES ($1, $2)`,
                        [mapId, action]
                    );

                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({ mapId, error: error.message });
                }
            }

            await client.query('COMMIT');

            logger.info(`Bulk action '${action}' completed: ${results.success} success, ${results.failed} failed`);

            res.json({
                success: true,
                message: `Bulk action completed`,
                results
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Error performing bulk action:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to perform bulk action'
        });
    }
});

/**
 * POST /api/admin/maps/:id/reset-password
 * Reset map password (admin emergency access)
 */
router.post('/maps/:id/reset-password', [
    validateAdminPassword,
    param('id').isUUID().withMessage('Invalid map ID'),
    body('newPassword').isLength({ min: 4 }).withMessage('Password must be at least 4 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id } = req.params;
        const { newPassword } = req.body;

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        const result = await pool.query(
            `UPDATE community_maps
            SET password_hash = $1
            WHERE id = $2 AND deleted_at IS NULL
            RETURNING id`,
            [passwordHash, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Map not found'
            });
        }

        logger.warn(`Admin password reset for map: ${id}`);

        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        logger.error('Error resetting password:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password'
        });
    }
});

module.exports = router;
