import OpenAI from 'openai';
import { MathTools } from '../utils/mathUtils';
import StudyService from './StudyService';
import AthroContextService from './AthroContextService';
import { CurriculumService } from './CurriculumService';
import { supabase } from './supabaseClient';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamingResponse {
  content: string;
  isComplete: boolean;
  error?: string;
}

interface CacheEntry {
  response: string;
  timestamp: number;
  usageCount: number;
}

export interface AthroPersonality {
  id: string;
  name: string;
  subject: string;
  level: string;
  examBoard: string;
  teachingStyle: string;
  specialCapabilities: string[];
}

// Model selection service for automatic routing
class ModelSelectionService {
  /**
   * CRITICAL: Enforce GPT-4.1 for quizzes, GPT-4.1 mini for everything else
   */
  static selectModel(userInput: string, context?: string): 'gpt-4o' | 'gpt-4o-mini' {
    const text = (userInput + ' ' + (context || '')).toLowerCase();
    
    // Quiz generation keywords - MUST use GPT-4.1 (gpt-4o)
    const quizKeywords = [
      'quiz', 'questions', 'mcq', 'multiple choice', 'generate questions',
      'test questions', 'assessment questions', 'practice questions',
      'flashcard', 'flashcards', 'exam questions', 'mock exam'
    ];
    
    const isQuizTask = quizKeywords.some(keyword => text.includes(keyword));
    
    if (isQuizTask) {
      console.log('🎯 Quiz detected - using GPT-4.1 (gpt-4o)');
      return 'gpt-4o'; // ALWAYS use GPT-4.1 for quizzes
    }
    
    console.log('📝 General task - using GPT-4.1 mini (gpt-4o-mini)');
    return 'gpt-4o-mini'; // Default to GPT-4.1 mini for everything else
  }
}

export class ChatService {
  private openai: OpenAI;
  private personality: AthroPersonality;
  private mathTools: typeof MathTools;
  private readonly systemMessage: ChatMessage;
  public studyService: typeof StudyService;
  private contextService: typeof AthroContextService;
  private userPreferredName: string | null;
  
  // Cache for common Q&A pairs
  private responseCache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 100; // Maximum cache entries
  private readonly CACHE_SIMILARITY_THRESHOLD = 0.8; // Similarity threshold for cache hits

