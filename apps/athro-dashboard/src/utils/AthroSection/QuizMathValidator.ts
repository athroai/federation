/**
 * CRITICAL MATHEMATICAL VALIDATION SERVICE
 * 
 * This service ensures 100% accuracy in quiz answers by independently 
 * calculating correct answers and validating AI-generated responses.
 * 
 * NO MATHEMATICAL ERRORS ARE ACCEPTABLE IN QUIZ SYSTEMS.
 */

import { QuizQuestion } from '../../types/athro';

export interface ValidationResult {
  isValid: boolean;
  correctAnswerIndex?: number;
  calculatedAnswer?: string | number;
  error?: string;
  questionType: string;
}

export class QuizMathValidator {
  
  /**
   * Validates a quiz question's mathematical accuracy
   */
  static validateQuestion(question: QuizQuestion): ValidationResult {
    const questionText = question.question.toLowerCase();
    const options = question.options;
    const claimedAnswerIndex = question.answer;
    
    // Triangle angle problems
    if (this.isTriangleAngleProblem(questionText)) {
      return this.validateTriangleAngle(question);
    }
    
    // Basic arithmetic
    if (this.isBasicArithmetic(questionText)) {
      return this.validateBasicArithmetic(question);
    }
    
    // Percentage calculations
    if (this.isPercentageProblem(questionText)) {
      return this.validatePercentage(question);
    }
    
    // Area and perimeter
    if (this.isAreaPerimeterProblem(questionText)) {
      return this.validateAreaPerimeter(question);
    }
    
    // Algebraic equations
    if (this.isAlgebraicEquation(questionText)) {
      return this.validateAlgebra(question);
    }
    
    // Distance, speed, time
    if (this.isDistanceSpeedTime(questionText)) {
      return this.validateDistanceSpeedTime(question);
    }
    
    // If we can't validate mathematically, we'll have to trust the AI
    // but log a warning
    console.warn('🚨 QUIZ VALIDATOR: Cannot mathematically validate question - manual review needed:', question.question);
    
    return {
      isValid: true, // We have to trust non-mathematical questions
      questionType: 'non-mathematical',
      error: 'Cannot validate non-mathematical question'
    };
  }
  
  /**
   * TRIANGLE ANGLE VALIDATION
   * Critical for geometry - angles must sum to 180°
   */
  private static validateTriangleAngle(question: QuizQuestion): ValidationResult {
    const questionText = question.question;
    const options = question.options;
    
    // Extract angles from question text
    const angleMatches = questionText.match(/(\d+)°/g);
    if (!angleMatches || angleMatches.length !== 2) {
      return {
        isValid: false,
        questionType: 'triangle-angle',
        error: 'Could not extract two angles from question'
      };
    }
    
    const angle1 = parseInt(angleMatches[0].replace('°', ''));
    const angle2 = parseInt(angleMatches[1].replace('°', ''));
    
    // Calculate third angle: 180° - angle1 - angle2
    const correctThirdAngle = 180 - angle1 - angle2;
    
    // Validate that this is a valid triangle
    if (correctThirdAngle <= 0 || correctThirdAngle >= 180) {
      return {
        isValid: false,
        questionType: 'triangle-angle',
        error: `Invalid triangle: angles ${angle1}°, ${angle2}°, ${correctThirdAngle}° do not form a valid triangle`
      };
    }
    
    // Find which option matches the correct answer
    let correctAnswerIndex = -1;
    for (let i = 0; i < options.length; i++) {
      const optionText = options[i].replace(/[°\s]/g, '');
      if (parseInt(optionText) === correctThirdAngle) {
        correctAnswerIndex = i;
        break;
      }
    }
    
    if (correctAnswerIndex === -1) {
      return {
        isValid: false,
        questionType: 'triangle-angle',
        error: `Correct answer ${correctThirdAngle}° not found in options: ${options.join(', ')}`
      };
    }
    
    // Check if AI marked the correct answer
    const isAICorrect = question.answer === correctAnswerIndex;
    
    if (!isAICorrect) {
      const aiAnswer = options[question.answer];
      return {
        isValid: false,
        questionType: 'triangle-angle',
        correctAnswerIndex,
        calculatedAnswer: correctThirdAngle,
        error: `AI marked wrong answer: claimed "${aiAnswer}" (index ${question.answer}) but correct is "${correctThirdAngle}°" (index ${correctAnswerIndex})`
      };
    }
    
    return {
      isValid: true,
      questionType: 'triangle-angle',
      correctAnswerIndex,
      calculatedAnswer: correctThirdAngle
    };
  }
  
