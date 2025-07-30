/**
 * COOKIE SECURITY ANALYZER
 * 
 * Analizuje konfigurację ciasteczek pod kątem bezpieczeństwa
 * Sprawdza HttpOnly, Secure, SameSite, maxAge i inne atrybuty
 * 
 * @author Security Audit Team
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';

/**
 * Cookie Security Analyzer Class
 */
export class CookieSecurityAnalyzer {
  constructor(auditResults) {
    this.auditResults = auditResults;
  }

  /**
   * Analyze cookie security configuration
   */
  analyzeCookieSecurity(files) {
    console.log('🍪 Analyzing cookie security configuration...');
    
    files.forEach(file => {
      if (this.isCookieConfigFile(file)) {
        const content = fs.readFileSync(file.path, 'utf8');
        this.checkCookieSettings(file, content);
      }
    });
  }

  /**
   * Check if file contains cookie configuration
   */
  isCookieConfigFile(file) {
    const cookieIndicators = [
      'cookie',
      'auth',
      'session',
      'middleware',
      'config'
    ];
    
    return cookieIndicators.some(indicator => 
      file.name.toLowerCase().includes(indicator) ||
      file.relativePath.toLowerCase().includes(indicator)
    );
  }

  /**
   * Check cookie security settings
   */
  checkCookieSettings(file, content) {
    // Find all cookie configurations
    const cookieConfigs = this.extractCookieConfigurations(content);
    
    cookieConfigs.forEach(config => {
      this.analyzeCookieConfiguration(file, config);
    });
  }

  /**
   * Extract cookie configurations from content
   */
  extractCookieConfigurations(content) {
    const configs = [];
    
    // Pattern for res.cookie() calls
    const cookieCallPattern = /res\.cookie\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*[^,]+\s*,\s*({[^}]+})/g;
    let match;
    
    while ((match = cookieCallPattern.exec(content)) !== null) {
      try {
        const cookieName = match[1];
        const configStr = match[2];
        
        configs.push({
          name: cookieName,
          config: configStr,
          fullMatch: match[0],
          type: 'res.cookie'
        });
      } catch (error) {
        // Skip malformed configurations
      }
    }
    
    // Pattern for cookie-parser or express-session configurations
    const sessionConfigPattern = /session\s*\(\s*({[^}]+})/g;
    while ((match = sessionConfigPattern.exec(content)) !== null) {
      configs.push({
        name: 'session',
        config: match[1],
        fullMatch: match[0],
        type: 'session'
      });
    }
    
