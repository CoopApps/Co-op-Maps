# Co-opMaps - Map Sharing System Design

## Overview
A password-based map sharing system allowing users to:
1. Create and save maps locally
2. Submit maps for approval
3. Browse and load approved maps
4. Edit maps with password authentication

## Architecture

### Frontend Components

#### 1. Main Menu (index.html) Enhancements
```
┌─────────────────────────────────────┐
│  Co-opMaps                          │
├─────────────────────────────────────┤
│  Choose Version:                    │
│  [Express] [Deluxe]                 │
│                                     │
│  Browse Community Maps:             │
│  [View Approved Maps]               │
└─────────────────────────────────────┘
```

**New "Browse Maps" Page** (browse.html):
- Grid/list of approved maps
- Each shows: Title, Author, Preview thumbnail, Date
- Click to select → Choose Express or Deluxe view
- Opens map in read-only mode

#### 2. Save/Load/Submit UI

**In Toolbar (both Express & Deluxe):**
```
[Save Local] [Load Local] [Submit Map]
```

**Save Local Flow:**
1. Click "Save Local" → Downloads JSON file to computer
2. No password needed (standard browser download)

**Load Local Flow:**
1. Click "Load Local" → File picker
2. Upload JSON → Loads into canvas

**Submit Map Flow:**
```
┌─────────────────────────────────────┐
│  Submit Map for Approval            │
├─────────────────────────────────────┤
│  Title: [________________]          │
│  Author: [______________]           │
│  Description:                       │
│  [________________________]         │
│  [________________________]         │
│                                     │
│  Set Password (for editing):       │
│  [________________]                 │
│  Confirm: [________________]        │
│                                     │
│  [Cancel]  [Submit]                 │
└─────────────────────────────────────┘
```

#### 3. Edit Protection

**When loading a community map:**
- Initially read-only (no toolbar buttons work)
- "🔒 Edit Map" button appears
- Click → Password prompt
- Correct password → Unlocks editing

### Backend API

**Endpoints needed:**

```javascript
// Submit new map
POST /api/maps/submit
Body: {
  title: string,
  author: string,
  description: string,
  password: string,  // Will be hashed
  diagramData: object  // Full state
}
Response: { mapId, message }

// List approved maps (public)
GET /api/maps/approved
Response: [{
  id, title, author, description,
  thumbnail, createdAt, approved
}]

// Get specific map data (public if approved)
GET /api/maps/:id
Response: { id, title, author, description, diagramData, approved }

// Edit map (requires password)
PUT /api/maps/:id/edit
Headers: { 'X-Map-Password': hashedPassword }
Body: { diagramData: object }
Response: { success, message }

// Admin: Approve map (requires admin password)
POST /api/maps/:id/approve
Headers: { 'X-Admin-Password': adminPasswordHash }
Response: { success, message }

// Admin: List all maps (requires admin password)
GET /api/admin/maps
Headers: { 'X-Admin-Password': adminPasswordHash }
Response: [{ id, title, author, approved, createdAt }]
```

### Database Schema

```sql
CREATE TABLE maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  description TEXT,
  password_hash VARCHAR(255) NOT NULL,  -- bcrypt hash
  diagram_data JSONB NOT NULL,
  thumbnail TEXT,  -- base64 PNG thumbnail
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  approved_by VARCHAR(255),  -- "Principle 5" when approved
  approved_at TIMESTAMP
);

CREATE INDEX idx_maps_approved ON maps(approved, created_at DESC);
```

### Security Model

#### Password System
1. **Map Creator Password**
   - Set during submission
   - Hashed with bcrypt (rounds: 10)
   - Required to edit the map
   - Creator must save/remember it (not recoverable)

2. **Principle 5 Admin Password**
   - Environment variable: `ADMIN_PASSWORD`
   - Can approve any map
   - Can edit any map
   - Can delete maps

#### Password Verification Flow
```javascript
// Server-side
function canEditMap(mapId, providedPassword, isAdmin) {
  const map = getMap(mapId);

  // Admin can always edit
  if (isAdmin && verifyAdmin(providedPassword)) {
    return true;
  }

  // Creator needs correct password
  return bcrypt.compare(providedPassword, map.password_hash);
}
```

