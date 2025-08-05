/**
 * ===== SHARED PROMPT OPTIMIZATION LOGIC =====
 * 
 * This module provides intelligent prompt optimization capabilities for AI image generation.
 * It leverages language models to enhance user prompts for better generation results.
 * 
 * Key Features:
 * - Prompt enhancement using LLM-based optimization
 * - Style-aware optimization (detailed, artistic, technical, creative)
 * - Model-specific prompt tuning
 * - Batch processing for multiple prompts
 * - Complexity analysis and improvement tracking
 * - Multi-language support with English output
 * 
 * The module is shared between CLI and MCP server implementations,
 * providing consistent prompt optimization across all interfaces.
 * 
 * @author ilkerzg
 * @version 0.0.1
 */

import { fal } from '@fal-ai/client';

/**
 * Optimize a prompt for better image generation results
 * 
 * This function takes a user's original prompt and enhances it using a language model
 * to create more detailed, specific, and effective prompts for AI image generation.
 * The optimization considers the target model's characteristics and user preferences.
 * 
 * @param {string} prompt - Original prompt text to optimize (required, non-empty)
 * @param {string} model - Target FAL model ID for model-specific optimization
 * @param {string} apiKey - Valid FAL API key for LLM access
 * @param {Object} [options={}] - Optimization configuration
 * @param {string} [options.style='detailed'] - Optimization style: 'detailed', 'artistic', 'technical', 'creative'
 * @param {string} [options.language='english'] - Target language for optimization
 * @param {number} [options.maxLength=500] - Maximum length of optimized prompt
 * 
 * @returns {Promise<Object>} Optimization result containing:
 *   - success: Boolean indicating operation success
 *   - original: Original prompt text
 *   - optimized: Enhanced prompt text
 *   - model: Target model used for optimization
 *   - improvements: Analysis of what was improved
 *   - complexity: Before/after complexity scores
 *   - executionTime: Time taken for optimization
 * 
 * @throws {Error} If API key is invalid, model unavailable, or optimization fails
 * 
 * @example
 * const result = await optimizePrompt(
 *   'cat on table',
 *   'fal-ai/flux-pro/kontext/text-to-image',
 *   'your-api-key',
 *   { style: 'detailed', maxLength: 300 }
 * );
 * // Returns optimized prompt with detailed descriptions and better structure
 */
