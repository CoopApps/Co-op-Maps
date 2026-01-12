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

// Helper to compare passwords - supports both plain text and legacy bcrypt hashes
async function comparePassword(inputPassword, storedPassword) {
    if (!storedPassword) return false;
    // Check if it's a bcrypt hash (starts with $2a$ or $2b$)
    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
        return await bcrypt.compare(inputPassword, storedPassword);
    }
    // Plain text comparison
    return inputPassword === storedPassword;
}

// ============================================================
// VALIDATION MIDDLEWARE
// ============================================================

const validateMapSubmission = [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('author').trim().notEmpty().withMessage('Author name is required'),
    body('authorEmail').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Valid email is required if provided'),
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
                    officialWdr: map.official_wdr,
                    wdrStatus: map.wdr_status,
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
        const passwordMatch = await comparePassword(password, map.password_hash);
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
                officialWdr: map.official_wdr,
                wdrStatus: map.wdr_status,
                scopeGeographic: map.scope_geographic,
                scopeEconomic: map.scope_economic,
                scopeUserDefined: map.scope_user_defined,
                period: map.period,
                diagramDate: map.diagram_date,
                diagramData: map.diagram_data,
                thumbnail: map.thumbnail,
                status: map.status,
                isPublic: map.is_public,
                submittedAt: map.submitted_at,
                lastEditedAt: map.last_edited_at,
                publishedAt: map.published_at
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
        const passwordMatch = await comparePassword(password, map.password_hash);
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

        const passwordMatch = await comparePassword(password, result.rows[0].password_hash);

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

/**
 * POST /api/maps/save
 * Save a map as draft (not submitted for review yet)
 */
router.post('/save', [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('password').isLength({ min: 4 }).withMessage('Password must be at least 4 characters'),
    body('diagramData').notEmpty().withMessage('Diagram data is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const {
            title,
            password,
            diagramData,
            thumbnail
        } = req.body;

        // Store password as plain text (so admins can help users who forget it)
        // Insert map as draft
        const result = await pool.query(
            `INSERT INTO community_maps (
                title, password_hash, diagram_data, thumbnail, status, author, author_email, author_organization
            ) VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7)
            RETURNING id, created_at`,
            [
                title,
                password,
                JSON.stringify(diagramData),
                thumbnail,
                diagramData?.metadata?.author || 'Anonymous',
                diagramData?.metadata?.authorEmail || null,
                diagramData?.metadata?.organization || null
            ]
        );

        const mapId = result.rows[0].id;

        logger.info(`New draft map saved: ${mapId}`);

        res.status(201).json({
            success: true,
            message: 'Map saved as draft',
            mapId: mapId,
            createdAt: result.rows[0].created_at
        });
    } catch (error) {
        logger.error('Error saving draft map:', error);
        logger.error('Error details:', error.message, error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to save map: ' + error.message
        });
    }
});

/**
 * PUT /api/maps/:id/save
 * Update an existing draft map (requires password)
 */
router.put('/:id/save', [
    param('id').isUUID().withMessage('Invalid map ID'),
    validateMapPassword,
    body('diagramData').notEmpty().withMessage('Diagram data is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id } = req.params;
        const { title, diagramData, thumbnail } = req.body;
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
        const passwordMatch = await comparePassword(password, map.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid password'
            });
        }

        // Update map
        const updateResult = await pool.query(
            `UPDATE community_maps
            SET title = COALESCE($1, title), diagram_data = $2, thumbnail = $3, last_edited_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING last_edited_at`,
            [title, JSON.stringify(diagramData), thumbnail, id]
        );

        logger.info(`Draft map updated: ${id}`);

        res.json({
            success: true,
            message: 'Map saved',
            lastEditedAt: updateResult.rows[0].last_edited_at
        });
    } catch (error) {
        logger.error('Error updating draft map:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save map'
        });
    }
});

/**
 * POST /api/maps/my-maps
 * Get all maps for a given author and password
 */
router.post('/my-maps', [
    body('author').notEmpty().withMessage('Author is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { author, password } = req.body;

        // Get maps matching the author (case-insensitive)
        const result = await pool.query(
            `SELECT id, title, password_hash, status, thumbnail, created_at, last_edited_at
            FROM community_maps
            WHERE deleted_at IS NULL AND LOWER(author) = LOWER($1)
            ORDER BY last_edited_at DESC NULLS LAST, created_at DESC`,
            [author]
        );

        // Filter maps where password also matches
        const myMaps = [];
        for (const map of result.rows) {
            const passwordMatch = await comparePassword(password, map.password_hash);
            if (passwordMatch) {
                myMaps.push({
                    id: map.id,
                    title: map.title,
                    status: map.status,
                    thumbnail: map.thumbnail,
                    createdAt: map.created_at,
                    lastEditedAt: map.last_edited_at
                });
            }
        }

        res.json({
            success: true,
            maps: myMaps
        });
    } catch (error) {
        logger.error('Error fetching my maps:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch maps'
        });
    }
});

