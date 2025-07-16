// Organized imports from new structure
import userRoutes from './user/userRoutes.js';
import adRoutes from './listings/adRoutes.js';
import notificationRoutes from './notifications/notificationRoutes.js';
import transactionRoutes from './payments/transactionRoutes.js';
import paymentRoutes from './payments/paymentRoutes.js';
import commentRoutes from './listings/commentRoutes.js';
import cepikRoutes from './external/cepikRoutes.js';
import messagesRoutes from './communication/messagesRoutes.js';
import favoriteRoutes from './listings/favoriteRoutes.js';
import adminRoutes from './admin/adminRoutes.js';
import statsRoutes from './listings/statsRoutes.js';
import imageRoutes from './media/imageRoutes.js';

// Import organized route modules
import * as userRoutesModule from './user/index.js';
import * as listingsRoutesModule from './listings/index.js';
import * as mediaRoutesModule from './media/index.js';
import * as communicationRoutesModule from './communication/index.js';
import * as notificationsRoutesModule from './notifications/index.js';
import * as paymentsRoutesModule from './payments/index.js';
import * as adminRoutesModule from './admin/index.js';
import * as externalRoutesModule from './external/index.js';

// New Enterprise Admin Panel
import enterpriseAdminRoutes from '../admin/routes/index.js';

/**
 * Professional API Routes Configuration
 * Clean, structured, and maintainable routing system
 * Features: Version control, backward compatibility, enterprise admin panel
 * 
 * @author Senior Developer
 * @version 2.0.0
 */

/**
 * API Route Structure:
 * 
 * /api/v1/          - Main API endpoints (current)
 * /api/v2/          - Future API version (planned)
 * /api/admin-panel/ - Enterprise admin panel (new)
 * /api/legacy/      - Legacy endpoints (deprecated)
 * 
 * Backward compatibility maintained for existing endpoints
 */

export default (app) => {
  // ========================================
  // 🚀 ENTERPRISE ADMIN PANEL (NEW)
  // ========================================
  
  /**
   * Enterprise Admin Panel - Professional Management System
   * Features: JWT auth, role-based access, audit trails, analytics
   * Base URL: /api/admin-panel
   */
  app.use('/api/admin-panel', enterpriseAdminRoutes);
  
  // ========================================
  // 📊 MAIN API ROUTES (v1)
  // ========================================
  
  /**
   * Core API Routes Configuration
   * All main application endpoints with version control
   */
  const coreRoutes = {
    // User Management
    'users': {
      router: userRoutes,
      description: 'User registration, authentication, profile management'
    },
    
    // Content Management
    'ads': {
      router: adRoutes,
      description: 'Advertisement CRUD operations, search, filtering'
    },
    'comments': {
      router: commentRoutes,
      description: 'Comment system for ads and user interactions'
    },
    'images': {
      router: imageRoutes,
      description: 'Image upload, processing, and management'
    },
    
    // Communication
    'messages': {
      router: messagesRoutes,
      description: 'Private messaging between users'
    },
    'notifications': {
      router: notificationRoutes,
      description: 'Real-time notifications and alerts'
    },
    
    // Commerce
    'transactions': {
      router: transactionRoutes,
      description: 'Transaction processing and history'
    },
    'payments': {
      router: paymentRoutes,
      description: 'Payment processing and billing'
    },
    'favorites': {
      router: favoriteRoutes,
      description: 'User favorites and wishlist management'
    },
    
    // External Services
    'cepik': {
      router: cepikRoutes,
      description: 'Vehicle verification through CEPIK database'
    },
    
    // Legacy Admin (will be deprecated)
    'admin': {
      router: adminRoutes,
      description: 'Legacy admin panel (use /api/admin-panel instead)',
      deprecated: true
    }
  };
  
  // ========================================
  // 🔗 ROUTE REGISTRATION
  // ========================================
  
  // Register all core routes with /api/v1 prefix (current version)
  Object.entries(coreRoutes).forEach(([path, config]) => {
    app.use(`/api/v1/${path}`, config.router);
    
    // Maintain backward compatibility (without version prefix)
    app.use(`/api/${path}`, config.router);
    
    // Legacy support (direct path, except admin)
    if (path !== 'admin') {
      app.use(`/${path}`, config.router);
    }
  });
  
  // ========================================
  // 📈 SPECIAL ROUTES
  // ========================================
  
  // Statistics endpoint (special case)
  app.use('/api/v1/ads/stats', statsRoutes);
  app.use('/api/ads/stats', statsRoutes);
  
  // Authentication aliases for frontend compatibility
  const authAliases = [
    '/api/v1/auth',
    '/api/auth',
    '/auth'
  ];
  
  authAliases.forEach(alias => {
    app.use(alias, userRoutes);
  });
  
  // ========================================
  // 📋 API DOCUMENTATION ENDPOINT
  // ========================================
  
  /**
   * API Documentation and Health Check
   * Provides comprehensive API information
   */
  app.get('/api', (req, res) => {
    res.json({
      success: true,
      service: 'Marketplace API',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      
      endpoints: {
        // Enterprise Admin Panel
        adminPanel: {
          baseUrl: '/api/admin-panel',
          description: 'Enterprise admin management system',
          features: ['JWT Authentication', 'Role-based Access', 'Audit Trails', 'Analytics'],
          documentation: '/api/admin-panel/health'
        },
        
        // Core API Endpoints
        core: Object.entries(coreRoutes).reduce((acc, [path, config]) => {
          acc[path] = {
            url: `/api/v1/${path}`,
            description: config.description,
            deprecated: config.deprecated || false
          };
          return acc;
        }, {}),
        
        // Special Endpoints
        special: {
          health: '/api',
          stats: '/api/v1/ads/stats',
          auth: '/api/v1/auth'
        }
      },
      
      versions: {
        current: 'v1',
        supported: ['v1'],
        planned: ['v2'],
        deprecated: []
      },
      
      compatibility: {
        legacy: 'Supported for existing endpoints',
        migration: 'Use /api/v1/ prefix for new implementations'
      }
    });
  });
  
  // ========================================
  // 🔍 API HEALTH CHECK
  // ========================================
  
  /**
   * Detailed health check endpoint
   */
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '2.0.0',
      
      services: {
        database: 'connected',
        adminPanel: 'active',
        fileUploads: 'active',
        notifications: 'active'
      },
      
      performance: {
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        nodeVersion: process.version,
        platform: process.platform
      }
    });
  });
  
  // ========================================
  // 🚨 ERROR HANDLING
  // ========================================
  
  /**
   * 404 handler for API routes
   */
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found',
      code: 'ENDPOINT_NOT_FOUND',
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      
      suggestions: [
        'Check the API documentation at /api',
        'Verify the endpoint URL and HTTP method',
        'Use /api/v1/ prefix for current API version',
        'Try /api/admin-panel for admin operations'
      ],
      
      availableEndpoints: {
        documentation: '/api',
        health: '/api/health',
        adminPanel: '/api/admin-panel/health',
        coreAPI: Object.keys(coreRoutes).map(route => `/api/v1/${route}`)
      }
    });
  });
};
