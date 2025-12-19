# Co-opMaps Backend Architecture Plan

## Current Gaps Analysis

### 1. **No Backend Server**
- ❌ All data stored in browser localStorage
- ❌ No cross-device synchronization
- ❌ Data lost if browser cache cleared
- ❌ No backup/recovery mechanism
- ❌ Limited to ~5-10MB storage

### 2. **No User Management**
- ❌ No authentication/authorization
- ❌ Can't have multiple users
- ❌ No user profiles
- ❌ No organization/team management
- ❌ No role-based access control

### 3. **No Database**
- ❌ No persistent storage beyond browser
- ❌ No query capabilities
- ❌ No data analytics
- ❌ No reporting
- ❌ Can't scale beyond single user

### 4. **No Collaboration Features**
- ❌ Can't share diagrams with others
- ❌ No real-time collaboration
- ❌ No commenting/annotations
- ❌ No access control (view/edit permissions)
- ❌ No public galleries

### 5. **No Version Control**
- ❌ Limited undo/redo (session only)
- ❌ No version history
- ❌ Can't restore previous versions
- ❌ No change tracking
- ❌ No branching/forking

### 6. **No API**
- ❌ Can't integrate with other systems
- ❌ No programmatic access
- ❌ No webhooks/notifications
- ❌ No data import from external sources

### 7. **Limited Export**
- ❌ Client-side export only
- ❌ No server-side high-quality rendering
- ❌ No batch export
- ❌ No scheduled exports

### 8. **No Analytics**
- ❌ Can't track usage patterns
- ❌ No user insights
- ❌ No feature adoption metrics
- ❌ No performance monitoring

### 9. **No Security**
- ❌ Data stored in plain text in browser
- ❌ No encryption
- ❌ No audit logging
- ❌ No data validation server-side

### 10. **No Membership Integration**
- ❌ Can't verify Principle 5 membership
- ❌ No service level enforcement
- ❌ No payment integration
- ❌ Manual membership management

## Recommended Backend Architecture

### Technology Stack

```
Frontend:          Current HTML/JS/CSS (minimal changes)
Backend:           Node.js + Express
Database:          PostgreSQL (primary) + Redis (caching/sessions)
Authentication:    JWT + Passport.js
File Storage:      AWS S3 or MinIO (for exports/thumbnails)
Real-time:         Socket.io (for collaboration)
API:               RESTful + GraphQL (optional)
Containerization:  Docker + Docker Compose
CI/CD:             GitHub Actions
Hosting:           DigitalOcean/AWS/Heroku
```

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    organization VARCHAR(255),
    membership_level INTEGER DEFAULT 1,
    membership_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

#### Diagrams Table
```sql
CREATE TABLE diagrams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(255),
    wdr VARCHAR(100),
    scope_geographic VARCHAR(50),
    scope_economic TEXT,
    scope_user_defined TEXT,
    period VARCHAR(50),
    date DATE,
    canvas_size VARCHAR(10) DEFAULT 'A4',
    connector_style VARCHAR(20) DEFAULT 'orthogonal',
    thumbnail_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    is_template BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
```

#### Enterprises Table
```sql
CREATE TABLE enterprises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagram_id UUID REFERENCES diagrams(id) ON DELETE CASCADE,
    enterprise_id VARCHAR(100) NOT NULL, -- Client-side ID
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    width FLOAT NOT NULL,
    height FLOAT NOT NULL,
    fill VARCHAR(50),
    stroke VARCHAR(50),
    roles JSONB DEFAULT '[]',
    tier VARCHAR(50),
    is_generic_set BOOLEAN DEFAULT FALSE,
    z_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Relationships Table
```sql
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagram_id UUID REFERENCES diagrams(id) ON DELETE CASCADE,
    relationship_id VARCHAR(100) NOT NULL, -- Client-side ID
    start_enterprise_id VARCHAR(100) NOT NULL,
    end_enterprise_id VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    start_segmentation VARCHAR(50) DEFAULT 'individual',
    end_segmentation VARCHAR(50) DEFAULT 'individual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Diagram Versions Table
```sql
CREATE TABLE diagram_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagram_id UUID REFERENCES diagrams(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    data JSONB NOT NULL, -- Full diagram snapshot
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_description TEXT
);
```

#### Collaborators Table
```sql
CREATE TABLE diagram_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagram_id UUID REFERENCES diagrams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL, -- 'view', 'edit', 'admin'
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    UNIQUE(diagram_id, user_id)
);
```

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Reset password

#### User Management
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update profile
- `GET /api/users/me/membership` - Get membership status
- `PUT /api/users/me/password` - Change password

