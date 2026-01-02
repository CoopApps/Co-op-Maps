const express = require('express');
const router = express.Router();
const { query, transaction } = require('../db/connection');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const crypto = require('crypto');

/**
 * POST /api/maps/submit
 * Submit a map for consideration to the community gallery
 */
router.post('/submit', asyncHandler(async (req, res) => {
    const {
        title,
        author,
        email,
        description,
        tags,
        thumbnail,
        diagramData
    } = req.body;

    // Validation
    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Title is required' });
    }
    if (!author || !author.trim()) {
        return res.status(400).json({ error: 'Author is required' });
    }
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email is required' });
    }
    if (!diagramData || !diagramData.enterprises || diagramData.enterprises.length === 0) {
        return res.status(400).json({ error: 'Map must contain at least one enterprise' });
    }

    // Generate unique ID for the submission
    const submissionId = crypto.randomUUID();
    const mapId = crypto.randomUUID();

    try {
        // Insert into community_maps table
        await query(
            `INSERT INTO community_maps (
                id, title, author, email, description, tags,
                thumbnail, diagram_data, status, submitted_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
            [
                mapId,
                title.trim(),
                author.trim(),
                email.trim().toLowerCase(),
                description || '',
                JSON.stringify(tags || []),
                thumbnail || null,
                JSON.stringify(diagramData),
                'pending'
            ]
        );

        logger.info(`New map submitted: ${mapId} by ${author} (${email})`);

        res.status(201).json({
            success: true,
            message: 'Map submitted successfully for review',
            mapId: mapId,
            submissionId: submissionId
        });

    } catch (error) {
        // If table doesn't exist, create it and try again
        if (error.code === '42P01') { // Table doesn't exist
            await query(`
                CREATE TABLE IF NOT EXISTS community_maps (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    title VARCHAR(255) NOT NULL,
                    author VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    organization VARCHAR(255),
                    description TEXT,
                    tags JSONB DEFAULT '[]',
                    thumbnail TEXT,
                    diagram_data JSONB NOT NULL,
                    status VARCHAR(50) DEFAULT 'pending',
                    admin_notes TEXT,
                    view_count INTEGER DEFAULT 0,
                    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    reviewed_at TIMESTAMP,
                    published_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_community_maps_status ON community_maps(status);
                CREATE INDEX IF NOT EXISTS idx_community_maps_email ON community_maps(email);
            `);

            // Retry insert
            await query(
                `INSERT INTO community_maps (
                    id, title, author, email, description, tags,
                    thumbnail, diagram_data, status, submitted_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
                [
                    mapId,
                    title.trim(),
                    author.trim(),
                    email.trim().toLowerCase(),
                    description || '',
                    JSON.stringify(tags || []),
                    thumbnail || null,
                    JSON.stringify(diagramData),
                    'pending'
                ]
            );

            logger.info(`New map submitted (after table creation): ${mapId} by ${author}`);

            return res.status(201).json({
                success: true,
                message: 'Map submitted successfully for review',
                mapId: mapId,
                submissionId: submissionId
            });
        }

        throw error;
    }
}));

/**
 * GET /api/maps/approved
 * Get all approved maps for the community gallery
 */
router.get('/approved', asyncHandler(async (req, res) => {
    const { limit = 50, offset = 0, search, tags } = req.query;

    try {
        let sql = `
            SELECT
                id,
                title,
                author,
                organization,
                description,
                tags,
                thumbnail,
                view_count,
                published_at
            FROM community_maps
            WHERE status = 'approved'
        `;
        const params = [];
        let paramCount = 1;

        // Search filter
        if (search) {
            sql += ` AND (
                title ILIKE $${paramCount} OR
                author ILIKE $${paramCount} OR
                description ILIKE $${paramCount}
            )`;
            params.push(`%${search}%`);
            paramCount++;
        }

        // Tags filter
        if (tags) {
            const tagList = tags.split(',').map(t => t.trim());
            sql += ` AND tags ?| $${paramCount}`;
            params.push(tagList);
            paramCount++;
        }

        sql += ` ORDER BY published_at DESC NULLS LAST, submitted_at DESC`;
        sql += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await query(sql, params);

        // Parse tags JSON and transform for frontend
        const maps = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            author: row.author,
            organization: row.organization,
            description: row.description,
            tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
            thumbnail: row.thumbnail,
            view_count: row.view_count || 0,
            published_at: row.published_at
        }));

        res.json({
            maps: maps,
            count: maps.length
        });

    } catch (error) {
        // If table doesn't exist, return empty array
        if (error.code === '42P01') {
            return res.json({ maps: [], count: 0 });
        }
        throw error;
    }
}));

