import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

/**
 * Skrypt do śledzenia przepływu danych administratora
 * Pokazuje gdzie backend wysyła dane i do którego frontendu
 */

class AdminDataFlowTracer {
    constructor() {
        this.backendUrl = 'http://localhost:5000';
        this.frontendUrl = 'http://localhost:3000';
        this.results = {
            backendEndpoints: [],
            frontendComponents: [],
            dataFlow: [],
            issues: []
        };
    }

    async traceDataFlow() {
        console.log('🔍 Śledzenie przepływu danych panelu administratora...\n');

        // 1. Sprawdź endpointy backendu
        await this.checkBackendEndpoints();

        // 2. Znajdź komponenty frontendowe
        await this.findFrontendComponents();

        // 3. Przetestuj połączenia
        await this.testConnections();

        // 4. Pokaż wyniki
        this.displayResults();

        // 5. Zapisz raport
        await this.saveReport();
    }

    async checkBackendEndpoints() {
        console.log('📡 Sprawdzanie endpointów backendu...');

        const endpoints = [
            { path: '/api/admin-panel/dashboard', description: 'Główne dane dashboardu' },
            { path: '/api/admin-panel/dashboard/stats', description: 'Statystyki dashboardu' },
            { path: '/api/admin-panel/users', description: 'Lista użytkowników' },
            { path: '/api/admin-panel/listings', description: 'Lista ogłoszeń' },
            { path: '/api/admin-panel/reports', description: 'Lista raportów' },
            { path: '/api/admin-panel/health', description: 'Status systemu' },
            { path: '/api/admin-panel/auth/check', description: 'Sprawdzenie autoryzacji' }
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`${this.backendUrl}${endpoint.path}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                const status = response.status;
                const statusText = response.statusText;
                let dataPreview = null;

                if (response.ok) {
                    try {
                        const data = await response.json();
                        dataPreview = this.getDataPreview(data);
                    } catch (e) {
                        dataPreview = 'Nie można sparsować JSON';
                    }
                }

                this.results.backendEndpoints.push({
                    path: endpoint.path,
                    description: endpoint.description,
                    status,
                    statusText,
                    working: response.ok,
                    dataPreview,
                    fullUrl: `${this.backendUrl}${endpoint.path}`
                });

                console.log(`  ${response.ok ? '✅' : '❌'} ${endpoint.path} - ${status} ${statusText}`);
            } catch (error) {
                this.results.backendEndpoints.push({
                    path: endpoint.path,
                    description: endpoint.description,
                    status: 'ERROR',
                    statusText: error.message,
                    working: false,
                    dataPreview: null,
                    fullUrl: `${this.backendUrl}${endpoint.path}`
                });
                console.log(`  ❌ ${endpoint.path} - ERROR: ${error.message}`);
            }
        }
    }

    async findFrontendComponents() {
        console.log('\n🎨 Szukanie komponentów frontendowych...');

        const frontendPaths = [
            '../marketplace-frontend/src/components/admin',
            '../marketplace-frontend/src/components/admin/hooks',
            '../marketplace-frontend/src/components/admin/sections'
        ];

        for (const frontendPath of frontendPaths) {
            try {
                if (fs.existsSync(frontendPath)) {
                    await this.scanDirectory(frontendPath);
                }
            } catch (error) {
                console.log(`  ❌ Nie można przeskanować: ${frontendPath}`);
            }
        }
    }

    async scanDirectory(dirPath) {
        try {
            const files = fs.readdirSync(dirPath, { withFileTypes: true });
            
            for (const file of files) {
                const fullPath = path.join(dirPath, file.name);
                
                if (file.isDirectory()) {
                    await this.scanDirectory(fullPath);
                } else if (file.name.endsWith('.js') || file.name.endsWith('.jsx')) {
                    await this.analyzeFile(fullPath);
                }
            }
        } catch (error) {
            console.log(`  ❌ Błąd skanowania ${dirPath}: ${error.message}`);
        }
    }

    async analyzeFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const relativePath = path.relative(process.cwd(), filePath);
            
            // Szukaj wywołań API
            const apiCalls = this.findApiCalls(content);
            const dashboardUsage = this.findDashboardUsage(content);
            
            if (apiCalls.length > 0 || dashboardUsage.length > 0) {
                this.results.frontendComponents.push({
                    file: relativePath,
                    apiCalls,
                    dashboardUsage,
                    isAdminComponent: filePath.includes('/admin/'),
                    isDashboard: filePath.includes('Dashboard') || filePath.includes('dashboard')
                });
                
                console.log(`  📄 ${relativePath}`);
                if (apiCalls.length > 0) {
                    console.log(`    📡 API calls: ${apiCalls.length}`);
                }
                if (dashboardUsage.length > 0) {
                    console.log(`    📊 Dashboard usage: ${dashboardUsage.length}`);
                }
            }
        } catch (error) {
            console.log(`  ❌ Błąd analizy ${filePath}: ${error.message}`);
        }
    }

    findApiCalls(content) {
        const apiPatterns = [
            /fetch\s*\(\s*[`'"](.*?admin-panel.*?)[`'"]/g,
            /\.get\s*\(\s*[`'"](.*?dashboard.*?)[`'"]/g,
            /\.post\s*\(\s*[`'"](.*?admin.*?)[`'"]/g,
            /getDashboardStats/g,
            /useAdminApi/g,
            /localhost:5000.*?admin-panel/g
        ];

        const calls = [];
        for (const pattern of apiPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                calls.push({
                    type: 'API_CALL',
                    pattern: match[0],
                    url: match[1] || match[0]
                });
            }
        }
        return calls;
    }

    findDashboardUsage(content) {
        const dashboardPatterns = [
            /totalUsers/g,
            /totalListings/g,
            /totalMessages/g,
            /recentActivity/g,
            /AdminDashboard/g,
            /dashboard.*stats/gi
        ];

        const usage = [];
        for (const pattern of dashboardPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                usage.push({
                    type: 'DASHBOARD_DATA',
                    pattern: match[0]
                });
            }
        }
        return usage;
    }

    async testConnections() {
        console.log('\n🔗 Testowanie połączeń...');

        // Test głównego endpointu dashboard
        try {
            const response = await fetch(`${this.backendUrl}/api/admin-panel/dashboard`);
            if (response.ok) {
                const data = await response.json();
                this.results.dataFlow.push({
                    source: 'Backend Dashboard Controller',
                    endpoint: '/api/admin-panel/dashboard',
                    destination: 'Frontend useAdminApi hook',
                    dataTypes: Object.keys(data.data || {}),
                    status: 'WORKING',
                    sampleData: this.getDataPreview(data)
                });
                console.log('  ✅ Dashboard endpoint → Frontend hook: DZIAŁA');
            } else {
                this.results.issues.push({
                    type: 'CONNECTION_ISSUE',
                    description: `Dashboard endpoint zwraca ${response.status}`,
                    severity: 'HIGH'
                });
                console.log(`  ❌ Dashboard endpoint: ${response.status}`);
            }
        } catch (error) {
            this.results.issues.push({
                type: 'CONNECTION_ERROR',
                description: `Błąd połączenia z dashboard: ${error.message}`,
                severity: 'CRITICAL'
            });
            console.log(`  ❌ Błąd połączenia: ${error.message}`);
        }
    }

    getDataPreview(data) {
        if (!data) return null;
        
        const preview = {};
        if (data.data && data.data.stats) {
            preview.stats = {
                totalUsers: data.data.stats.totalUsers,
                totalListings: data.data.stats.totalListings,
                totalMessages: data.data.stats.totalMessages
            };
        }
        if (data.data && data.data.recentActivity) {
            preview.recentActivityCount = data.data.recentActivity.length;
        }
        return preview;
    }

    displayResults() {
        console.log('\n📋 RAPORT PRZEPŁYWU DANYCH ADMINISTRATORA');
        console.log('='.repeat(50));

        // Backend endpoints
        console.log('\n🔧 ENDPOINTY BACKENDU:');
        this.results.backendEndpoints.forEach(endpoint => {
            console.log(`\n  📡 ${endpoint.path}`);
            console.log(`     Opis: ${endpoint.description}`);
            console.log(`     Status: ${endpoint.status} ${endpoint.statusText}`);
            console.log(`     URL: ${endpoint.fullUrl}`);
            console.log(`     Działa: ${endpoint.working ? '✅' : '❌'}`);
            if (endpoint.dataPreview) {
                console.log(`     Dane: ${JSON.stringify(endpoint.dataPreview, null, 6)}`);
            }
        });

        // Frontend components
        console.log('\n🎨 KOMPONENTY FRONTENDOWE:');
        this.results.frontendComponents.forEach(component => {
            console.log(`\n  📄 ${component.file}`);
            console.log(`     Admin component: ${component.isAdminComponent ? '✅' : '❌'}`);
            console.log(`     Dashboard component: ${component.isDashboard ? '✅' : '❌'}`);
            console.log(`     API calls: ${component.apiCalls.length}`);
            console.log(`     Dashboard usage: ${component.dashboardUsage.length}`);
            
            if (component.apiCalls.length > 0) {
                console.log('     API wywołania:');
                component.apiCalls.forEach(call => {
                    console.log(`       - ${call.pattern}`);
                });
            }
        });

        // Data flow
        console.log('\n🔄 PRZEPŁYW DANYCH:');
        this.results.dataFlow.forEach(flow => {
            console.log(`\n  ${flow.source} → ${flow.destination}`);
            console.log(`     Endpoint: ${flow.endpoint}`);
            console.log(`     Status: ${flow.status}`);
            console.log(`     Typy danych: ${flow.dataTypes.join(', ')}`);
            if (flow.sampleData) {
                console.log(`     Przykład: ${JSON.stringify(flow.sampleData, null, 6)}`);
            }
        });

        // Issues
        if (this.results.issues.length > 0) {
            console.log('\n⚠️  PROBLEMY:');
            this.results.issues.forEach(issue => {
                console.log(`  ${issue.severity === 'CRITICAL' ? '🚨' : '⚠️'} ${issue.description}`);
            });
        }

        console.log('\n✅ Analiza zakończona!');
    }

    async saveReport() {
        const reportPath = 'scripts/admin-data-flow-report.json';
        try {
            fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
            console.log(`\n💾 Raport zapisany: ${reportPath}`);
        } catch (error) {
            console.log(`\n❌ Błąd zapisu raportu: ${error.message}`);
        }
    }
}

// Uruchom analizę
const tracer = new AdminDataFlowTracer();
tracer.traceDataFlow().catch(console.error);
