# Co-opMaps Backend Setup Guide

## Overview

The Co-opMaps backend provides two systems:
1. **User System**: Full user accounts with authentication, collaboration, and private diagrams
2. **Community Maps System**: Public map submissions with password-based editing (no accounts required)

This guide focuses on setting up the Community Maps system for Principle 5.

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- PostgreSQL 13+
- Redis (optional, for caching)

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Set up database:**
```bash
# Create database
createdb coopmaps

# Run main schema
psql coopmaps < server/db/schema.sql

# Run community maps schema
psql coopmaps < server/db/community-maps-schema.sql
```

4. **Set admin password:**
```bash
# Generate bcrypt hash
node -e "console.log(require('bcryptjs').hashSync('your_password', 10))"

# Add to .env file:
# ADMIN_PASSWORD=$2a$10$...hash...
```

5. **Start server:**
```bash
npm run dev  # Development mode
npm start    # Production mode
```

Server will run on `http://localhost:3000`

## Database Schema

### Community Maps Tables

#### `community_maps`
Stores publicly submitted maps (no user account required)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | VARCHAR(255) | Map title |
| author | VARCHAR(255) | Creator name |
| email | VARCHAR(255) | Contact email |
| organization | VARCHAR(255) | Optional organization |
| description | TEXT | Map description |
| tags | TEXT[] | Search tags |
| password_hash | VARCHAR(255) | Bcrypt hash for editing |
| diagram_data | JSONB | Full diagram state |
| thumbnail | TEXT | Base64 PNG thumbnail |
| status | VARCHAR(50) | pending, approved, rejected, archived |
| admin_notes | TEXT | Internal notes |
| rejection_reason | TEXT | If rejected |
| approved_by | VARCHAR(255) | "Principle 5" or admin email |
| view_count | INTEGER | Number of views |
| created_at | TIMESTAMP | Submission date |
| published_at | TIMESTAMP | When approved |

#### `moderation_history`
Audit trail of all actions

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| map_id | UUID | Reference to community_maps |
| action | VARCHAR(50) | submitted, reviewed, approved, rejected, etc. |
| performed_by | VARCHAR(255) | Who performed action |
| notes | TEXT | Action details |
| metadata | JSONB | Additional data |
| created_at | TIMESTAMP | When action occurred |

#### `email_queue`
Tracks emails sent to creators

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| recipient_email | VARCHAR(255) | To email |
| subject | VARCHAR(255) | Email subject |
| body | TEXT | Email content |
| map_id | UUID | Related map |
| email_type | VARCHAR(50) | submission_received, approved, etc. |
| status | VARCHAR(50) | pending, sent, failed |
| sent_at | TIMESTAMP | When sent |

## API Endpoints

### Public Maps API (`/api/maps`)

#### Get Approved Maps
```http
GET /api/maps/approved?limit=50&offset=0&search=energy&tags=renewable,uk
```

**Response:**
```json
{
  "success": true,
  "maps": [
    {
      "id": "uuid",
      "title": "Green Energy Network",
      "author": "Jane Smith",
      "organization": "Energy Co-op UK",
      "description": "Renewable energy cooperatives",
      "tags": ["energy", "renewable", "uk"],
      "thumbnail": "data:image/png;base64,...",
      "view_count": 123,
      "published_at": "2025-12-20T10:00:00Z",
      "created_at": "2025-12-18T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 23,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

#### Get Specific Map
```http
GET /api/maps/:id
```

**Response:**
```json
{
  "success": true,
  "map": {
    "id": "uuid",
    "title": "Green Energy Network",
    "author": "Jane Smith",
    "diagram_data": {
      "enterprises": [...],
      "relationships": [...],
      "diagramProperties": {...}
    },
    "thumbnail": "data:image/png;base64,...",
    "view_count": 124
  }
}
```

#### Submit New Map
```http
POST /api/maps/submit
Content-Type: application/json