/**
 * GET /api/maps/by-wdr/:wdr
 * Get a map by its official WDR code (for loading approved maps to edit)
 * Get a map by its official WDR code (for loading approved maps to edit)
 */
router.get('/by-wdr/:wdr', [
    param('wdr').matches(/^WDR-\d{4}$/).withMessage('Invalid WDR format (must be WDR-0000)')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { wdr } = req.params;

        // Get the current revision of this WDR
        const result = await pool.query(
            `SELECT
                id, title, author, author_organization,
                official_wdr, wdr_status, revision_number,
                scope_geographic, scope_economic,
                scope_user_defined, period, diagram_date,
                diagram_data, thumbnail,
                is_current_revision, hide_original,
                published_at
            FROM community_maps
            WHERE official_wdr = $1
              AND is_current_revision = TRUE
              AND is_public = TRUE
              AND deleted_at IS NULL
              AND (hide_original IS NULL OR hide_original = FALSE)`,
            [wdr]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No published map found with this WDR code'
            });
        }

        const map = result.rows[0];

        // Increment view count
        await pool.query(
            `UPDATE community_maps SET view_count = view_count + 1 WHERE id = $1`,
            [map.id]
        );

        res.json({
            success: true,
            map: {
                id: map.id,
                title: map.title,
                author: map.author,
                authorOrganization: map.author_organization,
                officialWdr: map.official_wdr,
                wdrStatus: map.wdr_status,
                revisionNumber: map.revision_number,
                scopeGeographic: map.scope_geographic,
                scopeEconomic: map.scope_economic,
                scopeUserDefined: map.scope_user_defined,
                period: map.period,
                diagramDate: map.diagram_date,
                diagramData: map.diagram_data,
                thumbnail: map.thumbnail,
                publishedAt: map.published_at
            }
        });
    } catch (error) {
        logger.error('Error fetching map by WDR:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch map'
        });
    }
});

/**
 * POST /api/maps/:id/submit-revision
 * Submit a revision to an existing approved map
 */
router.post('/:id/submit-revision', [
    param('id').isUUID().withMessage('Invalid map ID'),
    body('author').trim().notEmpty().withMessage('Author name is required'),
    body('authorEmail').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 4 }).withMessage('Password must be at least 4 characters'),
    body('diagramData').notEmpty().withMessage('Diagram data is required'),
    body('changeDescription').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id } = req.params;
        const {
            author,
            authorEmail,
            authorOrganization,
            password,
            diagramData,
            thumbnail,
            changeDescription
        } = req.body;

        // Verify the parent map exists and is approved
        const parentResult = await pool.query(
            `SELECT id, title, official_wdr, status
            FROM community_maps
            WHERE id = $1
              AND status IN ('approved', 'published')
              AND deleted_at IS NULL`,
            [id]
        );

        if (parentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Original map not found or not approved'
            });
        }

        const parent = parentResult.rows[0];

        // Hash the password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create the revision
        const result = await pool.query(
            `INSERT INTO community_maps (
                title, author, author_email, author_organization,
                password_hash, diagram_data, thumbnail,
                parent_map_id, revision_number, is_current_revision,
                status, wdr, official_wdr
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, 0, FALSE, 'pending', $9, NULL
            )
            RETURNING id, submitted_at`,
            [
                parent.title + ' (Revision)',
                author,
                authorEmail,
                authorOrganization,
                passwordHash,
                JSON.stringify(diagramData),
                thumbnail,
                id,
                parent.official_wdr
            ]
        );

        const revisionId = result.rows[0].id;

        // Record in moderation history
        await pool.query(
            `INSERT INTO map_moderation_history (map_id, action, notes)
            VALUES ($1, 'submit_revision', $2)`,
            [revisionId, changeDescription || 'Revision submitted for approval']
        );

        logger.info(`Revision submitted for map ${id}: ${revisionId} by ${author}`);

        res.status(201).json({
            success: true,
            message: 'Revision submitted and pending approval',
            revisionId: revisionId,
            parentMapId: id,
            parentWdr: parent.official_wdr,
            submittedAt: result.rows[0].submitted_at
        });
    } catch (error) {
        logger.error('Error submitting revision:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit revision'
        });
    }
});



module.exports = router;
