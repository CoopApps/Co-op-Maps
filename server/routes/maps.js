/**
 * Community Maps Routes
 * Handles community-submitted maps with password protection
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, param, query, validationResult } = require('express-validator');
const { pool } = require('../db/connection');
const logger = require('../utils/logger');
const { sendMapSubmissionReceivedEmail } = require('../services/emailService');

// ============================================================
// VALIDATION MIDDLEWARE
// ============================================================

const validateMapSubmission = [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('author').trim().notEmpty().withMessage('Author name is required'),
    body('authorEmail').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 4 }).withMessage('Password must be at least 4 characters'),
    body('diagramData').notEmpty().withMessage('Diagram data is required'),
    body('diagramData.enterprises').isArray().withMessage('Enterprises must be an array'),
    body('diagramData.relationships').isArray().withMessage('Relationships must be an array')
];

const validateMapPassword = (req, res, next) => {
    const password = req.headers['x-map-password'];
    if (!password) {
        return res.status(401).json({
            success: false,
            message: 'Map password is required'
        });
    }
    req.mapPassword = password;
    next();
};

// ============================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================

/**
 * GET /api/maps/approved
 * Get all approved and published maps for public gallery
 */
router.get('/approved', [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('search').optional().trim(),
    query('tags').optional()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const limit = req.query.limit || 50;
        const offset = req.query.offset || 0;
        const search = req.query.search;
        const tags = req.query.tags ? req.query.tags.split(',') : null;

        let queryText = `
            SELECT
                id, title, author, author_organization,
                description,
                wdr, official_wdr, wdr_status,
                scope_geographic, scope_economic,
                scope_user_defined, period, diagram_date,
                thumbnail, is_featured, view_count, fork_count,
                published_at,
                COALESCE(jsonb_array_length(diagram_data->'timeline'), 0) as snapshot_count,
                CASE
                    WHEN jsonb_array_length(diagram_data->'timeline') > 0
                    THEN (
                        SELECT jsonb_agg(jsonb_build_object(
                            'date', elem->>'date',
                            'label', elem->>'label'
                        ))
                        FROM jsonb_array_elements(diagram_data->'timeline') elem
                    )
                    ELSE NULL
                END as timeline_summary,
                ARRAY(
                    SELECT tag FROM community_map_tags WHERE map_id = community_maps.id
                ) as tags
            FROM community_maps
            WHERE is_public = TRUE
              AND status = 'published'
              AND deleted_at IS NULL
        `;

        const queryParams = [];
        let paramIndex = 1;

        // Add search filter
        if (search) {
            queryText += ` AND search_vector @@ plainto_tsquery('english', $${paramIndex})`;
            queryParams.push(search);
            paramIndex++;
        }

        // Add tag filter
        if (tags && tags.length > 0) {
            queryText += ` AND id IN (
                SELECT map_id FROM community_map_tags
                WHERE tag = ANY($${paramIndex})
                GROUP BY map_id
                HAVING COUNT(DISTINCT tag) = $${paramIndex + 1}
            )`;
            queryParams.push(tags);
            paramIndex++;
            queryParams.push(tags.length);
            paramIndex++;
        }

        queryText += ` ORDER BY is_featured DESC, published_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(limit, offset);

        const result = await pool.query(queryText, queryParams);

        // Get total count
        let countQuery = `
            SELECT COUNT(*) as total
            FROM community_maps
            WHERE is_public = TRUE AND status = 'published' AND deleted_at IS NULL
        `;
        const countParams = [];
        if (search) {
            countQuery += ` AND search_vector @@ plainto_tsquery('english', $1)`;
            countParams.push(search);
        }
        const countResult = await pool.query(countQuery, countParams);

        res.json({
            success: true,
            maps: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit,
                offset,
                hasMore: offset + result.rows.length < parseInt(countResult.rows[0].total)
            }
        });
    } catch (error) {
        logger.error('Error fetching approved maps:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch maps'
        });
    }
});

/**
 * GET /api/maps/:id
 * Get a specific map by ID (public maps only, or with valid password)
 */
router.get('/:id', [
    param('id').isUUID().withMessage('Invalid map ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id } = req.params;
        const password = req.headers['x-map-password'];

        const result = await pool.query(
            `SELECT * FROM community_maps WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Map not found'
            });
        }

        const map = result.rows[0];

        // Check if map is public
        if (map.is_public && map.status === 'published') {
            // Increment view count
            await pool.query(
                `UPDATE community_maps SET view_count = view_count + 1 WHERE id = $1`,
                [id]
            );

            return res.json({
                success: true,
                map: {
                    id: map.id,
                    title: map.title,
                    author: map.author,
                    authorOrganization: map.author_organization,
                    wdr: map.wdr,
                    scopeGeographic: map.scope_geographic,
                    scopeEconomic: map.scope_economic,
                    scopeUserDefined: map.scope_user_defined,
                    period: map.period,
                    diagramDate: map.diagram_date,
                    diagramData: map.diagram_data,
                    thumbnail: map.thumbnail,
                    isFeatured: map.is_featured,
                    viewCount: map.view_count + 1,
                    forkCount: map.fork_count,
                    publishedAt: map.published_at
                }
            });
        }

        // Map is not public - require password
        if (!password) {
            return res.status(401).json({
                success: false,
                message: 'Password required',
                requiresPassword: true
            });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, map.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid password'
            });
        }

        // Password correct - return full map data
        res.json({
            success: true,
            map: {
                id: map.id,
                title: map.title,
                author: map.author,
                authorEmail: map.author_email,
                authorOrganization: map.author_organization,
                wdr: map.wdr,
                scopeGeographic: map.scope_geographic,
                scopeEconomic: map.scope_economic,
                scopeUserDefined: map.scope_user_defined,
                period: map.period,
                diagramDate: map.diagram_date,
                diagramData: map.diagram_data,
                thumbnail: map.thumbnail,
                status: map.status,
                submittedAt: map.submitted_at,
                lastEditedAt: map.last_edited_at
            }
        });
    } catch (error) {
        logger.error('Error fetching map:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch map'
        });
    }
});

