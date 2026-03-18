// Test skript pre overenie Resend emailov
// Spusti: node scripts/test-email.js
// alebo: npx ts-node scripts/test-email.js

const https = require('https');
const fs = require('fs');
const path = require('path');

// Načítaj .env.local
const envPath = path.join(__dirname, '..', '.env.local');
console.log('Čítam env z:', envPath);
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.replace(/\r/g, '').split('\n').forEach(line => {
  line = line.trim();
  if (!line || line.startsWith('#')) return;
  const eqIndex = line.indexOf('=');
  if (eqIndex > 0) {
    const key = line.substring(0, eqIndex).trim();
    const value = line.substring(eqIndex + 1).trim();
    env[key] = value;
  }
});

console.log('=== RESEND EMAIL TEST ===\n');
console.log('1. Kontrola env premenných:');
console.log('   RESEND_API_KEY:', env.RESEND_API_KEY ? `${env.RESEND_API_KEY.substring(0, 10)}...` : '❌ CHÝBA!');
console.log('   CONTACT_TO_EMAIL:', env.CONTACT_TO_EMAIL || '❌ CHÝBA!');
console.log('   CONTACT_FROM_EMAIL:', env.CONTACT_FROM_EMAIL || '❌ CHÝBA!');

if (!env.RESEND_API_KEY) {
  console.error('\n❌ RESEND_API_KEY nie je nastavený! Nemôžem pokračovať.');
  process.exit(1);
}

console.log('\n2. Posielam testovací email...');

const data = JSON.stringify({
  from: env.CONTACT_FROM_EMAIL || 'Film Studio <noreply@filmstudiorezervacie.online>',
  to: [env.CONTACT_TO_EMAIL || 'briankalafut9@gmail.com'],
  subject: 'TEST - Rezervačný systém - Overenie emailov',
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h1 style="color: #667eea;">✅ Resend funguje!</h1>
      <p>Tento testovací email potvrdzuje, že Resend API je správne nakonfigurovaný.</p>
      <p><strong>Čas testu:</strong> ${new Date().toLocaleString('sk-SK')}</p>
      <p><strong>API kľúč:</strong> ${env.RESEND_API_KEY.substring(0, 10)}...</p>
      <p><strong>Odosielateľ:</strong> ${env.CONTACT_FROM_EMAIL}</p>
    </div>
  `
});

const options = {
  hostname: 'api.resend.com',
  port: 443,
  path: '/emails',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`   HTTP Status: ${res.statusCode}`);

    try {
      const response = JSON.parse(body);

      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log(`   ✅ Email úspešne odoslaný!`);
        console.log(`   Email ID: ${response.id}`);
        console.log(`\n3. Skontroluj svoju schránku: ${env.CONTACT_TO_EMAIL}`);
        console.log('   (Môže trvať 1-2 minúty kým príde)');
      } else {
        console.log(`   ❌ Chyba pri odosielaní!`);
        console.log(`   Odpoveď:`, JSON.stringify(response, null, 2));

        if (response.statusCode === 403) {
          console.log('\n   RIEŠENIE: API kľúč nemá oprávnenie posielať emaily.');
          console.log('   Choď na https://resend.com/api-keys a vytvor nový kľúč s "Full access".');
        }
        if (response.statusCode === 422) {
          console.log('\n   RIEŠENIE: Doména nie je overená alebo "from" email je neplatný.');
          console.log('   Skontroluj na https://resend.com/domains že filmstudiorezervacie.online je Verified.');
        }
        if (response.message && response.message.includes('API key')) {
          console.log('\n   RIEŠENIE: API kľúč je neplatný. Skontroluj ho v .env.local');
        }
      }
    } catch (e) {
      console.log('   Raw odpoveď:', body);
    }
  });
});

req.on('error', (error) => {
  console.error(`   ❌ Sieťová chyba: ${error.message}`);
  console.log('\n   Skontroluj pripojenie na internet.');
});

req.write(data);
req.end();
