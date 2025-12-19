const jwt = require('jsonwebtoken');
const { query } = require('../db/connection');
const logger = require('../utils/logger');

/**
 * Map of diagram rooms to connected users
 * Structure: { diagramId: Set<userId> }
 */
const diagramRooms = new Map();

/**
 * Map of socket IDs to user info
 * Structure: { socketId: { userId, email, diagramId } }
 */
const socketUsers = new Map();

/**
 * Authenticate socket connection using JWT
 */
function authenticateSocket(socket, next) {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
        return next(new Error('Authentication required'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.userEmail = decoded.email;
        next();
    } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Invalid token'));
    }
}

/**
 * Check if user has permission to access diagram
 */
async function checkDiagramPermission(userId, diagramId, requiredPermission = 'view') {
    try {
        const result = await query(
            'SELECT check_diagram_permission($1, $2, $3) as allowed',
            [diagramId, userId, requiredPermission]
        );
        return result.rows[0]?.allowed || false;
    } catch (error) {
        logger.error('Permission check error:', error);
        return false;
    }
}

/**
 * Get all users currently in a diagram room
 */
function getRoomUsers(diagramId) {
    const users = [];
    for (const [socketId, userInfo] of socketUsers.entries()) {
        if (userInfo.diagramId === diagramId) {
            users.push({
                userId: userInfo.userId,
                email: userInfo.email,
                socketId
            });
        }
    }
    return users;
}

/**
 * Initialize Socket.io handlers
 */
