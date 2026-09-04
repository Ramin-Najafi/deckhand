import { createClient } from '@supabase/supabase-js';

const url = 'https://dkendqhdcjmkicgmmizu.supabase.co';
const key = 'sb_publishable_Q0gVJfz-32gle1v38edMDQ__a4ngZHm';
const supabase = createClient(url, key);

async function check() {
  const { data: updateData, error: updateErr } = await supabase.from('jobs').update({ 
    planned_start: '2026-09-04T06:00:00Z',
    planned_end: '2026-09-04T09:00:00Z',
    version: 3
  }).eq('id', '55555555-5555-5555-5555-500000000010');
  console.log('Update err for planned_start:', updateErr);
}
check();
