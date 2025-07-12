import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Folder {
  id: string;
  name: string;
  parentPath: string;
  fullPath: string;
  athroId: string;
  folderType: 'resources' | 'tools';
  createdAt: string;
  updatedAt: string;
}

export class FolderService {
  
  /**
   * Generate the default folder structure for an Athro
   */
  static generateDefaultPaths(athroId: string, athroName: string) {
    const baseName = athroName.toLowerCase().replace(/\s+/g, '-');
    
    return {
      resources: {
        basePath: `Uploads/Upload Resources`,
        athroPath: `Uploads/Upload Resources/${baseName}-resources`,
      },
      tools: {
        basePath: `Uploads/All Study Tools`,
        athroPath: `Uploads/All Study Tools/${baseName}-tools`,
        quicknotes: `Uploads/All Study Tools/${baseName}-tools/quicknotes`,
        fullnotes: `Uploads/All Study Tools/${baseName}-tools/fullnotes`,
        mindmaps: `Uploads/All Study Tools/${baseName}-tools/mindmaps`,
        flashcards: `Uploads/All Study Tools/${baseName}-tools/flashcards`,
      }
    };
  }

  /**
   * Initialize default folder structure for a new Athro
   */
  static async initializeAthroFolders(athroId: string, athroName: string): Promise<boolean> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const paths = this.generateDefaultPaths(athroId, athroName);
      
      // Don't create actual folder records for the default structure
      // They exist conceptually but aren't stored in the database
      // Only user-created subfolders are stored
      
      console.log(`[FolderService] Default paths initialized for ${athroName}:`, paths);
      return true;
    } catch (error) {
      console.error('[FolderService] Error initializing athro folders:', error);
      return false;
    }
  }

  /**
   * Create a custom user folder
   */
  static async createFolder(
    name: string,
    parentPath: string,
    athroId: string,
    folderType: 'resources' | 'tools'
  ): Promise<Folder | null> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const fullPath = `${parentPath}/${name}`;

      const { data, error } = await supabase
        .from('folders')
        .insert({
          user_id: user.id,
          name,
          parent_path: parentPath,
          full_path: fullPath,
          athro_id: athroId,
          folder_type: folderType
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        parentPath: data.parent_path,
        fullPath: data.full_path,
        athroId: data.athro_id,
        folderType: data.folder_type,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('[FolderService] Error creating folder:', error);
      return null;
    }
  }

  /**
   * Get all custom folders for an Athro
   */
  static async getFoldersForAthro(athroId: string, folderType?: 'resources' | 'tools'): Promise<Folder[]> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return [];

      let query = supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .eq('athro_id', athroId);

      if (folderType) {
        query = query.eq('folder_type', folderType);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(d => ({
        id: d.id,
        name: d.name,
        parentPath: d.parent_path,
        fullPath: d.full_path,
        athroId: d.athro_id,
        folderType: d.folder_type,
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }));
    } catch (error) {
      console.error('[FolderService] Error getting folders:', error);
      return [];
    }
  }

  /**
   * Rename a folder
   */
  static async renameFolder(folderId: string, newName: string): Promise<boolean> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      // Get the current folder to update the full path
      const { data: folder, error: fetchError } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !folder) throw new Error('Folder not found');

      // Calculate new full path
      const parentParts = folder.parent_path.split('/');
      const newFullPath = `${folder.parent_path}/${newName}`;

      const { error } = await supabase
        .from('folders')
        .update({
          name: newName,
          full_path: newFullPath,
          updated_at: new Date().toISOString()
        })
        .eq('id', folderId)
        .eq('user_id', user.id);

      if (error) throw error;

      // TODO: Update any items that reference the old path
      await this.updateItemPathsAfterRename(folder.full_path, newFullPath, folder.folder_type);

      return true;
    } catch (error) {
      console.error('[FolderService] Error renaming folder:', error);
      return false;
    }
  }

  /**
   * Delete a folder and optionally move its contents
   */
  static async deleteFolder(folderId: string, moveContentsTo?: string): Promise<boolean> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      // Get the folder to be deleted
      const { data: folder, error: fetchError } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !folder) throw new Error('Folder not found');

      // If moveContentsTo is specified, update all items in this folder
      if (moveContentsTo) {
        await this.moveItemsToNewPath(folder.full_path, moveContentsTo, folder.folder_type);
      }

      // Delete the folder
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', user.id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('[FolderService] Error deleting folder:', error);
      return false;
    }
  }

  /**
   * Move an item (resource or tool) to a different folder
   */
  static async moveItemToFolder(
    itemId: string,
    newFolderPath: string,
    itemType: 'resources' | 'flashcards' | 'quick_notes' | 'full_notes' | 'mind_maps'
  ): Promise<boolean> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const tableName = itemType === 'resources' ? 'resources' : itemType;

      const { error } = await supabase
        .from(tableName)
        .update({
          folder_path: newFolderPath,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('[FolderService] Error moving item:', error);
      return false;
    }
  }

  /**
   * Get the appropriate folder path for saving new items
   */
  static getDefaultSavePath(athroId: string, athroName: string, itemType: string): string {
    const paths = this.generateDefaultPaths(athroId, athroName);
    
    switch (itemType) {
      case 'resources':
        return paths.resources.athroPath;
      case 'flashcards':
        return paths.tools.flashcards;
      case 'quicknotes':
        return paths.tools.quicknotes;
      case 'fullnotes':
        return paths.tools.fullnotes;
      case 'mindmaps':
        return paths.tools.mindmaps;
      default:
        return paths.resources.athroPath;
    }
  }

  /**
   * Helper: Update item paths after folder rename
   */
  private static async updateItemPathsAfterRename(
    oldPath: string,
    newPath: string,
    folderType: 'resources' | 'tools'
  ): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    try {
      if (folderType === 'resources') {
        await supabase
          .from('resources')
          .update({ folder_path: newPath })
          .eq('user_id', user.id)
          .eq('folder_path', oldPath);
      } else {
        // Update all tool types
        const tables = ['flashcards', 'quick_notes', 'full_notes', 'mind_maps'];
        await Promise.all(
          tables.map(table =>
            supabase
              .from(table)
              .update({ folder_path: newPath })
              .eq('user_id', user.id)
              .eq('folder_path', oldPath)
          )
        );
      }
    } catch (error) {
      console.error('[FolderService] Error updating item paths:', error);
    }
  }

  /**
   * Helper: Move items to new path
   */
  private static async moveItemsToNewPath(
    fromPath: string,
    toPath: string,
    folderType: 'resources' | 'tools'
  ): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    try {
      if (folderType === 'resources') {
        await supabase
          .from('resources')
          .update({ folder_path: toPath })
          .eq('user_id', user.id)
          .eq('folder_path', fromPath);
      } else {
        const tables = ['flashcards', 'quick_notes', 'full_notes', 'mind_maps'];
        await Promise.all(
          tables.map(table =>
            supabase
              .from(table)
              .update({ folder_path: toPath })
              .eq('user_id', user.id)
              .eq('folder_path', fromPath)
          )
        );
      }
    } catch (error) {
      console.error('[FolderService] Error moving items:', error);
    }
  }
}

export default FolderService; 