import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oiveubsshejiqsbfkalc.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_NDdrht8taW_fZPXlOD-pkA_ZSDyCWr4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)