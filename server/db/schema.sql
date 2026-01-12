-- Co-opMaps Database Schema
-- Version: 1.0.0
-- Description: Complete database schema for Co-opMaps backend

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for development only)
DROP TABLE IF EXISTS diagram_versions CASCADE;
DROP TABLE IF EXISTS diagram_collaborators CASCADE;
DROP TABLE IF EXISTS relationships CASCADE;
DROP TABLE IF EXISTS enterprises CASCADE;
DROP TABLE IF EXISTS diagrams CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    organization VARCHAR(255),
    membership_level INTEGER DEFAULT 1 CHECK (membership_level >= 1 AND membership_level <= 10),
    membership_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    preferences JSONB DEFAULT '{}'::jsonb
);

-- Refresh tokens table (for JWT refresh)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN DEFAULT FALSE
);

-- Diagrams table
CREATE TABLE diagrams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL DEFAULT 'Untitled Diagram',
    author VARCHAR(255),
    wdr VARCHAR(100),
    scope_geographic VARCHAR(50),
    scope_economic TEXT,
    scope_user_defined TEXT,
    period VARCHAR(50) DEFAULT 'present',
    diagram_date DATE,
    canvas_size VARCHAR(10) DEFAULT 'A4',
    connector_style VARCHAR(20) DEFAULT 'orthogonal',
    thumbnail_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    is_template BOOLEAN DEFAULT FALSE,
    template_category VARCHAR(100),
    view_count INTEGER DEFAULT 0,
    fork_count INTEGER DEFAULT 0,
    forked_from UUID REFERENCES diagrams(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(author, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(scope_economic, '')), 'C')
    ) STORED
);

-- Enterprises table
CREATE TABLE enterprises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagram_id UUID REFERENCES diagrams(id) ON DELETE CASCADE,
    enterprise_id VARCHAR(100) NOT NULL, -- Client-side generated ID
    type VARCHAR(50) NOT NULL CHECK (type IN ('cooperative', 'ncm', 'social', 'private', 'state', 'excluded')),
    name VARCHAR(255) NOT NULL,
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    width FLOAT NOT NULL CHECK (width > 0),
    height FLOAT NOT NULL CHECK (height > 0),
    fill VARCHAR(50),
    stroke VARCHAR(50),
    roles JSONB DEFAULT '[]'::jsonb,
    tier VARCHAR(50),
    is_generic_set BOOLEAN DEFAULT FALSE,
    z_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_enterprise_per_diagram UNIQUE (diagram_id, enterprise_id)
);

-- Relationships table
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagram_id UUID REFERENCES diagrams(id) ON DELETE CASCADE,
    relationship_id VARCHAR(100) NOT NULL, -- Client-side generated ID
    start_enterprise_id VARCHAR(100) NOT NULL,
    end_enterprise_id VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('G', 'I', 'L', 'M', 'O', 'P', 'S', 'INNER')),
    start_segmentation VARCHAR(50) DEFAULT 'individual' CHECK (start_segmentation IN ('individual', 'entire', 'subset')),
    end_segmentation VARCHAR(50) DEFAULT 'individual' CHECK (end_segmentation IN ('individual', 'entire', 'subset')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_relationship_per_diagram UNIQUE (diagram_id, relationship_id)
);

-- Diagram versions table (for version history)
CREATE TABLE diagram_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagram_id UUID REFERENCES diagrams(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    data JSONB NOT NULL, -- Full diagram snapshot
    enterprises JSONB NOT NULL, -- Snapshot of enterprises
    relationships JSONB NOT NULL, -- Snapshot of relationships
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_description TEXT,

    CONSTRAINT unique_version_per_diagram UNIQUE (diagram_id, version_number)
);

-- Collaborators table
CREATE TABLE diagram_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagram_id UUID REFERENCES diagrams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL CHECK (permission IN ('view', 'edit', 'admin')),
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    last_accessed_at TIMESTAMP,

    CONSTRAINT unique_collaborator_per_diagram UNIQUE (diagram_id, user_id)
);

-- Indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_membership_level ON users(membership_level);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_diagrams_user_id ON diagrams(user_id);
CREATE INDEX idx_diagrams_is_public ON diagrams(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_diagrams_is_template ON diagrams(is_template) WHERE is_template = TRUE;
CREATE INDEX idx_diagrams_search_vector ON diagrams USING GIN(search_vector);
CREATE INDEX idx_diagrams_updated_at ON diagrams(updated_at DESC);
CREATE INDEX idx_diagrams_deleted_at ON diagrams(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_enterprises_diagram_id ON enterprises(diagram_id);
CREATE INDEX idx_enterprises_diagram_enterprise ON enterprises(diagram_id, enterprise_id);
CREATE INDEX idx_relationships_diagram_id ON relationships(diagram_id);
CREATE INDEX idx_diagram_versions_diagram_id ON diagram_versions(diagram_id, version_number DESC);
CREATE INDEX idx_collaborators_diagram_id ON diagram_collaborators(diagram_id);
CREATE INDEX idx_collaborators_user_id ON diagram_collaborators(user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diagrams_updated_at BEFORE UPDATE ON diagrams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get user's diagrams (including shared)
CREATE OR REPLACE FUNCTION get_user_diagrams(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    user_id UUID,
    is_owner BOOLEAN,
    permission VARCHAR,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.title,
        d.user_id,
        (d.user_id = user_uuid) as is_owner,
        CASE
            WHEN d.user_id = user_uuid THEN 'admin'::VARCHAR
            ELSE dc.permission::VARCHAR
        END as permission,
        d.updated_at
    FROM diagrams d
    LEFT JOIN diagram_collaborators dc ON d.id = dc.diagram_id AND dc.user_id = user_uuid
    WHERE d.user_id = user_uuid
        OR (dc.user_id = user_uuid AND dc.accepted_at IS NOT NULL)
    AND d.deleted_at IS NULL
    ORDER BY d.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check user permission on diagram
CREATE OR REPLACE FUNCTION check_diagram_permission(
    diagram_uuid UUID,
    user_uuid UUID,
    required_permission VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    user_permission VARCHAR;
    permission_level INTEGER;
    required_level INTEGER;
BEGIN
    -- Get user's permission
    SELECT CASE
        WHEN d.user_id = user_uuid THEN 'admin'
        ELSE dc.permission
    END INTO user_permission
    FROM diagrams d
    LEFT JOIN diagram_collaborators dc ON d.id = dc.diagram_id AND dc.user_id = user_uuid
    WHERE d.id = diagram_uuid
    AND d.deleted_at IS NULL;

    -- If no permission found, return false
    IF user_permission IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Convert permissions to levels
    permission_level := CASE user_permission
        WHEN 'admin' THEN 3
        WHEN 'edit' THEN 2
        WHEN 'view' THEN 1
        ELSE 0
    END;

    required_level := CASE required_permission
        WHEN 'admin' THEN 3
        WHEN 'edit' THEN 2
        WHEN 'view' THEN 1
        ELSE 0
    END;

    RETURN permission_level >= required_level;
END;
$$ LANGUAGE plpgsql;

-- Insert default admin user (password: admin123 - CHANGE THIS!)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (email, password_hash, full_name, membership_level, is_active, email_verified)
VALUES (
    'admin@principle5.coop',
    '$2a$10$vPrNJ3YSPo9WY8MxBs9Ak.oJ6qGP3.n6l9EQ5VHNkQ8nV5mwQZ3Iq',
    'Admin User',
    10,
    TRUE,
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Insert sample template diagrams
INSERT INTO diagrams (user_id, title, author, is_template, template_category, is_public)
SELECT
    id,
    'Basic Co-operative Ecosystem Template',
    'Principle 5',
    TRUE,
    'Getting Started',
    TRUE
FROM users WHERE email = 'admin@principle5.coop'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE users IS 'User accounts with Principle 5 membership information';
COMMENT ON TABLE diagrams IS 'Co-operative ecosystem diagrams';
COMMENT ON TABLE enterprises IS 'Enterprises within diagrams';
COMMENT ON TABLE relationships IS 'Relationships between enterprises';
COMMENT ON TABLE diagram_versions IS 'Version history for diagrams';
COMMENT ON TABLE diagram_collaborators IS 'Sharing and collaboration settings';
COMMENT ON COLUMN users.membership_level IS 'Principle 5 service level (1-10)';
COMMENT ON COLUMN diagrams.connector_style IS 'Relationship connector style: orthogonal or direct';
COMMENT ON COLUMN enterprises.roles IS 'JSON array of participation roles: producers, users, investors';
COMMENT ON COLUMN enterprises.tier IS 'Structural tier: primary, secondary, tertiary, or hybrid';
COMMENT ON COLUMN relationships.type IS 'Relationship type: G, I, L, M, O, P, S, or INNER';
