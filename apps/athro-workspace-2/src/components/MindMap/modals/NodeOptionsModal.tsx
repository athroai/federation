import React, { useState, useRef } from 'react';
import { Node } from 'reactflow';
import Modal from '../../common/Modal';

interface NodeOptionsModalProps {
  node: Node;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete: () => void;
  onAddChild: () => void;
}

const NodeOptionsModal: React.FC<NodeOptionsModalProps> = ({
  node,
  onClose,
  onSave,
  onDelete,
  onAddChild
}) => {
  // Form state
  const [label, setLabel] = useState(node.data.label || '');
  const [color, setColor] = useState(node.data.color || '#4fc38a');
  const [notes, setNotes] = useState(node.data.notes || '');
  const [media, setMedia] = useState(node.data.media || []);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('general');
  
  // Media upload
  const [mediaType, setMediaType] = useState<'url' | 'file'>('url');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  
  // Available colors
  const colorOptions = [
    '#4fc38a', // Green
    '#e4c97e', // Gold
    '#e77373', // Red
    '#73a6e7', // Blue
    '#9973e7', // Purple
    '#e773c7', // Pink
    '#73e7e7', // Cyan
    '#e7a373', // Orange
  ];
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave({
      label,
      color,
      notes,
      media
    });
  };
  
  // Handle media addition
  const handleAddMedia = () => {
    if (mediaType === 'url') {
      // Validate URL
      if (!mediaUrl) return;
      
      // Determine media type based on URL
      let type: 'image' | 'video' | 'link' | 'file' | 'pdf';
      
      if (mediaUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
        type = 'image';
      } else if (mediaUrl.match(/\.(mp4|webm|ogv|mov)$/i)) {
        type = 'video';
      } else if (mediaUrl.match(/\.pdf$/i)) {
        type = 'pdf';
      } else if (mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be')) {
        type = 'video';
      } else {
        type = 'link';
      }
      
      const newMedia = {
        type,
        url: mediaUrl,
        title: mediaTitle || 'Media'
      };
      
      setMedia([...media, newMedia]);
      setMediaUrl('');
      setMediaTitle('');
    } else {
      // Trigger file input click
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (!event.target || typeof event.target.result !== 'string') return;
      
      // Determine file type
      let type: 'image' | 'video' | 'link' | 'file' | 'pdf';
      
      if (file.type.startsWith('image/')) {
        type = 'image';
      } else if (file.type.startsWith('video/')) {
        type = 'video';
      } else if (file.type === 'application/pdf') {
        type = 'pdf';
      } else {
        type = 'file';
      }
      
      const newMedia = {
        type,
        url: URL.createObjectURL(file),
        title: file.name,
        fileData: event.target.result,
        fileType: file.type,
        fileSize: file.size
      };
      
      setMedia([...media, newMedia]);
    };
    
    reader.readAsDataURL(file);
    
    // Reset the file input
    e.target.value = '';
  };
  
  // Handle media removal
  const handleRemoveMedia = (index: number) => {
    const updatedMedia = [...media];
    updatedMedia.splice(index, 1);
    setMedia(updatedMedia);
  };
  
  // Define a type for media items
  interface MediaItem {
    type: 'image' | 'video' | 'link' | 'file' | 'pdf';
    url: string;
    title?: string;
    fileData?: string;
    fileType?: string;
    fileSize?: number;
  }
  
  // Render media items
  const renderMediaItem = (item: MediaItem, index: number) => {
    return (
      <div 
        key={index}
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          padding: '8px',
          borderRadius: '4px',
          marginBottom: '8px'
        }}
      >
        <div style={{ marginRight: '10px', fontSize: '18px' }}>
          {item.type === 'image' ? '🖼️' : 
           item.type === 'video' ? '🎬' : 
           item.type === 'pdf' ? '📄' : 
           item.type === 'file' ? '📎' : '🔗'}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.title || 'Untitled'}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: 'rgba(255, 255, 255, 0.7)',
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis'
          }}>
            {item.url}
          </div>
        </div>
        {(item.type === 'file' || item.type === 'pdf' || item.fileData) && (
          <button
            onClick={() => setPreviewItem(item)}
            style={{
              background: 'transparent',
              border: '1px solid #4fc38a',
              color: '#4fc38a',
              cursor: 'pointer',
              fontSize: '12px',
              padding: '4px 8px',
              borderRadius: '4px',
              marginRight: '5px'
            }}
            title="Preview document"
          >
            👁️
          </button>
        )}
        <button
          onClick={() => handleRemoveMedia(index)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#e77373',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0 5px'
          }}
        >
          ×
        </button>
      </div>
    );
  };
  
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Node Options"
      maxWidth="500px"
    >
      <div style={{ color: 'white' }}>
        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          marginBottom: '15px'
        }}>
          <button
            onClick={() => setActiveTab('general')}
            style={{
              padding: '8px 15px',
              background: activeTab === 'general' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'general' ? '2px solid #4fc38a' : 'none',
              color: 'white',
              cursor: 'pointer',
              marginRight: '5px'
            }}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            style={{
              padding: '8px 15px',
              background: activeTab === 'notes' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'notes' ? '2px solid #4fc38a' : 'none',
              color: 'white',
              cursor: 'pointer',
              marginRight: '5px'
            }}
          >
            Notes
          </button>
          <button
            onClick={() => setActiveTab('media')}
            style={{
              padding: '8px 15px',
              background: activeTab === 'media' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'media' ? '2px solid #4fc38a' : 'none',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Media
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* General tab */}
          {activeTab === 'general' && (
            <div>
              <div style={{ marginBottom: '15px' }}>
                <label
                  htmlFor="node-label"
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '14px'
                  }}
                >
                  Node Label
                </label>
                <input
                  id="node-label"
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: 'white'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '10px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '14px'
                  }}
                >
                  Node Color
                </label>
                <div style={{ 
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  {colorOptions.map((c) => (
                    <div
                      key={c}
                      onClick={() => setColor(c)}
                      style={{
                        width: '30px',
                        height: '30px',
                        backgroundColor: c,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        border: color === c ? '2px solid white' : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>
              
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                gap: '10px',
                marginTop: '25px'
              }}>
                <button
                  type="button"
                  onClick={onAddChild}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: 'rgba(228, 201, 126, 0.2)',
                    border: '1px solid rgba(228, 201, 126, 0.5)',
                    borderRadius: '4px',
                    color: '#e4c97e',
                    cursor: 'pointer'
                  }}
                >
                  Add Child Node
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: 'rgba(231, 115, 115, 0.2)',
                    border: '1px solid rgba(231, 115, 115, 0.5)',
                    borderRadius: '4px',
                    color: '#e77373',
                    cursor: 'pointer'
                  }}
                >
                  Delete Node
                </button>
              </div>
            </div>
          )}
          
          {/* Notes tab */}
          {activeTab === 'notes' && (
            <div>
              <div style={{ marginBottom: '15px' }}>
                <label
                  htmlFor="node-notes"
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '14px'
                  }}
                >
                  Notes
                </label>
                <textarea
                  id="node-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    height: '200px',
                    padding: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: 'white',
                    resize: 'vertical'
                  }}
                  placeholder="Add detailed notes about this concept..."
                />
              </div>
            </div>
          )}
          
          {/* Media tab */}
          {activeTab === 'media' && (
            <div>
              {/* Toggle for URL/File */}
              <div style={{ 
                display: 'flex',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                padding: '2px',
                marginBottom: '15px'
              }}>
                <button
                  type="button"
                  onClick={() => setMediaType('url')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: mediaType === 'url' ? 'rgba(79, 195, 138, 0.3)' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType('file')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: mediaType === 'file' ? 'rgba(79, 195, 138, 0.3)' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Upload File
                </button>
              </div>
              
              {/* URL input fields */}
              {mediaType === 'url' && (
                <>
                  <div style={{ marginBottom: '10px' }}>
                    <label
                      htmlFor="media-url"
                      style={{
                        display: 'block',
                        marginBottom: '5px',
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: '14px'
                      }}
                    >
                      Media URL
                    </label>
                    <input
                      id="media-url"
                      type="text"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        color: 'white'
                      }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label
                      htmlFor="media-title"
                      style={{
                        display: 'block',
                        marginBottom: '5px',
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: '14px'
                      }}
                    >
                      Media Title (optional)
                    </label>
                    <input
                      id="media-title"
                      type="text"
                      value={mediaTitle}
                      onChange={(e) => setMediaTitle(e.target.value)}
                      placeholder="Title for your media"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        color: 'white'
                      }}
                    />
                  </div>
                </>
              )}
              
              {/* File upload */}
              {mediaType === 'file' && (
                <div style={{ marginBottom: '15px' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    accept="image/*,video/*,application/pdf,.pdf"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      padding: '20px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '2px dashed rgba(255, 255, 255, 0.3)',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>📁</div>
                    <div>Click to select file or drag & drop</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '5px' }}>
                      Supports images, videos, PDFs, and more
                    </div>
                  </button>
                </div>
              )}
              
              {/* Add media button */}
              {mediaType === 'url' && (
                <button
                  type="button"
                  onClick={handleAddMedia}
                  disabled={!mediaUrl}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: mediaUrl ? 'rgba(79, 195, 138, 0.8)' : 'rgba(79, 195, 138, 0.3)',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: mediaUrl ? 'pointer' : 'not-allowed',
                    marginBottom: '20px'
                  }}
                >
                  Add Media
                </button>
              )}
              
              {/* Media list */}
              <div>
                <h4 style={{ 
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '14px',
                  marginBottom: '10px'
                }}>
                  Attached Media ({media.length})
                </h4>
                <div style={{ 
                  maxHeight: '150px',
                  overflowY: 'auto',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '4px',
                  padding: media.length ? '8px' : '0'
                }}>
                  {media.length === 0 ? (
                    <div style={{ 
                      padding: '15px', 
                      textAlign: 'center',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontStyle: 'italic'
                    }}>
                      No media attached to this node
                    </div>
                  ) : (
                    media.map((item: MediaItem, index: number) => renderMediaItem(item, index))
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Footer */}
          <div style={{ 
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            paddingTop: '15px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 15px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 15px',
                backgroundColor: '#4fc38a',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
      
      {/* Document Preview Modal */}
      {previewItem && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewItem(null)}
          title={previewItem.type === 'link' ? 'Saved Link' : 
                 previewItem.type === 'image' ? 'Image Preview' :
                 previewItem.type === 'video' ? 'Video Preview' :
                 previewItem.type === 'pdf' ? 'PDF Document' :
                 previewItem.title || 'File Preview'}
          maxWidth="90vw"
        >
          <div style={{ color: 'white', minHeight: '60vh' }}>
            {previewItem.type === 'pdf' && previewItem.fileData && (
              <div style={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ 
                  marginBottom: '10px', 
                  fontSize: '14px', 
                  color: 'rgba(255, 255, 255, 0.7)' 
                }}>
                  PDF Document: {previewItem.title}
                </div>
                <embed
                  src={previewItem.fileData}
                  type="application/pdf"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '4px'
                  }}
                />
              </div>
            )}
            
            {previewItem.type === 'file' && previewItem.fileData && (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>📄</div>
                <h3 style={{ marginBottom: '10px' }}>{previewItem.title}</h3>
                <div style={{ marginBottom: '20px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  File Type: {previewItem.fileType}
                  {previewItem.fileSize && (
                    <span> • Size: {(previewItem.fileSize / 1024).toFixed(1)} KB</span>
                  )}
                </div>
                
                {/* Text-based files preview */}
                {previewItem.fileType?.includes('text') && (
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '15px',
                    borderRadius: '4px',
                    textAlign: 'left',
                    maxHeight: '400px',
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {/* Convert base64 to text for text files */}
                    {previewItem.fileData.startsWith('data:text/') && (
                      atob(previewItem.fileData.split(',')[1])
                    )}
                  </div>
                )}
                
                {/* Word documents */}
                {(previewItem.fileType?.includes('word') || 
                  previewItem.fileType?.includes('document') ||
                  previewItem.title?.endsWith('.docx') ||
                  previewItem.title?.endsWith('.doc')) && (
                  <div style={{
                    background: 'rgba(79, 195, 138, 0.1)',
                    padding: '20px',
                    borderRadius: '4px',
                    border: '1px solid #4fc38a'
                  }}>
                    <div style={{ marginBottom: '15px' }}>📝 Word Document</div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                      This document has been uploaded to the mind map node. Word document content can be processed when the mind map is saved and integrated with the AI system.
                    </div>
                    <div style={{ marginTop: '15px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      Note: Full text extraction will be available when this document is used as a resource in chat conversations.
                    </div>
                  </div>
                )}
                
                {/* Generic file preview */}
                {!previewItem.fileType?.includes('text') && 
                 !previewItem.fileType?.includes('word') && 
                 !previewItem.fileType?.includes('document') &&
                 !previewItem.title?.endsWith('.docx') &&
                 !previewItem.title?.endsWith('.doc') && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    padding: '20px',
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                      This file has been attached to the mind map node and will be available for reference.
                    </div>
                  </div>
                )}
                
                <div style={{ marginTop: '20px' }}>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = previewItem.fileData!;
                      link.download = previewItem.title || 'download';
                      link.click();
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#4fc38a',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Download File
                  </button>
                </div>
              </div>
            )}
            
            {previewItem.type === 'image' && (
              <div style={{ textAlign: 'center' }}>
                <img 
                  src={previewItem.fileData || previewItem.url}
                  alt={previewItem.title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain'
                  }}
                />
              </div>
            )}
            
            {previewItem.type === 'video' && (
              <div style={{ textAlign: 'center' }}>
                <video 
                  src={previewItem.fileData || previewItem.url}
                  controls
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh'
                  }}
                />
              </div>
            )}
            
            {previewItem.type === 'link' && (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔗</div>
                <h3 style={{ marginBottom: '10px' }}>{previewItem.title}</h3>
                <div style={{ marginBottom: '20px', wordBreak: 'break-all' }}>
                  <a 
                    href={previewItem.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#4fc38a' }}
                  >
                    {previewItem.url}
                  </a>
                </div>
                <button
                  onClick={() => window.open(previewItem.url, '_blank')}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#4fc38a',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Open Link
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </Modal>
  );
};

export default NodeOptionsModal;
