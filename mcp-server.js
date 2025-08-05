#!/usr/bin/env node

/**
 * FAL CLI MCP Server - Enhanced Model Context Protocol Implementation
 * 
 * This server provides AI assistants with access to FAL AI's image generation capabilities
 * through the Model Context Protocol (MCP). It includes advanced features like:
 * - Intelligent cost management with $5 spending limits
 * - Enhanced error handling with contextual suggestions
 * - Smart parameter validation and optimization
 * - Comprehensive model management and recommendations
 * 
 * The server exposes tools for image generation, model discovery, prompt optimization,
 * and cost calculation while ensuring user safety through spending controls.
 * 
 * @version 0.0.1
 * @author ilkerzg
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import our shared business logic modules
// These modules contain the core functionality that's shared between CLI and MCP interfaces
import { generateSingleImage, generateBatch, calculateCost } from './core/image-generator.js';
import { optimizePrompt, optimizeBatch } from './core/prompt-optimizer.js';
import {
  loadModels,           // Loads all available model configurations from JSON files
  getModelById,         // Retrieves specific model configuration by ID
  getFilteredModels,    // Filters models based on criteria (cost, quality, etc.)
  getModelStats,        // Provides statistical analysis of available models
  getModelRecommendations // Suggests optimal models based on user requirements
} from './core/model-manager.js';
import { retrieveApiKey, hasStoredApiKey, validateApiKey } from './secure-storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env file
// This ensures API keys and configuration are available throughout the application
dotenv.config();

// Initialize MCP Server with enhanced capabilities
// This creates the main server instance that will handle all MCP protocol communications
// The server provides tools, resources, and prompts to AI assistants
const server = new Server({
  name: 'fal-cli-mcp',
  version: '2.0.0',
  description: 'Enhanced FAL AI image generation MCP server with advanced features'
}, {
  capabilities: {
    tools: {},      // Image generation, model management, and optimization tools
    resources: {},  // Access to model configurations and generated images
    prompts: {}     // Pre-built prompt templates for common use cases
  }
});

// ===== COST MANAGEMENT SYSTEM =====
// Implements spending protection to prevent accidental high-cost operations
// Users must explicitly confirm any operation that would cost more than $5 USD
const SPENDING_LIMIT = 5.0; // Maximum allowed spending without explicit confirmation

/**
 * Calculate estimated cost for a generation request
 * 
 * This function looks up the model's pricing information and calculates
 * the total cost based on the number of images to be generated.
 * 
 * @param {string} model - The model ID (e.g., 'fal-ai/flux-pro/kontext/text-to-image')
 * @param {number} numImages - Number of images to generate (default: 1)
 * @returns {Promise<number>} Estimated cost in USD
 */
async function calculateGenerationCost(model, numImages = 1) {
  try {
    // Load all available model configurations from the models/ directory
    const models = await loadModels();
    const modelConfig = models.find(m => m.id === model);

    if (!modelConfig || !modelConfig.costPerImage) {
      // Return a conservative estimate if model pricing is unknown
      // This ensures we don't underestimate costs for new or unlisted models
      return 0.05 * numImages; // $0.05 per image conservative estimate
    }

    return modelConfig.costPerImage * numImages;
  } catch (error) {
    console.warn('Could not calculate cost:', error.message);
    return 0.05 * numImages; // Conservative fallback to protect users
  }
}

/**
 * Check if operation exceeds spending limit and requires user confirmation
 * 
 * This is a safety mechanism to prevent accidental expensive operations.
 * Any operation costing more than $5 USD requires explicit user confirmation.
 * 
 * @param {number} estimatedCost - Estimated cost in USD
 * @returns {boolean} True if confirmation is required
 */
function requiresSpendingConfirmation(estimatedCost) {
  return estimatedCost > SPENDING_LIMIT;
}

/**
 * Create a structured error for spending limit confirmation
 * 
 * When an operation would exceed the spending limit, this function creates
 * a detailed error message with cost breakdown and instructions for the user.
 * 
 * @param {number} estimatedCost - Total estimated cost in USD
 * @param {string} model - Model ID being used
 * @param {number} numImages - Number of images to generate
 * @returns {Error} Structured error with confirmation details
 */