/**
 * POST /api/maps/submit
 * Submit a new map to the community gallery
 */
router.post('/submit', validateMapSubmission, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const {
            title,
            author,
            authorEmail,
            authorOrganization,
            password,
            diagramData,
            thumbnail,
            wdr,
            scopeGeographic,
            scopeEconomic,
            scopeUserDefined,
            period,
            diagramDate,
            tags,
            notifyOnApproval = true
        } = req.body;

        // Hash the password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert map
        const result = await pool.query(
            `INSERT INTO community_maps (
                title, author, author_email, author_organization,
                password_hash, diagram_data, thumbnail,
                wdr, scope_geographic, scope_economic,
                scope_user_defined, period, diagram_date,
                status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending')
            RETURNING id, submitted_at`,
            [
                title, author, authorEmail, authorOrganization,
                passwordHash, JSON.stringify(diagramData), thumbnail,
                wdr, scopeGeographic, scopeEconomic,
                scopeUserDefined, period, diagramDate
            ]
        );

        const mapId = result.rows[0].id;

        // Add tags if provided
        if (tags && Array.isArray(tags) && tags.length > 0) {
            const tagValues = tags.map((tag, index) =>
                `($1, $${index + 2})`
            ).join(', ');

            await pool.query(
                `INSERT INTO community_map_tags (map_id, tag) VALUES ${tagValues}`,
                [mapId, ...tags]
            );
        }

        // Add notification preferences
        if (notifyOnApproval) {
            await pool.query(
                `INSERT INTO map_author_notifications (map_id, email, notify_on_approval, notify_on_changes_requested, notify_on_rejection)
                VALUES ($1, $2, $3, $3, $3)`,
                [mapId, authorEmail, notifyOnApproval]
            );
        }

        logger.info(`New map submitted: ${mapId} by ${author} (${authorEmail})`);

        // Send confirmation email to author
        try {
            await sendMapSubmissionReceivedEmail({
                id: mapId,
                title,
                author,
                author_email: authorEmail
            });
            logger.info(`Submission confirmation email queued for map: ${mapId}`);
        } catch (emailError) {
            logger.error('Failed to queue submission confirmation email:', emailError);
        }

        res.status(201).json({
            success: true,
            message: 'Map submitted successfully and is pending review',
            mapId: mapId,
            submittedAt: result.rows[0].submitted_at
        });
    } catch (error) {
        logger.error('Error submitting map:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit map'
        });
    }
});

/**
 * PUT /api/maps/:id/edit
 * Edit an existing map (requires password)
 */
router.put('/:id/edit', [
    param('id').isUUID().withMessage('Invalid map ID'),
    validateMapPassword,
    body('diagramData').notEmpty().withMessage('Diagram data is required'),
    body('thumbnail').optional()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id } = req.params;
        const { diagramData, thumbnail } = req.body;
        const password = req.mapPassword;

        // Get map and verify password
        const mapResult = await pool.query(
            `SELECT password_hash, status FROM community_maps WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );

        if (mapResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Map not found'
            });
        }

        const map = mapResult.rows[0];

        // Verify password
        const passwordMatch = await bcrypt.compare(password, map.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid password'
            });
        }

        // Update map
        const updateResult = await pool.query(
            `UPDATE community_maps
            SET diagram_data = $1, thumbnail = $2, last_edited_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING last_edited_at`,
            [JSON.stringify(diagramData), thumbnail, id]
        );

        logger.info(`Map edited: ${id}`);

        res.json({
            success: true,
            message: 'Map updated successfully',
            lastEditedAt: updateResult.rows[0].last_edited_at
        });
    } catch (error) {
        logger.error('Error editing map:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update map'
        });
    }
});

/**
 * GET /api/maps/:id/verify-password
 * Verify map password without returning map data
 */
router.get('/:id/verify-password', [
    param('id').isUUID().withMessage('Invalid map ID'),
    validateMapPassword
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id } = req.params;
        const password = req.mapPassword;

        const result = await pool.query(
            `SELECT password_hash FROM community_maps WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Map not found'
            });
        }

        const passwordMatch = await bcrypt.compare(password, result.rows[0].password_hash);

        if (passwordMatch) {
            res.json({
                success: true,
                message: 'Password verified'
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid password'
            });
        }
    } catch (error) {
        logger.error('Error verifying password:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify password'
        });
    }
});

module.exports = router;
