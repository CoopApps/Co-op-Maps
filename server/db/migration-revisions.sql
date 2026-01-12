-- Migration: Add revision tracking for community maps
-- This allows users to submit updates to approved maps that require approval

-- Add revision tracking columns to community_maps
ALTER TABLE community_maps ADD COLUMN IF NOT EXISTS parent_map_id UUID REFERENCES community_maps(id) ON DELETE SET NULL;
ALTER TABLE community_maps ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 1;
ALTER TABLE community_maps ADD COLUMN IF NOT EXISTS is_current_revision BOOLEAN DEFAULT TRUE;
ALTER TABLE community_maps ADD COLUMN IF NOT EXISTS replaces_map_id UUID REFERENCES community_maps(id) ON DELETE SET NULL;
ALTER TABLE community_maps ADD COLUMN IF NOT EXISTS hide_original BOOLEAN DEFAULT FALSE;

-- Index for finding revisions of a map
CREATE INDEX IF NOT EXISTS idx_community_maps_parent ON community_maps(parent_map_id) WHERE parent_map_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_maps_official_wdr ON community_maps(official_wdr) WHERE official_wdr IS NOT NULL;

-- Function to get all revisions of a map (by WDR)
CREATE OR REPLACE FUNCTION get_map_revisions(wdr_code VARCHAR)
RETURNS TABLE(
    id UUID,
    title VARCHAR,
    author VARCHAR,
    revision_number INTEGER,
    status VARCHAR,
    is_current_revision BOOLEAN,
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cm.id,
        cm.title,
        cm.author,
        cm.revision_number,
        cm.status,
        cm.is_current_revision,
        cm.submitted_at,
        cm.reviewed_at
    FROM community_maps cm
    WHERE cm.official_wdr = wdr_code
       OR cm.parent_map_id IN (
           SELECT id FROM community_maps WHERE official_wdr = wdr_code
       )
    ORDER BY cm.revision_number DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to approve a revision and optionally hide original
CREATE OR REPLACE FUNCTION approve_revision(
    revision_id UUID,
    hide_prev BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
DECLARE
    parent_id UUID;
    parent_wdr VARCHAR;
    next_rev INTEGER;
BEGIN
    -- Get the parent map info
    SELECT parent_map_id INTO parent_id FROM community_maps WHERE id = revision_id;

    IF parent_id IS NOT NULL THEN
        -- Get parent's WDR and calculate next revision number
        SELECT official_wdr, COALESCE(MAX(revision_number), 0) + 1
        INTO parent_wdr, next_rev
        FROM community_maps
        WHERE id = parent_id OR parent_map_id = parent_id
        GROUP BY official_wdr;

        -- Mark old current revision as not current
        UPDATE community_maps
        SET is_current_revision = FALSE
        WHERE (id = parent_id OR parent_map_id = parent_id)
          AND is_current_revision = TRUE;

        -- If hiding original, mark it
        IF hide_prev THEN
            UPDATE community_maps
            SET hide_original = TRUE
            WHERE id = parent_id;
        END IF;

        -- Approve the revision
        UPDATE community_maps
        SET status = 'approved',
            is_public = TRUE,
            is_current_revision = TRUE,
            revision_number = next_rev,
            official_wdr = parent_wdr,
            reviewed_at = CURRENT_TIMESTAMP,
            published_at = CURRENT_TIMESTAMP
        WHERE id = revision_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
