import { ChatMessage } from './openai';
import AthroContextService from './AthroContextService';
import StudyService from './StudyService';
import SupabaseStudyService from './SupabaseStudyService';
import DocumentProcessingService from './DocumentProcessingService';

/**
 * Service that detects triggers in messages to load specific study materials
 * Following the service layer pattern for project consistency
 */
class StudyMaterialTriggerService {
  /**
   * List of trigger patterns to detect in user messages
   */
  private readonly triggerPatterns = {
    // General reference to mind map in sidebar without naming it
    sidebarMindMap: [
      // Simple references to mindmap
      /my\s+(?:latest|most\s+recent|newest)\s+mind\s*map/i,
      /read\s+my\s+(?:latest|most\s+recent|newest)\s+mind\s*map/i,
      /show\s+my\s+(?:latest|most\s+recent|newest)\s+mind\s*map/i,
      /read\s+mind\s*map/i,
      /latest\s+mind\s*map/i,
      /my\s+mind\s*map/i,
      
      // Mind map in study tools/sidebar
      /(?:the\s+)?mind\s*map(?:\s+in(?:\s+my)?|\s+from(?:\s+my)?)\s+(?:the\s+)?(?:side\s*bar|study\s+tools|work\s*space)/i,
      /read\s+(?:the\s+)?mind\s*map(?:\s+in(?:\s+my)?|\s+from(?:\s+my)?)\s+(?:the\s+)?(?:side\s*bar|study\s+tools|work\s*space)/i,
      /show\s+(?:the\s+)?mind\s*map(?:\s+in(?:\s+my)?|\s+from(?:\s+my)?)\s+(?:the\s+)?(?:side\s*bar|study\s+tools|work\s*space)/i,
      /view\s+(?:the\s+)?mind\s*map(?:\s+in(?:\s+my)?|\s+from(?:\s+my)?)\s+(?:the\s+)?(?:side\s*bar|study\s+tools|work\s*space)/i,
      
      // What's in my mind map
      /what\s+(?:is|do\s+i\s+have)\s+(?:in|on)\s+(?:my\s+)?(?:most\s+recent\s+)?mind\s*map/i,
      /what's\s+(?:in|on)\s+(?:my\s+)?(?:most\s+recent\s+)?mind\s*map/i,
      
      // Common typos and simplified versions
      /tyhe\s+mindmap/i,
      /mindmap\s+in\s+study\s+tools/i,
      /my\s+mindmap/i,
      
      // Looking for specific nodes
      /do\s+you\s+see\s+(?:the\s+node|anything)\s+(?:called|named)\s+([\w\s']+)/i,  // For questions about specific nodes
      /see\s+(?:the\s+)?node\s+(?:called|named)?\s+([\w\s']+)/i,
      /find\s+(?:the\s+)?node\s+(?:called|named)?\s+([\w\s']+)/i
    ],
    // For specific resource by ID
    resourceById: [
      /resource\s+(?:id\s+)?([\w-]+)/i,
      /resource\s+(?:number\s+)?(\d+)/i,
      /read\s+resource\s+(?:id\s+)?([\w-]+)/i,
      /read\s+resource\s+(?:number\s+)?(\d+)/i,
      /show\s+resource\s+(?:id\s+)?([\w-]+)/i,
      /show\s+resource\s+(?:number\s+)?(\d+)/i,
      /open\s+resource\s+(?:id\s+)?([\w-]+)/i,
      /open\s+resource\s+(?:number\s+)?(\d+)/i,
      /view\s+resource\s+(?:id\s+)?([\w-]+)/i,
      /view\s+resource\s+(?:number\s+)?(\d+)/i,
      /document\s+(?:id\s+)?([\w-]+)/i,
      /document\s+(?:number\s+)?(\d+)/i
    ],
    // For specific mind map by name
    mindMapByName: [
      /mind\s*map(?:\s+called)?\s+["']?([\w\s']+)["']?/i,
      /read\s+(?:the\s+)?mind\s*map(?:\s+called)?\s+["']?([\w\s']+)["']?/i,
      /show\s+(?:the\s+)?mind\s*map(?:\s+called)?\s+["']?([\w\s']+)["']?/i,
      /view\s+(?:the\s+)?mind\s*map(?:\s+called)?\s+["']?([\w\s']+)["']?/i
    ],
    // For specific note by topic
    noteByTopic: [
      /(?:my\s+)?notes\s+(?:on|about)\s+["']?([\w\s']+)["']?/i,
      /read\s+(?:my\s+)?notes\s+(?:on|about)\s+["']?([\w\s']+)["']?/i,
      /show\s+(?:my\s+)?notes\s+(?:on|about)\s+["']?([\w\s']+)["']?/i
    ],
    // General triggers for material types
    flashcards: [
      /show\s+(?:me\s+)?(?:my\s+)?flashcards/i,
      /what\s+(?:are\s+)?(?:my\s+)?flashcards/i,
      /flashcard(?:s)?\s+(?:I've\s+)?(?:created|made|have)/i,
      /review\s+(?:my\s+)?flashcards/i,
      /read\s+(?:my\s+)?flashcards/i,
      /^(?:my\s+)?flashcards/i
    ],
    notes: [
      /show\s+(?:me\s+)?(?:my\s+)?(?:study\s+)?notes/i,
      /what\s+(?:are\s+)?(?:my\s+)?(?:study\s+)?notes/i,
      /notes\s+(?:I've\s+)?(?:created|made|have|taken)/i,
      /review\s+(?:my\s+)?(?:study\s+)?notes/i,
      /read\s+(?:my\s+)?(?:study\s+)?notes/i,
      /get\s+(?:my\s+)?(?:study\s+)?notes/i,
      /check\s+(?:my\s+)?(?:study\s+)?notes/i,
      /access\s+(?:my\s+)?(?:study\s+)?notes/i,
      /^(?:my\s+)?notes/i,
      /^the\s+(?:ones|notes)\s+in\s+the\s+sidebar/i
    ],
    mindMaps: [
      /show\s+(?:me\s+)?(?:my\s+)?mind\s*maps/i,
      /what\s+(?:are\s+)?(?:my\s+)?mind\s*maps/i,
      /mind\s*maps\s+(?:I've\s+)?(?:created|made|have)/i,
      /review\s+(?:my\s+)?mind\s*maps/i,
      /read\s+(?:my\s+)?mind\s*maps/i,
      /^(?:my\s+)?mind\s*maps/i,
      /read\s+(?:the\s+)?mind\s*map(?:\s+called)?\s+["']?([\w\s']+)["']?/i,
      /show\s+(?:the\s+)?mind\s*map(?:\s+called)?\s+["']?([\w\s']+)["']?/i,
      /view\s+(?:the\s+)?mind\s*map(?:\s+called)?\s+["']?([\w\s']+)["']?/i,
      /mind\s*map(?:\s+called)?\s+["']?([\w\s']+)["']?\s+in\s+(?:the\s+)?sidebar/i
    ],
    resources: [
      /show\s+(?:me\s+)?(?:my\s+)?(?:uploaded\s+)?(?:resources|documents|files|uploads)/i,
      /what\s+(?:resources|documents|files)\s+(?:have\s+I|I've)\s+uploaded/i,
      /resources\s+(?:I've\s+)?(?:uploaded|added|shared)/i,
      /uploaded\s+(?:resources|documents|files)/i,
      /read\s+(?:my\s+)?(?:uploaded\s+)?(?:resources|documents|files|uploads)/i,
      /^(?:my\s+)?(?:resources|documents|files|uploads)/i
    ],
    allMaterials: [
      /show\s+(?:me\s+)?(?:my\s+)?(?:all\s+)?(?:study\s+)?materials/i,
      /what\s+(?:are\s+)?(?:all\s+)?(?:my\s+)?(?:study\s+)?materials/i,
      /all\s+(?:the\s+)?(?:study\s+)?materials\s+(?:I've\s+)?(?:created|made|have|uploaded)/i,
      /everything\s+(?:I've\s+)?(?:created|made|have|uploaded)/i,
      /read\s+(?:my\s+)?(?:all\s+)?(?:study\s+)?materials/i,
      /^(?:my\s+)?(?:study\s+)?materials/i,
      /^sidebar\s+(?:content|materials|stuff)/i
    ]
  };

  /**
   * The context service used to gather study materials
   */
  private contextService: typeof AthroContextService;

  constructor() {
    this.contextService = AthroContextService;
  }

  /**
   * Process messages to detect study material triggers and enhance context
   * @param messages Array of chat messages to process
   * @param athroId ID of the current Athro
   * @returns Enhanced context string with requested study materials
   */
  /**
   * Process system-triggered references (e.g., when a user clicks on a resource in the sidebar)
   * @param resourceId The ID of the resource that was clicked
   * @param athroId The ID of the current Athro
   * @returns Context string for the resource, or null if not found
   */
  async processResourceReference(resourceId: string, athroId: string): Promise<string | null> {
    try {
      console.log('🔍 Processing resource reference by ID:', resourceId);
      
      if (!resourceId || !athroId) {
        console.log('❌ Missing resource ID or Athro ID');
        return null;
      }
      
      // Try to load the resource by ID
      const resource = await StudyService.getResourceById(resourceId);
      
      if (!resource) {
        console.log('❌ Resource not found with ID:', resourceId);
        return null;
      }
      
      const fileName = resource.resourcePath ? resource.resourcePath.split('/').pop() || 'Unknown file' : 'Unknown file';
      console.log('✅ Found resource:', fileName);
      console.log('📚 Processing resource for AI context');
      
      // Process the resource content
      const processed = await new DocumentProcessingService().processDocument(resource);
      
      // Create different context based on whether we have actual content
      let context: string;
      
      if (processed.isActualContent) {
        // We have actual document content
        context = `RESOURCE ACCESSED:\n\n`;
        context += `RESOURCE: ${fileName}\n`;
        context += `TYPE: ${resource.resourceType}\n`;
        
        if (resource.topic) {
          context += `TOPIC: ${resource.topic}\n\n`;
        } else {
          context += '\n';
        }
        
        // Add the processed content
        context += processed.content;
        
        // Add specific instructions for the AI to acknowledge the resource access
        context += '\n\nINSTRUCTIONS FOR AI: The user has accessed this resource from their sidebar. ';
        context += 'Begin your response by acknowledging that you are now reviewing the document "' + fileName + '". ';
        context += 'Offer to help them understand it, create a study plan, generate questions, or organize the material. ';
        context += 'Ask about their specific needs or interests related to this document.';
      } else {
        // Document processing failed
        context = `RESOURCE ACCESS FAILED:\n\n`;
        context += `RESOURCE: ${fileName}\n`;
        context += `TYPE: ${resource.resourceType}\n\n`;
        context += `PROCESSING STATUS: ${processed.content}\n\n`;
        context += 'INSTRUCTIONS FOR AI: The document processing was not successful. ';
        context += 'Be honest that you were unable to read the document content. ';
        context += 'Explain what might have gone wrong and offer alternative ways to help. ';
        context += 'Ask the user to provide specific details about what they need help with.';
      }
      
      console.log('✅ Resource context created successfully');
      return context;
    } catch (error) {
      console.error('❌ Error processing resource reference:', error);
      return null;
    }
  }

  async processTriggers(messages: ChatMessage[], athroId: string): Promise<string | null> {
    try {
      if (!messages.length || !athroId) return null;

      // Only process the latest user message
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.role !== 'user') return null;

      const userInput = latestMessage.content.toLowerCase().trim();
      console.log('Checking for study material triggers in:', userInput);
      console.log('Message object:', JSON.stringify(latestMessage));
      console.log('AthroId:', athroId);
      
      // Check for a resource reference in the system message syntax
      // This would happen when a user clicks on a resource in the sidebar
      const resourceReferenceMatch = latestMessage.content.match(/AthroEnglish is now referencing the following resource:\s*Resource:\s*([^\n]+)/i);
      if (resourceReferenceMatch && resourceReferenceMatch[1]) {
        const resourceName = resourceReferenceMatch[1].trim();
        console.log('🔍 Detected sidebar resource reference:', resourceName);
        
        // Find the resource by name
        const allResources = await StudyService.getResources(athroId);
        const matchingResource = allResources.find(r => {
          const fileName = r.resourcePath ? r.resourcePath.split('/').pop() || '' : '';
          return fileName === resourceName;
        });
        
        if (matchingResource) {
          const matchingFileName = matchingResource.resourcePath ? matchingResource.resourcePath.split('/').pop() || 'Unknown file' : 'Unknown file';
        console.log('✅ Found resource by name:', matchingFileName);
          return this.processResourceReference(matchingResource.id, athroId);
        }
      }
      
      try {
        // Check for specific resource ID or mind map name references
        const specificReference = await this.detectSpecificReferences(userInput, athroId);
        if (specificReference) {
          console.log('Detected specific study material reference');
          return specificReference;
        }
      } catch (error) {
        console.error('Error in detectSpecificReferences:', error);
        // Continue with other checks
      }
      
      try {
        // Check for mind map in the message
        console.log('Testing for mind map references');
        if (/mind\s*map|mindmap/i.test(userInput)) {
          console.log('Simple mindmap keyword detected!');
          
          // Get all mind maps for this Athro
          console.log('📊 Getting mind maps for athro:', athroId);
          const mindMaps = await SupabaseStudyService.getMindMaps(athroId);
          console.log('📊 Mind maps found:', mindMaps.length);
          
          if (mindMaps.length > 0) {
            // Sort by most recent
            const sortedMaps = [...mindMaps].sort((a, b) => {
              if (a.updatedAt && b.updatedAt) {
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
              }
              return 0;
            });
            
            const mostRecent = sortedMaps[0];
            console.log('Most recent mind map:', mostRecent.topic);
            
            // Format the mind map
            const mindMapContext = await this.contextService.formatSingleMindMap(mostRecent);
            return `MIND MAP REQUESTED:\n\n${mindMapContext}`;
          }
        }
        
        // Check for sidebar mind map references without a specific name
        const sidebarMindMapReference = await this.detectSidebarMindMapReference(userInput, athroId);
        if (sidebarMindMapReference) {
          console.log('Detected sidebar mind map reference');
          return sidebarMindMapReference;
        }
      } catch (error) {
        console.error('Error in mind map detection:', error);
        // Continue with other checks
      }

      try {
        // If no specific references, check for general material types
        const triggerTypes = this.detectTriggerTypes(userInput);
        if (triggerTypes.length === 0) return null;

        console.log(`Detected study material triggers: ${triggerTypes.join(', ')}`);
        
        // Generate the appropriate context based on trigger types
        return this.generateContextForTriggers(triggerTypes, athroId);
      } catch (error) {
        console.error('Error in trigger types detection:', error);
      }
      
      return null;
    } catch (error: any) {
      console.error('ERROR in processTriggers:', error);
      // Return null instead of letting the error propagate
      return `Error in processing triggers: ${error?.message || 'Unknown error'}`;
      // Return string as context to allow AI to respond about the error
      // This way we can see the error in the response instead of a generic error message
    }
  }
  
  /**
   * Detect references to mind maps in the sidebar without a specific name
   * @param userInput The user's message content
   * @param athroId The ID of the current Athro
   * @returns Context string for sidebar mind maps, or null if none found
   */
  private async detectSidebarMindMapReference(userInput: string, athroId: string): Promise<string | null> {
    console.log('🔍 Checking for sidebar mind map references in:', userInput);
    console.log('🔍 Patterns to check:', this.triggerPatterns.sidebarMindMap.map(p => p.toString()));
    
    // Check each sidebar mind map pattern
    for (const pattern of this.triggerPatterns.sidebarMindMap) {
      console.log('🔍 Testing pattern:', pattern.toString());
      const match = userInput.match(pattern);
      if (match) {
        console.log('✅ MATCH FOUND! Pattern:', pattern.toString());
        console.log('✅ Match details:', match);
        
        // Get all mind maps for this Athro
        console.log('📊 Getting mind maps for athro:', athroId);
        const mindMaps = await SupabaseStudyService.getMindMaps(athroId);
        console.log('📊 Mind maps found:', mindMaps.length);
        console.log('📊 Mind map titles:', mindMaps.map(m => m.topic));
        
        if (mindMaps.length === 0) {
          console.log('❌ No mind maps found');
          return 'No mind maps found in the sidebar.';
        }
        
        // Specific node reference check (from pattern like "do you see the node called X")
        if (match[1]) {
          const nodeName = match[1].trim();
          console.log('Looking for specific node:', nodeName);
          
          // Check each mind map for the node
          for (const mindMap of mindMaps) {
            const mindMapContent = await this.contextService.formatSingleMindMap(mindMap);
            if (mindMapContent.toLowerCase().includes(nodeName.toLowerCase())) {
              return `MIND MAP NODE FOUND:\n\nI found the node "${nodeName}" in this mind map:\n\n${mindMapContent}`;
            }
          }
          
          return `I looked through all your mind maps, but couldn't find a node called "${nodeName}".`;
        }
        
        // If only one mind map exists, return its full content
        if (mindMaps.length === 1) {
          const mindMapContext = await this.contextService.formatSingleMindMap(mindMaps[0]);
          return `MIND MAP FROM SIDEBAR:\n\n${mindMapContext}`;
        }
        
        // If multiple mind maps exist, return all of them
        const mostRecentMindMap = mindMaps.sort((a, b) => {
          // Sort by most recent date if available
          if (a.updatedAt && b.updatedAt) {
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          }
          return 0;
        })[0];
        
        // If the query asks about "most recent" mind map, return just that one
        if (userInput.includes('most recent') || userInput.includes('latest')) {
          const mindMapContext = await this.contextService.formatSingleMindMap(mostRecentMindMap);
          return `MOST RECENT MIND MAP:\n\n${mindMapContext}`;
        }
        
        // Otherwise return all mind maps with detailed content
        let result = `MIND MAPS FROM SIDEBAR (${mindMaps.length} found):\n\n`;
        
        // Always put the most recent one first
        const mostRecentContent = await this.contextService.formatSingleMindMap(mostRecentMindMap);
        result += `=== MOST RECENT: ${mostRecentMindMap.topic} ===\n${mostRecentContent}\n\n`;
        
        // Process other mind maps
        for (const mindMap of mindMaps) {
          // Skip the most recent one as we already included it
          if (mindMap === mostRecentMindMap) continue;
          
          const mindMapContent = await this.contextService.formatSingleMindMap(mindMap);
          result += `=== ${mindMap.topic} ===\n${mindMapContent}\n\n`;
        }
        
        return result;
      }
    }
    
    return null;
  }
  
  /**
   * Detect specific references to resources by ID or mind maps by name
   * @param userInput The user's message content
   * @param athroId The ID of the current Athro
   * @returns Context string for the specific reference, or null if none found
   */
  private async detectSpecificReferences(userInput: string, athroId: string): Promise<string | null> {
    // Check for resource ID references
    for (const pattern of this.triggerPatterns.resourceById) {
      const match = userInput.match(pattern);
      if (match && match[1]) {
        const resourceIdOrNumber = match[1].trim();
        console.log('🔍 Detected specific resource reference:', resourceIdOrNumber);
        
        // Try to load the resource - first try as full ID, then as a number
        let resource = await StudyService.getResourceById(resourceIdOrNumber);
        
        // If not found, check if it's a number and load all resources to find by index
        if (!resource && /^\d+$/.test(resourceIdOrNumber)) {
          const resourceNumber = parseInt(resourceIdOrNumber, 10);
          const allResources = await StudyService.getResources(athroId);
          console.log('📁 Found', allResources.length, 'resources in total');
          
          // Adjust for 0-based indexing vs. 1-based user numbering
          const adjustedIndex = resourceNumber - 1;
          if (adjustedIndex >= 0 && adjustedIndex < allResources.length) {
            resource = allResources[adjustedIndex];
            const resourceFileName = resource.resourcePath ? resource.resourcePath.split('/').pop() || 'Unknown file' : 'Unknown file';
        console.log('✅ Found resource by index:', resourceFileName);
          }
        }
        
        if (resource) {        
        const fileName = resource.resourcePath ? resource.resourcePath.split('/').pop() || 'Unknown file' : 'Unknown file';
        console.log('📚 Processing resource:', fileName);
        // Process the resource content for readability
        const processed = await new DocumentProcessingService().processDocument(resource);
          
          // Create different context based on whether we have actual content
          let context: string;
          
          if (processed.isActualContent) {
            // We have actual document content
            const fileName = resource.resourcePath ? resource.resourcePath.split('/').pop() || 'Unknown file' : 'Unknown file';
            context = `RESOURCE REQUESTED:\n\n`;
            context += `RESOURCE: ${fileName}\n`;
            context += `TYPE: ${resource.resourceType}\n`;
            
            if (resource.topic) {
              context += `TOPIC: ${resource.topic}\n\n`;
            } else {
              context += '\n';
            }
            
            // Add the processed content
            context += processed.content;
            
            // Add specific instructions for the AI to acknowledge the resource
            context += '\n\nINSTRUCTIONS FOR AI: The user has requested information about this resource. ';
            context += 'Begin your response by acknowledging that you are now reviewing the document "' + fileName + '". ';
            context += 'Offer to help them understand it, create a study plan, generate questions, or organize the material into a structured format. ';
            context += 'Ask about their specific needs or interests related to this document.';
          } else {
            // Document processing failed
            const fileName = resource.resourcePath ? resource.resourcePath.split('/').pop() || 'Unknown file' : 'Unknown file';
            context = `RESOURCE PROCESSING FAILED:\n\n`;
            context += `RESOURCE: ${fileName}\n`;
            context += `TYPE: ${resource.resourceType}\n\n`;
            context += `PROCESSING STATUS: ${processed.content}\n\n`;
            context += 'INSTRUCTIONS FOR AI: The document processing was not successful. ';
            context += 'Be honest that you were unable to read the document content. ';
            context += 'Explain what might have gone wrong and offer alternative ways to help. ';
            context += 'Ask the user to provide specific details about what they need help with.';
          }
          
          return context;
        }
        
        return `Could not find resource with ID or number: ${resourceIdOrNumber}. Please check that you have the correct resource ID or try referring to the resource by name.`;
      }
    }
    
    // Check for mind map name references
    for (const pattern of this.triggerPatterns.mindMapByName) {
      const match = userInput.match(pattern);
      if (match && match[1]) {
        const mindMapName = match[1].trim();
        console.log('Detected specific mind map reference:', mindMapName);
        
        // Get all mind maps and find one with matching topic/name
        const mindMaps = await SupabaseStudyService.getMindMaps(athroId);
        const matchingMap = mindMaps.find(map => 
          map.topic.toLowerCase().includes(mindMapName.toLowerCase())
        );
        
        if (matchingMap) {
          // Extract full content and structure of the mind map
          const mindMapContext = await this.contextService.formatSingleMindMap(matchingMap);
          return `SPECIFIC MIND MAP REQUESTED:\n\n${mindMapContext}`;
        }
        
        return `Could not find mind map with name: ${mindMapName}`;
      }
    }
    
    // Check for note topic references
    for (const pattern of this.triggerPatterns.noteByTopic) {
      const match = userInput.match(pattern);
      if (match && match[1]) {
        const noteTopic = match[1].trim();
        console.log('Detected specific note topic reference:', noteTopic);
        
        // Get all notes and find those with matching topic
        const notes = await StudyService.getNotes(athroId);
        const matchingNotes = notes.filter(note => 
          note.topic.toLowerCase().includes(noteTopic.toLowerCase())
        );
        
        if (matchingNotes.length > 0) {
          // Format all matching notes
          const notesContext = this.contextService.formatNotesExternally(matchingNotes);
          return `SPECIFIC NOTES REQUESTED:\n\n${notesContext}`;
        }
        
        return `Could not find notes on topic: ${noteTopic}`;
      }
    }
    
    return null;
  }

  /**
   * Detect which types of triggers are present in the user input
   * @param userInput The user's message content
   * @returns Array of trigger types found
   */
  private detectTriggerTypes(userInput: string): string[] {
    const detectedTriggers: string[] = [];

    // Check each trigger pattern
    for (const [triggerType, patterns] of Object.entries(this.triggerPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(userInput)) {
          detectedTriggers.push(triggerType);
          break; // Only add each trigger type once
        }
      }
    }

    return detectedTriggers;
  }

  /**
   * Generate appropriate context based on the detected trigger types
   * @param triggerTypes Array of trigger types detected
   * @param athroId ID of the current Athro
   * @returns Context string containing the requested study materials
   */
  private async generateContextForTriggers(triggerTypes: string[], athroId: string): Promise<string> {
    let context = `athroId:${athroId}\n\n`;
    
    // If allMaterials is included, use the comprehensive context
    if (triggerTypes.includes('allMaterials')) {
      return await this.contextService.getComprehensiveContext(athroId);
    }
    
    // Otherwise build context based on specific triggers
    const materialPromises = [];
    
    // Helper function to format each material type
    const formatMaterial = async (type: string, getterFn: () => Promise<string>): Promise<string> => {
      try {
        const material = await getterFn();
        return material ? material : `No ${type} found for this session.`;
      } catch (error) {
        console.error(`Error fetching ${type}:`, error);
        return `Error loading ${type}.`;
      }
    };
    
    // Add promises for each requested material type
    if (triggerTypes.includes('flashcards')) {
      materialPromises.push(
        formatMaterial('flashcards', async () => {
          const flashcards = await StudyService.getFlashcards(athroId);
          return this.contextService.formatFlashcardsExternally(flashcards);
        })
      );
    }
    
    if (triggerTypes.includes('notes')) {
      materialPromises.push(
        formatMaterial('notes', async () => {
          const notes = await StudyService.getNotes(athroId);
          return this.contextService.formatNotesExternally(notes);
        })
      );
    }
    
    if (triggerTypes.includes('mindMaps')) {
      materialPromises.push(
        formatMaterial('mind maps', async () => {
          const mindMaps = await SupabaseStudyService.getMindMaps(athroId);
          return this.contextService.formatMindMapsExternally(mindMaps);
        })
      );
    }
    
    if (triggerTypes.includes('resources')) {
      materialPromises.push(
        formatMaterial('resources', async () => {
          const resources = await StudyService.getResources(athroId);
          return this.contextService.formatResourcesExternally(resources);
        })
      );
    }
    
    // Resolve all promises and combine the results
    const materialContexts = await Promise.all(materialPromises);
    context += materialContexts.join('\n\n');
    
    // Add instructions to explain what the AI has access to
    const materialTypes = triggerTypes.map(type => {
      switch (type) {
        case 'flashcards': return 'flashcards';
        case 'notes': return 'study notes';
        case 'mindMaps': return 'mind maps';
        case 'resources': return 'uploaded resources';
        default: return type;
      }
    });
    
    context += `\n\nINSTRUCTIONS: The user has requested information about their ${materialTypes.join(', ')}. ` +
               `The above content represents all their ${materialTypes.join(', ')} for this session. ` +
               `Please analyze and discuss this content in your response. If no items exist, let them know and suggest how they might create some.`;
    
    return context;
  }
}

export default new StudyMaterialTriggerService();
