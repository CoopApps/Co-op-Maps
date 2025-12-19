const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const {
    validateRequest,
    uuidParam,
    addCollaborator,
    updateCollaborator
} = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/diagrams/:diagramId/collaborators
 * Get all collaborators for a diagram
 */
router.get('/:diagramId/collaborators', uuidParam('diagramId'), validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { diagramId } = req.params;

    // Check permission (must be owner or collaborator)
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [diagramId, userId, 'view']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
        `SELECT dc.id, dc.user_id, dc.permission, dc.invited_at, dc.accepted_at,
                dc.last_accessed_at, u.full_name, u.email, u.organization,
                inviter.full_name as invited_by_name
         FROM diagram_collaborators dc
         JOIN users u ON dc.user_id = u.id
         LEFT JOIN users inviter ON dc.invited_by = inviter.id
         WHERE dc.diagram_id = $1
         ORDER BY dc.invited_at DESC`,
        [diagramId]
    );

    res.json({
        collaborators: result.rows
    });
}));

/**
 * POST /api/diagrams/:diagramId/collaborators
 * Add a collaborator to a diagram
 */
router.post('/:diagramId/collaborators', [
    ...uuidParam('diagramId'),
    ...addCollaborator
], validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { diagramId } = req.params;
    const { user_id, permission } = req.body;

    // Check permission (must be admin)
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [diagramId, userId, 'admin']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Only diagram owners can add collaborators' });
    }

    // Check if diagram exists
    const diagramResult = await query(
        'SELECT id FROM diagrams WHERE id = $1 AND deleted_at IS NULL',
        [diagramId]
    );

    if (diagramResult.rows.length === 0) {
        return res.status(404).json({ error: 'Diagram not found' });
    }

    // Check if user exists
    const userResult = await query(
        'SELECT id, email, full_name FROM users WHERE id = $1 AND is_active = TRUE',
        [user_id]
    );

    if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is the owner
    const ownerResult = await query(
        'SELECT user_id FROM diagrams WHERE id = $1',
        [diagramId]
    );

    if (ownerResult.rows[0].user_id === user_id) {
        return res.status(400).json({ error: 'Cannot add owner as collaborator' });
    }

    // Check if already a collaborator
    const existingResult = await query(
        'SELECT id FROM diagram_collaborators WHERE diagram_id = $1 AND user_id = $2',
        [diagramId, user_id]
    );

    if (existingResult.rows.length > 0) {
        return res.status(409).json({ error: 'User is already a collaborator' });
    }

    // Add collaborator (auto-accepted for now)
    const result = await query(
        `INSERT INTO diagram_collaborators (diagram_id, user_id, permission, invited_by, accepted_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         RETURNING *`,
        [diagramId, user_id, permission, userId]
    );

    logger.info(`Collaborator added to diagram ${diagramId}: ${user_id} with ${permission} permission`);

    // TODO: Send email notification to invited user

    res.status(201).json({
        collaborator: result.rows[0],
        invited_user: userResult.rows[0]
    });
}));

/**
 * PUT /api/diagrams/:diagramId/collaborators/:collaboratorId
 * Update collaborator permissions
 */
router.put('/:diagramId/collaborators/:collaboratorId', [
    ...uuidParam('diagramId'),
    ...uuidParam('collaboratorId'),
    ...updateCollaborator
], validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { diagramId, collaboratorId } = req.params;
    const { permission } = req.body;

    // Check permission (must be admin)
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [diagramId, userId, 'admin']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Only diagram owners can update permissions' });
    }

    // Update permission
    const result = await query(
        `UPDATE diagram_collaborators
         SET permission = $1
         WHERE id = $2 AND diagram_id = $3
         RETURNING *`,
        [permission, collaboratorId, diagramId]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Collaborator not found' });
    }

    logger.info(`Collaborator permission updated: ${collaboratorId} to ${permission}`);

    res.json({
        collaborator: result.rows[0]
    });
}));

/**
 * DELETE /api/diagrams/:diagramId/collaborators/:collaboratorId
 * Remove a collaborator from a diagram
 */
