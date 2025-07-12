import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Connection,
  ConnectionMode,
  Controls,
  Edge,
  Handle,
  MiniMap,
  Node,
  NodeProps,
  Panel,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

// Custom node component for the mind map
const CustomNode = ({ data, isConnectable }: NodeProps) => {
  return (
    <div 
      style={{
        padding: '10px',
        borderRadius: '5px',
        background: data.color || '#4fc38a',
        color: 'white',
        border: '1px solid #222',
        width: 180,
        boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{data.label}</div>

      {/* Explicit handles on all sides for connections */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={{ background: '#fff', width: 10, height: 10 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ background: '#fff', width: 10, height: 10 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{ background: '#fff', width: 10, height: 10 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ background: '#fff', width: 10, height: 10 }}
      />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'custom',
    data: { label: 'Main Concept', color: '#4fc38a' },
    position: { x: 250, y: 100 },
  },
];

const DragToCreateFlow = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const { project } = useReactFlow();
  
  // Track connection state
  const [connectionStartNodeId, setConnectionStartNodeId] = useState<string | null>(null);
  const [connectionStartHandle, setConnectionStartHandle] = useState<string | null>(null);

  // Handle node changes
  const onNodesChange = useCallback((changes: any) => {
    setNodes((nds) => {
      const updatedNodes = [...nds];
      
      // Apply changes to nodes
      changes.forEach((change: any) => {
        if (change.type === 'position' && change.dragging) {
          const nodeIndex = updatedNodes.findIndex(n => n.id === change.id);
          if (nodeIndex !== -1) {
            updatedNodes[nodeIndex] = {
              ...updatedNodes[nodeIndex],
              position: {
                x: change.position.x,
                y: change.position.y
              }
            };
          }
        }
      });
      
      return updatedNodes;
    });
  }, []);

  // Handle when a connection starts
  const onConnectStart = useCallback((_, { nodeId, handleType, handleId }) => {
    setConnectionStartNodeId(nodeId);
    setConnectionStartHandle(handleId);
  }, []);

  // Handle when a connection drag ends
  const onConnectEnd = useCallback((event) => {
    // Only proceed if we know which node started the connection
    if (!connectionStartNodeId || !reactFlowWrapper.current || !reactFlowInstance) return;

    // Check if we dropped on a node or on empty space
    const targetIsNode = (event.target as Element).closest('.react-flow__node');
    
    if (!targetIsNode) {
      // We're creating a new node where the user dropped
      const { top, left } = reactFlowWrapper.current.getBoundingClientRect();
      const newNodePosition = reactFlowInstance.project({
        x: event.clientX - left,
        y: event.clientY - top,
      });
      
      // Create new node
      const newNodeId = uuidv4();
      const sourceNode = nodes.find(node => node.id === connectionStartNodeId);
      
      const newNode = {
        id: newNodeId,
        type: 'custom',
        position: newNodePosition,
        data: { 
          label: 'New Concept',
          color: sourceNode?.data?.color || '#4fc38a' 
        },
      };
      
      // Create connection from source to new node
      const newEdge = {
        id: `e-${connectionStartNodeId}-${newNodeId}`,
        source: connectionStartNodeId,
        target: newNodeId,
        sourceHandle: connectionStartHandle,
      };
      
      // Update the state
      setNodes(nds => [...nds, newNode]);
      setEdges(eds => [...eds, newEdge]);
    }
    
    // Reset the connection tracking
    setConnectionStartNodeId(null);
    setConnectionStartHandle(null);
  }, [connectionStartNodeId, connectionStartHandle, nodes, reactFlowInstance]);

  // Handle regular connection between existing nodes
  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge(params, eds));
  }, []);

  return (
    <div className="reactflow-wrapper" ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onInit={setReactFlowInstance}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        attributionPosition="bottom-left"
        style={{ background: 'rgb(17, 27, 22)' }}
      >
        <Controls />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
        <Background gap={16} size={1} color="#27393a" />
        <Panel position="top-left" style={{ margin: '10px' }}>
          <div style={{ 
            background: 'rgba(0,0,0,0.7)', 
            color: 'white', 
            padding: '10px', 
            borderRadius: '5px',
            fontSize: '14px'
          }}>
            <strong>✨ Drag from a connection handle into empty space to create a new node</strong>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

// Wrap with ReactFlowProvider to provide context
const WorkingDragToCreate = () => {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '100%' }}>
        <DragToCreateFlow />
      </div>
    </ReactFlowProvider>
  );
};

export default WorkingDragToCreate;
