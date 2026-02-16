/**
 * Draft Maps Routes
 * Handles CRUD operations for draft maps and collaboration management
 * Requires JWT authentication for all endpoints
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// All draft routes require authentication
router.use(authenticateToken);

// ============================================================================
// DRAFT CRUD OPERATIONS
// ============================================================================

/**
 * POST /api/drafts
 * Create a new draft map
 */
router.post('/', [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 500 }),
    body('diagramData').notEmpty().withMessage('Diagram data is required'),
    body('thumbnail').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { userId, email } = req.user;
        const { title, diagramData, thumbnail, description, tags } = req.body;

        // Extract metadata from diagramData
        const metadata = diagramData.metadata || diagramData.diagramProperties || {};

        const result = await pool.query(
            `INSERT INTO community_maps (
                user_id, title, author, author_email, author_organization,
                diagram_data, thumbnail, status, description,
                wdr, scope_geographic, scope_economic, scope_user_defined, period, diagram_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9, $10, $11, $12, $13, $14)
            RETURNING id, title, status, last_edited_at, submitted_at, created_at`,
            [
                userId,
                title,
                metadata.author || email,
                email,
                metadata.organization || req.user.organization,
                JSON.stringify(diagramData),
                thumbnail,
                description,
                metadata.wdr,
                metadata.scopeGeographic || metadata.scope?.geographic,
                metadata.scopeEconomic || metadata.scope?.economic,
                metadata.scopeUserDefined || metadata.scope?.userDefined,
                metadata.period || 'present',
                metadata.date || metadata.diagramDate
            ]
        );

        // Add tags if provided
        if (tags && Array.isArray(tags) && tags.length > 0) {
            for (const tag of tags) {
                await pool.query(
                    'INSERT INTO community_map_tags (map_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [result.rows[0].id, tag.toLowerCase().trim()]
                );
            }
        }

        logger.info(`Draft created: ${result.rows[0].id} by user ${userId}`);

        res.status(201).json({
            success: true,
            draft: result.rows[0]
        });
    } catch (error) {
        logger.error('Error creating draft:', error);
        res.status(500).json({ success: false, message: 'Failed to create draft', error: error.message });
    }
});

/**
 * GET /api/drafts
 * List user's draft maps (owned + shared)
 */
router.get('/', async (req, res) => {
    try {
        const { userId } = req.user;

        const result = await pool.query(
            'SELECT * FROM get_user_draft_maps($1)',
            [userId]
        );

        res.json({
            success: true,
            drafts: result.rows
        });
    } catch (error) {
        logger.error('Error fetching drafts:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch drafts', error: error.message });
    }
});

/**
 * GET /api/drafts/:id
 * Get specific draft with full diagram data
 */
router.get('/:id', [
    param('id').isUUID().withMessage('Invalid draft ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { userId } = req.user;
        const { id } = req.params;

        // Check permission (viewer access required)
        const permissionResult = await pool.query(
            'SELECT check_draft_permission($1, $2, $3) as allowed',
            [id, userId, 'viewer']
        );

        if (!permissionResult.rows[0].allowed) {
            return res.status(403).json({ success: false, message: 'Access denied to this draft' });
        }

        // Get draft
        const result = await pool.query(
            `SELECT cm.id, cm.user_id, cm.title, cm.author, cm.author_email, cm.author_organization,
                    cm.diagram_data, cm.thumbnail, cm.status, cm.description,
                    cm.wdr, cm.scope_geographic, cm.scope_economic, cm.scope_user_defined,
                    cm.period, cm.diagram_date,
                    cm.last_edited_at, cm.submitted_at, cm.created_at,
                    (cm.user_id = $2) as is_owner
             FROM community_maps cm
             WHERE cm.id = $1 AND cm.deleted_at IS NULL`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Draft not found' });
        }

        // Get tags
        const tagsResult = await pool.query(
            'SELECT tag FROM community_map_tags WHERE map_id = $1',
            [id]
        );

        const draft = {
            ...result.rows[0],
            tags: tagsResult.rows.map(t => t.tag)
        };

        res.json({
            success: true,
            draft: draft
        });
    } catch (error) {
        logger.error('Error fetching draft:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch draft', error: error.message });
    }
});

