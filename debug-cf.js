import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const configFile = path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'xdg.config', '.wrangler', 'config', 'default.toml');
  const token = fs.readFileSync(configFile, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/)[1];
  const accountId = 'ac0a0df276663c9d052989c015df09c6';

  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/notify-pwa`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json();
  console.log('Production config:', JSON.stringify(data.result?.deployment_configs?.production, null, 2));

  // Check recent deployments logs or status
  const dRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/notify-pwa/deployments`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const dData = await dRes.json();
  console.log('Latest deployment:', dData.result?.[0]?.id, dData.result?.[0]?.status);
}

main().catch(console.error);