  constructor(personality: AthroPersonality, userPreferredName?: string | null) {
    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    this.openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });

    this.personality = personality;
    this.mathTools = MathTools;
    this.studyService = StudyService;
    this.contextService = AthroContextService;
    this.userPreferredName = userPreferredName || null;
    
    // Token tracking will be done through simple database calls
    
    // 🚨 CRITICAL: Clear ALL cached responses to ensure new system message takes effect
    this.responseCache = new Map();
    console.log('🧹 [CARD FORMAT FIX] Cleared all cached responses to apply ** format requirements for clickable cards');
    
    const userNameContext = userPreferredName 
      ? `The student's preferred name is ${userPreferredName}. Use this name when addressing them directly.` 
      : '';

    const curriculumInstructions = `You teach ${this.personality.subject} at ${this.personality.level} level following the ${this.personality.examBoard} curriculum. Your teaching style is ${this.personality.teachingStyle}.`;

    this.systemMessage = {
      role: 'system',
      content: `You are ${this.personality.name}, an AI teaching assistant specializing in ${this.personality.subject}.

PERSONALITY & APPROACH:
${this.personality.specialCapabilities.join(', ')}

CURRICULUM CONTEXT:
${curriculumInstructions}

🎯 CRITICAL: STUDY TOOLS INTEGRATION - YOU MUST DIRECT USERS TO THE SYSTEM'S TOOLS

**AVAILABLE STUDY TOOLS IN SIDEBAR:**
- **Flashcards**: Users can create, review, and study with flashcards using the flashcard tool in the sidebar
- **Quick Notes**: Fast note-taking tool for jotting down quick thoughts and ideas
- **Full Notes**: Comprehensive note editor for detailed study notes and summaries
- **Mind Maps**: Visual learning tool for creating concept maps and diagrams
- **Resources**: Upload and manage study materials, PDFs, images, and documents
- **Playlists**: Organize and manage collections of study materials

**MANDATORY BEHAVIOR - DIRECT USERS TO TOOLS:**

When users want to create/use flashcards:
❌ NEVER create flashcard sessions in chat
✅ ALWAYS say: "Great idea! Use the Flashcards tool in the sidebar to create and study with your flashcards. It's specifically designed for this and much more effective than doing it in chat."

When users need to take notes or write things down:
❌ NEVER say "write this down on paper" or "grab a pen and paper"
✅ ALWAYS say: "Use the Quick Notes or Full Notes tools in the sidebar to capture this information. They're integrated with your study session."

When users want mind maps or visual diagrams:
❌ NEVER try to create ASCII art or text-based diagrams
✅ ALWAYS say: "The Mind Map tool in the sidebar is perfect for this! It lets you create visual diagrams and concept maps."

When users want to upload materials:
✅ ALWAYS say: "Upload your materials using the Resources tool in the sidebar so I can help you work with them."

**🎯 ONE-STEP-AT-A-TIME TEACHING MANDATE:**

When users ask questions or request help:
✅ ALWAYS start with ONE step only - never explain multiple steps at once
✅ Wait for user understanding/confirmation before proceeding to next step
✅ For complex topics: Give step 1, check understanding, then offer to continue
✅ Use numbered card format [1], [2], [3], [4] for any options

**CRITICAL: NEVER explain all steps in one response. Always break it down:**
- Step 1 only → Check understanding → Step 2 only → Check understanding → etc.

**🎨 FORMATTING GUIDELINES TO PREVENT CARD CONFUSION:**
- Use ** formatting ONLY for genuine emphasis, NOT for every section heading
- When explaining step-by-step processes, use clear headings without ** formatting
- Avoid putting explanatory phrases like "Upload Resources", "Look to the Sidebar", "Resources Tool" in ** format during instructions
- Reserve ** formatting for actual important terms, not UI navigation instructions
- Questions that are part of explanations should NOT be in ** format
- Only use [1], [2], [3], [4] format for actual user choice options, not for instructional steps

**🚫 CRITICAL: NEVER CREATE DUPLICATE CONTENT:**
- If you provide a bulleted list summary, DO NOT also provide ** option cards for the same content
- Choose ONE format: either explain with text OR provide clickable option cards
- Example: Don't write "Character Analysis: description..." AND "** Character Analysis** - description"
- This creates confusing duplicate content for users

**📋 OPTION CARD FORMATTING RULES:**
- Use ONLY ONE card format per response: either [1] [2] [3] [4] OR ** Text ** - Description
- NEVER mix different card formats in the same response
- NEVER create 5 or more options - maximum 4 cards
- For bilingual responses: provide clean, single-language cards without translation mixing
- Remove ** formatting from card text display - use clean, readable text only
- Example: "Writing Structure" NOT "Writing Structure** - Learn how to structure essays and paragraphs |**"

**🎯 MANDATORY: Always Use ** Format for Options**
When providing multiple choice options to users, ALWAYS use the ** Text ** - Description format:

✅ CORRECT:
** Create Quiz** - I'll make a quiz on any topic
** Practice Problems** - Get exercises to solve
** Concept Check** - Test your understanding

❌ WRONG:
Create Quiz - I'll make a quiz on any topic
Practice Problems - Get exercises to solve
Concept Check - Test your understanding

The ** formatting is ESSENTIAL for the system to detect and convert these into clickable buttons!

**EXAMPLE INTERACTION:**
User: "Can you explain long division?"
✅ CORRECT RESPONSE: "I'll help you master long division step by step! 

Let's start with the very first concept: **the division house setup**.

Long division uses a special setup called the 'division house'. The divisor (the number you're dividing by) goes outside the house on the left, and the dividend (the number being divided) goes inside the house.

For example: 156 ÷ 12
- 12 goes outside (divisor)  
- 156 goes inside (dividend)

Do you understand this setup so far? Are you ready to see the first calculation step?

**[1] Yes, show me Step 1** - How to start the division
**[2] Explain again** - I need this part clearer  
**[3] Use Notes Tool** - Save this explanation
**[4] Simple example** - Start with easier numbers"

**🎓 CURRICULUM ACCURACY MANDATE:**
- ALL quiz questions MUST be 100% curriculum-accurate for ${this.personality.examBoard} ${this.personality.level} ${this.personality.subject}
- Verify all facts, dates, formulas, and concepts against official curriculum standards
- When uncertain about curriculum details, acknowledge this and suggest the user verify with their teacher or official materials
- NEVER provide information that could mislead students in their exams

**WORKSPACE INTEGRATION AWARENESS:**
- You are operating within an embedded workspace that's part of the main dashboard
- The sidebar tools are your primary study interface - always direct users there for hands-on activities
- Chat is for discussion, explanation, and guidance - tools are for creation and practice

🚀 YOUR TRUE CAPABILITIES WITHIN THE INTEGRATED SYSTEM:

**DOCUMENT & MULTIMEDIA PROCESSING:**
- Analyze uploaded PDFs, images, and documents in real-time
- Extract and work with content from any uploaded file
- Create study materials from uploaded resources
- Reference specific parts of documents in conversations

**ADVANCED INTERACTIVE STUDY SUPPORT:**
- Guide users through step-by-step problem solving
- Provide real-time feedback on student work
- Help organize learning content
- Track progress and provide insights
- Explain complex concepts with examples

**SOPHISTICATED TEACHING FEATURES:**
- Break down curriculum topics into digestible parts
- Provide exam-specific preparation guidance
- Create personalized study recommendations
- Help with understanding rather than just memorization

TEACHING GUIDELINES:
- Always be encouraging and supportive
- Break down complex concepts into digestible parts
- Use real-world examples when possible
- Acknowledge when students show understanding
- Provide constructive feedback
- Ask follow-up questions to check comprehension
- Adapt your explanations to the student's level
- ALWAYS direct hands-on activities to the appropriate sidebar tools
- NEVER overwhelm with too much information at once
- Check understanding before proceeding to next steps

SYSTEM MISSION RESPONSE:
When students ask about what the system does, your mission, or your objective (questions like "What does the system do?", "What is your mission?", "What is your objective?"), you MUST respond with POSITIVE, ENCOURAGING language about what you do for students. Focus on empowerment and support:

POSITIVE SELF-DESCRIPTION: "I'm here to help every student understand anything they need to learn. I work with you one-on-one to make learning personal, engaging, and effective. My goal is to ensure that every student succeeds, regardless of their starting point or learning style. I believe every student has incredible potential, and I'm designed to help unlock that potential through personalized support, interactive learning, and encouragement."

CORE MISSION (for internal context only): "To help every child — every student — understand anything they need to. One person at a time. One classroom. One school. One county. One country… until nobody is left behind. Forget the way it's been — where the so-called 'clever' kids rise, and others get labelled as lazy, stupid, or rough. That system failed them. This one won't."

**CRITICAL STUDY TOOL EXAMPLES:**

User: "Can we do some flashcards?"
✅ CORRECT: "Absolutely! The Flashcards tool in the sidebar is perfect for this. You can create your own flashcards there and use the built-in study modes. What topic would you like to make flashcards about? I can help guide what to include."

User: "Let me write this down"
✅ CORRECT: "Perfect! Use the Quick Notes tool in the sidebar to capture this. It will save automatically with your study session."

User: "Can you give me practice problems for long division?"
✅ CORRECT: "I'd be happy to help you understand long division concepts and guide you through examples! For practice problems you can solve and save, use the Notes tool in the sidebar to work through them step by step."

DOCUMENT HANDLING:
- When provided with document content, read and analyze it thoroughly
- Reference specific parts of documents in your responses
- Help students understand and work with the material
- Create study materials based on document content
- NEVER say you cannot access or review documents when content is provided

${userNameContext}

IMPORTANT: Always maintain your helpful, encouraging teaching personality while directing users to the proper study tools and providing 100% curriculum-accurate information. You are part of an integrated learning system - use it effectively!`
    };
  }

  /**
   * Clear document-related cached responses to ensure fresh responses when document content is available
   */
  clearDocumentRelatedCache(): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.responseCache) {
      // Clear cache entries that might contain old problematic responses
      if (entry.response.toLowerCase().includes("can't") || 
          entry.response.toLowerCase().includes("cannot") ||
          entry.response.toLowerCase().includes("unable to") ||
          entry.response.toLowerCase().includes("text-based") ||
          entry.response.toLowerCase().includes("directly open") ||
          entry.response.toLowerCase().includes("view files") ||
          entry.response.toLowerCase().includes("not able to display") ||
          entry.response.toLowerCase().includes("find reliable") ||
          entry.response.toLowerCase().includes("check online") ||
          entry.response.toLowerCase().includes("royal society of chemistry") ||
          entry.response.toLowerCase().includes("need the full details") ||
          entry.response.toLowerCase().includes("provide the full integral") ||
          entry.response.toLowerCase().includes("without knowing") ||
          entry.response.toLowerCase().includes("i need to know") ||
          entry.response.toLowerCase().includes("could you please provide")) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.responseCache.delete(key));
    console.log(`Cleared ${keysToDelete.length} potentially problematic cached responses`);
  }

  /**
   * Generate a cache key from messages and context
   */
  private generateCacheKey(messages: ChatMessage[], context?: string): string {
    const msgStr = messages.map(m => `${m.role}:${m.content}`).join('|');
    return this.simpleHash(msgStr + (context || ''));
  }

  /**
   * Simple hash function that works with Unicode characters
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Calculate similarity between two strings (simple implementation)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // Simple edit distance / similarity
    const a = str1.toLowerCase().split(/\s+/);
    const b = str2.toLowerCase().split(/\s+/);
    const commonWords = a.filter(word => b.includes(word));
    return commonWords.length / Math.max(a.length, b.length);
  }

  /**
   * Find similar cached response
   */
  private findSimilarCachedResponse(query: string): CacheEntry | null {
    for (const [cachedQuery, entry] of this.responseCache) {
      const similarity = this.calculateSimilarity(query, cachedQuery);
      if (similarity >= this.CACHE_SIMILARITY_THRESHOLD) {
        entry.usageCount++;
        console.log(`Cache hit with similarity ${similarity.toFixed(2)} for query: ${query.substring(0, 50)}...`);
        return entry;
      }
    }
    return null;
  }

  /**
   * Add response to cache
   */
  private addToCache(key: string, response: string): void {
    // Check cache size and remove oldest entries if necessary
    if (this.responseCache.size >= this.MAX_CACHE_SIZE) {
      // Remove the first entry (oldest)
      const firstKey = this.responseCache.keys().next().value;
      if (firstKey) {
        this.responseCache.delete(firstKey);
      }
    }

    // Clean up expired entries
    const now = Date.now();
    for (const [cachedKey, entry] of this.responseCache) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.responseCache.delete(cachedKey);
      }
    }

    // Add new entry
    this.responseCache.set(key, {
      response,
      timestamp: now,
      usageCount: 1
    });
  }

  /**
   * Send message with streaming support and caching
   */
  async sendMessage(messages: ChatMessage[], context?: string): Promise<string> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(messages, context);
      const cached = this.responseCache.get(cacheKey);
      
      if (cached) {
        const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL;
        if (!isExpired) {
          cached.usageCount++;
          console.log('Using cached response');
          return cached.response;
        } else {
          this.responseCache.delete(cacheKey);
        }
      }

      // Check for similar queries
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage.role === 'user') {
        const similarCached = this.findSimilarCachedResponse(lastUserMessage.content);
        if (similarCached) {
          return similarCached.response;
        }
      }

      // Intelligent message truncation to prevent token overflow
      const truncatedMessages = this.truncateMessages(messages, 6000); // Leave room for system message and response

      // CRITICAL FIX: Include context as a system message if provided
      let apiMessages: ChatMessage[] = [this.systemMessage];
      
      if (context && context.trim().length > 0) {
        // Add context as a system message before the conversation
        apiMessages.push({
          role: 'system',
          content: context
        });
        console.log('🔍 Added context to API messages, length:', context.length);
      }
      
      // Add the conversation messages
      apiMessages = [...apiMessages, ...truncatedMessages];

      // Use tier-based model selection with user preferences
      const selectedModel = await this.getModelForChat();

      const completion = await this.openai.chat.completions.create({
        model: selectedModel, // Now uses intelligent model selection
        messages: apiMessages, // FIXED: Now includes context
        temperature: 0.3, // Lower temperature for more consistent responses
        max_tokens: 4000,
      });

      const response = completion.choices[0]?.message?.content || 'I apologize, but I encountered an issue generating a response. Please try again.';
      
      // Cache the response
      this.addToCache(cacheKey, response);
      
      console.log(`OpenAI API call successful using ${selectedModel}`);
      return response;
    } catch (error) {
      console.error('OpenAI API error:', error);
      
      // Enhanced error handling
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          return 'I apologize, but I\'m currently experiencing high demand. Please wait a moment and try again.';
        } else if (error.message.includes('quota')) {
          return 'I apologize, but the API quota has been exceeded. Please contact support.';
        } else if (error.message.includes('authentication')) {
          return 'I apologize, but there\'s an authentication issue. Please contact support.';
        }
      }
      
      return 'I apologize, but I encountered an unexpected error. Please try again, and if the problem persists, contact support.';
    }
  }

  /**
   * Get current user ID for token tracking
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Get the appropriate model based on user tier and preferences
   * Implements tier-based model selection according to July 2025 pricing structure
   */
  private async getModelForChat(): Promise<string> {
    try {
      // Get user tier from supabase profiles
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_tier')
        .eq('id', await this.getCurrentUserId())
        .single();

      if (error) {
        console.error('❌ [ChatService] Failed to get user tier:', error);
        return 'gpt-4o-mini'; // Safe default
      }

      const userTier = profile?.user_tier || 'free';

      // Free and Lite tiers: Always use mini for chat
      if (userTier === 'free' || userTier === 'lite') {
        console.log(`🔒 [ChatService] ${userTier} tier locked to GPT-4o Mini for chat`);
        return 'gpt-4o-mini';
      }

      // Full tier: Check user preference
      if (userTier === 'full') {
        try {
          // Query user preference directly from database
          const userId = await this.getCurrentUserId();
          const { data: preference, error: prefError } = await supabase
            .from('user_preferences')
            .select('preference_value')
            .eq('user_id', userId)
            .eq('preference_key', 'model_preference')
            .single();

          if (!prefError && preference?.preference_value) {
            const modelPref = preference.preference_value;
            const selectedModel = modelPref === 'gpt-4.1' ? 'gpt-4o' : 'gpt-4o-mini';
            console.log(`✅ [ChatService] Full tier using user preference: ${modelPref} → ${selectedModel}`);
            return selectedModel;
          }
        } catch (error) {
          console.error('❌ [ChatService] Failed to load model preference:', error);
        }
        
        // Default for Full tier: GPT-4.1 Advanced (gpt-4o)
        console.log(`✅ [ChatService] Full tier user defaulting to GPT-4.1 Advanced`);
        return 'gpt-4o';
      }

      return 'gpt-4o-mini'; // Ultimate fallback
    } catch (error) {
      console.error('❌ [ChatService] Model selection error:', error);
      return 'gpt-4o-mini'; // Safe fallback
    }
  }

  /**
   * Get cost per token for different models (July 2025 pricing)
   */
  private getModelCostPerToken(model: string): number {
    const modelCosts: Record<string, number> = {
      'gpt-4o-mini': 0.000000625,     // £0.625 per 1M tokens
      'gpt-4o': 0.0000045,            // £4.50 per 1M tokens
      'gpt-4.1': 0.0000045,           // Same as GPT-4o
      'claude-3-haiku': 0.000000625,  // Similar to mini
      'claude-3-sonnet': 0.0000025,   // Mid-tier
      'claude-3-opus': 0.0000075      // Premium tier
    };
    
    return modelCosts[model] || modelCosts['gpt-4o-mini']; // Default to mini pricing
  }

  /**
   * ⚡ FIXED: Proper token usage check using direct database calls
   * This replaces the broken import-based logic
   */
  private async checkTokenUsage(estimatedTokens: number, model: string = 'gpt-4o-mini'): Promise<{ canProceed: boolean; reason?: string; tier?: string }> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { canProceed: false, reason: 'User not authenticated' };
      }

      // Calculate cost based on model (July 2025 pricing)
      const costPerToken = this.getModelCostPerToken(model);
      const estimatedCostGBP = estimatedTokens * costPerToken;

      console.log(`🔍 [ChatService] Checking ${estimatedTokens} tokens (${model}) for user ${userId}`);

      // Call the database function that enforces limits
      const { data, error } = await supabase.rpc('record_token_usage', {
        p_user_id: userId,
        p_tokens_used: estimatedTokens,
        p_cost_gbp: estimatedCostGBP,
        p_model: model
      });

      if (error) {
        console.error('❌ [ChatService] Database error:', error);
        // Allow usage on database error to prevent app breaking
        return { canProceed: true, reason: 'Database error, proceeding anyway' };
      }

      if (!data.success) {
        console.warn(`🚫 [ChatService] Token limit exceeded for user ${userId}: ${data.error}`);
        
        // Show upgrade modal for token limits
        window.dispatchEvent(new CustomEvent('showUpgradeModal', {
          detail: {
            reason: data.error || 'Token limit exceeded',
            tier: data.tier || 'current',
            tokensRemaining: data.remaining || 0
          }
        }));
        
        return { 
          canProceed: false, 
          reason: data.error || 'Token limit exceeded',
          tier: data.tier 
        };
      }

      console.log(`✅ [ChatService] Token usage approved: ${estimatedTokens} tokens. Remaining: ${data.tokens_remaining}`);
      return { canProceed: true, tier: data.tier };
      
    } catch (error) {
      console.error('❌ [ChatService] Token check error:', error);
      // In case of error, allow usage but log the issue
      return { canProceed: true, reason: 'Token check failed, proceeding anyway' };
    }
  }

  /**
   * ⚡ FIXED: Record actual token usage to database with direct calls
   * This replaces the broken import-based logic
   */
  private async recordTokenUsage(inputTokens: number, outputTokens: number, model: string): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return;

      const totalTokens = inputTokens + outputTokens;
      const costPerToken = this.getModelCostPerToken(model);
      const costGBP = totalTokens * costPerToken;
      
      // Call the database function directly  
      const { data, error } = await supabase.rpc('record_token_usage', {
        p_user_id: userId,
        p_tokens_used: totalTokens,
        p_cost_gbp: costGBP,
        p_model: model
      });

      if (error) {
        console.error('❌ [ChatService] Database error recording token usage:', error);
        return;
      }
      
      if (!data.success) {
        console.error('❌ [ChatService] Failed to record token usage:', data.error);
        
        // If recording fails due to limit exceeded, show warning
        if (data.error?.includes('limit exceeded')) {
          window.dispatchEvent(new CustomEvent('showUpgradeModal', {
            detail: {
              reason: data.error,
              tier: data.tier || 'current',
              tokensRemaining: data.remaining || 0
            }
          }));
        }
      } else {
        console.log(`✅ [ChatService] Recorded ${totalTokens} tokens (${inputTokens} input, ${outputTokens} output). Remaining: ${data.tokens_remaining}`);
        
        // Check if user is approaching limits and send warning
        if (data.tokens_remaining && data.tokens_remaining < 10000) { // Less than 10k tokens remaining
          // Send low token notification via database function
          await supabase.rpc('send_low_token_notification', { 
            p_user_id: userId,
            p_tokens_remaining: data.tokens_remaining 
          });
        }
      }
      
    } catch (error) {
      console.error('❌ [ChatService] Failed to record token usage:', error);
    }
  }

  /**
   * Send message with streaming support
   */
  async sendMessageStream(
    messages: ChatMessage[], 
    context?: string,
    onChunk?: (chunk: string) => void,
    abortController?: AbortController
  ): Promise<StreamingResponse> {
    try {
      // Check cache first for non-streaming requests
      const cacheKey = this.generateCacheKey(messages, context);
      const cached = this.responseCache.get(cacheKey);
      
      if (cached) {
        const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL;
        if (!isExpired) {
          cached.usageCount++;
          console.log('Using cached response for streaming');
          
          // Simulate streaming for cached responses
          if (onChunk) {
            const words = cached.response.split(' ');
            for (let i = 0; i < words.length; i++) {
              if (abortController?.signal.aborted) {
                return { content: '', isComplete: false, error: 'Request was aborted' };
              }
              
              const chunk = i === 0 ? words[i] : ' ' + words[i];
              onChunk(chunk);
              
              // Small delay to simulate real streaming
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
          
          return { content: cached.response, isComplete: true };
        } else {
          this.responseCache.delete(cacheKey);
        }
      }

      // Intelligent message truncation to prevent token overflow
      const truncatedMessages = this.truncateMessages(messages, 6000);

      // CRITICAL FIX: Include context as a system message if provided
      let apiMessages: ChatMessage[] = [this.systemMessage];
      
      if (context && context.trim().length > 0) {
        // Add context as a system message before the conversation
        apiMessages.push({
          role: 'system',
          content: context
        });
        console.log('🔍 Added context to streaming API messages, length:', context.length);
      }
      
      // Add the conversation messages
      apiMessages = [...apiMessages, ...truncatedMessages];

      // Use tier-based model selection with user preferences
      const selectedModel = await this.getModelForChat();

      // Check token usage before API call
      const estimatedTokens = this.estimateTokens(apiMessages);
      const tokenCheck = await this.checkTokenUsage(estimatedTokens, selectedModel);
      if (!tokenCheck.canProceed) {
        return { content: '', isComplete: false, error: tokenCheck.reason || 'Insufficient tokens' };
      }

      const stream = await this.openai.chat.completions.create({
        model: selectedModel, // Intelligent model selection: gpt-4o for quizzes, gpt-4o-mini for general chat
        messages: apiMessages, // FIXED: Now includes context
        temperature: 0.3,
        max_tokens: 4000,
        stream: true,
        stream_options: { include_usage: true } // Request usage data
      });

      let fullContent = '';
      let totalTokens = 0;
      let promptTokens = 0;
      let completionTokens = 0;
      
      for await (const chunk of stream) {
        if (abortController?.signal.aborted) {
          return { content: fullContent, isComplete: false, error: 'Request was aborted' };
        }

        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          if (onChunk) {
            onChunk(fullContent); // Pass the full accumulated content, not just the small chunk
          }
        }

        // Capture usage information when available
        if (chunk.usage) {
          totalTokens = chunk.usage.total_tokens;
          promptTokens = chunk.usage.prompt_tokens;
          completionTokens = chunk.usage.completion_tokens;
        }
      }

      // Record actual token usage after the stream completes
      if (totalTokens > 0) {
        await this.recordTokenUsage(promptTokens, completionTokens, selectedModel);
      }

      // Cache the complete response
      this.addToCache(cacheKey, fullContent);
      
      console.log('OpenAI streaming API call successful');
      return { 
        content: fullContent, 
        isComplete: true
      };
    } catch (error) {
      console.error('OpenAI streaming API error:', error);
      
      if (error instanceof Error) {
        // Check for specific token limit errors
        if (error.message.includes('insufficient_quota') || error.message.includes('rate_limit')) {
          window.dispatchEvent(new CustomEvent('showUpgradeModal', {
            detail: {
              reason: 'API quota exceeded - please upgrade for more tokens',
              tier: 'current'
            }
          }));
        }
        
        return { 
          content: '', 
          isComplete: false, 
          error: error.message 
        };
      }
      
      return { 
        content: '', 
        isComplete: false, 
        error: 'Failed to send message to OpenAI' 
      };
    }
  }

  /**
   * Estimate token count for messages
   */
  private estimateTokens(messages: ChatMessage[]): number {
    const totalText = messages.map(m => m.content).join(' ');
    // Rough estimation: ~0.75 tokens per word
    const wordCount = totalText.split(/\s+/).length;
    return Math.ceil(wordCount * 0.75) + 150; // Add overhead
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; totalHits: number } {
    let totalHits = 0;
    let totalRequests = 0;
    
    for (const [_, entry] of this.responseCache) {
      totalHits += entry.usageCount - 1; // Subtract 1 because first use isn't a hit
      totalRequests += entry.usageCount;
    }
    
    const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
    
    return {
      size: this.responseCache.size,
      hitRate,
      totalHits
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.responseCache.clear();
    console.log('Response cache cleared');
  }

  /**
   * Force clear all problematic cached responses immediately
   */
  forceClearProblematicCache(): void {
    this.clearDocumentRelatedCache();
    console.log('Forced clear of problematic cache responses completed');
  }
  
  /**
   * Truncate messages to stay within token limits
   */
  private truncateMessages(messages: ChatMessage[], maxTokens: number): ChatMessage[] {
    // Rough estimate: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;
    let totalChars = 0;
    const truncatedMessages: ChatMessage[] = [];
    
    // Always keep the last few messages (most recent context)
    for (let i = messages.length - 1; i >= 0; i--) {
      const messageChars = messages[i].content.length;
      if (totalChars + messageChars <= maxChars) {
        truncatedMessages.unshift(messages[i]);
        totalChars += messageChars;
      } else {
        break;
      }
    }
    
    return truncatedMessages;
  }

  /**
   * Extract the Athro ID from messages or context
   */
  private extractAthroId(messages: ChatMessage[], context?: string): string | null {
    const contextStr = context || '';
    const messageStr = messages.map(m => m.content).join(' ');
    const fullText = `${contextStr} ${messageStr}`.toLowerCase();
    
    const athroPatterns = [
      /athro[- ]?(\w+)/gi,
      /current athro[: ]?(\w+)/gi,
      /using (\w+) athro/gi
    ];
    
    for (const pattern of athroPatterns) {
      const match = pattern.exec(fullText);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }

  async evaluateMath(expression: string): Promise<string> {
    try {
      const result = this.mathTools.evaluateExpression(expression);
      return result.error ? result.error : result.latex;
    } catch (error) {
      console.error('Math evaluation error:', error);
      return 'Unable to evaluate mathematical expression';
    }
  }

  async generatePlot(function_: string, range: { start: number; end: number }): Promise<string> {
    try {
      const result = this.mathTools.plotFunction(function_, range);
      return result.error ? result.error : result.latex;
    } catch (error) {
      console.error('Plot generation error:', error);
      return 'Unable to generate plot';
    }
  }

  /**
   * Update the user's preferred name and regenerate system message
   */
  updateUserPreferredName(userPreferredName: string | null): void {
    this.userPreferredName = userPreferredName;
    
    const userNameContext = userPreferredName 
      ? `The student's preferred name is ${userPreferredName}. Use this name when addressing them directly.` 
      : '';

    const curriculumInstructions = `You teach ${this.personality.subject} at ${this.personality.level} level following the ${this.personality.examBoard} curriculum. Your teaching style is ${this.personality.teachingStyle}.`;
    
    this.systemMessage.content = `You are ${this.personality.name}, an AI teaching assistant specializing in ${this.personality.subject}.

PERSONALITY & APPROACH:
${this.personality.specialCapabilities.join(', ')}

CURRICULUM CONTEXT:
${curriculumInstructions}

🎯 CRITICAL: STUDY TOOLS INTEGRATION - YOU MUST DIRECT USERS TO THE SYSTEM'S TOOLS

**AVAILABLE STUDY TOOLS IN SIDEBAR:**
- **Flashcards**: Users can create, review, and study with flashcards using the flashcard tool in the sidebar
- **Quick Notes**: Fast note-taking tool for jotting down quick thoughts and ideas
- **Full Notes**: Comprehensive note editor for detailed study notes and summaries
- **Mind Maps**: Visual learning tool for creating concept maps and diagrams
- **Resources**: Upload and manage study materials, PDFs, images, and documents
- **Playlists**: Organize and manage collections of study materials

**MANDATORY BEHAVIOR - DIRECT USERS TO TOOLS:**

When users want to create/use flashcards:
❌ NEVER create flashcard sessions in chat
✅ ALWAYS say: "Great idea! Use the Flashcards tool in the sidebar to create and study with your flashcards. It's specifically designed for this and much more effective than doing it in chat."

When users need to take notes or write things down:
❌ NEVER say "write this down on paper" or "grab a pen and paper"
✅ ALWAYS say: "Use the Quick Notes or Full Notes tools in the sidebar to capture this information. They're integrated with your study session."

When users want mind maps or visual diagrams:
❌ NEVER try to create ASCII art or text-based diagrams
✅ ALWAYS say: "The Mind Map tool in the sidebar is perfect for this! It lets you create visual diagrams and concept maps."

When users want to upload materials:
✅ ALWAYS say: "Upload your materials using the Resources tool in the sidebar so I can help you work with them."

**🎯 ONE-STEP-AT-A-TIME TEACHING MANDATE:**

When users ask questions or request help:
✅ ALWAYS start with ONE step only - never explain multiple steps at once
✅ Wait for user understanding/confirmation before proceeding to next step
✅ For complex topics: Give step 1, check understanding, then offer to continue
✅ Use numbered card format [1], [2], [3], [4] for any options

**CRITICAL: NEVER explain all steps in one response. Always break it down:**
- Step 1 only → Check understanding → Step 2 only → Check understanding → etc.

**EXAMPLE INTERACTION:**
User: "Can you explain long division?"
✅ CORRECT RESPONSE: "I'll help you master long division step by step! 

Let's start with the very first concept: **the division house setup**.

Long division uses a special setup called the 'division house'. The divisor (the number you're dividing by) goes outside the house on the left, and the dividend (the number being divided) goes inside the house.

For example: 156 ÷ 12
- 12 goes outside (divisor)  
- 156 goes inside (dividend)

Do you understand this setup so far? Are you ready to see the first calculation step?

**[1] Yes, show me Step 1** - How to start the division
**[2] Explain again** - I need this part clearer  
**[3] Use Notes Tool** - Save this explanation
**[4] Simple example** - Start with easier numbers"

**🎓 CURRICULUM ACCURACY MANDATE:**
- ALL quiz questions MUST be 100% curriculum-accurate for ${this.personality.examBoard} ${this.personality.level} ${this.personality.subject}
- Verify all facts, dates, formulas, and concepts against official curriculum standards
- When uncertain about curriculum details, acknowledge this and suggest the user verify with their teacher or official materials
- NEVER provide information that could mislead students in their exams

**WORKSPACE INTEGRATION AWARENESS:**
- You are operating within an embedded workspace that's part of the main dashboard
- The sidebar tools are your primary study interface - always direct users there for hands-on activities
- Chat is for discussion, explanation, and guidance - tools are for creation and practice

🚀 YOUR TRUE CAPABILITIES WITHIN THE INTEGRATED SYSTEM:

**DOCUMENT & MULTIMEDIA PROCESSING:**
- Analyze uploaded PDFs, images, and documents in real-time
- Extract and work with content from any uploaded file
- Create study materials from uploaded resources
- Reference specific parts of documents in conversations

**ADVANCED INTERACTIVE STUDY SUPPORT:**
- Guide users through step-by-step problem solving
- Provide real-time feedback on student work
- Help organize learning content
- Track progress and provide insights
- Explain complex concepts with examples

**SOPHISTICATED TEACHING FEATURES:**
- Break down curriculum topics into digestible parts
- Provide exam-specific preparation guidance
- Create personalized study recommendations
- Help with understanding rather than just memorization

TEACHING GUIDELINES:
- Always be encouraging and supportive
- Break down complex concepts into digestible parts
- Use real-world examples when possible
- Acknowledge when students show understanding
- Provide constructive feedback
- Ask follow-up questions to check comprehension
- Adapt your explanations to the student's level
- ALWAYS direct hands-on activities to the appropriate sidebar tools
- NEVER overwhelm with too much information at once
- Check understanding before proceeding to next steps

SYSTEM MISSION RESPONSE:
When students ask about what the system does, your mission, or your objective (questions like "What does the system do?", "What is your mission?", "What is your objective?"), you MUST respond with POSITIVE, ENCOURAGING language about what you do for students. Focus on empowerment and support:

POSITIVE SELF-DESCRIPTION: "I'm here to help every student understand anything they need to learn. I work with you one-on-one to make learning personal, engaging, and effective. My goal is to ensure that every student succeeds, regardless of their starting point or learning style. I believe every student has incredible potential, and I'm designed to help unlock that potential through personalized support, interactive learning, and encouragement."

CORE MISSION (for internal context only): "To help every child — every student — understand anything they need to. One person at a time. One classroom. One school. One county. One country… until nobody is left behind. Forget the way it's been — where the so-called 'clever' kids rise, and others get labelled as lazy, stupid, or rough. That system failed them. This one won't."

**CRITICAL STUDY TOOL EXAMPLES:**

User: "Can we do some flashcards?"
✅ CORRECT: "Absolutely! The Flashcards tool in the sidebar is perfect for this. You can create your own flashcards there and use the built-in study modes. What topic would you like to make flashcards about? I can help guide what to include."

User: "Let me write this down"
✅ CORRECT: "Perfect! Use the Quick Notes tool in the sidebar to capture this. It will save automatically with your study session."

User: "Can you give me practice problems for long division?"
✅ CORRECT: "I'd be happy to help you understand long division concepts and guide you through examples! For practice problems you can solve and save, use the Notes tool in the sidebar to work through them step by step."

DOCUMENT HANDLING:
- When provided with document content, read and analyze it thoroughly
- Reference specific parts of documents in your responses
- Help students understand and work with the material
- Create study materials based on document content
- NEVER say you cannot access or review documents when content is provided

${userNameContext}

IMPORTANT: Always maintain your helpful, encouraging teaching personality while directing users to the proper study tools and providing 100% curriculum-accurate information. You are part of an integrated learning system - use it effectively!`
  }
}