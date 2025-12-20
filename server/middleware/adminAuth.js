/**
 * Admin Authentication Middleware
 * For Principle 5 admin access to review and manage community maps
 */

const bcrypt = require('bcryptjs');

/**
 * Verify admin password from request header
 * Admin password is stored in environment variable ADMIN_PASSWORD
 */
const verifyAdminPassword = async (req, res, next) => {
    try {
        const providedPassword = req.headers['x-admin-password'];

        if (!providedPassword) {
            return res.status(401).json({
                success: false,
                message: 'Admin password required'
            });
        }

        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
            console.error('ADMIN_PASSWORD environment variable not set');
            return res.status(500).json({
                success: false,
                message: 'Admin authentication not configured'
            });
        }

        // Compare provided password with admin password
        // If ADMIN_PASSWORD is a bcrypt hash, use bcrypt.compare
        // Otherwise, use direct comparison (not recommended for production)
        let isValid = false;

        if (adminPassword.startsWith('$2a$') || adminPassword.startsWith('$2b$')) {
            // It's a bcrypt hash
            isValid = await bcrypt.compare(providedPassword, adminPassword);
        } else {
            // Plain text comparison (only for development)
            isValid = providedPassword === adminPassword;

            if (process.env.NODE_ENV === 'production') {
                console.warn('WARNING: Using plain text admin password in production is insecure!');
            }
        }

        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Invalid admin password'
            });
        }

        // Password is valid, continue to route handler
        req.isAdmin = true;
        next();

    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

/**
 * Verify map edit password
 * Used when creator wants to edit their own map
 */
const verifyMapPassword = async (mapPasswordHash, providedPassword) => {
    try {
        return await bcrypt.compare(providedPassword, mapPasswordHash);
    } catch (error) {
        console.error('Password verification error:', error);
        return false;
    }
};

/**
 * Middleware to check if request has valid admin OR map password
 * Used for editing maps
 */
const verifyEditPermission = (db) => async (req, res, next) => {
    try {
        const mapId = req.params.id;
        const providedPassword = req.headers['x-map-password'] || req.headers['x-admin-password'];

        if (!providedPassword) {
            return res.status(401).json({
                success: false,
                message: 'Password required to edit map'
            });
        }

        // Get map from database
        const result = await db.query(
            'SELECT password_hash FROM community_maps WHERE id = $1',
            [mapId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Map not found'
            });
        }

        const map = result.rows[0];

        // Check if it's admin password
        const adminPassword = process.env.ADMIN_PASSWORD;
        let isAdmin = false;

        if (adminPassword) {
            if (adminPassword.startsWith('$2a$') || adminPassword.startsWith('$2b$')) {
                isAdmin = await bcrypt.compare(providedPassword, adminPassword);
            } else {
                isAdmin = providedPassword === adminPassword;
            }
        }

        if (isAdmin) {
            req.isAdmin = true;
            return next();
        }

        // Check if it's the map's password
        const isValidMapPassword = await verifyMapPassword(map.password_hash, providedPassword);

        if (!isValidMapPassword) {
            return res.status(403).json({
                success: false,
                message: 'Invalid password'
            });
        }

        req.isAdmin = false;
        req.isMapOwner = true;
        next();

    } catch (error) {
        console.error('Edit permission verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

module.exports = {
    verifyAdminPassword,
    verifyMapPassword,
    verifyEditPermission
};