## UI Flow Examples

### Example 1: Submitting a Map
```
User creates map in Deluxe →
Clicks "Submit Map" →
Fills form (title, author, description, password) →
Map sent to server (status: pending) →
Confirmation: "Map submitted! Waiting for approval."
```

### Example 2: Browsing & Loading
```
Main menu → "View Approved Maps" →
Grid of approved maps shown →
User clicks "Green Energy Coop Network" →
Prompt: "View in Express or Deluxe?" →
Opens in selected mode (read-only) →
User clicks "🔒 Edit" → Password prompt →
Correct password → Unlocked for editing
```

### Example 3: Principle 5 Approval
```
Admin visits /admin →
Enters admin password →
Sees list of pending maps →
Previews map →
Clicks "Approve" →
Map now visible to all users
```

## Implementation Files

### Frontend Files to Create/Modify
```
/browse.html          - Browse approved maps
/admin.html           - Admin approval interface
/index.html           - Add "Browse Maps" button
/express.html         - Add Submit/Lock buttons
/deluxe.html          - Add Submit/Lock buttons
/public/js/api.js     - API client functions
```

### Backend Files to Create
```
/server/routes/maps.js        - Map CRUD routes
/server/routes/admin.js       - Admin routes
/server/middleware/auth.js    - Password verification
/server/models/Map.js         - Database model
/server/utils/thumbnail.js    - Generate thumbnails
```

## Frontend UI Components Needed

### 1. Submit Map Dialog (both versions)
```html
<div id="submitDialog" class="modal">
  <h2>Submit Map to Community</h2>
  <input type="text" id="mapTitle" placeholder="Map Title">
  <input type="text" id="mapAuthor" placeholder="Your Name">
  <textarea id="mapDescription" placeholder="Brief description"></textarea>
  <input type="password" id="mapPassword" placeholder="Set edit password">
  <input type="password" id="mapPasswordConfirm" placeholder="Confirm password">
  <button onclick="submitMap()">Submit</button>
</div>
```

### 2. Password Unlock Dialog
```html
<div id="unlockDialog" class="modal">
  <h2>🔒 Edit Map</h2>
  <p>This map is protected. Enter password to edit:</p>
  <input type="password" id="editPassword">
  <button onclick="unlockMap()">Unlock</button>
</div>
```

### 3. Browse Maps Grid
```html
<div class="maps-grid">
  <div class="map-card" data-id="...">
    <img src="thumbnail.png">
    <h3>Title</h3>
    <p>by Author</p>
    <p class="description">Description...</p>
    <button onclick="loadMap(id)">Load Map</button>
  </div>
</div>
```

## Next Steps

### Phase 1: Frontend Only (No Server)
- Add "Save Local" / "Load Local" buttons
- Test with browser downloads/uploads
- Add password field to saved JSON (for future use)

### Phase 2: Backend Setup
- Create Express.js server with routes
- Set up PostgreSQL database
- Implement password hashing

### Phase 3: Integration
- Connect frontend to API
- Add Submit functionality
- Create browse page
- Build admin panel

### Phase 4: Deployment
- Deploy backend to production
- Set admin password via environment variable
- Test end-to-end flow

## Benefits of This Design

✅ **Simple**: No user accounts needed
✅ **Secure**: Passwords hashed, admin-only approval
✅ **Flexible**: Works with both Express & Deluxe
✅ **Scalable**: Can add features later (comments, ratings, etc.)
✅ **Privacy**: Creators control their own maps with passwords
✅ **Quality Control**: Principle 5 approves all public maps

## Alternative: No Backend (Pure Frontend)
If you want to avoid backend complexity:
- Use GitHub Gists or Pastebin API for storage
- Maps stored as public gists
- Password in gist metadata
- "Approved" maps listed in a curated JSON file
- Principle 5 manually adds approved gist IDs to approved list

Would require manual curation but simpler infrastructure.
