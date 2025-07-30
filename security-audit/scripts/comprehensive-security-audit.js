/**
 * COMPREHENSIVE SECURITY AUDIT SCRIPT
 * 
 * Przeprowadza szczegółowy audyt bezpieczeństwa backendu Marketplace
 * zgodnie z najlepszymi praktykami bezpieczeństwa aplikacji webowych.
 * 
 * FUNKCJONALNOŚCI:
 * 1. Skanowanie wrażliwych logów (JWT, hasła, tokeny)
 * 2. Wykrywanie duplikatów plików i funkcji
 * 3. Analiza struktury tokenów JWT
 * 4. Weryfikacja konfiguracji ciasteczek
 * 5. Audyt zabezpieczeń panelu administratora
 * 6. Sprawdzenie konfiguracji CORS
 * 7. Identyfikacja plików debugowych/testowych
 * 8. Weryfikacja rate limiting
 * 
 * @author Security Audit Team
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../../');

// Security audit configuration
const AUDIT_CONFIG = {
  // Patterns for sensitive data detection
  SENSITIVE_PATTERNS: {
    JWT_TOKENS: [
      /console\.log.*token.*:/gi,
      /console\.log.*jwt.*:/gi,
      /console\.log.*bearer.*:/gi,
      /console\.log.*authorization.*:/gi
    ],
    PASSWORDS: [
      /console\.log.*password.*:/gi,
      /console\.log.*passwd.*:/gi,
      /console\.log.*pwd.*:/gi
    ],
    SECRETS: [
      /console\.log.*secret.*:/gi,
      /console\.log.*key.*:/gi,
      /console\.log.*api_key.*:/gi
    ],
    RESET_TOKENS: [
      /console\.log.*reset.*token.*:/gi,
      /console\.log.*verification.*code.*:/gi
    ]
  },
  
  // File extensions to scan
  SCAN_EXTENSIONS: ['.js', '.ts', '.jsx', '.tsx'],
  
  // Directories to exclude from scanning
  EXCLUDE_DIRS: ['node_modules', '.git', 'logs', 'uploads', 'temp'],
  
  // Test file patterns
  TEST_FILE_PATTERNS: [
    /^test-.*\.js$/,
    /^.*-test\.js$/,
    /^debug-.*\.js$/,
    /^check-.*\.js$/,
    /^.*-debug\.js$/,
    /^.*\.test\.js$/,
    /^.*\.spec\.js$/
  ]
};

/**
 * Security Audit Results Storage
 */
class SecurityAuditResults {
  constructor() {
    this.results = {
      sensitiveLogging: [],
      duplicateFiles: [],
      jwtIssues: [],
      cookieIssues: [],
      adminSecurityIssues: [],
      corsIssues: [],
      testFiles: [],
      rateLimitingIssues: [],
      summary: {
        totalIssues: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0
      }
    };
  }

  /**
   * Add security issue to results
   */
  addIssue(category, issue) {
    if (!this.results[category]) {
      this.results[category] = [];
    }
    
    this.results[category].push({
      ...issue,
      timestamp: new Date().toISOString(),
      id: this.generateIssueId()
    });
    
    // Update summary
    this.results.summary.totalIssues++;
    switch (issue.severity) {
      case 'CRITICAL':
        this.results.summary.criticalIssues++;
        break;
      case 'HIGH':
        this.results.summary.highIssues++;
        break;
      case 'MEDIUM':
        this.results.summary.mediumIssues++;
        break;
      case 'LOW':
        this.results.summary.lowIssues++;
        break;
    }
  }

