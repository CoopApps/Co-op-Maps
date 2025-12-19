const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 */
function validateRequest(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}

/**
 * Common validation rules
 */
const validations = {
    // UUID parameter validation
    uuidParam: (paramName = 'id') => [
        param(paramName).isUUID().withMessage('Invalid UUID format')
    ],

    // Pagination validation
    pagination: [
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
    ],

    // Diagram validation
    createDiagram: [
        body('title').optional().trim().isLength({ max: 500 }),
        body('author').optional().trim().isLength({ max: 255 }),
        body('wdr').optional().trim().isLength({ max: 100 }),
        body('scope_geographic').optional().trim().isLength({ max: 50 }),
        body('scope_economic').optional().trim(),
        body('scope_user_defined').optional().trim(),
        body('period').optional().isIn(['present', 'past', 'future']),
        body('diagram_date').optional().isISO8601(),
        body('canvas_size').optional().isIn(['A4', 'A3', 'A2', 'A1', 'Letter', 'Legal']),
        body('connector_style').optional().isIn(['orthogonal', 'direct']),
        body('is_public').optional().isBoolean(),
        body('enterprises').optional().isArray(),
        body('relationships').optional().isArray()
    ],

    updateDiagram: [
        body('title').optional().trim().isLength({ max: 500 }),
        body('author').optional().trim().isLength({ max: 255 }),
        body('wdr').optional().trim().isLength({ max: 100 }),
        body('scope_geographic').optional().trim().isLength({ max: 50 }),
        body('scope_economic').optional().trim(),
        body('scope_user_defined').optional().trim(),
        body('period').optional().isIn(['present', 'past', 'future']),
        body('diagram_date').optional().isISO8601(),
        body('canvas_size').optional().isIn(['A4', 'A3', 'A2', 'A1', 'Letter', 'Legal']),
        body('connector_style').optional().isIn(['orthogonal', 'direct']),
        body('is_public').optional().isBoolean()
    ],

    // Enterprise validation
    createEnterprise: [
        body('enterprise_id').notEmpty().trim().isLength({ max: 100 }),
        body('type').isIn(['cooperative', 'ncm', 'social', 'private', 'state', 'excluded']),
        body('name').notEmpty().trim().isLength({ max: 255 }),
        body('x').isFloat(),
        body('y').isFloat(),
        body('width').isFloat({ gt: 0 }),
        body('height').isFloat({ gt: 0 }),
        body('fill').optional().trim().isLength({ max: 50 }),
        body('stroke').optional().trim().isLength({ max: 50 }),
        body('roles').optional().isArray(),
        body('tier').optional().isIn(['primary', 'secondary', 'tertiary', 'hybrid']),
        body('is_generic_set').optional().isBoolean(),
        body('z_index').optional().isInt()
    ],

    // Relationship validation
    createRelationship: [
        body('relationship_id').notEmpty().trim().isLength({ max: 100 }),
        body('start_enterprise_id').notEmpty().trim().isLength({ max: 100 }),
        body('end_enterprise_id').notEmpty().trim().isLength({ max: 100 }),
        body('type').isIn(['G', 'I', 'L', 'M', 'O', 'P', 'S', 'INNER']),
        body('start_segmentation').optional().isIn(['individual', 'entire', 'subset']),
        body('end_segmentation').optional().isIn(['individual', 'entire', 'subset'])
    ],

    // Collaborator validation
    addCollaborator: [
        body('user_id').isUUID().withMessage('Invalid user ID'),
        body('permission').isIn(['view', 'edit', 'admin'])
    ],

    updateCollaborator: [
        body('permission').isIn(['view', 'edit', 'admin'])
    ],

    // Search validation
    search: [
        query('q').optional().trim().isLength({ min: 1, max: 200 }),
        query('type').optional().isIn(['cooperative', 'ncm', 'social', 'private', 'state', 'excluded']),
        query('is_template').optional().isBoolean(),
        query('is_public').optional().isBoolean()
    ],

    // User profile validation
    updateProfile: [
        body('full_name').optional().trim().isLength({ max: 255 }),
        body('organization').optional().trim().isLength({ max: 255 }),
        body('preferences').optional().isObject()
    ],

    changePassword: [
        body('current_password').notEmpty(),
        body('new_password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    ]
};

module.exports = {
    validateRequest,
    ...validations
};
