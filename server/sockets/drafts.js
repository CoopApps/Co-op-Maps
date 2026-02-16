/**
 * Draft Collaboration Socket.io Handlers
 * Manages real-time collaboration for draft maps
 */

const { pool } = require('../db/connection');
const logger = require('../utils/logger');

/**
 * Map of draft rooms to connected users
 * Structure: { draftId: Set<{ userId, socketId, email }> }
 */
const draftRooms = new Map();

/**
 * Map of socket IDs to user info
 * Structure: { socketId: { userId, email, currentDraftId } }
 */
const socketUsers = new Map();

/**
 * Check if user has permission to access draft
 */
async function checkDraftPermission(userId, draftId, requiredPermission = 'viewer') {
    try {
        const result = await pool.query(
            'SELECT check_draft_permission($1, $2, $3) as allowed',
            [draftId, userId, requiredPermission]
        );
        return result.rows[0]?.allowed || false;
    } catch (error) {
        logger.error('Draft permission check error:', error);
        return false;
    }
}

/**
 * Get draft status to ensure it's still a draft
 */
async function getDraftStatus(draftId) {
    try {
        const result = await pool.query(
            'SELECT status FROM community_maps WHERE id = $1 AND deleted_at IS NULL',
            [draftId]
        );
        return result.rows[0]?.status || null;
    } catch (error) {
        logger.error('Draft status check error:', error);
        return null;
    }
}

/**
 * Initialize draft-specific socket handlers
 */
function initializeDraftSocketHandlers(io) {
    io.on('connection', (socket) => {
        // User info is set by socket authentication middleware
        const userId = socket.userId;
        const email = socket.userEmail;

        if (!userId || !email) {
            logger.warn('Socket connected without user authentication');
            socket.disconnect(true);
            return;
        }

        // Store user info
        socketUsers.set(socket.id, { userId, email, currentDraftId: null });

        logger.debug(`Socket connected: ${socket.id} (user: ${userId})`);

        /**
         * Join a draft room for collaborative editing
         */
        socket.on('join-draft', async ({ draftId }) => {
            try {
                // Validate UUID format
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(draftId)) {
                    socket.emit('error', { message: 'Invalid draft ID format' });
                    return;
                }

                // Check if draft still exists and is a draft
                const status = await getDraftStatus(draftId);
                if (!status) {
                    socket.emit('error', { message: 'Draft not found' });
                    return;
                }
                if (status !== 'draft') {
                    socket.emit('error', { message: 'This map has been submitted and is no longer editable' });
                    return;
                }

                // Check permission
                const hasPermission = await checkDraftPermission(userId, draftId, 'viewer');
                if (!hasPermission) {
                    socket.emit('error', { message: 'Access denied to this draft' });
                    return;
                }

                // Leave previous draft room if any
                const userInfo = socketUsers.get(socket.id);
                if (userInfo?.currentDraftId) {
                    socket.leave(`draft:${userInfo.currentDraftId}`);
                    removeUserFromRoom(userInfo.currentDraftId, userId, socket.id);
                }

                // Join new draft room
                socket.join(`draft:${draftId}`);

                // Track user in room
                if (!draftRooms.has(draftId)) {
                    draftRooms.set(draftId, new Set());
                }
                draftRooms.get(draftId).add({ userId, socketId: socket.id, email });

                // Update user info
                userInfo.currentDraftId = draftId;
                socketUsers.set(socket.id, userInfo);

                // Get current users in room
                const roomUsers = Array.from(draftRooms.get(draftId)).map(u => ({
                    userId: u.userId,
                    email: u.email
                }));

                // Notify joining user
                socket.emit('joined-draft', {
                    draftId,
                    users: roomUsers
                });

                // Notify others
                socket.to(`draft:${draftId}`).emit('user-joined-draft', {
                    userId: userId,
                    email: email
                });

                logger.info(`User ${userId} joined draft ${draftId} (${roomUsers.length} total users)`);
            } catch (error) {
                logger.error('Error joining draft:', error);
                socket.emit('error', { message: 'Failed to join draft' });
            }
        });

        /**
         * Leave draft room
         */
        socket.on('leave-draft', ({ draftId }) => {
            leaveDraftRoom(socket, draftId);
        });

        /**
         * Broadcast draft changes to collaborators
         */
        socket.on('draft-change', async ({ draftId, changeType, data }) => {
            try {
                // Verify user is still in this draft
                const userInfo = socketUsers.get(socket.id);
                if (!userInfo || userInfo.currentDraftId !== draftId) {
                    socket.emit('error', { message: 'Not in this draft room' });
                    return;
                }

                // Check edit permission
                const hasPermission = await checkDraftPermission(userId, draftId, 'editor');
                if (!hasPermission) {
                    socket.emit('error', { message: 'No permission to edit this draft' });
                    return;
                }

                // Broadcast to others in room (not back to sender)
                socket.to(`draft:${draftId}`).emit('draft-changed', {
                    draftId,
                    changeType,
                    data,
                    userId: userId,
                    email: email,
                    timestamp: new Date().toISOString()
                });

                logger.debug(`Draft change broadcast: ${draftId} by user ${userId} (${changeType})`);
            } catch (error) {
                logger.error('Error broadcasting draft change:', error);
            }
        });

        /**
         * Broadcast cursor/selection for presence indicators
         */
        socket.on('draft-cursor', async ({ draftId, cursor, selection }) => {
            try {
                // Verify user is in this draft
                const userInfo = socketUsers.get(socket.id);
                if (!userInfo || userInfo.currentDraftId !== draftId) {
                    return;
                }

                // Check permission
                const hasPermission = await checkDraftPermission(userId, draftId, 'viewer');
                if (!hasPermission) {
                    return;
                }

                // Broadcast cursor position to others
                socket.to(`draft:${draftId}`).emit('draft-cursor-update', {
                    userId: userId,
                    email: email,
                    cursor,
                    selection
                });
            } catch (error) {
                logger.error('Error broadcasting cursor:', error);
            }
        });

        /**
         * Request draft sync for conflict resolution
         */
        socket.on('request-draft-sync', async ({ draftId }) => {
            try {
                // Verify user is in this draft
                const userInfo = socketUsers.get(socket.id);
                if (!userInfo || userInfo.currentDraftId !== draftId) {
                    socket.emit('error', { message: 'Not in this draft room' });
                    return;
                }

                // Check permission
                const hasPermission = await checkDraftPermission(userId, draftId, 'viewer');
                if (!hasPermission) {
                    socket.emit('error', { message: 'Access denied' });
                    return;
                }

                // Get current draft state
                const result = await pool.query(
                    `SELECT diagram_data, last_edited_at
                     FROM community_maps
                     WHERE id = $1 AND deleted_at IS NULL AND status = 'draft'`,
                    [draftId]
                );

                if (result.rows.length === 0) {
                    socket.emit('error', { message: 'Draft not found' });
                    return;
                }

                socket.emit('draft-sync', {
                    draftId,
                    diagramData: result.rows[0].diagram_data,
                    lastEditedAt: result.rows[0].last_edited_at
                });

                logger.debug(`Draft sync sent to user ${userId} for draft ${draftId}`);
            } catch (error) {
                logger.error('Error syncing draft:', error);
                socket.emit('error', { message: 'Failed to sync draft' });
            }
        });

        /**
         * Lock an entity for editing (prevents conflicts)
         */
        socket.on('lock-entity', async ({ draftId, entityId, entityType }) => {
            try {
                const userInfo = socketUsers.get(socket.id);
                if (!userInfo || userInfo.currentDraftId !== draftId) {
                    return;
                }

                const hasPermission = await checkDraftPermission(userId, draftId, 'editor');
                if (!hasPermission) {
                    socket.emit('error', { message: 'No permission to edit' });
                    return;
                }

                // Notify others that this entity is locked
                socket.to(`draft:${draftId}`).emit('entity-locked', {
                    entityId,
                    entityType,
                    lockedBy: userId,
                    email: email
                });

                logger.debug(`Entity locked: ${entityType} ${entityId} by ${userId} in draft ${draftId}`);
            } catch (error) {
                logger.error('Error locking entity:', error);
            }
        });

        /**
         * Unlock an entity after editing
         */
        socket.on('unlock-entity', async ({ draftId, entityId, entityType }) => {
            try {
                const userInfo = socketUsers.get(socket.id);
                if (!userInfo || userInfo.currentDraftId !== draftId) {
                    return;
                }

                // Notify others that this entity is unlocked
                socket.to(`draft:${draftId}`).emit('entity-unlocked', {
                    entityId,
                    entityType
                });

                logger.debug(`Entity unlocked: ${entityType} ${entityId} in draft ${draftId}`);
            } catch (error) {
                logger.error('Error unlocking entity:', error);
            }
        });

        /**
         * Handle disconnect
         */
        socket.on('disconnect', () => {
            const userInfo = socketUsers.get(socket.id);
            if (userInfo?.currentDraftId) {
                leaveDraftRoom(socket, userInfo.currentDraftId);
            }
            socketUsers.delete(socket.id);
            logger.debug(`Socket disconnected: ${socket.id}`);
        });
    });

    logger.info('Draft socket handlers initialized');
}