#### Diagrams
- `GET /api/diagrams` - List user's diagrams
- `POST /api/diagrams` - Create new diagram
- `GET /api/diagrams/:id` - Get diagram
- `PUT /api/diagrams/:id` - Update diagram
- `DELETE /api/diagrams/:id` - Delete diagram
- `POST /api/diagrams/:id/duplicate` - Duplicate diagram
- `GET /api/diagrams/:id/export/:format` - Export (PDF/PNG/SVG)
- `GET /api/diagrams/:id/versions` - Get version history
- `POST /api/diagrams/:id/versions` - Create version
- `POST /api/diagrams/:id/restore/:version` - Restore version

#### Collaboration
- `GET /api/diagrams/:id/collaborators` - List collaborators
- `POST /api/diagrams/:id/collaborators` - Add collaborator
- `DELETE /api/diagrams/:id/collaborators/:userId` - Remove collaborator
- `PUT /api/diagrams/:id/collaborators/:userId` - Update permissions

#### Public Gallery
- `GET /api/public/diagrams` - List public diagrams
- `GET /api/public/diagrams/:id` - View public diagram
- `GET /api/templates` - List templates

#### Real-time (WebSocket)
- `diagram:join` - Join diagram room
- `diagram:leave` - Leave diagram room
- `diagram:update` - Broadcast changes
- `diagram:cursor` - Share cursor position
- `user:joined` - User joined notification
- `user:left` - User left notification

## Implementation Phases

### Phase 1: Core Backend (Week 1-2)
- [x] Set up Node.js/Express server
- [x] Configure PostgreSQL database
- [x] Implement user authentication (JWT)
- [x] Create basic API endpoints
- [x] Set up Docker containerization

### Phase 2: Data Migration (Week 2-3)
- [ ] Create data import from localStorage
- [ ] Implement diagram CRUD operations
- [ ] Add enterprise and relationship endpoints
- [ ] Build migration tool for existing users

### Phase 3: Frontend Integration (Week 3-4)
- [ ] Modify persistence module to use API
- [ ] Add authentication UI
- [ ] Implement sync indicators
- [ ] Add error handling and retries

### Phase 4: Collaboration (Week 4-5)
- [ ] Implement real-time updates (Socket.io)
- [ ] Add sharing functionality
- [ ] Create permissions system
- [ ] Build collaboration UI

### Phase 5: Advanced Features (Week 5-6)
- [ ] Version control system
- [ ] Server-side export enhancement
- [ ] Public gallery
- [ ] Template system

### Phase 6: Testing & Deployment (Week 6-7)
- [ ] Unit and integration tests
- [ ] Performance testing
- [ ] Security audit
- [ ] Deploy to production
- [ ] Set up monitoring and logging

### Phase 7: Polish & Documentation (Week 7-8)
- [ ] User documentation
- [ ] API documentation
- [ ] Admin panel
- [ ] Analytics dashboard

## Security Considerations

1. **Authentication**
   - Bcrypt password hashing
   - JWT tokens with short expiry
   - Refresh token rotation
   - Rate limiting on auth endpoints

2. **Authorization**
   - Middleware to check diagram ownership
   - Permission-based access control
   - Membership level verification

3. **Data Protection**
   - Input validation and sanitization
   - SQL injection prevention (parameterized queries)
   - XSS protection
   - CSRF tokens

4. **Privacy**
   - Encrypted connections (HTTPS only)
   - Secure session management
   - Audit logging
   - GDPR compliance

5. **Infrastructure**
   - Regular backups
   - Disaster recovery plan
   - DDoS protection
   - Security headers

## Performance Optimization

1. **Caching**
   - Redis for session data
   - Cache frequently accessed diagrams
   - CDN for static assets
   - Browser caching headers

2. **Database**
   - Proper indexing
   - Query optimization
   - Connection pooling
   - Read replicas for scaling

3. **API**
   - Pagination for list endpoints
   - Compression (gzip)
   - Response caching
   - GraphQL for complex queries

4. **Real-time**
   - Redis adapter for Socket.io
   - Room-based broadcasting
   - Message throttling
   - Presence optimization

## Monitoring & Analytics

1. **Application Monitoring**
   - Error tracking (Sentry)
   - Performance monitoring (New Relic/DataDog)
   - Uptime monitoring
   - Log aggregation

2. **User Analytics**
   - Feature usage tracking
   - User engagement metrics
   - Conversion funnels
   - Retention analysis

3. **Business Metrics**
   - Active users (DAU/MAU)
   - Diagram creation rates
   - Membership conversions
   - Storage usage

## Cost Estimation

### Infrastructure (Monthly)
- **Server**: $50-200 (depends on scale)
- **Database**: $25-100
- **Storage**: $5-50
- **CDN**: $10-50
- **Monitoring**: $20-100
- **Total**: ~$110-500/month

### Development (One-time)
- **Backend Development**: 6-8 weeks
- **Testing & QA**: 1-2 weeks
- **Deployment**: 1 week
- **Total**: ~8-11 weeks of development
