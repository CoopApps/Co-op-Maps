const { Pool } = require('pg');
const logger = require('../utils/logger');

// Support Railway's DATABASE_URL or individual environment variables
// Railway provides: PGUSER, POSTGRES_PASSWORD, RAILWAY_TCP_PROXY_DOMAIN, RAILWAY_TCP_PROXY_PORT, PGDATABASE
// Or a full DATABASE_URL

let poolConfig;

if (process.env.DATABASE_URL) {
    // Use connection string (Railway, Heroku, etc.)
    poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    };
} else {
    // Use individual environment variables
    // Support both Railway-style (PG*) and custom (DB_*) variables
    poolConfig = {
        host: process.env.RAILWAY_TCP_PROXY_DOMAIN || process.env.PGHOST || process.env.DB_HOST || 'localhost',
        port: process.env.RAILWAY_TCP_PROXY_PORT || process.env.PGPORT || process.env.DB_PORT || 5432,
        database: process.env.PGDATABASE || process.env.DB_NAME || 'coopmaps',
        user: process.env.PGUSER || process.env.DB_USER || 'coopmaps_user',
        password: process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    };
}

const pool = new Pool(poolConfig);

// Test the connection
async function connectDB() {
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        logger.info('Database connection test successful');
        client.release();
        return pool;
    } catch (error) {
        logger.error('Database connection failed:', error);
        throw error;
    }
}

// Query helper
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        logger.error('Query error', { text, error: error.message });
        throw error;
    }
}

// Transaction helper
async function transaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    pool,
    connectDB,
    query,
    transaction
};
