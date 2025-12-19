# Co-opMaps Backend Setup Guide

Complete step-by-step guide to set up the Co-opMaps backend server.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** and **npm** - [Download](https://nodejs.org/)
- **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)
- **Redis** (optional but recommended) - [Download](https://redis.io/download)

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd Co-op-Maps
```

## Step 2: Install Dependencies

```bash
npm install
```

This will install all required Node.js packages including Express, PostgreSQL driver, JWT, Socket.io, and more.

## Step 3: Set Up PostgreSQL Database

### Option A: Using psql command line

```bash
# Log in to PostgreSQL as superuser
sudo -u postgres psql

# Create database user
CREATE USER coopmaps_user WITH PASSWORD 'your_secure_password';

# Create database
CREATE DATABASE coopmaps OWNER coopmaps_user;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE coopmaps TO coopmaps_user;

# Exit psql
\q
```

### Option B: Using createdb command

```bash
createuser -U postgres coopmaps_user -P
createdb -U postgres -O coopmaps_user coopmaps
```

## Step 4: Run Database Schema

```bash
# Apply the database schema
psql -U coopmaps_user -d coopmaps -f server/db/schema.sql

# Verify tables were created
psql -U coopmaps_user -d coopmaps -c "\dt"
```

You should see the following tables:
- users
- refresh_tokens
- diagrams
- enterprises
- relationships
- diagram_versions
- diagram_collaborators

## Step 5: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your settings
nano .env  # or use your preferred editor
```

### Required environment variables:

```env
# Server
NODE_ENV=development
PORT=3000

# Database (match your PostgreSQL setup)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coopmaps
DB_USER=coopmaps_user
DB_PASSWORD=your_secure_password

# JWT Secrets (generate secure random strings)
JWT_SECRET=your_very_long_secure_random_string_here
JWT_REFRESH_SECRET=another_very_long_secure_random_string_here
```

### Generate secure secrets:

```bash
# On Linux/Mac
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or use online tool: https://www.random.org/strings/
```

## Step 6: Start Redis (Optional)

Redis is used for caching and session management.

```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis

# macOS with Homebrew
brew install redis
brew services start redis

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

If not using Redis, comment out Redis-related code in `server/index.js`.

## Step 7: Create Required Directories

```bash
mkdir -p logs uploads public
```

## Step 8: Start the Server

### Development mode (with auto-restart):

```bash
npm run dev
```

### Production mode:

```bash
npm start
```

You should see:

```
╔═══════════════════════════════════════════════════════╗
║           Co-opMaps Backend Server                    ║
║                                                       ║
║  Server:     http://localhost:3000                    ║
║  API:        http://localhost:3000/api                ║
║  Health:     http://localhost:3000/health             ║
║  Environment: development                             ║
╚═══════════════════════════════════════════════════════╝
```

## Step 9: Test the Installation

### Test health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-XX...",
  "version": "1.0.0"
}
```

### Test user registration:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "full_name": "Test User"
  }'
```

Expected response:
```json
{
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "full_name": "Test User",
    "membership_level": 1
  },
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```

### Test authentication:

```bash
# Save the access token from registration
TOKEN="your_access_token_here"

# Test authenticated endpoint
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

## Step 10: Set Up the Frontend

Copy the Co-opMaps HTML file to the public directory:

```bash
cp path/to/coopmaps.html public/index.html
```

Now open your browser to `http://localhost:3000` to use Co-opMaps with the backend!

## Docker Deployment (Alternative Setup)

For easier deployment using Docker:

### 1. Build and start all services:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis cache
- Node.js backend
- Nginx reverse proxy

### 2. View logs:

```bash
docker-compose logs -f backend
```

### 3. Access the application:

```
http://localhost      # Nginx (port 80)
http://localhost:3000 # Direct backend access
```

### 4. Stop services:

```bash
docker-compose down
```

### 5. Stop and remove volumes (caution - deletes data):

```bash
docker-compose down -v
```

## Troubleshooting

### Issue: Database connection error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
1. Check PostgreSQL is running: `sudo systemctl status postgresql`
2. Check credentials in .env match your database
3. Try connecting manually: `psql -U coopmaps_user -d coopmaps`

### Issue: Port already in use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
1. Change PORT in .env file, or
2. Kill the process using port 3000:
```bash
lsof -ti:3000 | xargs kill -9
```

### Issue: Permission denied on logs directory

```
Error: EACCES: permission denied, open 'logs/error.log'
```

**Solution:**
```bash
chmod -R 755 logs/
```

### Issue: bcrypt installation error

```
Error: Cannot find module 'bcrypt'
```

**Solution:**
```bash
npm rebuild bcrypt
# or
npm install bcryptjs (alternative)
```

### Issue: JWT token invalid

```
Error: jwt malformed
```

**Solution:**
1. Ensure JWT_SECRET is set in .env
2. Token format should be: `Bearer <token>`
3. Check token hasn't expired

## Next Steps

After successful setup:

1. **Configure email** - Set up SMTP in .env for password reset emails
2. **Enable HTTPS** - Configure SSL certificates for production
3. **Set up backups** - Schedule regular PostgreSQL backups
4. **Configure monitoring** - Set up error tracking (Sentry) and logging
5. **Optimize performance** - Enable Redis caching
6. **Integrate with Principle 5** - Connect membership verification API

## Production Deployment Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Generate strong JWT secrets
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up automated backups
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set up monitoring and logging
- [ ] Test disaster recovery
- [ ] Document admin procedures
- [ ] Set up CI/CD pipeline

## Support

For issues or questions:
- Check the main [README.md](README.md)
- Review [ARCHITECTURE.md](ARCHITECTURE.md)
- Visit: https://www.principle5.coop

## Security Notes

**IMPORTANT:**

1. **Change default admin password** - The schema creates an admin user with password `admin123`. Change this immediately:

```sql
-- In psql
UPDATE users SET password_hash = 'new_bcrypt_hash' WHERE email = 'admin@principle5.coop';
```

2. **Use strong secrets** - Generate random strings for JWT_SECRET and JWT_REFRESH_SECRET

3. **Enable HTTPS** - Always use HTTPS in production

4. **Regular updates** - Keep dependencies updated: `npm audit fix`

5. **Backup regularly** - Set up automated PostgreSQL backups

## Development Tips

### Useful commands:

```bash
# Watch server logs
tail -f logs/combined.log

# Database console
psql -U coopmaps_user -d coopmaps

# Clear Redis cache
redis-cli FLUSHALL

# Check all running processes
docker-compose ps

# Restart specific service
docker-compose restart backend
```

### Database management:

```bash
# Backup database
pg_dump -U coopmaps_user coopmaps > backup.sql

# Restore database
psql -U coopmaps_user -d coopmaps < backup.sql

# View table data
psql -U coopmaps_user -d coopmaps -c "SELECT * FROM users;"
```

## Congratulations!

Your Co-opMaps backend server is now running! 🎉

You can now:
- Register users and manage authentication
- Create and save diagrams server-side
- Share diagrams with collaborators
- Access diagrams from any device
- Export diagrams with enhanced quality
- Track version history
- And much more!
