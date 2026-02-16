/**
 * User Submissions Routes
 * Handles retrieving user's submitted maps for review and status tracking
 * Requires JWT authentication
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');
const { query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/submissions/my-submissions
 * Get user's submitted maps (pending, approved, changes_requested, rejected, published)
 * Query params: status (optional filter), limit, offset
 */
router.get('/my-submissions', [
    query('status').optional().isIn(['pending', 'approved', 'changes_requested', 'rejected', 'published']),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { userId } = req.user;
        const { status, limit = 50, offset = 0 } = req.query;

        // Build query with optional status filter
        let statusCondition = `status IN ('pending', 'approved', 'changes_requested', 'rejected', 'published')`;
        const queryParams = [userId, limit, offset];

        if (status) {
            statusCondition = `status = $4`;
            queryParams.push(status);
        }

        const result = await pool.query(
            `SELECT id, title, status, submitted_at, last_edited_at, published_at,
                    official_wdr, admin_notes, rejection_reason, rejection_message,
                    changes_requested, changes_requested_at,
                    is_public, is_featured, view_count,
                    thumbnail, description
             FROM community_maps
             WHERE user_id = $1
               AND ${statusCondition}
               AND deleted_at IS NULL
             ORDER BY submitted_at DESC
             LIMIT $2 OFFSET $3`,
            queryParams
        );

        // Get tags for each submission
        const submissionsWithTags = await Promise.all(
            result.rows.map(async (submission) => {
                const tagsResult = await pool.query(
                    'SELECT tag FROM community_map_tags WHERE map_id = $1',
                    [submission.id]
                );
                return {
                    ...submission,
                    tags: tagsResult.rows.map(t => t.tag)
                };
            })
        );

        // Get total count for pagination
        const countResult = await pool.query(
            `SELECT COUNT(*) as total
             FROM community_maps
             WHERE user_id = $1
               AND ${statusCondition}
               AND deleted_at IS NULL`,
            status ? [userId, status] : [userId]
        );

        res.json({
            success: true,
            submissions: submissionsWithTags,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit,
                offset,
                hasMore: offset + result.rows.length < parseInt(countResult.rows[0].total)
            }
        });
    } catch (error) {
        logger.error('Error fetching submissions:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch submissions', error: error.message });
    }
});

/**
 * GET /api/submissions/my-submissions/stats
 * Get statistics about user's submissions
 */
router.get('/my-submissions/stats', async (req, res) => {
    try {
        const { userId } = req.user;

        const result = await pool.query(
            `SELECT
                COUNT(*) FILTER (WHERE status = 'draft') as drafts,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'approved') as approved,
                COUNT(*) FILTER (WHERE status = 'changes_requested') as changes_requested,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
                COUNT(*) FILTER (WHERE status = 'published') as published,
                COUNT(*) FILTER (WHERE deleted_at IS NULL) as total,
                SUM(view_count) FILTER (WHERE status = 'published') as total_views,
                MAX(submitted_at) as last_submission
             FROM community_maps
             WHERE user_id = $1`,
            [userId]
        );

        res.json({
            success: true,
            stats: {
                drafts: parseInt(result.rows[0].drafts) || 0,
                pending: parseInt(result.rows[0].pending) || 0,
                approved: parseInt(result.rows[0].approved) || 0,
                changes_requested: parseInt(result.rows[0].changes_requested) || 0,
                rejected: parseInt(result.rows[0].rejected) || 0,
                published: parseInt(result.rows[0].published) || 0,
                total: parseInt(result.rows[0].total) || 0,
                totalViews: parseInt(result.rows[0].total_views) || 0,
                lastSubmission: result.rows[0].last_submission
            }
        });
    } catch (error) {
        logger.error('Error fetching submission stats:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats', error: error.message });
    }
});

/**
 * GET /api/submissions/:id
 * Get specific submission details (user must own it)
 */
router.get('/:id', async (req, res) => {
    try {
        const { userId } = req.user;
        const { id } = req.params;

        const result = await pool.query(
            `SELECT cm.*,
                    (SELECT json_agg(json_build_object('action', action, 'timestamp', created_at, 'message', message, 'reason', reason))
                     FROM map_moderation_history
                     WHERE map_id = cm.id
                     ORDER BY created_at DESC) as moderation_history
             FROM community_maps cm
             WHERE cm.id = $1 AND cm.user_id = $2 AND cm.deleted_at IS NULL`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }

        // Get tags
        const tagsResult = await pool.query(
            'SELECT tag FROM community_map_tags WHERE map_id = $1',
            [id]
        );

        res.json({
            success: true,
            submission: {
                ...result.rows[0],
                tags: tagsResult.rows.map(t => t.tag)
            }
        });
    } catch (error) {
        logger.error('Error fetching submission:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch submission', error: error.message });
    }
});

module.exports = router;
