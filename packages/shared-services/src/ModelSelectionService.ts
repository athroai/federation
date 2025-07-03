/**
 * ✅ ATHRO AI MODEL SELECTION SERVICE
 * 
 * Automatically routes between GPT-3.5-Turbo and GPT-4-Turbo based on task type
 * Implements cost-effective AI usage following the specification
 */

export interface ModelSelection {
  model: 'gpt-3.5-turbo' | 'gpt-4-turbo';
  reason: string;
  estimatedTokens: number;
  estimatedCostUSD: number;
  taskType: string;
}

export interface TaskAnalysis {
  isComplexTask: boolean;
  requiresAdvancedReasoning: boolean;
  involvesDocumentAnalysis: boolean;
  isCreativeTask: boolean;
  taskType: string;
  confidence: number;
}

export class ModelSelectionService {
  private static instance: ModelSelectionService;

  // Model pricing (per 1000 tokens) - approximate values
  private readonly MODEL_COSTS = {
    'gpt-3.5-turbo': {
      input: 0.0015,   // $0.0015 per 1K input tokens
      output: 0.002    // $0.002 per 1K output tokens
    },
    'gpt-4-turbo': {
      input: 0.01,     // $0.01 per 1K input tokens  
      output: 0.03     // $0.03 per 1K output tokens
    }
  };

  // Task type patterns for automatic detection
  private readonly TASK_PATTERNS = {
    // GPT-4 Tasks (Complex/Advanced)
    DOCUMENT_ANALYSIS: [
      'analyze', 'review', 'feedback', 'critique', 'evaluate', 'assess',
      'pdf', 'document', 'file', 'upload', 'attachment', 'paper', 'essay'
    ],
    MARKING_GRADING: [
      'mark', 'grade', 'score', 'marking', 'grading', 'assessment', 
      'rubric', 'criteria', 'exam', 'test', 'assignment'
    ],
    QUIZ_GENERATION: [
      'quiz', 'questions', 'mcq', 'multiple choice', 'generate questions',
      'test questions', 'assessment questions', 'practice questions'
    ],
    STRUCTURED_CONTENT: [
      'summary', 'summarize', 'outline', 'structure', 'organize',
      'format', 'template', 'framework', 'plan', 'strategy'
    ],
    FLASHCARD_CREATION: [
      'flashcard', 'flashcards', 'memory cards', 'study cards',
      'create cards', 'make flashcards'
    ],
    PAST_PAPER_HELP: [
      'past paper', 'exam question', 'solve', 'worked example',
      'step by step', 'solution', 'answer key'
    ],

    // GPT-3.5 Tasks (Simple/General)
    GENERAL_CHAT: [
      'hello', 'hi', 'how are you', 'what is', 'explain', 'help',
      'tell me', 'can you', 'do you know', 'simple question'
    ],
    BASIC_QA: [
      'define', 'definition', 'meaning', 'what does', 'basic',
      'simple', 'quick question', 'briefly'
    ],
    ENCOURAGEMENT: [
      'motivation', 'encourage', 'support', 'confidence', 'anxiety',
      'stress', 'feeling', 'mood', 'wellbeing'
    ],
    LIGHT_GUIDANCE: [
      'tips', 'advice', 'suggestion', 'recommend', 'should i',
      'how to', 'best way', 'guidance'
    ]
  };

  private constructor() {}

  static getInstance(): ModelSelectionService {
    if (!ModelSelectionService.instance) {
      ModelSelectionService.instance = new ModelSelectionService();
    }
    return ModelSelectionService.instance;
  }

