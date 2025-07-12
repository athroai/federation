import React, { useState } from 'react';
import { Edge } from 'reactflow';
import Modal from '../../common/Modal';

interface ConnectionOptionsModalProps {
  edge: Edge;
  onClose: () => void;
  onSave: (style: any) => void;
  onDelete: () => void;
}

const ConnectionOptionsModal: React.FC<ConnectionOptionsModalProps> = ({
  edge,
  onClose,
  onSave,
  onDelete
}) => {
  // Form state
  const [lineColor, setLineColor] = useState(
    edge.style?.stroke || '#4fc38a'
  );
  const [lineStyle, setLineStyle] = useState(
    edge.style?.strokeDasharray ? 'dashed' : 'solid'
  );
  const [animated, setAnimated] = useState(edge.animated || false);
  
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
      animated,
      style: {
        stroke: lineColor,
        strokeDasharray: lineStyle === 'dashed' ? '5,5' : undefined,
      }
    });
  };
  
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Connection Options"
      maxWidth="400px"
    >
      <div style={{ color: 'white' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '10px',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px'
              }}
            >
              Connection Color
            </label>
            <div style={{ 
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              {colorOptions.map((c) => (
                <div
                  key={c}
                  onClick={() => setLineColor(c)}
                  style={{
                    width: '30px',
                    height: '30px',
                    backgroundColor: c,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: lineColor === c ? '2px solid white' : 'none'
                  }}
                />
              ))}
            </div>
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
              Line Style
            </label>
            <div style={{ 
              display: 'flex',
              gap: '10px'
            }}>
              <button
                type="button"
                onClick={() => setLineStyle('solid')}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: lineStyle === 'solid' ? 'rgba(79, 195, 138, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                  border: lineStyle === 'solid' ? '1px solid #4fc38a' : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Solid
              </button>
              <button
                type="button"
                onClick={() => setLineStyle('dashed')}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: lineStyle === 'dashed' ? 'rgba(79, 195, 138, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                  border: lineStyle === 'dashed' ? '1px solid #4fc38a' : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Dashed
              </button>
            </div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer' 
            }}>
              <input
                type="checkbox"
                checked={animated}
                onChange={(e) => setAnimated(e.target.checked)}
                style={{ marginRight: '10px' }}
              />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Animated Connection
              </span>
            </label>
          </div>
          
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '25px'
          }}>
            <button
              type="button"
              onClick={onDelete}
              style={{
                padding: '8px 15px',
                backgroundColor: 'rgba(231, 115, 115, 0.2)',
                border: '1px solid rgba(231, 115, 115, 0.5)',
                borderRadius: '4px',
                color: '#e77373',
                cursor: 'pointer'
              }}
            >
              Delete Connection
            </button>
            
            <div>
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
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ConnectionOptionsModal;