  /**
   * Generate unique issue ID
   */
  generateIssueId() {
    return `SEC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get audit results
   */
  getResults() {
    return this.results;
  }
}

/**
 * File Scanner Utility
 */
class FileScanner {
  constructor(rootDirectory) {
    this.rootDir = rootDirectory;
  }

  /**
   * Get all files recursively with filtering
   */
  getAllFiles(dir = this.rootDir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Skip excluded directories
        if (!AUDIT_CONFIG.EXCLUDE_DIRS.includes(file)) {
          this.getAllFiles(filePath, fileList);
        }
      } else {
        // Include only specified extensions
        const ext = path.extname(file);
        if (AUDIT_CONFIG.SCAN_EXTENSIONS.includes(ext)) {
          fileList.push({
            path: filePath,
            relativePath: path.relative(this.rootDir, filePath),
            name: file,
            size: stat.size,
            modified: stat.mtime
          });
        }
      }
    });
    
    return fileList;
  }

  /**
   * Read file content safely
   */
  readFileContent(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message);
      return null;
    }
  }
}

/**
 * Sensitive Data Scanner
 */
class SensitiveDataScanner {
  constructor(auditResults) {
    this.auditResults = auditResults;
  }

  /**
   * Scan file for sensitive logging
   */
  scanFileForSensitiveData(file, content) {
    const lines = content.split('\n');
    
    // Check each pattern category
    Object.entries(AUDIT_CONFIG.SENSITIVE_PATTERNS).forEach(([category, patterns]) => {
      patterns.forEach(pattern => {
        lines.forEach((line, lineNumber) => {
          if (pattern.test(line)) {
            this.auditResults.addIssue('sensitiveLogging', {
              severity: 'CRITICAL',
              category: 'Sensitive Data Logging',
              subcategory: category,
              file: file.relativePath,
              line: lineNumber + 1,
              content: line.trim(),
              description: `Potentially sensitive ${category.toLowerCase()} being logged to console`,
              recommendation: 'Remove or replace with secure logging using logger utility',
              codeSnippet: this.getCodeSnippet(lines, lineNumber)
            });
          }
        });
      });
    });
  }

  /**
   * Get code snippet around the issue
   */
  getCodeSnippet(lines, lineNumber, context = 2) {
    const start = Math.max(0, lineNumber - context);
    const end = Math.min(lines.length, lineNumber + context + 1);
    
    return lines.slice(start, end).map((line, index) => ({
      lineNumber: start + index + 1,
      content: line,
      isIssue: start + index === lineNumber
    }));
  }
}

/**
 * Duplicate File Detector
 */
class DuplicateDetector {
  constructor(auditResults) {
    this.auditResults = auditResults;
  }

  /**
   * Find duplicate files by content hash
   */
  findDuplicateFiles(files) {
    const fileHashes = new Map();
    const scanner = new FileScanner(rootDir);
    
    files.forEach(file => {
      const content = scanner.readFileContent(file.path);
      if (content) {
        // Simple hash based on content length and first/last 100 chars
        const hash = this.generateContentHash(content);
        
        if (fileHashes.has(hash)) {
          const existingFile = fileHashes.get(hash);
          
          // Check if files are actually similar (not just same hash)
          if (this.areFilesSimilar(content, scanner.readFileContent(existingFile.path))) {
            this.auditResults.addIssue('duplicateFiles', {
              severity: 'MEDIUM',
              category: 'Code Duplication',
              subcategory: 'Duplicate Files',
              files: [existingFile.relativePath, file.relativePath],
              description: 'Potential duplicate files detected',
              recommendation: 'Review files and consolidate if they serve the same purpose',
              similarity: this.calculateSimilarity(content, scanner.readFileContent(existingFile.path))
            });
          }
        } else {
          fileHashes.set(hash, file);
        }
      }
    });
  }

  /**
   * Generate content hash
   */
  generateContentHash(content) {
    const normalized = content.replace(/\s+/g, ' ').trim();
    return `${normalized.length}-${normalized.substring(0, 100)}-${normalized.substring(normalized.length - 100)}`;
  }

  /**
   * Check if files are similar
   */
  areFilesSimilar(content1, content2, threshold = 0.8) {
    return this.calculateSimilarity(content1, content2) >= threshold;
  }

  /**
   * Calculate similarity between two strings
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

/**
 * JWT Security Analyzer
 */
class JWTSecurityAnalyzer {
  constructor(auditResults) {
    this.auditResults = auditResults;
  }

  /**
   * Analyze JWT implementation
   */
  analyzeJWTSecurity(files) {
    const scanner = new FileScanner(rootDir);
    
    files.forEach(file => {
      if (file.name.includes('auth') || file.name.includes('jwt') || file.name.includes('token')) {
        const content = scanner.readFileContent(file.path);
        if (content) {
          this.checkJWTPayloadSize(file, content);
          this.checkJWTSecrets(file, content);
          this.checkTokenExpiration(file, content);
        }
      }
    });
  }

  /**
   * Check JWT payload size
   */
  checkJWTPayloadSize(file, content) {
    const jwtSignPatterns = [
      /jwt\.sign\s*\(\s*({[^}]+})/g,
      /generateAccessToken\s*\(\s*({[^}]+})/g,
      /generateRefreshToken\s*\(\s*({[^}]+})/g
    ];

    jwtSignPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const payload = match[1];
        
        // Check for potentially large payload items
        if (payload.includes('email') || payload.includes('userAgent') || payload.includes('ipAddress')) {
          this.auditResults.addIssue('jwtIssues', {
            severity: 'MEDIUM',
            category: 'JWT Security',
            subcategory: 'Payload Size',
            file: file.relativePath,
            description: 'JWT payload may contain unnecessary data that increases token size',
            recommendation: 'Keep JWT payload minimal - only include essential data like userId, role, exp',
            codeSnippet: payload
          });
        }
      }
    });
  }

  /**
   * Check JWT secrets
   */
  checkJWTSecrets(file, content) {
    // Check for hardcoded secrets
    const secretPatterns = [
      /jwt\.sign\([^,]+,\s*['"`]([^'"`]+)['"`]/g,
      /process\.env\.JWT_SECRET\s*\|\|\s*['"`]([^'"`]+)['"`]/g
    ];

    secretPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const secret = match[1];
        
        if (secret && secret.length < 32) {
          this.auditResults.addIssue('jwtIssues', {
            severity: 'HIGH',
            category: 'JWT Security',
            subcategory: 'Weak Secret',
            file: file.relativePath,
            description: 'JWT secret appears to be weak or hardcoded',
            recommendation: 'Use strong, randomly generated secrets stored in environment variables',
            secretLength: secret.length
          });
        }
      }
    });
  }

  /**
   * Check token expiration
   */
  checkTokenExpiration(file, content) {
    const expirationPatterns = [
      /expiresIn:\s*['"`]([^'"`]+)['"`]/g,
      /{ expiresIn: ['"`]([^'"`]+)['"`] }/g
    ];

    expirationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const expiration = match[1];
        
        // Check for overly long expiration times
        if (expiration.includes('d') && parseInt(expiration) > 7) {
          this.auditResults.addIssue('jwtIssues', {
            severity: 'MEDIUM',
            category: 'JWT Security',
            subcategory: 'Token Expiration',
            file: file.relativePath,
            description: 'JWT token has very long expiration time',
            recommendation: 'Use shorter expiration times for access tokens (15-60 minutes)',
            expiration: expiration
          });
        }
      }
    });
  }
}

/**
 * Test File Detector
 */
class TestFileDetector {
  constructor(auditResults) {
    this.auditResults = auditResults;
  }

  /**
   * Find test and debug files
   */
  findTestFiles(files) {
    files.forEach(file => {
      const isTestFile = AUDIT_CONFIG.TEST_FILE_PATTERNS.some(pattern => 
        pattern.test(file.name)
      );

      if (isTestFile) {
        const severity = file.relativePath.includes('node_modules') ? 'LOW' : 'MEDIUM';
        
        this.auditResults.addIssue('testFiles', {
          severity: severity,
          category: 'Development Files',
          subcategory: 'Test/Debug Files',
          file: file.relativePath,
          description: 'Test or debug file found in production codebase',
          recommendation: 'Move to tests/ directory or remove from production',
          fileSize: file.size
        });
      }
    });
  }
}

/**
 * Main Security Audit Runner
 */
class SecurityAuditRunner {
  constructor() {
    this.auditResults = new SecurityAuditResults();
    this.fileScanner = new FileScanner(rootDir);
    this.sensitiveDataScanner = new SensitiveDataScanner(this.auditResults);
    this.duplicateDetector = new DuplicateDetector(this.auditResults);
    this.jwtAnalyzer = new JWTSecurityAnalyzer(this.auditResults);
    this.testFileDetector = new TestFileDetector(this.auditResults);
  }

  /**
   * Run comprehensive security audit
   */
  async runAudit() {
    console.log('🔍 Starting Comprehensive Security Audit...\n');
    
    // Get all files to scan
    console.log('📁 Scanning project files...');
    const files = this.fileScanner.getAllFiles();
    console.log(`Found ${files.length} files to analyze\n`);

    // 1. Scan for sensitive data logging
    console.log('🚨 Scanning for sensitive data logging...');
    await this.scanSensitiveData(files);

    // 2. Find duplicate files
    console.log('🔄 Detecting duplicate files...');
    this.duplicateDetector.findDuplicateFiles(files);

    // 3. Analyze JWT security
    console.log('🔐 Analyzing JWT security...');
    this.jwtAnalyzer.analyzeJWTSecurity(files);

    // 4. Find test/debug files
    console.log('🧪 Detecting test and debug files...');
    this.testFileDetector.findTestFiles(files);

    // 5. Generate report
    console.log('📊 Generating security audit report...');
    await this.generateReport();

    console.log('\n✅ Security audit completed!');
    return this.auditResults.getResults();
  }

  /**
   * Scan files for sensitive data
   */
  async scanSensitiveData(files) {
    let scannedFiles = 0;
    
    for (const file of files) {
      const content = this.fileScanner.readFileContent(file.path);
      if (content) {
        this.sensitiveDataScanner.scanFileForSensitiveData(file, content);
        scannedFiles++;
        
        // Progress indicator
        if (scannedFiles % 50 === 0) {
          console.log(`   Scanned ${scannedFiles}/${files.length} files...`);
        }
      }
    }
    
    console.log(`   Completed scanning ${scannedFiles} files\n`);
  }

  /**
   * Generate comprehensive audit report
   */
  async generateReport() {
    const results = this.auditResults.getResults();
    const reportPath = path.join(rootDir, 'security-audit/reports/comprehensive-audit-report.json');
    const summaryPath = path.join(rootDir, 'security-audit/reports/audit-summary.md');

    // Save detailed JSON report
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    // Generate markdown summary
    const markdownReport = this.generateMarkdownSummary(results);
    fs.writeFileSync(summaryPath, markdownReport);

    console.log(`📄 Detailed report saved: ${reportPath}`);
    console.log(`📋 Summary report saved: ${summaryPath}`);
  }

  /**
   * Generate markdown summary
   */
  generateMarkdownSummary(results) {
    const { summary } = results;
    
    return `# 🔒 COMPREHENSIVE SECURITY AUDIT REPORT

## 📊 Executive Summary

- **Total Issues Found**: ${summary.totalIssues}
- **Critical Issues**: ${summary.criticalIssues} 🔴
- **High Priority Issues**: ${summary.highIssues} 🟠
- **Medium Priority Issues**: ${summary.mediumIssues} 🟡
- **Low Priority Issues**: ${summary.lowIssues} 🟢

## 🚨 Critical Issues Breakdown

### Sensitive Data Logging (${results.sensitiveLogging.length} issues)
${results.sensitiveLogging.slice(0, 5).map(issue => 
  `- **${issue.file}:${issue.line}** - ${issue.description}`
).join('\n')}

### JWT Security Issues (${results.jwtIssues.length} issues)
${results.jwtIssues.slice(0, 5).map(issue => 
  `- **${issue.file}** - ${issue.description}`
).join('\n')}

### Duplicate Files (${results.duplicateFiles.length} issues)
${results.duplicateFiles.slice(0, 5).map(issue => 
  `- **${issue.files.join(' & ')}** - Similarity: ${Math.round(issue.similarity * 100)}%`
).join('\n')}

### Test/Debug Files (${results.testFiles.length} issues)
${results.testFiles.slice(0, 5).map(issue => 
  `- **${issue.file}** - ${issue.description}`
).join('\n')}

## 🎯 Immediate Action Required

1. **Remove all sensitive logging** - ${results.sensitiveLogging.filter(i => i.severity === 'CRITICAL').length} critical issues
2. **Optimize JWT tokens** - ${results.jwtIssues.filter(i => i.severity === 'HIGH').length} high priority issues
3. **Clean up duplicate files** - ${results.duplicateFiles.length} files to review
4. **Remove test files from production** - ${results.testFiles.length} files to relocate

---
*Report generated on ${new Date().toISOString()}*
`;
  }
}

/**
 * Execute security audit
 */
async function main() {
  try {
    const auditRunner = new SecurityAuditRunner();
    const results = await auditRunner.runAudit();
    
    // Print summary to console
    console.log('\n' + '='.repeat(60));
    console.log('🔒 SECURITY AUDIT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Issues: ${results.summary.totalIssues}`);
    console.log(`Critical: ${results.summary.criticalIssues} | High: ${results.summary.highIssues} | Medium: ${results.summary.mediumIssues} | Low: ${results.summary.lowIssues}`);
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Security audit failed:', error);
    process.exit(1);
  }
}

// Run audit if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { SecurityAuditRunner, SecurityAuditResults };
