import React, { useState, useRef } from 'react';
import { MediaContent, NodeData, NodeUpdateOptions } from './types';
import { NODE_COLORS } from './constants';
import { Node } from 'reactflow';

interface NodeOptionsModalProps {
  nodeId: string;
  node?: Node<NodeData>;
  onClose: () => void;
  onUpdate: (updates: NodeUpdateOptions) => void;
  onDelete: () => void;
}

const NodeOptionsModal: React.FC<NodeOptionsModalProps> = ({
  node,
  isRoot,
  onClose,
  onUpdate,
  onAddChild,
  onAddConnectionPoint,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'media' | 'notes'>('general');
  const [nodeLabel, setNodeLabel] = useState(node.label);
  const [nodeColor, setNodeColor] = useState(node.color);
  const [notes, setNotes] = useState(node.notes || '');
  const [mediaUrl, setMediaUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    onUpdate({
      label: nodeLabel,
      color: nodeColor,
      notes: notes
    });
    onClose();
  };

  const handleAddMedia = (type: 'image' | 'video' | 'url') => {
    if (type === 'image' && fileInputRef.current) {
      fileInputRef.current.click();
    } else if (type === 'video' && videoInputRef.current) {
      videoInputRef.current.click();
    } else if (type === 'url' && mediaUrl) {
      const newMedia: MediaContent = {
        id: `media-${Date.now()}`,
        type: mediaUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? 'image' : 'video',
        url: mediaUrl,
        content: 'External media'
      };
      onUpdate({
        media: [...(node.media || []), newMedia]
      });
      setMediaUrl('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const newMedia: MediaContent = {
        id: `media-${Date.now()}`,
        type,
        url: reader.result as string,
        content: file.name
      };
      onUpdate({
        media: [...(node.media || []), newMedia]
      });
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleRemoveMedia = (mediaId: string) => {
    if (!node.media) return;
    const updatedMedia = node.media.filter(item => item.id !== mediaId);
    onUpdate({ media: updatedMedia });
  };

  const captureFromCamera = async (type: 'image' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: type === 'video'
      });
      
      // This would normally create a video element and let the user capture
      // For simplicity here, we're just showing how we'd handle the result
      
      // Cleanup example (would happen after capture)
      stream.getTracks().forEach(track => track.stop());
      
      // Example adding captured content
      const newMedia: MediaContent = {
        id: `media-${Date.now()}`,
        type,
        url: 'data:image/jpeg;base64,...', // Would be the actual data
        content: `Captured ${type}`
      };
      
      onUpdate({
        media: [...(node.media || []), newMedia]
      });
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="node-options-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Node Options</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab-button ${activeTab === 'general' ? 'active' : ''}`} 
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button 
            className={`tab-button ${activeTab === 'media' ? 'active' : ''}`} 
            onClick={() => setActiveTab('media')}
          >
            Media
          </button>
          <button 
            className={`tab-button ${activeTab === 'notes' ? 'active' : ''}`} 
            onClick={() => setActiveTab('notes')}
          >
            Notes
          </button>
        </div>

        <div className="modal-content">
          {activeTab === 'general' && (
            <div className="tab-content">
              <div className="form-group">
                <label htmlFor="node-label">Label</label>
                <input
                  id="node-label"
                  type="text"
                  value={nodeLabel}
                  onChange={e => setNodeLabel(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Color</label>
                <div className="color-options">
                  {NODE_COLORS.map(color => (
                    <div
                      key={color}
                      className={`color-option ${color === nodeColor ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNodeColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className="actions-group">
                <button className="action-button primary" onClick={onAddChild}>
                  Add Child Node
                </button>
                <button className="action-button" onClick={onAddConnectionPoint}>
                  Add Connection Point
                </button>
                {!isRoot && (
                  <button className="action-button danger" onClick={onDelete}>
                    Delete Node
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="tab-content">
              <div className="media-add-options">
                <button onClick={() => handleAddMedia('image')}>
                  Upload Image
                </button>
                <button onClick={() => handleAddMedia('video')}>
                  Upload Video
                </button>
                <button onClick={() => captureFromCamera('image')}>
                  Take Photo
                </button>
                <button onClick={() => captureFromCamera('video')}>
                  Record Video
                </button>
                <div className="url-input-group">
                  <input
                    type="text"
                    placeholder="Enter media URL"
                    value={mediaUrl}
                    onChange={e => setMediaUrl(e.target.value)}
                  />
                  <button onClick={() => handleAddMedia('url')}>Add</button>
                </div>
              </div>

              <div className="media-gallery">
                {node.media?.map(media => (
                  <div key={media.id} className="media-item">
                    {media.type === 'image' && (
                      <img src={media.url} alt={media.content || 'Image'} />
                    )}
                    {media.type === 'video' && (
                      <div className="video-thumbnail">
                        {media.thumbnail ? (
                          <img src={media.thumbnail} alt="Video thumbnail" />
                        ) : (
                          <div className="video-placeholder">Video</div>
                        )}
                      </div>
                    )}
                    {media.type === 'url' && (
                      <div className="url-preview">
                        <span>{media.url}</span>
                      </div>
                    )}
                    <button 
                      className="remove-media" 
                      onClick={() => handleRemoveMedia(media.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {(!node.media || node.media.length === 0) && (
                  <div className="no-media">No media added yet</div>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={e => handleFileChange(e, 'image')}
              />
              <input
                type="file"
                ref={videoInputRef}
                style={{ display: 'none' }}
                accept="video/*"
                onChange={e => handleFileChange(e, 'video')}
              />
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="tab-content">
              <textarea
                className="notes-textarea"
                placeholder="Add notes about this node..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="save-button" onClick={handleSubmit}>
            Save Changes
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .node-options-modal {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #eee;
        }
        
        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
        }
        
        .modal-tabs {
          display: flex;
          border-bottom: 1px solid #eee;
        }
        
        .tab-button {
          flex: 1;
          padding: 12px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-weight: 500;
          color: #666;
          transition: all 0.2s;
        }
        
        .tab-button.active {
          color: #4285f4;
          border-bottom-color: #4285f4;
        }
        
        .modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        
        .tab-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .form-group label {
          font-weight: 500;
          color: #555;
        }
        
        .form-group input {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .color-options {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .color-option {
          width: 30px;
          height: 30px;
          border-radius: 4px;
          cursor: pointer;
          border: 2px solid transparent;
        }
        
        .color-option.selected {
          border-color: #333;
          transform: scale(1.1);
        }
        
        .actions-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 10px;
        }
        
        .action-button {
          padding: 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          background-color: #f1f1f1;
          color: #333;
        }
        
        .action-button.primary {
          background-color: #4285f4;
          color: white;
        }
        
        .action-button.danger {
          background-color: #f44336;
          color: white;
        }
        
        .media-add-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .media-add-options button {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background-color: #f9f9f9;
          cursor: pointer;
        }
        
        .url-input-group {
          grid-column: span 2;
          display: flex;
          gap: 8px;
        }
        
        .url-input-group input {
          flex: 1;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .url-input-group button {
          padding: 10px 15px;
        }
        
        .media-gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 10px;
          max-height: 200px;
          overflow-y: auto;
          padding: 10px;
          background-color: #f9f9f9;
          border-radius: 4px;
        }
        
        .media-item {
          position: relative;
          height: 100px;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
          background-color: white;
        }
        
        .media-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .video-thumbnail, .url-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          background-color: #eee;
          color: #666;
          font-size: 12px;
          text-align: center;
          padding: 5px;
        }
        
        .no-media {
          grid-column: span 3;
          text-align: center;
          padding: 30px;
          color: #999;
        }
        
        .remove-media {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: rgba(0, 0, 0, 0.5);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          cursor: pointer;
        }
        
        .notes-textarea {
          width: 100%;
          min-height: 200px;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          resize: vertical;
          font-family: inherit;
          font-size: 14px;
        }
        
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 20px;
          border-top: 1px solid #eee;
        }
        
        .cancel-button, .save-button {
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }
        
        .cancel-button {
          background-color: transparent;
          border: 1px solid #ddd;
          color: #666;
        }
        
        .save-button {
          background-color: #4285f4;
          border: none;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default NodeOptionsModal;
