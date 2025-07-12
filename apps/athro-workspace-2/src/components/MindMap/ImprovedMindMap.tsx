import { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  Handle,
  Position,
  NodeProps,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType,
  addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import NodeDetailsModal, { NodeMedia } from './NodeDetailsModal';

// Define our color palette
// Main node color + branch colors (all descendants of a branch maintain their branch color)
const COLORS = {
  main: '#4fc38a',    // Main concept - green
  branch1: '#e4c97e', // First branch - gold
  branch2: '#d16666', // Second branch - red
  branch3: '#6096db', // Third branch - blue
  branch4: '#9966cc', // Fourth branch - purple
  branch5: '#e49e4e', // Fifth branch - orange
  branch6: '#569f7a', // Sixth branch - teal
  branch7: '#d6a3dc', // Seventh branch - lavender
  branch8: '#8c6e46', // Eighth branch - brown
};

// Custom node component
interface NodeData {
  label: string;
  color: string;
  parentId: string | null;
  notes: string;
  media: NodeMedia[];
  onNodeClick?: (nodeId: string) => void;
}

const MindMapNode = ({ id, data, isConnectable }: NodeProps<NodeData>) => {
  const onNodeClick = () => {
    if (data.onNodeClick) {
      data.onNodeClick(id);
    }
  };



  return (
    <div
      className="mindmap-node"
      style={{
        background: data.color,
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        minWidth: '150px',
        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
        border: '2px solid rgba(255, 255, 255, 0.2)',
      }}
      onClick={onNodeClick}
    >
      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
        {data.label}
      </div>
      
      {/* 8 connection handles around the node */}
      {/* Top and bottom handles */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={{ background: '#fff', width: 12, height: 12, top: -6, left: '25%' }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-right"
        style={{ background: '#fff', width: 12, height: 12, top: -6, left: '75%' }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: '#fff', width: 12, height: 12, bottom: -6, left: '25%' }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-right"
        style={{ background: '#fff', width: 12, height: 12, bottom: -6, left: '75%' }}
        isConnectable={isConnectable}
      />
      
      {/* Left and right handles */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{ background: '#fff', width: 12, height: 12, left: -6, top: '25%' }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-bottom"
        style={{ background: '#fff', width: 12, height: 12, left: -6, top: '75%' }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: '#fff', width: 12, height: 12, right: -6, top: '25%' }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-bottom"
        style={{ background: '#fff', width: 12, height: 12, right: -6, top: '75%' }}
        isConnectable={isConnectable}
      />


      {/* Show indicators if there are notes or media */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginTop: '8px',
        fontSize: '12px'
      }}>
        {data.notes && (
          <span title="Has notes">📝</span>
        )}
        {data.media && data.media.length > 0 && (
          <span title={`Has ${data.media.length} media items`}>📎 {data.media.length}</span>
        )}

      </div>
    </div>
  );
};

// Register our node types
const nodeTypes = { mindmapNode: MindMapNode };

// Initial nodes setup - just the main concept node
const initialNodes: Node<NodeData>[] = [
  {
    id: 'start-node',
    type: 'mindmapNode',
    data: { 
      label: 'Main Concept',
      color: COLORS.main,
      parentId: null,
      notes: '',
      media: [],
      onNodeClick: () => {} // This will be set in the component
    },
    position: { x: 0, y: 0 },
  },
];

// Main component
function MindMapFlow() {
  // Refs
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const connectingNodeRef = useRef<{ nodeId: string | null; handleId: string | null }>({ 
    nodeId: null, 
    handleId: null 
  });
  
  // ReactFlow utility functions
  const { project } = useReactFlow();
  
  // State for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // State for node details modal
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nextBranchColorIndex, setNextBranchColorIndex] = useState(1);
  const [isDirty, setIsDirty] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  
  // Automatically rebuild any missing edges to ensure connections always stay visible
  useEffect(() => {
    // Build a set of all valid parent-child relationships from node data
    const expectedConnections = new Set<string>();
    
    nodes.forEach(node => {
      if (node.data.parentId) {
        // Format: "sourceId->targetId"
        expectedConnections.add(`${node.data.parentId}->${node.id}`);
      }
    });
    
    // Check which connections already exist in the edges
    const existingConnections = new Set<string>();
    edges.forEach(edge => {
      existingConnections.add(`${edge.source}->${edge.target}`);
    });
    
    // Find missing connections
    const missingConnections: Array<{source: string, target: string}> = [];
    expectedConnections.forEach(connection => {
      if (!existingConnections.has(connection)) {
        const [source, target] = connection.split('->');
        missingConnections.push({ source, target });
      }
    });
    
    // If there are missing connections, create the edges
    if (missingConnections.length > 0) {
      const newEdges: Edge[] = missingConnections.map(({ source, target }) => {
        // Find the source node to get its color
        const sourceNode = nodes.find(n => n.id === source);
        const color = sourceNode?.data.color || '#4fc38a';
        
        return {
          id: `edge-${source}-${target}`,
          source,
          target,
          type: 'smoothstep',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color,
          },
          style: { 
            stroke: color, 
            strokeWidth: 3,
          },
          animated: false,
          deletable: false, // Prevent accidental deletion
        };
      });
      
      setEdges(eds => [...eds, ...newEdges]);
    }
  }, [nodes, edges, setEdges]);
  
  // Map to track which color each node should use (based on lineage)
  const [nodeColorMap, setNodeColorMap] = useState(new Map([
    ['start-node', COLORS.main]
  ]));
  
  // Function to determine node color based on its parent
  const getNodeColor = useCallback((parentId: string | null): string => {
    if (!parentId) return COLORS.main;
    
    // If parent is main node, assign a new branch color
    if (parentId === 'start-node') {
      const branchKey = `branch${nextBranchColorIndex}` as keyof typeof COLORS;
      const color = COLORS[branchKey] || COLORS.main;
      
      // Update next color index
      setNextBranchColorIndex(prev => (prev % 8) + 1);
      
      return color;
    }
    
    // Otherwise, use the same color as the parent
    return nodeColorMap.get(parentId) || COLORS.main;
  }, [nodeColorMap, nextBranchColorIndex]);
  
  // Track connection start
  const onConnectStart = useCallback((_: React.MouseEvent | React.TouchEvent, params: any) => {
    // Safely access nodeId and handleId
    const nodeId = params.nodeId || null;
    const handleId = params.handleId || null;
    
    connectingNodeRef.current = { nodeId, handleId };
    document.body.style.cursor = 'grabbing';
  }, []);
  
  // Function to open the node details modal
  const openNodeDetails = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
  }, []);
  
  // When connecting handle is released
  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    document.body.style.cursor = 'default';
    
    // Validate if we're starting from a node
    if (!connectingNodeRef.current.nodeId || !reactFlowWrapper.current) {
      return;
    }
    
    // We only want to create a node if we're dropping in empty space
    const targetIsNode = (event.target as Element).closest('.react-flow__node');
    if (targetIsNode) {
      return;
    }
    
    // Get the position where user released the connection
    const { top, left } = reactFlowWrapper.current.getBoundingClientRect();
    
    // Handle both mouse and touch events
    let clientX, clientY;
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      // It's a TouchEvent
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    }
    
    const position = project({
      x: clientX - left,
      y: clientY - top,
    });
    
    // Create a unique ID for the new node
    const newNodeId = `node-${uuidv4()}`;
    
    // Find source node for color inheritance
    const parentId = connectingNodeRef.current.nodeId;
    const sourceHandleId = connectingNodeRef.current.handleId;
    const nodeColor = getNodeColor(parentId);
    
    // Create new node
    const newNode: Node<NodeData> = {
      id: newNodeId,
      type: 'mindmapNode',
      position,
      data: { 
        label: 'New Node',
        color: nodeColor,
        parentId,
        notes: '',
        media: [],
        onNodeClick: openNodeDetails
      },
    };
    
    // Add the node's color to our mapping
    setNodeColorMap(prev => new Map(prev).set(newNodeId, nodeColor));
    
    // Create edge from source to new node with enhanced styling
    const newEdge: Edge = {
      id: `edge-${parentId}-${newNodeId}`,
      source: parentId,
      sourceHandle: sourceHandleId,
      target: newNodeId,
      type: 'smoothstep',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: nodeColor,
      },
      style: { 
        stroke: nodeColor, 
        strokeWidth: 3,
      },
      animated: false,
      // Make sure this edge is always visible and maintained
      deletable: false,
    };
    
    // First update the nodes
    setNodes(nds => {
      const updatedNodes = [...nds, newNode];
      // Update all nodes with the openNodeClick handler
      return updatedNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onNodeClick: openNodeDetails
        }
      }));
    });

    // Then update the edges in a separate step to ensure stability
    setTimeout(() => {
      setEdges(eds => [...eds, newEdge]);
      // Set the mind map as dirty to encourage saving
      setIsDirty(true);
    }, 10);
    
    // Open the node details modal for the new node
    setSelectedNode(newNodeId);
    
    // Reset connection tracking
    connectingNodeRef.current = { nodeId: null, handleId: null };
  }, [nodes, project, setNodes, setEdges, getNodeColor, openNodeDetails, setIsDirty]);
  
  // Handle node deletion
  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) return;
    
    // Delete the node
    setNodes(nodes => nodes.filter(n => n.id !== selectedNode));
    
    // Delete any edges connected to this node
    setEdges(edges => edges.filter(e => 
      e.source !== selectedNode && e.target !== selectedNode
    ));
    
    // Close the details modal
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);
  
  // Handle regular connections between existing nodes
  const onConnect = useCallback(
    (connection: Connection) => {
      // Determine color for the edge
      const sourceNode = nodes.find(n => n.id === connection.source);
      const edgeColor = sourceNode?.data.color || COLORS.main;
      
      // Create styled edge
      const newEdge = {
        ...connection,
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: edgeColor,
        },
        style: { stroke: edgeColor, strokeWidth: 2 },
        animated: false,
      };
      
      setEdges(eds => addEdge(newEdge, eds));
      
      // If this is creating a new parent-child relationship 
      // update the target node's parent ID
      if (connection.source && connection.target) {
        setNodes(nds => nds.map(node => {
          if (node.id === connection.target) {
            // Update parentId in node data
            return {
              ...node,
              data: {
                ...node.data,
                parentId: connection.source as string
              }
            };
          }
          return node;
        }));
      }
    },
    [nodes, setEdges, setNodes]
  );
  
  // Update all nodes with the click handler when it changes
  useEffect(() => {
    setNodes(nds => 
      nds.map(node => ({
        ...node, 
        data: { 
          ...node.data, 
          onNodeClick: openNodeDetails 
        }
      }))
    );
  }, [openNodeDetails, setNodes]);
  
  // Handle saving node details
  const handleSaveNodeDetails = useCallback((data: { 
    label: string; 
    notes: string; 
    media: NodeMedia[];
  }) => {
    if (!selectedNode) return;
    
    setNodes(nodes => nodes.map(node => {
      if (node.id === selectedNode) {
        return {
          ...node,
          data: {
            ...node.data,
            label: data.label,
            notes: data.notes,
            media: data.media
          }
        };
      }
      return node;
    }));
    
    setSelectedNode(null);
    setIsDirty(true);
  }, [selectedNode, setNodes]);

  // Save the mind map
  const handleSaveMindMap = useCallback(() => {
    // Here we would actually save the data to a backend
    // For now, we'll just simulate a save operation
    console.log('Saving mind map:', { nodes, edges });

    // Show a saved confirmation
    setShowSavedMessage(true);
    setTimeout(() => setShowSavedMessage(false), 2000);
    setIsDirty(false);

    // In a real app, you would save to your backend:
    // StudyService.saveMindMap({ nodes, edges, title: 'My Mind Map' });
  }, [nodes, edges]);
  
  // Find the selected node details
  const selectedNodeData = selectedNode 
    ? nodes.find(node => node.id === selectedNode)?.data 
    : null;
  
  return (
    <div 
      className="reactflow-wrapper" 
      ref={reactFlowWrapper} 
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      {/* Save Button */}
      <div 
        style={{
          position: 'absolute', 
          top: '15px', 
          right: '15px', 
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        {showSavedMessage && (
          <div style={{
            background: 'rgba(79, 195, 138, 0.9)',
            padding: '8px 15px',
            borderRadius: '4px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span>✓</span> Mind Map Saved
          </div>
        )}
        <button 
          onClick={handleSaveMindMap}
          style={{
            background: isDirty ? '#4fc38a' : '#2b5842',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
          }}
        >
          <span>💾</span> Save Mind Map
        </button>
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        nodeTypes={nodeTypes}
        fitView
        connectionLineStyle={{ stroke: '#4fc38a', strokeWidth: 4, opacity: 0.8 }}
        style={{ background: 'rgb(17, 27, 22)' }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
      >
        <Background gap={15} size={1} color="#27393a" />
        <Controls />
        <MiniMap style={{ height: 120 }} zoomable pannable />
      </ReactFlow>
      
      {/* Node details modal */}
      {selectedNode && selectedNodeData && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
          }}
          onClick={() => setSelectedNode(null)}
        >
          <NodeDetailsModal
            nodeId={selectedNode}
            parentId={selectedNodeData.parentId}
            initialData={{
              label: selectedNodeData.label,
              notes: selectedNodeData.notes,
              color: selectedNodeData.color,
              media: selectedNodeData.media
            }}
            onSave={handleSaveNodeDetails}
            onDelete={handleDeleteNode}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}
    </div>
  );
}

// Wrap with ReactFlowProvider
function ImprovedMindMap() {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '100%' }}>
        <MindMapFlow />
      </div>
    </ReactFlowProvider>
  );
}

export default ImprovedMindMap;