/**
 * PUT /api/drafts/:id
 * Update draft (primary endpoint for auto-save)
 */
router.put('/:id', [
    param('id').isUUID().withMessage('Invalid draft ID'),
    body('diagramData').optional().isObject(),
    body('title').optional().trim().isLength({ max: 500 }),
    body('thumbnail').optional().isString(),
    body('changesSummary').optional().isObject()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { userId } = req.user;
        const { id } = req.params;
        const { title, diagramData, thumbnail, changesSummary, description } = req.body;

        // Check permission (editor access required)
        const permissionResult = await pool.query(
            'SELECT check_draft_permission($1, $2, $3) as allowed',
            [id, userId, 'editor']
        );

        if (!permissionResult.rows[0].allowed) {
            return res.status(403).json({ success: false, message: 'No permission to edit this draft' });
        }

        // Build dynamic update query
        const updates = [];
        const values = [id];
        let paramCounter = 2;

        if (title !== undefined) {
            updates.push(`title = $${paramCounter}`);
            values.push(title);
            paramCounter++;
        }

        if (diagramData !== undefined) {
            updates.push(`diagram_data = $${paramCounter}`);
            values.push(JSON.stringify(diagramData));
            paramCounter++;
        }

        if (thumbnail !== undefined) {
            updates.push(`thumbnail = $${paramCounter}`);
            values.push(thumbnail);
            paramCounter++;
        }

        if (description !== undefined) {
            updates.push(`description = $${paramCounter}`);
            values.push(description);
            paramCounter++;
        }

        updates.push('last_edited_at = CURRENT_TIMESTAMP');

        if (updates.length === 1) {
            // Only timestamp update, nothing else changed
            return res.json({
                success: true,
                message: 'No changes to save',
                draft: { id, last_edited_at: new Date() }
            });
        }

        // Update draft
        const result = await pool.query(
            `UPDATE community_maps
             SET ${updates.join(', ')}
             WHERE id = $1 AND deleted_at IS NULL AND status = 'draft'
             RETURNING id, title, last_edited_at`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Draft not found or already submitted' });
        }

        // Record auto-save for audit trail
        await pool.query(
            `INSERT INTO map_auto_saves (map_id, user_id, changes_summary)
             VALUES ($1, $2, $3)`,
            [id, userId, changesSummary ? JSON.stringify(changesSummary) : null]
        );

        logger.debug(`Draft updated: ${id} by user ${userId}`);

        res.json({
            success: true,
            draft: result.rows[0],
            savedAt: result.rows[0].last_edited_at
        });
    } catch (error) {
        logger.error('Error updating draft:', error);
        res.status(500).json({ success: false, message: 'Failed to update draft', error: error.message });
    }
});

/**
 * DELETE /api/drafts/:id
 * Delete draft (soft delete, owner only)
 */
