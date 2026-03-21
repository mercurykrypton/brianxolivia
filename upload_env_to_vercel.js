const fs = require('fs');
const https = require('https');

const TOKEN = 'vca_5awlDJPxeaZCmOaorMRXuKoiCNoEQI9lPTZK1bCIyt4w42Czsv2ofr3t';
const PROJECT_ID = 'prj_Q65eHlaOGsj9vfLNwP0EeErDy8s2';
const TEAM_ID = 'team_tXeplP0CS795nlqr1sw7lwHa';

const SKIP_VALUES = ['whsec_...', 're_...', 'redis://localhost:6379'];

function postEnv(key, value) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      key,
      value,
      type: 'encrypted',
      target: ['production', 'preview', 'development'],
    });

    const options = {
      hostname: 'api.vercel.com',
      path: `/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(`OK`);
        } else {
          try {
            const parsed = JSON.parse(data);
            resolve(`ERROR ${res.statusCode}: ${parsed.error?.message || data}`);
          } catch {
            resolve(`ERROR ${res.statusCode}: ${data}`);
          }
        }
      });
    });

    req.on('error', (e) => resolve(`REQUEST ERROR: ${e.message}`));
    req.write(body);
    req.end();
  });
}

async function main() {
  const raw = fs.readFileSync('/Users/abm/kode/apps/web/.env.local', 'utf8');
  const lines = raw.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Parse KEY=VALUE (value may be quoted)
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();

    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Skip placeholder/unwanted values
    if (SKIP_VALUES.includes(value)) {
      console.log(`SKIP  ${key} (value is placeholder/excluded)`);
      continue;
    }

    const result = await postEnv(key, value);
    console.log(`${result.startsWith('OK') ? 'OK   ' : result}  ${key}`);
  }
}

main().catch(console.error);
