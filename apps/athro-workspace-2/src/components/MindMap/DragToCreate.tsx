import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Connection,
  Edge,
  Node,
  addEdge,
  MarkerType,
  Handle,
  Position,
  ReactFlowProvider,
  NodeProps,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

// Define the custom node component for our mind map
const TextNode = ({ data }: { data: { label: string; color: string } }) => {
  return (
    <div
      style={{
        background: data.color,
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '8px',
        minWidth: '150px',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
        fontWeight: 'bold',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      {/* Add visible handles for better UX */}
      <div className="nodrag" style={{ position: 'absolute', top: '-10px', right: '-10px', width: '20px', height: '20px', background: '#4fc38a', borderRadius: '50%', border: '2px solid white', zIndex: 10 }} />
      <div className="nodrag" style={{ position: 'absolute', bottom: '-10px', right: '-10px', width: '20px', height: '20px', background: '#4fc38a', borderRadius: '50%', border: '2px solid white', zIndex: 10 }} />
      <div className="nodrag" style={{ position: 'absolute', bottom: '-10px', left: '-10px', width: '20px', height: '20px', background: '#4fc38a', borderRadius: '50%', border: '2px solid white', zIndex: 10 }} />
      <div className="nodrag" style={{ position: 'absolute', top: '-10px', left: '-10px', width: '20px', height: '20px', background: '#4fc38a', borderRadius: '50%', border: '2px solid white', zIndex: 10 }} />
      {data.label}
    </div>
  );
};

// Set up the node types for React Flow
const nodeTypes = {
  textNode: TextNode,
};

const DragToCreateFlow = () => {
  // Refs and state for React Flow
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: 'node-1',
      type: 'textNode',
      data: { label: 'Start Here', color: '#4fc38a' },
      position: { x: 250, y: 5 },
    },
  ]);
  const [edges, setEdges] = useState<Edge[]>([]);
  
  // Get the ReactFlow utility functions
  const { project } = useReactFlow();
  
  // Track which node is being connected from
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  
  // Handle connection start (when dragging from a node handle)
  const onConnectStart: OnConnectStart = useCallback((_, { nodeId }) => {
    setConnectingNodeId(nodeId);
  }, []);
  
  // Handle connection end (when releasing mouse)
  const onConnectEnd: OnConnectEnd = useCallback(
    (event) => {
      // Only proceed if we have a valid starting node and flow wrapper
      if (!connectingNodeId || !reactFlowWrapper.current) return;
      
      // Check if we're dropping on a node or empty space
      const targetIsNode = (event.target as Element)?.closest('.react-flow__node');
      
      // If dropping in empty space and not on a node, create a new node
      if (!targetIsNode) {
        // Get the current viewport's dimensions
        const { left, top } = reactFlowWrapper.current.getBoundingClientRect();
        
        // Convert screen coordinates to flow coordinates
        const position = project({
          x: event.clientX - left,
          y: event.clientY - top,
        });
        
        // Generate a unique ID for the new node
        const newNodeId = `node-${uuidv4()}`;
        
        // Get the source node to copy properties like color
        const sourceNode = nodes.find((node) => node.id === connectingNodeId);
        
        // Create a new node at that position
        const newNode: Node = {
          id: newNodeId,
          type: 'textNode',
          position,
          data: {
            label: 'New Concept',
            color: sourceNode?.data?.color || '#4fc38a',
          },
        };
        
        // Create a connection from the source to the new node
        const newEdge: Edge = {
          id: `edge-${connectingNodeId}-${newNodeId}`,
          source: connectingNodeId,
          target: newNodeId,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#4fc38a' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 15,
            height: 15,
            color: '#4fc38a',
          },
        };
        
        // Add the new node and edge to the state
        setNodes((nds) => [...nds, newNode]);
        setEdges((eds) => [...eds, newEdge]);
      }
      
      // Reset the tracking state
      setConnectingNodeId(null);
    },
    [connectingNodeId, nodes, project]
  );
  
  // Handle regular connections between existing nodes
  const onConnect = useCallback(
    (connection: Connection) => {
      // Add a styled edge
      const edge: Edge = {
        ...connection,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#4fc38a' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: '#4fc38a',
        },
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    []
  );
  
  // Render the flow
  return (
    <div style={{ width: '100%', height: '100%' }} ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        connectionLineType={ConnectionLineType.Bezier}
        connectionLineStyle={{ stroke: '#4fc38a', strokeWidth: 2 }}
        style={{ background: 'rgba(11, 18, 14, 0.8)' }}
      >
        <Background color="#7a7a7a" gap={16} />
        <Controls />
        <Panel position="top-left" style={{ margin: '10px' }}>
          <div style={{ color: 'white', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '5px' }}>
            <strong>Drag from a node handle into empty space to create a new connected node</strong>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

// Wrapper component to provide the React Flow context
const DragToCreate = () => {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '100%' }}>
        <DragToCreateFlow />
      </div>
    </ReactFlowProvider>
  );
};

export default DragToCreate;