  /**
   * Analyze task to determine complexity and requirements
   */
  analyzeTask(input: string, context?: string): TaskAnalysis {
    const text = (input + ' ' + (context || '')).toLowerCase();
    
    // Check for complex task indicators
    const hasDocumentKeywords = this.checkPatterns(text, this.TASK_PATTERNS.DOCUMENT_ANALYSIS);
    const hasMarkingKeywords = this.checkPatterns(text, this.TASK_PATTERNS.MARKING_GRADING);
    const hasQuizKeywords = this.checkPatterns(text, this.TASK_PATTERNS.QUIZ_GENERATION);
    const hasStructuredKeywords = this.checkPatterns(text, this.TASK_PATTERNS.STRUCTURED_CONTENT);
    const hasFlashcardKeywords = this.checkPatterns(text, this.TASK_PATTERNS.FLASHCARD_CREATION);
    const hasPastPaperKeywords = this.checkPatterns(text, this.TASK_PATTERNS.PAST_PAPER_HELP);

    // Check for simple task indicators
    const hasGeneralChatKeywords = this.checkPatterns(text, this.TASK_PATTERNS.GENERAL_CHAT);
    const hasBasicQAKeywords = this.checkPatterns(text, this.TASK_PATTERNS.BASIC_QA);
    const hasEncouragementKeywords = this.checkPatterns(text, this.TASK_PATTERNS.ENCOURAGEMENT);
    const hasGuidanceKeywords = this.checkPatterns(text, this.TASK_PATTERNS.LIGHT_GUIDANCE);

    // Determine task type and complexity
    let taskType = 'general_chat';
    let isComplexTask = false;
    let confidence = 0.6; // Default confidence

    if (hasDocumentKeywords.score > 0.3) {
      taskType = 'document_analysis';
      isComplexTask = true;
      confidence = hasDocumentKeywords.score;
    } else if (hasMarkingKeywords.score > 0.3) {
      taskType = 'marking_grading';
      isComplexTask = true;
      confidence = hasMarkingKeywords.score;
    } else if (hasQuizKeywords.score > 0.3) {
      taskType = 'quiz_generation';
      isComplexTask = true;
      confidence = hasQuizKeywords.score;
    } else if (hasFlashcardKeywords.score > 0.3) {
      taskType = 'flashcard_creation';
      isComplexTask = true;
      confidence = hasFlashcardKeywords.score;
    } else if (hasPastPaperKeywords.score > 0.3) {
      taskType = 'past_paper_help';
      isComplexTask = true;
      confidence = hasPastPaperKeywords.score;
    } else if (hasStructuredKeywords.score > 0.4) {
      taskType = 'structured_content';
      isComplexTask = true;
      confidence = hasStructuredKeywords.score;
    } else if (hasBasicQAKeywords.score > 0.3) {
      taskType = 'basic_qa';
      isComplexTask = false;
      confidence = hasBasicQAKeywords.score;
    } else if (hasEncouragementKeywords.score > 0.3) {
      taskType = 'encouragement';
      isComplexTask = false;
      confidence = hasEncouragementKeywords.score;
    } else if (hasGuidanceKeywords.score > 0.3) {
      taskType = 'light_guidance';
      isComplexTask = false;
      confidence = hasGuidanceKeywords.score;
    } else if (hasGeneralChatKeywords.score > 0.2) {
      taskType = 'general_chat';
      isComplexTask = false;
      confidence = hasGeneralChatKeywords.score;
    }

    // Additional heuristics
    const wordCount = text.split(' ').length;
    const hasFileUpload = text.includes('upload') || text.includes('file') || text.includes('pdf');
    const hasStepByStep = text.includes('step') || text.includes('explain how') || text.includes('show me');

    return {
      isComplexTask,
      requiresAdvancedReasoning: isComplexTask || hasStepByStep,
      involvesDocumentAnalysis: hasFileUpload || hasDocumentKeywords.score > 0.2,
      isCreativeTask: taskType.includes('quiz') || taskType.includes('flashcard'),
      taskType,
      confidence: Math.min(confidence + (wordCount > 50 ? 0.1 : 0), 1.0)
    };
  }

  /**
   * Select the best model for a given task
   */
  selectModel(input: string, context?: string, forceModel?: 'gpt-3.5-turbo' | 'gpt-4-turbo'): ModelSelection {
    if (forceModel) {
      return {
        model: forceModel,
        reason: 'Model manually specified',
        estimatedTokens: this.estimateTokens(input, context),
        estimatedCostUSD: this.calculateCost(forceModel, this.estimateTokens(input, context)),
        taskType: 'manual_selection'
      };
    }

    const analysis = this.analyzeTask(input, context);
    const estimatedTokens = this.estimateTokens(input, context);

    // Decision logic based on task analysis
    if (analysis.isComplexTask || analysis.requiresAdvancedReasoning) {
      return {
        model: 'gpt-4-turbo',
        reason: `Complex task detected: ${analysis.taskType} (confidence: ${(analysis.confidence * 100).toFixed(0)}%)`,
        estimatedTokens,
        estimatedCostUSD: this.calculateCost('gpt-4-turbo', estimatedTokens),
        taskType: analysis.taskType
      };
    }

    // For simple tasks, use GPT-3.5
    return {
      model: 'gpt-3.5-turbo',
      reason: `Simple task detected: ${analysis.taskType} (confidence: ${(analysis.confidence * 100).toFixed(0)}%)`,
      estimatedTokens,
      estimatedCostUSD: this.calculateCost('gpt-3.5-turbo', estimatedTokens),
      taskType: analysis.taskType
    };
  }

