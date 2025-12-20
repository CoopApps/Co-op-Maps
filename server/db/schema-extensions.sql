-- Co-opMaps Database Schema Extensions
-- Additional tables for advanced features
-- Run this after the main schema.sql

-- ============================================================
-- COMMENTS & DISCUSSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_comments_diagram ON comments(diagram_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);

-- ============================================================
-- MENTIONS (for @mentions in comments)
-- ============================================================

CREATE TABLE IF NOT EXISTS mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mentions_user ON mentions(mentioned_user_id);
CREATE INDEX idx_mentions_comment ON mentions(comment_id);

-- ============================================================
-- TAGS & CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usage_count INTEGER DEFAULT 0
);

CREATE INDEX idx_tags_name ON tags(name);

CREATE TABLE IF NOT EXISTS diagram_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(diagram_id, tag_id)
);

CREATE INDEX idx_diagram_tags_diagram ON diagram_tags(diagram_id);
CREATE INDEX idx_diagram_tags_tag ON diagram_tags(tag_id);

-- ============================================================
-- FILE ATTACHMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagram_id UUID REFERENCES diagrams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL, -- in bytes
    attachment_type VARCHAR(50) NOT NULL CHECK (attachment_type IN ('diagram', 'comment', 'icon', 'background', 'profile')),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_attachments_diagram ON attachments(diagram_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_attachments_user ON attachments(user_id);
CREATE INDEX idx_attachments_type ON attachments(attachment_type);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('share', 'comment', 'mention', 'edit', 'like', 'fork', 'system')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500), -- URL to relevant resource
    related_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who triggered this notification
    related_diagram_id UUID REFERENCES diagrams(id) ON DELETE CASCADE,
    related_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    is_email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================================
-- ACTIVITY LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    diagram_id UUID REFERENCES diagrams(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'view', 'share', 'comment', 'fork', 'export')),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('diagram', 'enterprise', 'relationship', 'comment', 'user')),
    entity_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_diagram ON activity_log(diagram_id);
CREATE INDEX idx_activity_log_action ON activity_log(action);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- ============================================================
-- EMAIL QUEUE
-- ============================================================

CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    to_email VARCHAR(255) NOT NULL,
    to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    body_text TEXT NOT NULL,
    body_html TEXT,
    template_name VARCHAR(100),
    template_data JSONB,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1 = highest
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    failed_at TIMESTAMP
);

CREATE INDEX idx_email_queue_status ON email_queue(status, scheduled_for);
CREATE INDEX idx_email_queue_user ON email_queue(to_user_id);

-- ============================================================
-- EXPORT JOBS (for server-side export)
-- ============================================================

CREATE TABLE IF NOT EXISTS export_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    diagram_ids UUID[], -- Array of diagram IDs to export
    format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'png', 'svg', 'json', 'zip')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_path VARCHAR(500),
    file_size INTEGER,
    error_message TEXT,
    options JSONB, -- Export options (resolution, page size, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours'
);

CREATE INDEX idx_export_jobs_user ON export_jobs(user_id);
CREATE INDEX idx_export_jobs_status ON export_jobs(status);

-- ============================================================
-- ORGANIZATIONS/TEAMS
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    website VARCHAR(255),
    logo_url VARCHAR(500),
    membership_level_required INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- Link diagrams to organizations
ALTER TABLE diagrams ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_diagrams_organization ON diagrams(organization_id);

-- ============================================================
-- SAVED SEARCHES
-- ============================================================

CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    query JSONB NOT NULL, -- Stored search parameters
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP
);

CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);

-- ============================================================
-- RATE LIMITING TRACKING
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limit_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    attempts INTEGER DEFAULT 1,
    first_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_until TIMESTAMP
);

CREATE INDEX idx_rate_limit_user ON rate_limit_violations(user_id);
CREATE INDEX idx_rate_limit_ip ON rate_limit_violations(ip_address);

-- ============================================================
-- AUDIT LOG (for admin panel)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    changes JSONB, -- Before/after values
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_admin ON audit_log(admin_user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================================
-- USER PREFERENCES ENHANCEMENTS
-- ============================================================

-- Add notification preferences to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
    "email_on_share": true,
    "email_on_comment": true,
    "email_on_mention": true,
    "email_digest": "daily",
    "in_app_notifications": true
}'::jsonb;

