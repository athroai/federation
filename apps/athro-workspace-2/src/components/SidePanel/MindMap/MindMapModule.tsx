import React, { useState, useEffect } from 'react';
import SupabaseStudyService from '../../../services/SupabaseStudyService';
import { MindMap, MindMapNode } from '../../../types/study';
// Import components directly
import MindMapList from './MindMapList';
import SimpleMindMap from './SimpleMindMap';

interface MindMapModuleProps {
  athroId: string;
  subject: string;
}

export enum MindMapView {
  LIST = 'list',
  CREATE = 'create',
  EDIT = 'edit',
  VIEW = 'view'
}

const MindMapModule: React.FC<MindMapModuleProps> = ({
  athroId,
  subject
}) => {
  const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
  const [currentView, setCurrentView] = useState<MindMapView>(MindMapView.LIST);
  const [selectedMindMap, setSelectedMindMap] = useState<MindMap | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMindMaps();
  }, [athroId, subject]);

  const loadMindMaps = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading mind maps with athroId:', athroId, 'subject:', subject);
      
      // Make sure athroId and subject are valid strings before calling the service
      const validAthroId = athroId || 'default';
      const validSubject = subject || 'general';
      
      const fetchedMindMaps = await SupabaseStudyService.getMindMaps(validAthroId, validSubject);
      console.log('Fetched mind maps:', fetchedMindMaps);
      
      // Ensure we always have an array, even if the service returns undefined
      setMindMaps(fetchedMindMaps || []);
    } catch (error) {
      console.error('Error loading mind maps:', error);
      setError('Failed to load mind maps. Please try again.');
      // Initialize with an empty array to prevent undefined errors
      setMindMaps([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMindMap = async (data: { topic: string; rootNode: MindMapNode }) => {
    try {
      await SupabaseStudyService.createMindMap({
        athroId,
        subject,
        topic: data.topic,
        rootNode: data.rootNode
      });
      await loadMindMaps();
      setCurrentView(MindMapView.LIST);
    } catch (error) {
      console.error('Error creating mind map:', error);
    }
  };

  const handleUpdateMindMap = async (id: string, data: { topic: string; rootNode: MindMapNode }) => {
    try {
      await SupabaseStudyService.updateMindMap(id, {
        topic: data.topic,
        rootNode: data.rootNode
      });
      await loadMindMaps();
      setCurrentView(MindMapView.LIST);
    } catch (error) {
      console.error('Error updating mind map:', error);
    }
  };

  const handleEditMindMap = (mindMap: MindMap) => {
    setSelectedMindMap(mindMap);
    setCurrentView(MindMapView.EDIT);
  };

  const handleViewMindMap = (mindMap: MindMap) => {
    setSelectedMindMap(mindMap);
    setCurrentView(MindMapView.VIEW);
  };

  const handleDeleteMindMap = async (id: string) => {
    try {
      if (confirm('Are you sure you want to delete this mind map?')) {
        await SupabaseStudyService.deleteMindMap(id);
        await loadMindMaps();
        
        // Return to list view if we deleted the currently viewed mind map
        if (selectedMindMap && selectedMindMap.id === id) {
          setSelectedMindMap(null);
          setCurrentView(MindMapView.LIST);
        }
      }
    } catch (error) {
      console.error('Error deleting mind map:', error);
    }
  };

  // Render the appropriate view based on currentView state
  const renderContent = () => {
    switch (currentView) {
      case MindMapView.CREATE:
        // Use our custom SVG-based mind map component
        return (
          <SimpleMindMap 
            onBack={() => setCurrentView(MindMapView.LIST)}
            onSave={handleCreateMindMap}
          />
        );
        
      case MindMapView.EDIT:
        if (!selectedMindMap) return null;
        
        // Use our custom SVG-based mind map component
        return (
          <SimpleMindMap 
            onBack={() => setCurrentView(MindMapView.LIST)}
            initialData={{
              topic: selectedMindMap.topic,
              rootNode: selectedMindMap.rootNode
            }}
            onSave={(data: {topic: string, rootNode: any}) => handleUpdateMindMap(selectedMindMap.id, data)}
          />
        );
        
      case MindMapView.VIEW:
        if (!selectedMindMap) return null;
        
        return (
          <div style={{ padding: '1rem' }}>
            <h4 style={{ color: '#e4c97e', marginBottom: '1rem' }}>{selectedMindMap.topic}</h4>
            <div className="mind-map-container" style={{ 
              backgroundColor: '#1a2820', 
              padding: '10px', 
              borderRadius: '4px', 
              marginTop: '15px',
              marginBottom: '15px',
              height: '500px'
            }}>
              <SimpleMindMap 
                onBack={() => setCurrentView(MindMapView.LIST)}
                initialData={{
                  topic: selectedMindMap.topic,
                  rootNode: selectedMindMap.rootNode
                }}
                onSave={() => {}}
              />
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => setCurrentView(MindMapView.LIST)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '0.5rem',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Back to List
              </button>
              <button
                onClick={() => handleEditMindMap(selectedMindMap)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(79, 195, 138, 0.1)',
                  border: '1px solid #4fc38a',
                  borderRadius: '0.5rem',
                  color: '#4fc38a',
                  cursor: 'pointer'
                }}
              >
                Edit
              </button>
            </div>
          </div>
        );
        
      case MindMapView.LIST:
      default:
        return (
          <MindMapList
            mindMaps={mindMaps}
            onCreateNew={() => setCurrentView(MindMapView.CREATE)}
            onView={handleViewMindMap}
            onEdit={handleEditMindMap}
            onDelete={handleDeleteMindMap}
          />
        );
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Loading mind maps...</div>
        </div>
      ) : error ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column' }}>
          <div style={{ color: '#e77373', marginBottom: '20px' }}>{error}</div>
          <button 
            onClick={() => loadMindMaps()}
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
            Try Again
          </button>
        </div>
      ) : (
        renderContent()
      )}
    </div>
  );
};

export default MindMapModule;
