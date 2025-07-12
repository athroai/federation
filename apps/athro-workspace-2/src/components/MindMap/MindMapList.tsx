import React, { useState, useEffect } from 'react';
import { MindMap } from '../../types/study';
import SupabaseStudyService from '../../services/SupabaseStudyService';
import { formatDate } from '../../utils/dateUtils';

interface MindMapListProps {
  athroId: string;
  subject: string;
  sessionId?: string | null;
  onCreateNew: () => void;
  onView: (mindMap: MindMap) => void;
  onEdit: (mindMap: MindMap) => void;
  onDelete: (id: string) => void;
}

const MindMapList: React.FC<MindMapListProps> = ({
  athroId,
  subject,
  sessionId,
  onCreateNew,
  onView,
  onEdit,
  onDelete
}) => {
  const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch mind maps on component mount and when mind maps are saved
  useEffect(() => {
    if (sessionId) {
      console.log(`Loading mind maps for sessionId: ${sessionId}`);
      loadMindMaps();
    } else {
      setMindMaps([]);
      setLoading(false);
    }
    
    // Add event listener for when mind maps are saved
    const handleMindMapSaved = () => {
      console.log('Mind map saved event detected, refreshing list');
      if (sessionId) {
        loadMindMaps();
      }
    };
    
    window.addEventListener('mindmap_saved', handleMindMapSaved);
    
    // Register a listener for the mindmap_list_refresh event
    const handleListRefresh = () => {
      console.log('Mind map list refresh event received');
      if (sessionId) {
        loadMindMaps();
      }
    };
    
    window.addEventListener('mindmap_list_refresh', handleListRefresh);
    
    // Clean up all event listeners when component unmounts
    return () => {
      window.removeEventListener('mindmap_saved', handleMindMapSaved);
      window.removeEventListener('mindmap_list_refresh', handleListRefresh);
    };
  }, [sessionId, athroId, subject]);
  
  // Listen for session events
  useEffect(() => {
    const handleClearStudyTools = () => {
      console.log('Clearing mind maps due to session change');
      setMindMaps([]);
    };

    const handleLoadSessionTools = async (e: CustomEvent) => {
      console.log('Loading mind maps for session:', e.detail);
      const { sessionId: loadSessionId, athroId: loadAthroId, mindMaps: mindMapIds } = e.detail || {};
      
      if (loadSessionId && loadAthroId === athroId && mindMapIds && Array.isArray(mindMapIds)) {
        console.log(`[MindMaps] Loading ${mindMapIds.length} mind maps for session ${loadSessionId}`);
        
        try {
          // Load all mind maps for this session and filter by the provided IDs
          const allMaps = await SupabaseStudyService.getMindMaps(athroId, loadSessionId);
          
          // Filter to only include mind maps that are in the session's mind map list
          const filteredMaps = allMaps.filter(map => mindMapIds.includes(map.id));
          
          console.log(`[MindMaps] Successfully loaded ${filteredMaps.length} mind maps`);
          setMindMaps(filteredMaps);
          
        } catch (error) {
          console.error('[MindMaps] Error loading session mind maps:', error);
        }
      }
    };

    window.addEventListener('clearStudyTools', handleClearStudyTools);
    window.addEventListener('loadSessionTools', handleLoadSessionTools as unknown as EventListener);

    return () => {
      window.removeEventListener('clearStudyTools', handleClearStudyTools);
      window.removeEventListener('loadSessionTools', handleLoadSessionTools as unknown as EventListener);
    };
  }, []);
  
  // Refresh mind maps
  const loadMindMaps = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    try {
      // Convert pending-session to temp-session like other modules
      const effectiveSessionId = sessionId === 'pending-session' ? 'temp-session' : sessionId;
      
      console.log(`Loading mind maps for sessionId: ${sessionId} (effective: ${effectiveSessionId})`);
      
      // Fix the parameter order - SupabaseStudyService.getMindMaps(athroId, sessionId)
      const maps = await SupabaseStudyService.getMindMaps(athroId, effectiveSessionId);
      console.log('Mind maps loaded:', maps);
      
      setMindMaps(maps);
    } catch (error) {
      console.error('Error loading mind maps:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle delete through the parent component
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this mind map?')) {
      onDelete(id);
      // Refresh the list
      loadMindMaps();
    }
  };
  
  // Force reload on component mount - this ensures any updates are shown
  useEffect(() => {
    console.log('MindMapList mounted - loading maps');
    loadMindMaps();
    
    // Listen for our custom refresh event
    const handleRefresh = (event: any) => {
      console.log('Received refresh_mindmaplist event, reloading maps...', event.detail);
      loadMindMaps();
    };
    
    window.addEventListener('refresh_mindmaplist', handleRefresh);
    return () => {
      window.removeEventListener('refresh_mindmaplist', handleRefresh);
    };
  }, []);
  
  // Render a mind map card
  const renderMindMap = (mindMap: MindMap) => {
    const { id, topic, updatedAt } = mindMap;
    
    // Format date using the utility function
    const date = formatDate(updatedAt);
    
    return (
      <div 
        key={id} 
        className="mind-map-item" 
        style={{
          background: 'rgba(23, 34, 28, 0.7)',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          border: '1px solid rgba(79, 195, 138, 0.2)',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={() => onView(mindMap)}
      >
        {/* Visual indicator for mind map */}
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          width: '40px',
          height: '100%',
          background: 'linear-gradient(90deg, rgba(79, 195, 138, 0) 0%, rgba(79, 195, 138, 0.1) 100%)',
          borderLeft: '1px solid rgba(79, 195, 138, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            background: 'rgba(79, 195, 138, 0.2)',
            borderRadius: '50%',
            border: '1px solid rgba(79, 195, 138, 0.5)'
          }} />
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingRight: '30px'
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
          gap: '10px',
          marginRight: '30px'
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(mindMap);
            }}
            style={{
              padding: '5px 10px',
              background: 'rgba(79, 195, 138, 0.1)',
              border: '1px solid rgba(79, 195, 138, 0.5)',
              borderRadius: '4px',
              color: '#4fc38a',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s ease'
            }}
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(id);
            }}
            style={{
              padding: '5px 10px',
              background: 'rgba(231, 115, 115, 0.1)',
              border: '1px solid rgba(231, 115, 115, 0.5)',
              borderRadius: '4px',
              color: '#e77373',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s ease'
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px' 
      }}>
        {/* Removed header text as requested */}
        <button 
          onClick={onCreateNew}
          style={{ 
            padding: '8px 16px',
            backgroundColor: '#4fc38a',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <span>+</span>
          Create New Mind Map
        </button>
      </div>
      
      {loading ? (
        <div>Loading mind maps...</div>
      ) : mindMaps.length === 0 ? (
        <div style={{ 
          background: 'rgba(0,0,0,0.3)', 
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '1rem',
          textAlign: 'center',
          marginBottom: '1rem'
        }}>
          <p style={{ marginBottom: '1rem' }}>No mind maps created yet. Click "Create New Mind Map" to create your first mind map.</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Mind maps help you visualize and organize your learning in a creative way!</p>
        </div>
      ) : (
        <div>
          {mindMaps.map(mindMap => renderMindMap(mindMap))}
        </div>
      )}
    </div>
  );
};

export default MindMapList;
