const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;
const logger = require('../utils/logger');

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'application/json'];
const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// File size limits (in bytes)
const MAX_FILE_SIZE = {
    icon: 2 * 1024 * 1024, // 2MB for icons
    background: 5 * 1024 * 1024, // 5MB for backgrounds
    profile: 3 * 1024 * 1024, // 3MB for profile pictures
    attachment: 10 * 1024 * 1024, // 10MB for attachments
    import: 50 * 1024 * 1024 // 50MB for bulk imports
};

// Storage configuration
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadType = req.body.uploadType || 'attachment';
        const uploadDir = path.join(__dirname, '../../uploads', uploadType);

        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            logger.error('Failed to create upload directory:', error);
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname);
        const filename = `${Date.now()}-${uniqueSuffix}${ext}`;
        cb(null, filename);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const uploadType = req.body.uploadType || 'attachment';

    // Check file type based on upload type
    let allowed = ALL_ALLOWED_TYPES;

    if (uploadType === 'icon' || uploadType === 'profile' || uploadType === 'background') {
        allowed = ALLOWED_IMAGE_TYPES;
    }

    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed types: ${allowed.join(', ')}`), false);
    }
};

// Create multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE.attachment // Default max size
    }
});

/**
 * Upload middleware with type-specific size limits
 */
function createUploadMiddleware(uploadType = 'attachment', fieldName = 'file') {
    return (req, res, next) => {
        const maxSize = MAX_FILE_SIZE[uploadType] || MAX_FILE_SIZE.attachment;

        const uploadMiddleware = multer({
            storage: storage,
            fileFilter: fileFilter,
            limits: { fileSize: maxSize }
        }).single(fieldName);

        uploadMiddleware(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`
                    });
                }
                return res.status(400).json({ error: err.message });
            } else if (err) {
                return res.status(400).json({ error: err.message });
            }
            next();
        });
    };
}

/**
 * Multiple files upload
 */
function createMultipleUploadMiddleware(uploadType = 'attachment', fieldName = 'files', maxCount = 10) {
    return (req, res, next) => {
        const maxSize = MAX_FILE_SIZE[uploadType] || MAX_FILE_SIZE.attachment;

        const uploadMiddleware = multer({
            storage: storage,
            fileFilter: fileFilter,
            limits: {
                fileSize: maxSize,
                files: maxCount
            }
        }).array(fieldName, maxCount);

        uploadMiddleware(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`
                    });
                } else if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        error: `Too many files. Maximum: ${maxCount}`
                    });
                }
                return res.status(400).json({ error: err.message });
            } else if (err) {
                return res.status(400).json({ error: err.message });
            }
            next();
        });
    };
}

/**
 * Delete uploaded file
 */
async function deleteFile(filePath) {
    try {
        await fs.unlink(filePath);
        logger.info(`File deleted: ${filePath}`);
        return true;
    } catch (error) {
        logger.error(`Failed to delete file ${filePath}:`, error);
        return false;
    }
}

/**
 * Get file info
 */
async function getFileInfo(filePath) {
    try {
        const stats = await fs.stat(filePath);
        return {
            exists: true,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
        };
    } catch (error) {
        return { exists: false };
    }
}

/**
 * Validate image dimensions
 */
async function validateImageDimensions(filePath, maxWidth, maxHeight) {
    // This would require sharp or jimp library
    // For now, just a placeholder
    return true;
}

/**
 * Generate thumbnail
 */
async function generateThumbnail(sourcePath, destPath, width = 200, height = 200) {
    // This would require sharp library
    // Placeholder for now
    logger.info(`Thumbnail generation not yet implemented: ${sourcePath}`);
    return null;
}

module.exports = {
    upload,
    createUploadMiddleware,
    createMultipleUploadMiddleware,
    deleteFile,
    getFileInfo,
    validateImageDimensions,
    generateThumbnail,
    MAX_FILE_SIZE,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_DOCUMENT_TYPES
};