-- Add admin flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- ============================================================
-- ENHANCED RELATIONSHIP PROPERTIES
-- ============================================================

ALTER TABLE relationships ADD COLUMN IF NOT EXISTS label VARCHAR(255);
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS strength INTEGER CHECK (strength BETWEEN 1 AND 10);
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS is_bidirectional BOOLEAN DEFAULT FALSE;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS color VARCHAR(7);
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS style VARCHAR(50);

-- ============================================================
-- GEOGRAPHIC ENHANCEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS geographic_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    country VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    geocoded_at TIMESTAMP,
    UNIQUE(diagram_id)
);

CREATE INDEX idx_geo_locations_diagram ON geographic_locations(diagram_id);
CREATE INDEX idx_geo_locations_coords ON geographic_locations(latitude, longitude);

-- ============================================================
-- IMPORT JOBS
-- ============================================================

CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('csv', 'json', 'localstorage', 'excel')),
    file_path VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_records INTEGER,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    error_log JSONB,
    created_diagrams UUID[], -- Array of created diagram IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_import_jobs_user ON import_jobs(user_id);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);

-- ============================================================
-- FUNCTIONS FOR NEW FEATURES
-- ============================================================

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM notifications
        WHERE user_id = user_uuid AND is_read = FALSE
    );
END;
$$ LANGUAGE plpgsql;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(user_uuid UUID, notification_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications
    SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
    WHERE user_id = user_uuid
      AND id = ANY(notification_ids)
      AND is_read = FALSE;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type VARCHAR,
    p_title VARCHAR,
    p_message TEXT,
    p_link VARCHAR DEFAULT NULL,
    p_related_user_id UUID DEFAULT NULL,
    p_related_diagram_id UUID DEFAULT NULL,
    p_related_comment_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id, type, title, message, link,
        related_user_id, related_diagram_id, related_comment_id
    ) VALUES (
        p_user_id, p_type, p_title, p_message, p_link,
        p_related_user_id, p_related_diagram_id, p_related_comment_id
    ) RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_diagram_id UUID,
    p_action VARCHAR,
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO activity_log (
        user_id, diagram_id, action, entity_type, entity_id,
        details, ip_address, user_agent
    ) VALUES (
        p_user_id, p_diagram_id, p_action, p_entity_type, p_entity_id,
        p_details, p_ip_address, p_user_agent
    ) RETURNING id INTO activity_id;

    RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tag_usage
AFTER INSERT OR DELETE ON diagram_tags
FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- ============================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================

-- View for diagram activity feed
CREATE OR REPLACE VIEW diagram_activity_feed AS
SELECT
    al.id,
    al.created_at,
    al.action,
    al.entity_type,
    d.id as diagram_id,
    d.title as diagram_title,
    u.id as user_id,
    u.full_name as user_name,
    u.email as user_email,
    al.details
FROM activity_log al
LEFT JOIN diagrams d ON al.diagram_id = d.id
LEFT JOIN users u ON al.user_id = u.id
WHERE al.diagram_id IS NOT NULL
ORDER BY al.created_at DESC;

-- View for user notifications with details
CREATE OR REPLACE VIEW user_notifications_detailed AS
SELECT
    n.id,
    n.user_id,
    n.type,
    n.title,
    n.message,
    n.link,
    n.is_read,
    n.created_at,
    n.read_at,
    related_user.full_name as related_user_name,
    d.title as diagram_title,
    c.content as comment_content
FROM notifications n
LEFT JOIN users related_user ON n.related_user_id = related_user.id
LEFT JOIN diagrams d ON n.related_diagram_id = d.id
LEFT JOIN comments c ON n.related_comment_id = c.id
ORDER BY n.created_at DESC;

COMMENT ON TABLE comments IS 'Comments and discussions on diagrams';
COMMENT ON TABLE notifications IS 'User notifications for various events';
COMMENT ON TABLE tags IS 'Tags for categorizing diagrams';
COMMENT ON TABLE attachments IS 'File attachments for diagrams and comments';
COMMENT ON TABLE activity_log IS 'Activity log for all user actions';
COMMENT ON TABLE email_queue IS 'Queue for outgoing emails';
COMMENT ON TABLE export_jobs IS 'Server-side export job tracking';
COMMENT ON TABLE organizations IS 'Organizations/teams for collaborative work';
