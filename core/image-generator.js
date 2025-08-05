/**
 * ===== SHARED IMAGE GENERATION LOGIC =====
 * 
 * This module provides core image generation functionality that is shared between
 * the CLI application and the MCP server. It handles:
 * 
 * - Single image generation with FAL AI models
 * - Batch processing for multiple images/models
 * - Image downloading and local storage
 * - Cost estimation and validation
 * - Error handling and response parsing
 * 
 * The module is designed to be framework-agnostic and can be used in any
 * Node.js environment that needs FAL AI image generation capabilities.
 * 
 * @author ilkerzg
 * @version 0.0.1
 */

import { fal } from '@fal-ai/client';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Generate a single image with specified parameters
 * 
 * This is the core image generation function that handles a single generation request.
 * It configures the FAL client, makes the API call, processes the response, and
 * optionally saves images to disk. The function includes comprehensive error handling
 * and performance tracking.
 * 
 * @param {Object} options - Generation configuration object
 * @param {string} options.model - FAL model ID (e.g., 'fal-ai/flux-pro/kontext/text-to-image')
 * @param {string} options.prompt - Text prompt for image generation (required, non-empty)
 * @param {Object} [options.parameters={}] - Model-specific parameters (width, height, etc.)
 * @param {string} options.apiKey - Valid FAL API key for authentication
 * @param {string} [options.outputDir=null] - Directory to save generated images (optional)
 * @param {string} [options.generationId=null] - Unique session ID for tracking (optional)
 * 
 * @returns {Promise<Object>} Generation result containing:
 *   - imageUrls: Array of generated image URLs
 *   - metadata: Generation details (model, prompt, timing, etc.)
 *   - savedPaths: Local file paths (if outputDir provided)
 *   - executionTime: Time taken for generation
 * 
 * @throws {Error} If API key is invalid, model not found, or generation fails
 * 
 * @example
 * const result = await generateSingleImage({
 *   model: 'fal-ai/flux-pro/kontext/text-to-image',
 *   prompt: 'A beautiful sunset over mountains',
 *   parameters: { width: 1024, height: 1024 },
 *   apiKey: 'your-api-key',
 *   outputDir: './generated-images'
 * });
 */
