/**
 * Admin Routes for Principle 5
 * Manage community map submissions, approve/reject, communicate with creators
 * Requires admin password in X-Admin-Password header
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verifyAdminPassword } = require('../middleware/adminAuth');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// All admin routes require authentication
router.use(verifyAdminPassword);

/**
 * GET /api/admin/stats
 * Dashboard statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = {};

        // Get counts by status
        const statusResult = await pool.query(`
            SELECT status, COUNT(*) as count
            FROM community_maps
            GROUP BY status
        `);

        stats.byStatus = {};
        statusResult.rows.forEach(row => {
            stats.byStatus[row.status] = parseInt(row.count);
        });

        // Total views
        const viewsResult = await pool.query(`
            SELECT SUM(view_count) as total_views
            FROM community_maps
            WHERE status = 'approved'
        `);
        stats.totalViews = parseInt(viewsResult.rows[0].total_views) || 0;

        // Recent activity (submissions this week)
        const activityResult = await pool.query(`
            SELECT COUNT(*) as recent_submissions
            FROM community_maps
            WHERE created_at >= NOW() - INTERVAL '7 days'
        `);
        stats.recentSubmissions = parseInt(activityResult.rows[0].recent_submissions);

        // Most active authors
        const authorsResult = await pool.query(`
            SELECT author, COUNT(*) as map_count
            FROM community_maps
            WHERE status = 'approved'
            GROUP BY author
            ORDER BY map_count DESC
            LIMIT 5
        `);
        stats.topAuthors = authorsResult.rows;

        // Most viewed maps
        const viewedResult = await pool.query(`
            SELECT id, title, author, view_count
            FROM community_maps
            WHERE status = 'approved'
            ORDER BY view_count DESC
            LIMIT 5
        `);
        stats.mostViewed = viewedResult.rows;

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics'
        });
    }
});

/**
 * GET /api/admin/submissions
 * Get all submissions (with filters)
 * Query params: status, author, search, sort, limit, offset
 */
