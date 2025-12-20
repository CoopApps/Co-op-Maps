# Co-opMaps UI Versions

Co-opMaps offers two user interface versions to accommodate different user needs, system capabilities, and network conditions.

## Overview

| Feature | Express | Deluxe |
|---------|---------|--------|
| **File Size** | ~200KB | ~500KB |
| **Load Time (3G)** | ~2-3 seconds | ~5-8 seconds |
| **Browser Support** | IE11+, Chrome 49+, Firefox 52+ | Chrome 80+, Firefox 75+, Safari 13+ |
| **RAM Usage** | ~50-100MB | ~100-200MB |
| **Target Users** | Quick maps, older systems, slow internet | Complex maps, collaboration, full features |

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
**"Do less, do it well"** - Focused on core mapping with minimal UI chrome.

### Features Included

✅ **Core Mapping:**
- Add enterprises (all 6 types)
- Create relationships (all types)
- Drag and resize enterprises
- Basic enterprise properties (name, type, roles, tier)

✅ **Basic Tools:**
- Pan and zoom
- Select and delete
- Copy and paste
- Undo/redo (10 levels)

✅ **File Operations:**
- New diagram
- Save to localStorage
- Load from localStorage
- Export to PNG
- Export to PDF
- Import/export JSON

✅ **Minimal Styling:**
- Fixed color scheme (cooperative = blue, private = gray, etc.)
- Standard enterprise sizes
- Orthogonal connectors only

### Features NOT Included

❌ Real-time collaboration
❌ Symbol key/legend editor
❌ Advanced styling (gradients, custom colors)
❌ Product information database
❌ Templates
❌ Manual/help pages
❌ Symbol library
❌ Direct connectors (only orthogonal)
❌ Custom enterprise shapes
❌ SVG export (PNG and PDF only)
❌ Cloud sync (localStorage only in offline mode)

### UI Layout (Express)

```
┌─────────────────────────────────────────┐
│ Co-opMaps Express     [Save] [Export] │  ← Simple toolbar
├─────────────────────────────────────────┤
│                                         │
│                                         │
│        CANVAS (full screen)             │
│                                         │
│                                         │
│                                         │
└─────────────────────────────────────────┘
 [+Coop] [+Private] [+Social] [+NCM]...    ← Bottom toolbar
```

**Key UI Decisions:**
- No sidebars
- Minimal buttons (icon + tooltip only)
- Context menu for enterprise properties
- Keyboard shortcuts prominent
- Single-click actions where possible

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
**"Everything you need"** - Full-featured professional mapping tool.

### Features Included

✅ **All Express features PLUS:**

✅ **Advanced Mapping:**
- Direct connectors (in addition to orthogonal)
- Custom enterprise shapes
- Enterprise z-index control
- Segmentation markers on relationships
- Generic sets

✅ **Rich Styling:**
- Custom colors per enterprise
- Gradient fills
- Border styles
- Font customization
- Canvas background options

✅ **Collaboration:**
- Real-time multi-user editing (WebSocket)
- User presence indicators
- Cursor tracking
- Conflict resolution
- Chat/comments

✅ **Organization:**
- Symbol key/legend editor
- Product information database
- Templates library
- Diagram versioning
- Tagging and categories

✅ **Advanced Export:**
- SVG export
- High-resolution PNG
- Professional PDF with metadata
- Batch export

✅ **Documentation:**
- Interactive manual
- Tooltips and help
- Video tutorials
- Example diagrams

✅ **Cloud Features:**
- User accounts
- Cloud storage
- Share diagrams (public/private)
- Fork/duplicate diagrams
- Search public diagrams

### UI Layout (Deluxe)

```
┌─────────────────────────────────────────────────────┐
│ File Edit View Tools Help    [User] [Share] [Save] │ ← Full menubar
├──────┬────────────────────────────────┬─────────────┤
│      │                                │             │
│ Tool │                                │  Properties │
│ bar  │         CANVAS                 │  Panel      │
│      │                                │             │
│ [+]  │                                │ Name: ___   │
│ [→]  │                                │ Type: ___   │
│ [✏]  │                                │ Roles: ___  │
│      │                                │             │
├──────┴────────────────────────────────┴─────────────┤
│ Symbol Key | Products | Collaborators (3 online)   │ ← Bottom panels
└─────────────────────────────────────────────────────┘
```

**Key UI Decisions:**
- Panels can be collapsed
- Keyboard shortcuts + menu access
- Right-click context menus
- Drag-and-drop from symbol library
- Live preview of changes

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
| **Target** | Quick maps, old systems | Full features, collaboration |
| **Size** | ~200KB | ~500KB |
| **Features** | Core only | Everything |
| **Browser** | IE11+ | Modern only |
| **Network** | 2G+ | 4G+ |
| **Offline** | Always | Optional (PWA) |
| **Learning Curve** | 5 minutes | 30 minutes |
| **Price** | Free | Free (future: premium tier) |

**Both versions share the same map format and are fully compatible!**
