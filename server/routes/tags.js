const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/tags
 * Get all tags (public endpoint)
 */
router.get('/', asyncHandler(async (req, res) => {
    const { limit = 100, search } = req.query;

    let sql = 'SELECT * FROM tags';
    const params = [];

    if (search) {
        sql += ' WHERE name ILIKE $1';
        params.push(`%${search}%`);
    }

    sql += ' ORDER BY usage_count DESC, name ASC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await query(sql, params);

    res.json({ tags: result.rows });
}));

/**
 * POST /api/tags
 * Create a new tag (authenticated)
 */
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { name, description, color } = req.body;

    if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Tag name is required' });
    }

    // Check if tag already exists
    const existing = await query(
        'SELECT id FROM tags WHERE name = $1',
        [name.toLowerCase().trim()]
    );

    if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Tag already exists', tag: existing.rows[0] });
    }

    const result = await query(
        `INSERT INTO tags (name, description, color, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name.toLowerCase().trim(), description, color, userId]
    );

    res.status(201).json({ tag: result.rows[0] });
}));

/**
 * POST /api/diagrams/:diagramId/tags
 * Add tag to diagram
 */
router.post('/:diagramId/tags', authenticateToken, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { diagramId } = req.params;
    const { tagId, tagName } = req.body;

    // Check permission
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [diagramId, userId, 'edit']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Access denied' });
    }

    let finalTagId = tagId;

    // If tag name provided instead of ID, find or create tag
    if (tagName && !tagId) {
        const tagResult = await query(
            'SELECT id FROM tags WHERE name = $1',
            [tagName.toLowerCase().trim()]
        );

        if (tagResult.rows.length > 0) {
            finalTagId = tagResult.rows[0].id;
        } else {
            const newTag = await query(
                'INSERT INTO tags (name, created_by) VALUES ($1, $2) RETURNING id',
                [tagName.toLowerCase().trim(), userId]
            );
            finalTagId = newTag.rows[0].id;
        }
    }

    // Add tag to diagram
    try {
        await query(
            'INSERT INTO diagram_tags (diagram_id, tag_id) VALUES ($1, $2)',
            [diagramId, finalTagId]
        );
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Tag already added to diagram' });
        }
        throw error;
    }

    res.status(201).json({ message: 'Tag added to diagram' });
}));

/**
 * DELETE /api/diagrams/:diagramId/tags/:tagId
 * Remove tag from diagram
 */
router.delete('/:diagramId/tags/:tagId', authenticateToken, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { diagramId, tagId } = req.params;

    // Check permission
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [diagramId, userId, 'edit']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
        'DELETE FROM diagram_tags WHERE diagram_id = $1 AND tag_id = $2',
        [diagramId, tagId]
    );

    if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Tag not found on diagram' });
    }

    res.json({ message: 'Tag removed from diagram' });
}));

/**
 * GET /api/diagrams/:diagramId/tags
 * Get tags for a specific diagram
 */
router.get('/:diagramId/tags', asyncHandler(async (req, res) => {
    const { diagramId } = req.params;

    const result = await query(
        `SELECT t.* FROM tags t
         JOIN diagram_tags dt ON t.id = dt.tag_id
         WHERE dt.diagram_id = $1
         ORDER BY t.name`,
        [diagramId]
    );

    res.json({ tags: result.rows });
}));

module.exports = router;
