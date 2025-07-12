import React, { useState, useRef } from 'react';

interface SimpleMindMapProps {
  onBack: () => void;
  initialData?: {
    topic?: string;
    rootNode?: any;
  };
  onSave?: (data: {
    topic: string;
    rootNode: any;
  }) => void;
}

interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  connections: string[];
  color?: string;
  notes?: string;
  media?: {
    type: 'image' | 'video' | 'link' | 'file' | 'pdf';
    url: string;
    title?: string;
    fileData?: string; // Base64 encoded file data
    fileType?: string; // MIME type for files
    fileSize?: number; // Size in bytes
  }[];
}

const NewSimpleMindMap: React.FC<SimpleMindMapProps> = ({ onBack, initialData, onSave }) => {
  const [topic, setTopic] = useState<string>(initialData?.topic || 'My Mind Map');
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Initialize with provided data or defaults
  const [nodes, setNodes] = useState<MindMapNode[]>(() => {
    if (initialData?.rootNode) {
      // Process the hierarchical rootNode into our flat structure
      const processedNodes: MindMapNode[] = [];
      const processNode = (node: any, x: number, y: number, parentId?: string) => {
        const id = node.id;
        const newNode: MindMapNode = {
          id,
          text: node.label || 'Node',
          x,
          y,
          connections: [],
          color: node.color,
          notes: node.notes,
          media: node.media
        };
        
        console.log('Processing node with media:', node.media);
        
        if (parentId) {
          const parent = processedNodes.find(n => n.id === parentId);
          if (parent) {
            parent.connections.push(id);
          }
        }
        
        processedNodes.push(newNode);
        
        // Process children
        if (node.children && node.children.length > 0) {
          const childSpacing = 150;
          const startX = x - ((node.children.length - 1) * childSpacing) / 2;
          
          node.children.forEach((child: any, index: number) => {
            const childX = startX + index * childSpacing;
            processNode(child, childX, y + 100, id);
          });
        }
      };
      
      // Start with the root node
      processNode(initialData.rootNode, 250, 50);
      return processedNodes;
    }
    
    // Default nodes if no initial data
    return [
      { id: '1', text: 'Main Topic', x: 250, y: 50, connections: ['2', '3'], color: '#e4c97e' },
      { id: '2', text: 'Subtopic 1', x: 100, y: 150, connections: [], color: '#4fc38a' },
      { id: '3', text: 'Subtopic 2', x: 400, y: 150, connections: [], color: '#4fc38a' },
    ];
  });

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [newNodeText, setNewNodeText] = useState('');
  const [nodeColor, setNodeColor] = useState('#4fc38a');
  const [isEditingNodeDetails, setIsEditingNodeDetails] = useState(false);
  const [nodeNotes, setNodeNotes] = useState('');
  const [newNodePosition, setNewNodePosition] = useState({ x: 0, y: 0 });
  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{id: string, x: number, y: number} | null>(null);
  const [connectionEnd, setConnectionEnd] = useState<{x: number, y: number} | null>(null);
  
  // Node dragging state
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // File upload reference
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nodeMedia, setNodeMedia] = useState<{type: 'image' | 'video' | 'link' | 'file' | 'pdf', url: string, title?: string, fileData?: string, fileType?: string, fileSize?: number}[]>([]);

  // When component unmounts or when Save is clicked, convert our data structure back to the expected format
  const prepareDataForSave = (): { topic: string; rootNode: any } | null => {
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
    
    return {
      topic,
      rootNode: buildHierarchy(rootNodeId)
    };
  };

  // Draw wiggly lines between connected nodes
  const renderLines = () => {
    return nodes.flatMap(node => 
      node.connections.map(targetId => {
        const target = nodes.find(n => n.id === targetId);
        if (!target) return null;
        
        // Calculate control points for a curved line
        const dx = target.x - node.x;
        const dy = target.y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Use the perpendicular direction for control points
        const perpX = -dy / distance * 50;
        const perpY = dx / distance * 50;
        
        // Midpoint with offset
        const midX = (node.x + target.x) / 2 + perpX;
        const midY = (node.y + target.y) / 2 + perpY;
        
        // Create a path with multiple bezier curves for a wiggly effect
        const path = `
          M ${node.x} ${node.y}
          Q ${midX} ${midY} ${target.x} ${target.y}
        `;
        
        return (
          <path
            key={`${node.id}-${targetId}`}
            d={path}
            fill="none"
            stroke={node.color || '#aaa'}
            strokeWidth={2}
            strokeDasharray={selectedNode === node.id ? '5,5' : ''}
            strokeLinecap="round"
          />
        );
      })
    );
  };

  // Add a new node when double-clicking on the canvas
  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    
    // Prevent default behavior
    e.preventDefault();
    e.stopPropagation();
    
    // Get position relative to the SVG
    const svgRect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;
    
    console.log('Double click detected at position:', x, y);
    
    // If we're dragging a connection, create a node at the endpoint
    if (isDraggingConnection && connectionStart) {
      const newId = Date.now().toString();
      const newNode: MindMapNode = {
        id: newId,
        text: 'New Node',
        x,
        y,
        connections: [],
        color: nodeColor
      };
      
      setNodes(prevNodes => {
        // Add the connection from start node to this new node
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
        return [...updatedNodes, newNode];
      });
      
      setIsDraggingConnection(false);
      setConnectionStart(null);
      setConnectionEnd(null);
      return;
    }
    
    // Normal double-click to add node
    setNewNodePosition({ x, y });
    setIsAddingNode(true);
    setSelectedNode(null);
  };
  
  // Handle mouse down for connection dragging or node dragging
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string, nodeX: number, nodeY: number) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Check if we're starting a drag (Alt key) or a connection
    if (e.altKey) {
      // Start node dragging
      setDraggingNode(nodeId);
      setDragStartPosition({ x: nodeX, y: nodeY });
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (svgRect) {
        setDragOffset({ 
          x: nodeX - (e.clientX - svgRect.left),
          y: nodeY - (e.clientY - svgRect.top) 
        });
      }
    } else {
      // Start connection dragging
      setConnectionStart({ id: nodeId, x: nodeX, y: nodeY });
    }
    
    // Add event listeners for drag movement and completion
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Track mouse movement for connection or node dragging
  const handleMouseMove = (e: MouseEvent) => {
    if (!svgRef.current) return;
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;
    
    if (draggingNode) {
      // Handle node dragging
      setNodes(prev => prev.map(node => 
        node.id === draggingNode ? 
          { ...node, x: x + dragOffset.x, y: y + dragOffset.y } : 
          node
      ));
    } else if (connectionStart) {
      // Handle connection dragging
      setConnectionEnd({x, y});
      setIsDraggingConnection(true);
    }
  };
  
  // Finish connection dragging, node dragging, or cancel
  const handleMouseUp = (e: MouseEvent) => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Get position of mouse in SVG coordinates
    if (!svgRef.current) {
      // Reset states and return if no SVG ref
      setDraggingNode(null);
      setConnectionStart(null);
      setConnectionEnd(null);
      setIsDraggingConnection(false);
      return;
    }
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;
    
    // Handle end of node dragging - if dragging ended, show modal for new node creation
    if (draggingNode) {
      // Get the source node (the one being dragged)
      const sourceNode = nodes.find(node => node.id === draggingNode);
      
      if (sourceNode) {
        // Show modal for creating a new connected node at the release position
        // Only if we've dragged a significant distance (> 50px)
        const dragDistance = Math.sqrt(
          Math.pow(sourceNode.x - dragStartPosition.x, 2) + 
          Math.pow(sourceNode.y - dragStartPosition.y, 2)
        );
        
        if (dragDistance > 50) {
          // Position the new node at mouse release point
          setNewNodePosition({ x, y });
          setNewNodeText('');
          setIsAddingNode(true);
          
          // Pre-select the source node to automatically create a connection
          setSelectedNode(draggingNode);
        }
      }
      
      // Reset node dragging state
      setDraggingNode(null);
      return;
    }
    
    // Handle connection dragging completion
    if (isDraggingConnection && connectionEnd && connectionStart) {
      // Check if we're over an existing node
      const targetNode = nodes.find(node => {
        const dx = node.x - x;
        const dy = node.y - y;
        return Math.sqrt(dx*dx + dy*dy) < 50; // Node radius
      });
      
      if (targetNode) {
        // Connect to existing node
        setNodes(prevNodes => {
          return prevNodes.map(node => {
            if (node.id === connectionStart.id) {
              // Only add connection if not already present
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
        // Offer to create new node at endpoint
        setNewNodePosition({ x, y });
        setIsAddingNode(true);
      }
    }
    
    setIsDraggingConnection(false);
    setConnectionStart(null);
    setConnectionEnd(null);
  };

  // Add new node to the map
  const handleAddNode = () => {
    if (!newNodeText.trim()) {
      setIsAddingNode(false);
      return;
    }

    const newNode: MindMapNode = {
      id: Date.now().toString(),
      text: newNodeText.trim(),
      x: newNodePosition.x,
      y: newNodePosition.y,
      connections: [],
      color: nodeColor,
    };

    setNodes([...nodes, newNode]);
    setNewNodeText('');
    setIsAddingNode(false);
  };

  // Handle node details editing
  const handleNodeDoubleClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setSelectedNode(nodeId);
    setNodeColor(node.color || '#4fc38a');
    setNodeNotes(node.notes || '');
    setNodeMedia(node.media || []);
    setIsEditingNodeDetails(true);
  };
  
  const handleUpdateNodeDetails = () => {
    if (!selectedNode) return;
    
    setNodes(nodes.map(node => {
      if (node.id === selectedNode) {
        return {
          ...node,
          color: nodeColor,
          notes: nodeNotes,
          media: nodeMedia
        };
      }
      return node;
    }));
    
    setIsEditingNodeDetails(false);
  };
  const handleAddMedia = () => {
    // Create dropdown menu with options
    const mediaType = prompt('Select media type:\n1. URL (website, image, video)\n2. Upload File\n\nEnter 1 or 2:');
    
    if (mediaType === '1') {
      // URL option
      const url = prompt('Enter media URL:');
      if (!url) return;
      
      const type = url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) 
        ? 'image' 
        : url.match(/\.(mp4|webm|ogg|mov)$/i) 
          ? 'video' 
          : url.match(/\.pdf$/i)
            ? 'pdf'
            : 'link';
      
      const title = prompt('Enter title (optional):') || '';
      
      setNodeMedia([...nodeMedia, {type, url, title}]);
    } else if (mediaType === '2') {
      // File upload option
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  // Select a node when clicked
  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(selectedNode === nodeId ? null : nodeId);
    setIsAddingNode(false);
  };

  // Connect selected node to another node
  const handleConnect = (targetId: string) => {
    if (!selectedNode || selectedNode === targetId) return;

    setNodes(nodes.map(node => {
      if (node.id === selectedNode) {
        return {
          ...node,
          connections: [...node.connections, targetId]
        };
      }
      return node;
    }));

    setSelectedNode(null);
  };

  // Render any active connection being dragged
  const renderActiveConnection = () => {
    if (!isDraggingConnection || !connectionStart || !connectionEnd) return null;
    
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
  };
  
  // Render media for a node
  const renderNodeMedia = (node: MindMapNode) => {
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
  };
  
  return (
    <div style={{ height: '600px', width: '100%', position: 'relative' }}>
      <div 
        style={{ 
          padding: '10px', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#17221c',
          color: 'white'
        }}
      >
        <div>
          <h3 style={{ color: '#e4c97e', margin: 0 }}>
            <input 
              type="text" 
              value={topic} 
              onChange={(e) => setTopic(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px dashed #e4c97e',
                color: '#e4c97e',
                fontSize: '1.17em',
                fontWeight: 'bold',
                padding: '2px 5px',
                width: '250px'
              }}
            />
          </h3>
        </div>
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
            Back
          </button>
          <button 
            onClick={() => {
              const data = prepareDataForSave();
              if (data && onSave) {
                onSave(data);
              } else {
                alert("Your mind map would be saved here.");
              }
            }}
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

      <div style={{ 
        padding: '10px', 
        backgroundColor: '#222',
        color: 'white',
        fontSize: '14px'
      }}>
        <p>Double-click on the canvas to add a new node | Click on nodes to select and connect them | Double-click on nodes to edit details</p>
      </div>

      <div style={{ 
        height: 'calc(100% - 100px)', 
        backgroundColor: '#1a2820', 
        position: 'relative', 
        overflow: 'hidden' 
      }}>
        <svg 
          ref={svgRef}
          id="mind-map-svg" 
          width="100%" 
          height="100%" 
          onDoubleClick={handleCanvasDoubleClick}
        >
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
                onClick={() => selectedNode ? handleConnect(node.id) : handleNodeClick(node.id)}
                onDoubleClick={(e) => handleNodeDoubleClick(node.id, e)}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id, node.x, node.y)}
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
        </svg>
        
        {isAddingNode && (
          <div 
            style={{ 
              position: 'absolute',
              left: `${newNodePosition.x}px`,
              top: `${newNodePosition.y}px`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#17221c', 
              padding: '10px',
              borderRadius: '5px',
              boxShadow: '0 0 10px rgba(0,0,0,0.5)',
              zIndex: 1000
            }}
          >
            <input 
              type="text" 
              value={newNodeText}
              onChange={(e) => setNewNodeText(e.target.value)}
              placeholder="Node text"
              autoFocus
              style={{ padding: '5px', width: '200px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddNode();
                if (e.key === 'Escape') setIsAddingNode(false);
              }}
            />
            <div style={{ marginTop: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '12px' }}>Node Color:</label>
              <div style={{ display: 'flex', gap: '5px' }}>
                {['#4fc38a', '#e4c97e', '#e77373', '#7387e7', '#73e7e7'].map(color => (
                  <div 
                    key={color}
                    onClick={() => setNodeColor(color)}
                    style={{
                      width: '20px',
                      height: '20px',
                      backgroundColor: color,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      border: nodeColor === color ? '2px solid white' : '1px solid #555'
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ marginTop: '10px', textAlign: 'right' }}>
              <button 
                onClick={() => setIsAddingNode(false)}
                style={{ 
                  marginRight: '5px', 
                  padding: '3px 8px',
                  backgroundColor: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleAddNode}
                style={{ 
                  padding: '3px 8px',
                  backgroundColor: '#4fc38a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px'
                }}
              >
                Add
              </button>
            </div>
          </div>
        )}
        
        {/* Hidden file input for uploads */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={(e) => {
            // Handle file selection
            const files = e.target.files;
            if (!files || files.length === 0) return;
            
            const file = files[0];
            const reader = new FileReader();
            
            reader.onload = (event) => {
              if (!event.target || typeof event.target.result !== 'string') return;
              
              // Determine file type
              let type: 'image' | 'video' | 'link' | 'file' | 'pdf';
              
              if (file.type.startsWith('image/')) {
                type = 'image';
              } else if (file.type.startsWith('video/')) {
                type = 'video';
              } else if (file.type === 'application/pdf') {
                type = 'pdf';
              } else {
                type = 'file';
              }
              
              setNodeMedia([
                ...nodeMedia, 
                {
                  type,
                  url: URL.createObjectURL(file), // For immediate preview
                  title: file.name,
                  fileData: event.target.result,
                  fileType: file.type,
                  fileSize: file.size
                }
              ]);
            };
            
            reader.readAsDataURL(file);
            
            // Reset the file input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }} 
          accept="image/*,video/*,application/pdf,.pdf" 
        />

        {isEditingNodeDetails && selectedNode && (
          <div 
            style={{ 
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#17221c', 
              padding: '15px',
              borderRadius: '5px',
              boxShadow: '0 0 10px rgba(0,0,0,0.5)',
              zIndex: 1000,
              width: '300px'
            }}
          >
            <h4 style={{ color: '#e4c97e', marginTop: 0 }}>Node Details</h4>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '12px' }}>Node Color:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['#4fc38a', '#e4c97e', '#e77373', '#7387e7', '#73e7e7'].map(color => (
                  <div 
                    key={color}
                    onClick={() => setNodeColor(color)}
                    style={{
                      width: '25px',
                      height: '25px',
                      backgroundColor: color,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      border: nodeColor === color ? '2px solid white' : '1px solid #555'
                    }}
                  />
                ))}
              </div>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '12px' }}>Notes:</label>
              <textarea 
                value={nodeNotes}
                onChange={(e) => setNodeNotes(e.target.value)}
                style={{ 
                  padding: '8px', 
                  width: '100%', 
                  height: '100px',
                  backgroundColor: '#0b120e',
                  color: 'white',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label style={{ color: '#ccc', fontSize: '12px' }}>Media:</label>
                <button 
                  onClick={handleAddMedia}
                  style={{ 
                    padding: '2px 5px',
                    backgroundColor: '#4fc38a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  + Add Media
                </button>
              </div>
              
              {nodeMedia.length > 0 ? (
                <div style={{ 
                  backgroundColor: '#0b120e', 
                  border: '1px solid #333',
                  borderRadius: '4px',
                  padding: '8px'
                }}>
                  {nodeMedia.map((media, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      marginBottom: index < nodeMedia.length - 1 ? '8px' : 0,
                      padding: '5px',
                      backgroundColor: '#17221c',
                      borderRadius: '4px'
                    }}>
                      <div style={{ marginRight: '8px', fontSize: '18px' }}>
                        {media.type === 'image' ? '🖼️' : 
                         media.type === 'video' ? '🎬' : 
                         media.type === 'pdf' ? '📄' : 
                         media.type === 'file' ? '📎' : '🔗'}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <div style={{ fontSize: '12px', color: 'white' }}>{media.title || 'Untitled'}</div>
                        <div style={{ fontSize: '10px', color: '#aaa', textOverflow: 'ellipsis', overflow: 'hidden' }}>{media.url}</div>
                      </div>
                      <button 
                        onClick={() => setNodeMedia(nodeMedia.filter((_, i) => i !== index))}
                        style={{ 
                          padding: '2px 5px',
                          backgroundColor: '#e77373',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '10px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  padding: '8px', 
                  backgroundColor: '#0b120e',
                  color: '#aaa',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  fontSize: '12px',
                  textAlign: 'center'
                }}>
                  No media attached
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setIsEditingNodeDetails(false)}
                style={{ 
                  marginRight: '10px', 
                  padding: '5px 10px',
                  backgroundColor: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateNodeDetails}
                style={{ 
                  padding: '5px 10px',
                  backgroundColor: '#4fc38a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px'
                }}
              >
                Update
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewSimpleMindMap;
