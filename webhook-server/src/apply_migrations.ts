import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function applyMigrations() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      db: { schema: 'public' }
    }
  );

  try {
    // Read and execute the SQL file
    const sqlPath = path.join(__dirname, 'tier_change_function.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error applying migrations:', error);
      process.exit(1);
    }

    console.log('Migrations applied successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error reading or executing migrations:', error);
    process.exit(1);
  }
}

applyMigrations(); 