function createSpendingConfirmationError(estimatedCost, model, numImages) {
  return new Error(JSON.stringify({
    type: 'SPENDING_CONFIRMATION_REQUIRED',
    estimated_cost: estimatedCost,
    spending_limit: SPENDING_LIMIT,
    model: model,
    num_images: numImages,
    message: `This operation will cost approximately $${estimatedCost.toFixed(3)}, which exceeds the $${SPENDING_LIMIT} spending limit. Please confirm if you want to proceed.`,
    confirmation_needed: true
  }));
}

// ===== ERROR HANDLING SYSTEM =====
/**
 * Enhanced error handling wrapper with detailed error context and performance tracking
 * 
 * This wrapper provides comprehensive error handling for all MCP tool operations:
 * - Tracks execution time for performance monitoring
 * - Adds metadata to successful responses
 * - Provides contextual error suggestions
 * - Logs detailed error information for debugging
 * 
 * @param {Function} handler - The async function to wrap with error handling
 * @param {string} toolName - Name of the tool for error context (default: 'unknown')
 * @returns {Function} Wrapped function with enhanced error handling
 */
function handleErrors(handler, toolName = 'unknown') {
  return async (...args) => {
    const startTime = Date.now();
    try {
      const result = await handler(...args);
      const duration = Date.now() - startTime;

      // Add performance metadata to successful responses
      // This helps with monitoring and debugging performance issues
      if (result && typeof result === 'object') {
        result._metadata = {
          ...result._metadata,
          tool: toolName,
          duration: duration,
          timestamp: new Date().toISOString(),
          server_version: '2.0.0'
        };
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log comprehensive error information for debugging
      console.error(`MCP Server Error [${toolName}]:`, {
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n'), // Truncated stack trace
        duration: duration,
        timestamp: new Date().toISOString(),
        args: args.length > 0 ? JSON.stringify(args[0]).substring(0, 200) : 'no args'
      });

      // Create enhanced error response with helpful context for users
      throw new Error(JSON.stringify({
        error: error.message,
        tool: toolName,
        duration: duration,
        timestamp: new Date().toISOString(),
        suggestion: getSuggestionForError(error, toolName)
      }));
    }
  };
}

// Get helpful suggestions based on error type
function getSuggestionForError(error, toolName) {
  const message = error.message.toLowerCase();

  if (message.includes('api key') || message.includes('unauthorized')) {
    return 'Check your FAL_KEY environment variable or run the CLI setup command';
  }
  if (message.includes('model') && message.includes('not found')) {
    return 'Use list_models tool to see available models';
  }
  if (message.includes('prompt') && message.includes('empty')) {
    return 'Provide a non-empty prompt for image generation';
  }
  if (message.includes('parameter') || message.includes('validation')) {
    return 'Check the model configuration for valid parameter ranges';
  }

  return 'Check the tool documentation or try again with different parameters';
}

// ===== API KEY MANAGEMENT =====
/**
 * Enhanced API key management with validation
 * 
 * This function retrieves and validates the FAL API key from multiple sources:
 * 1. Environment variable (FAL_KEY) - preferred for production
 * 2. Secure storage - encrypted local storage for development
 * 
 * The function also validates the API key format to catch configuration errors early.
 * 
 * @returns {Promise<string>} Valid FAL API key
 * @throws {Error} If no API key is found or format is invalid
 */
async function getApiKey() {
  let apiKey = null;

  // Try to get from environment first (preferred method)
  if (process.env.FAL_KEY) {
    apiKey = process.env.FAL_KEY;
  } else if (await hasStoredApiKey()) {
    // Try to get from secure storage (development fallback)
    apiKey = await retrieveApiKey();
  }

  if (!apiKey) {
    throw new Error('No FAL API key found. Set FAL_KEY environment variable or configure via CLI.');
  }

  // Enhanced API key validation to catch format errors early
  if (!validateApiKeyFormat(apiKey)) {
    throw new Error('Invalid API key format. Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  }

  return apiKey;
}

/**
 * Validate API key format
 * 
 * FAL API keys follow a specific format: UUID:TOKEN
 * This function validates both parts to ensure the key is properly formatted.
 * 
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} True if the API key format is valid
 */
function validateApiKeyFormat(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return false;

  // FAL API keys have format: uuid:token (two parts separated by colon)
  const parts = apiKey.split(':');
  if (parts.length !== 2) return false;

  const [uuid, token] = parts;

  // Validate UUID format (8-4-4-4-12 hexadecimal pattern)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) return false;

  // Token should be at least 32 characters (security requirement)
  if (token.length < 32) return false;

  return true;
}

// TOOLS IMPLEMENTATION

server.setRequestHandler(ListToolsRequestSchema, handleErrors(async () => {
  return {
    tools: [
      {
        name: 'generate_image',
        description: 'Generate high-quality images using advanced FAL AI models with intelligent parameter optimization',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Detailed text prompt for image generation. Be specific about style, lighting, composition, and details for best results.',
              minLength: 3,
              maxLength: 2000,
              examples: [
                'A majestic mountain landscape with golden hour lighting, photorealistic',
                'Portrait of a wise elderly wizard with flowing robes, fantasy art style, detailed'
              ]
            },
            model: {
              type: 'string',
              description: 'FAL AI model ID. Use get_model_recommendations for optimal model selection.',
              default: 'fal-ai/flux-pro/kontext/text-to-image',
              examples: [
                'fal-ai/flux-pro/v1.1-ultra',
                'fal-ai/flux-pro/kontext/text-to-image',
                'fal-ai/imagen4/preview/ultra'
              ]
            },
            parameters: {
              type: 'object',
              description: 'Advanced model-specific parameters with intelligent defaults. Leave empty for auto-optimization.',
              properties: {
                aspect_ratio: {
                  type: 'string',
                  description: 'Image aspect ratio for optimal composition',
                  enum: ['1:1', '4:3', '3:4', '16:9', '9:16', '21:9', '9:21'],
                  default: '16:9'
                },
                guidance_scale: {
                  type: 'number',
                  description: 'Prompt adherence strength (1.0-20.0). Higher = closer to prompt, lower = more creative',
                  minimum: 1.0,
                  maximum: 20.0,
                  default: 3.5
                },
                num_images: {
                  type: 'number',
                  description: 'Number of variations to generate (1-4). Higher count = more options but higher cost',
                  minimum: 1,
                  maximum: 4,
                  default: 1
                },
                num_inference_steps: {
                  type: 'number',
                  description: 'Quality vs speed tradeoff (4-50). Higher = better quality but slower',
                  minimum: 4,
                  maximum: 50,
                  default: 28
                },
                seed: {
                  type: 'number',
                  description: 'Random seed for reproducible results (0-4294967295). Leave empty for random',
                  minimum: 0,
                  maximum: 4294967295
                }
              }
            },
            save_to_disk: {
              type: 'boolean',
              description: 'Save images locally with organized folder structure and metadata',
              default: false
            },
            output_directory: {
              type: 'string',
              description: 'Custom output directory path. Creates organized subfolders by date and model if not specified.'
            },
            confirm_spending: {
              type: 'boolean',
              description: 'Confirm spending for operations over $5 USD. Required when estimated cost exceeds spending limit.',
              default: false
            }
          },
          required: ['prompt'],
          additionalProperties: false
        }
      },
      {
        name: 'list_models',
        description: 'List available FAL AI models with intelligent filtering and performance metadata',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by generation type for targeted results',
              enum: ['image', 'video', 'audio', 'text'],
              examples: ['image']
            },
            provider: {
              type: 'string',
              description: 'Filter by AI provider for specific capabilities',
              examples: ['fal-ai', 'anthropic', 'openai']
            },
            max_cost: {
              type: 'number',
              description: 'Maximum cost per generation (USD). Helps find budget-friendly options',
              minimum: 0.001,
              maximum: 1.0,
              examples: [0.05, 0.1]
            },
            quality: {
              type: 'string',
              description: 'Quality preference for model recommendations',
              enum: ['fast', 'balanced', 'high', 'ultra']
            }
          },
          additionalProperties: false
        }
      },
      {
        name: 'get_model_info',
        description: 'Get comprehensive model information including capabilities, pricing, and optimization tips',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: {
              type: 'string',
              description: 'Model identifier'
            }
          },
          required: ['model_id']
        }
      },
      {
        name: 'optimize_prompt',
        description: 'Optimize a prompt for better image generation results',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Original prompt to optimize'
            },
            model: {
              type: 'string',
              description: 'Target model for optimization',
              default: 'fal-ai/flux-pro/kontext/text-to-image'
            },
            style: {
              type: 'string',
              enum: ['detailed', 'artistic', 'technical', 'creative'],
              description: 'Optimization style preference',
              default: 'detailed'
            },
            max_length: {
              type: 'number',
              description: 'Maximum length of optimized prompt',
              default: 500
            }
          },
          required: ['prompt']
        }
      },
      {
        name: 'batch_generate',
        description: 'Generate images with multiple prompts and/or models',
        inputSchema: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              description: 'Array of generation tasks',
              items: {
                type: 'object',
                properties: {
                  prompt: { type: 'string' },
                  model: { type: 'string' },
                  parameters: { type: 'object' }
                },
                required: ['prompt', 'model']
              }
            },
            batch_size: {
              type: 'number',
              description: 'Number of concurrent generations',
              default: 1,
              minimum: 1,
              maximum: 5
            },
            output_directory: {
              type: 'string',
              description: 'Directory to save all generated images'
            }
          },
          required: ['tasks']
        }
      },
      {
        name: 'calculate_cost',
        description: 'Calculate estimated cost for generation tasks',
        inputSchema: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              description: 'Array of generation tasks',
              items: {
                type: 'object',
                properties: {
                  model: { type: 'string' },
                  image_count: { type: 'number', default: 1 }
                },
                required: ['model']
              }
            }
          },
          required: ['tasks']
        }
      },
      {
        name: 'get_model_recommendations',
        description: 'Get model recommendations based on criteria',
        inputSchema: {
          type: 'object',
          properties: {
            budget: {
              type: 'number',
              description: 'Maximum budget per image'
            },
            type: {
              type: 'string',
              description: 'Preferred model type'
            },
            quality: {
              type: 'string',
              enum: ['high', 'medium', 'fast'],
              description: 'Quality preference',
              default: 'high'
            },
            speed: {
              type: 'string',
              enum: ['fast', 'medium', 'slow'],
              description: 'Speed preference',
              default: 'medium'
            }
          }
        }
      }
    ]
  };
}));

