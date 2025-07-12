import React, { useState, useCallback } from 'react';
import { MindMapNode } from '../../../types/study';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

// Import React Flow styles
import 'reactflow/dist/style.css';

interface MindMapEditorProps {
  initialValues?: {
    topic: string;
    rootNode: MindMapNode;
  };
  onSave: (data: { topic: string; rootNode: MindMapNode }) => void;
  onCancel: () => void;
}

// Simple node data
interface NodeData {
  label: string;
}

const MindMapEditorSimple: React.FC<MindMapEditorProps> = ({
  initialValues,
  onSave,
  onCancel,
}) => {
  // State for topic name
  const [topic, setTopic] = useState<string>(
    initialValues?.topic || 'New Mind Map'
  );

  // Initial nodes and edges
  const initialNodes: Node<NodeData>[] = initialValues?.rootNode
    ? [
        {
          id: initialValues.rootNode.id,
          type: 'default',
          data: { label: initialValues.rootNode.label },
          position: { x: 250, y: 5 },
        },
      ]
    : [
        {
          id: '1',
          type: 'default',
          data: { label: 'Main Topic' },
          position: { x: 250, y: 5 },
        },
      ];

  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Handle connections
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Add node on double click
  const onDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNodeId = uuidv4();
      const newNode: Node<NodeData> = {
        id: newNodeId,
        type: 'default',
        position,
        data: { label: 'New Node' },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  // Convert ReactFlow nodes to MindMapNode for saving
  const handleSave = () => {
    // Find root node (for simplicity, use the first node)
    const rootNode = nodes[0];
    if (!rootNode) return;

    // Create a basic MindMapNode tree
    const mindMapNode: MindMapNode = {
      id: rootNode.id,
      label: rootNode.data.label,
      children: [], // We'll keep it simple for now
    };

    onSave({
      topic,
      rootNode: mindMapNode,
    });
  };

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <div style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Mind Map Topic"
          style={{ padding: '8px', fontSize: '16px' }}
        />
        <div>
          <button
            onClick={handleSave}
            style={{
              marginRight: '10px',
              padding: '8px 16px',
              backgroundColor: '#4fc38a',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Save
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#e77373',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      <div style={{ width: '100%', height: 'calc(100% - 60px)', border: '1px solid #ddd' }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDoubleClick={onDoubleClick}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background color="#f0f0f0" gap={16} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export default MindMapEditorSimple;
