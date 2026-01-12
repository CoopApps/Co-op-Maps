-- WDR (World Directory Reference) Official Numbering System
-- Run this migration to add official WDR numbering support

-- ============================================================
-- WDR SEQUENCE TABLE
-- ============================================================

-- Sequence table to track the next WDR number
CREATE TABLE IF NOT EXISTS wdr_sequence (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Only one row
    next_number INTEGER NOT NULL DEFAULT 1,
    prefix VARCHAR(10) NOT NULL DEFAULT 'WDR',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize the sequence if not exists
INSERT INTO wdr_sequence (id, next_number, prefix)
VALUES (1, 1, 'WDR')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ADD OFFICIAL WDR COLUMNS TO COMMUNITY_MAPS
-- ============================================================

-- Add official_wdr column for the assigned WDR number
ALTER TABLE community_maps
ADD COLUMN IF NOT EXISTS official_wdr VARCHAR(20) UNIQUE;

-- Add wdr_status column to track provisional vs official
ALTER TABLE community_maps
ADD COLUMN IF NOT EXISTS wdr_status VARCHAR(20) DEFAULT 'provisional'
CHECK (wdr_status IN ('provisional', 'official'));

-- Index for quick lookup by official WDR
CREATE INDEX IF NOT EXISTS idx_community_maps_official_wdr
ON community_maps(official_wdr) WHERE official_wdr IS NOT NULL;

-- ============================================================
-- FUNCTION TO GET NEXT WDR NUMBER
-- ============================================================

CREATE OR REPLACE FUNCTION get_next_wdr_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    current_num INTEGER;
    wdr_prefix VARCHAR(10);
    new_wdr VARCHAR(20);
BEGIN
    -- Lock the row for update to prevent race conditions
    SELECT next_number, prefix INTO current_num, wdr_prefix
    FROM wdr_sequence
    WHERE id = 1
    FOR UPDATE;

    -- Format: WDR-0001 (4 digits, zero-padded)
    new_wdr := wdr_prefix || '-' || LPAD(current_num::TEXT, 4, '0');

    -- Increment the sequence
    UPDATE wdr_sequence
    SET next_number = next_number + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1;

    RETURN new_wdr;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION TO ASSIGN WDR ON APPROVAL
-- ============================================================

CREATE OR REPLACE FUNCTION assign_official_wdr(map_uuid UUID, custom_wdr VARCHAR DEFAULT NULL)
RETURNS VARCHAR(20) AS $$
DECLARE
    assigned_wdr VARCHAR(20);
    existing_wdr VARCHAR(20);
BEGIN
    -- Check if map already has an official WDR
    SELECT official_wdr INTO existing_wdr
    FROM community_maps
    WHERE id = map_uuid;

    IF existing_wdr IS NOT NULL THEN
        RETURN existing_wdr; -- Already has one, return it
    END IF;

    -- Use custom WDR if provided, otherwise generate next in sequence
    IF custom_wdr IS NOT NULL THEN
        assigned_wdr := custom_wdr;
    ELSE
        assigned_wdr := get_next_wdr_number();
    END IF;

    -- Update the map with the official WDR
    UPDATE community_maps
    SET official_wdr = assigned_wdr,
        wdr_status = 'official'
    WHERE id = map_uuid;

    RETURN assigned_wdr;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE wdr_sequence IS 'Sequence tracker for official WDR numbers';
COMMENT ON COLUMN community_maps.official_wdr IS 'Official World Directory Reference number (e.g., WDR-0001)';
COMMENT ON COLUMN community_maps.wdr_status IS 'Status of WDR: provisional (user-assigned) or official (admin-assigned)';
COMMENT ON FUNCTION get_next_wdr_number() IS 'Gets the next WDR number in sequence and increments counter';
COMMENT ON FUNCTION assign_official_wdr(UUID, VARCHAR) IS 'Assigns an official WDR to a map, either custom or auto-generated';
