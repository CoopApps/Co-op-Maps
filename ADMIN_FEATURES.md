# Co-opMaps Admin Panel - Feature Specification

## Overview
Principle 5 needs a comprehensive admin panel to manage community map submissions, communicate with creators, and maintain quality control.

## Admin Dashboard Features

### 1. **Submission Queue Management**

#### View Pending Submissions
```
┌────────────────────────────────────────────────────────┐
│ Pending Submissions (5)                                │
├────────────────────────────────────────────────────────┤
│ Title                  | Author      | Date    | Action│
│────────────────────────────────────────────────────────│
│ Green Energy Network   | Jane Smith  | Dec 18  | Review│
│ UK Food Cooperatives   | John Doe    | Dec 17  | Review│
│ Housing Co-ops London  | Mary Jones  | Dec 16  | Review│
└────────────────────────────────────────────────────────┘
```

#### Detailed Review Interface
When clicking "Review" on a submission:

```
┌─────────────────────────────────────────────────────────┐
│ Review Submission: "Green Energy Network"               │
├─────────────────────────────────────────────────────────┤
│ Submitted by: Jane Smith                                │
│ Email: jane@example.com                                 │
│ Submitted: December 18, 2025                            │
│ Description: Map showing renewable energy cooperatives  │
│                                                          │
│ [Preview Map in Express] [Preview in Deluxe]            │
│                                                          │
│ Quality Checklist:                                      │
│ ☐ Accurate enterprise types                            │
│ ☐ Clear relationships                                   │
│ ☐ Proper labeling                                       │
│ ☐ Appropriate content                                   │
│                                                          │
│ Admin Notes (internal):                                │
│ ┌───────────────────────────────────────────┐          │
│ │                                            │          │
│ └───────────────────────────────────────────┘          │
│                                                          │
│ Actions:                                                │
│ [✓ Approve & Publish]                                   │
│ [✏️ Request Changes (Email)]                            │
│ [🔧 Edit & Approve (Fix Issues)]                        │
│ [❌ Reject (Email Reason)]                              │
└─────────────────────────────────────────────────────────┘
```

### 2. **Communication System**

#### Request Changes Flow
```
┌─────────────────────────────────────────────────────────┐
│ Request Changes from Creator                            │
├─────────────────────────────────────────────────────────┤
│ To: jane@example.com                                    │
│ Subject: Changes needed for "Green Energy Network"     │
│                                                          │
│ Message:                                                │
│ ┌───────────────────────────────────────────┐          │
│ │ Hi Jane,                                   │          │
│ │                                            │          │
│ │ Thanks for submitting your map! Before    │          │
│ │ we can approve it, we need a few changes: │          │
│ │                                            │          │
│ │ 1. Please add relationship labels         │          │
│ │ 2. Fix the NCM enterprise positioning     │          │
│ │ 3. Add description to enterprises         │          │
│ │                                            │          │
│ │ You can edit and resubmit using your      │          │
│ │ password at: [link to edit]               │          │
│ │                                            │          │
│ │ Best,                                      │          │
│ │ Principle 5                                │          │
│ └───────────────────────────────────────────┘          │
│                                                          │
│ [Send Email] [Cancel]                                   │
└─────────────────────────────────────────────────────────┘
```

#### Rejection Flow
```
┌─────────────────────────────────────────────────────────┐
│ Reject Submission                                       │
├─────────────────────────────────────────────────────────┤
│ Reason for rejection:                                   │
│                                                          │
│ ☐ Inappropriate content                                 │
│ ☐ Low quality / incomplete                              │
│ ☐ Duplicate of existing map                             │
│ ☐ Does not meet community guidelines                    │
│ ☐ Other (explain below)                                 │
│                                                          │
│ Additional feedback:                                    │
│ ┌───────────────────────────────────────────┐          │
│ │                                            │          │
│ └───────────────────────────────────────────┘          │
│                                                          │
│ □ Keep map in system (archived, not public)            │
│ □ Delete permanently                                    │
│                                                          │
│ [Send Rejection Email] [Cancel]                        │
└─────────────────────────────────────────────────────────┘
```

