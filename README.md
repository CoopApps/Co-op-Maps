# Co-opMaps Backend Server

Backend server for Co-opMaps - Cooperative Ecosystem Mapping Tool by Principle 5.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+ (optional, for caching/sessions)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd Co-op-Maps

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
nano .env

# Create database
createdb coopmaps

# Run migrations
psql -U coopmaps_user -d coopmaps -f server/db/schema.sql

# Start development server
npm run dev
```

The server will start on `http://localhost:3000`

## 📁 Project Structure

```
Co-op-Maps/
├── server/
│   ├── index.js              # Main server file
│   ├── db/
│   │   ├── connection.js     # Database connection
│   │   ├── redis.js          # Redis connection
│   │   └── schema.sql        # Database schema
│   ├── routes/
│   │   ├── auth.js           # Authentication routes
│   │   ├── users.js          # User management
│   │   ├── diagrams.js       # Diagram CRUD
│   │   ├── collaborators.js  # Collaboration
│   │   └── public.js         # Public API
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   ├── validation.js     # Input validation
│   │   └── errorHandler.js   # Error handling
│   ├── sockets/
│   │   └── index.js          # Real-time collaboration
│   └── utils/
│       ├── logger.js         # Logging
│       └── helpers.js        # Helper functions
├── public/                    # Frontend files
│   └── index.html            # Main Co-opMaps app
├── uploads/                   # File uploads
├── logs/                      # Application logs
├── docker-compose.yml         # Docker configuration
├── Dockerfile                 # Docker image
└── package.json              # Dependencies

```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available options. Key variables:

- `PORT` - Server port (default: 3000)
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL connection
- `JWT_SECRET` - Secret for JWT tokens
- `MEMBERSHIP_CHECK_ENABLED` - Enable Principle 5 membership validation

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Request password reset

### Users
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update profile
- `PUT /api/users/me/password` - Change password
- `GET /api/users/me/membership` - Get membership status

### Diagrams
- `GET /api/diagrams` - List user's diagrams
- `POST /api/diagrams` - Create new diagram
- `GET /api/diagrams/:id` - Get diagram
- `PUT /api/diagrams/:id` - Update diagram
- `DELETE /api/diagrams/:id` - Delete diagram
- `POST /api/diagrams/:id/duplicate` - Duplicate diagram
- `GET /api/diagrams/:id/export/:format` - Export (PDF/PNG/SVG)

### Collaboration
- `GET /api/diagrams/:id/collaborators` - List collaborators
- `POST /api/diagrams/:id/collaborators` - Add collaborator
- `DELETE /api/diagrams/:id/collaborators/:userId` - Remove
- `PUT /api/diagrams/:id/collaborators/:userId` - Update permissions

### Public
- `GET /api/public/diagrams` - List public diagrams
- `GET /api/public/diagrams/:id` - View public diagram
- `GET /api/templates` - List templates

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. Register or login to get an access token
2. Include token in `Authorization` header: `Bearer <token>`
3. Tokens expire after 1 hour (configurable)
4. Use refresh token to get new access token

Example:
```javascript
// Login
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'password123' })
});
const { accessToken, refreshToken } = await response.json();

// Use token for authenticated requests
const diagrams = await fetch('http://localhost:3000/api/diagrams', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

## 🔄 Real-time Collaboration

Co-opMaps supports real-time collaboration using Socket.io:

```javascript
// Connect to socket
const socket = io('http://localhost:3000', {
  auth: { token: accessToken }
});

// Join diagram room
socket.emit('diagram:join', { diagramId: 'uuid-here' });

// Listen for updates
socket.on('diagram:update', (data) => {
  // Handle real-time diagram updates
  console.log('Diagram updated:', data);
});

// Broadcast your changes
socket.emit('diagram:update', {
  diagramId: 'uuid-here',
  changes: { /* diagram changes */ }
});
```

## 🐳 Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services included:
- Web server (Node.js)
- PostgreSQL database
- Redis (optional)
- Nginx reverse proxy (optional)

## 📊 Database Schema

### Key Tables

**users** - User accounts with Principle 5 membership
**diagrams** - Co-operative ecosystem diagrams
**enterprises** - Enterprises within diagrams
**relationships** - Relationships between enterprises
**diagram_versions** - Version history
**diagram_collaborators** - Sharing and permissions

See `server/db/schema.sql` for complete schema.

## 🔍 Development

```bash
# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Run database migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed
```

## 🛡️ Security Features

- Password hashing with bcrypt
- JWT token authentication
- Rate limiting
- CORS protection
- SQL injection prevention (parameterized queries)
- XSS protection (helmet.js)
- Input validation and sanitization
- HTTPS enforcement in production

## 📈 Performance

- Connection pooling for PostgreSQL
- Redis caching for sessions and frequently accessed data
- Compression middleware
- Optimized database queries with indexes
- Lazy loading and pagination

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U coopmaps_user -d coopmaps -c "SELECT 1"
```

### Port Already in Use
```bash
# Change PORT in .env file or kill process
lsof -ti:3000 | xargs kill -9
```

### Permission Denied
```bash
# Ensure proper file permissions
chmod -R 755 server/
chmod 600 .env
```

## 📝 License

This software is provided by Principle 5 Yorkshire Co-operative Resource Centre.
See ARCHITECTURE.md for full Terms & Conditions of Use.

## 🤝 Contributing

This is a member-only tool for Principle 5. For membership information, visit:
https://www.principle5.coop

## 📧 Support

For technical support or membership enquiries:
- Website: https://www.principle5.coop
- Email: support@principle5.coop

## 🔄 Migration from LocalStorage

To migrate existing diagrams from browser localStorage to the server:

```javascript
// In browser console on existing Co-opMaps
const diagrams = JSON.parse(localStorage.getItem('coopmaps_diagrams'));

// Save to file
const blob = new Blob([JSON.stringify(diagrams)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'coopmaps-export.json';
a.click();

// Then use import endpoint (coming soon)
// POST /api/diagrams/import with the JSON file
```

## 🎯 Roadmap

- [x] Core backend API
- [x] Authentication & authorization
- [x] Real-time collaboration
- [x] PostgreSQL database
- [ ] Email notifications
- [ ] Advanced search
- [ ] Public gallery
- [ ] Template marketplace
- [ ] Mobile app support
- [ ] Integration with Principle 5 membership system
- [ ] Analytics dashboard
- [ ] Automated backups
- [ ] Multi-language support

## ⚙️ System Requirements

### Production
- 2+ CPU cores
- 4GB+ RAM
- 20GB+ storage
- Node.js 18+
- PostgreSQL 14+
- Ubuntu 20.04+ or similar

### Development
- 1+ CPU cores
- 2GB+ RAM
- 5GB+ storage
