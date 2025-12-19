const express = require('express');
const router = express.Router();
const { query, transaction } = require('../db/connection');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const {
    validateRequest,
    uuidParam,
    pagination,
    createDiagram,
    updateDiagram
} = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/diagrams
 * List all diagrams accessible by the user (owned + shared)
 */
router.get('/', pagination, validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const offset = (page - 1) * limit;

    // Get diagrams using the database function
    const result = await query(
        'SELECT * FROM get_user_diagrams($1) LIMIT $2 OFFSET $3',
        [userId, limit, offset]
    );

    // Get total count
    const countResult = await query(
        'SELECT COUNT(*) FROM get_user_diagrams($1)',
        [userId]
    );

    res.json({
        diagrams: result.rows,
        pagination: {
            page,
            limit,
            total: parseInt(countResult.rows[0].count),
            totalPages: Math.ceil(countResult.rows[0].count / limit)
        }
    });
}));

/**
 * POST /api/diagrams
 * Create a new diagram
 */
router.post('/', createDiagram, validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const {
        title,
        author,
        wdr,
        scope_geographic,
        scope_economic,
        scope_user_defined,
        period,
        diagram_date,
        canvas_size,
        connector_style,
        is_public,
        enterprises,
        relationships
    } = req.body;

    // Use transaction to create diagram with all related data
    const result = await transaction(async (client) => {
        // Create diagram
        const diagramResult = await client.query(
            `INSERT INTO diagrams (
                user_id, title, author, wdr, scope_geographic, scope_economic,
                scope_user_defined, period, diagram_date, canvas_size,
                connector_style, is_public
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [
                userId, title || 'Untitled Diagram', author, wdr,
                scope_geographic, scope_economic, scope_user_defined,
                period || 'present', diagram_date, canvas_size || 'A4',
                connector_style || 'orthogonal', is_public || false
            ]
        );

        const diagram = diagramResult.rows[0];

        // Create enterprises if provided
        if (enterprises && enterprises.length > 0) {
            for (const ent of enterprises) {
                await client.query(
                    `INSERT INTO enterprises (
                        diagram_id, enterprise_id, type, name, x, y, width, height,
                        fill, stroke, roles, tier, is_generic_set, z_index
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
                    [
                        diagram.id, ent.enterprise_id, ent.type, ent.name,
                        ent.x, ent.y, ent.width, ent.height, ent.fill, ent.stroke,
                        JSON.stringify(ent.roles || []), ent.tier,
                        ent.is_generic_set || false, ent.z_index || 0
                    ]
                );
            }
        }

        // Create relationships if provided
        if (relationships && relationships.length > 0) {
            for (const rel of relationships) {
                await client.query(
                    `INSERT INTO relationships (
                        diagram_id, relationship_id, start_enterprise_id,
                        end_enterprise_id, type, start_segmentation, end_segmentation
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        diagram.id, rel.relationship_id, rel.start_enterprise_id,
                        rel.end_enterprise_id, rel.type,
                        rel.start_segmentation || 'individual',
                        rel.end_segmentation || 'individual'
                    ]
                );
            }
        }

        // Create initial version
        await client.query(
            `INSERT INTO diagram_versions (
                diagram_id, version_number, data, enterprises, relationships,
                created_by, change_description
            ) VALUES ($1, 1, $2, $3, $4, $5, $6)`,
            [
                diagram.id,
                JSON.stringify(diagram),
                JSON.stringify(enterprises || []),
                JSON.stringify(relationships || []),
                userId,
                'Initial version'
            ]
        );

        return diagram;
    });

    logger.info(`Diagram created: ${result.id} by user ${userId}`);

    res.status(201).json({
        diagram: result
    });
}));

/**
 * GET /api/diagrams/:id
 * Get a specific diagram with all its data
 */
router.get('/:id', uuidParam(), validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;

    // Check permission
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [id, userId, 'view']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Access denied' });
    }

    // Get diagram
    const diagramResult = await query(
        'SELECT * FROM diagrams WHERE id = $1 AND deleted_at IS NULL',
        [id]
    );

    if (diagramResult.rows.length === 0) {
        return res.status(404).json({ error: 'Diagram not found' });
    }

    // Get enterprises
    const enterprisesResult = await query(
        'SELECT * FROM enterprises WHERE diagram_id = $1 ORDER BY z_index, created_at',
        [id]
    );

    // Get relationships
    const relationshipsResult = await query(
        'SELECT * FROM relationships WHERE diagram_id = $1 ORDER BY created_at',
        [id]
    );

    // Increment view count (async, don't wait)
    query('UPDATE diagrams SET view_count = view_count + 1 WHERE id = $1', [id])
        .catch(err => logger.error('Failed to increment view count:', err));

    res.json({
        diagram: diagramResult.rows[0],
        enterprises: enterprisesResult.rows,
        relationships: relationshipsResult.rows
    });
}));

/**
 * PUT /api/diagrams/:id
 * Update a diagram
 */
router.put('/:id', [
    ...uuidParam(),
    ...updateDiagram
], validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;

    // Check permission
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [id, userId, 'edit']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Access denied' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
        'title', 'author', 'wdr', 'scope_geographic', 'scope_economic',
        'scope_user_defined', 'period', 'diagram_date', 'canvas_size',
        'connector_style', 'is_public'
    ];

    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            updates.push(`${field} = $${paramCount}`);
            values.push(req.body[field]);
            paramCount++;
        }
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await query(
        `UPDATE diagrams SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${paramCount} AND deleted_at IS NULL
         RETURNING *`,
        values
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Diagram not found' });
    }

    logger.info(`Diagram updated: ${id} by user ${userId}`);

    res.json({
        diagram: result.rows[0]
    });
}));

/**
 * DELETE /api/diagrams/:id
 * Soft delete a diagram
 */
router.delete('/:id', uuidParam(), validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;

    // Check permission (only owner/admin can delete)
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [id, userId, 'admin']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Access denied' });
    }

    // Soft delete
    const result = await query(
        `UPDATE diagrams SET deleted_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Diagram not found' });
    }

    logger.info(`Diagram deleted: ${id} by user ${userId}`);

    res.json({
        message: 'Diagram deleted successfully'
    });
}));

/**
 * POST /api/diagrams/:id/duplicate
 * Duplicate a diagram
 */
router.post('/:id/duplicate', uuidParam(), validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;

    // Check permission
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [id, userId, 'view']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Access denied' });
    }

    // Duplicate using transaction
    const newDiagram = await transaction(async (client) => {
        // Get original diagram
        const originalResult = await client.query(
            'SELECT * FROM diagrams WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );

        if (originalResult.rows.length === 0) {
            throw new Error('Diagram not found');
        }

        const original = originalResult.rows[0];

        // Create new diagram
        const newDiagramResult = await client.query(
            `INSERT INTO diagrams (
                user_id, title, author, wdr, scope_geographic, scope_economic,
                scope_user_defined, period, diagram_date, canvas_size,
                connector_style, is_public, forked_from
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [
                userId,
                `${original.title} (Copy)`,
                original.author,
                original.wdr,
                original.scope_geographic,
                original.scope_economic,
                original.scope_user_defined,
                original.period,
                original.diagram_date,
                original.canvas_size,
                original.connector_style,
                false, // New diagrams are private by default
                id
            ]
        );

        const newDiagram = newDiagramResult.rows[0];

        // Copy enterprises
        await client.query(
            `INSERT INTO enterprises (
                diagram_id, enterprise_id, type, name, x, y, width, height,
                fill, stroke, roles, tier, is_generic_set, z_index
            )
            SELECT $1, enterprise_id, type, name, x, y, width, height,
                   fill, stroke, roles, tier, is_generic_set, z_index
            FROM enterprises WHERE diagram_id = $2`,
            [newDiagram.id, id]
        );

        // Copy relationships
        await client.query(
            `INSERT INTO relationships (
                diagram_id, relationship_id, start_enterprise_id,
                end_enterprise_id, type, start_segmentation, end_segmentation
            )
            SELECT $1, relationship_id, start_enterprise_id, end_enterprise_id,
                   type, start_segmentation, end_segmentation
            FROM relationships WHERE diagram_id = $2`,
            [newDiagram.id, id]
        );

        // Increment fork count on original
        await client.query(
            'UPDATE diagrams SET fork_count = fork_count + 1 WHERE id = $1',
            [id]
        );

        return newDiagram;
    });

    logger.info(`Diagram duplicated: ${id} -> ${newDiagram.id} by user ${userId}`);

    res.status(201).json({
        diagram: newDiagram
    });
}));

/**
 * POST /api/diagrams/:id/enterprises
 * Add an enterprise to a diagram
 */
router.post('/:id/enterprises', uuidParam(), validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;

    // Check permission
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [id, userId, 'edit']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Access denied' });
    }

    const {
        enterprise_id, type, name, x, y, width, height,
        fill, stroke, roles, tier, is_generic_set, z_index
    } = req.body;

    const result = await query(
        `INSERT INTO enterprises (
            diagram_id, enterprise_id, type, name, x, y, width, height,
            fill, stroke, roles, tier, is_generic_set, z_index
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
            id, enterprise_id, type, name, x, y, width, height,
            fill, stroke, JSON.stringify(roles || []), tier,
            is_generic_set || false, z_index || 0
        ]
    );

    // Update diagram timestamp
    await query(
        'UPDATE diagrams SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
    );

    res.status(201).json({
        enterprise: result.rows[0]
    });
}));

/**
 * PUT /api/diagrams/:id/enterprises/:enterpriseId
 * Update an enterprise
 */
router.put('/:id/enterprises/:enterpriseId', uuidParam(), validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { id, enterpriseId } = req.params;

    // Check permission
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [id, userId, 'edit']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Access denied' });
    }

    // Build dynamic update
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
        'type', 'name', 'x', 'y', 'width', 'height',
        'fill', 'stroke', 'tier', 'is_generic_set', 'z_index'
    ];

    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            updates.push(`${field} = $${paramCount}`);
            values.push(field === 'roles' ? JSON.stringify(req.body[field]) : req.body[field]);
            paramCount++;
        }
    }

    if (req.body.roles !== undefined) {
        updates.push(`roles = $${paramCount}`);
        values.push(JSON.stringify(req.body.roles));
        paramCount++;
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id, enterpriseId);

    const result = await query(
        `UPDATE enterprises SET ${updates.join(', ')}
         WHERE diagram_id = $${paramCount} AND enterprise_id = $${paramCount + 1}
         RETURNING *`,
        values
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Enterprise not found' });
    }

    // Update diagram timestamp
    await query(
        'UPDATE diagrams SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
    );

    res.json({
        enterprise: result.rows[0]
    });
}));

