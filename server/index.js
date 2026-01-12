const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { connectDB } = require('./db/connection');
const { connectRedis } = require('./db/redis');
const { initializeSocketHandlers } = require('./sockets/index');
const { rateLimiters } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const diagramRoutes = require('./routes/diagrams');
const collaboratorRoutes = require('./routes/collaborators');
const commentsRoutes = require('./routes/comments');
const notificationsRoutes = require('./routes/notifications');
const tagsRoutes = require('./routes/tags');
const publicRoutes = require('./routes/public');
const mapsRoutes = require('./routes/maps');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Middleware - Configure helmet with CSP that allows our inline scripts and CDN
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "https://co-op-maps-production.up.railway.app", "wss://co-op-maps-production.up.railway.app", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', { stream: logger.stream }));
}

// Track connection status
let dbConnected = false;
let redisConnected = false;

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: require('../package.json').version,
        database: dbConnected ? 'connected' : 'offline',
        redis: redisConnected ? 'connected' : 'offline'
    });
});

// API Routes with rate limiting
app.use('/api/auth', authRoutes); // Auth has its own stricter rate limiting
app.use('/api/users', rateLimiters.api, userRoutes);
app.use('/api/diagrams', rateLimiters.api, diagramRoutes);
app.use('/api/diagrams', rateLimiters.api, collaboratorRoutes);
app.use('/api/diagrams', rateLimiters.api, commentsRoutes);  // /api/diagrams/:id/comments
app.use('/api/diagrams', rateLimiters.api, tagsRoutes);       // /api/diagrams/:id/tags
app.use('/api/collaborators', rateLimiters.api, collaboratorRoutes);
app.use('/api/comments', rateLimiters.api, commentsRoutes);   // /api/comments/:id for direct comment ops
app.use('/api/notifications', rateLimiters.api, notificationsRoutes);
app.use('/api/tags', rateLimiters.api, tagsRoutes);           // /api/tags for listing all tags
app.use('/api/public', rateLimiters.publicApi, publicRoutes);
app.use('/api/maps', rateLimiters.publicApi, mapsRoutes);
app.use('/api/admin', rateLimiters.api, adminRoutes);

// Serve static files (for the frontend) with cache control
// In development: disable caching entirely for easier testing
// In production: use appropriate caching
const isDev = process.env.NODE_ENV === 'development';
app.use(express.static('public', {
    etag: !isDev,           // Disable etag in development
    lastModified: !isDev,   // Disable lastModified in development
    maxAge: isDev ? 0 : undefined,
    setHeaders: (res, filepath) => {
        if (isDev) {
            // Development: no caching at all
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');
        } else {
            // Production caching
            if (filepath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache, must-revalidate');
            } else if (filepath.endsWith('.js') || filepath.endsWith('.css')) {
                res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
            } else if (filepath.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)) {
                res.setHeader('Cache-Control', 'public, max-age=86400');
            }
        }
    }
}));

// Serve landing page for root URL
const path = require('path');
app.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.sendFile(path.join(__dirname, '../public/version-selector.html'));
});

// Socket.io handlers
initializeSocketHandlers(io);

// 404 handler
app.use(notFoundHandler);

// Error handling
app.use(errorHandler);

// Initialize server
const PORT = process.env.PORT || 3000;

async function startServer() {
    // Try to connect to database (optional)
    try {
        await connectDB();
        dbConnected = true;
        logger.info('Database connected successfully');
    } catch (error) {
        logger.warn('Database connection failed - running in static-only mode:', error.message);
    }

    // Try to connect to Redis (optional)
    try {
        await connectRedis();
        redisConnected = true;
        logger.info('Redis connected successfully');
    } catch (error) {
        logger.warn('Redis connection failed - sessions will use memory store:', error.message);
    }

    // Start server regardless of database connection
    server.listen(PORT, () => {
        logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
        console.log(`
╔═══════════════════════════════════════════════════════╗
║           Co-opMaps Backend Server                    ║
║                                                       ║
║  Server:     http://localhost:${PORT}                  ║
║  API:        http://localhost:${PORT}/api              ║
║  Health:     http://localhost:${PORT}/health           ║
║  Environment: ${process.env.NODE_ENV || 'development'}                         ║
║  Database:   ${dbConnected ? 'Connected' : 'Offline (static mode)'}                    ║
║  Redis:      ${redisConnected ? 'Connected' : 'Offline (memory store)'}                    ║
╚═══════════════════════════════════════════════════════╝
        `);
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
}

async function gracefulShutdown() {
    logger.info('Shutting down gracefully...');

    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}

// Start the server
startServer();

module.exports = { app, server, io };
