import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tspqihfwtejrksddbruo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzcHFpaGZ3dGVqcmtzZGRicnVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MTE2NzgsImV4cCI6MjA5MzQ4NzY3OH0.jqVKvSkLyd3ghd7IU84_1EZpg-QaQuPsNXqCM5rXxsI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)