#!/usr/bin/env node
/**
 * One-time database migration for Railway
 * This script runs the migration and then exits
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
    const DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL) {
        console.error('❌ ERROR: DATABASE_URL environment variable not set');
        process.exit(1);
    }

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔗 Connecting to PostgreSQL...');
        await client.connect();
        console.log('✅ Connected!');

        const sql = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TABLE IF EXISTS moderation_history CASCADE;
DROP TABLE IF EXISTS email_queue CASCADE;
DROP TABLE IF EXISTS community_maps CASCADE;

CREATE TABLE community_maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    organization VARCHAR(255),
    description TEXT,
    tags TEXT[],
    password_hash VARCHAR(255) NOT NULL,
    diagram_data JSONB NOT NULL,
    thumbnail TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    admin_notes TEXT,
    rejection_reason TEXT,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    published_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    edit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE moderation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID REFERENCES community_maps(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    performed_by VARCHAR(255) NOT NULL,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    map_id UUID,
    email_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_community_maps_status ON community_maps(status);
CREATE INDEX idx_community_maps_approved ON community_maps(status, published_at DESC) WHERE status = 'approved';

CREATE TRIGGER update_community_maps_updated_at BEFORE UPDATE ON community_maps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

        console.log('📝 Running migration...');
        await client.query(sql);

        console.log('✅ Migration completed successfully!');
        console.log('');
        console.log('Tables created:');
        console.log('  ✓ community_maps');
        console.log('  ✓ moderation_history');
        console.log('  ✓ email_queue');
        console.log('');
        console.log('🎉 Database is ready!');

        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:');
        console.error(error.message);
        process.exit(1);
    }
}

migrate();