router.delete('/:id', [
    param('id').isUUID().withMessage('Invalid draft ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { userId } = req.user;
        const { id } = req.params;

        // Check permission (owner only)
        const permissionResult = await pool.query(
            'SELECT check_draft_permission($1, $2, $3) as allowed',
            [id, userId, 'owner']
        );

        if (!permissionResult.rows[0].allowed) {
            return res.status(403).json({ success: false, message: 'Only the owner can delete this draft' });
        }

        // Soft delete
        const result = await pool.query(
            `UPDATE community_maps
             SET deleted_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status = 'draft'
             RETURNING id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Draft not found' });
        }

        logger.info(`Draft deleted: ${id} by user ${userId}`);

        res.json({
            success: true,
            message: 'Draft deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting draft:', error);
        res.status(500).json({ success: false, message: 'Failed to delete draft', error: error.message });
    }
});

/**
 * POST /api/drafts/:id/submit
 * Submit draft for admin review (changes status from draft to pending)
 */
router.post('/:id/submit', [
    param('id').isUUID().withMessage('Invalid draft ID'),
    body('description').optional().trim(),
    body('tags').optional().isArray()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { userId } = req.user;
        const { id } = req.params;
        const { description, tags } = req.body;

        // Check permission (owner only)
        const permissionResult = await pool.query(
            'SELECT check_draft_permission($1, $2, $3) as allowed',
            [id, userId, 'owner']
        );

        if (!permissionResult.rows[0].allowed) {
            return res.status(403).json({ success: false, message: 'Only the owner can submit this draft' });
        }

        // Validate that draft has required fields
        const draftCheck = await pool.query(
            'SELECT title, diagram_data FROM community_maps WHERE id = $1',
            [id]
        );

        if (draftCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Draft not found' });
        }

        const draft = draftCheck.rows[0];
        if (!draft.title || !draft.diagram_data) {
            return res.status(400).json({
                success: false,
                message: 'Draft must have a title and diagram data before submission'
            });
        }

        // Update status to pending
        const result = await pool.query(
            `UPDATE community_maps
             SET status = 'pending',
                 submitted_at = CURRENT_TIMESTAMP,
                 description = COALESCE($1, description)
             WHERE id = $2 AND status = 'draft' AND deleted_at IS NULL
             RETURNING id, title, submitted_at, status`,
            [description, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Draft not found or already submitted' });
        }

        // Update tags if provided
        if (tags && Array.isArray(tags) && tags.length > 0) {
            // Remove existing tags
            await pool.query('DELETE FROM community_map_tags WHERE map_id = $1', [id]);

            // Add new tags
            for (const tag of tags) {
                await pool.query(
                    'INSERT INTO community_map_tags (map_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [id, tag.toLowerCase().trim()]
                );
            }
        }

        logger.info(`Draft submitted for review: ${id} by user ${userId}`);

        res.json({
            success: true,
            message: 'Draft submitted for review',
            submission: result.rows[0]
        });
    } catch (error) {
        logger.error('Error submitting draft:', error);
        res.status(500).json({ success: false, message: 'Failed to submit draft', error: error.message });
    }
});

// ============================================================================
// COLLABORATION MANAGEMENT
// ============================================================================

/**
 * GET /api/drafts/:id/collaborators
 * Get list of collaborators for a draft
 */
router.get('/:id/collaborators', [
    param('id').isUUID().withMessage('Invalid draft ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { userId } = req.user;
        const { id } = req.params;

        // Check permission (viewer access required)
        const permissionResult = await pool.query(
            'SELECT check_draft_permission($1, $2, $3) as allowed',
            [id, userId, 'viewer']
        );

        if (!permissionResult.rows[0].allowed) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Get owner info
        const ownerResult = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.organization, 'owner' as permission
             FROM community_maps cm
             JOIN users u ON cm.user_id = u.id
             WHERE cm.id = $1`,
            [id]
        );

        // Get collaborators
        const collabResult = await pool.query(
            `SELECT dc.id, dc.user_id, dc.permission, dc.invited_at, dc.accepted_at,
                    u.full_name, u.email, u.organization
             FROM draft_collaborators dc
             JOIN users u ON dc.user_id = u.id
             WHERE dc.map_id = $1
             ORDER BY dc.invited_at DESC`,
            [id]
        );

        res.json({
            success: true,
            owner: ownerResult.rows[0] || null,
            collaborators: collabResult.rows
        });
    } catch (error) {
        logger.error('Error fetching collaborators:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch collaborators', error: error.message });
    }
});

/**
 * POST /api/drafts/:id/collaborators
 * Add collaborator to draft
 */
