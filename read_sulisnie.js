const fs = require('fs');
const { google } = require('googleapis');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

let privateKey = env.GOOGLE_PRIVATE_KEY || '';
privateKey = privateKey.replace(/\\n/g, '\n').replace(/\r/g, '').trim();
if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
  const match = privateKey.match(/-----BEGIN [^-]+-----([\s\S]+?)-----END [^-]+-----/);
  if (!match) {
    const base64Only = privateKey.replace(/[^A-Za-z0-9+/=]/g, '');
    const chunked = base64Only.match(/.{1,64}/g)?.join('\n') || base64Only;
    privateKey = `-----BEGIN PRIVATE KEY-----\n${chunked}\n-----END PRIVATE KEY-----\n`;
  }
}

const auth = new google.auth.JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: privateKey,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function main() {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = env.GOOGLE_SHEET_ID;

  // 1. Check sheets in spreadsheet
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  console.log('Sheets found:');
  meta.data.sheets.forEach(s => console.log(' -', s.properties.title));

  // 2. Read SulisNie rows
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'SulisNie'!A1:H`,
  });

  const rows = res.data.values || [];
  console.log(`\nSulisNie rows count: ${rows.length}`);
  rows.forEach((r, idx) => {
    console.log(`Row ${idx + 1}:`, r);
  });
}

main().catch(console.error);

