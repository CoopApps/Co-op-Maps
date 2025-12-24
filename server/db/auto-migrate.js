/**
 * Automatic Database Migration
 * Runs community maps schema migration on app startup if tables don't exist
 */

const { pool } = require('./connection');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

async function checkIfMigrationNeeded() {
    try {
        const result = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'community_maps'
            ) as table_exists;
        `);

        return !result.rows[0].table_exists;
    } catch (error) {
        logger.error('Error checking migration status:', error);
        return true; // If we can't check, assume migration is needed
    }
}

async function runMigration() {
    const client = await pool.connect();

    try {
        logger.info('🔄 Running database migration...');

        // Read the migration SQL file
        const sqlPath = path.join(__dirname, 'railway-migration.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Run the migration
        await client.query(sql);

        logger.info('✅ Database migration completed successfully!');
        logger.info('   Tables created:');
        logger.info('   - community_maps');
        logger.info('   - moderation_history');
        logger.info('   - email_queue');

        return true;
    } catch (error) {
        logger.error('❌ Database migration failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function autoMigrate() {
    try {
        const needsMigration = await checkIfMigrationNeeded();

        if (needsMigration) {
            logger.info('📝 Community maps tables not found, running migration...');
            await runMigration();
        } else {
            logger.info('✓ Community maps tables already exist, skipping migration');
        }

        return true;
    } catch (error) {
        logger.error('Auto-migration error:', error);
        throw error;
    }
}

module.exports = { autoMigrate };