router.delete('/:diagramId/collaborators/:collaboratorId', [
    ...uuidParam('diagramId'),
    ...uuidParam('collaboratorId')
], validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { diagramId, collaboratorId } = req.params;

    // Check permission (must be admin OR the collaborator themselves)
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [diagramId, userId, 'admin']
    );

    // Get collaborator info
    const collaboratorResult = await query(
        'SELECT user_id FROM diagram_collaborators WHERE id = $1 AND diagram_id = $2',
        [collaboratorId, diagramId]
    );

    if (collaboratorResult.rows.length === 0) {
        return res.status(404).json({ error: 'Collaborator not found' });
    }

    const isOwnCollaboration = collaboratorResult.rows[0].user_id === userId;

    if (!hasPermission.rows[0].allowed && !isOwnCollaboration) {
        return res.status(403).json({ error: 'Access denied' });
    }

    // Remove collaborator
    await query(
        'DELETE FROM diagram_collaborators WHERE id = $1 AND diagram_id = $2',
        [collaboratorId, diagramId]
    );

    logger.info(`Collaborator removed from diagram ${diagramId}: ${collaboratorId}`);

    res.json({
        message: 'Collaborator removed successfully'
    });
}));

/**
 * POST /api/diagrams/:diagramId/collaborators/:collaboratorId/accept
 * Accept a collaboration invitation (for future use with invitations)
 */
router.post('/:diagramId/collaborators/:collaboratorId/accept', [
    ...uuidParam('diagramId'),
    ...uuidParam('collaboratorId')
], validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { diagramId, collaboratorId } = req.params;

    // Check if this collaboration is for the current user
    const collaboratorResult = await query(
        'SELECT user_id, accepted_at FROM diagram_collaborators WHERE id = $1 AND diagram_id = $2',
        [collaboratorId, diagramId]
    );

    if (collaboratorResult.rows.length === 0) {
        return res.status(404).json({ error: 'Collaboration invitation not found' });
    }

    if (collaboratorResult.rows[0].user_id !== userId) {
        return res.status(403).json({ error: 'This invitation is not for you' });
    }

    if (collaboratorResult.rows[0].accepted_at) {
        return res.status(400).json({ error: 'Invitation already accepted' });
    }

    // Accept invitation
    const result = await query(
        `UPDATE diagram_collaborators
         SET accepted_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [collaboratorId]
    );

    logger.info(`Collaboration accepted: ${collaboratorId} by user ${userId}`);

    res.json({
        collaborator: result.rows[0],
        message: 'Collaboration accepted successfully'
    });
}));

/**
 * GET /api/collaborators/invitations
 * Get pending collaboration invitations for current user
 */
router.get('/invitations', asyncHandler(async (req, res) => {
    const { userId } = req.user;

    const result = await query(
        `SELECT dc.id, dc.diagram_id, dc.permission, dc.invited_at,
                d.title as diagram_title, d.author as diagram_author,
                inviter.full_name as invited_by_name, inviter.email as invited_by_email
         FROM diagram_collaborators dc
         JOIN diagrams d ON dc.diagram_id = d.id
         LEFT JOIN users inviter ON dc.invited_by = inviter.id
         WHERE dc.user_id = $1
           AND dc.accepted_at IS NULL
           AND d.deleted_at IS NULL
         ORDER BY dc.invited_at DESC`,
        [userId]
    );

    res.json({
        invitations: result.rows
    });
}));

/**
 * GET /api/collaborators/shared-with-me
 * Get all diagrams shared with current user
 */
router.get('/shared-with-me', asyncHandler(async (req, res) => {
    const { userId } = req.user;

    const result = await query(
        `SELECT d.id, d.title, d.author, d.updated_at, d.is_public,
                dc.permission, dc.accepted_at, dc.last_accessed_at,
                owner.full_name as owner_name, owner.email as owner_email
         FROM diagram_collaborators dc
         JOIN diagrams d ON dc.diagram_id = d.id
         JOIN users owner ON d.user_id = owner.id
         WHERE dc.user_id = $1
           AND dc.accepted_at IS NOT NULL
           AND d.deleted_at IS NULL
         ORDER BY d.updated_at DESC`,
        [userId]
    );

    res.json({
        diagrams: result.rows
    });
}));

/**
 * PUT /api/diagrams/:diagramId/collaborators/:collaboratorId/access
 * Update last accessed time for a collaborator
 */
router.put('/:diagramId/collaborators/:collaboratorId/access', [
    ...uuidParam('diagramId'),
    ...uuidParam('collaboratorId')
], validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { diagramId, collaboratorId } = req.params;

    // Verify the collaboration belongs to the current user
    const result = await query(
        `UPDATE diagram_collaborators
         SET last_accessed_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND diagram_id = $2 AND user_id = $3
         RETURNING *`,
        [collaboratorId, diagramId, userId]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Collaboration not found' });
    }

    res.json({
        collaborator: result.rows[0]
    });
}));

module.exports = router;
