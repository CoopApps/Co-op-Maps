# Co-opMaps Advanced Features Implementation Guide

This document describes all the advanced features added to Co-opMaps and how to complete their implementation.

## ✅ Completed Features

### 1. Email Notification System
**Status**: ✅ Complete
**Files**: `server/services/emailService.js`

**Features**:
- Queue-based email sending
- Email templates for common notifications
- SMTP integration via nodemailer
- Support for password reset, collaboration invites, comments, mentions
- Daily digest emails
- User email preferences

**Usage**:
```javascript
const { queueEmail } = require('./services/emailService');

queueEmail({
    to: 'user@example.com',
    subject: 'Welcome!',
    templateName: 'collaboration-invite',
    templateData: { ... }
});
```

### 2. File Upload & Attachments
**Status**: ✅ Complete
**Files**: `server/middleware/upload.js`

**Features**:
- Multer-based file upload handling
- Support for multiple file types (images, PDFs, JSON)
- Type-specific size limits
- Secure filename generation
- Upload type categories (icon, background, profile, attachment)

**Usage**:
```javascript
const { createUploadMiddleware } = require('./middleware/upload');

router.post('/upload', createUploadMiddleware('icon'), (req, res) => {
    // req.file contains uploaded file info
});
```

### 3. Enhanced Database Schema
**Status**: ✅ Complete
**Files**: `server/db/schema-extensions.sql`

**New Tables**:
- `comments` - Diagram comments and discussions
- `mentions` - @mention tracking
- `tags` - Tagging system
- `diagram_tags` - Many-to-many tag relationships
- `attachments` - File attachments
- `notifications` - User notifications
- `activity_log` - Activity tracking
- `email_queue` - Email queue
- `export_jobs` - Server-side export tracking
- `organizations` - Team/organization support
- `organization_members` - Membership
- `saved_searches` - Saved search queries
- `rate_limit_violations` - Rate limit tracking
- `audit_log` - Admin audit trail
- `geographic_locations` - Geocoding support
- `import_jobs` - Bulk import tracking

**New Functions**:
- `create_notification()` - Create notifications
- `mark_notifications_read()` - Mark as read
- `get_unread_notification_count()` - Get unread count
- `log_activity()` - Log user activity

**New Views**:
- `diagram_activity_feed` - Activity feed for diagrams
- `user_notifications_detailed` - Notifications with details

### 4. Comments & Discussion System
**Status**: ✅ Complete
**Files**: `server/routes/comments.js`

**Endpoints**:
- `GET /api/diagrams/:diagramId/comments` - List comments
- `POST /api/diagrams/:diagramId/comments` - Add comment
- `PUT /api/comments/:commentId` - Edit comment
- `DELETE /api/comments/:commentId` - Delete comment
- `POST /api/comments/:commentId/resolve` - Mark resolved
- `POST /api/comments/:commentId/unresolve` - Mark unresolved

**Features**:
- Nested comments (replies)
- @mentions with notifications
- Resolve/unresolve discussions
- Email notifications for comments and mentions
- Soft delete

### 5. Notifications System
**Status**: ✅ Complete
**Files**: `server/routes/notifications.js`

**Endpoints**:
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/mark-read` - Mark as read
- `POST /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification
- `GET /api/notifications/unread-count` - Get unread count

**Notification Types**:
- `share` - Diagram shared
- `comment` - New comment
- `mention` - User mentioned
- `edit` - Diagram edited by collaborator
- `like` - Diagram liked
- `fork` - Diagram forked
- `system` - System notifications

### 6. Tags & Categories
**Status**: ✅ Complete
**Files**: `server/routes/tags.js`

**Endpoints**:
- `GET /api/tags` - List all tags
- `POST /api/tags` - Create tag
- `GET /api/diagrams/:diagramId/tags` - Get diagram tags
- `POST /api/diagrams/:diagramId/tags` - Add tag to diagram
- `DELETE /api/diagrams/:diagramId/tags/:tagId` - Remove tag

**Features**:
- Auto-create tags on first use
- Tag usage counting
- Search tags by name
- Color coding for tags

### 7. Rate Limiting
**Status**: ✅ Complete
**Files**: `server/middleware/rateLimiter.js`

**Predefined Limiters**:
- `api` - 100 req/min (general API)
- `auth` - 5 req/15min (authentication)
- `upload` - 10 req/hour (file uploads)
- `export` - 20 req/hour (exports)
- `email` - 10 req/hour (emails)
- `createDiagram` - 50 req/hour
- `publicApi` - 1000 req/hour

