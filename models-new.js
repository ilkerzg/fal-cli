/**
 * ===== SCALABLE FAL AI MODEL LOADER =====
 * 
 * This module provides efficient loading and management of FAL AI model configurations
 * from JSON files. It implements caching for performance and provides various utility
 * functions for model discovery and organization.
 * 
 * Key Features:
 * - Dynamic model loading from JSON configuration files
 * - In-memory caching for improved performance
 * - Model categorization and grouping
 * - Shared parameter analysis across models
 * - Graceful error handling for missing or corrupt files
 * - Cache refresh capabilities for runtime updates
 * 
 * Architecture:
 * - Models are stored as individual JSON files in the ./models directory
 * - Each filename (without .json) becomes the model key/identifier
 * - Configurations are cached in memory after first load
 * - Cache can be refreshed when model files are updated
 * 
 * @author ilkerzg
 * @version 0.0.1
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelsDir = path.join(__dirname, 'models');

// ===== CACHING SYSTEM =====
/**
 * In-memory cache for loaded model configurations.
 * This prevents repeated file system access and improves performance.
 */
let modelsCache = null;

/**
 * Load all model definitions from JSON files in the models directory
 * 
 * This function scans the models directory for JSON files and loads each one as a model
 * configuration. It implements caching to avoid repeated file system operations and
 * provides graceful error handling for individual file loading failures.
 * 
 * The function uses filenames (without .json extension) as model keys, allowing for
 * easy model identification and retrieval. Failed file loads are logged as warnings
 * but don't prevent other models from loading successfully.
 * 
 * @returns {Promise<Object>} Object with model keys as properties and model configurations as values:
 *   - Key: filename without .json extension (e.g., 'flux-pro-kontext')
 *   - Value: parsed JSON model configuration object
 * 
 * @throws {Error} If models directory is inaccessible or no valid JSON files found
 * 
 * @example
 * const models = await loadModels();
 * console.log(Object.keys(models)); // ['flux-pro-kontext', 'sdxl-turbo', ...]
 * const fluxModel = models['flux-pro-kontext'];
 */
export const loadModels = async () => {
  if (modelsCache) {
    return modelsCache;
  }

  try {
    // Read all JSON files from models directory
    const files = await fs.readdir(modelsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
      throw new Error('No model JSON files found in models directory');
    }

    const models = {};

    // Load each JSON file
    for (const file of jsonFiles) {
      const filePath = path.join(modelsDir, file);
      const modelKey = path.basename(file, '.json'); // Use filename as key

      try {
        const modelData = await fs.readJson(filePath);
        models[modelKey] = modelData;
      } catch (error) {
        console.warn(`Warning: Failed to load model from ${file}:`, error.message);
      }
    }

    modelsCache = models;
    return models;
  } catch (error) {
    throw new Error(`Failed to load models: ${error.message}`);
  }
};

/**
 * Get model by its key
 * @param {string} modelKey - The model key
 * @returns {Object|null} Model definition or null if not found
 */
export const getModelById = async (modelKey) => {
  const models = await loadModels();
  return models[modelKey] || null;
};

/**
 * Get all models as an array with keys
 * @returns {Array} Array of models with key property
 */
export const getAllModels = async () => {
  const models = await loadModels();
  return Object.entries(models).map(([key, model]) => ({
    key,
    ...model
  }));
};

/**
 * Get models grouped by category
 * @returns {Object} Object with categories as keys and arrays of models as values
 */
export const getModelsByCategory = async () => {
  const models = await loadModels();
  const categories = {};

  Object.entries(models).forEach(([key, model]) => {
    if (!categories[model.category]) {
      categories[model.category] = [];
    }
    categories[model.category].push({ key, ...model });
  });

  return categories;
};

/**
 * Helper function to find shared parameters between multiple models
 * @param {Array} models - Array of model objects
 * @returns {Object} Object describing shared parameters
 */
export const getSharedParameters = (models) => {
  if (!models || models.length === 0) return {};

  // Find shared aspect ratios across all models
  const sharedAspectRatios = models.reduce((common, model) => {
    if (!model.supportedAspectRatios) return common;
    return common.filter(ratio => model.supportedAspectRatios.includes(ratio));
  }, models[0]?.supportedAspectRatios || []);

  // Find shared formats across all models
  const sharedFormats = models.reduce((common, model) => {
    if (!model.supportedFormats) return common;
    return common.filter(format => model.supportedFormats.includes(format));
  }, models[0]?.supportedFormats || []);

  const sharedParams = {};

  // Add aspect ratio if shared
  if (sharedAspectRatios.length > 0) {
    sharedParams.aspect_ratio = {
      type: 'string',
      options: sharedAspectRatios,
      default: sharedAspectRatios[0]
    };
  }

  // Add output format if shared
  if (sharedFormats.length > 0) {
    sharedParams.output_format = {
      type: 'string',
      options: sharedFormats,
      default: sharedFormats[0]
    };
  }

  // Add num_images (all models support this, but limit to max 4 per API call)
  sharedParams.num_images = {
    type: 'integer',
    min: 1,
    max: 4, // Maximum 4 images per single API call
    default: 1
  };

  return sharedParams;
};

/**
 * Refresh models cache - useful when models are updated
 */
export const refreshModelsCache = () => {
  modelsCache = null;
};

/**
 * Get list of available model files
 * @returns {Array} Array of model filenames
 */
export const getAvailableModelFiles = async () => {
  try {
    const files = await fs.readdir(modelsDir);
    return files.filter(file => file.endsWith('.json'));
  } catch (error) {
    return [];
  }
};
