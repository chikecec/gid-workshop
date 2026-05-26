import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hktvhpyogjreiltykjuq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrdHZocHlvZ2pyZWlsdHlranVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDExODQsImV4cCI6MjA5NTM3NzE4NH0.fU8NmzBPjgf_FT5d4LGPP4PdiFOIBdm01ei2lYftsnc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
