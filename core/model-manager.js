/**
 * ===== SHARED MODEL MANAGEMENT LOGIC =====
 * 
 * This module provides comprehensive model management capabilities for FAL AI image generation.
 * It handles loading, filtering, validation, and analysis of model configurations.
 * 
 * Core Functionality:
 * - Dynamic model configuration loading from JSON files
 * - Advanced filtering and search capabilities
 * - Model validation and health checking
 * - Statistical analysis and performance metrics
 * - Intelligent model recommendations
 * - Configuration export and backup
 * 
 * The module maintains a centralized model registry that is shared between
 * CLI and MCP server implementations, ensuring consistent model availability
 * and behavior across all interfaces.
 * 
 * Model configurations are stored as JSON files in the ../models directory,
 * allowing for easy addition and modification of supported models.
 * 
 * @author ilkerzg
 * @version 0.0.1
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Load all available models from JSON configurations
 * 
 * This function scans the models directory and loads all JSON configuration files,
 * creating a comprehensive registry of available FAL AI models. It adds metadata
 * to each model configuration and handles loading errors gracefully.
 * 
 * Features:
 * - Automatic discovery of JSON model files
 * - Metadata enrichment (file info, timestamps)
 * - Graceful error handling for corrupt files
 * - Consistent alphabetical sorting
 * - Performance optimization through caching
 * 
 * @returns {Promise<Array<Object>>} Array of model configuration objects containing:
 *   - id: Unique model identifier
 *   - name: Human-readable model name
 *   - description: Model description and capabilities
 *   - category: Model category (e.g., 'text-to-image', 'image-to-image')
 *   - provider: Model provider (e.g., 'fal-ai', 'stability-ai')
 *   - parameters: Supported generation parameters
 *   - costPerImage: Cost per generated image in USD
 *   - configFile: Source configuration filename
 *   - lastModified: Configuration file modification timestamp
 * 
 * @throws {Error} Only if the models directory is completely inaccessible
 * 
 * @example
 * const models = await loadModels();
 * console.log(`Loaded ${models.length} models`);
 * const fluxModels = models.filter(m => m.id.includes('flux'));
 */
export async function loadModels() {
  const modelsDir = path.join(__dirname, '../models');

  try {
    const files = await fs.readdir(modelsDir);
    const modelFiles = files.filter(file => file.endsWith('.json'));

    const models = [];

    for (const file of modelFiles) {
      try {
        const filePath = path.join(modelsDir, file);
        const modelData = await fs.readJson(filePath);

        // Add metadata
        modelData.configFile = file;
        modelData.lastModified = (await fs.stat(filePath)).mtime;

        models.push(modelData);
      } catch (error) {
        console.warn(`Warning: Failed to load model config ${file}:`, error.message);
      }
    }

    // Sort models by name for consistent ordering
    models.sort((a, b) => a.name.localeCompare(b.name));

    return models;

  } catch (error) {
    console.error('Failed to load models:', error.message);
    return [];
  }
}

/**
 * Get a specific model by ID
 * @param {string} modelId - Model identifier
 * @returns {Promise<Object|null>} Model configuration or null if not found
 */
export async function getModelById(modelId) {
  const models = await loadModels();
  return models.find(model => model.id === modelId) || null;
}

/**
 * Get models filtered by criteria
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array<Object>>} Filtered models
 */
