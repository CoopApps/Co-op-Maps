const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { asyncHandler } = require('../middleware/errorHandler');
const { optionalAuth } = require('../middleware/auth');
const {
    validateRequest,
    uuidParam,
    pagination,
    search
} = require('../middleware/validation');

/**
 * GET /api/public/diagrams
 * Get all public diagrams with search and filtering
 */
router.get('/diagrams', [
    ...pagination,
    ...search
], validateRequest, asyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const offset = (page - 1) * limit;
    const searchQuery = req.query.q;
    const isTemplate = req.query.is_template;

    let sql = `
        SELECT d.id, d.title, d.author, d.wdr, d.scope_geographic,
               d.scope_economic, d.canvas_size, d.connector_style,
               d.view_count, d.fork_count, d.created_at, d.updated_at,
               d.is_template, d.template_category,
               u.full_name as owner_name, u.organization as owner_organization,
               COUNT(e.id) as enterprise_count
        FROM diagrams d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN enterprises e ON d.id = e.diagram_id
        WHERE d.is_public = TRUE
          AND d.deleted_at IS NULL
    `;

    const params = [];
    let paramCount = 1;

    // Search filter
    if (searchQuery) {
        sql += ` AND d.search_vector @@ plainto_tsquery('english', $${paramCount})`;
        params.push(searchQuery);
        paramCount++;
    }

    // Template filter
    if (isTemplate !== undefined) {
        sql += ` AND d.is_template = $${paramCount}`;
        params.push(isTemplate === 'true');
        paramCount++;
    }

    sql += ' GROUP BY d.id, u.full_name, u.organization';
    sql += ' ORDER BY d.view_count DESC, d.updated_at DESC';
    sql += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get total count
    let countSql = `
        SELECT COUNT(DISTINCT d.id) as count
        FROM diagrams d
        WHERE d.is_public = TRUE AND d.deleted_at IS NULL
    `;
    const countParams = [];
    let countParamCount = 1;

    if (searchQuery) {
        countSql += ` AND d.search_vector @@ plainto_tsquery('english', $${countParamCount})`;
        countParams.push(searchQuery);
        countParamCount++;
    }

    if (isTemplate !== undefined) {
        countSql += ` AND d.is_template = $${countParamCount}`;
        countParams.push(isTemplate === 'true');
    }

    const countResult = await query(countSql, countParams);

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
 * GET /api/public/diagrams/:id
 * Get a public diagram by ID
 */
router.get('/diagrams/:id', [
    optionalAuth,
    ...uuidParam()
], validateRequest, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get diagram
    const diagramResult = await query(
        `SELECT d.*, u.full_name as owner_name, u.organization as owner_organization
         FROM diagrams d
         JOIN users u ON d.user_id = u.id
         WHERE d.id = $1 AND d.is_public = TRUE AND d.deleted_at IS NULL`,
        [id]
    );

    if (diagramResult.rows.length === 0) {
        return res.status(404).json({ error: 'Diagram not found or not public' });
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
        .catch(err => require('../utils/logger').error('Failed to increment view count:', err));

    res.json({
        diagram: diagramResult.rows[0],
        enterprises: enterprisesResult.rows,
        relationships: relationshipsResult.rows
    });
}));

/**
 * GET /api/public/templates
 * Get all template diagrams
 */
router.get('/templates', pagination, validateRequest, asyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const offset = (page - 1) * limit;
    const category = req.query.category;

    let sql = `
        SELECT d.id, d.title, d.author, d.template_category,
               d.view_count, d.fork_count, d.created_at,
               u.full_name as owner_name,
               COUNT(e.id) as enterprise_count
        FROM diagrams d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN enterprises e ON d.id = e.diagram_id
        WHERE d.is_template = TRUE
          AND d.is_public = TRUE
          AND d.deleted_at IS NULL
    `;

    const params = [];
    let paramCount = 1;

    if (category) {
        sql += ` AND d.template_category = $${paramCount}`;
        params.push(category);
        paramCount++;
    }

    sql += ' GROUP BY d.id, u.full_name';
    sql += ' ORDER BY d.view_count DESC';
    sql += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get total count
    let countSql = `
        SELECT COUNT(*) as count
        FROM diagrams
        WHERE is_template = TRUE AND is_public = TRUE AND deleted_at IS NULL
    `;
    const countParams = [];

    if (category) {
        countSql += ' AND template_category = $1';
        countParams.push(category);
    }

    const countResult = await query(countSql, countParams);

    res.json({
        templates: result.rows,
        pagination: {
            page,
            limit,
            total: parseInt(countResult.rows[0].count),
            totalPages: Math.ceil(countResult.rows[0].count / limit)
        }
    });
}));

/**
 * GET /api/public/template-categories
 * Get all template categories
 */
router.get('/template-categories', asyncHandler(async (req, res) => {
    const result = await query(
        `SELECT template_category as category, COUNT(*) as count
         FROM diagrams
         WHERE is_template = TRUE
           AND is_public = TRUE
           AND deleted_at IS NULL
           AND template_category IS NOT NULL
         GROUP BY template_category
         ORDER BY count DESC`
    );

    res.json({
        categories: result.rows
    });
}));

