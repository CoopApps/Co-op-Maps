-- Co-opMaps Community Maps Schema
-- Schema for community-submitted maps with password protection
-- Run this after schema.sql and schema-extensions.sql

-- ============================================================
-- COMMUNITY MAPS & SUBMISSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS community_maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Map identification
    title VARCHAR(500) NOT NULL,
    author VARCHAR(255) NOT NULL,
    author_email VARCHAR(255),
    author_organization VARCHAR(255),

    -- Map metadata (from diagram properties)
    wdr VARCHAR(100),
    scope_geographic VARCHAR(50),
    scope_economic TEXT,
    scope_user_defined TEXT,
    period VARCHAR(50) DEFAULT 'present',
    diagram_date DATE,

    -- Map data (complete diagram JSON)
    diagram_data JSONB NOT NULL,
    thumbnail TEXT, -- Base64 encoded thumbnail

    -- Security
    password_hash VARCHAR(255) NOT NULL, -- bcrypt hash
    edit_token VARCHAR(255) UNIQUE, -- Token for password-less editing (optional)

    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'changes_requested', 'rejected', 'published')),
    is_public BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,

    -- View and interaction tracking
    view_count INTEGER DEFAULT 0,
    fork_count INTEGER DEFAULT 0,

    -- Admin moderation
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    admin_notes TEXT,
    rejection_reason VARCHAR(100),
    rejection_message TEXT,

    -- Change request tracking
    changes_requested JSONB, -- Array of requested changes
    changes_requested_at TIMESTAMP,

    -- Timestamps
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    deleted_at TIMESTAMP,

    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(author, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(scope_economic, '')), 'C')
    ) STORED
);

-- Indexes for community_maps
CREATE INDEX IF NOT EXISTS idx_community_maps_status ON community_maps(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_community_maps_public ON community_maps(is_public, published_at DESC) WHERE is_public = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_community_maps_author ON community_maps(author_email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_community_maps_search ON community_maps USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_community_maps_submitted ON community_maps(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_maps_edit_token ON community_maps(edit_token) WHERE edit_token IS NOT NULL;

-- ============================================================
-- MODERATION HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS map_moderation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES community_maps(id) ON DELETE CASCADE,
    moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,

    action VARCHAR(50) NOT NULL CHECK (action IN ('approve', 'reject', 'request_changes', 'unpublish', 'feature', 'unfeature')),
    previous_status VARCHAR(20),
    new_status VARCHAR(20),

    reason VARCHAR(100),
    message TEXT,
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_moderation_history_map ON map_moderation_history(map_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_history_moderator ON map_moderation_history(moderator_id);

-- ============================================================
-- MAP TAGS (separate from diagrams)
-- ============================================================

CREATE TABLE IF NOT EXISTS community_map_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES community_maps(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(map_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_community_map_tags_map ON community_map_tags(map_id);
CREATE INDEX IF NOT EXISTS idx_community_map_tags_tag ON community_map_tags(tag);

-- ============================================================
-- NOTIFICATION PREFERENCES FOR NON-REGISTERED AUTHORS
-- ============================================================

CREATE TABLE IF NOT EXISTS map_author_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES community_maps(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    notify_on_approval BOOLEAN DEFAULT TRUE,
    notify_on_changes_requested BOOLEAN DEFAULT TRUE,
    notify_on_rejection BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(map_id)
);

CREATE INDEX IF NOT EXISTS idx_map_author_notifications_email ON map_author_notifications(email);

-- ============================================================
-- ADMIN CONFIGURATION
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default admin password (MUST BE CHANGED IN PRODUCTION)
INSERT INTO admin_config (key, value, description)
VALUES
    ('admin_password_hash', '$2a$10$vPrNJ3YSPo9WY8MxBs9Ak.oJ6qGP3.n6l9EQ5VHNkQ8nV5mwQZ3Iq', 'Admin panel password (default: admin123) - CHANGE THIS!'),
    ('auto_approve_enabled', 'false', 'Automatically approve all submissions'),
    ('submissions_enabled', 'true', 'Allow new map submissions'),
    ('public_gallery_enabled', 'true', 'Show public gallery page')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- FUNCTIONS FOR COMMUNITY MAPS
-- ============================================================

-- Function to verify map password
CREATE OR REPLACE FUNCTION verify_map_password(map_uuid UUID, password_hash_input VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM community_maps
        WHERE id = map_uuid
          AND password_hash = password_hash_input
          AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_map_view_count(map_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE community_maps
    SET view_count = view_count + 1
    WHERE id = map_uuid
      AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to get moderation statistics
CREATE OR REPLACE FUNCTION get_moderation_stats()
RETURNS TABLE(
    total_submissions BIGINT,
    pending_count BIGINT,
    approved_count BIGINT,
    rejected_count BIGINT,
    published_count BIGINT,
    changes_requested_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_submissions,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        COUNT(*) FILTER (WHERE status = 'published') as published_count,
        COUNT(*) FILTER (WHERE status = 'changes_requested') as changes_requested_count
    FROM community_maps
    WHERE deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_edited_at
CREATE OR REPLACE FUNCTION update_community_map_edited_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_edited_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_community_map_timestamp
BEFORE UPDATE ON community_maps
FOR EACH ROW
WHEN (OLD.diagram_data IS DISTINCT FROM NEW.diagram_data)
EXECUTE FUNCTION update_community_map_edited_timestamp();

-- ============================================================
-- VIEWS FOR COMMUNITY MAPS
-- ============================================================

-- View for public gallery (approved and published maps only)
CREATE OR REPLACE VIEW public_community_maps AS
SELECT
    id,
    title,
    author,
    author_organization,
    wdr,
    scope_geographic,
    scope_economic,
    scope_user_defined,
    period,
    diagram_date,
    thumbnail,
    is_featured,
    view_count,
    fork_count,
    published_at,
    array(
        SELECT tag
        FROM community_map_tags
        WHERE map_id = community_maps.id
    ) as tags
FROM community_maps
WHERE is_public = TRUE
  AND status = 'published'
  AND deleted_at IS NULL
ORDER BY
    is_featured DESC,
    published_at DESC;

-- View for admin moderation queue
CREATE OR REPLACE VIEW moderation_queue AS
SELECT
    cm.id,
    cm.title,
    cm.author,
    cm.author_email,
    cm.status,
    cm.submitted_at,
    cm.last_edited_at,
    cm.changes_requested,
    cm.changes_requested_at,
    (
        SELECT COUNT(*)
        FROM map_moderation_history
        WHERE map_id = cm.id
    ) as moderation_action_count,
    (
        SELECT created_at
        FROM map_moderation_history
        WHERE map_id = cm.id
        ORDER BY created_at DESC
        LIMIT 1
    ) as last_moderation_action
FROM community_maps cm
WHERE cm.deleted_at IS NULL
  AND cm.status IN ('pending', 'changes_requested')
ORDER BY
    CASE cm.status
        WHEN 'pending' THEN 1
        WHEN 'changes_requested' THEN 2
    END,
    cm.submitted_at ASC;

COMMENT ON TABLE community_maps IS 'Community-submitted maps with password protection';
COMMENT ON TABLE map_moderation_history IS 'History of moderation actions on community maps';
COMMENT ON TABLE admin_config IS 'Configuration settings for admin panel';