    return configs;
  }

  /**
   * Analyze individual cookie configuration
   */
  analyzeCookieConfiguration(file, cookieConfig) {
    const { name, config, type } = cookieConfig;
    
    // Check HttpOnly attribute
    this.checkHttpOnly(file, name, config, type);
    
    // Check Secure attribute
    this.checkSecure(file, name, config, type);
    
    // Check SameSite attribute
    this.checkSameSite(file, name, config, type);
    
    // Check maxAge/expires
    this.checkExpiration(file, name, config, type);
    
    // Check Path attribute
    this.checkPath(file, name, config, type);
    
    // Check Domain attribute
    this.checkDomain(file, name, config, type);
  }

  /**
   * Check HttpOnly attribute
   */
  checkHttpOnly(file, cookieName, config, type) {
    const hasHttpOnly = /httpOnly:\s*true/i.test(config);
    
    if (!hasHttpOnly) {
      // Check if it's a sensitive cookie (auth, session, token)
      const isSensitive = this.isSensitiveCookie(cookieName, config);
      
      if (isSensitive) {
        this.auditResults.addIssue('cookieIssues', {
          severity: 'HIGH',
          category: 'Cookie Security',
          subcategory: 'Missing HttpOnly',
          file: file.relativePath,
          cookieName: cookieName,
          description: `Sensitive cookie '${cookieName}' missing HttpOnly attribute`,
          recommendation: 'Add httpOnly: true to prevent XSS attacks from accessing the cookie',
          securityRisk: 'Cookie can be accessed by client-side JavaScript, vulnerable to XSS attacks',
          configType: type
        });
      } else {
        this.auditResults.addIssue('cookieIssues', {
          severity: 'MEDIUM',
          category: 'Cookie Security',
          subcategory: 'Missing HttpOnly',
          file: file.relativePath,
          cookieName: cookieName,
          description: `Cookie '${cookieName}' missing HttpOnly attribute`,
          recommendation: 'Consider adding httpOnly: true for better security',
          configType: type
        });
      }
    }
  }

  /**
   * Check Secure attribute
   */
  checkSecure(file, cookieName, config, type) {
    const hasSecure = /secure:\s*true/i.test(config);
    const hasConditionalSecure = /secure:\s*process\.env\.NODE_ENV\s*===\s*['"`]production['"`]/i.test(config);
    
    if (!hasSecure && !hasConditionalSecure) {
      const isSensitive = this.isSensitiveCookie(cookieName, config);
      
      if (isSensitive) {
        this.auditResults.addIssue('cookieIssues', {
          severity: 'HIGH',
          category: 'Cookie Security',
          subcategory: 'Missing Secure',
          file: file.relativePath,
          cookieName: cookieName,
          description: `Sensitive cookie '${cookieName}' missing Secure attribute`,
          recommendation: 'Add secure: process.env.NODE_ENV === "production" to ensure HTTPS-only transmission',
          securityRisk: 'Cookie can be transmitted over unencrypted HTTP connections',
          configType: type
        });
      } else {
        this.auditResults.addIssue('cookieIssues', {
          severity: 'MEDIUM',
          category: 'Cookie Security',
          subcategory: 'Missing Secure',
          file: file.relativePath,
          cookieName: cookieName,
          description: `Cookie '${cookieName}' missing Secure attribute`,
          recommendation: 'Consider adding secure: true for production environments',
          configType: type
        });
      }
    }
  }

  /**
   * Check SameSite attribute
   */
  checkSameSite(file, cookieName, config, type) {
    const sameSiteMatch = config.match(/sameSite:\s*['"`]([^'"`]+)['"`]/i);
    
    if (!sameSiteMatch) {
      this.auditResults.addIssue('cookieIssues', {
        severity: 'MEDIUM',
        category: 'Cookie Security',
        subcategory: 'Missing SameSite',
        file: file.relativePath,
        cookieName: cookieName,
        description: `Cookie '${cookieName}' missing SameSite attribute`,
        recommendation: 'Add sameSite: "strict" or "lax" to prevent CSRF attacks',
        securityRisk: 'Cookie vulnerable to cross-site request forgery (CSRF) attacks',
        configType: type
      });
    } else {
      const sameSiteValue = sameSiteMatch[1].toLowerCase();
      
      if (sameSiteValue === 'none') {
        this.auditResults.addIssue('cookieIssues', {
          severity: 'HIGH',
          category: 'Cookie Security',
          subcategory: 'Weak SameSite',
          file: file.relativePath,
          cookieName: cookieName,
          description: `Cookie '${cookieName}' uses SameSite: 'none' - weakest protection`,
          recommendation: 'Use "strict" or "lax" instead of "none" unless cross-site usage is absolutely necessary',
          securityRisk: 'Cookie sent with all cross-site requests, vulnerable to CSRF',
          configType: type,
          currentValue: sameSiteValue
        });
      }
    }
  }

  /**
   * Check cookie expiration
   */
  checkExpiration(file, cookieName, config, type) {
    const maxAgeMatch = config.match(/maxAge:\s*(\d+)/i);
    const expiresMatch = config.match(/expires:\s*new\s+Date\([^)]+\)/i);
    
    if (!maxAgeMatch && !expiresMatch) {
      // Check if it's a session cookie (which might be intentional)
      if (!this.isSessionCookie(cookieName)) {
        this.auditResults.addIssue('cookieIssues', {
          severity: 'LOW',
          category: 'Cookie Security',
          subcategory: 'No Expiration',
          file: file.relativePath,
          cookieName: cookieName,
          description: `Cookie '${cookieName}' has no expiration set`,
          recommendation: 'Set appropriate maxAge or expires to limit cookie lifetime',
          securityRisk: 'Cookie persists indefinitely, increasing exposure window',
          configType: type
        });
      }
    } else if (maxAgeMatch) {
      const maxAge = parseInt(maxAgeMatch[1]);
      const days = maxAge / (1000 * 60 * 60 * 24);
      
      // Check for overly long expiration times
      if (days > 30) {
        this.auditResults.addIssue('cookieIssues', {
          severity: 'MEDIUM',
          category: 'Cookie Security',
          subcategory: 'Long Expiration',
          file: file.relativePath,
          cookieName: cookieName,
          description: `Cookie '${cookieName}' has very long expiration (${Math.round(days)} days)`,
          recommendation: 'Consider shorter expiration times for better security',
          securityRisk: 'Long-lived cookies increase security exposure window',
          configType: type,
          expirationDays: Math.round(days)
        });
      }
    }
  }

  /**
   * Check Path attribute
   */
  checkPath(file, cookieName, config, type) {
    const pathMatch = config.match(/path:\s*['"`]([^'"`]+)['"`]/i);
    
    if (pathMatch) {
      const path = pathMatch[1];
      
      // Check for overly broad path
      if (path === '/') {
        const isSensitive = this.isSensitiveCookie(cookieName, config);
        
        if (isSensitive) {
          this.auditResults.addIssue('cookieIssues', {
            severity: 'MEDIUM',
            category: 'Cookie Security',
            subcategory: 'Broad Path',
            file: file.relativePath,
            cookieName: cookieName,
            description: `Sensitive cookie '${cookieName}' uses broad path '/'`,
            recommendation: 'Consider restricting path to specific routes that need the cookie',
            securityRisk: 'Cookie sent with all requests to the domain, increasing exposure',
            configType: type,
            currentPath: path
          });
        }
      }
    }
  }

  /**
   * Check Domain attribute
   */
  checkDomain(file, cookieName, config, type) {
    const domainMatch = config.match(/domain:\s*['"`]([^'"`]+)['"`]/i);
    
    if (domainMatch) {
      const domain = domainMatch[1];
      
      // Check for overly broad domain (starts with .)
      if (domain.startsWith('.')) {
        this.auditResults.addIssue('cookieIssues', {
          severity: 'MEDIUM',
          category: 'Cookie Security',
          subcategory: 'Broad Domain',
          file: file.relativePath,
          cookieName: cookieName,
          description: `Cookie '${cookieName}' uses broad domain '${domain}'`,
          recommendation: 'Consider using specific domain instead of wildcard domain',
          securityRisk: 'Cookie accessible to all subdomains, increasing attack surface',
          configType: type,
          currentDomain: domain
        });
      }
    }
  }

  /**
   * Check if cookie is sensitive (contains auth/session data)
   */
  isSensitiveCookie(cookieName, config) {
    const sensitiveNames = [
      'token',
      'auth',
      'session',
      'jwt',
      'access',
      'refresh',
      'login',
      'user'
    ];
    
    const cookieNameLower = cookieName.toLowerCase();
    return sensitiveNames.some(name => cookieNameLower.includes(name));
  }

  /**
   * Check if cookie is intended to be a session cookie
   */
  isSessionCookie(cookieName) {
    const sessionNames = [
      'session',
      'sess',
      'connect.sid'
    ];
    
    const cookieNameLower = cookieName.toLowerCase();
    return sessionNames.some(name => cookieNameLower.includes(name));
  }
}
