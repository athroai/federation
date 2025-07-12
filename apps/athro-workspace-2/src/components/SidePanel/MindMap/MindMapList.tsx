import React from 'react';
import { MindMap } from '../../../types/study';
import { formatDate } from '../../../utils/dateUtils';

interface MindMapListProps {
  mindMaps?: MindMap[];
  onCreateNew: () => void;
  onView: (mindMap: MindMap) => void;
  onEdit: (mindMap: MindMap) => void;
  onDelete: (id: string) => void;
}

const MindMapList: React.FC<MindMapListProps> = ({
  mindMaps = [],
  onCreateNew,
  onView,
  onEdit,
  onDelete
}) => {
  // Handle delete through the parent component
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this mind map?')) {
      onDelete(id);
    }
  };
  
  const renderMindMap = (mindMap: MindMap) => {
    const { id, topic, updatedAt } = mindMap;
    const date = formatDate(updatedAt);
    
    return (
      <div 
        key={id} 
        className="mind-map-item" 
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <h3 style={{ 
            margin: '0',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#e4c97e'
          }}>
            {topic}
          </h3>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button
            onClick={() => onView(mindMap)}
            style={{
              padding: '5px 10px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            View
          </button>
          <button
            onClick={() => onEdit(mindMap)}
            style={{
              padding: '5px 10px',
              background: 'rgba(79, 195, 138, 0.1)',
              border: '1px solid rgba(79, 195, 138, 0.5)',
              borderRadius: '4px',
              color: '#4fc38a',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(id)}
            style={{
              padding: '5px 10px',
              background: 'rgba(231, 115, 115, 0.1)',
              border: '1px solid rgba(231, 115, 115, 0.5)',
              borderRadius: '4px',
              color: '#e77373',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Delete
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="mind-map-list" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h4 style={{ color: '#e4c97e', marginBottom: '0' }}>My Mind Maps</h4>
        <button 
          onClick={onCreateNew}
          style={{ 
            padding: '8px 16px',
            backgroundColor: '#4fc38a',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Create New Mind Map
        </button>
      </div>
      
      {(mindMaps || []).length === 0 ? (
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.5)',
          fontStyle: 'italic'
        }}>
          No mind maps created yet. Click "Create New Mind Map" to create your first mind map.
        </div>
      ) : (
        mindMaps.map(mindMap => renderMindMap(mindMap))
      )}
    </div>
  );
};

export default MindMapList;