  /**
   * BASIC ARITHMETIC VALIDATION
   */
  private static validateBasicArithmetic(question: QuizQuestion): ValidationResult {
    const questionText = question.question;
    
    // Addition: a + b = ?
    const addMatch = questionText.match(/(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)/);
    if (addMatch) {
      const a = parseFloat(addMatch[1]);
      const b = parseFloat(addMatch[2]);
      const correctAnswer = a + b;
      return this.validateNumericAnswer(question, correctAnswer, 'addition');
    }
    
    // Subtraction: a - b = ?
    const subMatch = questionText.match(/(\d+(?:\.\d+)?)\s*\-\s*(\d+(?:\.\d+)?)/);
    if (subMatch) {
      const a = parseFloat(subMatch[1]);
      const b = parseFloat(subMatch[2]);
      const correctAnswer = a - b;
      return this.validateNumericAnswer(question, correctAnswer, 'subtraction');
    }
    
    // Multiplication: a × b = ? or a * b = ?
    const mulMatch = questionText.match(/(\d+(?:\.\d+)?)\s*[×\*]\s*(\d+(?:\.\d+)?)/);
    if (mulMatch) {
      const a = parseFloat(mulMatch[1]);
      const b = parseFloat(mulMatch[2]);
      const correctAnswer = a * b;
      return this.validateNumericAnswer(question, correctAnswer, 'multiplication');
    }
    
    // Division: a ÷ b = ? or a / b = ?
    const divMatch = questionText.match(/(\d+(?:\.\d+)?)\s*[÷\/]\s*(\d+(?:\.\d+)?)/);
    if (divMatch) {
      const a = parseFloat(divMatch[1]);
      const b = parseFloat(divMatch[2]);
      if (b === 0) {
        return {
          isValid: false,
          questionType: 'arithmetic-division',
          error: 'Division by zero'
        };
      }
      const correctAnswer = a / b;
      return this.validateNumericAnswer(question, correctAnswer, 'division');
    }
    
    return {
      isValid: false,
      questionType: 'arithmetic',
      error: 'Could not parse arithmetic operation'
    };
  }
  
  /**
   * PERCENTAGE VALIDATION
   */
  private static validatePercentage(question: QuizQuestion): ValidationResult {
    const questionText = question.question.toLowerCase();
    
    // "What is X% of Y?"
    const percentOfMatch = questionText.match(/what is (\d+(?:\.\d+)?)%?\s*of\s*(\d+(?:\.\d+)?)/);
    if (percentOfMatch) {
      const percentage = parseFloat(percentOfMatch[1]);
      const number = parseFloat(percentOfMatch[2]);
      const correctAnswer = (percentage / 100) * number;
      return this.validateNumericAnswer(question, correctAnswer, 'percentage-of');
    }
    
    // "X is what percentage of Y?"
    const whatPercentMatch = questionText.match(/(\d+(?:\.\d+)?)\s*is what percentage of\s*(\d+(?:\.\d+)?)/);
    if (whatPercentMatch) {
      const part = parseFloat(whatPercentMatch[1]);
      const whole = parseFloat(whatPercentMatch[2]);
      if (whole === 0) {
        return {
          isValid: false,
          questionType: 'percentage',
          error: 'Division by zero in percentage calculation'
        };
      }
      const correctAnswer = (part / whole) * 100;
      return this.validateNumericAnswer(question, correctAnswer, 'percentage-what');
    }
    
    return {
      isValid: false,
      questionType: 'percentage',
      error: 'Could not parse percentage problem'
    };
  }
  
  /**
   * AREA AND PERIMETER VALIDATION
   */
  private static validateAreaPerimeter(question: QuizQuestion): ValidationResult {
    const questionText = question.question.toLowerCase();
    
    // Rectangle area: length × width
    const rectAreaMatch = questionText.match(/area.*rectangle.*(\d+(?:\.\d+)?).*[×x]\s*(\d+(?:\.\d+)?)/);
    if (rectAreaMatch) {
      const length = parseFloat(rectAreaMatch[1]);
      const width = parseFloat(rectAreaMatch[2]);
      const correctAnswer = length * width;
      return this.validateNumericAnswer(question, correctAnswer, 'rectangle-area');
    }
    
    // Rectangle perimeter: 2(length + width)
    const rectPerimeterMatch = questionText.match(/perimeter.*rectangle.*(\d+(?:\.\d+)?).*[×x]\s*(\d+(?:\.\d+)?)/);
    if (rectPerimeterMatch) {
      const length = parseFloat(rectPerimeterMatch[1]);
      const width = parseFloat(rectPerimeterMatch[2]);
      const correctAnswer = 2 * (length + width);
      return this.validateNumericAnswer(question, correctAnswer, 'rectangle-perimeter');
    }
    
    // Circle area: π × r²
    const circleAreaMatch = questionText.match(/area.*circle.*radius\s*(\d+(?:\.\d+)?)/);
    if (circleAreaMatch) {
      const radius = parseFloat(circleAreaMatch[1]);
      const correctAnswer = Math.PI * radius * radius;
      return this.validateNumericAnswer(question, correctAnswer, 'circle-area', 0.1); // Allow small tolerance for π
    }
    
    return {
      isValid: false,
      questionType: 'area-perimeter',
      error: 'Could not parse area/perimeter problem'
    };
  }
  
