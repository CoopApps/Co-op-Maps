# Co-opMaps UI Versions

Co-opMaps offers two user interface styles to accommodate different browser capabilities and user preferences.

## Overview

**IMPORTANT: Both versions have ALL the same features!**

The difference is only in the UI presentation style:

| Aspect | Express | Deluxe |
|---------|---------|--------|
| **Features** | ✅ ALL FEATURES | ✅ ALL FEATURES |
| **UI Style** | Classic/old-fashioned | Modern/sleek |
| **Browser Support** | IE11+, Chrome 49+, Firefox 52+ | Chrome 80+, Firefox 75+, Safari 13+ |
| **Technology** | HTML tables, ES5, simple CSS | CSS Grid/Flexbox, ES6, animations |
| **Load Time (3G)** | ~3-4 seconds | ~5-8 seconds |
| **Visual Style** | Windows 95/2000 aesthetic | Modern web app aesthetic |
| **Target Users** | Older systems, older browsers | Modern systems, modern browsers |

---

## Version Selector

Users choose their version on first visit via `/version-selector.html`:

- **Express**: Redirects to `/express.html`
- **Deluxe**: Redirects to `/index.html`
- Choice can be remembered in localStorage
- Offline mode option available

---

## Express UI

### Philosophy
**"Classic and Compatible"** - All features, presented with an old-school UI that works everywhere.

### All Features Included (Same as Deluxe!)

✅ **Complete Mapping:**
- Add enterprises (all 6 types)
- Create relationships (all types)
- Drag and resize enterprises
- Full enterprise properties (name, type, roles, tier, custom fields)
- Real-time collaboration
- Symbol key/legend editor
- Product information database
- Templates library
- Manuals and help

✅ **Full Styling:**
- Custom colors per enterprise
- Gradients, borders, fills
- Both orthogonal AND direct connectors
- Custom enterprise shapes
- Canvas backgrounds

✅ **Complete Export:**
- PNG export
- PDF export
- SVG export
- High-resolution options

✅ **Cloud Features:**
- User accounts
- Cloud storage and sync
- Share diagrams (public/private)
- Version history

### UI Style (Express)

**Visual Aesthetic: Windows 95/2000 Classic**

```
┌─────────────────────────────────────────────────────┐
│ File  Edit  View  Tools  Help                      │ ← Classic menu bar
├────┬────────────────────────────────┬───────────────┤
│ 🔨 │                                │ Properties    │
│ ✏️ │                                ├───────────────┤
│ ⚡ │         CANVAS                 │ Name:         │
│ 📁 │                                │ [_________]   │
│    │                                │               │
│    │                                │ Type:         │
│    │                                │ [Dropdown ▼]  │
├────┴────────────────────────────────┴───────────────┤
│ Symbol Key               | Collaborators: 3 online │
└─────────────────────────────────────────────────────┘
```

**UI Characteristics:**
- **Menus**: Classic File/Edit/View dropdown menus (not hamburger menus)
- **Buttons**: 3D beveled buttons with text labels
- **Panels**: Bordered boxes with titled headers
- **Colors**: System colors (grays, blue highlights)
- **Fonts**: Arial, Verdana, system fonts
- **Layout**: HTML tables, not CSS Grid/Flexbox
- **Inputs**: Standard form inputs (no custom styling)
- **No animations**: Instant transitions, no fades/slides
- **Scrollbars**: Browser default scrollbars (not custom)

### File Structure

```
public/
├── express.html              # Express version entry point
└── js/
    └── express/
        ├── app.js            # Main app logic (ES5)
        ├── canvas.js         # Canvas rendering
        ├── enterprises.js    # Enterprise management
        ├── relationships.js  # Relationship management
        ├── storage.js        # localStorage only
        └── export.js         # PNG/PDF export
```

---

## Deluxe UI

### Philosophy
**"Modern and Beautiful"** - All features, presented with a contemporary UI.

