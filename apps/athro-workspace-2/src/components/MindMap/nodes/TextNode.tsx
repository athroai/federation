import React, { useState, useEffect, memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';

const TextNode: React.FC<NodeProps> = ({ 
  data, 
  id, 
  selected, 
  isConnectable 
}) => {
  const [label, setLabel] = useState(data.label);
  const [isEditing, setIsEditing] = useState(false);
  
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
  
  // Determine if the node has notes or media
  const hasNotes = data.notes && data.notes.length > 0;
  
  return (
    <div className={`text-node ${selected ? 'selected' : ''}`}>
      <NodeResizer 
        minWidth={100}
        minHeight={50}
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
        className="text-node-content"
        style={{
          padding: '10px',
          backgroundColor: data.color || '#4fc38a',
          color: '#fff',
          borderRadius: '4px',
          minWidth: '100px',
          minHeight: '50px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          border: selected ? '2px solid white' : 'none',
          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
          cursor: 'grab'
        }}
      >
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
            className="text-node-label"
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

export default memo(TextNode);
