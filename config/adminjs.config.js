import AdminJS from 'adminjs';
import * as AdminJSMongoose from '@adminjs/mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Import wszystkich modeli
import User from '../models/user.js';
import Ad from '../models/ad.js';
import Message from '../models/message.js';
import Notification from '../models/notification.js';
import Comment from '../models/comment.js';
import AdminActivity from '../admin/models/AdminActivity.js';
import Promotion from '../admin/models/Promotion.js';
import SystemSettings from '../admin/models/SystemSettings.js';

// Import kontrolerów dla custom actions
import { getDashboardStats } from '../admin/controllers/dashboard/dashboardController.js';

/**
 * Comprehensive AdminJS Configuration
 * Integrates all models with custom actions and dashboard
 */

// Register AdminJS Mongoose adapter
AdminJS.registerAdapter(AdminJSMongoose);

/**
 * Custom Dashboard Handler
 * Integrates with existing dashboard controller
 */
const customDashboardHandler = async (request, response, context) => {
  try {
    // Use existing dashboard controller logic
    const mockReq = { user: context.currentAdmin };
    const mockRes = {
      json: (data) => data,
      status: () => mockRes
    };
    
    // Get dashboard stats using existing controller
    const dashboardData = await getDashboardStats(mockReq, mockRes);
    
    // Additional AdminJS specific stats
    const totalUsers = await User.countDocuments();
    const totalListings = await Ad.countDocuments();
    const activeListings = await Ad.countDocuments({ status: 'active' });
    const pendingReports = await AdminActivity.countDocuments({ 
      actionType: { $regex: /^report_/ },
      'result.status': 'pending'
    }).catch(() => 0);
    
    const unreadMessages = await Message.countDocuments({ read: false });
    const unreadNotifications = await Notification.countDocuments({ isRead: false });
    
    // Recent activity from AdminActivity model
    const recentActivities = await AdminActivity.find()
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('actionType targetResource result createdAt adminId');

    return {
      stats: {
        totalUsers,
        totalListings,
        activeListings,
        pendingReports,
        unreadMessages,
        unreadNotifications
      },
      recentActivities: recentActivities.map(activity => ({
        id: activity._id,
        action: activity.actionType,
        admin: activity.adminId?.name || 'Unknown',
        target: activity.targetResource?.resourceType || 'system',
        status: activity.result?.status || 'unknown',
        time: activity.createdAt,
        message: `${activity.actionType.replace(/_/g, ' ')} - ${activity.result?.status || 'completed'}`
      })),
      message: 'AutoSell.pl - Zintegrowany Panel Administracyjny',
      customData: dashboardData?.data || {}
    };
  } catch (error) {
    console.error('AdminJS Dashboard error:', error);
    return {
      stats: {
        totalUsers: 0,
        totalListings: 0,
        activeListings: 0,
        pendingReports: 0,
        unreadMessages: 0,
        unreadNotifications: 0
      },
      recentActivities: [],
      error: 'Błąd podczas ładowania danych dashboardu',
      message: 'Panel administracyjny - błąd ładowania'
    };
  }
};

/**
 * Custom Actions for bulk operations
 */
