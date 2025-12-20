const express = require('express');
const router = express.Router();
const { query, transaction } = require('../db/connection');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { queueEmail } = require('../services/emailService');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/diagrams/:diagramId/comments
 * Get all comments for a diagram
 */
router.get('/:diagramId/comments', asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { diagramId } = req.params;

    // Check permission
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [diagramId, userId, 'view']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Access denied' });
    }

    // Get comments with user info
    const result = await query(
        `SELECT c.*, u.full_name, u.email,
                resolver.full_name as resolved_by_name,
                (SELECT COUNT(*) FROM comments WHERE parent_comment_id = c.id AND deleted_at IS NULL) as reply_count
         FROM comments c
         JOIN users u ON c.user_id = u.id
         LEFT JOIN users resolver ON c.resolved_by = resolver.id
         WHERE c.diagram_id = $1 AND c.deleted_at IS NULL
         ORDER BY c.created_at ASC`,
        [diagramId]
    );

    res.json({ comments: result.rows });
}));

/**
 * POST /api/diagrams/:diagramId/comments
 * Add a comment to a diagram
 */
router.post('/:diagramId/comments', asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { diagramId } = req.params;
    const { content, parentCommentId } = req.body;

    if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check permission
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [diagramId, userId, 'view']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Access denied' });
    }

    const result = await transaction(async (client) => {
        // Create comment
        const commentResult = await client.query(
            `INSERT INTO comments (diagram_id, user_id, parent_comment_id, content)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [diagramId, userId, parentCommentId, content]
        );

        const comment = commentResult.rows[0];

        // Extract @mentions
        const mentionRegex = /@(\w+)/g;
        const mentions = [...content.matchAll(mentionRegex)].map(m => m[1]);

        if (mentions.length > 0) {
            // Find mentioned users
            const mentionedUsers = await client.query(
                `SELECT id, email, full_name FROM users
                 WHERE email = ANY($1) OR full_name = ANY($1)`,
                [mentions]
            );

            // Create mention records and notifications
            for (const user of mentionedUsers.rows) {
                await client.query(
                    'INSERT INTO mentions (comment_id, mentioned_user_id) VALUES ($1, $2)',
                    [comment.id, user.id]
                );

                // Create notification
                await client.query(
                    `SELECT create_notification(
                        $1, 'mention', $2, $3, $4, $5, $6, $7
                    )`,
                    [
                        user.id,
                        'You were mentioned',
                        `${req.user.email} mentioned you in a comment`,
                        `/diagrams/${diagramId}#comment-${comment.id}`,
                        userId,
                        diagramId,
                        comment.id
                    ]
                );

                // Queue email if user has preference enabled
                const prefs = await client.query(
                    `SELECT notification_preferences->'email_on_mention' as enabled
                     FROM users WHERE id = $1`,
                    [user.id]
                );

                if (prefs.rows[0]?.enabled !== false) {
                    queueEmail({
                        to: user.email,
                        toUserId: user.id,
                        subject: 'You were mentioned in a comment',
                        templateName: 'mention-notification',
                        templateData: {
                            mentionedName: user.full_name,
                            mentionerName: req.user.email,
                            diagramTitle: 'diagram', // TODO: Get actual title
                            commentContent: content,
                            commentLink: `${process.env.APP_URL}/diagrams/${diagramId}#comment-${comment.id}`
                        }
                    });
                }
            }
        }

        // Notify diagram owner (if not the commenter)
        const diagramOwner = await client.query(
            `SELECT d.user_id, u.email, u.full_name, d.title,
                    u.notification_preferences->'email_on_comment' as email_enabled
             FROM diagrams d
             JOIN users u ON d.user_id = u.id
             WHERE d.id = $1`,
            [diagramId]
        );

        if (diagramOwner.rows[0] && diagramOwner.rows[0].user_id !== userId) {
            const owner = diagramOwner.rows[0];

            // Create notification
            await client.query(
                `SELECT create_notification(
                    $1, 'comment', $2, $3, $4, $5, $6, $7
                )`,
                [
                    owner.user_id,
                    'New comment',
                    `${req.user.email} commented on your diagram`,
                    `/diagrams/${diagramId}#comment-${comment.id}`,
                    userId,
                    diagramId,
                    comment.id
                ]
            );

            // Queue email
            if (owner.email_enabled !== false) {
                queueEmail({
                    to: owner.email,
                    toUserId: owner.user_id,
                    subject: `New comment on "${owner.title}"`,
                    templateName: 'comment-notification',
                    templateData: {
                        recipientName: owner.full_name,
                        commenterName: req.user.email,
                        diagramTitle: owner.title,
                        commentContent: content,
                        commentLink: `${process.env.APP_URL}/diagrams/${diagramId}#comment-${comment.id}`
                    }
                });
            }
        }

        // Log activity
        await client.query(
            `SELECT log_activity($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                userId,
                diagramId,
                'create',
                'comment',
                comment.id,
                JSON.stringify({ content }),
                req.ip,
                req.get('user-agent')
            ]
        );

        return comment;
    });

    logger.info(`Comment created on diagram ${diagramId} by user ${userId}`);

    res.status(201).json({ comment: result });
}));

/**
 * PUT /api/comments/:commentId
 * Update a comment
 */
router.put('/:commentId', asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { commentId } = req.params;
    const { content } = req.body;

    // Verify ownership
    const commentCheck = await query(
        'SELECT user_id, diagram_id FROM comments WHERE id = $1 AND deleted_at IS NULL',
        [commentId]
    );

    if (commentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Comment not found' });
    }

    if (commentCheck.rows[0].user_id !== userId) {
        return res.status(403).json({ error: 'Can only edit your own comments' });
    }

    const result = await query(
        `UPDATE comments SET content = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [content, commentId]
    );

    res.json({ comment: result.rows[0] });
}));

