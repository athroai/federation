import React, { useState, useEffect } from 'react';
import FolderService, { Folder } from '../../../services/FolderService';
import { FaFolder, FaFolderOpen, FaPlus, FaEdit, FaTrash, FaArrowRight } from 'react-icons/fa';
import './FolderManager.css';

interface FolderManagerProps {
  athroId: string;
  athroName: string;
  folderType: 'resources' | 'tools';
  currentPath?: string;
  onPathChange?: (path: string) => void;
  onFolderSelect?: (folder: Folder | null) => void;
}

const FolderManager: React.FC<FolderManagerProps> = ({
  athroId,
  athroName,
  folderType,
  currentPath,
  onPathChange,
  onFolderSelect
}) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);

  // Get default paths
  const defaultPaths = FolderService.generateDefaultPaths(athroId, athroName);
  const basePath = folderType === 'resources' 
    ? defaultPaths.resources.athroPath 
    : defaultPaths.tools.athroPath;

  useEffect(() => {
    loadFolders();
  }, [athroId, folderType]);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const folderList = await FolderService.getFoldersForAthro(athroId, folderType);
      setFolders(folderList);
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const parentPath = currentPath || basePath;
      const folder = await FolderService.createFolder(
        newFolderName.trim(),
        parentPath,
        athroId,
        folderType
      );

      if (folder) {
        setFolders(prev => [...prev, folder]);
        setNewFolderName('');
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const handleRenameFolder = async (folderId: string) => {
    if (!editName.trim()) return;

    try {
      const success = await FolderService.renameFolder(folderId, editName.trim());
      if (success) {
        await loadFolders();
        setEditingFolder(null);
        setEditName('');
      }
    } catch (error) {
      console.error('Error renaming folder:', error);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? Items inside will be moved to the parent folder.')) {
      return;
    }

    try {
      const success = await FolderService.deleteFolder(folderId, basePath);
      if (success) {
        await loadFolders();
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  const handleFolderClick = (folder: Folder) => {
    onPathChange?.(folder.fullPath);
    onFolderSelect?.(folder);
  };

  const handleBackToRoot = () => {
    onPathChange?.(basePath);
    onFolderSelect?.(null);
  };

  const getCurrentFolders = () => {
    const current = currentPath || basePath;
    return folders.filter(folder => folder.parentPath === current);
  };

  const getBreadcrumbs = () => {
    if (!currentPath || currentPath === basePath) {
      return [{ name: folderType === 'resources' ? 'Resources' : 'Study Tools', path: basePath }];
    }

    const parts = currentPath.replace(basePath, '').split('/').filter(Boolean);
    const breadcrumbs = [{ name: folderType === 'resources' ? 'Resources' : 'Study Tools', path: basePath }];
    
    let currentBreadcrumbPath = basePath;
    for (const part of parts) {
      currentBreadcrumbPath += `/${part}`;
      breadcrumbs.push({ name: part, path: currentBreadcrumbPath });
    }

    return breadcrumbs;
  };

  return (
    <div className="folder-manager">
      {/* Breadcrumb Navigation */}
      <div className="breadcrumbs">
        {getBreadcrumbs().map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            <button
              className={`breadcrumb ${index === getBreadcrumbs().length - 1 ? 'active' : ''}`}
              onClick={() => onPathChange?.(crumb.path)}
            >
              {crumb.name}
            </button>
            {index < getBreadcrumbs().length - 1 && (
              <FaArrowRight className="breadcrumb-separator" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Folder List */}
      <div className="folder-list">
        {loading ? (
          <div className="loading">Loading folders...</div>
        ) : (
          <>
            {getCurrentFolders().map(folder => (
              <div key={folder.id} className="folder-item">
                <div className="folder-content" onClick={() => handleFolderClick(folder)}>
                  <FaFolder className="folder-icon" />
                  {editingFolder === folder.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleRenameFolder(folder.id)}
                      onKeyPress={(e) => e.key === 'Enter' && handleRenameFolder(folder.id)}
                      autoFocus
                      className="edit-input"
                    />
                  ) : (
                    <span className="folder-name">{folder.name}</span>
                  )}
                </div>
                <div className="folder-actions">
                  <button
                    className="action-btn edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolder(folder.id);
                      setEditName(folder.name);
                    }}
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folder.id);
                    }}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}

            {/* Create New Folder */}
            <div className="create-folder">
              {isCreating ? (
                <div className="create-form">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="topic"
                    onBlur={() => {
                      if (!newFolderName.trim()) setIsCreating(false);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleCreateFolder();
                      if (e.key === 'Escape') setIsCreating(false);
                    }}
                    autoFocus
                    className="new-folder-input"
                  />
                  <button onClick={handleCreateFolder} className="create-btn">
                    Create
                  </button>
                </div>
              ) : (
                <button
                  className="add-folder-btn"
                  onClick={() => setIsCreating(true)}
                >
                  <FaPlus /> New Folder
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FolderManager; 