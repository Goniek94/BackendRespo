/**
 * SKRYPT DIAGNOSTYCZNY NAGŁÓWKÓW PANELU ADMINA
 * Sprawdza dokładnie co powoduje ogromne nagłówki HTTP 431 w panelu admina
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000';
const ADMIN_ENDPOINTS = [
    '/api/admin/auth/check',
    '/api/admin/users',
    '/api/admin/dashboard',
    '/api/notifications',
    '/api/admin/stats'
];

/**
 * Symuluje cookies z przeglądarki - WSZYSTKIE MOŻLIWE DUPLIKATY
 */
const simulateRealBrowserCookies = () => {
    const cookies = [];
    
    // Duplikaty tokenów - GŁÓWNY PROBLEM
    cookies.push('token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NmRmMGZhMjMxMjI3MGQwYmI3ZDZhMSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzI1NzQ4NzY4LCJleHAiOjE3MjU3NTIzNjh9.signature');
    cookies.push('refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NmRmMGZhMjMxMjI3MGQwYmI3ZDZhMSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzI1NzQ4NzY4LCJleHAiOjE3MjU4MzUxNjh9.signature');
    cookies.push('admin_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NmRmMGZhMjMxMjI3MGQwYmI3ZDZhMSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcyNTc0ODc2OCwiZXhwIjoxNzI1NzUyMzY4fQ.signature');
    cookies.push('admin_refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NmRmMGZhMjMxMjI3MGQwYmI3ZDZhMSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcyNTc0ODc2OCwiZXhwIjoxNzI1ODM1MTY4fQ.signature');
    
    // Analytics cookies - DRUGI PROBLEM
    cookies.push('_ga=GA1.1.123456789.1234567890');
    cookies.push('_gid=GA1.1.987654321.0987654321');
    cookies.push('_gat_gtag_UA_123456789_1=1');
    cookies.push('_fbp=fb.1.1234567890123.1234567890');
    cookies.push('_fbc=fb.1.1234567890123.AbCdEfGhIjKlMnOpQrStUvWxYz');
    
    // Session cookies
    cookies.push('sessionId=sess_1234567890abcdef1234567890abcdef');
    cookies.push('csrfToken=csrf_abcdef1234567890abcdef1234567890');
    cookies.push('analytics_session=analytics_1234567890abcdef1234567890abcdef1234567890');
    
    // Development cookies
    cookies.push('debug_mode=true');
    cookies.push('dev_user_id=66df0fa2312270d0bb7d6a1');
    cookies.push('last_page=/admin/dashboard');
    cookies.push('theme=dark');
    cookies.push('language=pl');
    cookies.push('timezone=Europe/Warsaw');
    
    // Dodatkowe problematyczne cookies
    cookies.push('remember_me=1');
    cookies.push('user_preferences={"theme":"dark","lang":"pl","notifications":true}');
    cookies.push('cart_items=[]');
    cookies.push('recent_searches=["bmw","audi","mercedes"]');
    
    return cookies.join('; ');
};

/**
 * Analizuje rozmiar nagłówków
 */
const analyzeHeaders = (headers) => {
    const analysis = {
        totalSize: 0,
        headers: [],
        cookieAnalysis: null
    };
    
    Object.entries(headers).forEach(([name, value]) => {
        const size = `${name}: ${value}`.length;
        analysis.totalSize += size;
        analysis.headers.push({
            name,
            value: typeof value === 'string' ? value.substring(0, 100) + (value.length > 100 ? '...' : '') : value,
            size,
            percentage: 0 // Będzie obliczone później
        });
    });
    
    // Oblicz procenty
    analysis.headers.forEach(header => {
        header.percentage = ((header.size / analysis.totalSize) * 100).toFixed(1);
    });
    
    // Sortuj według rozmiaru
    analysis.headers.sort((a, b) => b.size - a.size);
    
    // Specjalna analiza cookies
    const cookieHeader = headers.cookie || headers.Cookie;
    if (cookieHeader) {
        analysis.cookieAnalysis = analyzeCookies(cookieHeader);
    }
    
    return analysis;
};

/**
 * Analizuje cookies szczegółowo
 */
