import { Athro } from '../types/athro';
import StudyService from './StudyService';
import SupabaseStudyService from './SupabaseStudyService';
import DocumentProcessingService from './DocumentProcessingService';
import { Flashcard, StudyNote, MindMap, MindMapNode } from '../types/study';
import { Resource } from '../types/resources';
import { formatDate } from '../utils/dateUtils';

/**
 * Service for gathering comprehensive context from all study materials
 * to provide the Athro AI with full awareness of a user's study session
 */
class AthroContextService {
  private currentAthro: Athro | null = null;
  private currentMindMap: MindMap | null = null;

  /**
   * Collects and formats all study materials for a specific Athro
   * @param athroId The ID of the Athro whose context is being gathered
   * @returns A formatted context string containing all relevant study materials
   */
  async getComprehensiveContext(athroId: string): Promise<string> {
    try {
      // Gather all study materials for this Athro
      const [flashcards, notes, mindMaps, resources] = await Promise.all([
        StudyService.getFlashcards(athroId),
        StudyService.getNotes(athroId),
        SupabaseStudyService.getMindMaps(athroId),
        StudyService.getResources(athroId)
      ]);

      // Format each type of study material into a string context
      const flashcardsContext = this.formatFlashcardsExternally(flashcards);
      const notesContext = this.formatNotesExternally(notes);
      const mindMapsContext = this.formatMindMapsExternally(mindMaps);
      const resourcesContext = await this.formatResourcesExternally(resources);

      // Combine all contexts into a comprehensive context
      return this.buildComprehensiveContext(
        athroId,
        flashcardsContext,
        notesContext,
        mindMapsContext,
        resourcesContext
      );
    } catch (error) {
      console.error('Error gathering comprehensive context:', error);
      return 'Error: Unable to gather comprehensive study context.';
    }
  }

  /**
   * Get context for a specific resource by ID
   * @param resourceId The ID of the resource to process
   * @returns Formatted content of the resource
   */
  async getResourceContext(resourceId: string): Promise<string> {
    try {
      const resource = await StudyService.getResourceById(resourceId);
      if (!resource) {
        return `Resource with ID ${resourceId} was not found.`;
      }

      const processed = await new DocumentProcessingService().processDocument(resource);
      
      return `RESOURCE: ${resource.name} (${resource.fileType})\n\n` +
             `${processed.content}\n\n` +
             `${this.formatResourceMetadata(resource, processed.metadata)}`;
    } catch (error) {
      console.error('Error getting resource context:', error);
      return 'Error: Unable to process the requested resource.';
    }
  }

  /**
   * Format all flashcards into a string context
   * Made public for use by the StudyMaterialTriggerService
   */
  formatFlashcardsExternally(flashcards: Flashcard[]): string {
    if (flashcards.length === 0) {
      return '';
    }

    let context = `===== FLASHCARDS (${flashcards.length}) =====\n\n`;
    
    // Group flashcards by topic
    const flashcardsByTopic: Record<string, Flashcard[]> = {};
    flashcards.forEach(card => {
      const topic = card.topic || 'Uncategorized';
      if (!flashcardsByTopic[topic]) {
        flashcardsByTopic[topic] = [];
      }
      flashcardsByTopic[topic].push(card);
    });

    // Format each topic group
    Object.entries(flashcardsByTopic).forEach(([topic, cards]) => {
      context += `TOPIC: ${topic} (${cards.length} cards)\n`;
      cards.forEach((card, index) => {
        context += `${index + 1}. Q: ${card.front}\n   A: ${card.back}\n`;
      });
      context += '\n';
    });

    return context;
  }

  /**
   * Format all study notes into a string context
   * Made public for use by the StudyMaterialTriggerService
   */
  formatNotesExternally(notes: StudyNote[]): string {
    if (notes.length === 0) {
      return '';
    }

    let context = `===== STUDY NOTES (${notes.length}) =====\n\n`;
    
    notes.forEach((note, index) => {
      context += `NOTE ${index + 1}: ${note.topic}\n`;
      context += `Tags: ${note.tags.join(', ') || 'None'}\n`;
      context += `${note.content}\n\n`;
    });

    return context;
  }