router.get('/submissions', async (req, res) => {
    try {
        const {
            status,
            author,
            search,
            sort = 'created_at',
            order = 'DESC',
            limit = 50,
            offset = 0
        } = req.query;

        let query = 'SELECT * FROM community_maps WHERE 1=1';
        const params = [];
        let paramCount = 0;

        // Add filters
        if (status) {
            paramCount++;
            query += ` AND status = $${paramCount}`;
            params.push(status);
        }

        if (author) {
            paramCount++;
            query += ` AND author ILIKE $${paramCount}`;
            params.push(`%${author}%`);
        }

        if (search) {
            paramCount++;
            query += ` AND search_vector @@ plainto_tsquery('english', $${paramCount})`;
            params.push(search);
        }

        // Add sorting
        const validSortFields = ['created_at', 'updated_at', 'title', 'author', 'status', 'view_count'];
        const sortField = validSortFields.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortField} ${sortOrder}`;

        // Add pagination
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM community_maps WHERE 1=1';
        const countParams = [];
        let countParamCount = 0;

        if (status) {
            countParamCount++;
            countQuery += ` AND status = $${countParamCount}`;
            countParams.push(status);
        }

        if (author) {
            countParamCount++;
            countQuery += ` AND author ILIKE $${countParamCount}`;
            countParams.push(`%${author}%`);
        }

        if (search) {
            countParamCount++;
            countQuery += ` AND search_vector @@ plainto_tsquery('english', $${countParamCount}`;
            countParams.push(search);
        }

        const countResult = await pool.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            submissions: result.rows,
            pagination: {
                total: totalCount,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + result.rows.length < totalCount
            }
        });

    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching submissions'
        });
    }
});

/**
 * GET /api/admin/submissions/:id
 * Get specific submission details (admin can see all fields)
 */
router.get('/submissions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM community_maps WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        // Get moderation history
        const historyResult = await pool.query(`
            SELECT *
            FROM moderation_history
            WHERE map_id = $1
            ORDER BY created_at DESC
        `, [id]);

        res.json({
            success: true,
            submission: result.rows[0],
            history: historyResult.rows
        });

    } catch (error) {
        console.error('Error fetching submission:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching submission'
        });
    }
});

/**
 * POST /api/admin/submissions/:id/approve
 * Approve and publish a map
 * Body: { adminNotes, notifyAuthor }
 */
router.post('/submissions/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { adminNotes, notifyAuthor = true } = req.body;

        // Update map status
        const result = await pool.query(`
            UPDATE community_maps
            SET
                status = 'approved',
                approved_by = 'Principle 5',
                approved_at = CURRENT_TIMESTAMP,
                published_at = CURRENT_TIMESTAMP,
                admin_notes = COALESCE($1, admin_notes)
            WHERE id = $2
            RETURNING *
        `, [adminNotes, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        const map = result.rows[0];

        // Log action
        await pool.query(`
            INSERT INTO moderation_history (map_id, action, performed_by, notes)
            VALUES ($1, 'approved', 'Admin', $2)
        `, [id, adminNotes || 'Map approved and published']);

        // Send approval email if requested
        if (notifyAuthor) {
            await pool.query(`
                INSERT INTO email_queue (recipient_email, subject, body, map_id, email_type)
                VALUES ($1, $2, $3, $4, 'approved')
            `, [
                map.email,
                `Map Approved! "${map.title}" is now live`,
                `Hi ${map.author},\n\nGreat news! Your map "${map.title}" has been approved and is now live in the community gallery!\n\nView your map: ${process.env.APP_URL}/browse\n\nThanks for contributing to the Co-opMaps community.\n\nBest,\nPrinciple 5`,
                id
            ]);
        }

        res.json({
            success: true,
            message: 'Map approved and published',
            map: {
                id: map.id,
                title: map.title,
                status: map.status,
                publishedAt: map.published_at
            }
        });

    } catch (error) {
        console.error('Error approving submission:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving submission'
        });
    }
});

/**
 * POST /api/admin/submissions/:id/request-changes
 * Request changes from the creator
 * Body: { message, checklist }
 */
router.post('/submissions/:id/request-changes', async (req, res) => {
    try {
        const { id } = req.params;
        const { message, checklist } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        // Get map details
        const mapResult = await pool.query(
            'SELECT * FROM community_maps WHERE id = $1',
            [id]
        );

        if (mapResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        const map = mapResult.rows[0];

        // Log action
        await pool.query(`
            INSERT INTO moderation_history (map_id, action, performed_by, notes, metadata)
            VALUES ($1, 'changes_requested', 'Admin', $2, $3)
        `, [
            id,
            message,
            JSON.stringify({ checklist: checklist || [] })
        ]);

        // Send email
        const editLink = `${process.env.APP_URL}/edit-map/${id}`;
        const emailBody = `Hi ${map.author},

We've reviewed your map "${map.title}" and it looks great! Before we can publish it, we need a few adjustments:

${message}

Please log in with your password to make these changes:
${editLink}

Once updated, your map will be reviewed again promptly.

Best,
Principle 5
Co-opMaps Community`;

        await pool.query(`
            INSERT INTO email_queue (recipient_email, subject, body, map_id, email_type)
            VALUES ($1, $2, $3, $4, 'changes_requested')
        `, [
            map.email,
            `Changes Needed - "${map.title}"`,
            emailBody,
            id
        ]);

        res.json({
            success: true,
            message: 'Change request sent to creator',
            emailSent: true
        });

    } catch (error) {
        console.error('Error requesting changes:', error);
        res.status(500).json({
            success: false,
            message: 'Error requesting changes'
        });
    }
});

/**
 * POST /api/admin/submissions/:id/reject
 * Reject a submission
 * Body: { reason, message, deleteMap }
 */
router.post('/submissions/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, message, deleteMap = false } = req.body;

        if (!reason || !message) {
            return res.status(400).json({
                success: false,
                message: 'Reason and message are required'
            });
        }

        // Get map details
        const mapResult = await pool.query(
            'SELECT * FROM community_maps WHERE id = $1',
            [id]
        );

        if (mapResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        const map = mapResult.rows[0];

        if (deleteMap) {
            // Delete permanently
            await pool.query('DELETE FROM community_maps WHERE id = $1', [id]);
        } else {
            // Archive (keep in system)
            await pool.query(`
                UPDATE community_maps
                SET status = 'rejected', rejection_reason = $1
                WHERE id = $2
            `, [reason, id]);
        }

        // Log action
        await pool.query(`
            INSERT INTO moderation_history (map_id, action, performed_by, notes)
            VALUES ($1, 'rejected', 'Admin', $2)
        `, [id, `${reason}: ${message}`]);

        // Send email
        const emailBody = `Hi ${map.author},

Unfortunately, we're unable to approve your map "${map.title}" at this time.

Reason: ${reason}

${message}

You're welcome to revise and resubmit your map.

Best,
Principle 5`;

        await pool.query(`
            INSERT INTO email_queue (recipient_email, subject, body, map_id, email_type)
            VALUES ($1, $2, $3, $4, 'rejected')
        `, [
            map.email,
            `Map Submission Update - "${map.title}"`,
            emailBody,
            id
        ]);

        res.json({
            success: true,
            message: deleteMap ? 'Map deleted' : 'Map rejected',
            emailSent: true
        });

    } catch (error) {
        console.error('Error rejecting submission:', error);
        res.status(500).json({
            success: false,
            message: 'Error rejecting submission'
        });
    }
});

/**
 * POST /api/admin/maps/:id/unpublish
 * Unpublish an approved map
 * Body: { reason, notifyAuthor }
 */
router.post('/maps/:id/unpublish', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, notifyAuthor = true } = req.body;

        const result = await pool.query(`
            UPDATE community_maps
            SET status = 'archived', admin_notes = $1
            WHERE id = $2 AND status = 'approved'
            RETURNING *
        `, [reason, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Map not found or not published'
            });
        }

        const map = result.rows[0];

        // Log action
        await pool.query(`
            INSERT INTO moderation_history (map_id, action, performed_by, notes)
            VALUES ($1, 'unpublished', 'Admin', $2)
        `, [id, reason]);

        // Notify author if requested
        if (notifyAuthor) {
            await pool.query(`
                INSERT INTO email_queue (recipient_email, subject, body, map_id, email_type)
                VALUES ($1, $2, $3, $4, 'unpublished')
            `, [
                map.email,
                `Map Unpublished - "${map.title}"`,
                `Hi ${map.author},\n\nYour map "${map.title}" has been unpublished.\n\nReason: ${reason}\n\nBest,\nPrinciple 5`,
                id
            ]);
        }

        res.json({
            success: true,
            message: 'Map unpublished'
        });

    } catch (error) {
        console.error('Error unpublishing map:', error);
        res.status(500).json({
            success: false,
            message: 'Error unpublishing map'
        });
    }
});

/**
 * GET /api/admin/maps/:id/history
 * Get moderation history for a map
 */
router.get('/maps/:id/history', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT *
            FROM moderation_history
            WHERE map_id = $1
            ORDER BY created_at DESC
        `, [id]);

        res.json({
            success: true,
            history: result.rows
        });

    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching moderation history'
        });
    }
});

