/**
 * SECURITY AUDIT RUNNER
 * 
 * Przeprowadza pełny audyt bezpieczeństwa backendu Marketplace
 * zgodnie z planem audytu bezpieczeństwa
 */

const fs = require('fs');
const path = require('path');

// Konfiguracja audytu
const AUDIT_CONFIG = {
  // Wzorce wrażliwych danych do wykrycia
  SENSITIVE_PATTERNS: {
    JWT_TOKENS: [
      /console\.log.*token.*:/gi,
      /console\.log.*jwt.*:/gi,
      /console\.log.*bearer.*:/gi,
      /console\.log.*authorization.*:/gi,
      /console\.log\(['"`].*token.*['"`]/gi
    ],
    PASSWORDS: [
      /console\.log.*password.*:/gi,
      /console\.log.*passwd.*:/gi,
      /console\.log.*pwd.*:/gi,
      /console\.log\(['"`].*password.*['"`]/gi
    ],
    SECRETS: [
      /console\.log.*secret.*:/gi,
      /console\.log.*key.*:/gi,
      /console\.log.*api_key.*:/gi,
      /console\.log\(['"`].*secret.*['"`]/gi
    ],
    VERIFICATION_CODES: [
      /console\.log.*verification.*code.*:/gi,
      /console\.log.*reset.*token.*:/gi,
      /console\.log.*2fa.*code.*:/gi,
      /console\.log\(['"`].*code.*['"`]/gi
    ]
  },
  
  // Rozszerzenia plików do skanowania
  SCAN_EXTENSIONS: ['.js', '.ts', '.jsx', '.tsx'],
  
  // Katalogi do pominięcia
  EXCLUDE_DIRS: ['node_modules', '.git', 'logs', 'uploads', 'temp', 'backups'],
  
  // Wzorce plików testowych
  TEST_FILE_PATTERNS: [
    /^test-.*\.js$/,
    /^.*-test\.js$/,
    /^debug-.*\.js$/,
    /^check-.*\.js$/,
    /^.*-debug\.js$/,
    /^.*\.test\.js$/,
    /^.*\.spec\.js$/,
    /^security-audit-.*\.js$/
  ]
};

/**
 * Klasa do przechowywania wyników audytu
 */
class AuditResults {
  constructor() {
    this.issues = {
      sensitiveLogging: [],
      duplicateFiles: [],
      jwtIssues: [],
      cookieIssues: [],
      adminSecurityIssues: [],
      corsIssues: [],
      testFiles: [],
      rateLimitingIssues: []
    };
    this.summary = {
      totalIssues: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0
    };
  }

  addIssue(category, issue) {
    this.issues[category].push({
      ...issue,
      timestamp: new Date().toISOString(),
      id: `SEC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
    
    this.summary.totalIssues++;
    switch (issue.severity) {
      case 'CRITICAL': this.summary.criticalIssues++; break;
      case 'HIGH': this.summary.highIssues++; break;
      case 'MEDIUM': this.summary.mediumIssues++; break;
      case 'LOW': this.summary.lowIssues++; break;
    }
  }
}

/**
 * Główna klasa audytu bezpieczeństwa
 */
class SecurityAuditor {
  constructor() {
    this.results = new AuditResults();
    this.rootDir = process.cwd();
  }

  /**
   * Uruchom pełny audyt bezpieczeństwa
   */
  async runFullAudit() {
    console.log('🔒 ROZPOCZYNANIE PEŁNEGO AUDYTU BEZPIECZEŃSTWA MARKETPLACE BACKEND');
    console.log('=' .repeat(80));
    
    // 1. Skanowanie wrażliwych logów
    console.log('\n🚨 1. Skanowanie wrażliwych logów (JWT, hasła, tokeny)...');
    await this.scanSensitiveLogging();
    
    // 2. Wykrywanie duplikatów
    console.log('\n🔄 2. Wykrywanie duplikatów plików i funkcji...');
    await this.findDuplicates();
    
    // 3. Analiza JWT
    console.log('\n🔐 3. Weryfikacja struktury i bezpieczeństwa tokenów JWT...');
    await this.analyzeJWTSecurity();
    
    // 4. Konfiguracja ciasteczek
    console.log('\n🍪 4. Sprawdzanie konfiguracji ciasteczek...');
    await this.analyzeCookieSecurity();
    
    // 5. Zabezpieczenia panelu admin
    console.log('\n👑 5. Audyt zabezpieczeń panelu administratora...');
    await this.analyzeAdminSecurity();
    
    // 6. Konfiguracja CORS
    console.log('\n🌐 6. Sprawdzanie konfiguracji CORS...');
    await this.analyzeCORS();
    
    // 7. Pliki debugowe/testowe
    console.log('\n🧪 7. Identyfikacja plików debugowych i testowych...');
    await this.findTestFiles();
    
    // 8. Rate limiting
    console.log('\n⚡ 8. Weryfikacja rate limiting...');
    await this.analyzeRateLimiting();
    
    // 9. Generowanie raportu
    console.log('\n📊 9. Generowanie raportu audytu...');
    await this.generateReport();
    
    console.log('\n✅ AUDYT BEZPIECZEŃSTWA ZAKOŃCZONY!');
    this.printSummary();
  }

  /**
   * Pobierz wszystkie pliki do skanowania
   */
  getAllFiles(dir = this.rootDir, fileList = []) {
    try {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          if (!AUDIT_CONFIG.EXCLUDE_DIRS.includes(file)) {
            this.getAllFiles(filePath, fileList);
          }
        } else {
          const ext = path.extname(file);
          if (AUDIT_CONFIG.SCAN_EXTENSIONS.includes(ext)) {
            fileList.push({
              path: filePath,
              relativePath: path.relative(this.rootDir, filePath),
              name: file,
              size: stat.size
            });
          }
        }
      });
    } catch (error) {
      console.error(`Błąd odczytu katalogu ${dir}:`, error.message);
    }
    
    return fileList;
  }

  /**
   * Skanowanie wrażliwych logów
   */
  async scanSensitiveLogging() {
    const files = this.getAllFiles();
    let foundIssues = 0;
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file.path, 'utf8');
        const lines = content.split('\n');
        
        Object.entries(AUDIT_CONFIG.SENSITIVE_PATTERNS).forEach(([category, patterns]) => {
          patterns.forEach(pattern => {
            lines.forEach((line, lineNumber) => {
              if (pattern.test(line)) {
                this.results.addIssue('sensitiveLogging', {
                  severity: 'CRITICAL',
                  category: 'Wrażliwe Logowanie',
                  subcategory: category,
                  file: file.relativePath,
                  line: lineNumber + 1,
                  content: line.trim(),
                  description: `Potencjalnie wrażliwe ${category.toLowerCase()} logowane do konsoli`,
                  recommendation: 'Usuń lub zastąp bezpiecznym logowaniem przez utils/logger.js'
                });
                foundIssues++;
              }
            });
          });
        });
      } catch (error) {
        console.error(`Błąd odczytu pliku ${file.path}:`, error.message);
      }
    }
    
    console.log(`   Znaleziono ${foundIssues} problemów z wrażliwym logowaniem`);
  }

  /**
   * Znajdź duplikaty plików
   */
  async findDuplicates() {
    const files = this.getAllFiles();
    const fileHashes = new Map();
    let duplicates = 0;
    
    files.forEach(file => {
      try {
        const content = fs.readFileSync(file.path, 'utf8');
        const hash = this.generateContentHash(content);
        
        if (fileHashes.has(hash)) {
          const existingFile = fileHashes.get(hash);
          this.results.addIssue('duplicateFiles', {
            severity: 'MEDIUM',
            category: 'Duplikaty Kodu',
            files: [existingFile.relativePath, file.relativePath],
            description: 'Potencjalne duplikaty plików wykryte',
            recommendation: 'Przejrzyj pliki i skonsoliduj jeśli służą temu samemu celowi'
          });
          duplicates++;
        } else {
          fileHashes.set(hash, file);
        }
      } catch (error) {
        // Pomiń pliki z błędami odczytu
      }
    });
    
    console.log(`   Znaleziono ${duplicates} potencjalnych duplikatów`);
  }

  /**
   * Generuj hash zawartości pliku
   */
  generateContentHash(content) {
    const normalized = content.replace(/\s+/g, ' ').trim();
    return `${normalized.length}-${normalized.substring(0, 100)}-${normalized.substring(normalized.length - 100)}`;
  }

  /**
   * Analiza bezpieczeństwa JWT
   */
  async analyzeJWTSecurity() {
    const files = this.getAllFiles();
    let jwtIssues = 0;
    
    files.forEach(file => {
      if (file.name.includes('auth') || file.name.includes('jwt') || file.name.includes('token')) {
        try {
          const content = fs.readFileSync(file.path, 'utf8');
          
          // Sprawdź rozmiar payload JWT
          const jwtSignPattern = /jwt\.sign\s*\(\s*({[^}]+})/g;
          let match;
          while ((match = jwtSignPattern.exec(content)) !== null) {
            const payload = match[1];
            if (payload.includes('email') || payload.includes('userAgent') || payload.includes('ipAddress')) {
              this.results.addIssue('jwtIssues', {
                severity: 'MEDIUM',
                category: 'Bezpieczeństwo JWT',
                subcategory: 'Rozmiar Payload',
                file: file.relativePath,
                description: 'JWT payload może zawierać niepotrzebne dane zwiększające rozmiar tokena',
                recommendation: 'Zachowaj minimalny payload JWT - tylko userId, role, exp'
              });
              jwtIssues++;
            }
          }
          
          // Sprawdź słabe sekrety
          const secretPattern = /process\.env\.JWT_SECRET\s*\|\|\s*['"`]([^'"`]+)['"`]/g;
          while ((match = secretPattern.exec(content)) !== null) {
            const secret = match[1];
            if (secret && secret.length < 32) {
              this.results.addIssue('jwtIssues', {
                severity: 'HIGH',
                category: 'Bezpieczeństwo JWT',
                subcategory: 'Słaby Sekret',
                file: file.relativePath,
                description: 'JWT sekret wydaje się być słaby lub zakodowany na stałe',
                recommendation: 'Użyj silnych, losowo generowanych sekretów w zmiennych środowiskowych'
              });
              jwtIssues++;
            }
          }
          
        } catch (error) {
          // Pomiń pliki z błędami
        }
      }
    });
    
    console.log(`   Znaleziono ${jwtIssues} problemów z JWT`);
  }

  /**
   * Analiza bezpieczeństwa ciasteczek
   */
  async analyzeCookieSecurity() {
    const files = this.getAllFiles();
    let cookieIssues = 0;
    
    files.forEach(file => {
      if (file.name.includes('cookie') || file.name.includes('auth') || file.name.includes('session')) {
        try {
          const content = fs.readFileSync(file.path, 'utf8');
          
          // Sprawdź konfigurację ciasteczek
          const cookiePattern = /res\.cookie\s*\([^)]+\)/g;
          let match;
          while ((match = cookiePattern.exec(content)) !== null) {
            const cookieConfig = match[0];
            
            if (!cookieConfig.includes('httpOnly: true')) {
              this.results.addIssue('cookieIssues', {
                severity: 'HIGH',
                category: 'Bezpieczeństwo Ciasteczek',
                subcategory: 'Brak HttpOnly',
                file: file.relativePath,
                description: 'Ciasteczko bez atrybutu HttpOnly',
                recommendation: 'Dodaj httpOnly: true aby zapobiec atakom XSS'
              });
              cookieIssues++;
            }
            
            if (!cookieConfig.includes('secure:') && !cookieConfig.includes('NODE_ENV')) {
              this.results.addIssue('cookieIssues', {
                severity: 'HIGH',
                category: 'Bezpieczeństwo Ciasteczek',
                subcategory: 'Brak Secure',
                file: file.relativePath,
                description: 'Ciasteczko bez atrybutu Secure',
                recommendation: 'Dodaj secure: process.env.NODE_ENV === "production"'
              });
              cookieIssues++;
            }
            
            if (!cookieConfig.includes('sameSite:')) {
              this.results.addIssue('cookieIssues', {
                severity: 'MEDIUM',
                category: 'Bezpieczeństwo Ciasteczek',
                subcategory: 'Brak SameSite',
                file: file.relativePath,
                description: 'Ciasteczko bez atrybutu SameSite',
                recommendation: 'Dodaj sameSite: "strict" lub "lax"'
              });
              cookieIssues++;
            }
          }
          
        } catch (error) {
          // Pomiń pliki z błędami
        }
      }
    });
    
    console.log(`   Znaleziono ${cookieIssues} problemów z ciasteczkami`);
  }

  /**
   * Analiza zabezpieczeń panelu admin
   */
  async analyzeAdminSecurity() {
    const adminFiles = this.getAllFiles().filter(file => 
      file.relativePath.includes('admin') || 
      file.name.includes('admin')
    );
    
    let adminIssues = 0;
    
    adminFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file.path, 'utf8');
        
        // Sprawdź czy endpointy admin mają autoryzację
        const routePattern = /router\.(get|post|put|delete)\s*\(['"`]([^'"`]+)['"`]/g;
        let match;
        while ((match = routePattern.exec(content)) !== null) {
          const route = match[2];
          const beforeRoute = content.substring(0, match.index);
          const afterRoute = content.substring(match.index, match.index + 200);
          
          if (!beforeRoute.includes('adminAuth') && !afterRoute.includes('adminAuth') && 
              !beforeRoute.includes('requireAdmin') && !afterRoute.includes('requireAdmin')) {
            this.results.addIssue('adminSecurityIssues', {
              severity: 'CRITICAL',
              category: 'Bezpieczeństwo Panelu Admin',
              subcategory: 'Brak Autoryzacji',
              file: file.relativePath,
              route: route,
              description: `Endpoint admin ${route} może nie mieć odpowiedniej autoryzacji`,
              recommendation: 'Dodaj middleware adminAuth lub requireAdmin do wszystkich endpointów admin'
            });
            adminIssues++;
          }
        }
        
      } catch (error) {
        // Pomiń pliki z błędami
      }
    });
    
    console.log(`   Znaleziono ${adminIssues} problemów z zabezpieczeniami admin`);
  }

  /**
   * Analiza konfiguracji CORS
   */
  async analyzeCORS() {
    const files = this.getAllFiles();
    let corsIssues = 0;
    
    files.forEach(file => {
      if (file.name.includes('cors') || file.name.includes('config') || file.name === 'index.js') {
        try {
          const content = fs.readFileSync(file.path, 'utf8');
          
          // Sprawdź wildcard origin
          if (content.includes('origin: "*"') || content.includes("origin: '*'")) {
            this.results.addIssue('corsIssues', {
              severity: 'HIGH',
              category: 'Bezpieczeństwo CORS',
              subcategory: 'Wildcard Origin',
              file: file.relativePath,
              description: 'CORS skonfigurowany z wildcard (*) origin',
              recommendation: 'Określ dokładne dozwolone domeny zamiast używać wildcard'
            });
            corsIssues++;
          }
          
          // Sprawdź credentials z wildcard
          if ((content.includes('origin: "*"') || content.includes("origin: '*'")) && 
              content.includes('credentials: true')) {
            this.results.addIssue('corsIssues', {
              severity: 'CRITICAL',
              category: 'Bezpieczeństwo CORS',
              subcategory: 'Credentials z Wildcard',
              file: file.relativePath,
              description: 'CORS pozwala na credentials z wildcard origin - poważna luka',
              recommendation: 'Nigdy nie używaj credentials: true z wildcard origin'
            });
            corsIssues++;
          }
          
        } catch (error) {
          // Pomiń pliki z błędami
        }
      }
    });
    
    console.log(`   Znaleziono ${corsIssues} problemów z CORS`);
  }

  /**
   * Znajdź pliki testowe i debugowe
   */
  async findTestFiles() {
    const files = this.getAllFiles();
    let testFiles = 0;
    
    files.forEach(file => {
      const isTestFile = AUDIT_CONFIG.TEST_FILE_PATTERNS.some(pattern => 
        pattern.test(file.name)
      );
      
      if (isTestFile) {
        this.results.addIssue('testFiles', {
          severity: 'MEDIUM',
          category: 'Pliki Deweloperskie',
          subcategory: 'Pliki Test/Debug',
          file: file.relativePath,
          description: 'Plik testowy lub debugowy znaleziony w kodzie produkcyjnym',
          recommendation: 'Przenieś do katalogu tests/ lub usuń z produkcji'
        });
        testFiles++;
      }
    });
    
    console.log(`   Znaleziono ${testFiles} plików testowych/debugowych`);
  }

  /**
   * Analiza rate limiting
   */
  async analyzeRateLimiting() {
    const files = this.getAllFiles();
    let rateLimitIssues = 0;
    
    // Sprawdź czy rate limiting jest skonfigurowany
    const hasRateLimiting = files.some(file => {
      try {
        const content = fs.readFileSync(file.path, 'utf8');
        return content.includes('rateLimit') || content.includes('express-rate-limit');
      } catch {
        return false;
      }
    });
    
    if (!hasRateLimiting) {
      this.results.addIssue('rateLimitingIssues', {
        severity: 'HIGH',
        category: 'Rate Limiting',
        subcategory: 'Brak Rate Limiting',
        description: 'Brak konfiguracji rate limiting w aplikacji',
        recommendation: 'Zaimplementuj rate limiting dla newralgicznych endpointów'
      });
      rateLimitIssues++;
    }
    
    console.log(`   Znaleziono ${rateLimitIssues} problemów z rate limiting`);
  }

  /**
   * Generuj raport audytu
   */
  async generateReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: this.results.summary,
      issues: this.results.issues
    };
    
    // Zapisz szczegółowy raport JSON
    const jsonReportPath = path.join(this.rootDir, 'security-audit/reports/comprehensive-audit-report.json');
    fs.writeFileSync(jsonReportPath, JSON.stringify(reportData, null, 2));
    
    // Generuj raport markdown
    const markdownReport = this.generateMarkdownReport(reportData);
    const mdReportPath = path.join(this.rootDir, 'security-audit/reports/security-audit-summary.md');
    fs.writeFileSync(mdReportPath, markdownReport);
    
    console.log(`   📄 Szczegółowy raport: ${jsonReportPath}`);
    console.log(`   📋 Podsumowanie: ${mdReportPath}`);
  }

  /**
   * Generuj raport markdown
   */
  generateMarkdownReport(data) {
    const { summary, issues } = data;
    
    return `# 🔒 RAPORT AUDYTU BEZPIECZEŃSTWA MARKETPLACE BACKEND

## 📊 Podsumowanie Wykonawcze

- **Łączna liczba problemów**: ${summary.totalIssues}
- **Problemy krytyczne**: ${summary.criticalIssues} 🔴
- **Problemy wysokiej wagi**: ${summary.highIssues} 🟠  
- **Problemy średniej wagi**: ${summary.mediumIssues} 🟡
- **Problemy niskiej wagi**: ${summary.lowIssues} 🟢

## 🚨 Szczegółowe Wyniki Audytu

### 1. Wrażliwe Logowanie (${issues.sensitiveLogging.length} problemów)
${issues.sensitiveLogging.slice(0, 10).map(issue => 
  `- **${issue.file}:${issue.line}** - ${issue.description}`
).join('\n') || 'Brak problemów'}

### 2. Duplikaty Plików (${issues.duplicateFiles.length} problemów)
${issues.duplicateFiles.slice(0, 5).map(issue => 
  `- **${issue.files.join(' & ')}** - ${issue.description}`
).join('\n') || 'Brak problemów'}

### 3. Bezpieczeństwo JWT (${issues.jwtIssues.length} problemów)
${issues.jwtIssues.slice(0, 5).map(issue => 
  `- **${issue.file}** - ${issue.description}`
).join('\n') || 'Brak problemów'}

### 4. Bezpieczeństwo Ciasteczek (${issues.cookieIssues.length} problemów)
${issues.cookieIssues.slice(0, 5).map(issue => 
  `- **${issue.file}** - ${issue.description}`
).join('\n') || 'Brak problemów'}

### 5. Zabezpieczenia Panelu Admin (${issues.adminSecurityIssues.length} problemów)
${issues.adminSecurityIssues.slice(0, 5).map(issue => 
  `- **${issue.file}** - ${issue.description}`
).join('\n') || 'Brak problemów'}

### 6. Konfiguracja CORS (${issues.corsIssues.length} problemów)
${issues.corsIssues.slice(0, 5).map(issue => 
  `- **${issue.file}** - ${issue.description}`
).join('\n') || 'Brak problemów'}

### 7. Pliki Testowe/Debugowe (${issues.testFiles.length} problemów)
${issues.testFiles.slice(0, 10).map(issue => 
  `- **${issue.file}** - ${issue.description}`
).join('\n') || 'Brak problemów'}

### 8. Rate Limiting (${issues.rateLimitingIssues.length} problemów)
${issues.rateLimitingIssues.slice(0, 5).map(issue => 
  `- ${issue.description}`
).join('\n') || 'Brak problemów'}

## 🎯 Natychmiastowe Działania Wymagane

1. **Usuń wszystkie wrażliwe logi** - ${issues.sensitiveLogging.filter(i => i.severity === 'CRITICAL').length} krytycznych problemów
2. **Zabezpiecz panel administratora** - ${issues.adminSecurityIssues.filter(i => i.severity === 'CRITICAL').length} krytycznych problemów  
3. **Popraw konfigurację ciasteczek** - ${issues.cookieIssues.filter(i => i.severity === 'HIGH').length} problemów wysokiej wagi
4. **Zoptymalizuj tokeny JWT** - ${issues.jwtIssues.filter(i => i.severity === 'HIGH').length} problemów wysokiej wagi
5. **Usuń pliki testowe z produkcji** - ${issues.testFiles.length} plików do przeniesienia

## 📋 Priorytet Napraw

### 🔴 KRYTYCZNE (natychmiast)
- Wrażliwe logowanie: ${issues.sensitiveLogging.filter(i => i.severity === 'CRITICAL').length}
- Zabezpieczenia admin: ${issues.adminSecurityIssues.filter(i => i.severity === 'CRITICAL').length}
- CORS z credentials: ${issues.corsIssues.filter(i => i.severity === 'CRITICAL').length}

### 🟠 WYSOKIE (w ciągu 24h)
- Konfiguracja ciasteczek: ${issues.cookieIssues.filter(i => i.severity === 'HIGH').length}
- Słabe sekrety JWT: ${issues.jwtIssues.filter(i => i.severity === 'HIGH').length}
- Rate limiting: ${issues.rateLimitingIssues.filter(i => i.severity === 'HIGH').length}

### 🟡 ŚREDNIE (w ciągu tygodnia)
- Duplikaty kodu: ${issues.duplicateFiles.length}
- Pliki testowe: ${issues.testFiles.length}
- Optymalizacja JWT: ${issues.jwtIssues.filter(i => i.severity === 'MEDIUM').length}

---
*Raport wygenerowany: ${new Date().toLocaleString('pl-PL')}*
*Audyt przeprowadzony przez: Security Audit System v1.0*
`;
  }

  /**
   * Wyświetl podsumowanie w konsoli
   */
  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('🔒 PODSUMOWANIE AUDYTU BEZPIECZEŃSTWA');
    console.log('='.repeat(80));
    console.log(`📊 Łączna liczba problemów: ${this.results.summary.totalIssues}`);
    console.log(`🔴 Krytyczne: ${this.results.summary.criticalIssues}`);
    console.log(`🟠 Wysokie: ${this.results.summary.highIssues}`);
    console.log(`🟡 Średnie: ${this.results.summary.mediumIssues}`);
    console.log(`🟢 Niskie: ${this.results.summary.lowIssues}`);
    console.log('='.repeat(80));
    
    if (this.results.summary.criticalIssues > 0) {
      console.log('⚠️  UWAGA: Znaleziono problemy krytyczne wymagające natychmiastowej naprawy!');
    }
    
    console.log('\n📄 Szczegółowe raporty zapisane w security-audit/reports/');
  }
}

// Uruchom audyt
const auditor = new SecurityAuditor();
auditor.runFullAudit().catch(console.error);
