import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://scsbjeaisuhfjqzcoheo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjc2JqZWFpc3VoZmpxemNvaGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNzI0MTMsImV4cCI6MjA5MzY0ODQxM30.FHIJt0kMBLQ7SPRzfR9yV3EH0-sD44VSXSghNg-bOJ0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function getCurrentPerson() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('people').select('*').eq('auth_id', user.id).single()
  return data
}