/**
 * DELETE /api/comments/:commentId
 * Delete a comment (soft delete)
 */
router.delete('/:commentId', asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { commentId } = req.params;

    // Verify ownership or admin
    const commentCheck = await query(
        'SELECT user_id, diagram_id FROM comments WHERE id = $1 AND deleted_at IS NULL',
        [commentId]
    );

    if (commentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Comment not found' });
    }

    const canDelete = commentCheck.rows[0].user_id === userId || req.user.isAdmin;

    if (!canDelete) {
        return res.status(403).json({ error: 'Access denied' });
    }

    await query(
        'UPDATE comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
        [commentId]
    );

    res.json({ message: 'Comment deleted successfully' });
}));

/**
 * POST /api/comments/:commentId/resolve
 * Mark a comment as resolved
 */
router.post('/:commentId/resolve', asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { commentId } = req.params;

    // Check if user has edit permission on the diagram
    const commentCheck = await query(
        'SELECT diagram_id FROM comments WHERE id = $1 AND deleted_at IS NULL',
        [commentId]
    );

    if (commentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Comment not found' });
    }

    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [commentCheck.rows[0].diagram_id, userId, 'edit']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
        `UPDATE comments
         SET is_resolved = TRUE, resolved_by = $1, resolved_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [userId, commentId]
    );

    res.json({ comment: result.rows[0] });
}));

/**
 * POST /api/comments/:commentId/unresolve
 * Mark a comment as unresolved
 */
router.post('/:commentId/unresolve', asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { commentId } = req.params;

    const commentCheck = await query(
        'SELECT diagram_id FROM comments WHERE id = $1 AND deleted_at IS NULL',
        [commentId]
    );

    if (commentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Comment not found' });
    }

    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [commentCheck.rows[0].diagram_id, userId, 'edit']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
        `UPDATE comments
         SET is_resolved = FALSE, resolved_by = NULL, resolved_at = NULL
         WHERE id = $1
         RETURNING *`,
        [commentId]
    );

    res.json({ comment: result.rows[0] });
}));

module.exports = router;
