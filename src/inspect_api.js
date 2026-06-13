async function inspectApi() {
  const supabaseUrl = 'https://gomaadobyjiajlmreyeb.supabase.co';
  const supabaseKey = 'sb_publishable_CJeEDPTr_MSfseO3dtiLAg_-KPnsRRX';

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey
      }
    });
    if (!res.ok) {
      console.error('Fetch failed with status:', res.status, res.statusText);
      return;
    }
    const data = await res.json();
    console.log('API Paths:', Object.keys(data.paths || {}));
    console.log('Definitions:', Object.keys(data.definitions || {}));
  } catch (err) {
    console.error('Error:', err);
  }
}

inspectApi();