function initializeSocketHandlers(io) {
    // Authentication middleware
    io.use(authenticateSocket);

    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id} (user: ${socket.userId})`);

        /**
         * Join a diagram room for collaborative editing
         */
        socket.on('join-diagram', async ({ diagramId }) => {
            try {
                // Check permission
                const hasPermission = await checkDiagramPermission(socket.userId, diagramId, 'view');

                if (!hasPermission) {
                    socket.emit('error', { message: 'Access denied to this diagram' });
                    return;
                }

                // Leave previous diagram if any
                if (socketUsers.has(socket.id)) {
                    const prevDiagramId = socketUsers.get(socket.id).diagramId;
                    socket.leave(prevDiagramId);

                    // Remove from room users
                    if (diagramRooms.has(prevDiagramId)) {
                        diagramRooms.get(prevDiagramId).delete(socket.userId);

                        // Notify others in previous room
                        socket.to(prevDiagramId).emit('user-left', {
                            userId: socket.userId,
                            email: socket.userEmail
                        });
                    }
                }

                // Join new diagram room
                socket.join(diagramId);

                // Track user in room
                if (!diagramRooms.has(diagramId)) {
                    diagramRooms.set(diagramId, new Set());
                }
                diagramRooms.get(diagramId).add(socket.userId);

                // Store socket info
                socketUsers.set(socket.id, {
                    userId: socket.userId,
                    email: socket.userEmail,
                    diagramId
                });

                // Get current users in room
                const roomUsers = getRoomUsers(diagramId);

                // Notify user of successful join
                socket.emit('joined-diagram', {
                    diagramId,
                    users: roomUsers
                });

                // Notify others in room
                socket.to(diagramId).emit('user-joined', {
                    userId: socket.userId,
                    email: socket.userEmail
                });

                logger.info(`User ${socket.userId} joined diagram ${diagramId}`);
            } catch (error) {
                logger.error('Error joining diagram:', error);
                socket.emit('error', { message: 'Failed to join diagram' });
            }
        });

        /**
         * Leave a diagram room
         */
        socket.on('leave-diagram', ({ diagramId }) => {
            handleLeaveDiagram(socket, diagramId);
        });

        /**
         * Enterprise added
         */
        socket.on('enterprise-added', async ({ diagramId, enterprise }) => {
            try {
                const hasPermission = await checkDiagramPermission(socket.userId, diagramId, 'edit');

                if (!hasPermission) {
                    socket.emit('error', { message: 'No permission to edit this diagram' });
                    return;
                }

                // Broadcast to others in room
                socket.to(diagramId).emit('enterprise-added', {
                    enterprise,
                    userId: socket.userId,
                    timestamp: new Date().toISOString()
                });

                logger.debug(`Enterprise added to diagram ${diagramId} by user ${socket.userId}`);
            } catch (error) {
                logger.error('Error broadcasting enterprise-added:', error);
            }
        });

        /**
         * Enterprise updated
         */
        socket.on('enterprise-updated', async ({ diagramId, enterpriseId, updates }) => {
            try {
                const hasPermission = await checkDiagramPermission(socket.userId, diagramId, 'edit');

                if (!hasPermission) {
                    socket.emit('error', { message: 'No permission to edit this diagram' });
                    return;
                }

                socket.to(diagramId).emit('enterprise-updated', {
                    enterpriseId,
                    updates,
                    userId: socket.userId,
                    timestamp: new Date().toISOString()
                });

                logger.debug(`Enterprise ${enterpriseId} updated in diagram ${diagramId} by user ${socket.userId}`);
            } catch (error) {
                logger.error('Error broadcasting enterprise-updated:', error);
            }
        });

        /**
         * Enterprise deleted
         */
        socket.on('enterprise-deleted', async ({ diagramId, enterpriseId }) => {
            try {
                const hasPermission = await checkDiagramPermission(socket.userId, diagramId, 'edit');

                if (!hasPermission) {
                    socket.emit('error', { message: 'No permission to edit this diagram' });
                    return;
                }

                socket.to(diagramId).emit('enterprise-deleted', {
                    enterpriseId,
                    userId: socket.userId,
                    timestamp: new Date().toISOString()
                });

                logger.debug(`Enterprise ${enterpriseId} deleted from diagram ${diagramId} by user ${socket.userId}`);
            } catch (error) {
                logger.error('Error broadcasting enterprise-deleted:', error);
            }
        });

        /**
         * Relationship added
         */
        socket.on('relationship-added', async ({ diagramId, relationship }) => {
            try {
                const hasPermission = await checkDiagramPermission(socket.userId, diagramId, 'edit');

                if (!hasPermission) {
                    socket.emit('error', { message: 'No permission to edit this diagram' });
                    return;
                }

                socket.to(diagramId).emit('relationship-added', {
                    relationship,
                    userId: socket.userId,
                    timestamp: new Date().toISOString()
                });

                logger.debug(`Relationship added to diagram ${diagramId} by user ${socket.userId}`);
            } catch (error) {
                logger.error('Error broadcasting relationship-added:', error);
            }
        });

        /**
         * Relationship deleted
         */
        socket.on('relationship-deleted', async ({ diagramId, relationshipId }) => {
            try {
                const hasPermission = await checkDiagramPermission(socket.userId, diagramId, 'edit');

                if (!hasPermission) {
                    socket.emit('error', { message: 'No permission to edit this diagram' });
                    return;
                }

                socket.to(diagramId).emit('relationship-deleted', {
                    relationshipId,
                    userId: socket.userId,
                    timestamp: new Date().toISOString()
                });

                logger.debug(`Relationship ${relationshipId} deleted from diagram ${diagramId} by user ${socket.userId}`);
            } catch (error) {
                logger.error('Error broadcasting relationship-deleted:', error);
            }
        });

        /**
         * User is currently editing (cursor position, selection, etc.)
         */
        socket.on('user-editing', async ({ diagramId, cursor, selection }) => {
            try {
                const hasPermission = await checkDiagramPermission(socket.userId, diagramId, 'view');

                if (!hasPermission) {
                    return;
                }

                socket.to(diagramId).emit('user-editing', {
                    userId: socket.userId,
                    email: socket.userEmail,
                    cursor,
                    selection,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                logger.error('Error broadcasting user-editing:', error);
            }
        });

        /**
         * Diagram metadata updated
         */
        socket.on('diagram-updated', async ({ diagramId, updates }) => {
            try {
                const hasPermission = await checkDiagramPermission(socket.userId, diagramId, 'edit');

                if (!hasPermission) {
                    socket.emit('error', { message: 'No permission to edit this diagram' });
                    return;
                }

                socket.to(diagramId).emit('diagram-updated', {
                    updates,
                    userId: socket.userId,
                    timestamp: new Date().toISOString()
                });

                logger.debug(`Diagram ${diagramId} metadata updated by user ${socket.userId}`);
            } catch (error) {
                logger.error('Error broadcasting diagram-updated:', error);
            }
        });

        /**
         * Request diagram sync (for conflict resolution)
         */
        socket.on('request-sync', async ({ diagramId }) => {
            try {
                const hasPermission = await checkDiagramPermission(socket.userId, diagramId, 'view');

                if (!hasPermission) {
                    socket.emit('error', { message: 'Access denied to this diagram' });
                    return;
                }

                // Get current diagram state from database
                const diagramResult = await query(
                    'SELECT * FROM diagrams WHERE id = $1 AND deleted_at IS NULL',
                    [diagramId]
                );

                if (diagramResult.rows.length === 0) {
                    socket.emit('error', { message: 'Diagram not found' });
                    return;
                }

                const enterprisesResult = await query(
                    'SELECT * FROM enterprises WHERE diagram_id = $1',
                    [diagramId]
                );

                const relationshipsResult = await query(
                    'SELECT * FROM relationships WHERE diagram_id = $1',
                    [diagramId]
                );

                socket.emit('diagram-sync', {
                    diagram: diagramResult.rows[0],
                    enterprises: enterprisesResult.rows,
                    relationships: relationshipsResult.rows
                });

                logger.debug(`Diagram sync sent to user ${socket.userId} for diagram ${diagramId}`);
            } catch (error) {
                logger.error('Error syncing diagram:', error);
                socket.emit('error', { message: 'Failed to sync diagram' });
            }
        });

        /**
         * Handle disconnect
         */
        socket.on('disconnect', () => {
            handleDisconnect(socket);
        });
    });

    logger.info('Socket.io handlers initialized');
}

/**
 * Handle user leaving a diagram
 */
function handleLeaveDiagram(socket, diagramId) {
    socket.leave(diagramId);

    if (diagramRooms.has(diagramId)) {
        diagramRooms.get(diagramId).delete(socket.userId);

        // Clean up empty rooms
        if (diagramRooms.get(diagramId).size === 0) {
            diagramRooms.delete(diagramId);
        }
    }

    // Remove from socket users if this was their current diagram
    const userInfo = socketUsers.get(socket.id);
    if (userInfo && userInfo.diagramId === diagramId) {
        socketUsers.delete(socket.id);
    }

    // Notify others
    socket.to(diagramId).emit('user-left', {
        userId: socket.userId,
        email: socket.userEmail
    });

    logger.info(`User ${socket.userId} left diagram ${diagramId}`);
}

/**
 * Handle socket disconnect
 */
function handleDisconnect(socket) {
    const userInfo = socketUsers.get(socket.id);

    if (userInfo) {
        const { diagramId } = userInfo;

        // Remove from room
        if (diagramRooms.has(diagramId)) {
            diagramRooms.get(diagramId).delete(socket.userId);

            if (diagramRooms.get(diagramId).size === 0) {
                diagramRooms.delete(diagramId);
            }
        }

        // Notify others
        socket.to(diagramId).emit('user-left', {
            userId: socket.userId,
            email: socket.userEmail
        });

        socketUsers.delete(socket.id);
    }

    logger.info(`Socket disconnected: ${socket.id} (user: ${socket.userId})`);
}

/**
 * Get statistics about connected users
 */
function getSocketStats() {
    return {
        totalConnections: socketUsers.size,
        activeRooms: diagramRooms.size,
        rooms: Array.from(diagramRooms.entries()).map(([diagramId, users]) => ({
            diagramId,
            userCount: users.size
        }))
    };
}

module.exports = {
    initializeSocketHandlers,
    getSocketStats
};