### All Features Included (Same as Express!)

✅ **Complete Mapping:**
- Add enterprises (all 6 types)
- Create relationships (all types)
- Drag and resize enterprises
- Full enterprise properties
- Real-time collaboration
- Symbol key/legend editor
- Product information database
- Templates library
- Manuals and help

✅ **Full Styling:**
- Custom colors per enterprise
- Gradients, borders, fills
- Both orthogonal AND direct connectors
- Custom enterprise shapes
- Canvas backgrounds

✅ **Complete Export:**
- PNG export
- PDF export
- SVG export
- High-resolution options

✅ **Cloud Features:**
- User accounts
- Cloud storage and sync
- Share diagrams (public/private)
- Version history

### UI Style (Deluxe)

**Visual Aesthetic: Modern Web App (2020s)**

```
┌─────────────────────────────────────────────────────┐
│  ≡  Co-opMaps         👤 Jane  🔔  ⚙️  💾 Saved    │ ← Minimal header
├──────┬────────────────────────────────┬─────────────┤
│  ⊕  │                                │ Properties  │
│  ↔  │                                ├─────────────┤
│  ✏  │         CANVAS                 │ Name        │
│  📋  │                                │ ───────────│
│      │                                │             │
│      │                                │ Type        │
│      │                                │ ▼ Dropdown  │
├──────┴────────────────────────────────┴─────────────┤
│ 🔑 Symbol Key    📦 Products    👥 Online (3)      │
└─────────────────────────────────────────────────────┘
```

**UI Characteristics:**
- **Menus**: Hamburger menu (≡), icons, minimal text
- **Buttons**: Flat design with hover effects
- **Panels**: Card-based, subtle shadows, rounded corners
- **Colors**: Brand colors, gradients, custom themes
- **Fonts**: Google Fonts (Roboto, Inter), web fonts
- **Layout**: CSS Grid, Flexbox, responsive
- **Inputs**: Custom styled (rounded, shadows, focus states)
- **Animations**: Smooth transitions, fades, slides
- **Scrollbars**: Custom styled thin scrollbars
- **Icons**: SVG icons, icon fonts

### File Structure

```
public/
├── index.html                # Deluxe version entry point
└── js/
    └── modules/
        ├── canvas.js
        ├── enterprises.js
        ├── relationships.js
        ├── properties.js
        ├── export.js
        ├── symbolKey.js
        ├── persistence.js
        ├── manuals.js
        ├── productInfo.js
        └── collaboration.js    # WebSocket handlers
```

---

## Data Format Compatibility

### Critical Requirement
**Maps must be 100% compatible between Express and Deluxe.**

### Shared Data Format

```json
{
  "version": "0.92",
  "metadata": {
    "title": "My Co-op Map",
    "author": "Jane Doe",
    "created": "2025-01-15T10:00:00Z",
    "modified": "2025-01-15T11:30:00Z",
    "canvasSize": "A4",
    "connectorStyle": "orthogonal"
  },
  "enterprises": [
    {
      "id": "ent_1",
      "type": "cooperative",
      "name": "My Coop",
      "x": 100,
      "y": 200,
      "width": 120,
      "height": 80,
      "roles": ["producer", "supplier"],
      "tier": "primary",
      "isGenericSet": false,
      "zIndex": 0,

      // Deluxe-only fields (ignored by Express)
      "fill": "#4a90e2",
      "stroke": "#2c5aa0",
      "shape": "rectangle",
      "customProperties": {}
    }
  ],
  "relationships": [
    {
      "id": "rel_1",
      "startEnterpriseId": "ent_1",
      "endEnterpriseId": "ent_2",
      "type": "G",
      "startSegmentation": "individual",
      "endSegmentation": "individual",

      // Deluxe-only fields (ignored by Express)
      "style": "orthogonal",
      "color": "#333"
    }
  ],

  // Deluxe-only sections (ignored by Express)
  "symbolKey": {},
  "productInfo": {},
  "collaboration": {}
}
```

