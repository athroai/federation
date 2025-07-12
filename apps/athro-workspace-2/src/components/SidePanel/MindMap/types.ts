import { Position } from 'reactflow';
import { MindMapNode } from '../../../types/study';

// Define a type for connection point
export interface ConnectionPoint {
  id: string;
  position: Position;
  x: number;
  y: number;
}

// Define types for media content
export type MediaType = 'image' | 'video' | 'url' | 'note';

export interface MediaContent {
  id: string;
  type: MediaType;
  url?: string; // For images, videos, and urls
  content?: string; // For notes or alt text
  thumbnail?: string; // Optional thumbnail for videos
}

// Extend MindMapNode to include connection points and media
export interface ExtendedMindMapNode extends MindMapNode {
  connectionPoints?: ConnectionPoint[];
  media?: MediaContent[];
  notes?: string;
}

// Extend the NodeData to include our custom properties
export interface NodeData {
  label: string;
  color: string;
  isRoot?: boolean;
  connectionPoints?: ConnectionPoint[];
  media?: MediaContent[];
  notes?: string;
  onNodeLabelChange?: (id: string, newLabel: string) => void;
  onColorChange?: (id: string, color: string) => void;
  onAddChild?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddConnectionPoint?: (id: string) => void;
  onMediaUpdate?: (id: string, media: MediaContent[]) => void;
  onNotesChange?: (id: string, notes: string) => void;
}

// Edge data for custom edge component
export interface EdgeData {
  onEdgeDelete?: (id: string) => void;
}

// Re-export constants for easier import management
export { NODE_COLORS } from './constants';

// Type for node options updates
export interface NodeUpdateOptions {
  label?: string;
  color?: string;
  media?: MediaContent[];
  notes?: string;
  connectionPoints?: ConnectionPoint[];
}
