/**
 * Community Maps Routes
 * Public API for browsing and submitting co-operative ecosystem maps
 * No user accounts required - password-based editing
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { verifyEditPermission } = require('../middleware/adminAuth');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

/**
 * GET /api/maps/approved
 * Get all approved maps for public gallery
 * Query params: limit, offset, search, tags
 */
router.get('/approved', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search || null;
        const tags = req.query.tags ? req.query.tags.split(',') : null;

        let query = `
            SELECT
                id, title, author, organization, description, tags,
                thumbnail, view_count, published_at, created_at
            FROM community_maps
            WHERE status = 'approved'
        `;
        const params = [];
        let paramCount = 0;

        // Add search filter
        if (search) {
            paramCount++;
            query += ` AND search_vector @@ plainto_tsquery('english', $${paramCount})`;
            params.push(search);
        }

        // Add tags filter
        if (tags) {
            paramCount++;
            query += ` AND tags && $${paramCount}`;
            params.push(tags);
        }

        // Order and pagination
        query += ` ORDER BY published_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = `SELECT COUNT(*) FROM community_maps WHERE status = 'approved'`;
        const countParams = [];

        if (search) {
            countQuery += ` AND search_vector @@ plainto_tsquery('english', $1)`;
            countParams.push(search);
        }
        if (tags) {
            countQuery += ` AND tags && $${countParams.length + 1}`;
            countParams.push(tags);
        }

        const countResult = await pool.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            maps: result.rows,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + result.rows.length < totalCount
            }
        });

    } catch (error) {
        console.error('Error fetching approved maps:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching maps'
        });
    }
});

/**
 * GET /api/maps/:id
 * Get specific map details (public if approved)
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT
                id, title, author, email, organization, description, tags,
                diagram_data, thumbnail, status, view_count,
                created_at, updated_at, published_at
            FROM community_maps
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Map not found'
            });
        }

        const map = result.rows[0];

        // Only return full data if approved or being previewed by admin
        if (map.status !== 'approved') {
            return res.status(403).json({
                success: false,
                message: 'Map is not publicly available'
            });
        }

        // Increment view count
        await pool.query(
            'UPDATE community_maps SET view_count = view_count + 1 WHERE id = $1',
            [id]
        );

        // Remove sensitive data
        delete map.email;

        res.json({
            success: true,
            map
        });

    } catch (error) {
        console.error('Error fetching map:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching map'
        });
    }
});

/**
 * POST /api/maps/submit
 * Submit a new map for review
 * Body: { title, author, email, organization, description, tags, password, diagramData }
 */
router.post('/submit', async (req, res) => {
    try {
        const {
            title,
            author,
            email,
            organization,
            description,
            tags,
            password,
            diagramData,
            thumbnail
        } = req.body;

        // Validation
        if (!title || !author || !email || !password || !diagramData) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: title, author, email, password, diagramData'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert map
        const result = await pool.query(`
            INSERT INTO community_maps (
                title, author, email, organization, description, tags,
                password_hash, diagram_data, thumbnail, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
            RETURNING id, title, author, created_at
        `, [
            title,
            author,
            email,
            organization || null,
            description || null,
            tags || [],
            passwordHash,
            JSON.stringify(diagramData),
            thumbnail || null
        ]);

        const map = result.rows[0];

        // Log moderation action
        await pool.query(`
            INSERT INTO moderation_history (map_id, action, performed_by, notes)
            VALUES ($1, 'submitted', $2, 'Map submitted for review')
        `, [map.id, email]);

        // Queue welcome email
        await pool.query(`
            INSERT INTO email_queue (recipient_email, subject, body, map_id, email_type)
            VALUES ($1, $2, $3, $4, 'submission_received')
        `, [
            email,
            `Map Submitted - "${title}"`,
            `Hi ${author},\n\nThanks for submitting your map "${title}" to the Co-opMaps community!\n\nYour submission is now being reviewed by our team. You'll hear from us within 2-3 business days.\n\nBest,\nThe Co-opMaps Team`,
            map.id
        ]);

        res.status(201).json({
            success: true,
            message: 'Map submitted successfully and is pending review',
            mapId: map.id,
            map: {
                id: map.id,
                title: map.title,
                author: map.author,
                createdAt: map.created_at
            }
        });

    } catch (error) {
        console.error('Error submitting map:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting map'
        });
    }
});

/**
 * PUT /api/maps/:id/edit
 * Edit a map (requires password)
 * Headers: X-Map-Password or X-Admin-Password
 */
router.put('/:id/edit', verifyEditPermission(pool), async (req, res) => {
    try {
        const { id } = req.params;
        const { diagramData, thumbnail } = req.body;

        if (!diagramData) {
            return res.status(400).json({
                success: false,
                message: 'diagramData is required'
            });
        }

        // Update map
        const result = await pool.query(`
            UPDATE community_maps
            SET
                diagram_data = $1,
                thumbnail = COALESCE($2, thumbnail),
                edit_count = edit_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING id, title, updated_at
        `, [JSON.stringify(diagramData), thumbnail, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Map not found'
            });
        }

        // Log edit action
        const performedBy = req.isAdmin ? 'Admin' : 'Creator';
        await pool.query(`
            INSERT INTO moderation_history (map_id, action, performed_by, notes)
            VALUES ($1, 'edited', $2, 'Map edited')
        `, [id, performedBy]);

        res.json({
            success: true,
            message: 'Map updated successfully',
            map: result.rows[0]
        });

    } catch (error) {
        console.error('Error editing map:', error);
        res.status(500).json({
            success: false,
            message: 'Error editing map'
        });
    }
});

/**
 * GET /api/maps/:id/verify-password
 * Verify password without returning data (for unlock checks)
 * Headers: X-Map-Password
 */
router.get('/:id/verify-password', async (req, res) => {
    try {
        const { id } = req.params;
        const providedPassword = req.headers['x-map-password'];

        if (!providedPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password required'
            });
        }

        const result = await pool.query(
            'SELECT password_hash FROM community_maps WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Map not found'
            });
        }

        const isValid = await bcrypt.compare(providedPassword, result.rows[0].password_hash);

        res.json({
            success: true,
            valid: isValid
        });

    } catch (error) {
        console.error('Error verifying password:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying password'
        });
    }
});

module.exports = router;
