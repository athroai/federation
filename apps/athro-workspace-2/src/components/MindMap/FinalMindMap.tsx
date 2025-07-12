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
  Position,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import NodeDetailsModal, { NodeMedia } from './NodeDetailsModal';
import SupabaseStudyService from '../../services/SupabaseStudyService';
import type { MindMap as MindMapType, MindMapNode } from '../../types/study';
import { formatCurrentDate } from '../../utils/dateUtils';

// Extend the MindMapNode type with additional properties for our UI
interface ExtendedMindMapNode extends MindMapNode {
  notes?: string;
  media?: NodeMedia[];
  color?: string;
}

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

const createInitialNodes = (): Node<NodeData>[] => [
  // Start node (the central mind map concept)
  {
    id: 'start-node',
    type: 'mindmapNode',
    position: { x: 0, y: 0 },
    data: { 
      label: 'Main Concept', 
      notes: '',
      media: [],
      color: COLORS.main,
      parentId: null,
      onNodeClick: () => {}
    },
    style: {
      width: 180,
    }
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

    // Prioritize images and videos
    // Sort media to put images and videos first
    const sortedMedia = [...media].sort((a, b) => {
      // Images first
      if (a.type === 'image' && b.type !== 'image') return -1;
      if (a.type !== 'image' && b.type === 'image') return 1;
      // Then videos
      if (a.type === 'video' && b.type !== 'video') return -1;
      if (a.type !== 'video' && b.type === 'video') return 1;
      return 0;
    });
    
    // Get the first item to feature
    const featuredItem = sortedMedia[0];
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
              src={featuredItem.fileData || featuredItem.url} 
              alt={featuredItem.title || 'Image'} 
              style={{ 
                width: '100%',
                height: '80px',
                objectFit: 'cover',
                display: 'block',
                borderTop: '1px solid rgba(255,255,255,0.15)',
                borderBottom: '1px solid rgba(0,0,0,0.2)',
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
        // For video, show an actual video element that can be played
        return (
          <div className="media-preview" style={{ 
            marginTop: '10px',
            position: 'relative',
            borderRadius: '4px',
            overflow: 'hidden',
            height: '80px',
            width: '100%',
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            {featuredItem.fileData ? (
              // Show actual video if fileData is available
              <video 
                src={featuredItem.fileData} 
                style={{ 
                  width: '100%',
                  height: '80px',
                  objectFit: 'cover',
                }} 
                preload="metadata"
                muted
                playsInline
              />
            ) : (
              // Fallback to icon if no file data
              <>
                <div style={{ fontSize: '24px', marginBottom: '5px' }}>🎬</div>
                <div style={{ fontSize: '10px', opacity: 0.8, color: 'white' }}>{featuredItem.title || 'Video'}</div>
              </>
            )}
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
                zIndex: 2,
              }}>
                +{media.length - 1}
              </div>
            )}
            {/* Play button overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.3)',
              zIndex: 1,
            }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                ▶️
              </div>
            </div>
          </div>
        );
      case 'pdf':
        return (
          <div className="media-preview" style={{ 
            marginTop: '10px',
            position: 'relative',
            borderRadius: '4px',
            overflow: 'hidden',
            height: '80px',
            background: 'rgba(180, 30, 30, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: 'white',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '5px' }}>📑</div>
            <div style={{ fontSize: '10px', opacity: 0.8 }}>{featuredItem.title || 'PDF'}</div>
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
            borderTop: '1px solid rgba(255,255,255,0.1)',
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

// Props interface for the mind map
interface MindMapFlowProps {
  athroId?: string;
  subject?: string;
  sessionId: string;
  onSaved?: () => void;
  editMindMapId?: string; // ID of mind map to edit
}

// Main component
function MindMapFlow({ athroId = 'current-user', subject = 'Mind Mapping', sessionId, onSaved, editMindMapId }: MindMapFlowProps) {
  // Log received props for debugging
  console.log('MindMapFlow initialized with athroId:', athroId, 'subject:', subject, 'editMindMapId:', editMindMapId);
  // Refs
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // ReactFlow utility functions
  const { project } = useReactFlow();
  
  // Use a dynamic initial state
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(createInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Keep track of whether we've loaded an existing mind map
  const [hasLoadedMindMap, setHasLoadedMindMap] = useState(false);
  
  // State for node details modal and UI
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nextBranchColorIndex, setNextBranchColorIndex] = useState(1);
  const [isDirty, setIsDirty] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  
  // Track active connection
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStartNode, setConnectionStartNode] = useState<string | null>(null);
  const [connectionStartHandle, setConnectionStartHandle] = useState<string | null>(null);
  
  // Function to load a mind map from storage
  const loadMindMap = useCallback(async (mindMapId: string) => {
    try {
      console.log(`Loading mind map with ID ${mindMapId}`);
      const mindMap = await SupabaseStudyService.getMindMapById(mindMapId);
      if (!mindMap || !mindMap.rootNode) {
        console.error('Failed to load mind map or root node missing');
        return;
      }
      
      console.log('Loaded mind map:', mindMap);
      
      // Convert the saved tree structure back to reactflow nodes and edges
      const newNodes: Node<NodeData>[] = [];
      const newEdges: Edge[] = [];
      
      // Helper function to recursively convert nodes
      const convertNode = (node: any, position: { x: number, y: number }, parentId: string | null = null) => {
        // Use the saved position if available, otherwise calculate one
        const nodePosition = node.position || position;
        
        const newNode: Node<NodeData> = {
          id: node.id,
          type: 'mindmapNode',
          position: nodePosition,
          data: {
            label: node.label || 'Unnamed Node',
            notes: node.notes || '',
            media: node.media || [],
            color: node.color || COLORS.main,
            parentId,
            onNodeClick: openNodeDetails // Use the actual handler here
          }
        };
        
        newNodes.push(newNode);
        
        // SKIP creating default edges here - we'll use saved edge data instead
        // Only add parent relationship without creating edges
        
        // Calculate child positions based on number of children
        if (node.children && node.children.length > 0) {
          const childCount = node.children.length;
          const radius = 150 * Math.max(1, childCount / 2); // Adjust radius based on number of children
          
          // Place children in a rough circle around this node
          node.children.forEach((child: any, index: number) => {
            // Calculate angle for this child (distribute children evenly)
            const angle = (index / childCount) * 2 * Math.PI;
            
            // Calculate position based on angle and radius
            const childX = position.x + radius * Math.cos(angle);
            const childY = position.y + radius * Math.sin(angle);
            
            convertNode(child, { x: childX, y: childY }, node.id);
          });
        }
      };
      
      // ENHANCED: Restore saved edge data to preserve line shapes
      const restoreEdges = () => {
        if (mindMap.edgeData && mindMap.edgeData.length > 0) {
          console.log('Restoring', mindMap.edgeData.length, 'saved edges with preserved line shapes');
          // Use the exact saved edge configurations
          mindMap.edgeData.forEach((savedEdge: any) => {
            const edge: Edge = {
              id: savedEdge.id,
              source: savedEdge.source,
              target: savedEdge.target,
              type: savedEdge.type || 'smoothstep',
              style: savedEdge.style || { strokeWidth: 3 },
              markerEnd: savedEdge.markerEnd || {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20
              },
                             animated: savedEdge.animated || false,
               sourceHandle: savedEdge.sourceHandle ?? undefined,
               targetHandle: savedEdge.targetHandle ?? undefined,
               data: savedEdge.data || {}
            };
            newEdges.push(edge);
          });
        } else {
          console.log('No saved edge data found, creating basic edges for backward compatibility');
          // Fallback: create basic edges for older mind maps without edge data
          newNodes.forEach(node => {
            if (node.data.parentId) {
              const edge: Edge = {
                id: `e-${node.data.parentId}-${node.id}`,
                source: node.data.parentId,
                target: node.id,
                type: 'smoothstep',
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20
                },
                style: { stroke: node.data.color || COLORS.main, strokeWidth: 3 },
                animated: false,
              };
              newEdges.push(edge);
            }
          });
        }
      };
      
      // Start with the root node at center
      convertNode(mindMap.rootNode, { x: 0, y: 0 });
      
      // ENHANCED: Restore edges with preserved line shapes
      restoreEdges();
      
      // Update the state with our loaded nodes and edges
      setNodes(newNodes);
      setEdges(newEdges);
      
      // Update the node color map based on loaded nodes
      const colorMap = new Map<string, string>();
      newNodes.forEach(node => {
        colorMap.set(node.id, node.data.color || COLORS.main);
      });
      setNodeColorMap(colorMap);
      
      // Set start node title as the main concept
      const startNode = newNodes.find(n => n.id === 'start-node');
      if (startNode && startNode.data.label) {
        document.title = `Mind Map: ${startNode.data.label}`;
      }
      
      // Mark that we've loaded a mind map
      setHasLoadedMindMap(true);
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to load mind map:', error);
    }
  }, []);  // Empty dependency array since this doesn't depend on state
  
  // Load the mind map if editMindMapId is provided
  useEffect(() => {
    if (editMindMapId && !hasLoadedMindMap) {
      console.log(`Effect triggered: Loading mind map ${editMindMapId}`);
      loadMindMap(editMindMapId);
    }
  }, [editMindMapId, loadMindMap, hasLoadedMindMap]);
  
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
  
  // Update all nodes with the click handler when it changes or when nodes are loaded
  useEffect(() => {
    if (nodes.length > 0) {
      setNodes(nds => 
        nds.map(node => ({
          ...node, 
          data: { 
            ...node.data, 
            onNodeClick: openNodeDetails 
          }
        }))
      );
    }
  }, [openNodeDetails, setNodes, nodes.length]);
  
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
  const handleSaveMindMap = useCallback(async () => {
    try {
      // First we need to serialize the nodes and edges data structure
      // First make sure we have a valid state to save
      console.log('Handle save mind map called, node count:', nodes.length);
      if (nodes.length === 0) {
        console.error('No nodes to save');
        alert('Error: No nodes to save. Please try refreshing the page.');
        return;
      }
      
      // Convert the complex nodes data to a data structure that can be saved
      // and will be compatible with the MindMapNode type from our types
      
      // Helper function to build a tree structure from our nodes
      // This function needs to include all important data from the nodes
      const buildNodeTree = (nodeId: string): any => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) {
          console.error(`Node ${nodeId} not found during save process`);
          return { id: nodeId, label: 'Unknown Node', children: [] };
        }
        
        // Find child nodes (nodes whose parentId points to this node)
        const childNodes = nodes.filter(n => n.data.parentId === nodeId);
        
        // Include ALL node data for saving, including position
        return {
          id: node.id,
          label: node.data.label,
          notes: node.data.notes,
          media: node.data.media || [],
          color: node.data.color,
          position: { x: node.position.x, y: node.position.y },
          children: childNodes.map(child => buildNodeTree(child.id))
        };
      };
      
      // ENHANCED: Also save edge information to preserve line shapes
      const saveEdgeData = () => {
        return edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type || 'smoothstep',
          style: edge.style || {},
          markerEnd: edge.markerEnd || {},
          animated: edge.animated || false,
          sourceHandle: edge.sourceHandle || undefined,
          targetHandle: edge.targetHandle || undefined,
          data: edge.data || {}
        }));
      };
      
      // Get the root/start node
      const rootStartNode = nodes.find(node => node.id === 'start-node');
      if (!rootStartNode) {
        console.error('Root start-node not found!', nodes.map(n => n.id).join(', '));
        alert('Error: Could not find the main node. Please try refreshing the page.');
        return;
      }
      
      // Create our root node structure with edge data
      const rootNode = buildNodeTree('start-node');
      const edgeData = saveEdgeData();
      
      // For debugging
      console.log('Root node structure:', JSON.stringify(rootNode, null, 2));
      console.log('Edge data preserved:', edgeData.length, 'edges');
      console.log('Node list length:', nodes.length);
      console.log('Is dirty?', isDirty);
      
      // Create a title from the root node and current date
      // We've already verified root node exists above, just continue
      const rootNodeLabel = rootStartNode.data.label || 'Mind Map';
      const title = `${rootNodeLabel} - ${formatCurrentDate()}`;
      
      // Check if we're editing an existing mind map
      let mindMapId: string | undefined = editMindMapId;
      
      // If we're in edit mode, use that ID
      if (editMindMapId) {
        console.log(`Editing existing mind map: ${editMindMapId}`);
      } else {
        // We're creating a brand new mind map
        console.log('Creating a brand new mind map');
        mindMapId = undefined; // This will force creating a new mind map
      }
      
      if (mindMapId) {
        // Update existing mind map - use try/catch for more detailed error handling
        try {
          // When updating, make sure to include the current athroId and subject AND edge data
          const result = await SupabaseStudyService.updateMindMap(mindMapId, {
            athroId: String(athroId).trim(),
            subject: String(subject).trim(),
            topic: title,
            rootNode,
            edgeData: edgeData  // PRESERVE EDGE INFORMATION
          } as any);
          console.log('Update result:', result);
        } catch (updateError) {
          console.error('Specific update error:', updateError);
          throw updateError; // Re-throw to be caught by outer try/catch
        }
        console.log('Updated existing mind map:', mindMapId);
        // Force refresh the sidebar after saving
        try {
          window.dispatchEvent(new Event('mindmap_saved'));
          // Force reload MindMapList component
          const event = new CustomEvent('refresh_mindmaplist', { detail: { time: Date.now() } });
          window.dispatchEvent(event);
        } catch (e) {
          console.error('Error dispatching refresh event:', e);
        }
      } else {
        // Create new mind map - with more detailed error handling
        try {
          // Use the prop values for athroId and subject
          // CRITICAL: Explicitly log and use exact values to ensure correct storage
          console.log(`Creating new mind map with direct values:`);
          console.log(`- athroId: "${athroId}"`);
          console.log(`- subject: "${subject}"`);
          console.log(`- topic: "${title}"`);
          
          // Force case-sensitive exact values
          const exactAthroId = String(athroId).trim();
          const exactSubject = String(subject).trim();
          
          // Convert pending-session to temp-session like other modules
          const effectiveSessionId = sessionId === 'pending-session' ? 'temp-session' : sessionId;
          
          const newMindMap = await SupabaseStudyService.createMindMap({
            athroId: exactAthroId,
            subject: exactSubject,
            topic: title,
            rootNode,
            edgeData: edgeData  // PRESERVE EDGE INFORMATION
          }, effectiveSessionId);
          
          // After save, update the loaded state to prevent further reloading
          console.log('Creation result:', newMindMap);
          if (newMindMap && newMindMap.id) {
          setHasLoadedMindMap(true);
          mindMapId = newMindMap.id;
          } else {
            throw new Error('Failed to create mind map - no ID returned');
          }
        } catch (createError) {
          console.error('Specific creation error:', createError);
          throw createError; // Re-throw to be caught by outer try/catch
        }
        
        // ID is already stored in the try block
        console.log('Created new mind map:', mindMapId);
      }
      
      // Force refresh the sidebar after saving regardless of create/update
      try {
        window.dispatchEvent(new Event('mindmap_saved'));
        // Force reload MindMapList component
        const event = new CustomEvent('refresh_mindmaplist', { detail: { time: Date.now() } });
        window.dispatchEvent(event);
      } catch (e) {
        console.error('Error dispatching refresh event:', e);
      }
      
      // Show saved confirmation
      setShowSavedMessage(true);
      setTimeout(() => setShowSavedMessage(false), 2000);
      setIsDirty(false);
      
      // If onSaved callback is provided, call it
      if (onSaved) {
        console.log('Mind map saved, triggering onSaved callback');
        onSaved();
      }
    } catch (error) {
      console.error('Error saving mind map:', error);
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
    }
  }, [nodes]);
  
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
        {showErrorMessage && (
          <div style={{
            background: 'rgba(231, 115, 115, 0.9)',
            padding: '8px 15px',
            borderRadius: '4px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span>✗</span> Failed to save mind map. Please try again.
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
interface FinalMindMapProps {
  athroId?: string;
  subject?: string;
  sessionId: string;
  onSaved?: () => void;
  editMindMapId?: string; // ID of mind map to edit
}

function FinalMindMap({ athroId, subject, sessionId, onSaved, editMindMapId }: FinalMindMapProps) {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '100%' }}>
        <MindMapFlow 
          athroId={athroId} 
          subject={subject} 
          sessionId={sessionId}
          onSaved={onSaved}
          editMindMapId={editMindMapId}
        />
      </div>
    </ReactFlowProvider>
  );
}

export default FinalMindMap;