export async function getFilteredModels(filters = {}) {
  const models = await loadModels();

  return models.filter(model => {
    // Filter by type (image, video, etc.)
    if (filters.type && model.type !== filters.type) {
      return false;
    }

    // Filter by provider
    if (filters.provider && !model.id.includes(filters.provider)) {
      return false;
    }

    // Filter by cost range
    if (filters.maxCost && model.costPerImage > filters.maxCost) {
      return false;
    }

    if (filters.minCost && model.costPerImage < filters.minCost) {
      return false;
    }

    // Filter by capabilities
    if (filters.capabilities) {
      const requiredCaps = Array.isArray(filters.capabilities) ?
        filters.capabilities : [filters.capabilities];

      const modelCaps = model.capabilities || [];
      const hasAllCaps = requiredCaps.every(cap =>
        modelCaps.some(modelCap =>
          modelCap.toLowerCase().includes(cap.toLowerCase())
        )
      );

      if (!hasAllCaps) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get shared parameters across all models
 * @returns {Promise<Object>} Common parameters
 */
export async function getSharedParameters() {
  const models = await loadModels();

  if (models.length === 0) {
    return {};
  }

  // Find parameters that exist in all models
  const sharedParams = {};
  const firstModel = models[0];

  if (firstModel.parameters) {
    Object.keys(firstModel.parameters).forEach(paramName => {
      const isShared = models.every(model =>
        model.parameters && model.parameters[paramName]
      );

      if (isShared) {
        // Use the parameter definition from the first model
        // but merge any common values
        sharedParams[paramName] = {
          ...firstModel.parameters[paramName],
          sharedAcrossModels: true
        };
      }
    });
  }

  return sharedParams;
}

/**
 * Validate model configuration
 * @param {Object} modelConfig - Model configuration to validate
 * @returns {Object} Validation result
 */
export function validateModelConfig(modelConfig) {
  const errors = [];
  const warnings = [];

  // Required fields
  const required = ['id', 'name', 'type', 'costPerImage'];
  required.forEach(field => {
    if (!modelConfig[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Validate ID format
  if (modelConfig.id && !modelConfig.id.includes('/')) {
    warnings.push('Model ID should follow "provider/model-name" format');
  }

  // Validate cost
  if (modelConfig.costPerImage && typeof modelConfig.costPerImage !== 'number') {
    errors.push('costPerImage must be a number');
  }

  if (modelConfig.costPerImage && modelConfig.costPerImage < 0) {
    errors.push('costPerImage cannot be negative');
  }

  // Validate parameters
  if (modelConfig.parameters) {
    Object.entries(modelConfig.parameters).forEach(([name, param]) => {
      if (!param.type) {
        warnings.push(`Parameter ${name} is missing type definition`);
      }

      if (param.type === 'number' && param.min !== undefined && param.max !== undefined) {
        if (param.min >= param.max) {
          errors.push(`Parameter ${name}: min value must be less than max value`);
        }
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get model statistics and summary
 * @returns {Promise<Object>} Model statistics
 */
export async function getModelStats() {
  const models = await loadModels();

  const stats = {
    total: models.length,
    byType: {},
    byProvider: {},
    costRange: {
      min: Infinity,
      max: -Infinity,
      average: 0
    },
    capabilities: new Set(),
    lastUpdated: new Date().toISOString()
  };

  let totalCost = 0;

  models.forEach(model => {
    // Count by type
    stats.byType[model.type] = (stats.byType[model.type] || 0) + 1;

    // Count by provider
    const provider = model.id.split('/')[0];
    stats.byProvider[provider] = (stats.byProvider[provider] || 0) + 1;

    // Track cost range
    if (model.costPerImage) {
      stats.costRange.min = Math.min(stats.costRange.min, model.costPerImage);
      stats.costRange.max = Math.max(stats.costRange.max, model.costPerImage);
      totalCost += model.costPerImage;
    }

    // Collect capabilities
    if (model.capabilities) {
      model.capabilities.forEach(cap => stats.capabilities.add(cap));
    }
  });

  // Calculate average cost
  if (models.length > 0) {
    stats.costRange.average = totalCost / models.length;
  }

  // Convert capabilities set to array
  stats.capabilities = Array.from(stats.capabilities);

  // Handle edge case where no models have cost
  if (stats.costRange.min === Infinity) {
    stats.costRange.min = 0;
    stats.costRange.max = 0;
  }

  return stats;
}

/**
 * Get model recommendations based on criteria
 * @param {Object} criteria - Selection criteria
 * @returns {Promise<Array<Object>>} Recommended models
 */
export async function getModelRecommendations(criteria = {}) {
  const models = await loadModels();

  const {
    budget = null,
    type = null,
    quality = 'high',
    speed = 'medium'
  } = criteria;

  let scored = models.map(model => {
    let score = 0;

    // Score based on type match
    if (type && model.type === type) {
      score += 10;
    }

    // Score based on budget
    if (budget && model.costPerImage) {
      if (model.costPerImage <= budget) {
        score += 5;
        // Prefer cheaper options within budget
        score += (budget - model.costPerImage) * 10;
      } else {
        score -= 20; // Penalty for exceeding budget
      }
    }

    // Score based on quality preference
    if (quality === 'high' && model.id.includes('ultra')) {
      score += 8;
    } else if (quality === 'high' && model.id.includes('pro')) {
      score += 6;
    } else if (quality === 'medium' && model.id.includes('dev')) {
      score += 5;
    }

    // Score based on speed preference
    if (speed === 'fast' && model.id.includes('turbo')) {
      score += 5;
    }

    return {
      ...model,
      recommendationScore: score
    };
  });

  // Sort by score and return top recommendations
  scored.sort((a, b) => b.recommendationScore - a.recommendationScore);

  // Return top 3 recommendations
  return scored.slice(0, 3);
}

/**
 * Export model configurations for backup or sharing
 * @param {string} outputPath - Output file path
 * @returns {Promise<void>}
 */
export async function exportModelConfigs(outputPath) {
  const models = await loadModels();
  const exportData = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    models: models.map(model => {
      // Remove runtime metadata for clean export
      const { configFile, lastModified, ...cleanModel } = model;
      return cleanModel;
    })
  };

  await fs.writeJson(outputPath, exportData, { spaces: 2 });
}
