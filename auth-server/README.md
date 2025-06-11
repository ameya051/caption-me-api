# Caption-Me Auth Service

A TypeScript Express.js microservice for authentication and user management.

## Features

- 🔐 User registration and login
- 🎫 JWT-based authentication with refresh tokens
- 📧 Email verification
- 🔑 Password reset functionality
- 👤 User profile management
- 🗃️ PostgreSQL database with Drizzle ORM
- 🛡️ Security best practices (helmet, bcrypt, rate limiting)
- 📝 TypeScript for type safety
- 🔄 Hot reload development

## Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Generate and run database migrations:**
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

4. **Start development server:**
   ```bash
   pnpm dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/verify-email` - Verify email address

### Password Management
- `POST /api/password/forgot-password` - Request password reset
- `POST /api/password/reset-password` - Reset password with token
- `POST /api/password/change-password` - Change password (authenticated)

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `DELETE /api/user/deactivate` - Deactivate account

### System
- `GET /api/health` - Health check
- `GET /` - Service information

## Environment Variables

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/auth_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Password Configuration
BCRYPT_SALT_ROUNDS=12

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

## Database Schema

The service uses the following main tables:
- `users` - User accounts and profiles
- `refresh_tokens` - JWT refresh token management
- `email_verification_tokens` - Email verification tokens
- `password_reset_tokens` - Password reset tokens

## Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build TypeScript to JavaScript
- `pnpm start` - Start production server
- `pnpm db:generate` - Generate database migrations
- `pnpm db:migrate` - Run database migrations
- `pnpm db:push` - Push schema changes to database
- `pnpm db:studio` - Open Drizzle Studio

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Refresh token rotation
- Email verification
- Password strength validation
- CORS protection
- Helmet security headers
- Request logging

## Development

The service is built with:
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Drizzle ORM** - Database ORM
- **PostgreSQL** - Database
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a secure `JWT_SECRET`
3. Configure proper CORS origins
4. Set up SSL/TLS
5. Configure rate limiting
6. Set up monitoring and logging

## API Response Format

All endpoints return responses in this format:

```json
{
  "success": boolean,
  "message": string,
  "data": object | null,
  "error": string | null
}
```

## Error Handling

The service includes comprehensive error handling with appropriate HTTP status codes:
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error
