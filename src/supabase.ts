import { createClient } from '@supabase/supabase-js'

const url =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://tduliggcewkzriymrtlo.supabase.co'
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  'sb_publishable_T9hqpBIksIXLTMWtTCnxqQ_QAvL5GNK'

export const supabase = createClient(url, key)
