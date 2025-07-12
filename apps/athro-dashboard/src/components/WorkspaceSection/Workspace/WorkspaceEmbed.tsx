import React, { useMemo } from 'react';
// Import the workspace App but set embedded flag
import WorkspaceApp from '../../../../../athro-workspace-2/src/App';

interface WorkspaceEmbedProps {
  selectedAthros: any[];
  confidenceLevels: Record<string, number>;
  prioritySubjects: Set<string>;
}

const WorkspaceEmbed: React.FC<WorkspaceEmbedProps> = ({ selectedAthros, confidenceLevels, prioritySubjects }) => {
  console.log('🔗 [WorkspaceEmbed] Rendering embedded workspace with shared auth');
  
  // Set global flag to indicate embedded mode (workspace will check this)
  (window as any).__ATHRO_EMBEDDED_MODE__ = true;
  
  // Memoize props to prevent unnecessary re-renders
  const stableSelectedAthros = useMemo(() => selectedAthros, [
    selectedAthros.length,
    selectedAthros.map(a => a.id).join(',')
  ]);
  
  const stableConfidenceLevels = useMemo(() => confidenceLevels, [
    Object.keys(confidenceLevels).length,
    Object.entries(confidenceLevels).map(([k, v]) => `${k}:${v}`).join(',')
  ]);
  
  const stablePrioritySubjects = useMemo(() => prioritySubjects, [
    prioritySubjects.size,
    Array.from(prioritySubjects).sort().join(',')
  ]);
  
  return (
    <div style={{ 
      padding: '0',
      background: 'transparent',
      height: '100%',
      minHeight: '1000px',
      display: 'flex',
      flexDirection: 'column',
      width: '100%'
    }}>
      <WorkspaceApp 
        selectedAthros={stableSelectedAthros}
        confidenceLevels={stableConfidenceLevels}
        prioritySubjects={stablePrioritySubjects}
      />
    </div>
  );
};

// Wrap with React.memo to prevent re-renders when props haven't actually changed
export default React.memo(WorkspaceEmbed, (prevProps, nextProps) => {
  // Custom comparison for selectedAthros
  if (prevProps.selectedAthros.length !== nextProps.selectedAthros.length) {
    return false;
  }
  
  const prevIds = prevProps.selectedAthros.map(a => a.id).sort().join(',');
  const nextIds = nextProps.selectedAthros.map(a => a.id).sort().join(',');
  if (prevIds !== nextIds) {
    return false;
  }
  
  // Custom comparison for confidenceLevels
  const prevConfKeys = Object.keys(prevProps.confidenceLevels).sort().join(',');
  const nextConfKeys = Object.keys(nextProps.confidenceLevels).sort().join(',');
  if (prevConfKeys !== nextConfKeys) {
    return false;
  }
  
  const prevConfValues = Object.entries(prevProps.confidenceLevels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(',');
  const nextConfValues = Object.entries(nextProps.confidenceLevels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(',');
  if (prevConfValues !== nextConfValues) {
    return false;
  }
  
  // Custom comparison for prioritySubjects
  const prevPriorities = Array.from(prevProps.prioritySubjects).sort().join(',');
  const nextPriorities = Array.from(nextProps.prioritySubjects).sort().join(',');
  if (prevPriorities !== nextPriorities) {
    return false;
  }
  
  // If all comparisons pass, props are the same - don't re-render
  console.log('🔗 [WorkspaceEmbed] Props unchanged, skipping re-render');
  return true;
}); 