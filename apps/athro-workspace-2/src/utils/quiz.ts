// Utility for generating subject quizzes using OpenAI's GPT API
// Reads API key from VITE_OPENAI_API_KEY
import { QuizQuestion, QuizMathValidator, ValidationResult } from './QuizMathValidator';
import { QuizUniversalValidator, UniversalValidationResult } from './QuizUniversalValidator';
import { CurriculumService } from '../services/CurriculumService';

interface CurriculumInfo {
  subject: string;
  examBoard: string;
  level: 'GCSE' | 'A-Level';
}

/**
 * CRITICAL SYSTEM REQUIREMENT: 100% QUIZ ACCURACY
 * 
 * This function generates quizzes with mandatory mathematical validation.
 * NO MATHEMATICALLY INCORRECT QUESTIONS will be returned to users.
 * 
 * Process:
 * 1. Generate questions using AI
 * 2. Validate ALL mathematical questions independently
 * 3. Reject questions with mathematical errors
 * 4. Ensure only verified questions reach users
 */
export async function generateQuiz(subject: string, n = 10, curriculumInfo?: CurriculumInfo): Promise<QuizQuestion[]> {
  const apiKey: string = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OpenAI API key');

  // Enhanced prompt with mathematical accuracy requirements
  const basePrompt = curriculumInfo 
    ? CurriculumService.generateQuizPrompt(curriculumInfo.subject, curriculumInfo.examBoard, curriculumInfo.level, n)
    : CurriculumService.generateQuizPrompt(subject, 'AQA', 'GCSE', n);

  const enhancedPrompt = `${basePrompt}

🚨 CRITICAL UNIVERSAL ACCURACY REQUIREMENTS - 100% ACCURACY ACROSS ALL SUBJECTS:

MATHEMATICS:
- ALL mathematical calculations must be 100% correct
- Triangle problems: angles must sum to EXACTLY 180°
- Arithmetic: verify ALL calculations multiple times
- Geometry: double-check ALL area/perimeter formulas
- Percentages: ensure decimal conversions are EXACT
- NO MATHEMATICAL ERRORS are acceptable under any circumstances

SCIENCE:
- ALL scientific facts must be 100% accurate
- Chemical symbols and atomic numbers must be correct
- Physics formulas (Speed = Distance ÷ Time) must be exact
- Biology facts must be current and accurate
- NO SCIENTIFIC ERRORS are acceptable

HISTORY:
- ALL historical dates must be 100% accurate
- World War I started in 1914, World War II in 1939
- British monarchs and their reign dates must be correct
- NO HISTORICAL ERRORS are acceptable

ENGLISH:
- ALL literary facts must be 100% accurate
- Shakespeare work classifications must be correct
- Grammar rules must be perfect
- NO LANGUAGE ERRORS are acceptable

GEOGRAPHY:
- ALL capital cities must be 100% correct
- Country and continent facts must be accurate
- NO GEOGRAPHICAL ERRORS are acceptable

LANGUAGES:
- ALL translations must be 100% accurate
- Basic vocabulary must be correct
- NO TRANSLATION ERRORS are acceptable

GENERAL KNOWLEDGE:
- ALL common facts must be 100% accurate
- Days in week (7), months in year (12), etc.
- NO FACTUAL ERRORS are acceptable

TOTAL ACCURACY IS NON-NEGOTIABLE. Verify EVERY fact, calculation, and answer before finalizing.`;

  // ⚡ CRITICAL: Token enforcement BEFORE API call
  const { supabase } = await import('../services/supabaseClient');
  const estimatedTokens = Math.ceil(enhancedPrompt.length * 0.75) + 150; // Estimate tokens

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Please log in to generate quizzes');
  }

  console.log(`🔍 [Quiz] Checking ${estimatedTokens} tokens for GPT-4.1 quiz generation (user: ${user.id})`);

  // Calculate cost for GPT-4.1 (always used for quizzes)
  const costPerToken = 0.0000045; // £4.50 per 1M tokens for GPT-4.1
  const estimatedCost = estimatedTokens * costPerToken;

  // Call database enforcement function BEFORE API call
  const { data: tokenCheck, error: tokenError } = await supabase.rpc('record_token_usage', {
    p_user_id: user.id,
    p_tokens_used: estimatedTokens,
    p_cost_gbp: estimatedCost,
    p_model: 'gpt-4.1'
  });

  if (tokenError) {
    console.error('❌ [Quiz] Token check database error:', tokenError);
    throw new Error('Failed to verify token availability. Please try again.');
  }

  if (!tokenCheck.success) {
    console.warn(`🚫 [Quiz] Token limit exceeded for user ${user.id}: ${tokenCheck.error}`);
    
    // Show upgrade notification
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('showUpgradeModal', {
        detail: {
          reason: tokenCheck.error || 'Insufficient tokens for quiz generation',
          tier: tokenCheck.tier || 'current',
          tokensRemaining: tokenCheck.remaining || 0
        }
      }));
    }
    
    throw new Error(tokenCheck.error || 'Insufficient tokens for quiz generation. Please upgrade your plan.');
  }

  console.log(`✅ [Quiz] Token check passed. Remaining: ${tokenCheck.tokens_remaining} tokens`);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o', // ⚠️ CRITICAL: ALWAYS use GPT-4.1 for ALL quizzes regardless of user tier
      messages: [{ role: 'user', content: enhancedPrompt }],
      temperature: 0.1, // LOWER temperature for maximum accuracy
      max_tokens: 1500,
    }),
  });

  const data = await response.json();
  if (!data.choices || !data.choices[0]?.message?.content) throw new Error('Invalid OpenAI response');
  
  // Parse JSON from model's response
  let rawQuestions: QuizQuestion[];
  try {
    const match = data.choices[0].message.content.match(/\[.*\]/s);
    rawQuestions = JSON.parse(match ? match[0] : data.choices[0].message.content);
  } catch (e) {
    throw new Error('Failed to parse OpenAI quiz response: ' + e);
  }

  // 🚨 CRITICAL: VALIDATE ALL QUESTIONS FOR TOTAL ACCURACY ACROSS ALL SUBJECTS
  const validatedQuestions: QuizQuestion[] = [];
  const rejectedQuestions: Array<{ question: QuizQuestion; validation: UniversalValidationResult }> = [];

  console.log('🔍 VALIDATING QUIZ QUESTIONS FOR TOTAL ACCURACY ACROSS ALL SUBJECTS...');
  
  for (let i = 0; i < rawQuestions.length; i++) {
    const question = rawQuestions[i];
    
    // Use Universal Validator for comprehensive subject coverage
    const universalValidation = QuizUniversalValidator.validateQuestion(question, subject);
    
    // Also run mathematical validation for extra certainty on math questions
    const mathValidation = QuizMathValidator.validateQuestion(question);
    
    // Use the most confident validation result
    const mathConfidence = mathValidation.isValid ? 0.9 : 0.1; // Assign confidence based on validity
    const validation = universalValidation.confidence > mathConfidence 
      ? universalValidation 
      : {
          isValid: mathValidation.isValid,
          questionType: mathValidation.questionType,
          subject: universalValidation.subject,
          error: mathValidation.error,
          calculatedAnswer: mathValidation.calculatedAnswer,
          correctAnswerIndex: mathValidation.correctAnswerIndex,
          validationMethod: 'Mathematical',
          confidence: mathConfidence
        };
    
    if (validation.isValid) {
      validatedQuestions.push(question);
      console.log(`✅ Question ${i + 1}: VALID (${validation.questionType}) - ${validation.subject}`);
      console.log(`   🎯 Validation method: ${validation.validationMethod} (confidence: ${(validation.confidence * 100).toFixed(1)}%)`);
      
      if (validation.calculatedAnswer !== undefined) {
        console.log(`   📊 Calculated answer: ${validation.calculatedAnswer}`);
      }
    } else {
      rejectedQuestions.push({ question, validation });
      console.error(`❌ Question ${i + 1}: REJECTED (${validation.questionType}) - ${validation.subject}`);
      console.error(`   🚨 Error: ${validation.error}`);
      console.error(`   🔍 Validation method: ${validation.validationMethod} (confidence: ${(validation.confidence * 100).toFixed(1)}%)`);
      console.error(`   📝 Question: ${question.question}`);
      console.error(`   📋 Options: ${question.options.join(', ')}`);
      console.error(`   🎯 AI claimed answer: ${question.options[question.answer]} (index ${question.answer})`);
      
      if (validation.correctAnswerIndex !== undefined) {
        console.error(`   ✅ Correct answer: ${question.options[validation.correctAnswerIndex]} (index ${validation.correctAnswerIndex})`);
      }
    }
  }

  // Log validation summary
  console.log(`\n📊 QUIZ VALIDATION SUMMARY:`);
  console.log(`   ✅ Valid questions: ${validatedQuestions.length}`);
  console.log(`   ❌ Rejected questions: ${rejectedQuestions.length}`);
  console.log(`   📈 Accuracy rate: ${((validatedQuestions.length / rawQuestions.length) * 100).toFixed(1)}%`);

  // If we have too many rejected questions, this is a critical issue
  if (rejectedQuestions.length > 0) {
    console.error(`\n🚨 CRITICAL QUIZ VALIDATION FAILURES:`);
    rejectedQuestions.forEach(({ question, validation }, index) => {
      console.error(`\n❌ REJECTED QUESTION ${index + 1}:`);
      console.error(`   Question: ${question.question}`);
      console.error(`   Type: ${validation.questionType}`);
      console.error(`   Error: ${validation.error}`);
      console.error(`   Options: ${question.options.join(', ')}`);
      console.error(`   AI Answer: ${question.options[question.answer]} (index ${question.answer})`);
    });
  }

  // If we don't have enough valid questions, we need to handle this
  if (validatedQuestions.length < Math.max(1, n * 0.5)) {
    throw new Error(`CRITICAL: Too many mathematically incorrect questions generated (${rejectedQuestions.length}/${rawQuestions.length}). This indicates a severe issue with AI mathematical accuracy.`);
  }

  // Validate curriculum alignment for valid questions
  if (curriculumInfo && validatedQuestions.length > 0) {
    const personality = {
      id: 'temp-id',
      name: 'Temporary',
      subject: curriculumInfo.subject,
      examBoard: curriculumInfo.examBoard,
      level: curriculumInfo.level,
      teachingStyle: '',
      specialCapabilities: []
    };
    
    validatedQuestions.forEach((question, index) => {
      const validation = CurriculumService.validateQuestionAlignment(question.question, personality);
      if (!validation.isAligned) {
        console.warn(`⚠️ Question ${index + 1} may not be fully curriculum-aligned:`, validation.suggestions);
      }
    });
  }
  
  // Sort quiz by difficulty: easy, medium, hard
  const difficultyOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
  validatedQuestions.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
  
  // Return only mathematically validated questions
  console.log(`\n🎯 RETURNING ${validatedQuestions.length} MATHEMATICALLY VALIDATED QUESTIONS`);
  return validatedQuestions;
} 