const bulkUserActions = {
  bulkBlock: {
    actionType: 'bulk',
    component: false,
    handler: async (request, response, context) => {
      const { records } = request.payload;
      const results = [];
      
      for (const record of records) {
        try {
          await User.findByIdAndUpdate(record.id, { 
            status: 'suspended',
            suspendedBy: context.currentAdmin.id,
            suspendedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            suspensionReason: 'Bulk suspension by admin'
          });
          
          // Log activity
          await AdminActivity.create({
            adminId: context.currentAdmin.id,
            actionType: 'user_blocked',
            targetResource: {
              resourceType: 'user',
              resourceId: record.id
            },
            result: { status: 'success' },
            requestContext: {
              ipAddress: request.ip || '127.0.0.1',
              userAgent: request.headers['user-agent'] || 'AdminJS',
              sessionId: request.session?.id || 'admin-session'
            }
          });
          
          results.push({ id: record.id, status: 'success' });
        } catch (error) {
          results.push({ id: record.id, status: 'error', error: error.message });
        }
      }
      
      return {
        notice: {
          message: `Bulk operation completed. ${results.filter(r => r.status === 'success').length} users blocked.`,
          type: 'success'
        },
        redirectUrl: '/admin/resources/User'
      };
    }
  },
  
  exportUsers: {
    actionType: 'resource',
    component: false,
    handler: async (request, response, context) => {
      try {
        const users = await User.find()
          .select('name lastName email phoneNumber role status createdAt')
          .lean();
        
        // Log export activity
        await AdminActivity.create({
          adminId: context.currentAdmin.id,
          actionType: 'data_export',
          targetResource: {
            resourceType: 'user',
            resourceIdentifier: 'all_users'
          },
          actionDetails: {
            affectedCount: users.length,
            metadata: { exportType: 'csv', format: 'user_data' }
          },
          result: { status: 'success' },
          requestContext: {
            ipAddress: request.ip || '127.0.0.1',
            userAgent: request.headers['user-agent'] || 'AdminJS',
            sessionId: request.session?.id || 'admin-session'
          }
        });
        
        // Convert to CSV format
        const csvHeader = 'ID,Name,Last Name,Email,Phone,Role,Status,Created At\n';
        const csvData = users.map(user => 
          `${user._id},${user.name},${user.lastName},${user.email},${user.phoneNumber},${user.role},${user.status},${user.createdAt}`
        ).join('\n');
        
        response.setHeader('Content-Type', 'text/csv');
        response.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
        response.send(csvHeader + csvData);
        
        return response;
      } catch (error) {
        return {
          notice: {
            message: `Export failed: ${error.message}`,
            type: 'error'
          }
        };
      }
    }
  }
};

/**
 * Main AdminJS Configuration
 */