### Compatibility Rules

1. **Express MUST ignore unknown fields**
   - When loading a Deluxe map, skip `fill`, `stroke`, `shape`, etc.
   - Use default styling for all enterprises
   - Parse only core fields

2. **Express MUST preserve unknown fields**
   - When saving, keep all fields it doesn't understand
   - This allows round-trip editing: Deluxe → Express → Deluxe

3. **Deluxe MUST provide defaults**
   - When loading an Express map, apply default styling
   - Add missing optional fields with sensible defaults

4. **Version field MUST be respected**
   - Both versions check the `version` field
   - Warn user if version is newer than supported

### Example: Round-Trip Compatibility

```javascript
// Deluxe saves this:
{
  "id": "ent_1",
  "name": "My Coop",
  "type": "cooperative",
  "fill": "#FF5733",        // Custom color
  "customIcon": "star"      // Custom icon
}

// Express loads it, ignores fill/customIcon, saves:
{
  "id": "ent_1",
  "name": "My Coop (edited in Express)",  // Modified
  "type": "cooperative",
  "fill": "#FF5733",        // PRESERVED (even though not used)
  "customIcon": "star"      // PRESERVED
}

// Deluxe loads it again:
// ✓ Gets the name change from Express
// ✓ Still has custom color and icon
// ✓ Perfect round-trip!
```

---

## Implementation Strategy

### Phase 1: Create Express Version (Current Priority)

1. **Copy base structure from Deluxe**
   ```bash
   cp public/index.html public/express.html
   ```

2. **Strip out Deluxe-only features**
   - Remove symbol key panel
   - Remove product info panel
   - Remove collaboration code
   - Remove custom styling UI
   - Keep only core modules

3. **Simplify UI**
   - Remove sidebars
   - Single toolbar
   - Context menus only
   - Minimal buttons

4. **Transpile to ES5**
   ```bash
   npx babel public/js/modules/*.js --out-dir public/js/express --presets=@babel/preset-env
   ```

5. **Test compatibility**
   - Create map in Express → open in Deluxe ✓
   - Create map in Deluxe → open in Express ✓
   - Edit in Express → open in Deluxe → verify fields preserved ✓

### Phase 2: Optimize Express for Performance

1. **Minify assets**
   ```bash
   npx terser public/js/express/app.js -o public/js/express/app.min.js
   ```

2. **Inline critical CSS**
   - Put all CSS in `<style>` tag
   - No external stylesheet requests

3. **Remove dependencies**
   - Keep only jsPDF for export
   - Remove all other libraries

4. **Target size: <200KB total**

### Phase 3: Polish Both Versions

1. **Add version indicator**
   - Show "Express" or "Deluxe" badge in UI
   - Link to switch versions

2. **Add upgrade prompts (Express only)**
   ```
   💡 Want real-time collaboration?
   Try Deluxe version →
   ```

3. **Add export warnings (Express)**
   ```
   ℹ️ This map has custom styling that won't
   appear in Express. Switch to Deluxe to see it.
   ```

---

## User Experience Flow

### First-Time User

1. Visit `coopmaps.example.com`
2. See version selector page
3. Choose Express or Deluxe
4. Choice remembered (optional)
5. Start mapping

### Switching Versions

**From Express to Deluxe:**
```
Current map → Auto-save →
Switch to Deluxe →
Load same map → Apply default styling →
All enterprises/relationships intact ✓
```

**From Deluxe to Express:**
```
Current map → Warning: "Styling will be removed" →
Confirm → Auto-save →
Switch to Express →
Load same map → Ignore styling →
All enterprises/relationships intact ✓
```

### Offline Mode

**Express:**
- Always works offline (localStorage)
- No server required
- Can run from `file://` URL

**Deluxe:**
- Can work offline (Service Worker)
- Syncs when connection available
- Requires initial online load

---

## Testing Checklist