server.setRequestHandler(CallToolRequestSchema, handleErrors(async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'generate_image': {
      const apiKey = await getApiKey();
      const {
        prompt,
        model = 'fal-ai/flux-pro/kontext/text-to-image',
        parameters = {},
        save_to_disk = false,
        output_directory = null,
        confirm_spending = false
      } = args;

      // Enhanced parameter validation
      if (!prompt || prompt.trim().length < 3) {
        throw new Error('Prompt must be at least 3 characters long');
      }
      if (prompt.length > 2000) {
        throw new Error('Prompt must be less than 2000 characters');
      }

      // Calculate cost and check spending limit
      const numImages = parameters.num_images || 1;
      const estimatedCost = await calculateGenerationCost(model, numImages);

      if (requiresSpendingConfirmation(estimatedCost) && !confirm_spending) {
        throw createSpendingConfirmationError(estimatedCost, model, numImages);
      }

      // Intelligent output directory creation
      const outputDir = save_to_disk ?
        (output_directory || path.join(process.cwd(), 'generated-images',
          new Date().toISOString().split('T')[0],
          model.replace(/[^a-zA-Z0-9]/g, '_'))) :
        null;

      const result = await generateSingleImage({
        model,
        prompt,
        parameters,
        apiKey,
        outputDir,
        generationId: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      });

      // Enhanced response with inline image display for visual preview
      const imageDisplays = result.images ? result.images.map((url, index) => {
        return `![Generated Image ${index + 1}](${url})`;
      }).join('\n\n') : '';

      const displayText = `🎨 **Image Generated Successfully!**\n\n${imageDisplays}\n\n📋 **Details:**\n- **Model:** ${result.model}\n- **Prompt:** "${result.prompt}"\n- **Duration:** ${result.duration}ms\n- **Generation ID:** ${result.generationId}\n- **Images:** ${result.images?.length || 0}`;

      return {
        content: [
          {
            type: 'text',
            text: displayText
          }
        ],
        success: result.success,
        model: result.model,
        prompt: result.prompt,
        images: result.images || [],
        parameters: result.parameters || {},
        duration: result.duration,
        generationId: result.generationId,
        timestamp: result.timestamp,
        metadata: {
          ...result.metadata,
          prompt_length: prompt.length,
          model_type: model.includes('ultra') ? 'ultra_quality' : 'standard',
          estimated_cost: result.metadata?.estimated_cost || 'unknown'
        }
      };
    }

    case 'list_models': {
      const { type, provider, max_cost, quality } = args;

      // Load models with enhanced filtering
      let models = await getFilteredModels({
        type,
        provider,
        maxCost: max_cost
      });

      // Apply quality-based intelligent sorting
      if (quality) {
        models = models.sort((a, b) => {
          switch (quality) {
            case 'fast': return (a.defaultParams?.num_inference_steps || 28) - (b.defaultParams?.num_inference_steps || 28);
            case 'high': case 'ultra': return (b.costPerImage || 0) - (a.costPerImage || 0);
            case 'balanced': default: {
              const scoreA = (a.costPerImage || 0) * (a.defaultParams?.num_inference_steps || 28);
              const scoreB = (b.costPerImage || 0) * (b.defaultParams?.num_inference_steps || 28);
              return scoreA - scoreB;
            }
          }
        });
      }

      // Enhanced response with intelligent insights
      return {
        models: models.map(model => ({
          id: model.id,
          name: model.name,
          description: model.description,
          category: model.category || 'Standard',
          costPerImage: model.costPerImage,
          defaultParams: model.defaultParams,
          supportedAspectRatios: model.supportedAspectRatios,
          maxImages: model.maxImages,
          recommendationScore: model.recommendationScore || 0,
          configFile: model.configFile,
          lastModified: model.lastModified
        })),
        metadata: {
          total_models: models.length,
          filters_applied: { type, provider, max_cost, quality },
          average_cost: models.length > 0 ?
            (models.reduce((sum, m) => sum + (m.costPerImage || 0), 0) / models.length).toFixed(4) : 0,
          quality_distribution: {
            ultra: models.filter(m => m.category === 'Ultra Quality').length,
            professional: models.filter(m => m.category === 'Professional').length,
            standard: models.filter(m => !m.category || m.category === 'Standard').length
          },
          recommended_for_beginners: models.filter(m =>
            (m.costPerImage || 0) < 0.05 &&
            (m.defaultParams?.num_inference_steps || 28) <= 28
          ).slice(0, 3).map(m => m.id)
        }
      };
    }

    case 'get_model_info': {
      const { model_id } = args;
      const model = await getModelById(model_id);

      if (!model) {
        throw new Error(`Model not found: ${model_id}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(model, null, 2)
          }
        ]
      };
    }

    case 'optimize_prompt': {
      const apiKey = await getApiKey();
      const {
        prompt,
        model = 'fal-ai/flux-pro/kontext/text-to-image',
        style = 'detailed',
        max_length = 500
      } = args;

      const result = await optimizePrompt(prompt, model, apiKey, {
        style,
        maxLength: max_length
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }

    case 'batch_generate': {
      const apiKey = await getApiKey();
      const {
        tasks,
        batch_size = 1,
        output_directory = null,
        confirm_spending = false
      } = args;

      // Calculate total cost for all tasks
      let totalEstimatedCost = 0;
      for (const task of tasks) {
        const numImages = task.parameters?.num_images || 1;
        const taskCost = await calculateGenerationCost(task.model, numImages);
        totalEstimatedCost += taskCost;
      }

      // Check spending limit for batch operation
      if (requiresSpendingConfirmation(totalEstimatedCost) && !confirm_spending) {
        throw new Error(JSON.stringify({
          type: 'SPENDING_CONFIRMATION_REQUIRED',
          estimated_cost: totalEstimatedCost,
          spending_limit: SPENDING_LIMIT,
          batch_tasks: tasks.length,
          message: `This batch operation will cost approximately $${totalEstimatedCost.toFixed(3)}, which exceeds the $${SPENDING_LIMIT} spending limit. Please confirm if you want to proceed.`,
          confirmation_needed: true
        }));
      }

      const outputDir = output_directory ||
        path.join(process.cwd(), 'generated-images', Date.now().toString());

      const results = await generateBatch(tasks, apiKey, {
        outputDir,
        batchSize: batch_size,
        generationId: Date.now().toString()
      });

      // Create visual display for all generated images
      let allImageDisplays = [];
      let taskIndex = 1;

      results.forEach((result, index) => {
        if (result.images && result.images.length > 0) {
          const taskImages = result.images.map((url, imgIndex) => {
            return `![Task ${taskIndex} - Image ${imgIndex + 1}](${url})`;
          }).join('\n');

          allImageDisplays.push(`**Task ${taskIndex}: ${result.model}**\n${result.prompt}\n${taskImages}`);
          taskIndex++;
        }
      });

      const displayText = `🎨 **Batch Generation Completed!**\n\n${allImageDisplays.join('\n\n---\n\n')}\n\n📋 **Batch Summary:**\n- **Total Tasks:** ${tasks.length}\n- **Estimated Cost:** $${totalEstimatedCost.toFixed(3)}\n- **Output Directory:** ${outputDir}\n- **Batch Size:** ${batch_size}`;

      return {
        content: [
          {
            type: 'text',
            text: displayText
          }
        ],
        success: true,
        total_tasks: tasks.length,
        estimated_cost: totalEstimatedCost,
        spending_confirmed: confirm_spending,
        results: results,
        metadata: {
          batch_size: batch_size,
          output_directory: outputDir,
          timestamp: new Date().toISOString()
        }
      };
    }

    case 'calculate_cost': {
      const { tasks } = args;
      const models = await loadModels();
      const costEstimate = calculateCost(tasks, models);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(costEstimate, null, 2)
          }
        ]
      };
    }

    case 'get_model_recommendations': {
      const { budget, type, quality = 'high', speed = 'medium' } = args;
      const recommendations = await getModelRecommendations({
        budget,
        type,
        quality,
        speed
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(recommendations, null, 2)
          }
        ]
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}));

// RESOURCES IMPLEMENTATION

server.setRequestHandler(ListResourcesRequestSchema, handleErrors(async () => {
  const modelsDir = path.join(__dirname, 'models');
  const generatedDir = path.join(__dirname, 'generated-images');

  const resources = [];

  // Add model configurations as resources
  try {
    const modelFiles = await fs.readdir(modelsDir);
    for (const file of modelFiles.filter(f => f.endsWith('.json'))) {
      resources.push({
        uri: `file://models/${file}`,
        name: `Model Config: ${file.replace('.json', '')}`,
        description: `Configuration for ${file.replace('.json', '')} model`,
        mimeType: 'application/json'
      });
    }
  } catch (error) {
    // Models directory might not exist
  }

  // Add generated images as resources (if directory exists)
  try {
    if (await fs.pathExists(generatedDir)) {
      const sessions = await fs.readdir(generatedDir);
      for (const session of sessions) {
        const sessionPath = path.join(generatedDir, session);
        if ((await fs.stat(sessionPath)).isDirectory()) {
          resources.push({
            uri: `file://generated-images/${session}`,
            name: `Generated Images: ${session}`,
            description: `Images generated in session ${session}`,
            mimeType: 'application/json'
          });
        }
      }
    }
  } catch (error) {
    // Generated images directory might not exist
  }

  // Add model statistics as a resource
  resources.push({
    uri: 'fal://model-stats',
    name: 'Model Statistics',
    description: 'Statistics and summary of all available models',
    mimeType: 'application/json'
  });

  return { resources };
}));