/**
 * Helper function to leave a draft room
 */
function leaveDraftRoom(socket, draftId) {
    socket.leave(`draft:${draftId}`);

    const userInfo = socketUsers.get(socket.id);
    if (userInfo) {
        removeUserFromRoom(draftId, userInfo.userId, socket.id);

        // Notify others
        socket.to(`draft:${draftId}`).emit('user-left-draft', {
            userId: userInfo.userId
        });

        // Clear current draft
        userInfo.currentDraftId = null;
        socketUsers.set(socket.id, userInfo);

        logger.info(`User ${userInfo.userId} left draft ${draftId}`);
    }
}

/**
 * Remove user from room tracking
 */
function removeUserFromRoom(draftId, userId, socketId) {
    if (draftRooms.has(draftId)) {
        const users = draftRooms.get(draftId);
        // Remove user by socket ID
        for (const user of users) {
            if (user.socketId === socketId) {
                users.delete(user);
                break;
            }
        }
        // Clean up empty rooms
        if (users.size === 0) {
            draftRooms.delete(draftId);
            logger.debug(`Draft room ${draftId} cleaned up (empty)`);
        }
    }
}

/**
 * Get statistics about active draft rooms
 */
function getDraftRoomStats() {
    const stats = {
        totalRooms: draftRooms.size,
        totalUsers: socketUsers.size,
        rooms: []
    };

    for (const [draftId, users] of draftRooms.entries()) {
        stats.rooms.push({
            draftId,
            userCount: users.size,
            users: Array.from(users).map(u => ({ userId: u.userId, email: u.email }))
        });
    }

    return stats;
}

module.exports = {
    initializeDraftSocketHandlers,
    getDraftRoomStats,
    draftRooms
};
