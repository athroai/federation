import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  addEdge,
  MarkerType,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  ReactFlowInstance,
  NodeTypes,
  OnConnectStart,
  OnConnectEnd,
  ConnectionMode,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  XYPosition,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { v4 as uuidv4 } from 'uuid';
import { HexColorPicker } from 'react-colorful';
import { toPng } from 'html-to-image';

import TextNode from './nodes/TextNode';
import MediaNode from './nodes/MediaNode';
import NodeOptionsModal from './modals/NodeOptionsModal';
import ConnectionOptionsModal from './modals/ConnectionOptionsModal';
import InstructionPanel from './InstructionPanel';

// Custom node types
const nodeTypes = {
  textNode: TextNode,
  mediaNode: MediaNode
};

interface MindMapEditorProps {
  athroId: string;
  subject: string;
  initialData?: {
    topic: string;
    rootNode: any;
  };
  onSave: (data: { topic: string; rootNode: any }) => void;
  onBack: () => void;
}

const MindMapEditor: React.FC<MindMapEditorProps> = ({
  athroId,
  subject,
  initialData,
  onSave,
  onBack
}) => {
  // State for the flow
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [topic, setTopic] = useState(initialData?.topic || 'My Mind Map');
  
  // Get the react flow instance and wrapper
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // Track connection start for drag-to-create functionality
  const [connectionStartNode, setConnectionStartNode] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  // Connection tracking for drag-to-create feature
  interface ConnectionStartType {
    id: string;
    handleType: string;
    nodeType?: string;
    nodeColor?: string;
  }
  const [connectionStart, setConnectionStart] = useState<ConnectionStartType | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [showNodeOptions, setShowNodeOptions] = useState(false);
  const [showEdgeOptions, setShowEdgeOptions] = useState(false);
  const [showInstructions, setShowInstructions] = useState(!initialData);
  
  // Refs
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project, getNodes, getEdges } = useReactFlow();

  // Convert hierarchical mind map data to flat React Flow structure
  useEffect(() => {
    if (initialData?.rootNode) {
      const processedData = processHierarchicalData(initialData.rootNode);
      setNodes(processedData.nodes);
      setEdges(processedData.edges);
    } else {
      // Create a default central node if no data
      const defaultNode = {
        id: uuidv4(),
        type: 'textNode',
        position: { x: 250, y: 200 },
        data: { 
          label: 'Central Idea',
          color: '#e4c97e',
          notes: '',
          media: []
        }
      };
      setNodes([defaultNode]);
    }
  }, [initialData]);

  // Process hierarchical data to React Flow format
  const processHierarchicalData = (rootNode: any, parentId?: string, offsetX = 0, offsetY = 0) => {
    let allNodes: Node[] = [];
    let allEdges: Edge[] = [];
    
    // Process the current node
    const currentNode: Node = {
      id: rootNode.id || uuidv4(),
      type: rootNode.media && rootNode.media.length > 0 ? 'mediaNode' : 'textNode',
      position: { x: offsetX, y: offsetY },
      data: {
        label: rootNode.label || 'Node',
        color: rootNode.color || '#4fc38a',
        notes: rootNode.notes || '',
        media: rootNode.media || []
      }
    };
    
    allNodes.push(currentNode);
    
    // Create edge if there's a parent
    if (parentId) {
      allEdges.push({
        id: `e${parentId}-${currentNode.id}`,
        source: parentId,
        target: currentNode.id,
        type: 'smoothstep',
        animated: false,
        style: { stroke: currentNode.data.color },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: currentNode.data.color,
        },
      });
    }
    
    // Process children if any
    if (rootNode.children && rootNode.children.length > 0) {
      const childWidth = 300;
      const childSpacing = 120;
      const startX = offsetX - ((rootNode.children.length - 1) * childSpacing) / 2;
      
      rootNode.children.forEach((child: any, index: number) => {
        const childX = startX + index * childSpacing;
        const childY = offsetY + 150;
        
        const childData = processHierarchicalData(
          child, 
          currentNode.id, 
          childX, 
          childY
        );
        
        allNodes = [...allNodes, ...childData.nodes];
        allEdges = [...allEdges, ...childData.edges];
      });
    }
    
    return { nodes: allNodes, edges: allEdges };
  };

  // Convert React Flow data to hierarchical structure for saving
  const prepareDataForSave = () => {
    const allNodes = getNodes();
    const allEdges = getEdges();
    
    // Find root nodes (nodes with no incoming edges)
    const targetNodeIds = allEdges.map(edge => edge.target);
    const rootNodeIds = allNodes
      .filter(node => !targetNodeIds.includes(node.id))
      .map(node => node.id);
    
    // If no obvious root, pick the first node
    const rootId = rootNodeIds.length > 0 ? rootNodeIds[0] : allNodes[0]?.id;
    
    const buildHierarchy = (nodeId: string): any => {
      const node = allNodes.find(n => n.id === nodeId);
      if (!node) return null;
      
      // Find all children of this node
      const childEdges = allEdges.filter(edge => edge.source === nodeId);
      const children = childEdges
        .map(edge => buildHierarchy(edge.target))
        .filter(Boolean);
      
      return {
        id: node.id,
        label: node.data.label,
        color: node.data.color,
        notes: node.data.notes,
        media: node.data.media,
        children
      };
    };
    
    return {
      topic,
      rootNode: buildHierarchy(rootId)
    };
  };

  // Handle node changes (position, selection, deletion)
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    
    // Check if a node was selected or deselected
    const selectChange = changes.find(
      change => change.type === 'select'
    );
    
    if (selectChange && 'id' in selectChange) {
      if (selectChange.selected) {
        const selectedNode = nodes.find(node => node.id === selectChange.id);
        setSelectedNode(selectedNode || null);
      } else {
        setSelectedNode(null);
      }
    }
  }, [nodes]);

  // Handle edge changes (selection, deletion)
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    
    // Check if an edge was selected or deselected
    const selectChange = changes.find(
      change => change.type === 'select'
    );
    
    if (selectChange && 'id' in selectChange) {
      if (selectChange.selected) {
        const selectedEdge = edges.find(edge => edge.id === selectChange.id);
        setSelectedEdge(selectedEdge || null);
      } else {
        setSelectedEdge(null);
      }
    }
  }, [edges]);

  // Handle connection start - track when user starts dragging a connection
  const onConnectStart = useCallback((event: React.MouseEvent, { nodeId, handleType }) => {
    // Store the source node information for potential new node creation
    if (nodeId) {
      const sourceNode = nodes.find(n => n.id === nodeId);
      if (sourceNode) {
        setConnectionStart({
          id: nodeId,
          handleType,
          nodeType: sourceNode.type,
          nodeColor: sourceNode.data.color,
        });
      }
    }
  }, [nodes]);
  
  // Handle connection end - create a new node if dropped in empty space
  const onConnectEnd = useCallback((event: MouseEvent) => {
    if (!connectionStart || !reactFlowWrapper.current) return;
    
    // Get react flow bounds
    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    
    // Check if the target is a node or empty space
    const targetIsNode = (event.target as Element).classList.contains('react-flow__node');
    
    // If not dropped on a node, create a new node at that position
    if (!targetIsNode) {
      // Get the drop position in react flow coordinates
      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      
      const sourceNode = nodes.find(n => n.id === connectionStart.id);
      if (!sourceNode) return;
      
      // Create a new node
      const newNodeId = uuidv4();
      const newNode = {
        id: newNodeId,
        type: 'textNode',
        position,
        data: {
          label: 'New Node',
          color: sourceNode.data.color || '#4fc38a',
          notes: '',
          media: [],
        },
      };
      
      // Create a connection from the source to the new node
      const newEdge = {
        id: `e${connectionStart.id}-${newNodeId}`,
        source: connectionStart.id,
        target: newNodeId,
        type: 'smoothstep',
        animated: false,
        style: { stroke: sourceNode.data.color || '#4fc38a' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: sourceNode.data.color || '#4fc38a',
        },
      };
      
      // Add the new node and edge
      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => [...eds, newEdge]);
      
      // Select the new node and open options
      setSelectedNode(newNode);
      setShowNodeOptions(true);
    }
    
    // Reset connection start
    setConnectionStart(null);
  }, [connectionStart, nodes, project]);

  // Simple connection tracking for drag-to-create functionality
  const { project } = useReactFlow();
  
  // Handle connection start (when user starts dragging from a node handle)
  const onConnectStart = useCallback((_, { nodeId }) => {
    if (nodeId) setConnectionStartNode(nodeId);
  }, []);

  // Handle connection end (when user releases mouse after dragging)
  const onConnectEnd = useCallback((event) => {
    if (!connectionStartNode || !reactFlowWrapper.current) return;

    // Check if we're dropping on a node or empty space
    const targetIsNode = (event.target as Element)?.closest('.react-flow__node');
    
    // Only create new node if dropped in empty space
    if (!targetIsNode) {
      // Get React Flow instance bounds
      const { left, top } = reactFlowWrapper.current.getBoundingClientRect();
      
      // Calculate position in the viewport
      const position = project({
        x: event.clientX - left, 
        y: event.clientY - top
      });

      // Find source node to copy color/style
      const sourceNode = nodes.find(n => n.id === connectionStartNode);
      if (!sourceNode) return;

      // Generate unique ID for new node
      const newNodeId = `node-${uuidv4()}`;
      
      // Create a new node at that position
      const newNode = {
        id: newNodeId,
        position,
        type: 'textNode',
        data: {
          label: 'New Concept',
          color: sourceNode.data?.color || '#4fc38a',
          notes: '',
          media: []
        },
      };

      // Create an edge connecting source to new node
      const newEdge = {
        id: `edge-${connectionStartNode}-${newNodeId}`,
        source: connectionStartNode,
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

      // Add the new node and edge to the graph
      setNodes(nodes => [...nodes, newNode]);
      setEdges(edges => [...edges, newEdge]);
    }
    
    // Reset tracking
    setConnectionStartNode(null);
  }, [connectionStartNode, nodes, project]);

  // Handle new connections between existing nodes
  const onConnect = useCallback((connection: Connection) => {
    // Create a new edge with styling
    const edge = {
      ...connection,
      id: `e${connection.source}-${connection.target}`,
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
  }, []);

  // Handle creating a new node on double click
  const onDoubleClick = (event: React.MouseEvent) => {
    // Prevent if clicking on a node
    if ((event.target as Element).closest('.react-flow__node')) {
      return;
    }
    
    const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!reactFlowBounds) return;
    
    const position = project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top
    });

    const newNode = {
      id: uuidv4(),
      type: 'textNode',
      position,
      data: { 
        label: 'New Node',
        color: '#4fc38a',
        notes: '',
        media: []
      }
    };

    setNodes(nodes => [...nodes, newNode]);
    setSelectedNode(newNode);
    setShowNodeOptions(true);
  };

  // Handle node double click to open options modal
  const onNodeDoubleClick = (event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    setSelectedNode(node);
    setShowNodeOptions(true);
  };

  // Handle edge click to open edge options
  const onEdgeClick = (event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdge(edge);
    setShowEdgeOptions(true);
  };

  // Handle node edit from the options modal
  const handleNodeEdit = (updatedData: any) => {
    if (!selectedNode) return;
    
    setNodes(nodes => 
      nodes.map(node => 
        node.id === selectedNode.id 
          ? { 
              ...node, 
              data: { ...node.data, ...updatedData },
              type: updatedData.media?.length > 0 ? 'mediaNode' : 'textNode'
            } 
          : node
      )
    );
    
    setShowNodeOptions(false);
  };

  // Handle node deletion
  const handleNodeDelete = () => {
    if (!selectedNode) return;
    
    // Delete the node
    setNodes(nodes => nodes.filter(node => node.id !== selectedNode.id));
    
    // Also delete any connected edges
    setEdges(edges => edges.filter(
      edge => edge.source !== selectedNode.id && edge.target !== selectedNode.id
    ));
    
    setSelectedNode(null);
    setShowNodeOptions(false);
  };

  // Handle edge edit
  const handleEdgeEdit = (style: any) => {
    if (!selectedEdge) return;
    
    setEdges(edges => 
      edges.map(edge => 
        edge.id === selectedEdge.id 
          ? { 
              ...edge, 
              ...style,
              markerEnd: {
                ...edge.markerEnd,
                color: style.style.stroke,
              }
            } 
          : edge
      )
    );
    
    setShowEdgeOptions(false);
  };

  // Handle edge deletion
  const handleEdgeDelete = () => {
    if (!selectedEdge) return;
    
    setEdges(edges => edges.filter(edge => edge.id !== selectedEdge.id));
    setSelectedEdge(null);
    setShowEdgeOptions(false);
  };

  // Handle adding a child node
  const handleAddChildNode = () => {
    if (!selectedNode) return;
    
    const parentPos = selectedNode.position;
    const childId = uuidv4();
    
    const childNode = {
      id: childId,
      type: 'textNode',
      position: { 
        x: parentPos.x + 150, 
        y: parentPos.y + 100 
      },
      data: { 
        label: 'Child Node',
        color: selectedNode.data.color,
        notes: '',
        media: []
      }
    };
    
    const edge = {
      id: `e${selectedNode.id}-${childId}`,
      source: selectedNode.id,
      target: childId,
      type: 'smoothstep',
      animated: false,
      style: { stroke: selectedNode.data.color },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 15,
        height: 15,
        color: selectedNode.data.color,
      },
    };
    
    setNodes(nodes => [...nodes, childNode]);
    setEdges(edges => [...edges, edge]);
    setSelectedNode(childNode);
    setShowNodeOptions(true);
  };

  // Handle the save operation
  const handleSave = () => {
    const data = prepareDataForSave();
    onSave(data);
  };

  return (
    <div className="mind-map-editor" style={{ width: '100%', height: '100%' }}>
      <div className="mind-map-header" style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 15px',
        backgroundColor: '#17221c',
        borderBottom: '1px solid rgba(79, 195, 138, 0.3)'
      }}>
        <div className="left-controls">
          <button 
            onClick={onBack}
            style={{
              padding: '8px 12px',
              background: 'transparent',
              border: '1px solid #4fc38a',
              borderRadius: '4px',
              color: '#4fc38a',
              marginRight: '10px',
              cursor: 'pointer'
            }}
          >
            ← Back
          </button>
          
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Mind Map Title"
            style={{
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              color: 'white',
              width: '300px'
            }}
          />
        </div>
        
        <div className="right-controls">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            style={{
              padding: '8px 12px',
              background: 'transparent',
              border: '1px solid #e4c97e',
              borderRadius: '4px',
              color: '#e4c97e',
              marginRight: '10px',
              cursor: 'pointer'
            }}
          >
            {showInstructions ? 'Hide Instructions' : 'Show Instructions'}
          </button>
          
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              background: '#4fc38a',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Save Mind Map
          </button>
        </div>
      </div>
      
      <div className="mind-map-content" style={{ 
        display: 'flex',
        height: 'calc(100% - 70px)'
      }}>
        <div
          ref={reactFlowWrapper}
          style={{ flex: 1, height: '100%' }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            nodeTypes={nodeTypes}
            defaultViewport={{ x: 0, y: 0, zoom: 1.5 }}
            minZoom={0.2}
            maxZoom={4}
            deleteKeyCode={['Backspace', 'Delete']}
            multiSelectionKeyCode={['Control', 'Meta']}
            selectionKeyCode={['Shift']}
            connectionLineStyle={{ stroke: '#4fc38a', strokeWidth: 2 }}
            connectionLineType={ConnectionLineType.Bezier}
            defaultEdgeOptions={{
              style: { strokeWidth: 2, stroke: '#4fc38a' },
              type: 'smoothstep',
              animated: false,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 15,
                height: 15,
                color: '#4fc38a',
              },
            }}
            fitView
            style={{ background: 'rgba(11, 18, 14, 0.8)' }}
          >
            <Background color="#7a7a7a" gap={16} />
            <Controls />
            <MiniMap
              nodeStrokeColor={(n) => {
                if (n.data.color) return n.data.color;
                return '#4fc38a';
              }}
              nodeColor={(n) => {
                if (n.data.color) return n.data.color;
                return '#4fc38a';
              }}
              maskColor="rgba(0, 0, 0, 0.6)"
            />
            
            {showInstructions && (
              <Panel position="top-left">
                <InstructionPanel onClose={() => setShowInstructions(false)} />
              </Panel>
            )}
          </ReactFlow>
        </div>
        
        {showInstructions && (
          <div className="spaced-learning-tips" style={{
            width: '300px',
            height: '100%',
            backgroundColor: '#0b120e',
            borderLeft: '1px solid rgba(79, 195, 138, 0.3)',
            padding: '15px',
            overflowY: 'auto'
          }}>
            <h3 style={{ color: '#e4c97e', marginTop: 0 }}>Spaced Learning Tips</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
              Mind maps are powerful tools for organizing your knowledge. Here are some tips for effective learning:
            </p>
            <ul style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', paddingLeft: '20px' }}>
              <li>Put the main topic in the center</li>
              <li>Use colors to categorize related ideas</li>
              <li>Keep node text short and meaningful</li>
              <li>Add images to improve memory retention</li>
              <li>Review your mind map regularly for better recall</li>
              <li>Connect related concepts across branches</li>
              <li>Use the notes feature for additional details</li>
            </ul>
            <h3 style={{ color: '#e4c97e' }}>Keyboard Shortcuts</h3>
            <div style={{ 
              color: 'white', 
              fontSize: '14px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px'
            }}>
              <div>Double-click</div>
              <div>Create node</div>
              <div>Backspace</div>
              <div>Delete selected</div>
              <div>Ctrl+S</div>
              <div>Save mind map</div>
              <div>Mouse wheel</div>
              <div>Zoom in/out</div>
              <div>Drag</div>
              <div>Pan canvas</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Node Options Modal */}
      {showNodeOptions && selectedNode && (
        <NodeOptionsModal
          node={selectedNode}
          onClose={() => setShowNodeOptions(false)}
          onSave={handleNodeEdit}
          onDelete={handleNodeDelete}
          onAddChild={handleAddChildNode}
        />
      )}
      
      {/* Edge Options Modal */}
      {showEdgeOptions && selectedEdge && (
        <ConnectionOptionsModal
          edge={selectedEdge}
          onClose={() => setShowEdgeOptions(false)}
          onSave={handleEdgeEdit}
          onDelete={handleEdgeDelete}
        />
      )}
    </div>
  );
};

// Wrap with ReactFlowProvider to avoid initialization issues
const WrappedMindMapEditor: React.FC<MindMapEditorProps> = (props) => {
  return (
    <ReactFlowProvider>
      <MindMapEditor {...props} />
    </ReactFlowProvider>
  );
};

export default WrappedMindMapEditor;
