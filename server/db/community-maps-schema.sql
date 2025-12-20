-- Community Maps Schema Extension
-- Adds public map submissions with password-based editing (no user accounts required)
-- For the simple co-operative mapping tool public gallery

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS moderation_history CASCADE;
DROP TABLE IF EXISTS email_queue CASCADE;
DROP TABLE IF EXISTS community_maps CASCADE;

-- Community Maps table (separate from user diagrams)
-- These are publicly submitted maps that don't require user accounts
CREATE TABLE community_maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic information
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,  -- For communication
    organization VARCHAR(255),
    description TEXT,
    tags TEXT[],

    -- Security
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt hash for editing

    -- Diagram data
    diagram_data JSONB NOT NULL,  -- Full diagram state
    thumbnail TEXT,  -- base64 encoded PNG

    -- Status and moderation
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
    admin_notes TEXT,  -- Internal notes for admin
    rejection_reason TEXT,

    -- Approval tracking
    approved_by VARCHAR(255),  -- "Principle 5" or admin email
    approved_at TIMESTAMP,
    published_at TIMESTAMP,

    -- Statistics
    view_count INTEGER DEFAULT 0,
    edit_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(author, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
        setweight(to_tsvector('english', array_to_string(coalesce(tags, ARRAY[]::TEXT[]), ' ')), 'D')
    ) STORED
);

-- Moderation history table
-- Tracks all actions taken on community maps
CREATE TABLE moderation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID REFERENCES community_maps(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('submitted', 'reviewed', 'approved', 'rejected', 'edited', 'changes_requested', 'unpublished', 'archived')),
    performed_by VARCHAR(255) NOT NULL,  -- email or "Admin"
    notes TEXT,
    metadata JSONB,  -- Additional data like checklist, email content, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email queue for notifications
-- Tracks emails sent to map creators
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    map_id UUID REFERENCES community_maps(id) ON DELETE SET NULL,
    email_type VARCHAR(50) NOT NULL CHECK (email_type IN ('submission_received', 'approved', 'rejected', 'changes_requested', 'unpublished')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_community_maps_status ON community_maps(status);
CREATE INDEX idx_community_maps_approved ON community_maps(status, published_at DESC) WHERE status = 'approved';
CREATE INDEX idx_community_maps_pending ON community_maps(status, created_at DESC) WHERE status = 'pending';
CREATE INDEX idx_community_maps_author ON community_maps(author);
CREATE INDEX idx_community_maps_email ON community_maps(email);
CREATE INDEX idx_community_maps_search_vector ON community_maps USING GIN(search_vector);
CREATE INDEX idx_community_maps_tags ON community_maps USING GIN(tags);
CREATE INDEX idx_moderation_history_map_id ON moderation_history(map_id, created_at DESC);
CREATE INDEX idx_email_queue_status ON email_queue(status, created_at DESC);
CREATE INDEX idx_email_queue_map_id ON email_queue(map_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_community_maps_updated_at BEFORE UPDATE ON community_maps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log moderation actions
CREATE OR REPLACE FUNCTION log_moderation_action(
    p_map_id UUID,
    p_action VARCHAR,
    p_performed_by VARCHAR,
    p_notes TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    history_id UUID;
BEGIN
    INSERT INTO moderation_history (map_id, action, performed_by, notes, metadata)
    VALUES (p_map_id, p_action, p_performed_by, p_notes, p_metadata)
    RETURNING id INTO history_id;

    RETURN history_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get approved maps for public gallery
CREATE OR REPLACE FUNCTION get_approved_maps(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    author VARCHAR,
    organization VARCHAR,
    description TEXT,
    tags TEXT[],
    thumbnail TEXT,
    view_count INTEGER,
    published_at TIMESTAMP,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cm.id,
        cm.title,
        cm.author,
        cm.organization,
        cm.description,
        cm.tags,
        cm.thumbnail,
        cm.view_count,
        cm.published_at,
        cm.created_at
    FROM community_maps cm
    WHERE cm.status = 'approved'
    AND (
        p_search IS NULL
        OR cm.search_vector @@ plainto_tsquery('english', p_search)
    )
    ORDER BY cm.published_at DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending maps for admin review
CREATE OR REPLACE FUNCTION get_pending_maps_for_review()
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    author VARCHAR,
    email VARCHAR,
    organization VARCHAR,
    description TEXT,
    tags TEXT[],
    created_at TIMESTAMP,
    admin_notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cm.id,
        cm.title,
        cm.author,
        cm.email,
        cm.organization,
        cm.description,
        cm.tags,
        cm.created_at,
        cm.admin_notes
    FROM community_maps cm
    WHERE cm.status = 'pending'
    ORDER BY cm.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_map_view_count(p_map_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE community_maps
    SET view_count = view_count + 1
    WHERE id = p_map_id;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE community_maps IS 'Publicly submitted co-operative ecosystem maps (no user account required)';
COMMENT ON COLUMN community_maps.password_hash IS 'Bcrypt hash for password-protected editing';
COMMENT ON COLUMN community_maps.diagram_data IS 'Full diagram state as JSON (enterprises, relationships, properties)';
COMMENT ON COLUMN community_maps.status IS 'Moderation status: pending (default), approved (public), rejected, archived';
COMMENT ON TABLE moderation_history IS 'Audit trail of all moderation actions on community maps';
COMMENT ON TABLE email_queue IS 'Queue for sending notification emails to map creators';