### 3. **Edit & Fix Capabilities**

Admin can directly edit a submission before approving:
```
┌─────────────────────────────────────────────────────────┐
│ Edit Mode: "Green Energy Network"                      │
├─────────────────────────────────────────────────────────┤
│ Original Author: Jane Smith                             │
│ Editing as: Admin (Principle 5)                         │
│                                                          │
│ [Full Deluxe Editor Interface]                          │
│                                                          │
│ Changes made:                                           │
│ • Fixed enterprise positioning                          │
│ • Added missing relationship labels                     │
│ • Corrected enterprise types                            │
│                                                          │
│ ☐ Notify author of changes made                        │
│                                                          │
│ [Save & Approve] [Save Draft] [Cancel]                 │
└─────────────────────────────────────────────────────────┘
```

### 4. **Approved Maps Management**

```
┌────────────────────────────────────────────────────────┐
│ Approved Maps (23)                 [Search: _______]   │
├────────────────────────────────────────────────────────┤
│ Title              | Author     | Approved  | Actions  │
│────────────────────────────────────────────────────────│
│ UK Food Co-ops     | John Doe   | Dec 15    | Edit Unpub│
│ Energy Network     | Jane Smith | Dec 14    | Edit Unpub│
│ Housing Co-ops     | Mary Jones | Dec 10    | Edit Unpub│
└────────────────────────────────────────────────────────┘

Actions:
• Edit - Admin can edit published maps
• Unpublish - Move back to draft/archive (with reason email)
```

### 5. **Analytics & Statistics**

```
┌─────────────────────────────────────────────────────────┐
│ Dashboard Statistics                                    │
├─────────────────────────────────────────────────────────┤
│ Total Maps: 28                                          │
│ ├─ Pending Review: 5                                    │
│ ├─ Approved & Published: 23                             │
│ ├─ Archived/Rejected: 3                                 │
│                                                          │
│ Recent Activity:                                        │
│ • 3 new submissions today                               │
│ • 2 maps approved this week                             │
│ • 1 change request sent                                 │
│                                                          │
│ Most Active Authors:                                    │
│ 1. Jane Smith (5 maps)                                  │
│ 2. John Doe (3 maps)                                    │
│                                                          │
│ Most Viewed Maps:                                       │
│ 1. UK Food Cooperatives (234 views)                    │
│ 2. Green Energy Network (189 views)                     │
└─────────────────────────────────────────────────────────┘
```

### 6. **Search & Filter Tools**

```
┌─────────────────────────────────────────────────────────┐
│ Search & Filter                                         │
├─────────────────────────────────────────────────────────┤
│ Status:   [All ▼] Pending | Approved | Rejected        │
│ Author:   [Search author name...]                      │
│ Date:     [Last 7 days ▼]                               │
│ Keywords: [Search title/description...]                │
│                                                          │
│ Sort by:  [Date ▼] Date | Author | Title               │
│                                                          │
│ [Apply Filters]                                         │
└─────────────────────────────────────────────────────────┘
```

### 7. **Moderation History Log**

```
┌─────────────────────────────────────────────────────────┐
│ Moderation History - "Green Energy Network"            │
├─────────────────────────────────────────────────────────┤
│ Dec 18, 2025 10:30 - Submitted by Jane Smith           │
│ Dec 18, 2025 14:15 - Reviewed by Admin                 │
│ Dec 18, 2025 14:20 - Changes requested (email sent)    │
│ Dec 19, 2025 09:00 - Resubmitted by Jane Smith         │
│ Dec 19, 2025 11:30 - Approved by Admin                 │
│ Dec 19, 2025 11:30 - Published to community            │
└─────────────────────────────────────────────────────────┘
```

### 8. **Batch Actions**

