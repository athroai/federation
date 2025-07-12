import React, { useState } from 'react';

interface NodeDetailsModalProps {
  nodeId: string;
  parentId: string | null;
  initialData: {
    label: string;
    notes: string;
    color: string;
    media: NodeMedia[];
  };
  onSave: (data: {
    label: string;
    notes: string;
    media: NodeMedia[];
  }) => void;
  onDelete: () => void;
  onClose: () => void;
}

export interface NodeMedia {
  id: string;
  type: 'image' | 'video' | 'pdf' | 'link';
  url: string;
  title?: string;
  fileData?: string;
}

const NodeDetailsModal: React.FC<NodeDetailsModalProps> = ({
  initialData,
  onSave,
  onDelete,
  onClose,
}) => {
  const [label, setLabel] = useState(initialData.label);
  const [notes, setNotes] = useState(initialData.notes);
  const [media, setMedia] = useState<NodeMedia[]>(initialData.media);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'pdf' | 'link'>('link');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewMedia, setPreviewMedia] = useState<NodeMedia | null>(null);
  
  // Process video files efficiently to avoid storage issues
  const processMediaFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      
      // For videos, use a more lightweight approach
      if (file.type.startsWith('video/')) {
        // Create a blob URL that can be used for playback
        const blobUrl = URL.createObjectURL(file);
        console.log(`Created blob URL for video: ${blobUrl}`);
        resolve(blobUrl);
      } else {
        // For other file types, use standard FileReader
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const fileData = reader.result as string;
            resolve(fileData);
          } catch (error) {
            console.error('Error in FileReader onload:', error);
            reject(error);
          }
        };
        reader.onerror = () => {
          console.error('FileReader error:', reader.error);
          reject(reader.error);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleAddMedia = () => {
    console.log('handleAddMedia called');
    if ((mediaType === 'link' && mediaUrl) || selectedFile) {
      // Create a unique ID for the new media
      const newMediaId = Date.now().toString();
      
      // Handle file uploads
      if (selectedFile) {
        console.log(`Processing file: ${selectedFile.name}, type: ${selectedFile.type}, size: ${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB`);
        
        // Increased size limit for videos
        const maxSize = 100 * 1024 * 1024; // 100MB max
        if (selectedFile.size > maxSize) {
          alert(`File is too large. Maximum size is ${(maxSize / (1024 * 1024)).toFixed(0)}MB.`);
          return;
        }
        
        // Process the file based on its type
        processMediaFile(selectedFile)
          .then(fileData => {
            // Create the new media object
            const newMedia: NodeMedia = {
              id: newMediaId,
              type: mediaType,
              url: URL.createObjectURL(selectedFile), // For immediate preview
              title: mediaTitle || selectedFile.name || 'Untitled',
              fileData: fileData
            };
            
            console.log(`Successfully processed ${mediaType} file: ${newMedia.title}`);
            
            // Add to media list
            setMedia(prevMedia => [...prevMedia, newMedia]);
            
            // Reset form
            setMediaUrl('');
            setMediaTitle('');
            setSelectedFile(null);
          })
          .catch(error => {
            console.error('Error processing file:', error);
            alert('There was a problem processing this file. Please try a different file or format.');
          });
      } else {
        // Handle link type (no file upload)
        const newMedia: NodeMedia = {
          id: newMediaId,
          type: mediaType,
          url: mediaUrl,
          title: mediaTitle || 'Untitled Link'
        };
        
        setMedia([...media, newMedia]);
        
        // Reset form
        setMediaUrl('');
        setMediaTitle('');
      }
    }
  };
  
  const handleDeleteMedia = (id: string) => {
    setMedia(media.filter(item => item.id !== id));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  const handleSave = () => {
    // Clean media objects for saving
    const cleanedMedia = media.map(item => {
      // Create a clean copy of the media item
      const cleanItem = { ...item };
      
      // If it's a video, ensure we're using blob URLs where possible
      if (item.type === 'video' && item.fileData) {
        // If fileData starts with blob:, we keep it as is (it's a blob URL)
        if (!item.fileData.startsWith('blob:')) {
          console.log(`Video file size (string length): ${item.fileData.length}`);  
          if (item.fileData.length > 1000000) { // If larger than ~1MB
            console.log('Large video file detected, optimizing for storage');
            // Use URL for very large files
            cleanItem.fileData = item.url;
          }
        }
      }
      
      return cleanItem;
    });
    
    console.log(`Saving node with ${cleanedMedia.length} media items`);
    onSave({
      label,
      notes,
      media: cleanedMedia,
    });
  };

  const handlePreviewMedia = (mediaItem: NodeMedia) => {
    console.log('Opening preview for:', mediaItem);
    setPreviewMedia(mediaItem);
  };
  
  const handleClosePreview = () => {
    setPreviewMedia(null);
  };
  
  const renderPreview = () => {
    if (!previewMedia) return null;
    
    console.log('Rendering preview for:', previewMedia);
    
    return (
      <div 
        className="media-preview-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
        }}
        onClick={handleClosePreview}
      >
        <div 
          className="preview-content"
          style={{
            background: '#0b120e',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '95%',
            width: '95vw',
            maxHeight: '95%',
            overflow: 'auto',
            position: 'relative',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ textAlign: 'right', marginBottom: '10px' }}>
            <button 
              onClick={handleClosePreview}
              style={{
                background: 'none',
                border: 'none',
                color: '#ccc',
                fontSize: '24px',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
          
          <h3 style={{ margin: '0 0 15px 0', color: '#eee' }}>
            {previewMedia.type === 'link' ? 'Link Preview' : 
             previewMedia.type === 'image' ? 'Image Preview' : 
             previewMedia.type === 'video' ? 'Video Preview' : 
             previewMedia.type === 'pdf' ? 'PDF Document' : 
             previewMedia.title || 'File Preview'}
          </h3>
          
          {previewMedia.type === 'image' && (
            <img 
              src={previewMedia.fileData || previewMedia.url} 
              alt={previewMedia.title} 
              style={{ maxWidth: '100%', maxHeight: '70vh' }} 
            />
          )}
          
          {previewMedia.type === 'video' && (
            <video 
              key={`video-${previewMedia.id}`} // Force refresh on different videos
              src={previewMedia.url || previewMedia.fileData} 
              controls 
              autoPlay
              style={{ maxWidth: '100%', maxHeight: '70vh' }} 
              onError={(e) => {
                console.error('Video playback error:', e);
                // Try alternative source if primary fails
                const video = e.target as HTMLVideoElement;
                if (video.src === previewMedia.url && previewMedia.fileData) {
                  console.log('Trying fileData as fallback source');
                  video.src = previewMedia.fileData;
                } else if (video.src === previewMedia.fileData && previewMedia.url) {
                  console.log('Trying URL as fallback source');
                  video.src = previewMedia.url;
                }
              }}
            />
          )}
          
          {previewMedia.type === 'pdf' && (
            <embed 
              src={previewMedia.fileData || previewMedia.url} 
              type="application/pdf"
              style={{ width: '100%', height: '85vh', minHeight: '600px' }} 
            />
          )}
          
          {previewMedia.type === 'link' && (
            <div>
              <a 
                href={previewMedia.url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#4a9e5c' }}
              >
                {previewMedia.url}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="node-details-modal" onClick={onClose}>
      {renderPreview()}
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#0b120e',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '85vh',
          overflow: 'auto',
          color: '#eee',
          position: 'relative',
          border: '1px solid #2c453a',
        }}
      >
        {/* Modal Title */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: initialData.color }}>Node Details</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#aaa',
              fontSize: '24px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        
        {/* Form fields */}
        <div className="form-group" style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Label:</label>
          <input 
            type="text" 
            value={label} 
            onChange={e => setLabel(e.target.value)} 
            style={{ 
              width: '100%',
              padding: '8px',
              background: '#1a2e24',
              border: '1px solid #4fc38a',
              borderRadius: '4px',
              color: 'white',
            }}
          />
        </div>
        
        <div className="form-group" style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Notes:</label>
          <textarea 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            rows={4}
            style={{ 
              width: '100%',
              padding: '8px',
              background: '#1a2e24',
              border: '1px solid #4fc38a',
              borderRadius: '4px',
              color: 'white',
            }}
          />
        </div>
        
        <div className="media-section" style={{ marginBottom: '15px' }}>
          <h4 style={{ color: initialData.color, marginTop: '0' }}>Media</h4>
          
          {media.length > 0 && (
            <div 
              className="media-gallery"
              style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '10px',
                marginTop: '15px',
                marginBottom: '15px'
              }}
            >
              {media.map(item => (
                <div
                  key={item.id}
                  className="media-item"
                  style={{ 
                    position: 'relative',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    cursor: 'pointer'
                  }}
                  onClick={() => handlePreviewMedia(item)}
                >
                  {item.type === 'image' && (
                    <img 
                      src={item.fileData || item.url} 
                      alt={item.title} 
                      style={{ width: '100%', height: '80px', objectFit: 'cover' }} 
                    />
                  )}
                  
                  {item.type === 'video' && (
                    <div style={{ height: '80px', position: 'relative' }}>
                      <div style={{
                        height: '80px',
                        background: '#111',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{ fontSize: '24px', color: '#aaa' }}>🎬</div>
                      </div>
                      <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{ fontSize: '20px', color: 'white' }}>▶️</div>
                      </div>
                    </div>
                  )}
                  
                  {item.type === 'pdf' && (
                    <div style={{ 
                      height: '80px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: '#1a2e24'
                    }}>
                      <div style={{ fontSize: '24px', color: '#aaa' }}>📄</div>
                    </div>
                  )}
                  
                  {item.type === 'link' && (
                    <div style={{ 
                      height: '80px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: '#1a2e24'
                    }}>
                      <div style={{ fontSize: '24px', color: '#aaa' }}>🔗</div>
                    </div>
                  )}
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMedia(item.id);
                    }}
                    style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      background: 'rgba(209, 102, 102, 0.8)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 5
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="add-media" style={{ marginBottom: '15px' }}>
            <select 
              value={mediaType} 
              onChange={e => setMediaType(e.target.value as any)}
              style={{ 
                padding: '8px', 
                background: '#1a2e24',
                border: '1px solid #4fc38a',
                borderRadius: '4px',
                color: 'white',
                marginRight: '10px',
              }}
            >
              <option value="link">Link</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
            </select>
            
            {mediaType === 'link' ? (
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  placeholder="URL"
                  value={mediaUrl}
                  onChange={e => setMediaUrl(e.target.value)}
                  style={{ 
                    padding: '8px',
                    background: '#1a2e24',
                    border: '1px solid #4fc38a',
                    borderRadius: '4px',
                    color: 'white',
                    flex: '1',
                  }}
                />
                <input 
                  type="text" 
                  placeholder="Title (optional)"
                  value={mediaTitle}
                  onChange={e => setMediaTitle(e.target.value)}
                  style={{ 
                    padding: '8px',
                    background: '#1a2e24',
                    border: '1px solid #4fc38a',
                    borderRadius: '4px',
                    color: 'white',
                    flex: '1',
                  }}
                />
                <button 
                  onClick={handleAddMedia}
                  style={{
                    padding: '8px 16px',
                    background: '#4fc38a',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Add
                </button>
              </div>
            ) : (
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input 
                  type="file" 
                  accept={mediaType === 'image' ? 'image/*' : mediaType === 'video' ? 'video/*' : mediaType === 'pdf' ? 'application/pdf' : ''}
                  onChange={handleFileChange}
                  style={{ 
                    padding: '8px',
                    background: '#1a2e24',
                    border: '1px solid #4fc38a',
                    borderRadius: '4px',
                    color: 'white',
                    flex: '1',
                  }}
                />
                <input 
                  type="text" 
                  placeholder="Title (optional)"
                  value={mediaTitle}
                  onChange={e => setMediaTitle(e.target.value)}
                  style={{ 
                    padding: '8px',
                    background: '#1a2e24',
                    border: '1px solid #4fc38a',
                    borderRadius: '4px',
                    color: 'white',
                    flex: '1',
                  }}
                />
                <button 
                  onClick={handleAddMedia}
                  style={{
                    padding: '8px 16px',
                    background: '#4fc38a',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <button 
            onClick={onDelete}
            style={{
              padding: '8px 16px',
              background: '#d16666',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Delete Node
          </button>
          <div>
            <button 
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #4fc38a',
                borderRadius: '4px',
                color: '#4fc38a',
                cursor: 'pointer',
                marginRight: '10px',
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                background: '#4fc38a',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeDetailsModal;
