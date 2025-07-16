# 🔐 Admin Panel API Documentation

## Overview
Professional admin panel API for marketplace management with enterprise-grade security, comprehensive user management, and detailed audit trails.

**Version:** 1.0.0  
**Base URL:** `/admin`  
**Authentication:** JWT Bearer Token  
**Rate Limiting:** 100 requests/minute per admin  

---

## 🛡️ Authentication

### Headers Required
```http
Authorization: Bearer <jwt_token>
Cookie: admin_token=<jwt_token> (alternative)
```

### Security Features
- JWT token validation with session management
- Rate limiting (5 login attempts per 15 minutes)
- IP tracking and security event logging
- Role-based access control (admin/moderator)
- Activity audit trail for all operations

---

## 📊 API Endpoints

### Health Check
```http
GET /admin/health
```
**Response:**
```json
{
  "success": true,
  "service": "Admin Panel API",
  "version": "1.0.0",
  "timestamp": "2025-01-15T18:30:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

---

## 👥 User Management

### Get Users List
```http
GET /admin/users?page=1&limit=20&search=john&role=user&status=active&sortBy=createdAt&sortOrder=desc
```

**Query Parameters:**
- `page` (number, optional): Page number (default: 1, max: 10000)
- `limit` (number, optional): Items per page (default: 20, max: 100)
- `search` (string, optional): Search in name/email (1-100 chars)
- `role` (string, optional): Filter by role (`user`, `moderator`, `admin`)
- `status` (string, optional): Filter by status (`active`, `blocked`, `pending`, `deleted`)
- `sortBy` (string, optional): Sort field (`createdAt`, `updatedAt`, `name`, `email`, `role`, `status`)
- `sortOrder` (string, optional): Sort order (`asc`, `desc`)
- `dateFrom` (ISO date, optional): Filter from date
- `dateTo` (ISO date, optional): Filter to date

**Permissions:** admin, moderator

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "Jan Kowalski",
        "email": "jan@example.com",
        "role": "user",
        "status": "active",
        "isVerified": true,
        "phone": "+48123456789",
        "location": "Warszawa",
        "createdAt": "2025-01-01T10:00:00.000Z",
        "updatedAt": "2025-01-15T18:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 100,
      "limit": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "message": "Retrieved 20 users"
}
```

### Get User Details
```http
GET /admin/users/:id
```

**Permissions:** admin, moderator

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Jan Kowalski",
    "email": "jan@example.com",
    "role": "user",
    "status": "active",
    "isVerified": true,
    "phone": "+48123456789",
    "location": "Warszawa",
    "preferences": {
      "notifications": true,
      "newsletter": false,
      "language": "pl"
    },
    "statistics": {
      "totalListings": 5,
      "activeListings": 3,
      "totalTransactions": 12,
      "accountAge": 365,
      "lastActivity": "2025-01-15T18:00:00.000Z"
    },
    "createdAt": "2025-01-01T10:00:00.000Z",
    "updatedAt": "2025-01-15T18:30:00.000Z"
  },
  "message": "User retrieved successfully"
}
```

### Update User
```http
PUT /admin/users/:id
```

**Permissions:** admin, moderator

**Request Body:**
```json
{
  "name": "Jan Nowak",
  "email": "jan.nowak@example.com",
  "role": "moderator",
  "status": "active",
  "isVerified": true,
  "phone": "+48987654321",
  "location": "Kraków",
  "preferences": {
    "notifications": false,
    "newsletter": true,
    "language": "en"
  }
}
```

**Validation Rules:**
- `name`: 2-50 characters, letters/spaces/hyphens/apostrophes only
- `email`: Valid email format, max 100 characters
- `role`: `user`, `moderator`, `admin`
- `status`: `active`, `blocked`, `pending`, `deleted`
- `phone`: Polish phone number format
- `location`: 2-100 characters

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Jan Nowak",
    "email": "jan.nowak@example.com",
    "role": "moderator",
    "status": "active"
  },
  "message": "User updated successfully"
}
```

### Block/Unblock User
```http
POST /admin/users/:id/block
```

**Permissions:** admin, moderator

**Request Body:**
```json
{
  "blocked": true,
  "reason": "Inappropriate behavior in comments section"
}
```

**Validation:**
- `blocked`: boolean (required)
- `reason`: 10-500 characters (required when blocking)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "status": "blocked"
  },
  "message": "User blocked successfully"
}
```

### Delete User
```http
DELETE /admin/users/:id
```

**Permissions:** admin only

**Request Body:**
```json
{
  "reason": "Account deletion requested by user via GDPR compliance"
}
```

**Validation:**
- `reason`: 10-1000 characters (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "User deleted successfully",
    "deletedUser": {
      "id": "507f1f77bcf86cd799439011",
      "email": "jan@example.com",
      "name": "Jan Kowalski"
    }
  },
  "message": "User deleted successfully"
}
```