  /**
   * Get model configuration for API calls
   */
  getModelConfig(selection: ModelSelection): {
    model: string;
    maxTokens: number;
    temperature: number;
    topP: number;
  } {
    const baseConfig = {
      model: selection.model,
      temperature: 0.7,
      topP: 0.9
    };

    // Adjust parameters based on task type
    switch (selection.taskType) {
      case 'document_analysis':
      case 'marking_grading':
        return {
          ...baseConfig,
          maxTokens: 2000,
          temperature: 0.3 // More focused and consistent
        };
      
      case 'quiz_generation':
      case 'flashcard_creation':
        return {
          ...baseConfig,
          maxTokens: 1500,
          temperature: 0.5 // Balanced creativity and structure
        };
      
      case 'structured_content':
        return {
          ...baseConfig,
          maxTokens: 1500,
          temperature: 0.4 // Structured but some flexibility
        };
      
      case 'general_chat':
      case 'encouragement':
        return {
          ...baseConfig,
          maxTokens: 800,
          temperature: 0.8 // More conversational and warm
        };
      
      default:
        return {
          ...baseConfig,
          maxTokens: 1000,
          temperature: 0.7
        };
    }
  }

  /**
   * Calculate estimated cost for a model and token count
   */
  calculateCost(model: 'gpt-3.5-turbo' | 'gpt-4-turbo', estimatedTokens: number): number {
    const costs = this.MODEL_COSTS[model];
    // Assume roughly equal input/output tokens for estimation
    const inputTokens = estimatedTokens * 0.7;
    const outputTokens = estimatedTokens * 0.3;
    
    return ((inputTokens * costs.input) + (outputTokens * costs.output)) / 1000;
  }

  /**
   * Estimate token count for input text
   */
  private estimateTokens(input: string, context?: string): number {
    const text = input + ' ' + (context || '');
    // Rough estimation: ~0.75 tokens per word for English
    const wordCount = text.split(/\s+/).length;
    const baseTokens = Math.ceil(wordCount * 0.75);
    
    // Add overhead for system messages and formatting
    const overhead = 150;
    
    return baseTokens + overhead;
  }

  /**
   * Check patterns in text and return match score
   */
  private checkPatterns(text: string, patterns: string[]): { score: number; matches: string[] } {
    const matches: string[] = [];
    let totalScore = 0;
    
    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        matches.push(pattern);
        // Weight longer patterns more heavily
        totalScore += pattern.split(' ').length * 0.1;
      }
    }
    
    // Normalize score based on text length and pattern count
    const normalizedScore = Math.min(totalScore / Math.max(patterns.length * 0.1, 1), 1.0);
    
    return {
      score: normalizedScore,
      matches
    };
  }

  /**
   * Get usage statistics and recommendations
   */
  getUsageRecommendations(userTier: 'free' | 'lite' | 'full', tokensUsed: number): {
    shouldOptimizeForCost: boolean;
    recommendedModel: 'gpt-3.5-turbo' | 'gpt-4-turbo' | 'auto';
    costSavingTips: string[];
  } {
    const isHighUsage = tokensUsed > (userTier === 'free' ? 1000 : 12000);
    
    return {
      shouldOptimizeForCost: userTier === 'free' || isHighUsage,
      recommendedModel: userTier === 'free' && isHighUsage ? 'gpt-3.5-turbo' : 'auto',
      costSavingTips: userTier === 'free' || isHighUsage ? [
        'Use shorter, more specific questions',
        'Combine multiple questions into one request',
        'Consider upgrading for more daily usage'
      ] : []
    };
  }
} 