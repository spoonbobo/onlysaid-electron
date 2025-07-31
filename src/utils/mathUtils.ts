/**
 * Utility functions for detecting and converting mathematical expressions to LaTeX
 */

/**
 * Detects common mathematical patterns and converts them to LaTeX format
 * @param text The input text containing potential mathematical expressions
 * @returns Text with mathematical expressions converted to LaTeX format
 */
export function convertMathToLatex(text: string): string {
  if (!text) return text;

  let convertedText = text;

  // Pattern 1: Convert \epsilon_0 style expressions
  convertedText = convertedText.replace(/\\epsilon_(\w+)/g, '\\epsilon_{$1}');
  
  // Pattern 2: Convert \frac{A}{d} style expressions  
  convertedText = convertedText.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '\\frac{$1}{$2}');
  
  // Pattern 3: Convert subscripts like _0, _1, etc. to _{0}, _{1}
  convertedText = convertedText.replace(/([a-zA-Z])_([a-zA-Z0-9]+)(?![{}])/g, '$1_{$2}');
  
  // Pattern 4: Convert superscripts like ^2, ^n, etc. to ^{2}, ^{n}
  convertedText = convertedText.replace(/([a-zA-Z0-9)])?\^([a-zA-Z0-9]+)(?![{}])/g, '$1^{$2}');
  
  // Pattern 5: Handle parentheses in exponents like (2)^{2} -> 2^{2}
  convertedText = convertedText.replace(/\(([a-zA-Z0-9]+)\)\^{([^}]+)}/g, '$1^{$2}');
  convertedText = convertedText.replace(/\(([a-zA-Z0-9]+)\)\^([a-zA-Z0-9]+)/g, '$1^{$2}');
  
  // Pattern 6: Clean up unnecessary parentheses in simple cases
  convertedText = convertedText.replace(/\\frac\{([^}]+)\}\{\(([a-zA-Z0-9]+)\)\}/g, '\\frac{$1}{$2}');
  
  // Pattern 7: Convert basic math operators and symbols
  const mathSymbols = {
    'alpha': '\\alpha',
    'beta': '\\beta', 
    'gamma': '\\gamma',
    'delta': '\\delta',
    'epsilon': '\\epsilon',
    'theta': '\\theta',
    'lambda': '\\lambda',
    'mu': '\\mu',
    'pi': '\\pi',
    'sigma': '\\sigma',
    'tau': '\\tau',
    'phi': '\\phi',
    'chi': '\\chi',
    'psi': '\\psi',
    'omega': '\\omega',
    'Omega': '\\Omega',
    'Delta': '\\Delta',
    'Gamma': '\\Gamma',
    'Lambda': '\\Lambda',
    'Sigma': '\\Sigma',
    'Theta': '\\Theta',
    'Phi': '\\Phi',
    'Psi': '\\Psi'
  };

  // Replace Greek letter names with LaTeX symbols (only if not already escaped)
  Object.entries(mathSymbols).forEach(([name, latex]) => {
    const regex = new RegExp(`(?<!\\\\)\\b${name}\\b`, 'g');
    convertedText = convertedText.replace(regex, latex);
  });

  return convertedText;
}

/**
 * Detects if a string contains mathematical expressions
 * @param text The input text
 * @returns True if mathematical expressions are detected
 */
export function containsMathExpressions(text: string): boolean {
  if (!text) return false;

  // Check for LaTeX-style math patterns
  const mathPatterns = [
    /\\[a-zA-Z]+/,           // LaTeX commands like \alpha, \frac
    /_\{[^}]+\}/,            // Subscripts with braces
    /\^{[^}]+}/,            // Superscripts with braces
    /\\frac\{[^}]+\}\{[^}]+\}/, // Fractions
    /[a-zA-Z]_[a-zA-Z0-9]/,  // Simple subscripts
    /[a-zA-Z0-9]\^[a-zA-Z0-9]/, // Simple superscripts
    /\\epsilon|\\alpha|\\beta|\\gamma|\\delta|\\theta|\\lambda|\\mu|\\pi|\\sigma|\\tau|\\phi|\\chi|\\psi|\\omega/ // Greek letters
  ];

  return mathPatterns.some(pattern => pattern.test(text));
}

/**
 * Wraps mathematical expressions in appropriate LaTeX delimiters
 * @param text The input text with potential math expressions
 * @returns Text with math expressions wrapped in $ or $$ delimiters
 */
export function wrapMathExpressions(text: string): string {
  if (!text || !containsMathExpressions(text)) return text;

  let wrappedText = text;

  // First, protect already wrapped expressions
  const protectedExpressions: string[] = [];
  wrappedText = wrappedText.replace(/\$\$[^$]*\$\$/g, (match) => {
    const index = protectedExpressions.length;
    protectedExpressions.push(match);
    return `__PROTECTED_BLOCK_${index}__`;
  });
  
  wrappedText = wrappedText.replace(/\$[^$]*\$/g, (match) => {
    const index = protectedExpressions.length;
    protectedExpressions.push(match);
    return `__PROTECTED_INLINE_${index}__`;
  });

  // Convert standalone mathematical expressions
  // Look for patterns that should be inline math
  const inlineMathPatterns = [
    // Equations like C = \epsilon_0 \frac{A}{d}
    /([A-Z]\s*=\s*[^.!?]*(?:\\[a-zA-Z]+|_\{[^}]+\}|\^{[^}]+}|\\frac\{[^}]+\}\{[^}]+\})[^.!?]*?)(?=\s|$|[.!?])/g,
    // LaTeX commands and expressions (more comprehensive)
    /(\\[a-zA-Z]+(?:\{[^}]*\})*(?:_\{[^}]*\}|\^{[^}]*})*)/g,
    // Fractions - any \frac expression
    /(\\frac\{[^}]+\}\{[^}]+\})/g,
    // Subscripts and superscripts with braces
    /([a-zA-Z0-9]+(?:_\{[^}]+\}|\^{[^}]+})+)/g,
    // Mathematical expressions with parentheses and exponents
    /(\([^)]+\)\^{[^}]+})/g,
    // Stand-alone LaTeX expressions that start with backslash
    /(\\[a-zA-Z]+(?:\{[^}]*\})*)/g
  ];

  inlineMathPatterns.forEach(pattern => {
    wrappedText = wrappedText.replace(pattern, (match) => {
      // Don't wrap if already protected
      if (match.includes('__PROTECTED_')) {
        return match;
      }
      // Don't wrap if it's part of a larger sentence or already wrapped
      if (match.startsWith('$') && match.endsWith('$')) {
        return match;
      }
      return `$${match.trim()}$`;
    });
  });

  // Restore protected expressions
  protectedExpressions.forEach((expr, index) => {
    wrappedText = wrappedText.replace(`__PROTECTED_BLOCK_${index}__`, expr);
    wrappedText = wrappedText.replace(`__PROTECTED_INLINE_${index}__`, expr);
  });

  return wrappedText;
}

/**
 * Complete pipeline to convert mathematical expressions in text
 * @param text The input text
 * @returns Text with properly formatted LaTeX mathematical expressions
 */
export function processMathText(text: string): string {
  if (!text) return text;
  
  // Step 1: Convert common math patterns to proper LaTeX
  let processedText = convertMathToLatex(text);
  
  // Step 2: Wrap mathematical expressions in LaTeX delimiters
  processedText = wrapMathExpressions(processedText);
  
  return processedText;
} 