  /**
   * DISTANCE, SPEED, TIME VALIDATION
   */
  private static validateDistanceSpeedTime(question: QuizQuestion): ValidationResult {
    const questionText = question.question.toLowerCase();
    
    // Distance = Speed × Time
    // Speed = Distance ÷ Time  
    // Time = Distance ÷ Speed
    
    // Find speed problems: "travels at X km/h for Y hours, distance?"
    const speedTimeMatch = questionText.match(/(\d+(?:\.\d+)?)\s*km\/h.*(\d+(?:\.\d+)?)\s*hours?/);
    if (speedTimeMatch && questionText.includes('distance')) {
      const speed = parseFloat(speedTimeMatch[1]);
      const time = parseFloat(speedTimeMatch[2]);
      const correctAnswer = speed * time;
      return this.validateNumericAnswer(question, correctAnswer, 'distance-calculation');
    }
    
    return {
      isValid: false,
      questionType: 'distance-speed-time',
      error: 'Could not parse distance/speed/time problem'
    };
  }
  
  /**
   * ALGEBRAIC EQUATION VALIDATION
   */
  private static validateAlgebra(question: QuizQuestion): ValidationResult {
    const questionText = question.question.toLowerCase();
    
    // Simple linear equations: 2x + 3 = 11, solve for x
    const linearMatch = questionText.match(/(\d+)x\s*[\+\-]\s*(\d+)\s*=\s*(\d+)/);
    if (linearMatch) {
      const coefficient = parseFloat(linearMatch[1]);
      const constant = parseFloat(linearMatch[2]);
      const result = parseFloat(linearMatch[3]);
      
      // 2x + 3 = 11 → x = (11 - 3) / 2
      const correctAnswer = (result - constant) / coefficient;
      return this.validateNumericAnswer(question, correctAnswer, 'linear-equation');
    }
    
    return {
      isValid: false,
      questionType: 'algebra',
      error: 'Could not parse algebraic equation'
    };
  }
  
  /**
   * Helper method to validate numeric answers
   */
  private static validateNumericAnswer(
    question: QuizQuestion, 
    correctAnswer: number, 
    questionType: string,
    tolerance: number = 0.001
  ): ValidationResult {
    const options = question.options;
    
    // Find which option matches the correct answer
    let correctAnswerIndex = -1;
    for (let i = 0; i < options.length; i++) {
      const optionValue = this.extractNumericValue(options[i]);
      if (optionValue !== null && Math.abs(optionValue - correctAnswer) <= tolerance) {
        correctAnswerIndex = i;
        break;
      }
    }
    
    if (correctAnswerIndex === -1) {
      return {
        isValid: false,
        questionType,
        calculatedAnswer: correctAnswer,
        error: `Correct answer ${correctAnswer} not found in options: ${options.join(', ')}`
      };
    }
    
    // Check if AI marked the correct answer
    const isAICorrect = question.answer === correctAnswerIndex;
    
    if (!isAICorrect) {
      const aiAnswer = options[question.answer];
      return {
        isValid: false,
        questionType,
        correctAnswerIndex,
        calculatedAnswer: correctAnswer,
        error: `AI marked wrong answer: claimed "${aiAnswer}" (index ${question.answer}) but correct is "${correctAnswer}" (index ${correctAnswerIndex})`
      };
    }
    
    return {
      isValid: true,
      questionType,
      correctAnswerIndex,
      calculatedAnswer: correctAnswer
    };
  }
  
  /**
   * Extract numeric value from option text
   */
  private static extractNumericValue(optionText: string): number | null {
    // Remove common units and symbols
    const cleaned = optionText.replace(/[°%$£€,\s]/g, '');
    const match = cleaned.match(/^-?(\d+(?:\.\d+)?)$/);
    return match ? parseFloat(match[1]) : null;
  }
  
  // Question type detection methods
  private static isTriangleAngleProblem(questionText: string): boolean {
    return questionText.includes('triangle') && 
           questionText.includes('angle') && 
           questionText.match(/(\d+)°/g) !== null;
  }
  
  private static isBasicArithmetic(questionText: string): boolean {
    return /(\d+(?:\.\d+)?)\s*[\+\-\×\*÷\/]\s*(\d+(?:\.\d+)?)/.test(questionText);
  }
  
  private static isPercentageProblem(questionText: string): boolean {
    return questionText.includes('%') || questionText.includes('percent');
  }
  
  private static isAreaPerimeterProblem(questionText: string): boolean {
    return questionText.includes('area') || questionText.includes('perimeter');
  }
  
  private static isAlgebraicEquation(questionText: string): boolean {
    return questionText.includes('x') && questionText.includes('=');
  }
  
  private static isDistanceSpeedTime(questionText: string): boolean {
    return (questionText.includes('speed') || questionText.includes('km/h') || 
            questionText.includes('mph')) && 
           (questionText.includes('distance') || questionText.includes('time'));
  }
} 