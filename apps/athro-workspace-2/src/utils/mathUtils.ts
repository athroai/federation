import * as math from 'mathjs';

export interface MathResult {
  result: number | string;
  latex: string;
  error?: string;
}

export interface PlotData {
  points: [number, number][];
  latex: string;
}

export interface Range {
  start: number;
  end: number;
  step?: number;
}

export const MathTools = {
  evaluateExpression(expression: string): { result: number | string; latex: string; error?: string } {
    try {
      const result = math.evaluate(expression);
      return {
        result,
        latex: `${expression} = ${result}`
      };
    } catch (error) {
      return {
        result: 'Error',
        latex: expression,
        error: 'Invalid expression'
      };
    }
  },

  plotFunction(fn: string, range: Range): { points: [number, number][]; latex: string; error?: string } {
    try {
      const points: [number, number][] = [];
      const step = range.step || (range.end - range.start) / 100;

      for (let x = range.start; x <= range.end; x += step) {
        try {
          const expr = fn.replace(/x/g, `(${x})`);
          const y = math.evaluate(expr);
          points.push([x, y]);
        } catch (error) {
          console.error('Error plotting point:', error);
        }
      }

      // Convert function to LaTeX format
      const latexFn = fn
        .replace(/sin/g, '\\sin')
        .replace(/cos/g, '\\cos')
        .replace(/tan/g, '\\tan')
        .replace(/sqrt/g, '\\sqrt')
        .replace(/\^/g, '^{');

      return {
        points,
        latex: `f(x) = ${latexFn}`
      };
    } catch (error) {
      return {
        points: [],
        latex: fn,
        error: 'Invalid function'
      };
    }
  },

  formatLatex(text: string): string {
    // Replace basic math patterns with LaTeX
    return text
      .replace(/\$\$(.*?)\$\$/g, (_, math) => `\\[${math}\\]`)
      .replace(/\$(.*?)\$/g, (_, math) => `\\(${math}\\)`);
  }
};
