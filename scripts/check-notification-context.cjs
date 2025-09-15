const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNOSTYKA NOTIFICATIONCONTEXT - HTTPONLY COOKIES');
console.log('============================================================');

// Ścieżka do NotificationContext
const notificationContextPath = path.join(__dirname, '../../marketplace-frontend/src/contexts/NotificationContext.js');

function analyzeNotificationContext() {
    console.log('\n📄 ANALIZA NOTIFICATIONCONTEXT.JS');
    console.log('--------------------------------------------------');
    
    if (!fs.existsSync(notificationContextPath)) {
        console.log('❌ Plik NotificationContext.js nie został znaleziony!');
        console.log(`   Szukano w: ${notificationContextPath}`);
        return;
    }
    
    const content = fs.readFileSync(notificationContextPath, 'utf8');
    const lines = content.split('\n');
    
    console.log(`✅ Plik znaleziony: ${lines.length} linii`);
    
    // Szukaj problemów z tokenami
    let tokenIssues = [];
    let dependencyIssues = [];
    let fixedIssues = [];
    
    lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmedLine = line.trim();
        
        // Sprawdź problematyczne sprawdzenia tokena (ale nie user?.id)
        if ((trimmedLine.includes('!user?.token') || trimmedLine.includes('user?.token')) && !trimmedLine.includes('user?.id')) {
            if (trimmedLine.includes('if') && trimmedLine.includes('!user?.token')) {
                tokenIssues.push({
                    line: lineNum,
                    content: trimmedLine,
                    type: 'blocking_condition'
                });
            } else if (trimmedLine.includes('user?.token')) {
                tokenIssues.push({
                    line: lineNum,
                    content: trimmedLine,
                    type: 'token_reference'
                });
            }
        }
        
        // Sprawdź dependency arrays (tylko user?.token, nie user?.id)
        if (trimmedLine.includes('user?.token') && !trimmedLine.includes('user?.id') && (trimmedLine.includes('[') || trimmedLine.includes(']'))) {
            dependencyIssues.push({
                line: lineNum,
                content: trimmedLine
            });
        }
        
        // Sprawdź czy naprawki zostały już zastosowane
        if (trimmedLine.includes('!user)') && trimmedLine.includes('isAuthenticated')) {
            fixedIssues.push({
                line: lineNum,
                content: trimmedLine
            });
        }
    });
    
    // Wyniki analizy
    console.log('\n🚨 PROBLEMY Z TOKENAMI:');
    if (tokenIssues.length === 0) {
        console.log('   ✅ Brak problemów z user?.token');
    } else {
        tokenIssues.forEach(issue => {
            console.log(`   ❌ Linia ${issue.line}: ${issue.content}`);
            console.log(`      Typ: ${issue.type}`);
        });
    }
    
    console.log('\n🔗 PROBLEMY Z DEPENDENCY ARRAYS:');
    if (dependencyIssues.length === 0) {
        console.log('   ✅ Brak user?.token w dependency arrays');
    } else {
        dependencyIssues.forEach(issue => {
            console.log(`   ❌ Linia ${issue.line}: ${issue.content}`);
        });
    }
    
    console.log('\n✅ ZASTOSOWANE NAPRAWKI:');
    if (fixedIssues.length === 0) {
        console.log('   ❌ Brak naprawek - system nadal może być zablokowany');
    } else {
        fixedIssues.forEach(fix => {
            console.log(`   ✅ Linia ${fix.line}: ${fix.content}`);
        });
    }
    
    return {
        tokenIssues,
        dependencyIssues,
        fixedIssues,
        totalLines: lines.length
    };
}

function generateRecommendations(analysis) {
    console.log('\n💡 REKOMENDACJE NAPRAWY:');
    console.log('--------------------------------------------------');
    
    if (!analysis) {
        console.log('❌ Brak danych do analizy');
        return;
    }
    
    if (analysis.tokenIssues.length > 0) {
        console.log('\n🔧 WYMAGANE ZMIANY:');
        
        analysis.tokenIssues.forEach(issue => {
            console.log(`\n   📍 Linia ${issue.line}:`);
            console.log(`      PRZED: ${issue.content}`);
            
            if (issue.type === 'blocking_condition') {
                const fixed = issue.content.replace('!user?.token', '!user');
                console.log(`      PO:    ${fixed}`);
                console.log(`      ✨ Usuwa sprawdzanie tokena, sprawdza tylko czy user istnieje`);
            }
        });
        
        if (analysis.dependencyIssues.length > 0) {
            console.log('\n   🔗 DEPENDENCY ARRAYS:');
            analysis.dependencyIssues.forEach(issue => {
                console.log(`      📍 Linia ${issue.line}: Usuń user?.token z dependency array`);
            });
        }
    }
    
    if (analysis.tokenIssues.length === 0 && analysis.fixedIssues.length > 0) {
        console.log('✅ NotificationContext wydaje się być już naprawiony!');
        console.log('   System powinien działać z HttpOnly cookies');
    }
    
    console.log('\n📋 DLACZEGO TE ZMIANY SĄ POTRZEBNE:');
    console.log('   🔒 HttpOnly cookies nie są dostępne w JavaScript');
    console.log('   🔒 user?.token zawsze zwraca undefined');
    console.log('   🔒 Sprawdzanie user?.token blokuje system powiadomień');
    console.log('   ✅ Sprawdzanie tylko user i isAuthenticated jest wystarczające');
}

function checkOtherFiles() {
    console.log('\n🔍 SPRAWDZANIE INNYCH PLIKÓW:');
    console.log('--------------------------------------------------');
    
    const filesToCheck = [
        '../../marketplace-frontend/src/contexts/AuthContext.js',
        '../../marketplace-frontend/src/services/api/client.js',
        '../../marketplace-frontend/src/config/config.js'
    ];
    
    filesToCheck.forEach(relativePath => {
        const fullPath = path.join(__dirname, relativePath);
        
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const tokenReferences = (content.match(/user\?\.token/g) || []).length;
            
            console.log(`   📄 ${path.basename(fullPath)}: ${tokenReferences} wystąpień user?.token`);
            
            if (tokenReferences > 0) {
                console.log(`      ⚠️  Może wymagać sprawdzenia`);
            }
        } else {
            console.log(`   ❌ ${path.basename(relativePath)}: Plik nie znaleziony`);
        }
    });
}

function main() {
    const analysis = analyzeNotificationContext();
    generateRecommendations(analysis);
    checkOtherFiles();
    
    console.log('\n🎯 PODSUMOWANIE:');
    console.log('============================================================');
    
    if (analysis && analysis.tokenIssues.length === 0 && analysis.fixedIssues.length > 0) {
        console.log('✅ NotificationContext jest dopasowany do HttpOnly cookies');
        console.log('✅ System powiadomień powinien działać poprawnie');
        console.log('🧪 Zalecane: Przetestuj system powiadomień w przeglądarce');
    } else if (analysis && analysis.tokenIssues.length > 0) {
        console.log('❌ NotificationContext wymaga naprawy');
        console.log('🔧 Zastosuj powyższe rekomendacje');
        console.log('🧪 Po naprawie przetestuj system powiadomień');
    } else {
        console.log('❓ Nie można określić stanu - sprawdź ścieżki do plików');
    }
    
    console.log('\n✅ Diagnostyka zakończona!');
}

main();