**Usage**:
```javascript
const { rateLimiters } = require('./middleware/rateLimiter');

router.post('/api/auth/login', rateLimiters.auth, loginHandler);
```

---

## 🚧 Partially Implemented Features

### 8. Activity Feed
**Status**: 🚧 Database ready, routes needed
**Next Steps**: Create `server/routes/activity.js`

**Endpoints to implement**:
```javascript
GET /api/diagrams/:id/activity  - Get activity feed for diagram
GET /api/users/me/activity      - Get user's activity
GET /api/activity/recent        - Get recent global activity
```

### 9. Server-Side Export
**Status**: 🚧 Database schema ready, needs implementation
**Next Steps**: Create `server/services/exportService.js` and routes

**Features needed**:
- PDF generation using Puppeteer
- High-resolution PNG rendering
- SVG export
- Batch export (ZIP multiple diagrams)
- Background job processing

**Endpoint structure**:
```javascript
POST /api/diagrams/:id/export    - Create export job
GET /api/export-jobs/:id          - Get job status
GET /api/export-jobs/:id/download - Download result
```

### 10. Bulk Import
**Status**: 🚧 Database schema ready, needs implementation
**Next Steps**: Create `server/services/importService.js` and routes

**Features needed**:
- CSV import (enterprises, relationships)
- JSON import (full diagrams)
- Excel import
- localStorage migration tool
- Progress tracking

**Endpoints**:
```javascript
POST /api/import/csv         - Import from CSV
POST /api/import/json        - Import from JSON
POST /api/import/localstorage - Migrate from localStorage
GET /api/import-jobs/:id     - Get import status
```

---

## ❌ Not Yet Implemented

### 11. Admin Panel
**Status**: ❌ Needs implementation
**Priority**: High

**Required routes** (`server/routes/admin.js`):
```javascript
// User management
GET /api/admin/users                - List all users
PUT /api/admin/users/:id/deactivate - Deactivate user
PUT /api/admin/users/:id/activate   - Activate user
DELETE /api/admin/users/:id         - Delete user

// Content moderation
GET /api/admin/diagrams             - List all diagrams
DELETE /api/admin/diagrams/:id      - Delete diagram
PUT /api/admin/diagrams/:id/feature - Feature diagram

// System stats
GET /api/admin/stats                - System statistics
GET /api/admin/audit-log            - Audit log
```

### 12. Advanced Search
**Status**: ❌ Needs implementation
**Priority**: Medium

**Features needed**:
- Filter by enterprise type
- Filter by date range
- Filter by author
- Filter by tags
- Saved searches
- Advanced query builder

**Endpoints** (`server/routes/search.js`):
```javascript
POST /api/search                - Advanced search
POST /api/search/save           - Save search
GET /api/search/saved           - Get saved searches
DELETE /api/search/saved/:id    - Delete saved search
```

### 13. Geographic Features
**Status**: ❌ Needs implementation
**Priority**: Low

**Features needed**:
- Geocoding for `scope_geographic`
- Map view of diagrams
- Filter by location
- Integration with geocoding API

**Endpoints** (`server/routes/geo.js`):
```javascript
POST /api/diagrams/:id/geocode  - Geocode diagram
GET /api/geo/map                - Get map view
GET /api/geo/nearby             - Find nearby diagrams
```

### 14. Organizations/Teams
**Status**: ❌ Database ready, routes needed
**Priority**: Medium

**Endpoints** (`server/routes/organizations.js`):
```javascript
POST /api/organizations                          - Create org
GET /api/organizations                           - List orgs
GET /api/organizations/:id                       - Get org
PUT /api/organizations/:id                       - Update org
DELETE /api/organizations/:id                    - Delete org
POST /api/organizations/:id/members              - Add member
DELETE /api/organizations/:id/members/:userId    - Remove member
PUT /api/organizations/:id/members/:userId/role  - Update role
```

### 15. Attachments API
**Status**: ❌ Upload middleware ready, routes needed
**Priority**: Medium

**Endpoints** (`server/routes/attachments.js`):
```javascript
POST /api/diagrams/:id/attachments   - Upload attachment
GET /api/diagrams/:id/attachments    - List attachments
GET /api/attachments/:id/download    - Download attachment
DELETE /api/attachments/:id          - Delete attachment
```

---

## 📋 Implementation Checklist

### Phase 1: Core Features (Week 1)
- [x] Email system
- [x] File uploads
- [x] Database schema
- [x] Comments & discussions
- [x] Notifications
- [x] Tags
- [x] Rate limiting