/**
 * POST /api/admin/bulk-action
 * Perform bulk actions on multiple maps
 * Body: { action, mapIds, data }
 */
router.post('/bulk-action', async (req, res) => {
    try {
        const { action, mapIds, data } = req.body;

        if (!action || !Array.isArray(mapIds) || mapIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Action and mapIds array required'
            });
        }

        let successCount = 0;
        let failCount = 0;
        const errors = [];

        for (const mapId of mapIds) {
            try {
                switch (action) {
                    case 'approve':
                        await pool.query(`
                            UPDATE community_maps
                            SET status = 'approved', approved_by = 'Principle 5',
                                approved_at = CURRENT_TIMESTAMP, published_at = CURRENT_TIMESTAMP
                            WHERE id = $1
                        `, [mapId]);
                        successCount++;
                        break;

                    case 'archive':
                        await pool.query(`
                            UPDATE community_maps
                            SET status = 'archived'
                            WHERE id = $1
                        `, [mapId]);
                        successCount++;
                        break;

                    default:
                        errors.push({ mapId, error: 'Invalid action' });
                        failCount++;
                }
            } catch (error) {
                errors.push({ mapId, error: error.message });
                failCount++;
            }
        }

        res.json({
            success: true,
            successCount,
            failCount,
            errors
        });

    } catch (error) {
        console.error('Error performing bulk action:', error);
        res.status(500).json({
            success: false,
            message: 'Error performing bulk action'
        });
    }
});

module.exports = router;