```
┌─────────────────────────────────────────────────────────┐
│ Bulk Actions                                            │
├─────────────────────────────────────────────────────────┤
│ Selected: 3 maps                                        │
│                                                          │
│ [Approve All] [Request Changes] [Archive All]           │
└─────────────────────────────────────────────────────────┘
```

## Enhanced Submission Form (User Side)

Update the submission form to capture contact information:

```html
┌─────────────────────────────────────────────────────────┐
│ Submit Map to Community                                 │
├─────────────────────────────────────────────────────────┤
│ Map Title: *                                            │
│ [________________________________]                      │
│                                                          │
│ Your Name: *                                            │
│ [________________________________]                      │
│                                                          │
│ Email Address: * (for updates & communication)         │
│ [________________________________]                      │
│                                                          │
│ Organization (optional):                                │
│ [________________________________]                      │
│                                                          │
│ Description: *                                          │
│ [________________________________]                      │
│ [________________________________]                      │
│ [________________________________]                      │
│                                                          │
│ Tags (optional):                                        │
│ [energy, renewable, UK] (comma separated)              │
│                                                          │
│ Set Edit Password: *                                    │
│ [________________]                                      │
│                                                          │
│ Confirm Password: *                                     │
│ [________________]                                      │
│                                                          │
│ ☑ I agree to the Community Guidelines                  │
│ ☑ I consent to admin review and potential edits        │
│                                                          │
│ [Cancel]  [Submit for Review]                          │
└─────────────────────────────────────────────────────────┘
```

## Database Schema Updates

```sql
-- Maps table with additional fields
CREATE TABLE maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,  -- NEW: For communication
  organization VARCHAR(255),      -- NEW: Optional
  description TEXT,
  tags TEXT[],                    -- NEW: For search/categorization

  -- Security
  password_hash VARCHAR(255) NOT NULL,

  -- Data
  diagram_data JSONB NOT NULL,
  thumbnail TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'pending',  -- pending, approved, rejected, archived

  -- Approval info
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,

  -- Moderation
  admin_notes TEXT,               -- NEW: Internal notes
  rejection_reason TEXT,          -- NEW: If rejected

  -- Stats
  view_count INTEGER DEFAULT 0,   -- NEW: Track views
  edit_count INTEGER DEFAULT 0,   -- NEW: Track edits

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP
);

-- Moderation history table
CREATE TABLE moderation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES maps(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,  -- submitted, reviewed, approved, rejected, edited
  performed_by VARCHAR(255),     -- admin or author email
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Email queue for notifications
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  map_id UUID REFERENCES maps(id),
  status VARCHAR(50) DEFAULT 'pending',  -- pending, sent, failed
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP
);
```

## API Endpoints for Admin

```javascript
// Admin authentication
POST /api/admin/login
Body: { password }
Response: { token, expiresIn }

// Get dashboard stats
GET /api/admin/stats
Headers: { 'Authorization': 'Bearer token' }
Response: { pending, approved, rejected, totalViews, etc. }

// Get all submissions (with filters)
GET /api/admin/submissions?status=pending&author=Jane&sort=date
Headers: { 'Authorization': 'Bearer token' }
Response: [{ id, title, author, email, status, submittedAt, ... }]

// Get specific submission for review
GET /api/admin/submissions/:id
Headers: { 'Authorization': 'Bearer token' }
Response: { full map data + author info + history }

// Approve map
POST /api/admin/submissions/:id/approve
Headers: { 'Authorization': 'Bearer token' }
Body: { adminNotes, notifyAuthor: true }
Response: { success, message }

// Request changes
POST /api/admin/submissions/:id/request-changes
Headers: { 'Authorization': 'Bearer token' }
Body: { message, checklist: [] }
Response: { success, emailSent: true }

// Reject map
POST /api/admin/submissions/:id/reject
Headers: { 'Authorization': 'Bearer token' }
Body: { reason, message, deleteMap: false }
Response: { success, emailSent: true }

// Edit map (admin override)
PUT /api/admin/maps/:id/edit
Headers: { 'Authorization': 'Bearer token' }
Body: { diagramData, changesSummary, notifyAuthor: true }
Response: { success, message }

// Unpublish map
POST /api/admin/maps/:id/unpublish
Headers: { 'Authorization': 'Bearer token' }
Body: { reason, notifyAuthor: true }
Response: { success }

// Get moderation history
GET /api/admin/maps/:id/history
Headers: { 'Authorization': 'Bearer token' }
Response: [{ action, performedBy, notes, timestamp }]

// Bulk actions
POST /api/admin/bulk-action
Headers: { 'Authorization': 'Bearer token' }
Body: { action: 'approve', mapIds: [...] }
Response: { successCount, failCount, errors: [] }
```

