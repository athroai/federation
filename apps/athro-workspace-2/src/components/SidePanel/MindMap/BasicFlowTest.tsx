import React from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Initial nodes
const initialNodes = [
  {
    id: '1',
    type: 'default',
    data: { label: 'Main Node' },
    position: { x: 250, y: 50 },
  },
  {
    id: '2',
    type: 'default',
    data: { label: 'Child Node 1' },
    position: { x: 150, y: 150 },
  },
  {
    id: '3',
    type: 'default',
    data: { label: 'Child Node 2' },
    position: { x: 350, y: 150 },
  },
];

// Initial edges
const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e1-3', source: '1', target: '3' },
];

interface BasicFlowTestProps {
  onBack: () => void;
}

const BasicFlowTest: React.FC<BasicFlowTestProps> = ({ onBack }) => {
  return (
    <div style={{ height: '600px', width: '100%' }}>
      <div style={{ padding: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
        <h3 style={{ color: '#e4c97e', margin: 0 }}>Mind Map Test</h3>
        <button 
          onClick={onBack}
          style={{
            padding: '5px 10px',
            backgroundColor: '#e77373',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Back
        </button>
      </div>
      <div style={{ height: 'calc(100% - 60px)', border: '1px solid #444' }}>
        <ReactFlowProvider>
          <ReactFlow
            defaultNodes={initialNodes}
            defaultEdges={initialEdges}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background color="#aaa" gap={16} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export default BasicFlowTest;