  /**
   * Format a single mind map with complete structure and content
   * @param mindMap The mind map to format
   * @returns Detailed string representation of the mind map
   */
  async formatSingleMindMap(mindMap: MindMap): Promise<string> {
    try {
      console.log('📊 Formatting mind map:', mindMap?.topic || 'undefined');
      console.log('📊 Mind map data:', JSON.stringify(mindMap, null, 2));
      
      if (!mindMap) {
        console.log('❌ Mind map is null or undefined');
        return 'No mind map data available.';
      }

      let result = `MIND MAP: ${mindMap.topic || 'Untitled'}\n`;
      result += `Subject: ${mindMap.subject || 'General'}\n`;
      
      // Add creation/update date if available
      if (mindMap.createdAt) {
        result += `Created: ${formatDate(mindMap.createdAt)}\n`;
      }
      if (mindMap.updatedAt) {
        result += `Last Updated: ${formatDate(mindMap.updatedAt)}\n`;
      }
      
      result += '\nCONTENT STRUCTURE:\n';

      // Check if rootNode exists and has the expected structure
      if (mindMap.rootNode) {
        console.log('📊 Root node exists:', mindMap.rootNode.label || 'undefined label');
        console.log('📊 Root node children:', mindMap.rootNode.children?.length || 'no children');
        
        try {
          // Format the node structure
          result += this.formatMindMapNodeWithStructure(mindMap.rootNode, 0);
          
          // Also extract all node names for quick reference
          const allNodes = this.extractAllNodeNames(mindMap.rootNode);
          console.log('📊 All node names extracted:', allNodes.length);
          result += '\n\nALL NODES: ' + allNodes.join(', ') + '\n';
        } catch (error: any) {
          console.error('❌ Error formatting mind map node structure:', error);
          result += '\nError occurred while formatting mind map nodes: ' + (error?.message || 'Unknown error') + '\n';
          // Try a fallback approach if the regular formatting fails
          result += '\nFALLBACK NODE DISPLAY:\n';
          result += this.getBasicNodeStructure(mindMap.rootNode);
        }
      } else {
        console.log('❌ Mind map has no root node');
        result += 'Mind map has no content. Try adding nodes to your mind map.';
      }

      console.log('✅ Mind map formatting completed successfully');
      return result;
    } catch (error: any) {
      console.error('❌ ERROR in formatSingleMindMap:', error);
      return `Error formatting mind map: ${error?.message || 'Unknown error'}. The mind map structure may be corrupted or in an unexpected format.`;
    }
  }
  
  /**
   * Fallback method to get basic node structure when the full formatting fails
   * @param node The root node to display
   * @returns Simple string representation of the node hierarchy
   */
  private getBasicNodeStructure(node: any): string {
    if (!node) return 'No node data';
    
    try {
      let result = `Root: ${node.label || 'Unnamed Node'}\n`;
      
      // Add basic children information
      if (node.children && Array.isArray(node.children) && node.children.length > 0) {
        result += `Children (${node.children.length}): `;
        result += node.children.map((child: any) => child.label || 'Unnamed').join(', ');
      } else {
        result += 'No children nodes';
      }
      
      return result;
    } catch (e) {
      return 'Failed to extract even basic node structure';
    }
  }
  
  /**
   * Extract all node names from a mind map for easy reference
   * @param rootNode The root node of the mind map
   * @returns Array of all node names in the mind map
   */
  private extractAllNodeNames(rootNode: MindMapNode): string[] {
    const nodeNames: string[] = [];
    
    // Add current node name
    nodeNames.push(rootNode.label);
    
    // Recursively process all children
    if (rootNode.children && rootNode.children.length > 0) {
      for (const child of rootNode.children) {
        nodeNames.push(...this.extractAllNodeNames(child));
      }
    }
    
    return nodeNames;
  }

  /**
   * Format a mind map node and its children with proper hierarchical structure
   * @param node The node to format
   * @param depth Current depth level for indentation
   * @returns Formatted string with hierarchical structure
   */
  private formatMindMapNodeWithStructure(node: MindMapNode, depth: number): string {
    const indent = '  '.repeat(depth);
    let result = `${indent}• ${node.label}\n`;

    // Recursively format all children with increased indentation
    if (node.children && node.children.length > 0) {
      node.children.forEach((childNode: MindMapNode) => {
        result += this.formatMindMapNodeWithStructure(childNode, depth + 1);
      });
    }

    return result;
  }