## Email Templates

### 1. Submission Received
```
Subject: Map Submitted - "Green Energy Network"

Hi Jane,

Thanks for submitting your map "Green Energy Network" to the Co-opMaps community!

Your submission is now being reviewed by our team. You'll hear from us within 2-3 business days.

In the meantime, you can:
• Edit your map: [link with password]
• View guidelines: [link]

Best,
The Co-opMaps Team
```

### 2. Changes Requested
```
Subject: Changes Needed - "Green Energy Network"

Hi Jane,

We've reviewed your map and it looks great! Before we can publish it, we need a few minor adjustments:

[Admin's custom message]

Please log in with your password to make these changes:
[Edit link]

Once updated, resubmit and we'll review it again promptly.

Best,
Principle 5
Co-opMaps Community
```

### 3. Approved
```
Subject: Map Approved! "Green Energy Network" is now live

Hi Jane,

Great news! Your map "Green Energy Network" has been approved and is now live in the community gallery!

View your map: [public link]
Share it: [social sharing links]
Edit anytime: [edit link with password]

Your map has been viewed 15 times already!

Thanks for contributing to the Co-opMaps community.

Best,
Principle 5
```

### 4. Rejected
```
Subject: Map Submission Update - "Green Energy Network"

Hi Jane,

Unfortunately, we're unable to approve your map "Green Energy Network" at this time.

Reason: [Admin's reason]

[Custom message from admin]

You're welcome to:
• Revise and resubmit: [edit link]
• Contact us with questions: admin@coopmaps.org

We appreciate your contribution and hope you'll submit again!

Best,
Principle 5
```

## Admin Panel UI Mockup

```
┌─────────────────────────────────────────────────────────┐
│ Co-opMaps Admin Panel                      [Logout]     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌────────────┬─────────────────────────────────────┐   │
│ │ Dashboard  │  Pending (5)    Approved (23)       │   │
│ │ Pending    │  Rejected (3)   Total Views: 1,234  │   │
│ │ Approved   │                                      │   │
│ │ Rejected   │  Recent Submissions:                │   │
│ │ All Maps   │  ┌────────────────────────────────┐ │   │
│ │ Settings   │  │ Green Energy Network           │ │   │
│ │            │  │ by Jane Smith - 2 hours ago    │ │   │
│ │            │  │ [Review]                       │ │   │
│ │            │  └────────────────────────────────┘ │   │
│ │            │  ┌────────────────────────────────┐ │   │
│ │            │  │ UK Food Cooperatives          │ │   │
│ │            │  │ by John Doe - 1 day ago       │ │   │
│ │            │  │ [Review]                       │ │   │
│ │            │  └────────────────────────────────┘ │   │
│ └────────────┴─────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Implementation Priority

### Phase 1: Core Admin Features (MVP)
1. Admin login with password
2. View pending submissions
3. Preview maps
4. Approve/Reject with email
5. Basic email templates

### Phase 2: Enhanced Communication
1. Request changes workflow
2. Custom email messages
3. Email tracking (sent/opened)

### Phase 3: Advanced Features
1. Direct editing by admin
2. Moderation history
3. Analytics dashboard
4. Batch actions
5. Search & filters

### Phase 4: Community Features
1. View counts
2. Author statistics
3. Map versioning
4. Comments/feedback system