### Bulk Update Users
```http
POST /admin/users/bulk-update
```

**Permissions:** admin, moderator (max 50 users for moderators)

**Request Body:**
```json
{
  "userIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012"
  ],
  "updateData": {
    "status": "active",
    "isVerified": true
  }
}
```

**Validation:**
- `userIds`: Array of 1-100 valid MongoDB ObjectIds
- `updateData`: Object with allowed fields (`role`, `status`, `isVerified`)

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "modifiedCount": 2,
    "matchedCount": 2,
    "message": "Successfully updated 2 users"
  },
  "message": "Bulk update completed: 2 users updated"
}
```

### Get User Analytics
```http
GET /admin/users/analytics?timeframe=30d
```

**Permissions:** admin only

**Query Parameters:**
- `timeframe`: `7d`, `30d`, `90d`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "recentUsers": 45,
    "verifiedUsers": 980,
    "usersByRole": [
      { "_id": "user", "count": 1200 },
      { "_id": "moderator", "count": 45 },
      { "_id": "admin", "count": 5 }
    ],
    "usersByStatus": [
      { "_id": "active", "count": 1100 },
      { "_id": "blocked", "count": 50 },
      { "_id": "pending", "count": 100 }
    ],
    "timeframe": "30d",
    "generatedAt": "2025-01-15T18:30:00.000Z"
  },
  "message": "User analytics retrieved successfully"
}
```

### Export Users
```http
GET /admin/users/export?format=csv&filters={"role":"user"}
```

**Permissions:** admin only

**Query Parameters:**
- `format`: `json`, `csv`
- `filters`: JSON string with filter options

**Response (JSON):**
```json
{
  "exportedAt": "2025-01-15T18:30:00.000Z",
  "totalUsers": 1200,
  "users": [...]
}
```

**Response (CSV):**
```csv
ID,Name,Email,Role,Status,Created At,Verified
507f1f77bcf86cd799439011,Jan Kowalski,jan@example.com,user,active,2025-01-01T10:00:00.000Z,true
```

---

## 🚨 Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional details (development only)"
}
```

### Common Error Codes

#### Authentication Errors
- `MISSING_TOKEN` (401): No authentication token provided
- `INVALID_SESSION` (401): Session expired or invalid
- `AUTH_FAILED` (401): Authentication failed
- `INSUFFICIENT_PERMISSIONS` (403): User lacks required permissions

#### Validation Errors
- `VALIDATION_ERROR` (400): Request validation failed
- `INVALID_USER_ID` (400): Invalid MongoDB ObjectId format
- `INVALID_LIMIT` (400): Pagination limit exceeded
- `MISSING_BLOCK_REASON` (400): Reason required for blocking

#### Business Logic Errors
- `USER_NOT_FOUND` (404): User does not exist
- `SELF_BLOCK_FORBIDDEN` (403): Cannot block own account
- `SELF_DELETE_FORBIDDEN` (403): Cannot delete own account
- `SYSTEM_ADMIN_PROTECTED` (403): Cannot modify system admin

#### Rate Limiting
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `API_RATE_LIMIT_EXCEEDED` (429): API rate limit exceeded

---

## 🔒 Security Features

### Rate Limiting
- **Login attempts:** 5 per 15 minutes per IP/email
- **API requests:** 100 per minute per authenticated admin
- **Bulk operations:** Limited by role (moderators: 50 users max)

### Activity Logging
All admin actions are logged with:
- Admin ID and session information
- Action type and target resource
- IP address and user agent
- Request details and execution time
- Success/failure status

### Data Protection
- Sensitive data masking in logs
- Input sanitization and validation
- SQL injection prevention
- XSS protection
- CSRF protection (when using cookies)

### Permission System
- **Admin:** Full access to all operations
- **Moderator:** Limited access (cannot delete users, limited bulk operations)
- **Role hierarchy:** Only admins can assign admin/moderator roles

---

## 📈 Performance

### Optimization Features
- Database query optimization with indexes
- Pagination for large datasets
- Parallel query execution where possible
- Efficient aggregation pipelines for analytics
- Response caching for static data

### Monitoring
- Request execution time tracking
- Memory usage monitoring
- System performance metrics
- Security event logging
- Error rate monitoring

---

## 🔧 Development

### Environment Variables
```env
JWT_ADMIN_SECRET=your_jwt_secret_here
SYSTEM_ADMIN_ID=507f1f77bcf86cd799439011
NODE_ENV=production
```

### Testing
```bash
# Run admin panel tests
npm run test:admin

# Run security tests
npm run test:security

# Run performance tests
npm run test:performance
```

---

## 📞 Support

For technical support or security issues:
- **Email:** admin-support@marketplace.com
- **Security:** security@marketplace.com
- **Documentation:** https://docs.marketplace.com/admin