  /**
   * Format all mind maps into a string context
   * Made public for use by the StudyMaterialTriggerService
   */
  formatMindMapsExternally(mindMaps: MindMap[]): string {
    if (mindMaps.length === 0) {
      return '';
    }

    let context = `===== MIND MAPS (${mindMaps.length}) =====\n\n`;
    
    mindMaps.forEach((map, index) => {
      context += `MIND MAP ${index + 1}: ${map.topic}\n`;
      context += `Subject: ${map.subject || 'General'}\n`;
      
      // Extract key concepts from the mind map nodes recursively
      if (map.rootNode) {
        context += 'Key concepts:\n';
        this.extractMindMapConcepts(map.rootNode, context, '');
      }
      context += '\n';
    });

    return context;
  }
  
  /**
   * Recursively extract concepts from a mind map node and its children
   */
  private extractMindMapConcepts(node: MindMapNode, context: string, indent: string): void {
    context += `${indent}- ${node.label}\n`;
    
    if (node.children && node.children.length > 0) {
      node.children.forEach((childNode: MindMapNode) => {
        this.extractMindMapConcepts(childNode, context, indent + '  ');
      });
    }
  }

  /**
   * Format all resources into a string context
   * Made public for use by the StudyMaterialTriggerService
   */
  async formatResourcesExternally(resources: Resource[]): Promise<string> {
    if (resources.length === 0) {
      return '';
    }

    let context = `===== RESOURCES (${resources.length}) =====\n\n`;
    
    // Process each resource to extract readable content
    const processedResources = await Promise.all(
      resources.map(async resource => {
        const processed = await new DocumentProcessingService().processDocument(resource);
        return {
          resource,
          processed
        };
      })
    );

    // Add summaries of each resource
    processedResources.forEach((item, index) => {
      const { resource, processed } = item;
      context += `RESOURCE ${index + 1}: ${resource.name}\n`;
      context += `Type: ${resource.fileType}\n`;
      if (resource.description) {
        context += `Description: ${resource.description}\n`;
      }
      
      // Add a brief preview of content if it's readable
      if (processed.isReadable) {
        const previewLength = 200;
        const contentPreview = processed.content.length > previewLength
          ? processed.content.substring(0, previewLength) + '...'
          : processed.content;
        context += `Preview: ${contentPreview}\n`;
      }
      
      context += '\n';
    });

    return context;
  }

  /**
   * Format resource metadata into a readable string
   */
  private formatResourceMetadata(resource: Resource, metadata: Record<string, any>): string {
    let result = 'METADATA:\n';
    
    // Add resource metadata
    if (resource.metadata) {
      Object.entries(resource.metadata).forEach(([key, value]) => {
        if (key !== 'content' && key !== 'binary') {
          result += `${key}: ${value}\n`;
        }
      });
    }
    
    // Add processed metadata
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (key !== 'error' && key !== 'content' && key !== 'binary') {
          result += `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}\n`;
        }
      });
    }
    
    return result;
  }

  /**
   * Build the comprehensive context by combining all study material contexts
   */
  private buildComprehensiveContext(
    _athroId: string, // Underscore prefix to indicate deliberate non-use of parameter
    flashcardsContext: string,
    notesContext: string,
    mindMapsContext: string,
    resourcesContext: string
  ): string {
    let fullContext = `===========================================================\n`;
    fullContext += `COMPREHENSIVE STUDY CONTEXT FOR ATHRO SESSION\n`;
    fullContext += `===========================================================\n\n`;

    // Add each context section if it's not empty
    if (flashcardsContext) {
      fullContext += flashcardsContext + '\n';
    }
    
    if (notesContext) {
      fullContext += notesContext + '\n';
    }
    
    if (mindMapsContext) {
      fullContext += mindMapsContext + '\n';
    }
    
    if (resourcesContext) {
      fullContext += resourcesContext + '\n';
    }

    // If there are no study materials, provide a message
    if (!flashcardsContext && !notesContext && !mindMapsContext && !resourcesContext) {
      fullContext += 'No study materials have been created for this session yet.\n';
    }

    return fullContext;
  }
}

export default new AthroContextService();
