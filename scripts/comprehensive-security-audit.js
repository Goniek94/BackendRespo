/**
 * COMPREHENSIVE SECURITY AUDIT SCRIPT
 * 
 * Przeprowadza dokładny audyt bezpieczeństwa backendu:
 * 1. Sprawdza wycieki tokenów, haseł, kodów w logach i API
 * 2. Weryfikuje konfigurację cookies (HttpOnly/Secure/SameSite)
 * 3. Testuje endpointy autoryzacji
 * 4. Identyfikuje endpointy testowe/debugowe
 * 5. Sprawdza konfigurację zmiennych środowiskowych
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SecurityAuditor {
  constructor() {
    this.issues = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      info: []
    };
    this.checkedFiles = [];
    this.testEndpoints = [];
    this.debugEndpoints = [];
  }

  // Dodaj problem do raportu
  addIssue(severity, category, file, line, description, code = null) {
    const issue = {
      category,
      file,
      line,
      description,
      code: code ? code.trim() : null,
      timestamp: new Date().toISOString()
    };
    
    this.issues[severity].push(issue);
  }

  // Skanuj plik pod kątem problemów bezpieczeństwa
  scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const relativePath = path.relative(process.cwd(), filePath);
      
      this.checkedFiles.push(relativePath);
      
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmedLine = line.trim();
        
        // 1. SPRAWDŹ WYCIEKI TOKENÓW W LOGACH
        this.checkTokenLeaks(relativePath, lineNum, line, trimmedLine);
        
        // 2. SPRAWDŹ WYCIEKI HASEŁ
        this.checkPasswordLeaks(relativePath, lineNum, line, trimmedLine);
        
        // 3. SPRAWDŹ WYCIEKI KODÓW WERYFIKACYJNYCH
        this.checkCodeLeaks(relativePath, lineNum, line, trimmedLine);
        
        // 4. SPRAWDŹ TOKENY W ODPOWIEDZIACH JSON
        this.checkTokensInResponses(relativePath, lineNum, line, trimmedLine);
        
        // 5. SPRAWDŹ HARDCODED SEKRETY
        this.checkHardcodedSecrets(relativePath, lineNum, line, trimmedLine);
        
        // 6. SPRAWDŹ ENDPOINTY TESTOWE/DEBUGOWE
        this.checkTestEndpoints(relativePath, lineNum, line, trimmedLine);
        
        // 7. SPRAWDŹ KONFIGURACJĘ COOKIES
        this.checkCookieConfiguration(relativePath, lineNum, line, trimmedLine);
      });
      
    } catch (error) {
      this.addIssue('medium', 'FILE_ACCESS', filePath, 0, 
        `Nie można odczytać pliku: ${error.message}`);
    }
  }

  // Sprawdź wycieki tokenów w logach
  checkTokenLeaks(file, line, fullLine, trimmedLine) {
    const tokenPatterns = [
      // Bezpośrednie logowanie tokenów
      /console\.log.*token[^a-zA-Z]/i,
      /logger\.(info|debug|warn|error).*token[^a-zA-Z]/i,
      /console\.log.*jwt/i,
      /logger\.(info|debug|warn|error).*jwt/i,
      
      // Logowanie obiektów zawierających tokeny
      /console\.log.*\{.*token/i,
      /logger\.(info|debug|warn|error).*\{.*token/i,
      
      // Logowanie całych requestów/responses
      /console\.log.*req\./i,
      /console\.log.*res\./i,
      /logger\.(info|debug|warn|error).*req\./i,
      /logger\.(info|debug|warn|error).*res\./i
    ];

    tokenPatterns.forEach(pattern => {
      if (pattern.test(trimmedLine)) {
        // Sprawdź czy to nie jest bezpieczny log (bez rzeczywistego tokena)
        const safePatterns = [
          /no token/i,
          /token.*required/i,
          /token.*missing/i,
          /invalid.*token/i,
          /token.*expired/i,
          /token.*blacklisted/i,
          /token.*type/i,
          /tokenLength/i,
          /tokenId/i
        ];
        
        const isSafe = safePatterns.some(safe => safe.test(trimmedLine));
        
        if (!isSafe) {
          this.addIssue('critical', 'TOKEN_LEAK', file, line,
            'Potencjalny wyciek tokena w logu', fullLine);
        }
      }
    });
  }

  // Sprawdź wycieki haseł
  checkPasswordLeaks(file, line, fullLine, trimmedLine) {
    const passwordPatterns = [
      /console\.log.*password/i,
      /logger\.(info|debug|warn|error).*password/i,
      /console\.log.*pass[^a-zA-Z]/i,
      /logger\.(info|debug|warn|error).*pass[^a-zA-Z]/i,
      /console\.log.*pwd/i,
      /logger\.(info|debug|warn|error).*pwd/i
    ];

    passwordPatterns.forEach(pattern => {
      if (pattern.test(trimmedLine)) {
        // Sprawdź czy to nie jest bezpieczny log
        const safePatterns = [
          /password.*reset/i,
          /password.*required/i,
          /password.*invalid/i,
          /password.*changed/i,
          /password.*updated/i,
          /hashedPassword/i,
          /passwordHash/i
        ];
        
        const isSafe = safePatterns.some(safe => safe.test(trimmedLine));
        
        if (!isSafe) {
          this.addIssue('critical', 'PASSWORD_LEAK', file, line,
            'Potencjalny wyciek hasła w logu', fullLine);
        }
      }
    });
  }

  // Sprawdź wycieki kodów weryfikacyjnych
  checkCodeLeaks(file, line, fullLine, trimmedLine) {
    const codePatterns = [
      /console\.log.*code.*\$\{.*code.*\}/i,
      /console\.log.*kod.*\$\{.*kod.*\}/i,
      /logger\.(info|debug|warn|error).*code.*\$\{.*code.*\}/i,
      /console\.log.*Wygenerowano.*kod/i,
      /console\.log.*Generated.*code/i,
      /console\.log.*verification.*code/i,
      /console\.log.*twoFACode/i
    ];

    codePatterns.forEach(pattern => {
      if (pattern.test(trimmedLine)) {
        this.addIssue('critical', 'VERIFICATION_CODE_LEAK', file, line,
          'Wyciek kodu weryfikacyjnego w logu', fullLine);
      }
    });
  }

  // Sprawdź tokeny w odpowiedziach JSON
  checkTokensInResponses(file, line, fullLine, trimmedLine) {
    const responsePatterns = [
      /res\.json\(.*token/i,
      /res\.status\(.*\)\.json\(.*token/i,
      /return.*res\..*json.*token/i,
      /\.json\(\s*\{[^}]*token[^}]*\}/i
    ];

    responsePatterns.forEach(pattern => {
      if (pattern.test(trimmedLine)) {
        // Sprawdź czy to nie jest bezpieczna odpowiedź
        const safePatterns = [
          /token.*null/i,
          /token.*undefined/i,
          /token.*false/i,
          /no.*token/i,
          /token.*required/i,
          /token.*missing/i,
          /invalid.*token/i,
          /token.*expired/i
        ];
        
        const isSafe = safePatterns.some(safe => safe.test(fullLine));
        
        if (!isSafe) {
          this.addIssue('critical', 'TOKEN_IN_RESPONSE', file, line,
            'Token zwracany w odpowiedzi JSON (powinien być tylko w cookies)', fullLine);
        }
      }
    });
  }

  // Sprawdź hardcoded sekrety
  checkHardcodedSecrets(file, line, fullLine, trimmedLine) {
    // Pomiń pliki konfiguracyjne i przykładowe
    if (file.includes('.env.example') || file.includes('config/security.js')) {
      return;
    }

    const secretPatterns = [
      /JWT_SECRET\s*=\s*['"][^'"]{1,20}['"]/i,
      /jwt.*secret.*=.*['"][^'"]{1,20}['"]/i,
      /secret.*=.*['"](?!process\.env)[^'"]{8,}['"]/i,
      /password.*=.*['"][^'"]{1,20}['"]/i
    ];

    secretPatterns.forEach(pattern => {
      if (pattern.test(trimmedLine)) {
        // Sprawdź czy używa zmiennych środowiskowych
        if (!trimmedLine.includes('process.env')) {
          this.addIssue('critical', 'HARDCODED_SECRET', file, line,
            'Hardcoded sekret (powinien być w zmiennych środowiskowych)', fullLine);
        }
      }
    });
  }

  // Sprawdź endpointy testowe/debugowe
  checkTestEndpoints(file, line, fullLine, trimmedLine) {
    const testPatterns = [
      /router\.(get|post|put|delete).*['"].*test/i,
      /router\.(get|post|put|delete).*['"].*debug/i,
      /router\.(get|post|put|delete).*['"].*dev/i,
      /app\.(get|post|put|delete).*['"].*test/i,
      /app\.(get|post|put|delete).*['"].*debug/i,
      /\.route.*['"].*test/i,
      /\.route.*['"].*debug/i
    ];

    testPatterns.forEach(pattern => {
      if (pattern.test(trimmedLine)) {
        this.testEndpoints.push({ file, line, code: fullLine });
        this.addIssue('high', 'TEST_ENDPOINT', file, line,
          'Endpoint testowy/debugowy może być dostępny w produkcji', fullLine);
      }
    });
  }

  // Sprawdź konfigurację cookies
  checkCookieConfiguration(file, line, fullLine, trimmedLine) {
    if (trimmedLine.includes('cookie') || trimmedLine.includes('Cookie')) {
      // Sprawdź czy cookies mają odpowiednie flagi bezpieczeństwa
      if (trimmedLine.includes('httpOnly') && !trimmedLine.includes('httpOnly: true')) {
        this.addIssue('high', 'COOKIE_SECURITY', file, line,
          'Cookie bez flagi httpOnly', fullLine);
      }
      
      if (trimmedLine.includes('secure') && !trimmedLine.includes('secure: true') && 
          !trimmedLine.includes('secure: isProduction')) {
        this.addIssue('high', 'COOKIE_SECURITY', file, line,
          'Cookie bez flagi secure', fullLine);
      }
      
      if (trimmedLine.includes('sameSite') && !trimmedLine.includes('sameSite:')) {
        this.addIssue('medium', 'COOKIE_SECURITY', file, line,
          'Cookie bez flagi sameSite', fullLine);
      }
    }
  }

  // Skanuj wszystkie pliki w katalogu
  scanDirectory(dirPath, extensions = ['.js', '.ts', '.json']) {
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Pomiń node_modules i inne katalogi systemowe
          if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(item)) {
            this.scanDirectory(fullPath, extensions);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (extensions.includes(ext)) {
            this.scanFile(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Błąd skanowania katalogu ${dirPath}:`, error.message);
    }
  }

  // Sprawdź konfigurację zmiennych środowiskowych
  checkEnvironmentConfig() {
    const envExamplePath = '.env.example';
    const configPaths = [
      'config/index.js',
      'config/security.js',
      'config/environments/development.js',
      'config/environments/production.js'
    ];

    // Sprawdź .env.example
    if (fs.existsSync(envExamplePath)) {
      const envContent = fs.readFileSync(envExamplePath, 'utf8');
      
      // Sprawdź czy zawiera wszystkie wymagane zmienne
      const requiredVars = [
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'MONGODB_URI',
        'SESSION_SECRET'
      ];
      
      requiredVars.forEach(varName => {
        if (!envContent.includes(varName)) {
          this.addIssue('medium', 'ENV_CONFIG', envExamplePath, 0,
            `Brak wymaganej zmiennej środowiskowej: ${varName}`);
        }
      });
      
      // Sprawdź czy przykładowe sekrety nie są zbyt słabe
      const weakSecrets = [
        'your-jwt-secret',
        'your-secret-key',
        'change-me',
        'secret',
        '123456'
      ];
      
      weakSecrets.forEach(weak => {
        if (envContent.includes(weak)) {
          this.addIssue('low', 'WEAK_DEFAULT', envExamplePath, 0,
            `Słaby domyślny sekret w przykładzie: ${weak}`);
        }
      });
    } else {
      this.addIssue('medium', 'ENV_CONFIG', '.', 0,
        'Brak pliku .env.example z przykładową konfiguracją');
    }

    // Sprawdź pliki konfiguracyjne
    configPaths.forEach(configPath => {
      if (fs.existsSync(configPath)) {
        this.scanFile(configPath);
      }
    });
  }

  // Generuj raport
  generateReport() {
    const totalIssues = Object.values(this.issues).reduce((sum, arr) => sum + arr.length, 0);
    
    const report = {
      summary: {
        timestamp: new Date().toISOString(),
        totalFiles: this.checkedFiles.length,
        totalIssues: totalIssues,
        critical: this.issues.critical.length,
        high: this.issues.high.length,
        medium: this.issues.medium.length,
        low: this.issues.low.length,
        info: this.issues.info.length
      },
      issues: this.issues,
      checkedFiles: this.checkedFiles,
      testEndpoints: this.testEndpoints,
      debugEndpoints: this.debugEndpoints
    };

    return report;
  }

  // Wyświetl raport w konsoli
  printReport() {
    const report = this.generateReport();
    
    console.log('\n🔒 COMPREHENSIVE SECURITY AUDIT REPORT');
    console.log('=====================================\n');
    
    console.log('📊 PODSUMOWANIE:');
    console.log(`   Przeskanowane pliki: ${report.summary.totalFiles}`);
    console.log(`   Łączna liczba problemów: ${report.summary.totalIssues}`);
    console.log(`   🔴 Krytyczne: ${report.summary.critical}`);
    console.log(`   🟠 Wysokie: ${report.summary.high}`);
    console.log(`   🟡 Średnie: ${report.summary.medium}`);
    console.log(`   🔵 Niskie: ${report.summary.low}`);
    console.log(`   ℹ️  Informacyjne: ${report.summary.info}\n`);

    // Wyświetl problemy krytyczne
    if (report.issues.critical.length > 0) {
      console.log('🔴 PROBLEMY KRYTYCZNE:');
      report.issues.critical.forEach((issue, index) => {
        console.log(`   ${index + 1}. [${issue.category}] ${issue.file}:${issue.line}`);
        console.log(`      ${issue.description}`);
        if (issue.code) {
          console.log(`      Kod: ${issue.code}`);
        }
        console.log('');
      });
    }

    // Wyświetl problemy wysokie
    if (report.issues.high.length > 0) {
      console.log('🟠 PROBLEMY WYSOKIE:');
      report.issues.high.forEach((issue, index) => {
        console.log(`   ${index + 1}. [${issue.category}] ${issue.file}:${issue.line}`);
        console.log(`      ${issue.description}`);
        if (issue.code) {
          console.log(`      Kod: ${issue.code}`);
        }
        console.log('');
      });
    }

    // Wyświetl endpointy testowe
    if (report.testEndpoints.length > 0) {
      console.log('🧪 ZNALEZIONE ENDPOINTY TESTOWE/DEBUGOWE:');
      report.testEndpoints.forEach((endpoint, index) => {
        console.log(`   ${index + 1}. ${endpoint.file}:${endpoint.line}`);
        console.log(`      ${endpoint.code}`);
        console.log('');
      });
    }

    return report;
  }

  // Zapisz raport do pliku
  saveReport(filename = 'COMPREHENSIVE_SECURITY_AUDIT_REPORT.json') {
    const report = this.generateReport();
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`📄 Raport zapisany do: ${filename}`);
    return report;
  }
}

// Uruchom audyt
async function runAudit() {
  console.log('🔍 Rozpoczynam kompleksowy audyt bezpieczeństwa...\n');
  
  const auditor = new SecurityAuditor();
  
  // Skanuj główne katalogi
  const dirsToScan = [
    'controllers',
    'middleware',
    'models',
    'routes',
    'config',
    'admin',
    'services',
    'utils'
  ];
  
  dirsToScan.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`📁 Skanowanie katalogu: ${dir}`);
      auditor.scanDirectory(dir);
    }
  });
  
  // Skanuj główne pliki
  const filesToScan = [
    'index.js',
    'app.js',
    'server.js'
  ];
  
  filesToScan.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`📄 Skanowanie pliku: ${file}`);
      auditor.scanFile(file);
    }
  });
  
  // Sprawdź konfigurację środowiska
  console.log('🔧 Sprawdzanie konfiguracji środowiska...');
  auditor.checkEnvironmentConfig();
  
  // Wyświetl i zapisz raport
  const report = auditor.printReport();
  auditor.saveReport('COMPREHENSIVE_SECURITY_AUDIT_REPORT.json');
  
  // Zapisz również raport markdown
  const markdownReport = generateMarkdownReport(report);
  fs.writeFileSync('COMPREHENSIVE_SECURITY_AUDIT_REPORT.md', markdownReport);
  console.log('📄 Raport markdown zapisany do: COMPREHENSIVE_SECURITY_AUDIT_REPORT.md');
  
  return report;
}

// Generuj raport markdown
function generateMarkdownReport(report) {
  let markdown = `# 🔒 COMPREHENSIVE SECURITY AUDIT REPORT

**Data audytu:** ${new Date(report.summary.timestamp).toLocaleString('pl-PL')}

## 📊 Podsumowanie

- **Przeskanowane pliki:** ${report.summary.totalFiles}
- **Łączna liczba problemów:** ${report.summary.totalIssues}
- 🔴 **Krytyczne:** ${report.summary.critical}
- 🟠 **Wysokie:** ${report.summary.high}
- 🟡 **Średnie:** ${report.summary.medium}
- 🔵 **Niskie:** ${report.summary.low}
- ℹ️ **Informacyjne:** ${report.summary.info}

`;

  // Dodaj problemy krytyczne
  if (report.issues.critical.length > 0) {
    markdown += `## 🔴 Problemy Krytyczne

`;
    report.issues.critical.forEach((issue, index) => {
      markdown += `### ${index + 1}. [${issue.category}] ${issue.file}:${issue.line}

**Opis:** ${issue.description}

`;
      if (issue.code) {
        markdown += `**Kod:**
\`\`\`javascript
${issue.code}
\`\`\`

`;
      }
    });
  }

  // Dodaj problemy wysokie
  if (report.issues.high.length > 0) {
    markdown += `## 🟠 Problemy Wysokie

`;
    report.issues.high.forEach((issue, index) => {
      markdown += `### ${index + 1}. [${issue.category}] ${issue.file}:${issue.line}

**Opis:** ${issue.description}

`;
      if (issue.code) {
        markdown += `**Kod:**
\`\`\`javascript
${issue.code}
\`\`\`

`;
      }
    });
  }

  // Dodaj endpointy testowe
  if (report.testEndpoints.length > 0) {
    markdown += `## 🧪 Endpointy Testowe/Debugowe

`;
    report.testEndpoints.forEach((endpoint, index) => {
      markdown += `### ${index + 1}. ${endpoint.file}:${endpoint.line}

\`\`\`javascript
${endpoint.code}
\`\`\`

`;
    });
  }

  // Dodaj listę przeskanowanych plików
  markdown += `## 📁 Przeskanowane Pliki

`;
  report.checkedFiles.forEach(file => {
    markdown += `- ${file}\n`;
  });

  return markdown;
}

// Uruchom audyt jeśli plik jest wykonywany bezpośrednio
if (import.meta.url === `file://${process.argv[1]}`) {
  runAudit().catch(console.error);
}

export { SecurityAuditor, runAudit };
