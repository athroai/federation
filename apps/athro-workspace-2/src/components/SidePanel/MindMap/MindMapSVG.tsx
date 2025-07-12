import React, { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { NodeDetailsModal } from './MindMapComponents';

interface MindMapSVGProps {
  initialData?: {
    topic: string;
    rootNode: any;
  };
  onSave?: (data: { topic: string; rootNode: any }) => void;
  onBack: () => void;
}

// Node data structure
interface Node {
  id: string;
  text: string;
  x: number;
  y: number;
  color?: string;
  notes?: string;
  media?: {
    type: 'image' | 'video' | 'link';
    url: string;
    title?: string;
  }[];
  connections: string[];
}

const MindMapSVG: React.FC<MindMapSVGProps> = ({ initialData, onSave, onBack }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [topic, setTopic] = useState(initialData?.topic || 'New Mind Map');
  
  // Main state for nodes
  const [nodes, setNodes] = useState<Node[]>(() => {
    if (initialData?.rootNode) {
      // Process the hierarchical rootNode into our flat structure
      const processedNodes: Node[] = [];
      
      const processNode = (node: any, x: number, y: number, parentId?: string) => {
        const id = node.id;
        console.log('Processing node:', node);
        const newNode: Node = {
          id,
          text: node.label || 'Node',
          x,
          y,
          connections: [],
          color: node.color,
          notes: node.notes,
          media: node.media || []
        };
        
        if (parentId) {
          const parent = processedNodes.find(n => n.id === parentId);
          if (parent) {
            parent.connections.push(id);
          }
        }
        
        processedNodes.push(newNode);
        
        // Process children
        if (node.children && node.children.length > 0) {
          const startX = x - ((node.children.length - 1) * 150) / 2;
          node.children.forEach((child: any, index: number) => {
            processNode(child, startX + index * 150, y + 150, id);
          });
        }
      };
      
      // Start with the root node
      processNode(initialData.rootNode, 300, 100);
      return processedNodes;
    }
    
    // Default to a single root node
    return [{
      id: uuidv4(),
      text: 'Main Topic',
      x: 300,
      y: 100,
      connections: [],
      color: '#4fc38a'
    }];
  });

  // State for interaction
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isEditingNode, setIsEditingNode] = useState(false);
  const [nodeDetails, setNodeDetails] = useState<{
    id: string;
    text: string;
    color: string;
    notes: string;
    media: {type: 'image' | 'video' | 'link', url: string, title?: string}[];
  } | null>(null);
  
  // Connection dragging state
  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{id: string, x: number, y: number} | null>(null);
  const [connectionEnd, setConnectionEnd] = useState<{x: number, y: number} | null>(null);
  
  // Panning state
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 });

  // Debug logging for initialData
  useEffect(() => {
    if (initialData?.rootNode) {
      console.log('Initial data in MindMapSVG:', initialData);
    }
  }, [initialData]);

  // Convert our flat node structure back to the hierarchical format for saving
  const prepareDataForSave = useCallback((): { topic: string; rootNode: any } | null => {
    // Find the root node (usually the first one)
    const rootNodeId = nodes.length > 0 ? nodes[0].id : null;
    if (!rootNodeId) return null;
    
    // Convert to hierarchical structure
    const buildHierarchy = (nodeId: string): any => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return null;
      
      return {
        id: node.id,
        label: node.text,
        color: node.color || '#4fc38a',
        notes: node.notes || '',
        media: node.media || [],
        children: node.connections.map(childId => buildHierarchy(childId)).filter(Boolean)
      };
    };
    
    const rootNode = buildHierarchy(rootNodeId);
    console.log('Prepared rootNode for save:', rootNode);
    
    return {
      topic,
      rootNode
    };
  }, [nodes, topic]);

  // Handle saving
  const handleSave = useCallback(() => {
    const data = prepareDataForSave();
    if (data && onSave) {
      onSave(data);
    }
  }, [prepareDataForSave, onSave]);

  // ===== MOUSE INTERACTION HANDLERS =====
  
  // Handle canvas double-click to add a new node
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current) return;
    
    // Prevent default behavior and stop propagation
    e.preventDefault();
    e.stopPropagation();
    
    // Get position relative to the SVG, accounting for panning
    const svgRect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - svgRect.left - panOffset.x;
    const y = e.clientY - svgRect.top - panOffset.y;
    
    console.log('Double-click detected at position:', x, y);
    
    // Create a new node
    const newId = uuidv4();
    const newNode: Node = {
      id: newId,
      text: 'New Node',
      x,
      y,
      connections: [],
      color: '#4fc38a'
    };
    
    setNodes(prevNodes => [...prevNodes, newNode]);
    
    // Open the edit modal for the new node
    setSelectedNode(newId);
    setNodeDetails({
      id: newId,
      text: 'New Node',
      color: '#4fc38a',
      notes: '',
      media: []
    });
    setIsEditingNode(true);
  }, [panOffset]);
  
  // Handle node double-click to edit details
  const handleNodeDoubleClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setSelectedNode(nodeId);
    setNodeDetails({
      id: nodeId,
      text: node.text,
      color: node.color || '#4fc38a',
      notes: node.notes || '',
      media: node.media || []
    });
    setIsEditingNode(true);
    
    console.log('Opening node for editing:', node);
  }, [nodes]);
  
  // Handle node click for selection
  const handleNodeClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    } else {
      setSelectedNode(nodeId);
    }
  }, [selectedNode]);
  
  // Start panning on middle mouse button or space+drag
  const handleMouseDownPan = useCallback((e: React.MouseEvent) => {
    // Only start panning on middle mouse button or when space is held
    if (e.button === 1 || e.button === 0) {
      e.preventDefault();
      setIsPanning(true);
      setLastPanPosition({ x: e.clientX, y: e.clientY });
    }
  }, []);
  
  // Handle node mouse down for connection dragging
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return; // Only left mouse button
    e.stopPropagation();
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Set up for dragging a connection
    setConnectionStart({
      id: nodeId,
      x: node.x + panOffset.x,
      y: node.y + panOffset.y
    });
  }, [nodes, panOffset]);
  
  // Handle mouse move for panning and connection dragging
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
      e.preventDefault();
      const deltaX = e.clientX - lastPanPosition.x;
      const deltaY = e.clientY - lastPanPosition.y;
      
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPosition({ x: e.clientX, y: e.clientY });
    } else if (connectionStart) {
      // Handle dragging a connection
      if (!svgRef.current) return;
      
      const svgRect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - svgRect.left;
      const y = e.clientY - svgRect.top;
      
      setConnectionEnd({ x, y });
      setIsDraggingConnection(true);
    }
  }, [isPanning, lastPanPosition, connectionStart]);
  
  // Handle mouse up for panning and connection completion
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
    }
    
    // Handle connection completion
    if (isDraggingConnection && connectionStart) {
      if (!svgRef.current) return;
      
      const svgRect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - svgRect.left;
      const y = e.clientY - svgRect.top;
      
      // Check if we're over an existing node
      const targetNode = nodes.find(node => {
        const dx = node.x + panOffset.x - x;
        const dy = node.y + panOffset.y - y;
        return Math.sqrt(dx*dx + dy*dy) < 50; // Node radius
      });
      
      if (targetNode) {
        // Connect to existing node
        setNodes(prevNodes => {
          return prevNodes.map(node => {
            if (node.id === connectionStart.id) {
              if (!node.connections.includes(targetNode.id)) {
                return {
                  ...node,
                  connections: [...node.connections, targetNode.id]
                };
              }
            }
            return node;
          });
        });
      } else {
        // Create a new node at the endpoint
        const newId = uuidv4();
        setNodes(prevNodes => {
          // Add the connection from the source node to this new node
          const updatedNodes = prevNodes.map(node => {
            if (node.id === connectionStart.id) {
              return {
                ...node,
                connections: [...node.connections, newId]
              };
            }
            return node;
          });
          
          // Add the new node
          return [
            ...updatedNodes, 
            {
              id: newId,
              text: 'New Node',
              x: x - panOffset.x,
              y: y - panOffset.y,
              connections: [],
              color: '#4fc38a'
            }
          ];
        });
        
        // Open edit modal for the new node
        setSelectedNode(newId);
        setNodeDetails({
          id: newId,
          text: 'New Node',
          color: '#4fc38a',
          notes: '',
          media: []
        });
        setIsEditingNode(true);
      }
    }
    
    setIsDraggingConnection(false);
    setConnectionStart(null);
    setConnectionEnd(null);
  }, [isPanning, isDraggingConnection, connectionStart, nodes, panOffset]);
  
  // Update node from the edit modal
  const handleUpdateNode = useCallback((details: {
    id: string;
    text: string;
    color: string;
    notes: string;
    media: {type: 'image' | 'video' | 'link', url: string, title?: string}[];
  }) => {
    setNodes(prevNodes => prevNodes.map(node => {
      if (node.id === details.id) {
        return {
          ...node,
          text: details.text,
          color: details.color,
          notes: details.notes,
          media: details.media
        };
      }
      return node;
    }));
    
    setIsEditingNode(false);
    setNodeDetails(null);
  }, []);
  
  // Set up document-level event listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  
  // ===== RENDERING FUNCTIONS =====
  
  // Render the node connection lines
  const renderLines = useCallback(() => {
    return nodes.flatMap(node => 
      node.connections.map(targetId => {
        const target = nodes.find(n => n.id === targetId);
        if (!target) return null;
        
        return (
          <line
            key={`${node.id}-${targetId}`}
            x1={node.x}
            y1={node.y}
            x2={target.x}
            y2={target.y}
            stroke={node.color || '#4fc38a'}
            strokeWidth={2}
            markerEnd="url(#arrowhead)"
          />
        );
      }).filter(Boolean)
    );
  }, [nodes]);
  
  // Render the active connection being dragged
  const renderActiveConnection = useCallback(() => {
    if (!connectionStart || !connectionEnd) return null;
    
    return (
      <line 
        x1={connectionStart.x}
        y1={connectionStart.y}
        x2={connectionEnd.x}
        y2={connectionEnd.y}
        stroke="#aaa"
        strokeWidth={2}
        strokeDasharray="5,5"
      />
    );
  }, [connectionStart, connectionEnd]);
  
  // Render media for a node
  const renderNodeMedia = useCallback((node: Node) => {
    if (!node.media || node.media.length === 0) return null;
    
    // Just show the first media item
    const media = node.media[0];
    
    if (media.type === 'image') {
      return (
        <foreignObject width="80" height="80" x="-40" y="-90">
          <div style={{ 
            width: '80px', 
            height: '80px', 
            overflow: 'hidden',
            borderRadius: '5px',
            border: '2px solid #333'
          }}>
            <img 
              src={media.url} 
              alt={media.title || 'Image'} 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>
        </foreignObject>
      );
    }
    
    return null;
  }, []);

  return (
    <div style={{ height: '600px', width: '100%', position: 'relative' }}>
      {/* Header with title input and buttons */}
      <div 
        style={{ 
          padding: '10px', 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '10px'
        }}
      >
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
            fontWeight: 'bold'
          }}
        />
        <div>
          <button
            onClick={onBack}
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
      
      {/* Main SVG canvas */}
      <div 
        style={{ 
          position: 'relative',
          backgroundColor: '#1a2820',
          border: '1px solid #444',
          borderRadius: '4px',
          overflow: 'hidden',
          height: 'calc(100% - 50px)'
        }}
      >
        <svg 
          ref={svgRef}
          width="100%" 
          height="100%"
          viewBox="0 0 1000 600"
          style={{ cursor: isPanning ? 'grabbing' : 'default' }}
          onMouseDown={handleMouseDownPan}
          onDoubleClick={handleCanvasDoubleClick}
        >
          {/* Define arrow marker for the connection lines */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#4fc38a" />
            </marker>
          </defs>
          
          {/* Transparent rect to capture events */}
          <rect 
            x="0" 
            y="0" 
            width="100%" 
            height="100%" 
            fill="transparent" 
            onDoubleClick={handleCanvasDoubleClick}
          />
          
          {/* Actual mind map content, wrapped in a g element for panning */}
          <g transform={`translate(${panOffset.x}, ${panOffset.y})`}>
            {renderLines()}
            {renderActiveConnection()}
            
            {nodes.map(node => (
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                {renderNodeMedia(node)}
                
                <circle 
                  r={selectedNode === node.id ? 55 : 50}
                  fill={node.color ? `${node.color}cc` : '#4fc38acc'}
                  stroke={node.color || '#4fc38a'}
                  strokeWidth={2}
                  onClick={(e) => handleNodeClick(e, node.id)}
                  onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  style={{ cursor: 'pointer' }}
                />
                
                <text 
                  textAnchor="middle" 
                  dominantBaseline="middle" 
                  fill="#17221c"
                  fontSize="14"
                  fontWeight="bold"
                  style={{ 
                    pointerEvents: 'none',
                    userSelect: 'none'
                  }}
                >
                  {node.text}
                </text>
                
                {node.media && node.media.length > 0 && (
                  <text 
                    x="0" 
                    y="-20"
                    textAnchor="middle"
                    fill="#17221c"
                    fontSize="12"
                    style={{ pointerEvents: 'none' }}
                  >
                    📎
                  </text>
                )}
              </g>
            ))}
          </g>
        </svg>
      </div>
      
      {/* Node details modal */}
      {isEditingNode && nodeDetails && (
        <NodeDetailsModal
          details={nodeDetails}
          onUpdate={handleUpdateNode}
          onCancel={() => {
            setIsEditingNode(false);
            setNodeDetails(null);
          }}
        />
      )}
    </div>
  );
};

export default MindMapSVG;
