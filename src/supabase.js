import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://exfxohmvyekfoqlczqzm.supabase.co';
const supabaseKey = 'sb_publishable_ApJGhI2QpG-UjeAzdsL2sw_PqrIkbN0';

export const supabase = createClient(supabaseUrl, supabaseKey);