export async function optimizePrompt(prompt, model, apiKey, options = {}) {
  const {
    style = 'detailed',
    language = 'english',
    maxLength = 500
  } = options;

  // Set API key for this request
  fal.config({
    credentials: apiKey
  });

  try {
    // Create optimization prompt based on target model
    const optimizationPrompt = createOptimizationPrompt(prompt, model, {
      style,
      language,
      maxLength
    });

    // Use FAL's text generation model for optimization
    const result = await fal.subscribe('fal-ai/llama-3-1-70b-instruct', {
      input: {
        prompt: optimizationPrompt,
        max_tokens: Math.min(maxLength * 2, 1000),
        temperature: 0.7,
        top_p: 0.9
      }
    });

    const optimizedPrompt = extractOptimizedPrompt(result);

    return {
      success: true,
      original: prompt,
      optimized: optimizedPrompt,
      model,
      style,
      improvements: analyzeImprovements(prompt, optimizedPrompt),
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      original: prompt,
      optimized: prompt, // fallback to original
      error: error.message,
      model,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Create optimization prompt based on target model
 * @param {string} prompt - Original prompt
 * @param {string} model - Target model ID
 * @param {Object} options - Optimization options
 * @returns {string} Optimization prompt for LLM
 */
export function createOptimizationPrompt(prompt, model, options) {
  const { style, language, maxLength } = options;

  // Model-specific optimization strategies
  const modelStrategies = {
    'fal-ai/flux-pro': {
      focus: 'detailed descriptions, composition, lighting',
      keywords: 'cinematic, professional, high-resolution, detailed',
      avoid: 'abstract concepts, cartoon-style'
    },
    'fal-ai/flux-dev': {
      focus: 'creative concepts, artistic expression',
      keywords: 'artistic, creative, expressive, unique',
      avoid: 'overly technical terms'
    },
    'fal-ai/imagen-4-ultra': {
      focus: 'photorealistic details, accurate representation',
      keywords: 'photorealistic, accurate, detailed, high-quality',
      avoid: 'stylized, artistic interpretation'
    },
    'fal-ai/qwen-image': {
      focus: 'clear descriptions, specific details',
      keywords: 'clear, specific, detailed, precise',
      avoid: 'ambiguous terms, complex compositions'
    }
  };

  const strategy = modelStrategies[model] || modelStrategies['fal-ai/flux-pro'];

  return `You are an expert AI image prompt engineer. Your task is to optimize the following prompt for the ${model} model to generate the best possible image.

**Original Prompt:** "${prompt}"

**Target Model:** ${model}
**Style Preference:** ${style}
**Language:** ${language}
**Max Length:** ${maxLength} characters

**Optimization Guidelines for ${model}:**
- Focus on: ${strategy.focus}
- Include keywords like: ${strategy.keywords}
- Avoid: ${strategy.avoid}

**Instructions:**
1. Enhance the prompt with specific, vivid details
2. Add technical photography/artistic terms if appropriate
3. Ensure clarity and avoid ambiguity
4. Maintain the core concept of the original prompt
5. Optimize for ${model}'s strengths
6. Keep under ${maxLength} characters

**Optimized Prompt (respond with ONLY the optimized prompt, no explanations):**`;
}

/**
 * Extract optimized prompt from LLM response
 * @param {Object} result - FAL API response
 * @returns {string} Extracted optimized prompt
 */
export function extractOptimizedPrompt(result) {
  let optimizedPrompt = '';

  if (result.output && result.output.text) {
    optimizedPrompt = result.output.text;
  } else if (result.text) {
    optimizedPrompt = result.text;
  } else if (result.choices && result.choices[0] && result.choices[0].text) {
    optimizedPrompt = result.choices[0].text;
  } else if (typeof result === 'string') {
    optimizedPrompt = result;
  }

  // Clean up the response
  optimizedPrompt = optimizedPrompt
    .replace(/^["']|["']$/g, '') // Remove quotes
    .replace(/^\s*Optimized Prompt:\s*/i, '') // Remove label
    .replace(/^\s*Here's the optimized prompt:\s*/i, '') // Remove intro
    .trim();

  return optimizedPrompt || 'Failed to optimize prompt';
}

/**
 * Analyze improvements between original and optimized prompts
 * @param {string} original - Original prompt
 * @param {string} optimized - Optimized prompt
 * @returns {Object} Analysis of improvements
 */
export function analyzeImprovements(original, optimized) {
  const improvements = {
    lengthChange: optimized.length - original.length,
    addedDetails: [],
    technicalTerms: [],
    styleEnhancements: []
  };

  // Check for added technical photography terms
  const technicalTerms = [
    'bokeh', 'depth of field', 'cinematic', 'professional', 'high-resolution',
    'HDR', 'macro', 'wide-angle', 'telephoto', 'golden hour', 'dramatic lighting',
    'soft lighting', 'ambient', 'volumetric', 'photorealistic', 'ultra-detailed'
  ];

  technicalTerms.forEach(term => {
    if (!original.toLowerCase().includes(term.toLowerCase()) &&
      optimized.toLowerCase().includes(term.toLowerCase())) {
      improvements.technicalTerms.push(term);
    }
  });

  // Check for style enhancements
  const styleKeywords = [
    'detailed', 'vibrant', 'sharp', 'crisp', 'elegant', 'sophisticated',
    'dynamic', 'atmospheric', 'moody', 'dramatic', 'subtle', 'refined'
  ];

  styleKeywords.forEach(keyword => {
    if (!original.toLowerCase().includes(keyword.toLowerCase()) &&
      optimized.toLowerCase().includes(keyword.toLowerCase())) {
      improvements.styleEnhancements.push(keyword);
    }
  });

  // Estimate complexity improvement
  improvements.complexityScore = {
    original: estimateComplexity(original),
    optimized: estimateComplexity(optimized)
  };

  return improvements;
}

/**
 * Estimate prompt complexity based on descriptive words and structure
 * @param {string} prompt - Prompt to analyze
 * @returns {number} Complexity score (0-100)
 */
export function estimateComplexity(prompt) {
  const words = prompt.split(/\s+/);
  const sentences = prompt.split(/[.!?]+/).filter(s => s.trim());

  let score = 0;

  // Base score from word count
  score += Math.min(words.length * 2, 40);

  // Bonus for descriptive adjectives
  const adjectives = ['detailed', 'beautiful', 'stunning', 'dramatic', 'elegant', 'vibrant'];
  adjectives.forEach(adj => {
    if (prompt.toLowerCase().includes(adj)) score += 5;
  });

  // Bonus for technical terms
  const technical = ['cinematic', 'professional', 'HDR', 'bokeh', 'macro'];
  technical.forEach(term => {
    if (prompt.toLowerCase().includes(term)) score += 8;
  });

  // Bonus for multiple sentences (structured description)
  if (sentences.length > 1) score += 10;

  return Math.min(score, 100);
}

/**
 * Batch optimize multiple prompts
 * @param {Array<Object>} prompts - Array of {prompt, model} objects
 * @param {string} apiKey - FAL API key
 * @param {Object} options - Optimization options
 * @returns {Promise<Array<Object>>} Array of optimization results
 */
export async function optimizeBatch(prompts, apiKey, options = {}) {
  const {
    batchSize = 3,
    onProgress = null
  } = options;

  const results = [];

  // Process prompts in batches to avoid rate limits
  for (let i = 0; i < prompts.length; i += batchSize) {
    const batch = prompts.slice(i, i + batchSize);

    const batchPromises = batch.map(async ({ prompt, model }, batchIndex) => {
      const result = await optimizePrompt(prompt, model, apiKey, options);

      if (onProgress) {
        onProgress({
          completed: i + batchIndex + 1,
          total: prompts.length,
          currentPrompt: prompt,
          result
        });
      }

      return result;
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Small delay between batches to respect rate limits
    if (i + batchSize < prompts.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}