const analyzeCookies = (cookieString) => {
    const cookies = cookieString.split(';').map(c => c.trim());
    const analysis = {
        totalSize: cookieString.length,
        count: cookies.length,
        cookies: [],
        duplicates: [],
        categories: {
            auth: [],
            analytics: [],
            session: [],
            preferences: [],
            other: []
        }
    };
    
    cookies.forEach(cookie => {
        const [name, ...valueParts] = cookie.split('=');
        const value = valueParts.join('=');
        const size = cookie.length;
        
        const cookieInfo = {
            name: name?.trim(),
            value: value?.substring(0, 50) + (value?.length > 50 ? '...' : ''),
            fullValue: value,
            size,
            percentage: ((size / analysis.totalSize) * 100).toFixed(1)
        };
        
        analysis.cookies.push(cookieInfo);
        
        // Kategoryzacja
        const nameLower = name?.toLowerCase() || '';
        if (nameLower.includes('token') || nameLower.includes('auth')) {
            analysis.categories.auth.push(cookieInfo);
        } else if (nameLower.includes('_ga') || nameLower.includes('_fb') || nameLower.includes('analytics')) {
            analysis.categories.analytics.push(cookieInfo);
        } else if (nameLower.includes('session') || nameLower.includes('csrf')) {
            analysis.categories.session.push(cookieInfo);
        } else if (nameLower.includes('theme') || nameLower.includes('lang') || nameLower.includes('pref')) {
            analysis.categories.preferences.push(cookieInfo);
        } else {
            analysis.categories.other.push(cookieInfo);
        }
    });
    
    // Znajdź duplikaty tokenów
    const tokenCookies = analysis.cookies.filter(c => 
        c.name?.toLowerCase().includes('token') || 
        c.name?.toLowerCase().includes('refresh')
    );
    
    if (tokenCookies.length > 2) {
        analysis.duplicates = tokenCookies;
    }
    
    // Sortuj według rozmiaru
    analysis.cookies.sort((a, b) => b.size - a.size);
    
    return analysis;
};

/**
 * Testuje endpoint z różnymi scenariuszami cookies
 */
const testEndpoint = async (endpoint, scenario) => {
    try {
        const config = {
            url: `${BASE_URL}${endpoint}`,
            method: 'GET',
            timeout: 10000,
            validateStatus: () => true, // Nie rzucaj błędów dla statusów HTTP
        };
        
        // Dodaj cookies według scenariusza
        if (scenario.cookies) {
            config.headers = {
                'Cookie': scenario.cookies,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0'
            };
        }
        
        const response = await axios(config);
        
        // Analizuj nagłówki żądania
        const requestHeaders = config.headers || {};
        const requestAnalysis = analyzeHeaders(requestHeaders);
        
        return {
            endpoint,
            scenario: scenario.name,
            status: response.status,
            statusText: response.statusText,
            requestHeaders: requestAnalysis,
            responseSize: JSON.stringify(response.data || '').length,
            success: response.status < 400,
            error: response.status >= 400 ? response.statusText : null
        };
        
    } catch (error) {
        return {
            endpoint,
            scenario: scenario.name,
            status: error.response?.status || 'ERROR',
            statusText: error.message,
            requestHeaders: null,
            responseSize: 0,
            success: false,
            error: error.message
        };
    }
};

/**
 * Główna funkcja diagnostyczna
 */