router.post('/:id/collaborators', [
    param('id').isUUID().withMessage('Invalid draft ID'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('permission').isIn(['editor', 'viewer']).withMessage('Permission must be editor or viewer')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { userId } = req.user;
        const { id } = req.params;
        const { email, permission } = req.body;

        // Check permission (owner only)
        const permissionResult = await pool.query(
            'SELECT check_draft_permission($1, $2, $3) as allowed',
            [id, userId, 'owner']
        );

        if (!permissionResult.rows[0].allowed) {
            return res.status(403).json({ success: false, message: 'Only the owner can add collaborators' });
        }

        // Find user by email
        const userResult = await pool.query(
            'SELECT id, email, full_name, organization FROM users WHERE email = $1 AND is_active = TRUE',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found with that email' });
        }

        const collaboratorUserId = userResult.rows[0].id;

        // Don't allow adding the owner as collaborator
        const ownerCheck = await pool.query(
            'SELECT 1 FROM community_maps WHERE id = $1 AND user_id = $2',
            [id, collaboratorUserId]
        );

        if (ownerCheck.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Cannot add the owner as a collaborator' });
        }

        // Check if already a collaborator
        const existingResult = await pool.query(
            'SELECT 1 FROM draft_collaborators WHERE map_id = $1 AND user_id = $2',
            [id, collaboratorUserId]
        );

        if (existingResult.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'User is already a collaborator' });
        }

        // Add collaborator (auto-accepted for now)
        const result = await pool.query(
            `INSERT INTO draft_collaborators (map_id, user_id, permission, invited_by, accepted_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
             RETURNING id, map_id, user_id, permission, invited_at, accepted_at`,
            [id, collaboratorUserId, permission, userId]
        );

        logger.info(`Collaborator added to draft ${id}: ${collaboratorUserId} with ${permission} permission`);

        res.status(201).json({
            success: true,
            collaborator: {
                ...result.rows[0],
                user: userResult.rows[0]
            }
        });
    } catch (error) {
        logger.error('Error adding collaborator:', error);
        res.status(500).json({ success: false, message: 'Failed to add collaborator', error: error.message });
    }
});

/**
 * DELETE /api/drafts/:id/collaborators/:collaboratorId
 * Remove collaborator from draft
 */
router.delete('/:id/collaborators/:collaboratorId', [
    param('id').isUUID().withMessage('Invalid draft ID'),
    param('collaboratorId').isUUID().withMessage('Invalid collaborator ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { userId } = req.user;
        const { id, collaboratorId } = req.params;

        // Get collaborator info
        const collaboratorResult = await pool.query(
            'SELECT user_id FROM draft_collaborators WHERE id = $1 AND map_id = $2',
            [collaboratorId, id]
        );

        if (collaboratorResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Collaborator not found' });
        }

        const collaboratorUserId = collaboratorResult.rows[0].user_id;

        // Check permission (owner can remove anyone, users can remove themselves)
        const permissionResult = await pool.query(
            'SELECT check_draft_permission($1, $2, $3) as allowed',
            [id, userId, 'owner']
        );

        const isOwner = permissionResult.rows[0].allowed;
        const isSelf = collaboratorUserId === userId;

        if (!isOwner && !isSelf) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Remove collaborator
        await pool.query(
            'DELETE FROM draft_collaborators WHERE id = $1 AND map_id = $2',
            [collaboratorId, id]
        );

        logger.info(`Collaborator removed from draft ${id}: ${collaboratorId}`);

        res.json({
            success: true,
            message: 'Collaborator removed successfully'
        });
    } catch (error) {
        logger.error('Error removing collaborator:', error);
        res.status(500).json({ success: false, message: 'Failed to remove collaborator', error: error.message });
    }
});

/**
 * PUT /api/drafts/:id/collaborators/:collaboratorId
 * Update collaborator permission
 */
router.put('/:id/collaborators/:collaboratorId', [
    param('id').isUUID().withMessage('Invalid draft ID'),
    param('collaboratorId').isUUID().withMessage('Invalid collaborator ID'),
    body('permission').isIn(['editor', 'viewer']).withMessage('Permission must be editor or viewer')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { userId } = req.user;
        const { id, collaboratorId } = req.params;
        const { permission } = req.body;

        // Check permission (owner only)
        const permissionResult = await pool.query(
            'SELECT check_draft_permission($1, $2, $3) as allowed',
            [id, userId, 'owner']
        );

        if (!permissionResult.rows[0].allowed) {
            return res.status(403).json({ success: false, message: 'Only the owner can update permissions' });
        }

        // Update permission
        const result = await pool.query(
            `UPDATE draft_collaborators
             SET permission = $1
             WHERE id = $2 AND map_id = $3
             RETURNING id, user_id, permission, invited_at, accepted_at`,
            [permission, collaboratorId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Collaborator not found' });
        }

        logger.info(`Collaborator permission updated: ${collaboratorId} to ${permission}`);

        res.json({
            success: true,
            collaborator: result.rows[0]
        });
    } catch (error) {
        logger.error('Error updating collaborator:', error);
        res.status(500).json({ success: false, message: 'Failed to update collaborator', error: error.message });
    }
});

module.exports = router;