/**
 * GET /api/maps/:id
 * Get a specific map by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const result = await query(
            `SELECT
                id, title, author, organization, description, tags,
                thumbnail, diagram_data, view_count, published_at
            FROM community_maps
            WHERE id = $1 AND status = 'approved'`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Map not found' });
        }

        const map = result.rows[0];

        // Increment view count (async)
        query('UPDATE community_maps SET view_count = view_count + 1 WHERE id = $1', [id])
            .catch(err => logger.error('Failed to increment view count:', err));

        res.json({
            map: {
                id: map.id,
                title: map.title,
                author: map.author,
                organization: map.organization,
                description: map.description,
                tags: typeof map.tags === 'string' ? JSON.parse(map.tags) : (map.tags || []),
                thumbnail: map.thumbnail,
                diagramData: typeof map.diagram_data === 'string' ? JSON.parse(map.diagram_data) : map.diagram_data,
                view_count: map.view_count,
                published_at: map.published_at
            }
        });

    } catch (error) {
        if (error.code === '42P01') {
            return res.status(404).json({ error: 'Map not found' });
        }
        throw error;
    }
}));

/**
 * Admin Routes (protected by admin password header)
 */

// Middleware to verify admin password
const verifyAdmin = (req, res, next) => {
    const adminPassword = req.headers['x-admin-password'];
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (!adminPassword || adminPassword !== expectedPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

/**
 * GET /api/maps/admin/submissions
 * Get all pending submissions (admin only)
 */
router.get('/admin/submissions', verifyAdmin, asyncHandler(async (req, res) => {
    const { status = 'pending', limit = 50, offset = 0 } = req.query;

    try {
        const result = await query(
            `SELECT
                id, title, author, email, organization, description,
                tags, thumbnail, status, admin_notes,
                submitted_at, reviewed_at, published_at
            FROM community_maps
            WHERE status = $1
            ORDER BY submitted_at DESC
            LIMIT $2 OFFSET $3`,
            [status, parseInt(limit), parseInt(offset)]
        );

        // Get counts by status
        const statsResult = await query(`
            SELECT status, COUNT(*) as count
            FROM community_maps
            GROUP BY status
        `);

        const stats = {};
        statsResult.rows.forEach(row => {
            stats[row.status] = parseInt(row.count);
        });

        res.json({
            submissions: result.rows,
            stats: stats
        });

    } catch (error) {
        if (error.code === '42P01') {
            return res.json({ submissions: [], stats: {} });
        }
        throw error;
    }
}));

/**
 * GET /api/maps/admin/submissions/:id
 * Get a specific submission with full data (admin only)
 */
router.get('/admin/submissions/:id', verifyAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await query(
        `SELECT * FROM community_maps WHERE id = $1`,
        [id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Submission not found' });
    }

    res.json({ submission: result.rows[0] });
}));

/**
 * POST /api/maps/admin/submissions/:id/approve
 * Approve a submission (admin only)
 */
router.post('/admin/submissions/:id/approve', verifyAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const result = await query(
        `UPDATE community_maps
        SET status = 'approved',
            admin_notes = $2,
            reviewed_at = CURRENT_TIMESTAMP,
            published_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *`,
        [id, adminNotes || null]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Submission not found' });
    }

    logger.info(`Map approved: ${id}`);

    res.json({
        success: true,
        message: 'Map approved and published',
        map: result.rows[0]
    });
}));

/**
 * POST /api/maps/admin/submissions/:id/reject
 * Reject a submission (admin only)
 */
router.post('/admin/submissions/:id/reject', verifyAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason, adminNotes } = req.body;

    const result = await query(
        `UPDATE community_maps
        SET status = 'rejected',
            admin_notes = $2,
            reviewed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *`,
        [id, adminNotes || reason || null]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Submission not found' });
    }

    logger.info(`Map rejected: ${id}`);

    res.json({
        success: true,
        message: 'Map rejected',
        map: result.rows[0]
    });
}));

/**
 * GET /api/maps/admin/stats
 * Get dashboard statistics (admin only)
 */
router.get('/admin/stats', verifyAdmin, asyncHandler(async (req, res) => {
    try {
        const result = await query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'approved') as approved,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
                COUNT(*) as total,
                SUM(view_count) as total_views
            FROM community_maps
        `);

        res.json({
            stats: {
                pending: parseInt(result.rows[0].pending) || 0,
                approved: parseInt(result.rows[0].approved) || 0,
                rejected: parseInt(result.rows[0].rejected) || 0,
                total: parseInt(result.rows[0].total) || 0,
                totalViews: parseInt(result.rows[0].total_views) || 0
            }
        });

    } catch (error) {
        if (error.code === '42P01') {
            return res.json({
                stats: { pending: 0, approved: 0, rejected: 0, total: 0, totalViews: 0 }
            });
        }
        throw error;
    }
}));

module.exports = router;