export async function generateSingleImage({
  model,
  prompt,
  parameters = {},
  apiKey,
  outputDir = null,
  generationId = null
}) {
  // Set API key for this request
  fal.config({
    credentials: apiKey
  });

  const startTime = Date.now();

  try {
    // Generate image using FAL API
    const result = await fal.subscribe(model, {
      input: {
        prompt,
        ...parameters
      },
      logs: false,
      onQueueUpdate: (update) => {
        // Optional: could emit progress events here
      }
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Process result and extract image URLs
    const images = extractImageUrls(result);

    if (!images || images.length === 0) {
      throw new Error('No images generated');
    }

    // Create response object
    const response = {
      success: true,
      model,
      prompt,
      images,
      parameters,
      duration,
      generationId,
      timestamp: new Date().toISOString(),
      metadata: {
        raw_result: result,
        request_id: result.requestId || null,
        seed: result.seed || parameters.seed || null
      }
    };

    // Optionally save images to disk
    if (outputDir) {
      response.savedFiles = await saveImagesToDisk(images, outputDir, {
        model,
        prompt,
        generationId,
        timestamp: startTime
      });
    }

    return response;

  } catch (error) {
    return {
      success: false,
      model,
      prompt,
      error: error.message,
      duration: Date.now() - startTime,
      generationId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Extract image URLs from FAL API response
 * 
 * FAL API responses can have different structures depending on the model and API version.
 * This function normalizes the response format and extracts all available image URLs.
 * 
 * Supported response formats:
 * - result.images[].url (most common)
 * - result.images[].image_url (alternative property name)
 * - result.images[] (direct string URLs)
 * - result.image.url (single image responses)
 * - result.data.images[].url (nested data structure)
 * - result.output.images[].url (output wrapper structure)
 * 
 * @param {Object} result - FAL API response object
 * @returns {Array<string>} Array of extracted image URLs (empty array if none found)
 * 
 * @example
 * const urls = extractImageUrls({
 *   images: [{ url: 'https://example.com/image1.jpg' }]
 * });
 * // Returns: ['https://example.com/image1.jpg']
 */
export function extractImageUrls(result) {
  const images = [];

  // Handle different response formats from FAL API
  if (result.images && Array.isArray(result.images)) {
    result.images.forEach((img, index) => {
      if (img.url) {
        images.push(img.url);
      } else if (img.image_url) {
        images.push(img.image_url);
      } else if (typeof img === 'string') {
        images.push(img);
      }
    });
  } else if (result.image && result.image.url) {
    images.push(result.image.url);
  } else if (result.data && result.data.images) {
    result.data.images.forEach(img => {
      if (img.url) images.push(img.url);
    });
  } else if (result.output && result.output.images) {
    result.output.images.forEach(img => {
      if (img.url) images.push(img.url);
    });
  }

  return images;
}

/**
 * Save images to disk
 * 
 * Downloads images from URLs and saves them to the specified directory with
 * organized naming and metadata preservation. Creates directory structure
 * automatically and handles download errors gracefully.
 * 
 * File naming pattern: {model}_{timestamp}_{index}.{extension}
 * Directory structure: {outputDir}/{date}/{model}/
 * 
 * @param {Array<string>} imageUrls - Array of image URLs to download
 * @param {string} outputDir - Base output directory path
 * @param {Object} metadata - Generation metadata for file naming
 * @param {string} metadata.model - Model used for generation
 * @param {string} metadata.prompt - Original prompt (for metadata file)
 * @param {string} [metadata.generationId] - Unique generation ID
 * @param {number} [metadata.timestamp] - Generation timestamp
 * 
 * @returns {Promise<Array<string>>} Array of saved file paths (absolute paths)
 * 
 * @throws {Error} If directory creation fails or all downloads fail
 * 
 * @example
 * const paths = await saveImagesToDisk(
 *   ['https://example.com/image.jpg'],
 *   './outputs',
 *   { model: 'flux-pro', prompt: 'sunset', timestamp: Date.now() }
 * );
 * // Returns: ['/path/to/outputs/2024-01-01/flux-pro/flux-pro_1704067200000_0.jpg']
 */
export async function saveImagesToDisk(imageUrls, outputDir, metadata) {
  const savedFiles = [];

  // Ensure output directory exists
  await fs.ensureDir(outputDir);

  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    const timestamp = metadata.timestamp || Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const modelName = metadata.model.replace(/[^a-zA-Z0-9]/g, '_');

    const filename = `${modelName}_${timestamp}_${randomSuffix}_${i + 1}.jpg`;
    const filepath = path.join(outputDir, filename);

    try {
      // Download and save image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      await fs.writeFile(filepath, Buffer.from(buffer));

      savedFiles.push({
        url: imageUrl,
        filepath,
        filename,
        size: buffer.byteLength
      });
    } catch (error) {
      console.error(`Failed to save image ${i + 1}:`, error.message);
    }
  }

  return savedFiles;
}

/**
 * Generate multiple images with different models/prompts
 * @param {Array<Object>} tasks - Array of generation tasks
 * @param {string} apiKey - FAL API key
 * @param {Object} options - Generation options
 * @returns {Promise<Array<Object>>} Array of generation results
 */
export async function generateBatch(tasks, apiKey, options = {}) {
  const {
    outputDir = null,
    generationId = null,
    batchSize = 1,
    onProgress = null
  } = options;

  const results = [];

  // Process tasks in batches
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);

    // Process batch in parallel
    const batchPromises = batch.map(async (task, batchIndex) => {
      const taskOutputDir = outputDir ?
        path.join(outputDir, task.model.replace(/[^a-zA-Z0-9]/g, '_')) :
        null;

      const result = await generateSingleImage({
        ...task,
        apiKey,
        outputDir: taskOutputDir,
        generationId
      });

      // Report progress
      if (onProgress) {
        onProgress({
          completed: i + batchIndex + 1,
          total: tasks.length,
          currentTask: task,
          result
        });
      }

      return result;
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Calculate generation cost estimate
 * @param {Array<Object>} tasks - Generation tasks
 * @param {Array<Object>} models - Available models with pricing
 * @returns {Object} Cost breakdown
 */
export function calculateCost(tasks, models) {
  let totalCost = 0;
  const breakdown = {};

  tasks.forEach(task => {
    const model = models.find(m => m.id === task.model);
    if (model && model.costPerImage) {
      const cost = model.costPerImage * (task.imageCount || 1);
      totalCost += cost;

      if (!breakdown[task.model]) {
        breakdown[task.model] = {
          modelName: model.name,
          imageCount: 0,
          costPerImage: model.costPerImage,
          totalCost: 0
        };
      }

      breakdown[task.model].imageCount += (task.imageCount || 1);
      breakdown[task.model].totalCost += cost;
    }
  });

  return {
    totalCost,
    breakdown,
    currency: 'USD'
  };
}