{
  "title": "My Map",
  "author": "John Doe",
  "email": "john@example.com",
  "organization": "Co-op Name",
  "description": "Description here",
  "tags": ["tag1", "tag2"],
  "password": "secure_password",
  "diagramData": {
    "enterprises": [...],
    "relationships": [...],
    "diagramProperties": {...}
  },
  "thumbnail": "data:image/png;base64,..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Map submitted successfully and is pending review",
  "mapId": "uuid",
  "map": {
    "id": "uuid",
    "title": "My Map",
    "author": "John Doe",
    "createdAt": "2025-12-20T15:00:00Z"
  }
}
```

#### Edit Map
```http
PUT /api/maps/:id/edit
X-Map-Password: creator_password
Content-Type: application/json

{
  "diagramData": {
    "enterprises": [...],
    "relationships": [...],
    "diagramProperties": {...}
  },
  "thumbnail": "data:image/png;base64,..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Map updated successfully",
  "map": {
    "id": "uuid",
    "title": "My Map",
    "updatedAt": "2025-12-20T16:00:00Z"
  }
}
```

#### Verify Password
```http
GET /api/maps/:id/verify-password
X-Map-Password: password_to_verify
```

**Response:**
```json
{
  "success": true,
  "valid": true
}
```

### Admin API (`/api/admin`)

All admin endpoints require `X-Admin-Password` header.

#### Get Dashboard Stats
```http
GET /api/admin/stats
X-Admin-Password: admin_password
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "byStatus": {
      "pending": 5,
      "approved": 23,
      "rejected": 2,
      "archived": 1
    },
    "totalViews": 1234,
    "recentSubmissions": 3,
    "topAuthors": [
      { "author": "Jane Smith", "map_count": 5 },
      { "author": "John Doe", "map_count": 3 }
    ],
    "mostViewed": [
      {
        "id": "uuid",
        "title": "UK Food Cooperatives",
        "author": "Jane Smith",
        "view_count": 234
      }
    ]
  }
}
```

#### Get All Submissions
```http
GET /api/admin/submissions?status=pending&author=Jane&sort=created_at&order=DESC&limit=50&offset=0
X-Admin-Password: admin_password
```

**Response:**
```json
{
  "success": true,
  "submissions": [
    {
      "id": "uuid",
      "title": "Green Energy Network",
      "author": "Jane Smith",
      "email": "jane@example.com",
      "organization": "Energy Co-op",
      "description": "...",
      "status": "pending",
      "created_at": "2025-12-20T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

#### Get Submission Details
```http
GET /api/admin/submissions/:id
X-Admin-Password: admin_password
```

**Response:**
```json
{
  "success": true,
  "submission": {
    "id": "uuid",
    "title": "Green Energy Network",
    "author": "Jane Smith",
    "email": "jane@example.com",
    "diagram_data": {...},
    "thumbnail": "...",
    "status": "pending",
    "admin_notes": null
  },
  "history": [
    {
      "action": "submitted",
      "performed_by": "jane@example.com",
      "notes": "Map submitted for review",
      "created_at": "2025-12-20T10:00:00Z"
    }
  ]
}
```

#### Approve Map
```http
POST /api/admin/submissions/:id/approve
X-Admin-Password: admin_password
Content-Type: application/json

{
  "adminNotes": "Excellent quality map",
  "notifyAuthor": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Map approved and published",
  "map": {
    "id": "uuid",
    "title": "Green Energy Network",
    "status": "approved",
    "publishedAt": "2025-12-20T15:00:00Z"
  }
}
```

#### Request Changes
```http
POST /api/admin/submissions/:id/request-changes
X-Admin-Password: admin_password
Content-Type: application/json

{
  "message": "Please add relationship labels and fix positioning",
  "checklist": [
    "Add relationship labels",
    "Fix NCM positioning",
    "Add enterprise descriptions"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Change request sent to creator",
  "emailSent": true
}
```

#### Reject Map
```http
POST /api/admin/submissions/:id/reject
X-Admin-Password: admin_password
Content-Type: application/json

{
  "reason": "Low quality / incomplete",
  "message": "The map needs significant improvements...",
  "deleteMap": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Map rejected",
  "emailSent": true
}
```

#### Unpublish Map
```http
POST /api/admin/maps/:id/unpublish
X-Admin-Password: admin_password
Content-Type: application/json

{
  "reason": "Outdated information",
  "notifyAuthor": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Map unpublished"
}
```

#### Get Moderation History
```http
GET /api/admin/maps/:id/history
X-Admin-Password: admin_password
```

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "id": "uuid",
      "action": "approved",
      "performed_by": "Admin",
      "notes": "Excellent quality map",
      "created_at": "2025-12-20T15:00:00Z"
    },
    {
      "id": "uuid",
      "action": "submitted",
      "performed_by": "jane@example.com",
      "notes": "Map submitted for review",
      "created_at": "2025-12-20T10:00:00Z"
    }
  ]
}
```

#### Bulk Actions
```http
POST /api/admin/bulk-action
X-Admin-Password: admin_password
Content-Type: application/json

