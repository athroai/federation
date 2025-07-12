import { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  useReactFlow,
  ConnectionLineType,
  Position,
  Handle,
  NodeProps,
  Panel,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

// Define the appearance of our nodes
const SimpleNode = ({ data, isConnectable }: NodeProps) => {
  return (
    <div
      style={{
        background: data.color,
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        minWidth: '150px',
        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        position: 'relative',
      }}
    >
      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
        {data.label}
      </div>
      
      {/* Large visible handles for easy dragging */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: '#fff', width: 12, height: 12, right: -6 }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: '#fff', width: 12, height: 12, bottom: -6 }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{ background: '#fff', width: 12, height: 12, left: -6 }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={{ background: '#fff', width: 12, height: 12, top: -6 }}
        isConnectable={isConnectable}
      />
    </div>
  );
};

// Register our custom node
const nodeTypes = { simpleNode: SimpleNode };

// Initial node to get started
const initialNodes: Node[] = [
  {
    id: 'start-node',
    type: 'simpleNode',
    data: { label: 'Main Concept', color: '#4fc38a' },
    position: { x: 250, y: 150 },
  },
];

function SimpleWorkingFlow() {
  // Refs to access canvas information
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const connectingNodeRef = useRef<{ nodeId: string | null; handleId: string | null }>({ 
    nodeId: null, 
    handleId: null 
  });
  
  // Get ReactFlow utils
  const { project } = useReactFlow();
  
  // State management for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeName, setNodeName] = useState('New Concept');

  // When starting to drag from a node handle
  const onConnectStart = useCallback((_, { nodeId, handleId }) => {
    connectingNodeRef.current = { nodeId, handleId };
    document.body.style.cursor = 'grabbing'; // Visual feedback
  }, []);

  // When releasing the drag in empty space
  const onConnectEnd = useCallback(
    (event) => {
      if (!connectingNodeRef.current.nodeId || !reactFlowWrapper.current) {
        document.body.style.cursor = 'default';
        return;
      }

      // Check if we're dropping on a node (we only want to create when dropping in empty space)
      const targetIsNode = (event.target as Element).closest('.react-flow__node');
      
      if (!targetIsNode) {
        // Calculate where user dropped in the canvas coordinates
        const { top, left } = reactFlowWrapper.current.getBoundingClientRect();
        const position = project({
          x: event.clientX - left,
          y: event.clientY - top,
        });

        // Find the source node to get styling information
        const sourceNode = nodes.find((node) => node.id === connectingNodeRef.current.nodeId);
        const newId = uuidv4();

        // Create new node
        const newNode: Node = {
          id: newId,
          position,
          type: 'simpleNode',
          data: { 
            label: nodeName,
            color: sourceNode?.data.color ?? '#4fc38a',
          },
        };

        // Create connection from source to new node
        const newEdge: Edge = {
          id: `edge-${connectingNodeRef.current.nodeId}-${newId}`,
          source: connectingNodeRef.current.nodeId,
          sourceHandle: connectingNodeRef.current.handleId,
          target: newId,
          type: 'smoothstep',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#4fc38a',
          },
          style: { stroke: '#4fc38a', strokeWidth: 2 },
          animated: false,
        };

        // Update state with new node and edge
        setNodes((nds) => [...nds, newNode]);
        setEdges((eds) => [...eds, newEdge]);
      }
      
      // Reset connection state
      connectingNodeRef.current = { nodeId: null, handleId: null };
      document.body.style.cursor = 'default';
    },
    [nodeName, nodes, project, setNodes, setEdges]
  );

  // Handle regular connections between existing nodes
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge = {
        ...connection,
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#4fc38a',
        },
        style: { stroke: '#4fc38a', strokeWidth: 2 },
        animated: false,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Add a new node on double-click as an alternative method
  const onDoubleClick = (event) => {
    if (reactFlowWrapper.current) {
      const { top, left } = reactFlowWrapper.current.getBoundingClientRect();
      const position = project({
        x: event.clientX - left,
        y: event.clientY - top,
      });

      const newId = uuidv4();
      const newNode: Node = {
        id: newId,
        position,
        type: 'simpleNode',
        data: { 
          label: nodeName,
          color: '#4fc38a',
        },
      };
      
      setNodes((nds) => [...nds, newNode]);
    }
  };

  // Handle changing the default name for new nodes
  const handleNameChange = (e) => {
    setNodeName(e.target.value);
  };

  // Add a node via button (alternative method for adding)
  const addNewNode = () => {
    const newId = uuidv4();
    const centerX = reactFlowWrapper.current ? reactFlowWrapper.current.clientWidth / 2 : 250;
    const centerY = reactFlowWrapper.current ? reactFlowWrapper.current.clientHeight / 2 : 150;
    
    const newNode: Node = {
      id: newId,
      position: { x: centerX - 75, y: centerY - 25 },
      type: 'simpleNode',
      data: { 
        label: nodeName,
        color: '#4fc38a',
      },
    };
    
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div className="reactflow-wrapper" ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onDoubleClick={onDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: '#4fc38a', strokeWidth: 3 }}
        style={{ background: 'rgb(17, 27, 22)' }}
      >
        <Background gap={15} size={1} color="#27393a" />
        <Controls />
        <MiniMap style={{ height: 120 }} zoomable pannable />
        
        <Panel position="top-left" style={{ margin: '10px' }}>
          <div
            style={{
              padding: '12px',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              borderRadius: '5px',
              maxWidth: '320px',
            }}
          >
            <h4 style={{ margin: '0 0 8px' }}>Mind Map Instructions</h4>
            <ul style={{ margin: '0 0 8px', paddingLeft: '20px' }}>
              <li><strong>Drag from handles</strong> to create connected nodes</li>
              <li><strong>Double-click</strong> on canvas to create standalone nodes</li>
              <li>Use the button below to add nodes at center</li>
            </ul>
            
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>New node label:</label>
              <input
                value={nodeName}
                onChange={handleNameChange}
                style={{ 
                  width: '100%', 
                  padding: '8px',
                  background: '#1a2e24',
                  border: '1px solid #4fc38a',
                  color: 'white',
                  borderRadius: '4px'
                }}
              />
            </div>
            
            <button
              onClick={addNewNode}
              style={{
                background: '#4fc38a',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              + Add Node
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// Wrap the component in the ReactFlow Provider
function SimpleWorkingDragToCreate() {
  return (
    <ReactFlowProvider>
      <SimpleWorkingFlow />
    </ReactFlowProvider>
  );
}

export default SimpleWorkingDragToCreate;
