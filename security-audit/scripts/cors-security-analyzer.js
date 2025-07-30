/**
 * CORS SECURITY ANALYZER
 * 
 * Analizuje konfigurację CORS pod kątem bezpieczeństwa
 * Sprawdza dozwolone domeny, credentials, metody HTTP
 * 
 * @author Security Audit Team
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';

/**
 * CORS Security Analyzer Class
 */
export class CORSSecurityAnalyzer {
  constructor(auditResults) {
    this.auditResults = auditResults;
  }

  /**
   * Analyze CORS configuration security
   */
  analyzeCORSConfiguration(files) {
    console.log('🌐 Analyzing CORS configuration...');
    
    files.forEach(file => {
      if (this.isCORSConfigFile(file)) {
        const content = fs.readFileSync(file.path, 'utf8');
        this.checkCORSSettings(file, content);
      }
    });
  }

  /**
   * Check if file contains CORS configuration
   */
  isCORSConfigFile(file) {
    const corsIndicators = [
      'cors',
      'app.use',
      'middleware',
      'config',
      'index.js',
      'server.js'
    ];
    
    return corsIndicators.some(indicator => 
      file.name.toLowerCase().includes(indicator) ||
      file.relativePath.toLowerCase().includes(indicator)
    );
  }

  /**
   * Check CORS security settings
   */
  checkCORSSettings(file, content) {
    // Check for wildcard origin
    this.checkWildcardOrigin(file, content);
    
    // Check credentials configuration
    this.checkCredentialsConfig(file, content);
    
    // Check allowed methods
    this.checkAllowedMethods(file, content);
    
    // Check allowed headers
    this.checkAllowedHeaders(file, content);
    
    // Check origin validation
    this.checkOriginValidation(file, content);
  }

  /**
   * Check for dangerous wildcard origin
   */
  checkWildcardOrigin(file, content) {
    const wildcardPatterns = [
      /origin:\s*['"`]\*['"`]/gi,
      /Access-Control-Allow-Origin.*\*/gi,
      /'Access-Control-Allow-Origin'.*\*/gi
    ];

    wildcardPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        this.auditResults.addIssue('corsIssues', {
          severity: 'HIGH',
          category: 'CORS Security',
          subcategory: 'Wildcard Origin',
          file: file.relativePath,
          description: 'CORS configured with wildcard (*) origin - allows any domain',
          recommendation: 'Specify exact allowed domains instead of using wildcard',
          securityRisk: 'Allows cross-origin requests from any domain, potentially exposing sensitive data'
        });
      }
    });
  }

  /**
   * Check credentials configuration
   */
  checkCredentialsConfig(file, content) {
    const credentialsPatterns = [
      /credentials:\s*true/gi,
      /Access-Control-Allow-Credentials.*true/gi
    ];

    const hasCredentials = credentialsPatterns.some(pattern => pattern.test(content));
    const hasWildcard = /origin:\s*['"`]\*['"`]/gi.test(content);

    if (hasCredentials && hasWildcard) {
      this.auditResults.addIssue('corsIssues', {
        severity: 'CRITICAL',
        category: 'CORS Security',
        subcategory: 'Credentials with Wildcard',
        file: file.relativePath,
        description: 'CORS allows credentials with wildcard origin - major security vulnerability',
        recommendation: 'Never use credentials: true with wildcard origin. Specify exact domains.',
        securityRisk: 'Allows any website to make authenticated requests to your API'
      });
    }

    // Check if credentials are enabled without proper origin control
    if (hasCredentials && !this.hasProperOriginValidation(content)) {
      this.auditResults.addIssue('corsIssues', {
        severity: 'HIGH',
        category: 'CORS Security',
        subcategory: 'Credentials without Origin Validation',
        file: file.relativePath,
        description: 'CORS credentials enabled without proper origin validation',
        recommendation: 'Implement strict origin validation when using credentials: true'
      });
    }
  }

  /**
   * Check allowed HTTP methods
   */
  checkAllowedMethods(file, content) {
    const dangerousMethodsPatterns = [
      /methods:.*DELETE/gi,
      /methods:.*PUT/gi,
      /methods:.*PATCH/gi,
      /Access-Control-Allow-Methods.*DELETE/gi,
      /Access-Control-Allow-Methods.*PUT/gi
    ];

    dangerousMethodsPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        this.auditResults.addIssue('corsIssues', {
          severity: 'MEDIUM',
          category: 'CORS Security',
          subcategory: 'Dangerous HTTP Methods',
          file: file.relativePath,
          description: 'CORS allows potentially dangerous HTTP methods (DELETE, PUT, PATCH)',
          recommendation: 'Only allow necessary HTTP methods. Consider restricting destructive operations.',
          securityRisk: 'May allow unauthorized modification or deletion of data'
        });
      }
    });
  }

  /**
   * Check allowed headers
   */
  checkAllowedHeaders(file, content) {
    const dangerousHeaderPatterns = [
      /allowedHeaders:.*\*/gi,
      /Access-Control-Allow-Headers.*\*/gi
    ];

    dangerousHeaderPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        this.auditResults.addIssue('corsIssues', {
          severity: 'MEDIUM',
          category: 'CORS Security',
          subcategory: 'Wildcard Headers',
          file: file.relativePath,
          description: 'CORS allows all headers with wildcard (*)',
          recommendation: 'Specify only necessary headers instead of using wildcard',
          securityRisk: 'May allow malicious headers to be sent with requests'
        });
      }
    });
  }

  /**
   * Check if proper origin validation exists
   */
  hasProperOriginValidation(content) {
    const validationPatterns = [
      /origin.*function/gi,
      /allowedOrigins/gi,
      /whitelist/gi,
      /trustedDomains/gi
    ];

    return validationPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Check origin validation implementation
   */
  checkOriginValidation(file, content) {
    if (!this.hasProperOriginValidation(content)) {
      // Check if CORS is configured but without proper validation
      const corsPatterns = [
        /cors\(/gi,
        /Access-Control-Allow-Origin/gi
      ];

      if (corsPatterns.some(pattern => pattern.test(content))) {
        this.auditResults.addIssue('corsIssues', {
          severity: 'HIGH',
          category: 'CORS Security',
          subcategory: 'Missing Origin Validation',
          file: file.relativePath,
          description: 'CORS configured without proper origin validation',
          recommendation: 'Implement origin validation function to check against whitelist of trusted domains',
          securityRisk: 'May allow requests from untrusted domains'
        });
      }
    }
  }
}