### Compatibility Testing

- [ ] Create map in Express with 5 enterprises, 3 relationships
- [ ] Save to localStorage
- [ ] Open same map in Deluxe
- [ ] Verify all enterprises appear
- [ ] Verify all relationships appear
- [ ] Add styling in Deluxe
- [ ] Save
- [ ] Open in Express
- [ ] Verify enterprises still there (without styling)
- [ ] Modify in Express
- [ ] Save
- [ ] Open in Deluxe
- [ ] Verify styling preserved
- [ ] Verify Express modifications applied

### Browser Testing

**Express must work on:**
- [ ] IE 11 (Windows 7)
- [ ] Chrome 49 (Windows XP)
- [ ] Firefox 52 (Linux)
- [ ] Safari 10 (macOS)
- [ ] Android 4.4 browser

**Deluxe must work on:**
- [ ] Chrome 80+ (all platforms)
- [ ] Firefox 75+ (all platforms)
- [ ] Safari 13+ (macOS/iOS)
- [ ] Edge 80+ (Windows)

### Performance Testing

**Express targets:**
- [ ] Load time < 3 seconds on 3G
- [ ] Time to interactive < 5 seconds on 3G
- [ ] Smooth 60fps on Intel Atom processor
- [ ] Works with 2GB RAM

**Deluxe targets:**
- [ ] Load time < 5 seconds on 4G
- [ ] Time to interactive < 8 seconds on 4G
- [ ] Smooth 60fps on mid-range system
- [ ] Works with 4GB RAM

---

## Development Guidelines

### When adding new features

**Ask: "Should this be in Express?"**

✅ Add to Express if:
- Core mapping functionality
- Needed for basic diagrams
- No external dependencies
- Works in old browsers

❌ Keep Deluxe-only if:
- Advanced/power user feature
- Requires modern browser APIs
- Requires server/cloud
- Heavy performance impact

### Code sharing

```javascript
// GOOD: Shared core logic
// public/js/core/enterpriseLogic.js
function calculateEnterprisePosition(x, y, snap) {
    // Used by both Express and Deluxe
}

// GOOD: Version-specific UI
// public/js/express/ui.js
function renderSimpleToolbar() {
    // Express only
}

// public/js/deluxe/ui.js
function renderFullToolbar() {
    // Deluxe only
}
```

---

## Future Considerations

### Possible "Ultra-Light" Version

Even simpler than Express:
- View-only mode
- No editing
- <50KB total size
- Works on feature phones

### Possible "Pro" Version

Even more than Deluxe:
- Advanced analytics
- GIS integration
- API access
- White-label options
- Subscription-based

---

## Summary

| Aspect | Express | Deluxe |
|--------|---------|--------|
| **Features** | ✅ ALL FEATURES | ✅ ALL FEATURES |
| **UI Style** | Classic/old-fashioned | Modern/sleek |
| **Visual Design** | Windows 95/2000 aesthetic | 2020s web app aesthetic |
| **Technology** | ES5, HTML tables, simple CSS | ES6, CSS Grid, animations |
| **Browser Support** | IE11+, Chrome 49+, Firefox 52+ | Chrome 80+, Firefox 75+, Safari 13+ |
| **Load Time (3G)** | ~3-4 seconds | ~5-8 seconds |
| **File Size** | ~300-400KB | ~500-600KB |
| **Target Users** | Older computers, older browsers | Modern computers, modern browsers |
| **Accessibility** | High (works everywhere) | Medium (modern browsers only) |
| **Learning Curve** | Familiar to older users | Familiar to modern users |
| **Price** | Free | Free (future: premium tier) |

**Key Points:**
- ✅ Both versions have **identical functionality**
- ✅ Both versions share the same map format and are fully compatible
- ✅ Choice is purely about **visual style** and **browser compatibility**
- ✅ Maps created in one can be opened and edited in the other
- ✅ Users can switch between versions anytime
