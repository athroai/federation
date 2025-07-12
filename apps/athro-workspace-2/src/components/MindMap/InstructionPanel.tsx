import React from 'react';

interface InstructionPanelProps {
  onClose: () => void;
}

const InstructionPanel: React.FC<InstructionPanelProps> = ({ onClose }) => {
  return (
    <div
      style={{
        backgroundColor: 'rgba(11, 18, 14, 0.9)',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
        maxWidth: '350px',
        color: 'white',
        fontSize: '14px'
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '10px',
        alignItems: 'center'
      }}>
        <h3 style={{ 
          margin: 0, 
          color: '#e4c97e',
          fontSize: '16px'
        }}>
          Mind Map Instructions
        </h3>
        <button 
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            fontSize: '18px'
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ 
          margin: '10px 0 5px 0',
          color: '#4fc38a',
          fontSize: '14px'
        }}>
          Creating Nodes
        </h4>
        <ul style={{ 
          margin: 0,
          paddingLeft: '20px',
          color: 'rgba(255, 255, 255, 0.8)'
        }}>
          <li><strong>Double-click</strong> on empty space to create a new node</li>
          <li><strong>Single-click</strong> on node text to edit directly</li>
          <li><strong>Double-click</strong> on a node to open options</li>
        </ul>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ 
          margin: '10px 0 5px 0',
          color: '#4fc38a',
          fontSize: '14px'
        }}>
          Creating Connections
        </h4>
        <ul style={{ 
          margin: 0,
          paddingLeft: '20px',
          color: 'rgba(255, 255, 255, 0.8)'
        }}>
          <li><strong>Drag</strong> from a connection handle to another node</li>
          <li><strong>Click</strong> on a connection to edit or delete it</li>
          <li>Use the <strong>Add Child</strong> option in node settings</li>
        </ul>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ 
          margin: '10px 0 5px 0',
          color: '#4fc38a',
          fontSize: '14px'
        }}>
          Navigation
        </h4>
        <ul style={{ 
          margin: 0,
          paddingLeft: '20px',
          color: 'rgba(255, 255, 255, 0.8)'
        }}>
          <li><strong>Pan</strong>: Drag the empty canvas</li>
          <li><strong>Zoom</strong>: Use mouse wheel or controls panel</li>
          <li><strong>Mini-map</strong>: Use the lower-right panel for overview</li>
        </ul>
      </div>

      <div style={{ 
        padding: '10px',
        backgroundColor: 'rgba(228, 201, 126, 0.1)',
        borderRadius: '4px',
        marginTop: '15px',
        color: 'rgba(228, 201, 126, 0.9)',
        display: 'flex',
        alignItems: 'center'
      }}>
        <span style={{ 
          marginRight: '10px',
          fontSize: '18px'
        }}>
          💡
        </span>
        <span>
          Remember to organize related ideas with the same color for better visual connections!
        </span>
      </div>
    </div>
  );
};

export default InstructionPanel;
