# Supabase Migration Instructions for Playlist Resources

To enable the new playlist-based Resources component with Supabase persistence, you need to run the following SQL migrations in your Supabase SQL editor.

## Step 1: Create Playlist Tables

Run the SQL from `create_playlists_tables.sql`:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `create_playlists_tables.sql`
4. Click "Run" to execute

This will create:
- `playlists` table for storing playlist metadata
- `playlist_documents` table for storing document metadata
- Proper indexes for performance
- Row Level Security (RLS) policies for data isolation

## Step 2: Create Storage Bucket

Run the SQL from `create_playlist_storage_bucket.sql`:

1. In the same SQL Editor
2. Copy and paste the contents of `create_playlist_storage_bucket.sql`
3. Click "Run" to execute

This will create:
- `playlist-documents` storage bucket for file uploads
- RLS policies for secure file access
- MIME type restrictions for allowed file types

## Step 3: Verify Migration

After running both migrations, verify in your Supabase dashboard:

1. **Database** → **Tables**: You should see `playlists` and `playlist_documents` tables
2. **Storage** → **Buckets**: You should see a `playlist-documents` bucket
3. **Authentication** → **Policies**: RLS policies should be visible for both tables and storage

## Features Enabled

Once migrations are complete, the Resources component will support:

- ✅ **Persistent playlists** stored in Supabase
- ✅ **File uploads** to Supabase Storage
- ✅ **User isolation** via RLS policies
- ✅ **Session tracking** for quick uploads
- ✅ **Full CRUD operations** (create, read, update, delete)
- ✅ **File sharing** between playlists (copy/move)
- ✅ **Automatic Quick Uploads History** folder creation

## Troubleshooting

If you encounter any issues:

1. **Check RLS policies**: Ensure they're enabled and correctly configured
2. **Verify user authentication**: Make sure users are properly authenticated
3. **Storage permissions**: Confirm the storage bucket has correct access policies
4. **Environment variables**: Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set

## Migration Files

- `create_playlists_tables.sql` - Database tables and policies
- `create_playlist_storage_bucket.sql` - Storage bucket configuration

Both files are safe to run multiple times (they use `IF NOT EXISTS` and `ON CONFLICT` clauses). 