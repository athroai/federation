import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData, MediaContent } from './types';
import NodeOptionsModal from './NodeOptionsModal';

const MindMapNodeComponent = ({ id, data, selected }: NodeProps<NodeData>) => {
  const [showModal, setShowModal] = useState(false);
  
  // Get media preview if available
  const primaryMedia = data.media && data.media.length > 0 ? data.media[0] : null;
  
  // Calculate connection points on the edges of the node
  const calculateEdgePoints = () => {
    if (!data.connectionPoints) return [];
    
    return data.connectionPoints.map((point, index) => {
      // Calculate position based on node dimensions (assume 180px width, 60px height for calculation)
      // This creates points along the perimeter
      let x = 0;
      let y = 0;
      
      // Position around the perimeter based on index
      const perimeter = 2 * (180 + 60); // Total perimeter length
      const pointPosition = (index / (data.connectionPoints?.length || 1)) * perimeter;
      
      if (pointPosition < 180) { // Top edge
        x = pointPosition;
        y = 0;
        return {
          ...point,
          position: Position.Top,
          style: { left: `${x}px`, top: '0px', transform: 'translate(-50%, -50%)' }
        };
      } else if (pointPosition < 180 + 60) { // Right edge
        x = 180;
        y = pointPosition - 180;
        return {
          ...point,
          position: Position.Right,
          style: { left: '100%', top: `${y}px`, transform: 'translate(-50%, -50%)' }
        };
      } else if (pointPosition < 2 * 180 + 60) { // Bottom edge
        x = 180 - (pointPosition - 180 - 60);
        y = 60;
        return {
          ...point,
          position: Position.Bottom,
          style: { left: `${x}px`, top: '100%', transform: 'translate(-50%, -50%)' }
        };
      } else { // Left edge
        x = 0;
        y = 60 - (pointPosition - 2 * 180 - 60);
        return {
          ...point,
          position: Position.Left,
          style: { left: '0px', top: `${y}px`, transform: 'translate(-50%, -50%)' }
        };
      }
    });
  };
  
  const edgePoints = calculateEdgePoints();
  
  // Handle node double click to show modal
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(true);
  };
  
  // Handle node update from modal
  const handleNodeUpdate = (updates: any) => {
    if (updates.label && data.onNodeLabelChange) {
      data.onNodeLabelChange(id as string, updates.label);
    }
    
    if (updates.color && data.onColorChange) {
      data.onColorChange(id as string, updates.color);
    }
    
    if (updates.media && data.onMediaUpdate) {
      data.onMediaUpdate(id as string, updates.media);
    }
    
    if (updates.notes !== undefined && data.onNotesChange) {
      data.onNotesChange(id as string, updates.notes);
    }
  };
  
  return (
    <>
      <div
        style={{
          padding: '10px',
          borderRadius: '5px',
          backgroundColor: data.color || '#e4c97e',
          color: '#17221c',
          border: selected ? '2px solid #555' : '1px solid transparent',
          width: '180px',
          minHeight: '60px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: data.isRoot ? 'bold' : 'normal',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px'
        }}
        onDoubleClick={handleDoubleClick}
      >
        <div style={{ 
          width: '100%', 
          wordBreak: 'break-word',
          fontWeight: data.isRoot ? 'bold' : 'normal'
        }}>
          {data.label}
        </div>
        
        {/* Media preview if available */}
        {primaryMedia && (
          <div style={{ 
            width: '100%', 
            height: '60px', 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '4px',
            marginTop: '5px'
          }}>
            {primaryMedia.type === 'image' && primaryMedia.url && (
              <img 
                src={primaryMedia.url} 
                alt={primaryMedia.content || 'Image'} 
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            )}
            
            {primaryMedia.type === 'video' && (
              <div style={{ 
                width: '100%', 
                height: '100%', 
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#eee'
              }}>
                {primaryMedia.thumbnail ? (
                  <img 
                    src={primaryMedia.thumbnail} 
                    alt="Video thumbnail" 
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ fontSize: '12px', color: '#666' }}>Video</div>
                )}
              </div>
            )}
            
            {primaryMedia.type === 'url' && (
              <div style={{ 
                fontSize: '12px',
                padding: '4px',
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderRadius: '3px',
                width: '90%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {primaryMedia.url}
              </div>
            )}
            
            {data.media && data.media.length > 1 && (
              <div style={{ 
                position: 'absolute', 
                bottom: '2px', 
                right: '2px',
                backgroundColor: 'rgba(0,0,0,0.5)',
                color: 'white',
                borderRadius: '10px',
                fontSize: '10px',
                padding: '2px 5px'
              }}>
                +{data.media.length - 1}
              </div>
            )}
          </div>
        )}
        
        {/* Notes indicator */}
        {data.notes && data.notes.length > 0 && (
          <div style={{ 
            position: 'absolute', 
            top: '5px', 
            right: '5px',
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            fontSize: '10px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#333'
          }}>
            N
          </div>
        )}
        
        {/* Standard connection handles on all sides */}
        <Handle 
          type="target" 
          position={Position.Top} 
          style={{ visibility: data.isRoot ? 'hidden' : 'visible' }} 
        />
        <Handle type="source" position={Position.Bottom} />
        <Handle type="source" position={Position.Left} id="left" />
        <Handle type="source" position={Position.Right} id="right" />
        
        {/* Custom connection points along the edges */}
        {edgePoints.map((point) => (
          <Handle
            key={point.id}
            type="source"
            position={point.position}
            id={point.id}
            style={point.style}
          />
        ))}
      </div>
      
      {showModal && (
        <NodeOptionsModal
          node={{
            id: id as string,
            label: data.label,
            color: data.color,
            children: [],
            notes: data.notes,
            media: data.media,
            connectionPoints: data.connectionPoints
          }}
          isRoot={!!data.isRoot}
          onClose={() => setShowModal(false)}
          onUpdate={handleNodeUpdate}
          onAddChild={() => {
            if (data.onAddChild) data.onAddChild(id as string);
            setShowModal(false);
          }}
          onAddConnectionPoint={() => {
            if (data.onAddConnectionPoint) data.onAddConnectionPoint(id as string);
            setShowModal(false);
          }}
          onDelete={() => {
            if (data.onDelete) data.onDelete(id as string);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
};

export default MindMapNodeComponent;