{
  "action": "approve",
  "mapIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "successCount": 3,
  "failCount": 0,
  "errors": []
}
```

## Security

### Password Hashing

All passwords use bcrypt with 10 salt rounds:
```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(providedPassword, hash);
```

### Admin Authentication

Admin password can be:
1. **Bcrypt hash** (recommended): `ADMIN_PASSWORD=$2a$10$...`
2. **Plain text** (development only): `ADMIN_PASSWORD=mysecretpassword`

Generate bcrypt hash:
```bash
node -e "console.log(require('bcryptjs').hashSync('your_password', 10))"
```

### Edit Permission

Maps can be edited by:
1. **Creator**: Using their map password (`X-Map-Password` header)
2. **Admin**: Using admin password (`X-Admin-Password` header)

## Email Notifications

Emails are queued in `email_queue` table. Implement email sending service:

```javascript
// Example using SendGrid
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Process email queue
const emails = await pool.query(
  'SELECT * FROM email_queue WHERE status = $1 LIMIT 10',
  ['pending']
);

for (const email of emails.rows) {
  try {
    await sgMail.send({
      to: email.recipient_email,
      from: process.env.EMAIL_FROM,
      subject: email.subject,
      text: email.body
    });

    await pool.query(
      'UPDATE email_queue SET status = $1, sent_at = NOW() WHERE id = $2',
      ['sent', email.id]
    );
  } catch (error) {
    await pool.query(
      'UPDATE email_queue SET status = $1, error_message = $2 WHERE id = $3',
      ['failed', error.message, email.id]
    );
  }
}
```

## Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "message": "Error description"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created (new map submitted)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (password required)
- `403` - Forbidden (invalid password)
- `404` - Not Found
- `500` - Internal Server Error

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Start PostgreSQL and Redis (using Docker)
docker-compose up -d

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Test specific endpoint
curl -X GET http://localhost:3000/api/maps/approved

# Test admin endpoint
curl -X GET http://localhost:3000/api/admin/stats \
  -H "X-Admin-Password: your_password"
```

## Deployment

### Environment Variables

Ensure these are set in production:
- `NODE_ENV=production`
- `DATABASE_URL` (PostgreSQL connection string)
- `ADMIN_PASSWORD` (bcrypt hash)
- `APP_URL` (frontend URL)
- Email credentials (SMTP or SendGrid)

### Database Backup

```bash
# Backup
pg_dump coopmaps > backup.sql

# Restore
psql coopmaps < backup.sql
```

### CORS Configuration

Set `CORS_ORIGIN` to your frontend URL:
```env
CORS_ORIGIN=https://coopmaps.org
```

## Monitoring

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-20T10:00:00Z",
  "version": "0.92"
}
```

### Logs

Logs are written to:
- `stdout` (development)
- `logs/app.log` (production)

Configure level in `.env`:
```env
LOG_LEVEL=info  # error, warn, info, debug
```

## Support

For issues or questions:
- GitHub: https://github.com/principle5/coopmaps
- Email: support@principle5.coop
