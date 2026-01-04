import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fplomxgpsenihhsdnxjn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwbG9teGdwc2VuaWhoc2RueGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMjgwMTcsImV4cCI6MjA4MDYwNDAxN30.WDf4n6a2mis1fBQnPXWzOLYl5vzwFHY2bgZjRol3f64'

export const supabase = createClient(supabaseUrl, supabaseKey)