/**
 * DELETE /api/diagrams/:id/enterprises/:enterpriseId
 * Delete an enterprise
 */
router.delete('/:id/enterprises/:enterpriseId', uuidParam(), validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { id, enterpriseId } = req.params;

    // Check permission
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [id, userId, 'edit']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
        'DELETE FROM enterprises WHERE diagram_id = $1 AND enterprise_id = $2 RETURNING id',
        [id, enterpriseId]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Enterprise not found' });
    }

    // Update diagram timestamp
    await query(
        'UPDATE diagrams SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
    );

    res.json({
        message: 'Enterprise deleted successfully'
    });
}));

/**
 * POST /api/diagrams/:id/relationships
 * Add a relationship to a diagram
 */
router.post('/:id/relationships', uuidParam(), validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;

    // Check permission
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [id, userId, 'edit']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Access denied' });
    }

    const {
        relationship_id, start_enterprise_id, end_enterprise_id,
        type, start_segmentation, end_segmentation
    } = req.body;

    const result = await query(
        `INSERT INTO relationships (
            diagram_id, relationship_id, start_enterprise_id, end_enterprise_id,
            type, start_segmentation, end_segmentation
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
            id, relationship_id, start_enterprise_id, end_enterprise_id,
            type, start_segmentation || 'individual', end_segmentation || 'individual'
        ]
    );

    // Update diagram timestamp
    await query(
        'UPDATE diagrams SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
    );

    res.status(201).json({
        relationship: result.rows[0]
    });
}));

/**
 * DELETE /api/diagrams/:id/relationships/:relationshipId
 * Delete a relationship
 */
router.delete('/:id/relationships/:relationshipId', uuidParam(), validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { id, relationshipId } = req.params;

    // Check permission
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [id, userId, 'edit']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
        'DELETE FROM relationships WHERE diagram_id = $1 AND relationship_id = $2 RETURNING id',
        [id, relationshipId]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Relationship not found' });
    }

    // Update diagram timestamp
    await query(
        'UPDATE diagrams SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
    );

    res.json({
        message: 'Relationship deleted successfully'
    });
}));

/**
 * GET /api/diagrams/:id/versions
 * Get version history for a diagram
 */
router.get('/:id/versions', [
    ...uuidParam(),
    ...pagination
], validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const offset = (page - 1) * limit;

    // Check permission
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [id, userId, 'view']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
        `SELECT dv.*, u.full_name as created_by_name, u.email as created_by_email
         FROM diagram_versions dv
         LEFT JOIN users u ON dv.created_by = u.id
         WHERE dv.diagram_id = $1
         ORDER BY dv.version_number DESC
         LIMIT $2 OFFSET $3`,
        [id, limit, offset]
    );

    const countResult = await query(
        'SELECT COUNT(*) FROM diagram_versions WHERE diagram_id = $1',
        [id]
    );

    res.json({
        versions: result.rows,
        pagination: {
            page,
            limit,
            total: parseInt(countResult.rows[0].count),
            totalPages: Math.ceil(countResult.rows[0].count / limit)
        }
    });
}));

/**
 * POST /api/diagrams/:id/versions
 * Create a new version snapshot
 */
router.post('/:id/versions', uuidParam(), validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;
    const { change_description } = req.body;

    // Check permission
    const hasPermission = await query(
        'SELECT check_diagram_permission($1, $2, $3) as allowed',
        [id, userId, 'edit']
    );

    if (!hasPermission.rows[0].allowed) {
        return res.status(403).json({ error: 'Access denied' });
    }

    // Get current data
    const diagramResult = await query(
        'SELECT * FROM diagrams WHERE id = $1',
        [id]
    );

    const enterprisesResult = await query(
        'SELECT * FROM enterprises WHERE diagram_id = $1',
        [id]
    );

    const relationshipsResult = await query(
        'SELECT * FROM relationships WHERE diagram_id = $1',
        [id]
    );

    // Get next version number
    const versionResult = await query(
        'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM diagram_versions WHERE diagram_id = $1',
        [id]
    );

    const nextVersion = versionResult.rows[0].next_version;

    // Create version
    const result = await query(
        `INSERT INTO diagram_versions (
            diagram_id, version_number, data, enterprises, relationships,
            created_by, change_description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
            id,
            nextVersion,
            JSON.stringify(diagramResult.rows[0]),
            JSON.stringify(enterprisesResult.rows),
            JSON.stringify(relationshipsResult.rows),
            userId,
            change_description
        ]
    );

    logger.info(`Version created: ${id} v${nextVersion} by user ${userId}`);

    res.status(201).json({
        version: result.rows[0]
    });
}));

module.exports = router;