server.setRequestHandler(ReadResourceRequestSchema, handleErrors(async (request) => {
  const { uri } = request.params;

  if (uri.startsWith('file://models/')) {
    const filename = uri.replace('file://models/', '');
    const filepath = path.join(__dirname, 'models', filename);

    if (await fs.pathExists(filepath)) {
      const content = await fs.readFile(filepath, 'utf8');
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: content
          }
        ]
      };
    }
  } else if (uri.startsWith('file://generated-images/')) {
    const sessionPath = uri.replace('file://generated-images/', '');
    const dirPath = path.join(__dirname, 'generated-images', sessionPath);

    if (await fs.pathExists(dirPath)) {
      const files = await fs.readdir(dirPath, { recursive: true });
      const imageFiles = files.filter(f =>
        f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp')
      );

      const manifest = {
        session: sessionPath,
        generatedAt: (await fs.stat(dirPath)).birthtime,
        totalImages: imageFiles.length,
        images: imageFiles.map(file => ({
          filename: file,
          path: path.join(dirPath, file),
          size: null // Could add file size here
        }))
      };

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(manifest, null, 2)
          }
        ]
      };
    }
  } else if (uri === 'fal://model-stats') {
    const stats = await getModelStats();
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(stats, null, 2)
        }
      ]
    };
  }

  throw new Error(`Resource not found: ${uri}`);
}));

