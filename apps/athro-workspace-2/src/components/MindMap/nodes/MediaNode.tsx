import React, { useState, useEffect, memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';

const MediaNode: React.FC<NodeProps> = ({ 
  data, 
  id: nodeId, // Rename to nodeId to make it clear we're using it and avoid unused warning
  selected, 
  isConnectable 
}) => {
  const [label, setLabel] = useState(data.label);
  const [isEditing, setIsEditing] = useState(false);
  
  // Media related state
  const media = data.media?.[0] || null;
  
  // Update local state when node data changes externally
  useEffect(() => {
    setLabel(data.label);
  }, [data.label]);
  
  // Handle focus and blur for inline text editing
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };
  
  const handleBlur = () => {
    setIsEditing(false);
    if (data.label !== label) {
      data.label = label;
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(false);
      if (data.label !== label) {
        data.label = label;
      }
    }
  };
  
  // Determine if the node has notes
  const hasNotes = data.notes && data.notes.length > 0;
  
  // Render the appropriate media content
  const renderMedia = () => {
    if (!media) return null;
    
    switch (media.type) {
      case 'image':
        return (
          <img 
            src={media.url} 
            alt={media.title || 'Image'} 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '120px',
              objectFit: 'contain',
              borderRadius: '2px',
              marginBottom: '5px'
            }} 
          />
        );
      case 'video':
        if (media.url.includes('youtube.com') || media.url.includes('youtu.be')) {
          // Parse YouTube URL to get video ID
          const getYouTubeID = (url: string) => {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
            const match = url.match(regExp);
            return (match && match[2].length === 11) ? match[2] : null;
          };
          
          const videoId = getYouTubeID(media.url);
          if (videoId) {
            return (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title={media.title || 'YouTube Video'}
                width="100%"
                height="120"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ borderRadius: '2px', marginBottom: '5px' }}
              />
            );
          }
        }
        return (
          <video 
            src={media.url} 
            controls
            style={{ 
              maxWidth: '100%', 
              maxHeight: '120px',
              borderRadius: '2px',
              marginBottom: '5px'
            }} 
          />
        );
      case 'pdf':
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            borderRadius: '2px',
            marginBottom: '5px'
          }}>
            <span style={{ marginRight: '5px' }}>📄</span>
            <a 
              href={media.url} 
              target="_blank" 
              rel="noreferrer"
              style={{ color: 'white', textDecoration: 'underline', fontSize: '12px' }}
            >
              {media.title || 'View PDF'}
            </a>
          </div>
        );
      case 'file':
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            borderRadius: '2px',
            marginBottom: '5px'
          }}>
            <span style={{ marginRight: '5px' }}>📎</span>
            <a 
              href={media.url} 
              target="_blank" 
              rel="noreferrer"
              style={{ color: 'white', textDecoration: 'underline', fontSize: '12px' }}
            >
              {media.title || 'Download File'}
            </a>
          </div>
        );
      case 'link':
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            borderRadius: '2px',
            marginBottom: '5px'
          }}>
            <span style={{ marginRight: '5px' }}>🔗</span>
            <a 
              href={media.url} 
              target="_blank" 
              rel="noreferrer"
              style={{ color: 'white', textDecoration: 'underline', fontSize: '12px' }}
            >
              {media.title || 'Open Link'}
            </a>
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className={`media-node ${selected ? 'selected' : ''}`}>
      <NodeResizer 
        minWidth={150}
        minHeight={120}
        isVisible={selected}
        color={data.color || '#4fc38a'}
        handleStyle={{ width: 8, height: 8 }}
        lineStyle={{ borderWidth: 1 }}
      />
      
      {/* Connection handles on each side */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={{ 
          background: data.color || '#4fc38a',
          width: 8,
          height: 8
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{ 
          background: data.color || '#4fc38a',
          width: 8,
          height: 8 
        }}
      />
      <Handle
        type="source"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ 
          background: data.color || '#4fc38a',
          width: 8,
          height: 8 
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ 
          background: data.color || '#4fc38a',
          width: 8,
          height: 8 
        }}
      />
      
      <div
        className="media-node-content"
        style={{
          padding: '10px',
          backgroundColor: data.color || '#4fc38a',
          color: '#fff',
          borderRadius: '4px',
          minWidth: '150px',
          minHeight: '120px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          border: selected ? '2px solid white' : 'none',
          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
          cursor: 'grab'
        }}
      >
        {renderMedia()}
        
        {isEditing ? (
          <input
            autoFocus
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '3px',
              color: 'white',
              textAlign: 'center',
              width: '90%',
              padding: '5px',
              fontSize: '14px'
            }}
          />
        ) : (
          <div 
            className="media-node-label"
            onClick={(e) => {
              // If it's a single click, prepare for inline editing
              if (e.detail === 1) {
                e.stopPropagation();
              }
            }}
            onDoubleClick={handleDoubleClick}
            style={{
              textAlign: 'center',
              wordBreak: 'break-word',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            {label}
          </div>
        )}
        
        {/* Indicator that node has notes */}
        {hasNotes && (
          <div style={{ 
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            width: '10px',
            height: '10px',
            backgroundColor: '#e4c97e',
            borderRadius: '50%',
            border: '1px solid white'
          }} />
        )}
      </div>
    </div>
  );
};

export default memo(MediaNode);
