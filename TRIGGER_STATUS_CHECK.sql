-- 🔧 TRIGGER STATUS CHECK
-- Check if future registrations will work

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'on_auth_user_created'
    ) THEN 'TRIGGER EXISTS ✅'
    ELSE 'TRIGGER MISSING ❌'
  END as trigger_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'users' 
      AND policyname = 'Triggers can insert user data'
    ) THEN 'POLICY EXISTS ✅'
    ELSE 'POLICY MISSING ❌'
  END as policy_status; 