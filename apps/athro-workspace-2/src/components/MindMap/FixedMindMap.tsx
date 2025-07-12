import { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeProps,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType,
  Connection,
  addEdge,
  EdgeChange,
  NodeChange,
  ConnectionMode,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import NodeDetailsModal, { NodeMedia } from './NodeDetailsModal';
import StudyService from '../../services/StudyService';
import { MindMap as MindMapType, MindMapNode as MindMapNodeType } from '../../types/study';

// Define our color palette
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

interface NodeData {
  label: string;
  color: string;
  parentId: string | null;
  notes: string;
  media: NodeMedia[];
  onNodeClick?: (nodeId: string) => void;
}

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

// Custom node component with 8 connection points and elegant media previews
const MindMapNode = ({ id, data, isConnectable }: NodeProps<NodeData>) => {
  const onNodeClick = () => {
    if (data.onNodeClick) {
      data.onNodeClick(id);
    }
  };

  // Function to render appropriate media previews
  const renderMediaPreview = (media: NodeMedia[]) => {
    if (!media || media.length === 0) return null;

    // Get the first item to feature
    const featuredItem = media[0];
    const hasMore = media.length > 1;

    switch (featuredItem.type) {
      case 'image':
        return (
          <div className="media-preview" style={{ 
            marginTop: '10px',
            position: 'relative',
            borderRadius: '4px',
            overflow: 'hidden',
            maxHeight: '80px',
          }}>
            <img 
              src={featuredItem.url} 
              alt={featuredItem.title || 'Image'} 
              style={{ 
                width: '100%',
                height: '80px',
                objectFit: 'cover',
                display: 'block'
              }}
            />
            {hasMore && (
              <div style={{ 
                position: 'absolute', 
                bottom: '5px', 
                right: '5px',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '10px',
              }}>
                +{media.length - 1}
              </div>
            )}
          </div>
        );
      case 'video':
        return (
          <div className="media-preview" style={{ 
            marginTop: '10px',
            position: 'relative',
            borderRadius: '4px',
            overflow: 'hidden',
            height: '60px',
            background: '#111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ fontSize: '20px' }}>🎬</div>
            {hasMore && (
              <div style={{ 
                position: 'absolute', 
                bottom: '5px', 
                right: '5px',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '10px',
              }}>
                +{media.length - 1}
              </div>
            )}
          </div>
        );
      case 'pdf':
        return (
          <div className="media-preview" style={{ 
            marginTop: '10px',
            position: 'relative',
            borderRadius: '4px',
            overflow: 'hidden',
            height: '60px',
            background: '#300',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}>
            <div style={{ fontSize: '20px' }}>📑</div>
            {hasMore && (
              <div style={{ 
                position: 'absolute', 
                bottom: '5px', 
                right: '5px',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '10px',
              }}>
                +{media.length - 1}
              </div>
            )}
          </div>
        );
      case 'link':
        return (
          <div className="media-preview" style={{ 
            marginTop: '10px',
            position: 'relative',
            borderRadius: '4px',
            overflow: 'hidden',
            padding: '8px 10px',
            fontSize: '11px',
            background: 'rgba(0,0,0,0.2)',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}>
            <span style={{ marginRight: '5px' }}>🔗</span>
            {featuredItem.title || new URL(featuredItem.url).hostname}
            {hasMore && (
              <span style={{ 
                marginLeft: '5px',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '10px',
              }}>
                +{media.length - 1}
              </span>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Function to render notes preview
  const renderNotesPreview = (notes: string) => {
    if (!notes) return null;

    // Limit to 50 characters
    const trimmedNotes = notes.length > 50 ? `${notes.substring(0, 47)}...` : notes;

    return (
      <div style={{
        fontSize: '10px',
        padding: '6px',
        background: 'rgba(0,0,0,0.15)',
        borderRadius: '4px',
        marginTop: '6px',
        fontStyle: 'italic',
        lineHeight: '1.4',
      }}>
        {trimmedNotes}
      </div>
    );
  };

  return (
    <div
      className="mindmap-node"
      style={{
        background: data.color,
        color: 'white',
        padding: '10px',
        borderRadius: '8px',
        minWidth: '180px',
        maxWidth: '240px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(5px)',
        fontFamily: '"Inter", "Segoe UI", sans-serif',
      }}
      onClick={onNodeClick}
    >
      {/* Node title - styled more professionally */}
      <div style={{ 
        fontWeight: '500', 
        fontSize: '13px',
        letterSpacing: '0.2px',
        textTransform: 'capitalize',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: '6px',
        marginBottom: '4px'
      }}>
        {data.label}
      </div>
      
      {/* Media preview section */}
      {renderMediaPreview(data.media)}
      
      {/* Notes preview if available */}
      {renderNotesPreview(data.notes)}
      
      {/* 8 connection handles around the node */}
      {/* Top and bottom handles */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={{ background: '#fff', width: 10, height: 10, top: -5, left: '25%' }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-right"
        style={{ background: '#fff', width: 10, height: 10, top: -5, left: '75%' }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: '#fff', width: 10, height: 10, bottom: -5, left: '25%' }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-right"
        style={{ background: '#fff', width: 10, height: 10, bottom: -5, left: '75%' }}
        isConnectable={isConnectable}
      />
      
      {/* Left and right handles */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{ background: '#fff', width: 10, height: 10, left: -5, top: '25%' }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-bottom"
        style={{ background: '#fff', width: 10, height: 10, left: -5, top: '75%' }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: '#fff', width: 10, height: 10, right: -5, top: '25%' }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-bottom"
        style={{ background: '#fff', width: 10, height: 10, right: -5, top: '75%' }}
        isConnectable={isConnectable}
      />

      {/* Small indicator icons at the bottom with counter */}
      {(data.notes || (data.media && data.media.length > 0)) && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          gap: '8px', 
          marginTop: '8px',
          fontSize: '10px',
          opacity: 0.7,
        }}>
          {data.notes && (
            <span title="Has notes" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: 'rgba(0,0,0,0.2)',
              padding: '2px 5px',
              borderRadius: '10px',
            }}>
              📝
            </span>
          )}
          {data.media && data.media.length > 0 && (
            <span title={`Has ${data.media.length} media items`} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: 'rgba(0,0,0,0.2)',
              padding: '2px 5px',
              borderRadius: '10px',
            }}>
              📎 {data.media.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Register the custom node type
const nodeTypes = { mindmapNode: MindMapNode };

// Main component
function MindMapFlow() {
  // Refs
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // ReactFlow utility functions
  const { project, getNodes, getEdges } = useReactFlow();
  
  // State for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // State for node details modal and UI
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nextBranchColorIndex, setNextBranchColorIndex] = useState(1);
  const [isDirty, setIsDirty] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  
  // Track active connection
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStartNode, setConnectionStartNode] = useState<string | null>(null);
  const [connectionStartHandle, setConnectionStartHandle] = useState<string | null>(null);
  
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

  // Custom handler for node changes to maintain connections
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Apply standard node changes
    onNodesChange(changes);
    
    // Set dirty state
    setIsDirty(true);
  }, [onNodesChange]);
  
  // Custom handler for edge changes to prevent accidental deletion
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    // Filter out 'remove' operations
    const allowedChanges = changes.filter(change => change.type !== 'remove');
    onEdgesChange(allowedChanges);
  }, [onEdgesChange]);
  
  // Function to open the node details modal
  const openNodeDetails = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
  }, []);
  
  // Track connection start
  const onConnectStart = useCallback((_: React.MouseEvent | React.TouchEvent, params: any) => {
    // Safely access nodeId and handleId
    const nodeId = params.nodeId || null;
    const handleId = params.handleId || null;
    
    setIsConnecting(true);
    setConnectionStartNode(nodeId);
    setConnectionStartHandle(handleId);
    document.body.style.cursor = 'grabbing';
  }, []);
  
  // When connecting handle is released
  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    document.body.style.cursor = 'default';
    setIsConnecting(false);
    
    // Validate if we're starting from a node
    if (!connectionStartNode || !reactFlowWrapper.current) {
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
    const parentId = connectionStartNode;
    const sourceHandleId = connectionStartHandle;
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
      type: 'default', // Using default type for better stability
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
    };
    
    // Update nodes and edges together to maintain relationship
    setNodes(nds => {
      const updatedNodes = [...nds, newNode];
      return updatedNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onNodeClick: openNodeDetails
        }
      }));
    });
    
    setEdges(eds => [...eds, newEdge]);
    setIsDirty(true);
    
    // Open the node details modal for the new node
    setSelectedNode(newNodeId);
  }, [
    connectionStartNode, 
    connectionStartHandle, 
    project, 
    getNodeColor, 
    openNodeDetails, 
    setNodes, 
    setEdges
  ]);
  
  // Handle node deletion
  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) return;
    
    // Delete the node
    setNodes(nodes => nodes.filter(n => n.id !== selectedNode));
    
    // Close the details modal
    setSelectedNode(null);
    setIsDirty(true);
  }, [selectedNode, setNodes]);
  
  // Handle regular connections between existing nodes
  const onConnect = useCallback((connection: Connection) => {
    // Determine color for the edge
    const sourceNode = nodes.find(n => n.id === connection.source);
    const edgeColor = sourceNode?.data.color || COLORS.main;
    
    // Update the target node's parent reference
    if (connection.source && connection.target) {
      setNodes(nodes => nodes.map(node => {
        if (node.id === connection.target) {
          // Update parentId in node data
          return {
            ...node,
            data: {
              ...node.data,
              parentId: connection.source as string,
              color: edgeColor,
            }
          };
        }
        return node;
      }));
      
      // Add the connection
      const edge = {
        ...connection,
        id: `edge-${connection.source}-${connection.target}`,
        type: 'default',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: edgeColor,
        },
        style: { stroke: edgeColor, strokeWidth: 3 },
        animated: false,
      };
      
      setEdges(eds => addEdge(edge, eds));
      setIsDirty(true);
    }
  }, [nodes, setNodes, setEdges]);
  
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
    try {
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
      setShowSavedMessage(true);
      setTimeout(() => setShowSavedMessage(false), 2000);
      setIsDirty(false);
      
      console.log('Mind map saved successfully');
    } catch (error) {
      console.error('Error saving mind map:', error);
    }
  }, [setNodes]);

  // Save the mind map
  const handleSaveMindMap = useCallback(() => {
    console.log('Saving mind map:', { nodes, edges });
    setShowSavedMessage(true);
    setTimeout(() => setShowSavedMessage(false), 2000);
    setIsDirty(false);
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
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        nodeTypes={nodeTypes}
        fitView
        connectionMode={ConnectionMode.Loose}
        connectionLineStyle={{ stroke: '#4fc38a', strokeWidth: 4, opacity: 0.8 }}
        style={{ background: 'rgb(17, 27, 22)' }}
        defaultEdgeOptions={{
          type: 'default',
          style: { strokeWidth: 3 },
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
function FixedMindMap() {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '100%' }}>
        <MindMapFlow />
      </div>
    </ReactFlowProvider>
  );
}

export default FixedMindMap;
