#!/usr/bin/env node
/**
 * Railway Database Migration Runner
 * Run this script to set up the community maps database tables
 *
 * Usage: node run-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = 'postgresql://postgres:vHKlChKpqgLFlzuATPXNuyFKzuoDcOgw@yamanote.proxy.rlwy.net:57096/railway';

async function runMigration() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Railway uses SSL
    });

    try {
        console.log('🔗 Connecting to Railway PostgreSQL...');
        await client.connect();
        console.log('✅ Connected successfully!');

        // Read the migration SQL file
        const sqlPath = path.join(__dirname, 'server', 'db', 'railway-migration.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📝 Running migration script...');
        await client.query(sql);

        console.log('✅ Migration completed successfully!');
        console.log('');
        console.log('Tables created:');
        console.log('  - community_maps');
        console.log('  - moderation_history');
        console.log('  - email_queue');
        console.log('');
        console.log('🎉 Your database is ready!');
        console.log('');
        console.log('Next steps:');
        console.log('  1. Check Railway logs - your app should now connect successfully');
        console.log('  2. Visit your Railway app URL to test');
        console.log('  3. Try submitting a test map!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('');
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