// PROMPTS IMPLEMENTATION

server.setRequestHandler(ListPromptsRequestSchema, handleErrors(async () => {
  return {
    prompts: [
      {
        name: 'generate_artistic_image',
        description: 'Generate an artistic image with optimized prompts',
        arguments: [
          {
            name: 'subject',
            description: 'Main subject of the image',
            required: true
          },
          {
            name: 'style',
            description: 'Artistic style (e.g., oil painting, digital art)',
            required: false
          },
          {
            name: 'mood',
            description: 'Mood or atmosphere',
            required: false
          }
        ]
      },
      {
        name: 'generate_photorealistic_image',
        description: 'Generate a photorealistic image with proper technical terms',
        arguments: [
          {
            name: 'subject',
            description: 'Main subject to photograph',
            required: true
          },
          {
            name: 'location',
            description: 'Location or setting',
            required: false
          },
          {
            name: 'lighting',
            description: 'Lighting conditions',
            required: false
          }
        ]
      }
    ]
  };
}));

server.setRequestHandler(GetPromptRequestSchema, handleErrors(async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'generate_artistic_image': {
      const { subject, style = 'digital art', mood = 'dramatic' } = args;
      const prompt = `${subject}, ${style}, ${mood} atmosphere, highly detailed, masterpiece, professional artwork, vibrant colors, perfect composition`;

      return {
        description: `Generate an artistic image of ${subject}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please generate an artistic image using this optimized prompt: "${prompt}". Use the generate_image tool with appropriate artistic parameters.`
            }
          }
        ]
      };
    }

    case 'generate_photorealistic_image': {
      const { subject, location = 'natural setting', lighting = 'golden hour' } = args;
      const prompt = `professional photograph of ${subject} in ${location}, ${lighting} lighting, shot with professional camera, high resolution, photorealistic, detailed, sharp focus, perfect exposure`;

      return {
        description: `Generate a photorealistic image of ${subject}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please generate a photorealistic image using this optimized prompt: "${prompt}". Use the generate_image tool with photorealistic parameters.`
            }
          }
        ]
      };
    }

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}));

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('FAL CLI MCP Server running on stdio');
}

// Handle process termination
process.on('SIGINT', async () => {
  console.error('Shutting down FAL CLI MCP Server...');
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});