export const adminJsConfig = {
  databases: [],
  rootPath: '/admin',
  branding: {
    companyName: 'AutoSell.pl - Panel Administracyjny',
    logo: false,
    softwareBrothers: false,
    favicon: '/favicon.ico'
  },
  
  dashboard: {
    handler: customDashboardHandler,
    component: false
  },
  
  resources: [
    // Users Management
    {
      resource: User,
      options: {
        navigation: {
          name: 'Zarządzanie Użytkownikami',
          icon: 'User'
        },
        properties: {
          // Visible fields
          name: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 1
          },
          lastName: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 2
          },
          email: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 3
          },
          phoneNumber: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 4
          },
          role: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 5,
            availableValues: [
              { value: 'user', label: 'Użytkownik' },
              { value: 'moderator', label: 'Moderator' },
              { value: 'admin', label: 'Administrator' }
            ]
          },
          status: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 6,
            availableValues: [
              { value: 'active', label: 'Aktywny' },
              { value: 'suspended', label: 'Zawieszony' },
              { value: 'banned', label: 'Zbanowany' }
            ]
          },
          isEmailVerified: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 7
          },
          isPhoneVerified: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 8
          },
          createdAt: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 20
          },
          updatedAt: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 21
          },
          
          // Hidden sensitive fields
          password: { isVisible: false },
          __v: { isVisible: false },
          twoFACode: { isVisible: false },
          loginAttempts: { isVisible: { list: false, filter: false, show: true, edit: false } },
          
          // Grouped fields
          favorites: { isVisible: { list: false, filter: false, show: true, edit: false } },
          notificationPreferences: { isVisible: { list: false, filter: false, show: true, edit: true } },
          privacySettings: { isVisible: { list: false, filter: false, show: true, edit: true } },
          bonuses: { isVisible: { list: false, filter: false, show: true, edit: true } }
        },
        
        actions: {
          // Custom bulk actions
          bulkBlock: bulkUserActions.bulkBlock,
          exportUsers: bulkUserActions.exportUsers,
          
          // Override default actions
          new: {
            before: async (request) => {
              if (request.payload.password) {
                request.payload.password = await bcrypt.hash(request.payload.password, 12);
              }
              return request;
            }
          },
          edit: {
            before: async (request) => {
              if (request.payload.password && request.payload.password.trim() !== '') {
                request.payload.password = await bcrypt.hash(request.payload.password, 12);
              } else {
                delete request.payload.password;
              }
              return request;
            }
          },
          
          // Custom user actions
          blockUser: {
            actionType: 'record',
            component: false,
            handler: async (request, response, context) => {
              const { record } = context;
              
              await User.findByIdAndUpdate(record.id, {
                status: 'suspended',
                suspendedBy: context.currentAdmin.id,
                suspendedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                suspensionReason: 'Blocked by admin'
              });
              
              // Log activity
              await AdminActivity.create({
                adminId: context.currentAdmin.id,
                actionType: 'user_blocked',
                targetResource: {
                  resourceType: 'user',
                  resourceId: record.id,
                  resourceIdentifier: record.params.email
                },
                result: { status: 'success' },
                requestContext: {
                  ipAddress: request.ip || '127.0.0.1',
                  userAgent: request.headers['user-agent'] || 'AdminJS',
                  sessionId: request.session?.id || 'admin-session'
                }
              });
              
              return {
                notice: {
                  message: 'Użytkownik został zablokowany',
                  type: 'success'
                },
                redirectUrl: '/admin/resources/User'
              };
            }
          }
        },
        
        listProperties: ['name', 'lastName', 'email', 'role', 'status', 'createdAt'],
        filterProperties: ['name', 'lastName', 'email', 'role', 'status', 'isEmailVerified'],
        showProperties: ['name', 'lastName', 'email', 'phoneNumber', 'role', 'status', 'isEmailVerified', 'isPhoneVerified', 'createdAt', 'updatedAt', 'favorites', 'notificationPreferences'],
        editProperties: ['name', 'lastName', 'email', 'phoneNumber', 'role', 'status', 'password', 'notificationPreferences', 'privacySettings']
      }
    },
    
    // Listings Management
    {
      resource: Ad,
      options: {
        navigation: {
          name: 'Zarządzanie Ogłoszeniami',
          icon: 'Car'
        },
        properties: {
          title: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 1
          },
          price: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 2
          },
          status: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 3,
            availableValues: [
              { value: 'active', label: 'Aktywne' },
              { value: 'inactive', label: 'Nieaktywne' },
              { value: 'pending', label: 'Oczekujące' },
              { value: 'rejected', label: 'Odrzucone' },
              { value: 'sold', label: 'Sprzedane' }
            ]
          },
          brand: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 10
          },
          model: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 11
          },
          year: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 12
          },
          mileage: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 13
          },
          userId: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 20
          },
          createdAt: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 30
          },
          updatedAt: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 31
          },
          
          // Complex fields - show only in detail view
          images: { isVisible: { list: false, filter: false, show: true, edit: true } },
          description: { isVisible: { list: false, filter: false, show: true, edit: true } },
          technicalDetails: { isVisible: { list: false, filter: false, show: true, edit: true } },
          statistics: { isVisible: { list: false, filter: false, show: true, edit: false } },
          __v: { isVisible: false }
        },
        
        actions: {
          list: {
            before: async (request) => {
              if (!request.query.sortBy) {
                request.query.sortBy = 'createdAt';
                request.query.direction = 'desc';
              }
              return request;
            }
          },
          
          // Custom listing actions
          approveListing: {
            actionType: 'record',
            component: false,
            handler: async (request, response, context) => {
              const { record } = context;
              
              await Ad.findByIdAndUpdate(record.id, { status: 'active' });
              
              await AdminActivity.create({
                adminId: context.currentAdmin.id,
                actionType: 'listing_approved',
                targetResource: {
                  resourceType: 'listing',
                  resourceId: record.id,
                  resourceIdentifier: record.params.title
                },
                result: { status: 'success' },
                requestContext: {
                  ipAddress: request.ip || '127.0.0.1',
                  userAgent: request.headers['user-agent'] || 'AdminJS',
                  sessionId: request.session?.id || 'admin-session'
                }
              });
              
              return {
                notice: {
                  message: 'Ogłoszenie zostało zatwierdzone',
                  type: 'success'
                },
                redirectUrl: '/admin/resources/Ad'
              };
            }
          },
          
          rejectListing: {
            actionType: 'record',
            component: false,
            handler: async (request, response, context) => {
              const { record } = context;
              
              await Ad.findByIdAndUpdate(record.id, { status: 'rejected' });
              
              await AdminActivity.create({
                adminId: context.currentAdmin.id,
                actionType: 'listing_rejected',
                targetResource: {
                  resourceType: 'listing',
                  resourceId: record.id,
                  resourceIdentifier: record.params.title
                },
                result: { status: 'success' },
                requestContext: {
                  ipAddress: request.ip || '127.0.0.1',
                  userAgent: request.headers['user-agent'] || 'AdminJS',
                  sessionId: request.session?.id || 'admin-session'
                }
              });
              
              return {
                notice: {
                  message: 'Ogłoszenie zostało odrzucone',
                  type: 'success'
                },
                redirectUrl: '/admin/resources/Ad'
              };
            }
          }
        },
        
        listProperties: ['title', 'price', 'brand', 'model', 'status', 'createdAt'],
        filterProperties: ['title', 'brand', 'model', 'status', 'price', 'year'],
        showProperties: ['title', 'description', 'price', 'brand', 'model', 'year', 'mileage', 'status', 'userId', 'images', 'createdAt'],
        editProperties: ['title', 'description', 'price', 'brand', 'model', 'year', 'mileage', 'status']
      }
    },
    
    // Messages Management
    {
      resource: Message,
      options: {
        navigation: {
          name: 'System Komunikacji',
          icon: 'Message'
        },
        properties: {
          subject: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 1
          },
          sender: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 2
          },
          recipient: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 3
          },
          read: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 4
          },
          createdAt: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 10
          },
          content: { isVisible: { list: false, filter: false, show: true, edit: false } },
          attachments: { isVisible: { list: false, filter: false, show: true, edit: false } },
          relatedAd: { isVisible: { list: false, filter: true, show: true, edit: false } }
        },
        
        listProperties: ['subject', 'sender', 'recipient', 'read', 'createdAt'],
        filterProperties: ['sender', 'recipient', 'read', 'relatedAd'],
        showProperties: ['subject', 'content', 'sender', 'recipient', 'read', 'starred', 'relatedAd', 'attachments', 'createdAt']
      }
    },
    
    // Notifications Management
    {
      resource: Notification,
      options: {
        navigation: {
          name: 'System Komunikacji',
          icon: 'Bell'
        },
        properties: {
          title: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 1
          },
          type: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 2
          },
          userId: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 3
          },
          isRead: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 4
          },
          createdAt: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 10
          },
          message: { isVisible: { list: false, filter: false, show: true, edit: true } },
          link: { isVisible: { list: false, filter: false, show: true, edit: true } },
          metadata: { isVisible: { list: false, filter: false, show: true, edit: true } }
        },
        
        listProperties: ['title', 'type', 'userId', 'isRead', 'createdAt'],
        filterProperties: ['type', 'isRead', 'userId'],
        showProperties: ['title', 'message', 'type', 'userId', 'isRead', 'link', 'metadata', 'createdAt']
      }
    },
    
    // Comments Management
    {
      resource: Comment,
      options: {
        navigation: {
          name: 'Moderacja Treści',
          icon: 'MessageSquare'
        },
        properties: {
          content: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 1
          },
          user: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 2
          },
          ad: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 3
          },
          createdAt: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 10
          },
          image: { isVisible: { list: false, filter: false, show: true, edit: true } }
        },
        
        listProperties: ['content', 'user', 'ad', 'createdAt'],
        filterProperties: ['user', 'ad'],
        showProperties: ['content', 'user', 'ad', 'image', 'createdAt']
      }
    },
    
    // Admin Activity Logs
    {
      resource: AdminActivity,
      options: {
        navigation: {
          name: 'System i Bezpieczeństwo',
          icon: 'Activity'
        },
        properties: {
          actionType: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 1
          },
          adminId: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 2
          },
          'targetResource.resourceType': { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 3
          },
          'result.status': { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 4
          },
          'securityFlags.riskLevel': { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 5
          },
          createdAt: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 10
          }
        },
        
        actions: {
          new: { isVisible: false },
          edit: { isVisible: false },
          delete: { isVisible: false }
        },
        
        listProperties: ['actionType', 'adminId', 'targetResource.resourceType', 'result.status', 'securityFlags.riskLevel', 'createdAt'],
        filterProperties: ['actionType', 'adminId', 'targetResource.resourceType', 'result.status', 'securityFlags.riskLevel'],
        showProperties: ['actionType', 'adminId', 'targetResource', 'actionDetails', 'requestContext', 'result', 'securityFlags', 'createdAt']
      }
    },
    
    // Promotions Management
    {
      resource: Promotion,
      options: {
        navigation: {
          name: 'Marketing i Promocje',
          icon: 'Gift'
        },
        properties: {
          title: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 1
          },
          type: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 2,
            availableValues: [
              { value: 'percentage', label: 'Procent' },
              { value: 'fixed_amount', label: 'Stała kwota' },
              { value: 'free_listing', label: 'Darmowe ogłoszenie' },
              { value: 'featured_upgrade', label: 'Wyróżnienie' },
              { value: 'bonus_credits', label: 'Kredyty bonusowe' }
            ]
          },
          value: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 3
          },
          status: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 4,
            availableValues: [
              { value: 'draft', label: 'Szkic' },
              { value: 'active', label: 'Aktywna' },
              { value: 'paused', label: 'Wstrzymana' },
              { value: 'expired', label: 'Wygasła' },
              { value: 'cancelled', label: 'Anulowana' }
            ]
          },
          validFrom: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 5
          },
          validTo: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 6
          },
          usedCount: { 
            isVisible: { list: true, filter: false, show: true, edit: false },
            position: 7
          },
          createdAt: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 20
          },
          
          // Complex fields - show only in detail view
          description: { isVisible: { list: false, filter: false, show: true, edit: true } },
          targetCriteria: { isVisible: { list: false, filter: false, show: true, edit: true } },
          conditions: { isVisible: { list: false, filter: false, show: true, edit: true } },
          analytics: { isVisible: { list: false, filter: false, show: true, edit: false } }
        },
        
        actions: {
          // Custom promotion actions
          activatePromotion: {
            actionType: 'record',
            component: false,
            handler: async (request, response, context) => {
              const { record } = context;
              
              await Promotion.findByIdAndUpdate(record.id, { 
                status: 'active',
                approvedBy: context.currentAdmin.id,
                approvedAt: new Date()
              });
              
              await AdminActivity.create({
                adminId: context.currentAdmin.id,
                actionType: 'promotion_activated',
                targetResource: {
                  resourceType: 'promotion',
                  resourceId: record.id,
                  resourceIdentifier: record.params.title
                },
                result: { status: 'success' },
                requestContext: {
                  ipAddress: request.ip || '127.0.0.1',
                  userAgent: request.headers['user-agent'] || 'AdminJS',
                  sessionId: request.session?.id || 'admin-session'
                }
              });
              
              return {
                notice: {
                  message: 'Promocja została aktywowana',
                  type: 'success'
                },
                redirectUrl: '/admin/resources/Promotion'
              };
            }
          }
        },
        
        listProperties: ['title', 'type', 'value', 'status', 'validFrom', 'validTo', 'usedCount'],
        filterProperties: ['title', 'type', 'status', 'validFrom', 'validTo'],
        showProperties: ['title', 'description', 'type', 'value', 'status', 'validFrom', 'validTo', 'usageLimit', 'usedCount', 'targetCriteria', 'conditions', 'analytics', 'createdAt'],
        editProperties: ['title', 'description', 'type', 'value', 'validFrom', 'validTo', 'usageLimit', 'maxUsagePerUser', 'targetType', 'targetCriteria', 'conditions', 'status']
      }
    },
    
    // System Settings Management
    {
      resource: SystemSettings,
      options: {
        navigation: {
          name: 'System i Bezpieczeństwo',
          icon: 'Settings'
        },
        properties: {
          key: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 1
          },
          displayName: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 2
          },
          category: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 3,
            availableValues: [
              { value: 'general', label: 'Ogólne' },
              { value: 'security', label: 'Bezpieczeństwo' },
              { value: 'payment', label: 'Płatności' },
              { value: 'notification', label: 'Powiadomienia' },
              { value: 'moderation', label: 'Moderacja' },
              { value: 'listing', label: 'Ogłoszenia' },
              { value: 'user', label: 'Użytkownicy' },
              { value: 'email', label: 'Email' },
              { value: 'sms', label: 'SMS' },
              { value: 'analytics', label: 'Analityka' }
            ]
          },
          valueType: { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 4,
            availableValues: [
              { value: 'string', label: 'Tekst' },
              { value: 'number', label: 'Liczba' },
              { value: 'boolean', label: 'Prawda/Fałsz' },
              { value: 'array', label: 'Lista' },
              { value: 'object', label: 'Obiekt' },
              { value: 'email', label: 'Email' },
              { value: 'url', label: 'URL' },
              { value: 'json', label: 'JSON' }
            ]
          },
          value: { 
            isVisible: { list: true, filter: false, show: true, edit: true },
            position: 5
          },
          'behavior.isReadonly': { 
            isVisible: { list: true, filter: true, show: true, edit: true },
            position: 6
          },
          updatedAt: { 
            isVisible: { list: true, filter: true, show: true, edit: false },
            position: 20
          },
          
          // Complex fields - show only in detail view
          description: { isVisible: { list: false, filter: false, show: true, edit: true } },
          constraints: { isVisible: { list: false, filter: false, show: true, edit: true } },
          permissions: { isVisible: { list: false, filter: false, show: true, edit: true } },
          changeHistory: { isVisible: { list: false, filter: false, show: true, edit: false } }
        },
        
        actions: {
          // Custom settings actions
          resetToDefault: {
            actionType: 'record',
            component: false,
            handler: async (request, response, context) => {
              const { record } = context;
              
              const setting = await SystemSettings.findById(record.id);
              await setting.updateValue(
                setting.defaultValue,
                context.currentAdmin.id,
                'Reset to default value',
                {
                  ipAddress: request.ip || '127.0.0.1',
                  userAgent: request.headers['user-agent'] || 'AdminJS'
                }
              );
              
              await AdminActivity.create({
                adminId: context.currentAdmin.id,
                actionType: 'settings_updated',
                targetResource: {
                  resourceType: 'system',
                  resourceId: record.id,
                  resourceIdentifier: record.params.key
                },
                actionDetails: {
                  reason: 'Reset to default value',
                  previousState: record.params.value,
                  newState: setting.defaultValue
                },
                result: { status: 'success' },
                requestContext: {
                  ipAddress: request.ip || '127.0.0.1',
                  userAgent: request.headers['user-agent'] || 'AdminJS',
                  sessionId: request.session?.id || 'admin-session'
                }
              });
              
              return {
                notice: {
                  message: 'Ustawienie zostało zresetowane do wartości domyślnej',
                  type: 'success'
                },
                redirectUrl: '/admin/resources/SystemSettings'
              };
            }
          }
        },
        
        listProperties: ['key', 'displayName', 'category', 'valueType', 'value', 'behavior.isReadonly', 'updatedAt'],
        filterProperties: ['key', 'displayName', 'category', 'valueType', 'behavior.isReadonly'],
        showProperties: ['key', 'displayName', 'description', 'category', 'valueType', 'value', 'defaultValue', 'constraints', 'behavior', 'permissions', 'changeHistory', 'updatedAt'],
        editProperties: ['key', 'displayName', 'description', 'category', 'valueType', 'value', 'defaultValue', 'constraints', 'behavior', 'permissions']
      }
    }
  ],
  
  locale: {
    language: 'pl',
    translations: {
      labels: {
        User: 'Użytkownicy',
        Ad: 'Ogłoszenia',
        Message: 'Wiadomości',
        Notification: 'Powiadomienia',
        Comment: 'Komentarze',
        AdminActivity: 'Logi Aktywności'
      },
      buttons: {
        save: 'Zapisz',
        cancel: 'Anuluj',
        delete: 'Usuń',
        edit: 'Edytuj',
        show: 'Pokaż',
        create: 'Utwórz',
        filter: 'Filtruj',
        bulkBlock: 'Zablokuj zaznaczone',
        exportUsers: 'Eksportuj użytkowników',
        approveListing: 'Zatwierdź ogłoszenie',
        rejectListing: 'Odrzuć ogłoszenie',
        blockUser: 'Zablokuj użytkownika'
      }
    }
  }
};

/**
 * Authentication configuration
 * Integrates with existing cookie-based auth system
 */
export const authConfig = {
  authenticate: async (email, password) => {
    try {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      
      if (!user || !['admin', 'moderator'].includes(user.role)) {
        return null;
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
      if (validPassword) {
        // Log successful admin login
        await AdminActivity.create({
          adminId: user._id,
          actionType: 'login_attempt',
          targetResource: {
            resourceType: 'system',
            resourceIdentifier: 'admin_panel'
          },
          result: { status: 'success' },
          requestContext: {
            ipAddress: '127.0.0.1', // Will be updated by middleware
            userAgent: 'AdminJS',
            sessionId: 'admin-session'
          }
        });
        
        return {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    } catch (error) {
      console.error('AdminJS authenticate error:', error);
    }
    return null;
  },
  
  cookieName: 'adminjs_session',
  cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'complex-secure-password-for-cookie-encryption'
};

export default { adminJsConfig, authConfig };
