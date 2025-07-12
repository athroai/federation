import React, { useState } from 'react';

// Types for the mind map node data
export interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  color?: string;
  notes?: string;
  media?: {
    type: 'image' | 'video' | 'link';
    url: string;
    title?: string;
  }[];
  connections: string[];
}

// Props for the node details modal
interface NodeDetailsModalProps {
  details: {
    id: string;
    text: string;
    color: string;
    notes: string;
    media: {
      type: 'image' | 'video' | 'link';
      url: string;
      title?: string;
    }[];
  };
  onUpdate: (details: {
    id: string;
    text: string;
    color: string;
    notes: string;
    media: {
      type: 'image' | 'video' | 'link';
      url: string;
      title?: string;
    }[];
  }) => void;
  onCancel: () => void;
}

// Node details modal component
export const NodeDetailsModal: React.FC<NodeDetailsModalProps> = ({ details, onUpdate, onCancel }) => {
  const [text, setText] = useState(details.text);
  const [color, setColor] = useState(details.color);
  const [notes, setNotes] = useState(details.notes);
  const [media, setMedia] = useState([...details.media]);

  // Add new media to the node
  const handleAddMedia = () => {
    const url = prompt('Enter media URL:');
    if (!url) return;
    
    const type = url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) 
      ? 'image' 
      : url.match(/\.(mp4|webm|ogg|mov)$/i) 
        ? 'video' 
        : 'link';
    
    const title = prompt('Enter title (optional):') || '';
    
    setMedia([...media, { type, url, title }]);
  };

  // Remove media from the node
  const handleRemoveMedia = (index: number) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  // Handle update button click
  const handleUpdate = () => {
    onUpdate({
      id: details.id,
      text,
      color,
      notes,
      media
    });
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#17221c',
        padding: '20px',
        borderRadius: '8px',
        zIndex: 100,
        width: '300px',
        maxHeight: '80%',
        overflowY: 'auto',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.5)'
      }}
    >
      <h3 style={{ color: '#e4c97e', marginTop: 0 }}>Node Details</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '12px' }}>Text:</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ 
            padding: '8px', 
            width: '100%', 
            backgroundColor: '#0b120e',
            color: 'white',
            border: '1px solid #333',
            borderRadius: '4px'
          }}
        />
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '12px' }}>Color:</label>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ 
              width: '40px', 
              height: '40px', 
              border: 'none',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              marginRight: '10px'
            }}
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ 
              padding: '8px', 
              flex: 1,
              backgroundColor: '#0b120e',
              color: 'white',
              border: '1px solid #333',
              borderRadius: '4px'
            }}
          />
        </div>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '12px' }}>Notes:</label>
        <textarea 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ 
            padding: '8px', 
            width: '100%', 
            height: '100px',
            backgroundColor: '#0b120e',
            color: 'white',
            border: '1px solid #333',
            borderRadius: '4px',
            resize: 'vertical'
          }}
        />
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <label style={{ color: '#ccc', fontSize: '12px' }}>Media:</label>
          <button 
            onClick={handleAddMedia}
            style={{ 
              padding: '2px 5px',
              backgroundColor: '#4fc38a',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            + Add Media
          </button>
        </div>
        
        {media.length > 0 ? (
          <div style={{ 
            backgroundColor: '#0b120e', 
            border: '1px solid #333',
            borderRadius: '4px',
            padding: '8px'
          }}>
            {media.map((item, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                alignItems: 'center',
                marginBottom: index < media.length - 1 ? '8px' : 0,
                padding: '5px',
                backgroundColor: '#0f1812',
                borderRadius: '4px'
              }}>
                <div style={{ marginRight: '8px' }}>
                  {item.type === 'image' ? '🖼️' : item.type === 'video' ? '🎬' : '🔗'}
                </div>
                <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <div style={{ fontSize: '12px', color: 'white' }}>{item.title || 'Untitled'}</div>
                  <div style={{ fontSize: '10px', color: '#aaa', textOverflow: 'ellipsis', overflow: 'hidden' }}>{item.url}</div>
                </div>
                <button 
                  onClick={() => handleRemoveMedia(index)}
                  style={{ 
                    padding: '2px 5px',
                    backgroundColor: '#e77373',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '10px'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            padding: '8px', 
            backgroundColor: '#0b120e',
            color: '#aaa',
            border: '1px solid #333',
            borderRadius: '4px',
            fontSize: '12px',
            textAlign: 'center'
          }}>
            No media attached
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={onCancel}
          style={{ 
            padding: '5px 10px',
            backgroundColor: '#e77373',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Cancel
        </button>
        <button 
          onClick={handleUpdate}
          style={{ 
            padding: '5px 10px',
            backgroundColor: '#4fc38a',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Update
        </button>
      </div>
    </div>
  );
};
