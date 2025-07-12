import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Node,
  Edge
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

// Import React Flow styles
import 'reactflow/dist/style.css';

// Import custom node component
import MindMapNodeComponent from './MindMapNodeComponent';

// Define basic types
interface NodeData {
  label: string;
  color?: string;
  notes?: string;
  media?: Array<{
    type: 'image' | 'video' | 'link';
    url: string;
    title?: string;
  }>;
}

// Props for the inner editor component (used inside provider)
interface MindMapEditorInnerProps {
  initialValues?: {
    topic: string;
    rootNode: any;
  };
  onSave: (data: { topic: string; rootNode: any }) => void;
  onCancel: () => void;
}

// Props for the wrapper component
interface MindMapEditorProps {
  initialValues?: {
    topic: string;
    rootNode: any;
  };
  onSave: (data: { topic: string; rootNode: any }) => void;
  onCancel: () => void;
}

// Node types for registration
const nodeTypes = {
  mindMapNode: MindMapNodeComponent
};

// Inner component that uses ReactFlow hooks (must be used inside ReactFlowProvider)
const MindMapEditorInner: React.FC<MindMapEditorInnerProps> = ({
  initialValues,
  onSave,
  onCancel
}) => {
  // Topic state
  const [topic, setTopic] = useState<string>(initialValues?.topic || 'New Mind Map');
  
  // Reference to the flow wrapper element
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // Initial nodes setup
  const initialNodes: Node[] = [];
  const initialEdges: Edge[] = [];

  // If we have initial values, process them to create nodes
  if (initialValues?.rootNode) {
    const processNode = (node: any, position = { x: 250, y: 100 }, depth = 0): void => {
      // Create node from the data
      initialNodes.push({
        id: node.id,
        type: 'mindMapNode',
        position: position,
        data: { 
          label: node.label,
          color: node.color,
          notes: node.notes,
          media: node.media || []
        }
      });
      
      // Process children and create edges
      if (node.children && node.children.length > 0) {
        const childWidth = 200;
        const startX = position.x - ((node.children.length - 1) * childWidth) / 2;
        
        node.children.forEach((child: any, index: number) => {
          const childPosition = { 
            x: startX + index * childWidth, 
            y: position.y + 150
          };
          
          // Create edge to connect parent and child
          initialEdges.push({
            id: `e-${node.id}-${child.id}`,
            source: node.id,
            target: child.id,
            markerEnd: { type: MarkerType.Arrow }
          });
          
          // Process this child recursively
          processNode(child, childPosition, depth + 1);
        });
      }
    };
    
    // Start processing from the root node
    processNode(initialValues.rootNode);
  } else {
    // Create a default root node if no initial values
    initialNodes.push({
      id: uuidv4(),
      type: 'mindMapNode',
      position: { x: 250, y: 100 },
      data: { label: 'Main Topic', color: '#e4c97e' }
    });
  }

  // State for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handle connections between nodes
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ 
        ...connection, 
        markerEnd: { type: MarkerType.Arrow }
      }, eds));
    },
    [setEdges]
  );

  // Double click to add new node
  const onDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (!reactFlowWrapper.current) return;
      
      // Get the position where the double-click occurred
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top
      };
      
      // Create a new node at that position
      const newNode: Node = {
        id: uuidv4(),
        type: 'mindMapNode',
        position,
        data: { label: 'New Node', color: '#4fc38a' }
      };
      
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  // Save the mind map
  const handleSave = useCallback(() => {
    // Convert nodes and edges back to the hierarchical structure
    const buildHierarchy = (nodeId: string): any => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return null;
      
      // Find all edges where this node is the source
      const outgoingEdges = edges.filter((e) => e.source === nodeId);
      
      // Get all child nodes
      const children = outgoingEdges.map((edge) => {
        const targetId = edge.target;
        return buildHierarchy(targetId);
      }).filter(Boolean);
      
      // Return the node with its children
      return {
        id: node.id,
        label: node.data.label,
        color: node.data.color,
        notes: node.data.notes,
        media: node.data.media || [],
        children
      };
    };
    
    // Find the root node (assume it's the one with no incoming edges)
    const allTargetIds = edges.map((e) => e.target);
    const rootNodeId = nodes.find((n) => !allTargetIds.includes(n.id))?.id;
    
    if (!rootNodeId) {
      console.error('No root node found');
      return;
    }
    
    const rootNode = buildHierarchy(rootNodeId);
    
    // Call the onSave prop
    onSave({
      topic,
      rootNode
    });
  }, [nodes, edges, topic, onSave]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', display: 'flex', justifyContent: 'space-between' }}>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{
            padding: '5px 10px',
            backgroundColor: '#17221c',
            color: '#e4c97e',
            border: '1px solid #444',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            flex: '1',
            marginRight: '10px'
          }}
        />
        <div>
          <button
            onClick={onCancel}
            style={{
              padding: '5px 10px',
              backgroundColor: '#e77373',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '5px 10px',
              backgroundColor: '#4fc38a',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Save
          </button>
        </div>
      </div>
      
      <div
        ref={reactFlowWrapper}
        style={{
          flex: 1,
          backgroundColor: '#1a2820',
          border: '1px solid #444',
          borderRadius: '4px'
        }}
        onDoubleClick={onDoubleClick}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap />
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </div>
    </div>
  );
};

// Wrapper component that provides the ReactFlowProvider
const MindMapEditor: React.FC<MindMapEditorProps> = (props) => {
  return (
    <ReactFlowProvider>
      <MindMapEditorInner {...props} />
    </ReactFlowProvider>
  );
};

export default MindMapEditor;
