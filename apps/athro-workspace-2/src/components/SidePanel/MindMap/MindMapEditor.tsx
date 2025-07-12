import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MindMapNode } from '../../../types/study';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  Node,
  Edge,
  Connection,
  NodeTypes,
  Position,
  ReactFlowProvider,
  EdgeTypes,
  Panel,
  addEdge,
  MarkerType,
  ConnectionMode,
  useReactFlow,
  XYPosition,
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

// Import React Flow styles
import 'reactflow/dist/style.css';

// Import custom components and types
import MindMapNodeComponent from './MindMapNodeComponent';
import CustomEdgeComponent from './CustomEdgeComponent';
import NodeOptionsModal from './NodeOptionsModal';
import { NodeData, EdgeData, ExtendedMindMapNode, ConnectionPoint, MediaContent, NodeUpdateOptions } from './types';
import { NODE_COLORS, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from './constants';

interface MindMapEditorProps {
  initialValues?: {
    topic: string;
    rootNode: MindMapNode;
  };
  onSave: (data: { topic: string; rootNode: MindMapNode }) => void;
  onCancel: () => void;
}

// Define node types for ReactFlow
const nodeTypes: NodeTypes = {
  mindMapNode: MindMapNodeComponent,
};

// Define edge types for ReactFlow
const edgeTypes: EdgeTypes = {
  customEdge: CustomEdgeComponent,
};

// Helper function to create a new node with connection points
const createNode = (
  id: string,
  label: string,
  position: { x: number; y: number },
  isRoot: boolean = false
): Node<NodeData> => {
  const colorIndex = Math.floor(Math.random() * NODE_COLORS.length);
  return {
    id,
    type: 'mindMapNode',
    position,
    data: {
      label,
      color: NODE_COLORS[colorIndex],
      isRoot,
      connectionPoints: [],
      media: [],
      notes: '',
    },
  };
};

// Helper function to convert MindMapNode to ReactFlow nodes and edges
const mindMapNodeToReactFlow = (
  mindMapNode: MindMapNode,
  parentId?: string,
  position: { x: number; y: number } = { x: 0, y: 0 }
): { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] } => {
  const nodes: Node<NodeData>[] = [];
  const edges: Edge<EdgeData>[] = [];
  
  // Create the current node
  const currentNode = createNode(
    mindMapNode.id,
    mindMapNode.label,
    position,
    !parentId // If no parentId, this is the root node
  );
  
  nodes.push(currentNode);
  
  // Add edge from parent to this node if parent exists
  if (parentId) {
    edges.push({
      id: `${parentId}-${mindMapNode.id}`,
      source: parentId,
      target: mindMapNode.id,
      type: 'customEdge',
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
      data: {
        // Will be filled with edge-specific data if needed
      },
    });
  }
  
  // Process children recursively
  if (mindMapNode.children && mindMapNode.children.length > 0) {
    const childSpacing = 200; // Space between child nodes
    const totalWidth = (mindMapNode.children.length - 1) * childSpacing;
    const startX = position.x - totalWidth / 2;
    
    mindMapNode.children.forEach((child, index) => {
      const childPosition = {
        x: startX + index * childSpacing,
        y: position.y + 150, // Position children below parent
      };
      
      const { nodes: childNodes, edges: childEdges } = mindMapNodeToReactFlow(
        child,
        mindMapNode.id,
        childPosition
      );
      
      nodes.push(...childNodes);
      edges.push(...childEdges);
    });
  }
  
  return { nodes, edges };
};

// Convert ReactFlow nodes and edges back to MindMapNode structure
const reactFlowToMindMapNode = (
  nodes: Node<NodeData>[],
  edges: Edge<EdgeData>[],
  rootNodeId: string
): MindMapNode => {
  const nodeMap = new Map<string, Node<NodeData>>();
  nodes.forEach((node) => nodeMap.set(node.id, node));
  
  // Create a map of parent to children IDs
  const childrenMap = new Map<string, string[]>();
  edges.forEach((edge) => {
    const sourceId = edge.source;
    const targetId = edge.target;
    
    if (!childrenMap.has(sourceId)) {
      childrenMap.set(sourceId, []);
    }
    
    childrenMap.get(sourceId)!.push(targetId);
  });
  
  // Recursive function to build the tree
  const buildTree = (nodeId: string): MindMapNode => {
    const node = nodeMap.get(nodeId);
    if (!node) throw new Error(`Node with ID ${nodeId} not found`);
    
    const children: MindMapNode[] = [];
    const childrenIds = childrenMap.get(nodeId) || [];
    
    childrenIds.forEach((childId) => {
      children.push(buildTree(childId));
    });
    
    return {
      id: node.id,
      label: node.data.label,
      children,
    };
  };
  
  return buildTree(rootNodeId);
};

