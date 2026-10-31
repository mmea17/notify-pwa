export default {
  // Cloudflare Scheduled Event - Runs every minute 24/7 on Cloudflare's global network
  async scheduled(event, env, ctx) {
    try {
      console.log('Automated Cron Trigger fired:', new Date().toISOString());
      const res = await fetch('https://notify-pwa-85k.pages.dev/api/cron/tick', {
        method: 'POST',
        headers: {
          'User-Agent': 'Cloudflare-Worker-Cron'
        }
      });
      const data = await res.json();
      console.log('Cron response:', JSON.stringify(data));
    } catch (err) {
      console.error('Failed to trigger cron tick:', err);
    }
  },

  // HTTP handler for manual ping / health check
  async fetch(request, env, ctx) {
    try {
      const res = await fetch('https://notify-pwa-85k.pages.dev/api/cron/tick');
      const text = await res.text();
      return new Response(text, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err?.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