const diagnoseAdminHeaders = async () => {
    console.log('🔍 DIAGNOZA NAGŁÓWKÓW PANELU ADMINA');
    console.log('================================================================================');
    
    const scenarios = [
        {
            name: 'Bez cookies',
            cookies: null
        },
        {
            name: 'Tylko podstawowe auth cookies',
            cookies: 'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.basic.token; refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.basic.refresh'
        },
        {
            name: 'Duplikaty tokenów (PROBLEM)',
            cookies: simulateRealBrowserCookies()
        },
        {
            name: 'Tylko analytics cookies',
            cookies: '_ga=GA1.1.123456789.1234567890; _gid=GA1.1.987654321.0987654321; _fbp=fb.1.1234567890123.1234567890'
        }
    ];
    
    const results = [];
    
    for (const scenario of scenarios) {
        console.log(`\n📊 Testowanie scenariusza: ${scenario.name}`);
        console.log('─'.repeat(50));
        
        for (const endpoint of ADMIN_ENDPOINTS) {
            console.log(`   Testing: ${endpoint}`);
            const result = await testEndpoint(endpoint, scenario);
            results.push(result);
            
            if (result.requestHeaders) {
                console.log(`   📏 Rozmiar nagłówków: ${result.requestHeaders.totalSize}B`);
                console.log(`   🚨 Status: ${result.status}`);
                
                if (result.requestHeaders.cookieAnalysis) {
                    const cookies = result.requestHeaders.cookieAnalysis;
                    console.log(`   🍪 Cookies: ${cookies.count} sztuk, ${cookies.totalSize}B`);
                    
                    if (cookies.duplicates.length > 0) {
                        console.log(`   ⚠️  DUPLIKATY TOKENÓW: ${cookies.duplicates.length}`);
                    }
                }
            }
        }
    }
    
    // Generuj szczegółowy raport
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalTests: results.length,
            failedTests: results.filter(r => !r.success).length,
            http431Errors: results.filter(r => r.status === 431).length
        },
        scenarios: scenarios.map(s => s.name),
        results: results,
        recommendations: generateRecommendations(results)
    };
    
    // Zapisz raport
    const reportPath = './docs/ADMIN_HEADERS_DIAGNOSIS_REPORT.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Wyświetl podsumowanie
    console.log('\n📋 PODSUMOWANIE DIAGNOZY');
    console.log('================================================================================');
    console.log(`🔍 Przebadano: ${report.summary.totalTests} testów`);
    console.log(`❌ Błędy: ${report.summary.failedTests}`);
    console.log(`🚨 HTTP 431: ${report.summary.http431Errors}`);
    
    // Znajdź największe nagłówki
    const largestHeaders = results
        .filter(r => r.requestHeaders)
        .sort((a, b) => b.requestHeaders.totalSize - a.requestHeaders.totalSize)
        .slice(0, 3);
    
    console.log('\n🔝 NAJWIĘKSZE NAGŁÓWKI:');
    largestHeaders.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.scenario} - ${result.requestHeaders.totalSize}B`);
        if (result.requestHeaders.cookieAnalysis) {
            const cookies = result.requestHeaders.cookieAnalysis;
            console.log(`      🍪 Cookies: ${cookies.totalSize}B (${cookies.count} sztuk)`);
            
            // Pokaż największe cookies
            const topCookies = cookies.cookies.slice(0, 3);
            topCookies.forEach(cookie => {
                console.log(`         • ${cookie.name}: ${cookie.size}B (${cookie.percentage}%)`);
            });
        }
    });
    
    console.log(`\n📄 Szczegółowy raport zapisany: ${reportPath}`);
    
    return report;
};

/**
 * Generuje rekomendacje na podstawie wyników
 */
const generateRecommendations = (results) => {
    const recommendations = [];
    
    // Sprawdź duplikaty tokenów
    const duplicateTokenResults = results.filter(r => 
        r.requestHeaders?.cookieAnalysis?.duplicates?.length > 0
    );
    
    if (duplicateTokenResults.length > 0) {
        recommendations.push({
            priority: 'CRITICAL',
            issue: 'Duplikaty tokenów uwierzytelniania',
            description: 'Wykryto duplikaty tokenów (token, refreshToken, admin_token, admin_refreshToken)',
            solution: 'Usuń duplikaty - zostaw tylko token i refreshToken',
            impact: 'Może zaoszczędzić 300-500B nagłówków'
        });
    }
    
    // Sprawdź analytics cookies
    const analyticsResults = results.filter(r => 
        r.requestHeaders?.cookieAnalysis?.categories?.analytics?.length > 0
    );
    
    if (analyticsResults.length > 0) {
        recommendations.push({
            priority: 'MEDIUM',
            issue: 'Cookies analityczne',
            description: 'Wykryto cookies Google Analytics, Facebook Pixel itp.',
            solution: 'Przenieś analytics do localStorage lub usuń niepotrzebne',
            impact: 'Może zaoszczędzić 100-200B nagłówków'
        });
    }
    
    // Sprawdź ogólny rozmiar nagłówków
    const largeHeaderResults = results.filter(r => 
        r.requestHeaders?.totalSize > 4096
    );
    
    if (largeHeaderResults.length > 0) {
        recommendations.push({
            priority: 'HIGH',
            issue: 'Zbyt duże nagłówki HTTP',
            description: 'Nagłówki przekraczają 4KB (limit niektórych serwerów)',
            solution: 'Zoptymalizuj cookies i usuń niepotrzebne nagłówki',
            impact: 'Zapobiegnie błędom HTTP 431'
        });
    }
    
    return recommendations;
};

// Uruchom diagnozę
diagnoseAdminHeaders().catch(console.error);