// Main MindMapEditor component
const MindMapEditor: React.FC<MindMapEditorProps> = ({
  initialValues,
  onSave,
  onCancel,
}) => {
  // State for topic name
  const [topic, setTopic] = useState<string>(initialValues?.topic || 'New Mind Map');
  
  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<EdgeData>([]);
  
  // State for modal
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showNodeOptions, setShowNodeOptions] = useState<boolean>(false);
  
  // State for tracking connection points and dragging
  const [dragSourceNode, setDragSourceNode] = useState<string | null>(null);
  const [dragSourcePoint, setDragSourcePoint] = useState<ConnectionPoint | null>(null);
  
  // Reference to the flow wrapper div
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  // Safely access useReactFlow within a component rendered inside ReactFlowProvider
  const reactFlowInstance = useReactFlow();
  const project = reactFlowInstance ? reactFlowInstance.project : (point: XYPosition) => point;
  
  // Initialize the mind map from initial values or create a default one
  useEffect(() => {
    if (initialValues?.rootNode) {
      const { nodes: initialNodes, edges: initialEdges } = mindMapNodeToReactFlow(
        initialValues.rootNode,
        undefined,
        { x: 250, y: 100 }
      );
      setNodes(initialNodes);
      setEdges(initialEdges);
    } else {
      // Create a default root node
      const rootNode = createNode(
        uuidv4(),
        'Main Topic',
        { x: 250, y: 100 },
        true
      );
      setNodes([rootNode]);
    }
  }, [initialValues, setNodes, setEdges]);
  
  // Handle connection creation
  const onConnect = useCallback(
    (connection: Connection) => {
      // Check if the connection already exists
      const connectionExists = edges.some(
        (edge) => edge.source === connection.source && edge.target === connection.target
      );
      
      if (!connectionExists) {
        setEdges((eds) =>
          addEdge(
            {
              ...connection,
              type: 'customEdge',
              markerEnd: {
                type: MarkerType.ArrowClosed,
              },
              data: {},
            },
            eds
          )
        );
      }
    },
    [edges, setEdges]
  );
  
  // Create a new child node when dragging from connection point
  const handleConnectionPointDrag = useCallback(
    (sourceNodeId: string, connectionPoint: ConnectionPoint, position: XYPosition) => {
      const sourceNode = nodes.find((node) => node.id === sourceNodeId);
      if (!sourceNode) return;
      
      // Create a new node at the drop position
      const newNodeId = uuidv4();
      const newNode = createNode(
        newNodeId,
        'New Node',
        position,
        false
      );
      
      // Add the new node and create a connection
      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) =>
        addEdge(
          {
            id: `${sourceNodeId}-${newNodeId}`,
            source: sourceNodeId,
            target: newNodeId,
            type: 'customEdge',
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
            data: {},
          },
          eds
        )
      );
      
      // Select the new node for editing
      setSelectedNode(newNodeId);
      setShowNodeOptions(true);
    },
    [nodes, setNodes, setEdges]
  );
  
  // Handle connection point drag start
  const handleConnectionPointDragStart = useCallback(
    (nodeId: string, connectionPoint: ConnectionPoint) => {
      setDragSourceNode(nodeId);
      setDragSourcePoint(connectionPoint);
    },
    []
  );
  
  // Handle connection point drag end
  const handleConnectionPointDragEnd = useCallback(
    (event: React.MouseEvent) => {
      if (dragSourceNode && dragSourcePoint && reactFlowWrapper.current) {
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const position = project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });
        
        handleConnectionPointDrag(dragSourceNode, dragSourcePoint, position);
      }
      
      setDragSourceNode(null);
      setDragSourcePoint(null);
    },
    [dragSourceNode, dragSourcePoint, project, handleConnectionPointDrag]
  );
  
  // Create a new node when double-clicking on the background
  const onDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (reactFlowWrapper.current) {
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const position = project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });
        
        const newNodeId = uuidv4();
        const newNode = createNode(
          newNodeId,
          'New Node',
          position,
          false
        );
        
        setNodes((nds) => [...nds, newNode]);
        
        // Select the new node for editing
        setSelectedNode(newNodeId);
        setShowNodeOptions(true);
      }
    },
    [project, setNodes]
  );
  
  // Handle node selection
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.stopPropagation();
      setSelectedNode(node.id);
      setShowNodeOptions(true);
    },
    []
  );
  
  // Handle edge deletion
  const handleEdgeDelete = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
    },
    [setEdges]
  );
  
  // Handle node label change
  const handleNodeLabelChange = useCallback(
    (nodeId: string, newLabel: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: newLabel,
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );
  
  // Handle node color change
  const handleNodeColorChange = useCallback(
    (nodeId: string, color: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                color,
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );
  
  // Handle node deletion
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      // Find all edges connected to this node
      const connectedEdges = edges.filter(
        (edge) => edge.source === nodeId || edge.target === nodeId
      );
      
      // Remove connected edges
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );
      
      // Remove the node
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setSelectedNode(null);
      setShowNodeOptions(false);
    },
    [edges, setEdges, setNodes]
  );
  
  // Handle adding a connection point to a node
  const handleAddConnectionPoint = useCallback(
    (nodeId: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            const newConnectionPoint: ConnectionPoint = {
              id: uuidv4(),
              position: Position.Right,
              x: DEFAULT_NODE_WIDTH,
              y: DEFAULT_NODE_HEIGHT / 2,
            };
            
            const connectionPoints = node.data.connectionPoints || [];
            
            return {
              ...node,
              data: {
                ...node.data,
                connectionPoints: [...connectionPoints, newConnectionPoint],
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );
  
  // Handle media update for a node
  const handleMediaUpdate = useCallback(
    (nodeId: string, media: MediaContent[]) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                media,
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );
  
  // Handle notes change for a node
  const handleNotesChange = useCallback(
    (nodeId: string, notes: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                notes,
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );
  
  // Add edge data to include delete function
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        data: {
          ...edge.data,
          onEdgeDelete: handleEdgeDelete,
        },
      }))
    );
  }, [handleEdgeDelete, setEdges]);
  
  // Add node data to include callback functions
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onNodeLabelChange: handleNodeLabelChange,
          onColorChange: handleNodeColorChange,
          onAddChild: handleAddConnectionPoint,
          onDelete: handleNodeDelete,
          onAddConnectionPoint: handleAddConnectionPoint,
          onMediaUpdate: handleMediaUpdate,
          onNotesChange: handleNotesChange,
        },
      }))
    );
  }, [
    handleNodeLabelChange,
    handleNodeColorChange,
    handleAddConnectionPoint,
    handleNodeDelete,
    handleMediaUpdate,
    handleNotesChange,
    setNodes,
  ]);
  
  // Find the root node ID
  const getRootNodeId = useCallback(() => {
    const rootNode = nodes.find((node) => node.data.isRoot);
    return rootNode ? rootNode.id : nodes[0]?.id;
  }, [nodes]);
  
  // Handle saving the mind map
  const handleSave = useCallback(() => {
    try {
      const rootNodeId = getRootNodeId();
      if (!rootNodeId) throw new Error('No root node found');
      
      const mindMapNode = reactFlowToMindMapNode(nodes, edges, rootNodeId);
      onSave({ topic, rootNode: mindMapNode });
    } catch (error) {
      console.error('Error saving mind map:', error);
    }
  }, [nodes, edges, topic, getRootNodeId, onSave]);
  
  // Handle updating node via modal
  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: NodeUpdateOptions) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...updates,
              },
            };
          }
          return node;
        })
      );
      setShowNodeOptions(false);
    },
    [setNodes]
  );
  
  return (
    <ReactFlowProvider>
      <div className="mind-map-editor-container" style={{ width: '100%', height: '600px' }}>
        <div className="mind-map-editor-header">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Mind Map Topic"
            className="mind-map-title-input"
            style={{ padding: '8px', fontSize: '16px', marginRight: '10px' }}
          />
          <div className="mind-map-actions">
            <button onClick={handleSave} className="save-button" style={{ 
              padding: '8px 16px', 
              backgroundColor: '#4fc38a', 
              color: 'white', 
              marginRight: '10px', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}>
              Save
            </button>
            <button onClick={onCancel} className="cancel-button" style={{ 
              padding: '8px 16px', 
              backgroundColor: '#e77373', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}>
              Cancel
            </button>
          </div>
        </div>
        
        <div ref={reactFlowWrapper} style={{ width: '100%', height: 'calc(100% - 50px)' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onDoubleClick={onDoubleClick}
            onNodeClick={onNodeClick}
            connectionMode={ConnectionMode.Loose}
            fitView
            onMouseMove={(e) => {
              // Handle connection point dragging
              if (dragSourceNode && dragSourcePoint) {
                // Implementation could show a preview line while dragging
              }
            }}
            onMouseUp={handleConnectionPointDragEnd}
          >
            <Controls />
            <MiniMap nodeStrokeWidth={3} />
            <Background color="#f0f0f0" gap={16} />
            <Panel position="top-right">
              <div className="mind-map-instructions">
                <p>Double-click to add a node</p>
                <p>Drag from connection points to create connected nodes</p>
                <p>Click on nodes to edit properties</p>
              </div>
            </Panel>
          </ReactFlow>
        </div>
        
        {showNodeOptions && selectedNode && (
          <NodeOptionsModal
            nodeId={selectedNode}
            node={nodes.find((n) => n.id === selectedNode)}
            onClose={() => setShowNodeOptions(false)}
            onUpdate={(updates) => handleNodeUpdate(selectedNode, updates)}
            onDelete={() => handleNodeDelete(selectedNode)}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
};

export default MindMapEditor;