/**
 * GET /api/public/popular
 * Get popular diagrams (most viewed/forked)
 */
router.get('/popular', pagination, validateRequest, asyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const offset = (page - 1) * limit;
    const timeframe = req.query.timeframe || 'all'; // all, week, month

    let dateFilter = '';
    if (timeframe === 'week') {
        dateFilter = "AND d.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'";
    } else if (timeframe === 'month') {
        dateFilter = "AND d.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'";
    }

    const sql = `
        SELECT d.id, d.title, d.author, d.view_count, d.fork_count,
               d.created_at, d.updated_at,
               u.full_name as owner_name,
               COUNT(e.id) as enterprise_count,
               (d.view_count * 2 + d.fork_count * 5) as popularity_score
        FROM diagrams d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN enterprises e ON d.id = e.diagram_id
        WHERE d.is_public = TRUE
          AND d.deleted_at IS NULL
          ${dateFilter}
        GROUP BY d.id, u.full_name
        ORDER BY popularity_score DESC, d.updated_at DESC
        LIMIT $1 OFFSET $2
    `;

    const result = await query(sql, [limit, offset]);

    // Get total count
    const countSql = `
        SELECT COUNT(*) as count
        FROM diagrams d
        WHERE d.is_public = TRUE AND d.deleted_at IS NULL ${dateFilter}
    `;

    const countResult = await query(countSql);

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
 * GET /api/public/recent
 * Get recently created public diagrams
 */
router.get('/recent', pagination, validateRequest, asyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const offset = (page - 1) * limit;

    const result = await query(
        `SELECT d.id, d.title, d.author, d.view_count, d.fork_count,
                d.created_at, d.updated_at,
                u.full_name as owner_name,
                COUNT(e.id) as enterprise_count
         FROM diagrams d
         JOIN users u ON d.user_id = u.id
         LEFT JOIN enterprises e ON d.id = e.diagram_id
         WHERE d.is_public = TRUE
           AND d.deleted_at IS NULL
         GROUP BY d.id, u.full_name
         ORDER BY d.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
    );

    const countResult = await query(
        'SELECT COUNT(*) as count FROM diagrams WHERE is_public = TRUE AND deleted_at IS NULL'
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
 * GET /api/public/users/:userId/diagrams
 * Get public diagrams by a specific user
 */
router.get('/users/:userId/diagrams', [
    ...uuidParam('userId'),
    ...pagination
], validateRequest, asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const offset = (page - 1) * limit;

    const result = await query(
        `SELECT d.id, d.title, d.author, d.view_count, d.fork_count,
                d.created_at, d.updated_at,
                u.full_name as owner_name, u.organization as owner_organization,
                COUNT(e.id) as enterprise_count
         FROM diagrams d
         JOIN users u ON d.user_id = u.id
         LEFT JOIN enterprises e ON d.id = e.diagram_id
         WHERE d.user_id = $1
           AND d.is_public = TRUE
           AND d.deleted_at IS NULL
         GROUP BY d.id, u.full_name, u.organization
         ORDER BY d.updated_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );

    const countResult = await query(
        'SELECT COUNT(*) as count FROM diagrams WHERE user_id = $1 AND is_public = TRUE AND deleted_at IS NULL',
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
 * GET /api/public/stats
 * Get overall platform statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
    // Total public diagrams
    const diagramsResult = await query(
        'SELECT COUNT(*) as count FROM diagrams WHERE is_public = TRUE AND deleted_at IS NULL'
    );

    // Total templates
    const templatesResult = await query(
        'SELECT COUNT(*) as count FROM diagrams WHERE is_template = TRUE AND is_public = TRUE AND deleted_at IS NULL'
    );

    // Total users (active with public diagrams)
    const usersResult = await query(
        `SELECT COUNT(DISTINCT user_id) as count
         FROM diagrams
         WHERE is_public = TRUE AND deleted_at IS NULL`
    );

    // Total enterprises in public diagrams
    const enterprisesResult = await query(
        `SELECT COUNT(e.id) as count
         FROM enterprises e
         JOIN diagrams d ON e.diagram_id = d.id
         WHERE d.is_public = TRUE AND d.deleted_at IS NULL`
    );

    // Total relationships in public diagrams
    const relationshipsResult = await query(
        `SELECT COUNT(r.id) as count
         FROM relationships r
         JOIN diagrams d ON r.diagram_id = d.id
         WHERE d.is_public = TRUE AND d.deleted_at IS NULL`
    );

    res.json({
        stats: {
            total_public_diagrams: parseInt(diagramsResult.rows[0].count),
            total_templates: parseInt(templatesResult.rows[0].count),
            total_contributors: parseInt(usersResult.rows[0].count),
            total_enterprises: parseInt(enterprisesResult.rows[0].count),
            total_relationships: parseInt(relationshipsResult.rows[0].count)
        }
    });
}));

module.exports = router;