### Phase 2: Advanced Features (Week 2)
- [ ] Activity feed routes
- [ ] Admin panel
- [ ] Advanced search
- [ ] Attachments API
- [ ] Organizations/teams

### Phase 3: Import/Export (Week 3)
- [ ] Server-side export service
- [ ] PDF generation
- [ ] Bulk import service
- [ ] CSV/Excel import
- [ ] localStorage migration tool

### Phase 4: Polish (Week 4)
- [ ] Geographic features
- [ ] Saved searches
- [ ] Email digest cron job
- [ ] Comprehensive testing
- [ ] API documentation
- [ ] Performance optimization

---

## 🔧 Integration Steps

### 1. Update Main Server

Add new routes to `server/index.js`:

```javascript
// Import new routes
const commentsRoutes = require('./routes/comments');
const notificationsRoutes = require('./routes/notifications');
const tagsRoutes = require('./routes/tags');
const activityRoutes = require('./routes/activity');
const adminRoutes = require('./routes/admin');
const searchRoutes = require('./routes/search');
const attachmentsRoutes = require('./routes/attachments');

// Initialize email service
const { initializeEmailService } = require('./services/emailService');
initializeEmailService();

// Apply rate limiting
const { rateLimiters } = require('./middleware/rateLimiter');
app.use('/api/', rateLimiters.api);
app.use('/api/auth', rateLimiters.auth);

// Mount routes
app.use('/api/diagrams', commentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/attachments', attachmentsRoutes);
```

### 2. Run Database Migrations

```bash
# Run main schema
psql -d coopmaps -f server/db/schema.sql

# Run extensions
psql -d coopmaps -f server/db/schema-extensions.sql
```

### 3. Configure Environment

Add to `.env`:

```bash
# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM="Co-opMaps <noreply@coopmaps.org>"

# Application URL
APP_URL=https://coopmaps.example.com

# File Upload
MAX_FILE_SIZE_MB=10
UPLOAD_DIR=./uploads

# Export
EXPORT_TEMP_DIR=./exports
EXPORT_EXPIRY_HOURS=24

# Geocoding (optional)
GEOCODING_API_KEY=your-api-key
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Test Features

```bash
# Start server
npm run dev

# Test email (requires SMTP config)
curl -X POST http://localhost:3000/api/test-email

# Test notifications
curl -X GET http://localhost:3000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test tags
curl -X GET http://localhost:3000/api/tags
```

---

## 📚 Documentation Needed

### API Documentation
Create OpenAPI/Swagger documentation for all endpoints.

### User Guide
- How to use comments
- How to manage notifications
- How to tag diagrams
- How to share and collaborate
- How to import/export

### Admin Guide
- User management
- Content moderation
- System monitoring
- Backup procedures

---

## 🎯 Next Steps Summary

**Immediate (can implement now)**:
1. Create activity feed routes
2. Implement attachments API
3. Build admin panel basics

**Short-term (this week)**:
4. Advanced search implementation
5. Organizations/teams routes
6. Email digest cron job

**Medium-term (next 2 weeks)**:
7. Server-side export service
8. Bulk import functionality
9. localStorage migration tool

**Long-term (future)**:
10. Geographic features
11. Analytics dashboard
12. Mobile app API
13. Webhooks for integrations

---

## 💡 Tips

1. **Test incrementally** - Test each feature as you implement it
2. **Use transactions** - Wrap complex operations in database transactions
3. **Log everything** - Use the activity_log for debugging
4. **Email carefully** - Don't spam users; respect email preferences
5. **Rate limit wisely** - Adjust limits based on actual usage
6. **Monitor performance** - Watch database query performance
7. **Security first** - Always check permissions before operations

---

## 🐛 Known Issues & TODOs

- [ ] Email queue processor needs to run as separate service/cron
- [ ] File cleanup for expired exports
- [ ] Thumbnail generation for uploaded images (requires Sharp configuration)
- [ ] Full-text search needs to be optimized for large datasets
- [ ] WebSocket authentication for real-time features
- [ ] Backup strategy for uploaded files
- [ ] CDN integration for static assets
- [ ] Database connection pooling optimization

---

## 📞 Support

For questions about implementing these features, refer to:
- Database schema: `server/db/schema-extensions.sql`
- Example routes: `server/routes/comments.js`, `server/routes/notifications.js`
- Services: `server/services/emailService.js`
- Middleware: `server/middleware/upload.js`, `server/middleware/rateLimiter.js`
