/**
 * PRAWDZIWY AUDYT BEZPIECZEŃSTWA MARKETPLACE BACKEND
 * 
 * Szczegółowa analiza rzeczywistego stanu bezpieczeństwa aplikacji
 * - Analiza konfiguracji środowiskowych
 * - Sprawdzenie rzeczywistych implementacji
 * - Weryfikacja logiki bezpieczeństwa
 * - Identyfikacja prawdziwych zagrożeń
 * 
 * @author Security Team
 * @version 2.0.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RealSecurityAuditor {
  constructor() {
    this.issues = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      info: []
    };
    this.stats = {
      filesScanned: 0,
      totalIssues: 0,
      startTime: new Date()
    };
  }

  /**
   * Główna funkcja audytu
   */
  async runAudit() {
    console.log('🔍 ROZPOCZYNANIE PRAWDZIWEGO AUDYTU BEZPIECZEŃSTWA');
    console.log('================================================================================');
    
    // 1. Analiza konfiguracji środowiskowej
    await this.auditEnvironmentConfig();
    
    // 2. Analiza konfiguracji cookies
    await this.auditCookieConfiguration();
    
    // 3. Analiza konfiguracji JWT
    await this.auditJWTConfiguration();
    
    // 4. Analiza middleware autoryzacji
    await this.auditAuthMiddleware();
    
    // 5. Analiza kontrolerów
    await this.auditControllers();
    
    // 6. Analiza routingu admin
    await this.auditAdminRoutes();
    
    // 7. Analiza logowania wrażliwych danych
    await this.auditSensitiveLogging();
    
    // 8. Analiza plików konfiguracyjnych
    await this.auditConfigFiles();
    
    // 9. Generowanie raportu
    await this.generateReport();
  }

  /**
   * Analiza konfiguracji środowiskowej
   */
  async auditEnvironmentConfig() {
    console.log('🌍 1. Analiza konfiguracji środowiskowej...');
    
    try {
      // Sprawdź plik .env.example
      const envExamplePath = path.join(__dirname, '.env.example');
      if (fs.existsSync(envExamplePath)) {
        const envExample = fs.readFileSync(envExamplePath, 'utf8');
        
        // Sprawdź czy są słabe domyślne sekrety
        if (envExample.includes('tajnyKluczJWT123')) {
          this.addIssue('high', 'Environment', 'Weak default JWT secret in .env.example', {
            file: '.env.example',
            description: 'Plik .env.example zawiera słaby domyślny sekret JWT',
            recommendation: 'Usuń lub zmień domyślny sekret na placeholder',
            risk: 'Deweloperzy mogą użyć słabego sekretu w produkcji'
          });
        }
        
        // Sprawdź czy są wszystkie wymagane zmienne
        const requiredVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGO_URI', 'NODE_ENV'];
        requiredVars.forEach(varName => {
          if (!envExample.includes(varName)) {
            this.addIssue('medium', 'Environment', `Missing ${varName} in .env.example`, {
              file: '.env.example',
              description: `Brak zmiennej ${varName} w pliku przykładowym`,
              recommendation: `Dodaj ${varName}=placeholder do .env.example`
            });
          }
        });
      } else {
        this.addIssue('medium', 'Environment', 'Missing .env.example file', {
          description: 'Brak pliku .env.example dla deweloperów',
          recommendation: 'Utwórz plik .env.example z przykładową konfiguracją'
        });
      }
      
      // Sprawdź konfigurację security.js
      await this.analyzeSecurityConfig();
      
    } catch (error) {
      this.addIssue('low', 'Environment', 'Error analyzing environment config', {
        error: error.message
      });
    }
  }

  /**
   * Analiza konfiguracji security.js
   */
  async analyzeSecurityConfig() {
    try {
      const securityConfigPath = path.join(__dirname, 'config', 'security.js');
      if (fs.existsSync(securityConfigPath)) {
        const content = fs.readFileSync(securityConfigPath, 'utf8');
        
        // Sprawdź czy są hardcoded sekrety
        const secretPatterns = [
          /JWT_SECRET.*=.*['"`][^'"`]{10,}['"`]/g,
          /password.*=.*['"`][^'"`]{5,}['"`]/gi,
          /secret.*=.*['"`][^'"`]{10,}['"`]/gi
        ];
        
        secretPatterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            matches.forEach(match => {
              this.addIssue('critical', 'Security Config', 'Hardcoded secret detected', {
                file: 'config/security.js',
                match: match.substring(0, 50) + '...',
                description: 'Wykryto zahardkodowany sekret w kodzie',
                recommendation: 'Przenieś sekrety do zmiennych środowiskowych',
                risk: 'Sekrety mogą być widoczne w repozytorium'
              });
            });
          }
        });
        
        // Sprawdź konfigurację JWT
        if (content.includes('accessTokenExpiry')) {
          const accessTokenMatch = content.match(/accessTokenExpiry:\s*isProduction\s*\?\s*['"`]([^'"`]+)['"`]/);
          if (accessTokenMatch) {
            const prodExpiry = accessTokenMatch[1];
            if (prodExpiry !== '15m') {
              this.addIssue('medium', 'JWT Config', 'Suboptimal access token expiry', {
                file: 'config/security.js',
                current: prodExpiry,
                recommended: '15m',
                description: 'Czas życia access tokena nie jest optymalny dla bezpieczeństwa'
              });
            }
          }
        }
        
        this.addIssue('info', 'Security Config', 'Security configuration analyzed', {
          file: 'config/security.js',
          status: 'Konfiguracja bezpieczeństwa została przeanalizowana'
        });
      }
    } catch (error) {
      this.addIssue('low', 'Security Config', 'Error analyzing security config', {
        error: error.message
      });
    }
  }

  /**
   * Analiza konfiguracji cookies
   */
  async auditCookieConfiguration() {
    console.log('🍪 2. Analiza konfiguracji cookies...');
    
    try {
      const cookieConfigPath = path.join(__dirname, 'config', 'cookieConfig.js');
      if (fs.existsSync(cookieConfigPath)) {
        const content = fs.readFileSync(cookieConfigPath, 'utf8');
        
        // Sprawdź czy HttpOnly jest zawsze true
        if (content.includes('httpOnly: true')) {
          this.addIssue('info', 'Cookie Security', 'HttpOnly properly configured', {
            file: 'config/cookieConfig.js',
            status: '✅ HttpOnly jest poprawnie skonfigurowane jako true'
          });
        }
        
        // Sprawdź konfigurację Secure
        if (content.includes('secure: isProd || isStaging')) {
          this.addIssue('info', 'Cookie Security', 'Secure attribute properly configured', {
            file: 'config/cookieConfig.js',
            status: '✅ Secure jest poprawnie skonfigurowane dla produkcji'
          });
        }
        
        // Sprawdź SameSite
        if (content.includes("sameSite: isProd ? 'strict' : 'lax'")) {
          this.addIssue('info', 'Cookie Security', 'SameSite properly configured', {
            file: 'config/cookieConfig.js',
            status: '✅ SameSite jest poprawnie skonfigurowane (strict w produkcji)'
          });
        }
        
        // Sprawdź czasy życia tokenów
        const tokenExpiryMatch = content.match(/production:\s*{[^}]*access:\s*(\d+)[^}]*}/s);
        if (tokenExpiryMatch) {
          const accessExpiry = parseInt(tokenExpiryMatch[1]);
          const minutes = accessExpiry / (1000 * 60);
          
          if (minutes <= 15) {
            this.addIssue('info', 'Cookie Security', 'Access token expiry optimal', {
              file: 'config/cookieConfig.js',
              expiry: `${minutes} minut`,
              status: '✅ Czas życia access tokena jest bezpieczny'
            });
          } else {
            this.addIssue('medium', 'Cookie Security', 'Access token expiry too long', {
              file: 'config/cookieConfig.js',
              current: `${minutes} minut`,
              recommended: '15 minut',
              description: 'Czas życia access tokena jest za długi dla bezpieczeństwa'
            });
          }
        }
        
        // Sprawdź czy są funkcje helper
        const helperFunctions = ['setAuthCookies', 'clearAuthCookies', 'setAdminCookies', 'clearAdminCookies'];
        helperFunctions.forEach(func => {
          if (content.includes(`export const ${func}`)) {
            this.addIssue('info', 'Cookie Security', `Helper function ${func} available`, {
              file: 'config/cookieConfig.js',
              function: func,
              status: '✅ Funkcja helper jest dostępna'
            });
          }
        });
        
      } else {
        this.addIssue('high', 'Cookie Security', 'Missing cookie configuration', {
          description: 'Brak centralnej konfiguracji cookies',
          recommendation: 'Utwórz config/cookieConfig.js z bezpieczną konfiguracją'
        });
      }
    } catch (error) {
      this.addIssue('low', 'Cookie Security', 'Error analyzing cookie config', {
        error: error.message
      });
    }
  }

  /**
   * Analiza konfiguracji JWT
   */
  async auditJWTConfiguration() {
    console.log('🔐 3. Analiza konfiguracji JWT...');
    
    try {
      // Sprawdź czy są używane bezpieczne algorytmy
      const files = await this.findFilesWithJWT();
      
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Sprawdź algorytm JWT
        if (content.includes('jwt.sign') || content.includes('jwt.verify')) {
          if (content.includes('algorithm')) {
            if (content.includes("'HS256'") || content.includes('"HS256"')) {
              this.addIssue('info', 'JWT Security', 'Secure JWT algorithm used', {
                file: path.relative(__dirname, file),
                algorithm: 'HS256',
                status: '✅ Używany jest bezpieczny algorytm HS256'
              });
            } else if (content.includes("'none'") || content.includes('"none"')) {
              this.addIssue('critical', 'JWT Security', 'Insecure JWT algorithm', {
                file: path.relative(__dirname, file),
                algorithm: 'none',
                description: 'Używany jest niebezpieczny algorytm "none"',
                recommendation: 'Zmień na HS256 lub RS256',
                risk: 'Tokeny mogą być podrobione bez znajomości sekretu'
              });
            }
          }
        }
        
        // Sprawdź czy są używane zmienne środowiskowe dla sekretów
        if (content.includes('process.env.JWT_SECRET')) {
          this.addIssue('info', 'JWT Security', 'JWT secret from environment', {
            file: path.relative(__dirname, file),
            status: '✅ Sekret JWT pobierany ze zmiennych środowiskowych'
          });
        }
      }
      
    } catch (error) {
      this.addIssue('low', 'JWT Security', 'Error analyzing JWT config', {
        error: error.message
      });
    }
  }

  /**
   * Analiza middleware autoryzacji
   */
  async auditAuthMiddleware() {
    console.log('🛡️ 4. Analiza middleware autoryzacji...');
    
    try {
      const authFiles = [
        'middleware/auth.js',
        'middleware/auth/auth.js',
        'admin/middleware/adminAuth.js'
      ];
      
      for (const filePath of authFiles) {
        const fullPath = path.join(__dirname, filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // Sprawdź czy jest weryfikacja tokena
          if (content.includes('jwt.verify')) {
            this.addIssue('info', 'Auth Middleware', 'JWT verification present', {
              file: filePath,
              status: '✅ Middleware weryfikuje tokeny JWT'
            });
          }
          
          // Sprawdź czy są sprawdzane role
          if (content.includes('role') && content.includes('admin')) {
            this.addIssue('info', 'Auth Middleware', 'Role-based access control', {
              file: filePath,
              status: '✅ Middleware sprawdza role użytkowników'
            });
          }
          
          // Sprawdź czy są obsługiwane błędy
          if (content.includes('catch') || content.includes('try')) {
            this.addIssue('info', 'Auth Middleware', 'Error handling present', {
              file: filePath,
              status: '✅ Middleware obsługuje błędy'
            });
          }
          
          // Sprawdź czy token jest pobierany z cookies
          if (content.includes('req.cookies')) {
            this.addIssue('info', 'Auth Middleware', 'Cookie-based authentication', {
              file: filePath,
              status: '✅ Middleware używa cookies do autoryzacji'
            });
          }
        }
      }
    } catch (error) {
      this.addIssue('low', 'Auth Middleware', 'Error analyzing auth middleware', {
        error: error.message
      });
    }
  }

  /**
   * Analiza kontrolerów
   */
  async auditControllers() {
    console.log('🎮 5. Analiza kontrolerów...');
    
    try {
      const controllerDirs = ['controllers', 'admin/controllers'];
      
      for (const dir of controllerDirs) {
        const fullDir = path.join(__dirname, dir);
        if (fs.existsSync(fullDir)) {
          await this.scanControllersRecursively(fullDir);
        }
      }
    } catch (error) {
      this.addIssue('low', 'Controllers', 'Error analyzing controllers', {
        error: error.message
      });
    }
  }

  /**
   * Skanowanie kontrolerów rekurencyjnie
   */
  async scanControllersRecursively(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        await this.scanControllersRecursively(fullPath);
      } else if (item.endsWith('.js')) {
        await this.analyzeController(fullPath);
        this.stats.filesScanned++;
      }
    }
  }

  /**
   * Analiza pojedynczego kontrolera
   */
  async analyzeController(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(__dirname, filePath);
      
      // Sprawdź czy kontroler używa bezpiecznych cookies
      if (content.includes('res.cookie') && !content.includes('cookieConfig')) {
        this.addIssue('medium', 'Controller Security', 'Manual cookie configuration', {
          file: relativePath,
          description: 'Kontroler ustawia cookies ręcznie zamiast używać centralnej konfiguracji',
          recommendation: 'Użyj funkcji z config/cookieConfig.js'
        });
      }
      
      // Sprawdź czy są logowane wrażliwe dane
      await this.checkSensitiveLogging(filePath, content);
      
    } catch (error) {
      this.addIssue('low', 'Controller Analysis', 'Error analyzing controller', {
        file: path.relative(__dirname, filePath),
        error: error.message
      });
    }
  }

  /**
   * Analiza routingu admin
   */
  async auditAdminRoutes() {
    console.log('👑 6. Analiza routingu admin...');
    
    try {
      const adminRoutesDir = path.join(__dirname, 'admin', 'routes');
      if (fs.existsSync(adminRoutesDir)) {
        const routeFiles = fs.readdirSync(adminRoutesDir);
        
        for (const file of routeFiles) {
          if (file.endsWith('.js')) {
            const filePath = path.join(adminRoutesDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Sprawdź czy są używane middleware autoryzacji
            if (content.includes('router.') && !content.includes('adminAuth')) {
              this.addIssue('high', 'Admin Security', 'Missing admin authentication middleware', {
                file: `admin/routes/${file}`,
                description: 'Route admin nie używa middleware autoryzacji',
                recommendation: 'Dodaj adminAuth middleware do wszystkich route admin',
                risk: 'Nieautoryzowany dostęp do funkcji administratora'
              });
            }
            
            // Sprawdź czy są sprawdzane uprawnienia
            if (content.includes('router.delete') || content.includes('router.put')) {
              if (!content.includes('role') && !content.includes('permission')) {
                this.addIssue('medium', 'Admin Security', 'Missing permission checks', {
                  file: `admin/routes/${file}`,
                  description: 'Brak sprawdzania uprawnień dla operacji modyfikujących',
                  recommendation: 'Dodaj sprawdzanie uprawnień dla operacji DELETE/PUT'
                });
              }
            }
          }
        }
      }
    } catch (error) {
      this.addIssue('low', 'Admin Routes', 'Error analyzing admin routes', {
        error: error.message
      });
    }
  }

  /**
   * Analiza logowania wrażliwych danych
   */
  async auditSensitiveLogging() {
    console.log('📝 7. Analiza logowania wrażliwych danych...');
    
    try {
      const files = await this.findAllJSFiles();
      
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        await this.checkSensitiveLogging(file, content);
      }
    } catch (error) {
      this.addIssue('low', 'Sensitive Logging', 'Error analyzing logging', {
        error: error.message
      });
    }
  }

  /**
   * Sprawdzenie wrażliwego logowania w pliku
   */
  async checkSensitiveLogging(filePath, content) {
    const relativePath = path.relative(__dirname, filePath);
    
    // Wzorce wrażliwych danych
    const sensitivePatterns = [
      { pattern: /console\.log.*password/gi, type: 'password', severity: 'critical' },
      { pattern: /console\.log.*token/gi, type: 'token', severity: 'critical' },
      { pattern: /console\.log.*secret/gi, type: 'secret', severity: 'critical' },
      { pattern: /console\.log.*jwt/gi, type: 'jwt', severity: 'critical' },
      { pattern: /logger\..*password/gi, type: 'password', severity: 'high' },
      { pattern: /logger\..*token/gi, type: 'token', severity: 'high' },
      { pattern: /logger\..*secret/gi, type: 'secret', severity: 'high' }
    ];
    
    sensitivePatterns.forEach(({ pattern, type, severity }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          this.addIssue(severity, 'Sensitive Logging', `Potential ${type} logging`, {
            file: relativePath,
            match: match.substring(0, 100),
            description: `Potencjalne logowanie wrażliwych danych typu ${type}`,
            recommendation: 'Usuń lub zamaskuj wrażliwe dane w logach',
            risk: 'Wrażliwe dane mogą być widoczne w logach'
          });
        });
      }
    });
  }

  /**
   * Analiza plików konfiguracyjnych
   */
  async auditConfigFiles() {
    console.log('⚙️ 8. Analiza plików konfiguracyjnych...');
    
    try {
      const configDir = path.join(__dirname, 'config');
      if (fs.existsSync(configDir)) {
        const configFiles = fs.readdirSync(configDir);
        
        for (const file of configFiles) {
          if (file.endsWith('.js')) {
            const filePath = path.join(configDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Sprawdź czy są hardcoded wartości
            if (content.includes('localhost') && !content.includes('process.env.NODE_ENV')) {
              this.addIssue('medium', 'Config Security', 'Hardcoded localhost in config', {
                file: `config/${file}`,
                description: 'Hardcoded localhost w konfiguracji',
                recommendation: 'Użyj zmiennych środowiskowych dla adresów'
              });
            }
          }
        }
      }
    } catch (error) {
      this.addIssue('low', 'Config Analysis', 'Error analyzing config files', {
        error: error.message
      });
    }
  }

  /**
   * Znajdź pliki z JWT
   */
  async findFilesWithJWT() {
    const files = [];
    const searchDirs = ['controllers', 'middleware', 'admin', 'config'];
    
    for (const dir of searchDirs) {
      const fullDir = path.join(__dirname, dir);
      if (fs.existsSync(fullDir)) {
        const found = await this.findJWTFilesRecursively(fullDir);
        files.push(...found);
      }
    }
    
    return files;
  }

  /**
   * Znajdź pliki JWT rekurencyjnie
   */
  async findJWTFilesRecursively(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        const subFiles = await this.findJWTFilesRecursively(fullPath);
        files.push(...subFiles);
      } else if (item.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('jwt') || content.includes('jsonwebtoken')) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  }

  /**
   * Znajdź wszystkie pliki JS
   */
  async findAllJSFiles() {
    const files = [];
    const searchDirs = ['.'];
    const excludeDirs = ['node_modules', '.git', 'uploads', 'logs'];
    
    for (const dir of searchDirs) {
      const fullDir = path.join(__dirname, dir);
      const found = await this.findJSFilesRecursively(fullDir, excludeDirs);
      files.push(...found);
    }
    
    return files;
  }

  /**
   * Znajdź pliki JS rekurencyjnie
   */
  async findJSFilesRecursively(dir, excludeDirs = []) {
    const files = [];
    
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        if (excludeDirs.includes(item)) continue;
        
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          const subFiles = await this.findJSFilesRecursively(fullPath, excludeDirs);
          files.push(...subFiles);
        } else if (item.endsWith('.js')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignoruj błędy dostępu do katalogów
    }
    
    return files;
  }

  /**
   * Dodaj problem do raportu
   */
  addIssue(severity, category, title, details = {}) {
    const issue = {
      id: `${category.replace(/\s+/g, '_')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity: severity.toUpperCase(),
      category,
      title,
      timestamp: new Date().toISOString(),
      ...details
    };
    
    this.issues[severity].push(issue);
    this.stats.totalIssues++;
  }

  /**
   * Generowanie raportu
   */
  async generateReport() {
    console.log('📊 9. Generowanie raportu...');
    
    const endTime = new Date();
    const duration = endTime - this.stats.startTime;
    
    const report = {
      metadata: {
        auditType: 'PRAWDZIWY AUDYT BEZPIECZEŃSTWA',
        version: '2.0.0',
        timestamp: endTime.toISOString(),
        duration: `${Math.round(duration / 1000)}s`,
        filesScanned: this.stats.filesScanned
      },
      summary: {
        totalIssues: this.stats.totalIssues,
        critical: this.issues.critical.length,
        high: this.issues.high.length,
        medium: this.issues.medium.length,
        low: this.issues.low.length,
        info: this.issues.info.length
      },
      issues: this.issues
    };
    
    // Zapisz raport JSON
    const reportPath = path.join(__dirname, 'REAL_SECURITY_AUDIT_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Wygeneruj raport markdown
    await this.generateMarkdownReport(report);
    
    // Wyświetl podsumowanie
    this.displaySummary(report);
  }

  /**
   * Generuj raport markdown
   */
  async generateMarkdownReport(report) {
    const mdPath = path.join(__dirname, 'REAL_SECURITY_AUDIT_REPORT.md');
    
    let markdown = `# 🔒 PRAWDZIWY AUDYT BEZPIECZEŃSTWA MARKETPLACE BACKEND

## 📊 Podsumowanie Wykonawcze

**Data audytu:** ${new Date(report.metadata.timestamp).toLocaleString('pl-PL')}  
**Czas trwania:** ${report.metadata.duration}  
**Przeskanowane pliki:** ${report.metadata.filesScanned}  
**Wersja audytu:** ${report.metadata.version}

## 🚨 Statystyki Problemów

- **Łączna liczba problemów:** ${report.summary.totalIssues}
- **🔴 Krytyczne:** ${report.summary.critical}
- **🟠 Wysokie:** ${report.summary.high}
- **🟡 Średnie:** ${report.summary.medium}
- **🔵 Niskie:** ${report.summary.low}
- **ℹ️ Informacyjne:** ${report.summary.info}

`;

    // Dodaj szczegóły problemów
    const severities = ['critical', 'high', 'medium', 'low', 'info'];
    const severityEmojis = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵', info: 'ℹ️' };
    
    for (const severity of severities) {
      if (report.issues[severity].length > 0) {
        markdown += `\n## ${severityEmojis[severity]} Problemy ${severity.toUpperCase()} (${report.issues[severity].length})\n\n`;
        
        report.issues[severity].forEach((issue, index) => {
          markdown += `### ${index + 1}. ${issue.title}\n\n`;
          markdown += `**Kategoria:** ${issue.category}  \n`;
          if (issue.file) markdown += `**Plik:** \`${issue.file}\`  \n`;
          if (issue.description) markdown += `**Opis:** ${issue.description}  \n`;
          if (issue.recommendation) markdown += `**Rekomendacja:** ${issue.recommendation}  \n`;
          if (issue.risk) markdown += `**Ryzyko:** ${issue.risk}  \n`;
          if (issue.status) markdown += `**Status:** ${issue.status}  \n`;
          markdown += '\n---\n\n';
        });
      }
    }
    
    fs.writeFileSync(mdPath, markdown);
  }

  /**
   * Wyświetl podsumowanie
   */
  displaySummary(report) {
    console.log('\n================================================================================');
    console.log('🔒 PODSUMOWANIE PRAWDZIWEGO AUDYTU BEZPIECZEŃSTWA');
    console.log('================================================================================');
    console.log(`📊 Łączna liczba problemów: ${report.summary.totalIssues}`);
    console.log(`🔴 Krytyczne: ${report.summary.critical}`);
    console.log(`🟠 Wysokie: ${report.summary.high}`);
    console.log(`🟡 Średnie: ${report.summary.medium}`);
    console.log(`🔵 Niskie: ${report.summary.low}`);
    console.log(`ℹ️ Informacyjne: ${report.summary.info}`);
    console.log('================================================================================');
    
    if (report.summary.critical > 0) {
      console.log('⚠️  UWAGA: Znaleziono problemy krytyczne wymagające natychmiastowej naprawy!');
    } else if (report.summary.high > 0) {
      console.log('⚠️  UWAGA: Znaleziono problemy wysokiej wagi wymagające szybkiej naprawy!');
    } else {
      console.log('✅ Nie znaleziono problemów krytycznych ani wysokiej wagi!');
    }
    
    console.log('\n📄 Szczegółowe raporty zapisane:');
    console.log('   - REAL_SECURITY_AUDIT_REPORT.json');
    console.log('   - REAL_SECURITY_AUDIT_REPORT.md');
  }
}

// Uruchom audyt
const auditor = new RealSecurityAuditor();
auditor.runAudit().catch(console.error);
