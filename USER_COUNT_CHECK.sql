-- 📊 USER COUNT CHECK
-- See how many recent users are covered

SELECT 
  COUNT(*) as total_recent_auth_users,
  (SELECT COUNT(*) FROM public.users pu 
   JOIN auth.users au ON pu.id = au.id 
   WHERE au.created_at > NOW() - INTERVAL '3 days') as users_in_public_table,
  CASE 
    WHEN COUNT(*) = (SELECT COUNT(*) FROM public.users pu 
                     JOIN auth.users au ON pu.id = au.id 
                     WHERE au.created_at > NOW() - INTERVAL '3 days')
    THEN 'ALL RECENT USERS COVERED ✅'
    ELSE 'SOME USERS STILL MISSING ❌'
  END as coverage_status
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '3 days'; 