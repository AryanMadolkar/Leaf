const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gomaadobyjiajlmreyeb.supabase.co';
const supabaseKey = 'sb_publishable_CJeEDPTr_MSfseO3dtiLAg_-KPnsRRX';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*');
  
  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('Profiles in DB:', profiles);
  }
}

checkUsers();
