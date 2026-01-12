/**
 * Database Migration Runner
 * Runs SQL migrations on startup and tracks which have been applied
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('./connection');
const logger = require('../utils/logger');

// List of migrations in order
const migrations = [
    'schema-community-maps.sql',
    'migration-wdr-sequence.sql'
];

async function runMigrations() {
    logger.info('Starting database migration check...');

    try {
        // Create migrations tracking table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS _migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Get list of already applied migrations
        const applied = await pool.query('SELECT name FROM _migrations');
        const appliedSet = new Set(applied.rows.map(r => r.name));

        // Run each migration that hasn't been applied
        for (const migrationFile of migrations) {
            if (appliedSet.has(migrationFile)) {
                logger.debug(`Migration already applied: ${migrationFile}`);
                continue;
            }

            const filePath = path.join(__dirname, migrationFile);

            if (!fs.existsSync(filePath)) {
                logger.warn(`Migration file not found: ${migrationFile}`);
                continue;
            }

            logger.info(`Running migration: ${migrationFile}`);

            const sql = fs.readFileSync(filePath, 'utf8');

            try {
                await pool.query(sql);
                await pool.query(
                    'INSERT INTO _migrations (name) VALUES ($1)',
                    [migrationFile]
                );
                logger.info(`Migration completed: ${migrationFile}`);
            } catch (error) {
                // Some errors are OK (e.g., "already exists")
                if (error.message.includes('already exists') ||
                    error.message.includes('duplicate key')) {
                    logger.info(`Migration ${migrationFile} - objects already exist, marking as applied`);
                    await pool.query(
                        'INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
                        [migrationFile]
                    );
                } else {
                    logger.error(`Migration failed: ${migrationFile}`, error);
                    throw error;
                }
            }
        }

        logger.info('Database migrations complete');
        return true;
    } catch (error) {
        logger.error('Migration runner failed:', error);
        throw error;
    }
}

module.exports = { runMigrations };
