-- Co-opMaps Database Cleanup Script
-- This script removes tables and features that are not used in the current application
--
-- USAGE: Run this script ONLY if you want to clean up unused schema elements
-- This is OPTIONAL - the unused tables don't cause any issues
--
-- IMPORTANT: Review what you're deleting before running!
-- Back up your database first: pg_dump -h host -U user -d database > backup.sql

-- ============================================================
-- TABLES NOT USED BY CURRENT APPLICATION
-- ============================================================

-- These tables were designed for features that are not implemented:

-- 1. Server-side export jobs (export is done client-side)
DROP TABLE IF EXISTS export_jobs CASCADE;

-- 2. Server-side import jobs (import is done client-side via CSV parsing)
DROP TABLE IF EXISTS import_jobs CASCADE;

-- 3. Organizations/Teams feature (not implemented - app uses per-map passwords instead)
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- 4. Saved searches (not implemented)
DROP TABLE IF EXISTS saved_searches CASCADE;

-- 5. Rate limit violations tracking (not implemented - using redis/memory instead)
DROP TABLE IF EXISTS rate_limit_violations CASCADE;

-- 6. Admin audit log (not implemented)
DROP TABLE IF EXISTS audit_log CASCADE;

-- 7. Geographic locations for diagrams (not implemented)
DROP TABLE IF EXISTS geographic_locations CASCADE;

-- 8. File attachments (not implemented)
DROP TABLE IF EXISTS attachments CASCADE;

-- 9. Activity log (not actively used - designed for registered users)
-- Note: Keep this if you want to implement activity feeds later
DROP TABLE IF EXISTS activity_log CASCADE;

-- ============================================================
-- COLUMNS THAT MAY BE UNUSED
-- ============================================================

-- These columns were added by schema-extensions.sql but may not be used:

-- Remove organization_id from diagrams (organizations feature not used)
ALTER TABLE diagrams DROP COLUMN IF EXISTS organization_id;

-- ============================================================
-- CLEANUP VIEWS THAT REFERENCE DROPPED TABLES
-- ============================================================

DROP VIEW IF EXISTS diagram_activity_feed CASCADE;

-- ============================================================
-- NOTES ON TABLES WE'RE KEEPING
-- ============================================================

-- KEEPING: users - needed for admin authentication and diagram ownership
-- KEEPING: refresh_tokens - needed for JWT authentication
-- KEEPING: diagrams, enterprises, relationships - core diagram storage
-- KEEPING: diagram_versions - version history (useful feature)
-- KEEPING: diagram_collaborators - diagram sharing
-- KEEPING: comments, mentions - comment system is implemented
-- KEEPING: tags, diagram_tags - tagging system is implemented
-- KEEPING: notifications - notification system is implemented
-- KEEPING: email_queue - actively used by email service
-- KEEPING: community_maps and related - core community feature
-- KEEPING: admin_config - admin panel settings

-- ============================================================
-- POST-CLEANUP: Update schema files to reflect changes
-- ============================================================

-- After running this cleanup, you may want to update schema-extensions.sql
-- to not create these tables on fresh installs. However, keeping them in
-- schema files as comments/documentation is also fine.

SELECT 'Cleanup complete. Unused tables have been removed.' as status;
