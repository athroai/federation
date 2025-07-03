// USER CLEANUP SCRIPT - Run in Node.js or browser console
// Make sure you have your Supabase service role key

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY' // ⚠️ Service role key needed

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function deleteAllUsers() {
  try {
    console.log('🧹 Starting user cleanup...')
    
    // 1. Get all users
    const { data: users, error: getUsersError } = await supabase.auth.admin.listUsers()
    
    if (getUsersError) {
      console.error('Error fetching users:', getUsersError)
      return
    }
    
    console.log(`Found ${users.users.length} users to delete`)
    
    // 2. Delete each user
    for (const user of users.users) {
      console.log(`Deleting user: ${user.email}`)
      
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
      
      if (deleteError) {
        console.error(`Error deleting user ${user.email}:`, deleteError)
      } else {
        console.log(`✅ Deleted user: ${user.email}`)
      }
    }
    
    // 3. Clean up any remaining profile data
    await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('subject_preferences').delete().neq('id', 0)
    await supabase.from('user_preferences').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    console.log('🎉 All users deleted successfully!')
    
  } catch (error) {
    console.error('Error during cleanup:', error)
  }
}

// Uncomment to run:
// deleteAllUsers()

// Alternative: Simple delete all profiles approach
async function deleteAllProfiles() {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  
  if (error) console.error('Error:', error)
  else console.log('All profiles deleted!')
}

console.log('Cleanup functions ready. Call deleteAllUsers() or deleteAllProfiles()') 