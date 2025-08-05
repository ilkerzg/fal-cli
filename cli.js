#!/usr/bin/env node

/**
 * ===== FAL CLI - AI IMAGE GENERATION COMMAND LINE INTERFACE =====
 * 
 * A comprehensive command-line interface for FAL AI image generation models.
 * This CLI provides an interactive, user-friendly way to generate images using
 * various AI models with advanced features and customization options.
 * 
 * CORE FEATURES:
 * - Interactive model selection with detailed information
 * - Single and batch generation modes
 * - Intelligent prompt optimization using LLM
 * - Secure API key management with encryption
 * - Cost estimation and spending protection
 * - Real-time progress tracking with playful animations
 * - Organized output with metadata preservation
 * - Browser integration for viewing results
 * 
 * WORKFLOW:
 * 1. Authentication - Secure API key setup and validation
 * 2. Model Selection - Multi-select from available FAL models
 * 3. Mode Selection - Choose between single or batch generation
 * 4. Input Configuration - Prompts, images, or batch data files
 * 5. Prompt Optimization - Optional LLM-based prompt enhancement
 * 6. Parameter Tuning - Model-specific parameter configuration
 * 7. Output Setup - Image count, batch size, and directory selection
 * 8. Cost Estimation - Transparent pricing with user confirmation
 * 9. Generation - Multi-threaded image generation with progress tracking
 * 10. Post-Processing - Results display, browser opening, and further actions
 * 
 * SECURITY:
 * - AES-256-GCM encryption for stored API keys
 * - Machine-specific encryption keys
 * - OS-appropriate secure storage locations
 * - API key format validation
 * 
 * ARCHITECTURE:
 * - Modular design with shared core libraries
 * - Commander.js for command parsing
 * - Inquirer.js for interactive prompts
 * - Chalk and Ora for beautiful terminal UI
 * - Async/await throughout for modern JavaScript
 * 
 * @author ilkerzg
 * @version 0.0.1
 * @license MIT
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { fal } from '@fal-ai/client';
import open from 'open';
import { storeApiKey, retrieveApiKey, hasStoredApiKey, removeApiKey, getConfigPath, validateApiKey } from './secure-storage.js';
import { getAllModels, getModelById, getSharedParameters, loadModels } from './models-new.js';

const program = new Command();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config();

// ===== CLI CONFIGURATION =====
/**
 * Configure the main CLI program with metadata, options, and global settings.
 * This sets up the foundation for all CLI commands and interactions.
 */
program
  .name('fal-cli')
  .description('🎨 FAL AI Models CLI - Generate images and videos with FAL AI models')
  .version('3.0.0')
  .option('-v, --verbose', 'enable verbose logging')
  .option('--no-color', 'disable colored output');

// ===== GLOBAL STATE MANAGEMENT =====
/**
 * Global state variables that persist throughout the CLI session.
 * These maintain user selections and configuration across different steps.
 */
let FAL_KEY = null;              // Authenticated FAL API key
let selectedModels = [];         // Array of selected model configurations
let isBatchMode = false;         // Whether to use batch or single generation mode
let batchData = { prompts: [], images: [] }; // Batch processing data
let userPrompt = '';             // User's input prompt for single mode
let userImagePath = '';          // Path to input image for image-to-image
let imagesPerModel = 1;          // Number of images to generate per model
let batchSize = 1;               // Concurrent generation batch size
let parameters = {};             // Model-specific generation parameters
let isOptimized = false;         // Whether prompts have been optimized
let generationId = '';           // Unique identifier for this generation session
let outputDirectory = null;      // Directory for saving generated images

// Playful loading messages inspired by the original CLI
const thinkingMessages = [
  '🤔 Pondering the perfect pixels...',
  '🎨 Mixing digital paint on the canvas...',
  '🧠 Consulting the AI muses...',
  '✨ Weaving dreams into reality...',
  '🔮 Channeling creative energy...',
  '🎭 Staging the visual narrative...',
  '🌈 Blending colors in hyperspace...',
  '🚀 Launching imagination rockets...',
  '💫 Stardust and algorithms colliding...',
  '🎪 The AI circus is in full swing...'
];

const generatingMessages = [
  '⚡ Electrons are dancing...',
  '🔥 Neural networks are sparking...',
  '💎 Crystallizing your vision...',
  '🌊 Riding the wave of creativity...',
  '🎵 Composing visual symphonies...',
  '🏗️ Architecting pixel masterpieces...',
  '🌸 Blooming digital artwork...',
  '🎯 Aiming for aesthetic perfection...',
  '🦋 Metamorphosis in progress...',
  '🎨 The brush strokes are coming alive...'
];

const optimizingMessages = [
  '🎨 Converting words into visual concepts...',
  '🖌️ Sketching the perfect composition...',
  '📐 Calculating optimal visual elements...',
  '🎭 Staging your creative vision...',
  '🔄 Translating text to image blueprint...',
  '⚡ Inference engines are processing...',
  '🖼️ Compositing the perfect scene...',
  '🎪 Orchestrating visual storytelling...',
  '🌈 Blending colors and concepts...',
  '🔍 Analyzing prompt for visual clarity...',
  '🧩 Assembling artistic elements...',
  '🎯 Fine-tuning visual parameters...',
  '🌟 Illuminating creative possibilities...',
  '🎬 Directing the visual narrative...',
  '✨ Transforming ideas into imagery...',
  '🎨 Painting with digital brushstrokes...',
  '🧠 Neural networks are dreaming...',
  '🔮 Materializing your imagination...',
  '🎭 Choreographing visual poetry...',
  '🌊 Flowing through creative dimensions...',
  '🎪 Juggling artistic possibilities...',
  '🔥 Igniting creative sparks...',
  '🌙 Crafting moonlit masterpieces...',
  '🎵 Harmonizing visual symphony...',
  '🦋 Metamorphosing concepts to art...',
  '🌺 Blooming creative visions...',
  '🗿 Sculpting digital narratives...',
  '🎨 Mixing palette of possibilities...',
  '🔬 Experimenting with visual chemistry...',
  '🎪 Spinning artistic alchemy...',
  '🌌 Weaving cosmic inspirations...',
  '🎭 Masking reality with dreams...',
  '🔥 Forging artistic brilliance...',
  '🌟 Constellation of creative ideas...',
  '🎨 Brushing strokes of genius...',
  '🌊 Surfing waves of inspiration...',
  '🎪 Balancing artistic elements...',
  '🔮 Crystallizing visual thoughts...',
  '🎭 Revealing hidden aesthetics...',
  '🌸 Cultivating digital gardens...',
  '🎨 Architecting visual stories...',
  '🔥 Kindling creative flames...',
  '🌙 Moonbeam pixel arrangements...',
  '🎪 Circus of creative algorithms...',
  '🌈 Refracting light into art...',
  '🎭 Theatre of digital dreams...',
  '🔮 Gazing into artistic futures...',
  '🌺 Petals of visual poetry...',
  '🎨 Canvas of infinite possibilities...',
  '⚗️ Brewing artistic potions...',
  '🌟 Stardust composition magic...',
  '🎪 Ringmaster of visual circus...',
  '🔥 Phoenix of creative rebirth...',
  '🌊 Tidal waves of inspiration...',
  '🎭 Masks of artistic expression...',
  '🌙 Lunar eclipse of creativity...',
  '🎨 Palette knife precision...',
  '🔮 Crystal ball revelations...',
  '🌺 Garden of visual delights...',
  '🎪 Acrobatic artistic maneuvers...',
  '🌟 Galactic art laboratories...',
  '🔥 Forge of digital artisans...',
  '🌊 Ocean depths of creativity...',
  '🎭 Theatrical visual arrangements...',
  '🌙 Crescent moon compositions...',
  '🎨 Artistic DNA sequencing...',
  '🔮 Mystical creative synthesis...',
  '🌺 Blooming pixel gardens...',
  '🎪 Carnival of visual wonders...',
  '🌟 Shooting star inspirations...',
  '🔥 Volcanic creative eruptions...',
  '🌊 Whirlpool of artistic energy...',
  '🎭 Masquerade of visual beauty...',
  '🌙 Midnight artistic sessions...',
  '🎨 Fresco of digital dreams...',
  '🔮 Oracle of creative wisdom...',
  '🌺 Orchid arrangements in pixels...',
  '🎪 Trapeze artists of creativity...',
  '🌟 Nebula of artistic birth...',
  '🔥 Ember glow of inspiration...',
  '🌊 Tsunami of visual impact...',
  '🎭 Ballet of artistic grace...',
  '🌙 Eclipse shadows and highlights...',
  '🎨 Mosaic of creative fragments...',
  '🔮 Prism refracting pure art...',
  '🌺 Lotus blooms in digital ponds...',
  '🎪 Juggling spheres of beauty...',
  '🌟 Cosmic dust artistic formation...',
  '🔥 Blazing trails of creativity...',
  '🌊 Ripples across artistic waters...',
  '🎭 Opera of visual storytelling...',
  '🌙 Twilight artistic revelations...',
  '🎨 Watercolor wisdom flowing...',
  '🔮 Enchanted artistic realms...',
  '🌺 Sakura petals of inspiration...',
  '🎪 Tightrope walking creativity...',
  '🌟 Aurora borealis of art...',
  '🔥 Campfire stories in pixels...',
  '🌊 Lighthouse beams of vision...',
  '🎭 Symphony of visual harmony...',
  '🌙 Lunar tides of creativity...',
  '🎨 Sculpture garden of ideas...',
  '🔮 Kaleidoscope of possibilities...',
  '🌺 Zen garden of visual peace...',
  '🎪 Magic show of artistic tricks...',
  '🌟 Constellation map drawing...',
  '🔥 Hearth warming creative souls...',
  '🌊 Pearl diving for art gems...'
];

const getRandomMessage = (messages) => {
  return messages[Math.floor(Math.random() * messages.length)];
};

// Enhanced spinner with playful animations
const createPlayfulSpinner = (message, messageArray = thinkingMessages) => {
  const spinner = ora({
    text: message,
    spinner: {
      interval: 120,
      frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    }
  });

  let messageIndex = 0;
  const messageInterval = setInterval(() => {
    spinner.text = getRandomMessage(messageArray);
    messageIndex++;
  }, 2500);

  const originalStop = spinner.stop.bind(spinner);
  spinner.stop = () => {
    clearInterval(messageInterval);
    originalStop();
  };

  const originalSucceed = spinner.succeed.bind(spinner);
  spinner.succeed = (text) => {
    clearInterval(messageInterval);
    return originalSucceed(text);
  };

  const originalFail = spinner.fail.bind(spinner);
  spinner.fail = (text) => {
    clearInterval(messageInterval);
    return originalFail(text);
  };

  return spinner;
};

// Utility functions
const displayWelcome = () => {
  console.log(boxen(
    chalk.bold.cyan('🎨 FAL AI Models CLI\n') +
    chalk.white('Generate images and videos with FAL AI models\n') +
    chalk.gray('OpenAPI compatible, batch processing supported'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan'
    }
  ));
};

const displayError = (message) => {
  console.log(chalk.red.bold('✗ ERROR:'), chalk.red(message));
};

const displaySuccess = (message) => {
  console.log(chalk.green.bold('✓ SUCCESS:'), chalk.green(message));
};

const displayInfo = (message) => {
  console.log(chalk.blue.bold('ℹ INFO:'), chalk.cyan(message));
};

const createSpinner = (message) => {
  return ora({
    text: message,
    spinner: 'dots',
    color: 'cyan'
  });
};

// Step 1: Authentication
const authenticateUser = async () => {
  // Simple priority: environment variable, .env file, secure storage (optional)

  // 1. Check environment variable first
  if (process.env.FAL_KEY) {
    FAL_KEY = process.env.FAL_KEY;
    return;
  }

  // 2. Check secure storage (silently, no errors)
  try {
    const storedKey = await retrieveApiKey();
    if (storedKey) {
      FAL_KEY = storedKey;
      return;
    }
  } catch (error) {
    // Silently continue
  }

  // No API key found - simple error message
  displayError('FAL API key not found!');
  displayInfo('Set your FAL API key:');
  console.log(chalk.yellow('  export FAL_KEY="your_key_here"'));
  console.log(chalk.yellow('  or: echo "FAL_KEY=your_key_here" > .env'));
  console.log(chalk.yellow('  or: fal-cli config --set-key your_key'));
  process.exit(1);
};

// Helper function to prompt and store API key securely
const promptAndStoreApiKey = async () => {
  const { inputApiKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'inputApiKey',
      message: 'Enter your FAL API key:',
      validate: (input) => {
        if (!input || input.trim() === '') {
          return 'API key is required';
        }
        if (!validateApiKey(input.trim())) {
          return 'Invalid API key format. Expected format: uuid:hex_string';
        }
        return true;
      }
    }
  ]);

  const key = inputApiKey.trim();

  try {
    await storeApiKey(key);
    apiKey = key;
    fal.config({ credentials: apiKey });
    displaySuccess('✅ API key stored securely!');
    displayInfo(`📁 Stored in: ${getConfigPath()}`);
  } catch (error) {
    displayError(`Failed to store API key: ${error.message}`);
    process.exit(1);
  }
};

// Step 2: Model Selection
const selectModels = async () => {
  const models = await getAllModels();

  console.log('\n' + chalk.cyan.bold('📋 Available Models:'));

  // Group models by category for better display
  const categories = {};
  models.forEach(model => {
    if (!categories[model.category]) {
      categories[model.category] = [];
    }
    categories[model.category].push(model);
  });

  // Display models grouped by category
  Object.entries(categories).forEach(([category, categoryModels]) => {
    console.log(chalk.blue.bold(`\n🏷️  ${category}:`));
    categoryModels.forEach((model, index) => {
      const globalIndex = models.findIndex(m => m.key === model.key);
      console.log(chalk.green(`  ${globalIndex + 1}. ${model.name}`));
      console.log(chalk.gray(`     ${model.description}`));
      console.log(chalk.yellow(`     Cost: $${model.costPerImage}/image | Max: ${model.maxImages} images`));
    });
  });

  const { modelIndices } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'modelIndices',
      message: 'Select models (use SPACE to select, ENTER to confirm):',
      choices: models.map((model, index) => ({
        name: `${model.name} - ${model.category} ($${model.costPerImage}/img)`,
        value: index,
        checked: false
      })),
      validate: (input) => {
        if (input.length === 0) {
          return 'Please select at least one model';
        }
        return true;
      }
    }
  ]);

  selectedModels = modelIndices.map(index => models[index]);

  displaySuccess(`Selected ${selectedModels.length} model(s):`);
  selectedModels.forEach(model => {
    console.log(chalk.green(`  • ${model.name} (${model.category})`));
  });
};

// Step 3: Batch vs Single Mode
const selectMode = async () => {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Choose generation mode:',
      choices: [
        { name: '📝 Single - Enter prompt manually', value: 'single' },
        { name: '📁 Batch - Process multiple prompts from file', value: 'batch' }
      ]
    }
  ]);

  isBatchMode = mode === 'batch';

  if (isBatchMode) {
    displayInfo('Batch mode selected. Please ensure /batch/prompts.txt exists');
    displayInfo('All selected models are text-to-image, so only prompts are needed.');
  }
};

// Step 4: Load Batch Data
const loadBatchData = async () => {
  if (!isBatchMode) return;

  const batchDir = path.join(process.cwd(), 'batch');
  const promptsFile = path.join(batchDir, 'prompts.txt');

  try {
    // Check if batch directory exists
    if (!await fs.pathExists(batchDir)) {
      throw new Error('/batch directory not found');
    }

    // Load prompts
    if (!await fs.pathExists(promptsFile)) {
      throw new Error('/batch/prompts.txt not found');
    }

    const promptsContent = await fs.readFile(promptsFile, 'utf-8');
    batchData.prompts = promptsContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (batchData.prompts.length === 0) {
      throw new Error('No prompts found in prompts.txt');
    }

    displaySuccess(`Loaded ${batchData.prompts.length} prompts from batch file`);
    displayInfo('Ready for text-to-image generation with batch prompts');

  } catch (error) {
    displayError(error.message);
    process.exit(1);
  }
};

// Step 5: Single Mode Input
const getSingleInput = async () => {
  if (isBatchMode) return;

  // Get prompt
  const { prompt } = await inquirer.prompt([
    {
      type: 'input',
      name: 'prompt',
      message: 'Enter your prompt:',
      validate: (input) => {
        if (!input || input.trim() === '') {
          return 'Prompt is required';
        }
        return true;
      }
    }
  ]);

  userPrompt = prompt.trim();
  displaySuccess(`Prompt set: "${userPrompt}"`);
};

// Step 6: Prompt Optimization
const optimizePrompt = async () => {
  if (isBatchMode) {
    // For batch mode, ask once if all prompts should be optimized
    const { wantsOptimize } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'wantsOptimize',
        message: 'Do you want to optimize all batch prompts using AI?',
        default: false
      }
    ]);

    if (!wantsOptimize) {
      displayInfo('Using original batch prompts without optimization');
      return;
    }

    displayInfo('\n📝 Optimizing batch prompts...');

    // Optimize each prompt in the batch
    const optimizedPrompts = [];

    for (let i = 0; i < batchData.prompts.length; i++) {
      const originalPrompt = batchData.prompts[i];
      displayInfo(`\nOptimizing prompt ${i + 1}/${batchData.prompts.length}: "${originalPrompt.slice(0, 50)}..."`);

      try {
        const optimizedPrompt = await optimizeSinglePrompt(originalPrompt, selectedModels[0]);
        optimizedPrompts.push(optimizedPrompt);
        displaySuccess(`✓ Optimized: "${optimizedPrompt.slice(0, 50)}..."`);
      } catch (error) {
        displayError(`Failed to optimize prompt ${i + 1}: ${error.message}`);
        displayInfo(`Using original: "${originalPrompt.slice(0, 50)}..."`);
        optimizedPrompts.push(originalPrompt);
      }
    }

    // Update batch data with optimized prompts
    batchData.prompts = optimizedPrompts;
    displaySuccess(`\n✅ Batch optimization complete! ${optimizedPrompts.length} prompts processed.`);

  } else {
    // Single mode optimization
    const { wantsOptimize } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'wantsOptimize',
        message: 'Do you want to optimize your prompt using AI?',
        default: false
      }
    ]);

    if (!wantsOptimize) {
      displayInfo('Using original prompt without optimization');
      return;
    }

    displayInfo('\n📝 Optimizing your prompt...');

    try {
      const optimizedPrompt = await optimizeSinglePrompt(userPrompt, selectedModels[0]);

      // Show comparison
      console.log('\n' + boxen(
        `${chalk.yellow('Original:')}\n${userPrompt}\n\n${chalk.green('Optimized:')}\n${optimizedPrompt}`,
        { padding: 1, borderColor: 'blue', title: 'Prompt Comparison' }
      ));

      const { useOptimized } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'useOptimized',
          message: 'Use the optimized prompt?',
          default: true
        }
      ]);

      if (useOptimized) {
        userPrompt = optimizedPrompt;
        displaySuccess('✅ Using optimized prompt for generation');
      } else {
        displayInfo('Using original prompt');
      }

    } catch (error) {
      displayError(`Failed to optimize prompt: ${error.message}`);
      displayInfo('Using original prompt');
    }
  }
};

// Helper function to optimize a single prompt
const optimizeSinglePrompt = async (prompt, model) => {
  const spinner = createPlayfulSpinner(
    `✨ Optimizing "${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}"`,
    optimizingMessages
  );

  spinner.start();

  try {
    // Use the selected model's actual optimization system prompt
    const systemPrompt = model.optimization_system_prompt ||
      `You are an expert prompt engineer. Optimize the following prompt for AI image generation to be more detailed, specific, and likely to produce high-quality results. Focus on visual details, artistic style, composition, and technical aspects that work well with ${model.name || 'this AI model'}.`;

    const result = await fal.subscribe('fal-ai/any-llm', {
      input: {
        prompt: prompt,
        system_prompt: systemPrompt,
        max_tokens: 500
      },
      credentials: FAL_KEY,
      logs: false
    });

    spinner.succeed('🎉 Prompt optimization complete!');

    // Extract the optimized prompt from the response
    let optimizedPrompt = '';
    if (result.data && result.data.output) {
      optimizedPrompt = result.data.output.trim();
    } else if (result.output) {
      optimizedPrompt = result.output.trim();
    } else {
      throw new Error('Unexpected LLM response format');
    }

    // Ensure we got a valid response
    if (!optimizedPrompt || optimizedPrompt.length < 10) {
      throw new Error('LLM returned an invalid or too short optimized prompt');
    }

    return optimizedPrompt;

  } catch (error) {
    spinner.fail('❌ Optimization failed');
    throw error;
  }
};

// Step 7: Parameter Configuration
const configureParameters = async () => {
  const { wantsConfigure } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'wantsConfigure',
      message: 'Do you want to configure model parameters?',
      default: false
    }
  ]);

  if (!wantsConfigure) {
    displayInfo('Using default parameters');
    return;
  }

  // Get shared parameters for multi-model selection
  const sharedParams = getSharedParameters(selectedModels);

  if (Object.keys(sharedParams).length === 0) {
    displayInfo('No shared parameters found between selected models. Using defaults.');
    return;
  }

  console.log(chalk.cyan.bold('\n⚙️  Configuring Parameters:'));
  console.log(chalk.gray('Only parameters common to all selected models are shown.\n'));

  for (const [paramName, paramConfig] of Object.entries(sharedParams)) {
    if (paramName === 'prompt' || paramName === 'image_url') continue; // Skip these, handled separately

    let paramValue;

    if (paramConfig.options) {
      // Choice parameter
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: `${paramName}:`,
          choices: paramConfig.options.map(option => ({ name: option, value: option })),
          default: paramConfig.default
        }
      ]);
      paramValue = choice;
    } else if (paramConfig.type === 'integer') {
      // Integer parameter
      const { value } = await inquirer.prompt([
        {
          type: 'number',
          name: 'value',
          message: `${paramName} (${paramConfig.min || 'min'} - ${paramConfig.max || 'max'}):`,
          default: paramConfig.default,
          validate: (input) => {
            const num = parseInt(input);
            if (isNaN(num)) return 'Please enter a valid number';
            if (paramConfig.min && num < paramConfig.min) return `Minimum value is ${paramConfig.min}`;
            if (paramConfig.max && num > paramConfig.max) return `Maximum value is ${paramConfig.max}`;
            return true;
          }
        }
      ]);
      paramValue = parseInt(value);
    } else if (paramConfig.type === 'float') {
      // Float parameter
      const { value } = await inquirer.prompt([
        {
          type: 'number',
          name: 'value',
          message: `${paramName} (${paramConfig.min || 'min'} - ${paramConfig.max || 'max'}):`,
          default: paramConfig.default,
          validate: (input) => {
            const num = parseFloat(input);
            if (isNaN(num)) return 'Please enter a valid number';
            if (paramConfig.min && num < paramConfig.min) return `Minimum value is ${paramConfig.min}`;
            if (paramConfig.max && num > paramConfig.max) return `Maximum value is ${paramConfig.max}`;
            return true;
          }
        }
      ]);
      paramValue = parseFloat(value);
    }

    if (paramValue !== undefined) {
      parameters[paramName] = paramValue;
    }
  }

  if (Object.keys(parameters).length > 0) {
    displaySuccess('Parameters configured:');
    Object.entries(parameters).forEach(([key, value]) => {
      console.log(chalk.green(`  • ${key}: ${value}`));
    });
  }
};

// Step 8: Image Count Selection (Iterations)
const selectImageCount = async () => {
  console.log('\n' + chalk.cyan.bold('🖼️  Image Generation Settings:'));
  console.log(chalk.gray('There are two different image count settings:'));
  console.log(chalk.yellow('  1. Model Parameter (num_images): Images per API call (set in parameters, max 4)'));
  console.log(chalk.yellow('  2. Iterations: How many times to run the model with these settings'));
  console.log(chalk.gray('\nTotal images = num_images × iterations'));

  if (parameters.num_images) {
    console.log(chalk.green(`\nYour model parameter setting: ${parameters.num_images} images per API call`));
  } else {
    console.log(chalk.yellow('\nModel parameter num_images not set, will default to 1 image per API call'));
  }

  const { iterationCount } = await inquirer.prompt([
    {
      type: 'number',
      name: 'iterationCount',
      message: 'How many iterations (API calls) to run?',
      default: 1,
      validate: (input) => {
        const num = parseInt(input);
        if (isNaN(num) || num < 1) return 'Please enter a number >= 1';
        if (num > 50) return 'Maximum 50 iterations for safety';
        return true;
      }
    }
  ]);

  imagesPerModel = parseInt(iterationCount);

  const imagesPerCall = parameters.num_images || 1;
  const totalImagesPerModel = imagesPerCall * imagesPerModel;

  console.log(chalk.green.bold(`\n📊 Generation Summary:`));
  console.log(chalk.cyan(`  • Images per API call: ${imagesPerCall}`));
  console.log(chalk.cyan(`  • Number of iterations: ${imagesPerModel}`));
  console.log(chalk.cyan(`  • Total images per model: ${totalImagesPerModel}`));
  console.log(chalk.cyan(`  • Total images (all models): ${totalImagesPerModel * selectedModels.length}`));
};

// Step 9: Batch Size Selection
const selectBatchSize = async () => {
  const totalGenerations = isBatchMode ?
    batchData.prompts.length * selectedModels.length :
    selectedModels.length;

  const maxBatchSize = Math.min(10, totalGenerations);

  if (totalGenerations > 1) {
    const { batchSizeInput } = await inquirer.prompt([
      {
        type: 'number',
        name: 'batchSizeInput',
        message: `Batch size for concurrent requests? (max ${maxBatchSize}):`,
        default: Math.min(3, maxBatchSize),
        validate: (input) => {
          const num = parseInt(input);
          if (isNaN(num) || num < 1) return 'Please enter a number >= 1';
          if (num > maxBatchSize) return `Maximum ${maxBatchSize} concurrent requests`;
          return true;
        }
      }
    ]);

    batchSize = parseInt(batchSizeInput);
  }
};

// Step 10: Output Directory Selection
const selectOutputDirectory = async () => {
  if (!outputDirectory) {
    const { useCustomDir } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useCustomDir',
        message: 'Use custom output directory?',
        default: false
      }
    ]);

    if (useCustomDir) {
      const { customDir } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customDir',
          message: 'Enter output directory path:',
          default: './generated-images',
          validate: (input) => {
            if (!input.trim()) return 'Please enter a directory path';
            return true;
          }
        }
      ]);
      outputDirectory = path.resolve(customDir);
    } else {
      // Use current working directory
      outputDirectory = path.join(process.cwd(), 'generated-images');
    }
  }

  console.log(chalk.green(`\n📁 Output directory: ${outputDirectory}`));
};

// Step 11: Cost and Confirmation
const showCostEstimate = async () => {
  const modelImages = isBatchMode ?
    batchData.prompts.length * imagesPerModel * (parameters.num_images || 1) :
    imagesPerModel * (parameters.num_images || 1);

  const totalCost = selectedModels.reduce((sum, model) => {
    return sum + (model.costPerImage * modelImages);
  }, 0);

  console.log('\n' + chalk.cyan.bold('💰 Cost Estimate:'));
  selectedModels.forEach(model => {
    const modelCost = model.costPerImage * modelImages;
    console.log(chalk.yellow(`  • ${model.name}: $${modelCost.toFixed(4)} (${modelImages} images × $${model.costPerImage})`));
  });
  console.log(chalk.green.bold(`\n  Total Cost: $${totalCost.toFixed(4)}`));

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Proceed with generation?',
      default: true
    }
  ]);

  if (!confirmed) {
    displayInfo('Generation cancelled');
    process.exit(0);
  }
};

// Step 12: Generation
const generateImages = async () => {
  const startTime = Date.now();
  const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  console.log(chalk.cyan.bold(`\n🎨 Starting generation (ID: ${generationId})`));

  const outputDir = path.join(outputDirectory, generationId);
  await fs.ensureDir(outputDir);

  const results = [];
  const tasks = [];

  // Prepare generation tasks
  if (isBatchMode) {
    batchData.prompts.forEach((prompt, promptIndex) => {
      selectedModels.forEach(model => {
        for (let imageIndex = 0; imageIndex < imagesPerModel; imageIndex++) {
          tasks.push({
            model,
            prompt,
            promptIndex: promptIndex + 1,
            imageIndex: imageIndex + 1
          });
        }
      });
    });
  } else {
    selectedModels.forEach(model => {
      for (let imageIndex = 0; imageIndex < imagesPerModel; imageIndex++) {
        tasks.push({
          model,
          prompt: userPrompt,
          promptIndex: 1,
          imageIndex: imageIndex + 1
        });
      }
    });
  }

  // Process tasks in batches
  const totalTasks = tasks.length;
  let completedTasks = 0;

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);

    console.log(chalk.blue(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tasks.length / batchSize)}`));

    const batchPromises = batch.map(async (task) => {
      try {
        const result = await generateSingleImage(task, outputDir, generationId);
        completedTasks++;
        console.log(chalk.green(`✓ Completed ${completedTasks}/${totalTasks} tasks`));
        return result;
      } catch (error) {
        completedTasks++;
        console.log(chalk.red(`✗ Failed ${completedTasks}/${totalTasks} tasks: ${error.message}`));
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(result => result !== null));
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  // Count total images from all successful tasks
  const totalImagesGenerated = results
    .filter(result => result && result.images)
    .reduce((sum, result) => sum + result.images.length, 0);

  displaySuccess(`Generation completed in ${duration}s`);
  displayInfo(`Generated ${totalImagesGenerated} images`);
  displayInfo(`Completed ${results.length} tasks`);
  displayInfo(`Output directory: ${outputDir}`);

  // Display FAL URLs with browser opening option
  await displayFalUrls(results);

  return results;
};

const generateSingleImage = async (task, outputDir, generationId) => {
  const { model, prompt, promptIndex, imageIndex } = task;
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  // Validate model object
  if (!model || !model.id || !model.name) {
    throw new Error(`Invalid model object: ${JSON.stringify(model)}`);
  }

  // Create playful spinner for this generation
  const spinner = createPlayfulSpinner(
    `🎨 Creating with ${model.name}...`,
    generatingMessages
  );

  spinner.start();

  try {
    // Prepare request parameters
    const requestParams = {
      prompt: prompt,
      ...parameters
    };

    const result = await fal.subscribe(model.id, {
      input: requestParams,
      logs: false,
      credentials: FAL_KEY,
      onQueueUpdate: (update) => {
        try {
          if (update.status === 'IN_QUEUE') {
            const position = update.queue_position || 0;
            spinner.text = `⏳ Waiting in creative queue (position: ${position})...`;
          } else if (update.status === 'IN_PROGRESS') {
            spinner.text = getRandomMessage(generatingMessages);
          }
        } catch (e) {
          // Ignore queue update errors
        }
      }
    });

    // Handle different response formats
    let images = [];
    if (result.data && result.data.images && Array.isArray(result.data.images)) {
      images = result.data.images;
    } else if (result.images && Array.isArray(result.images)) {
      images = result.images;
    } else if (result.image) {
      images = [result.image];
    } else if (result.data && result.data.image) {
      images = [result.data.image];
    } else if (result.output && result.output.images) {
      images = result.output.images;
    } else {
      throw new Error('Unexpected API response format');
    }

    spinner.text = `💾 Saving ${images.length} masterpiece${images.length > 1 ? 's' : ''}...`;

    const savedImages = [];
    const falUrls = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      const imageUrl = image.url || image.image_url;
      if (!imageUrl) {
        continue;
      }

      // Store FAL URL for later display
      falUrls.push(imageUrl);

      // Generate unique filename to avoid overwrites
      const filename = `${model.key}_prompt${promptIndex}_iter${imageIndex}_img${i + 1}_${timestamp}_${randomSuffix}.png`;
      const imagePath = path.join(outputDir, filename);

      // Download and save image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      await fs.writeFile(imagePath, Buffer.from(buffer));
      savedImages.push(imagePath);
    }

    spinner.succeed(`✨ Generated ${savedImages.length} image${savedImages.length > 1 ? 's' : ''} with ${model.name}`);

    return {
      model: model.name,
      prompt,
      images: savedImages,
      falUrls: falUrls,
      success: true
    };

  } catch (error) {
    spinner.fail(`Failed to generate with ${model.name}: ${error.message}`);
    throw error;
  }
};

const downloadImage = async (url, filepath) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  await fs.writeFile(filepath, Buffer.from(buffer));
};

// Display FAL URLs with browser opening option
const displayFalUrls = async (results) => {
  const allUrls = [];

  console.log('\n' + chalk.cyan.bold('🔗 FAL Image URLs:'));

  results.forEach((result, resultIndex) => {
    if (result && result.falUrls && result.falUrls.length > 0) {
      console.log(chalk.yellow(`\n📸 ${result.model}:`));
      result.falUrls.forEach((url, urlIndex) => {
        console.log(chalk.blue(`  ${resultIndex + 1}.${urlIndex + 1} ${url}`));
        allUrls.push(url);
      });
    }
  });

  if (allUrls.length > 0) {
    console.log(chalk.gray('\n💡 Tip: You can copy these URLs to view images in your browser'));

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🌐 Open all images in browser', value: 'open_all' },
          { name: '🖼️  Open specific image', value: 'open_specific' },
          { name: '📋 Copy URLs to clipboard', value: 'copy' },
          { name: '✅ Continue', value: 'continue' }
        ],
        default: 'continue'
      }
    ]);

    if (action === 'open_all') {
      console.log(chalk.blue('\n🌐 Opening all images in browser...'));
      for (const url of allUrls) {
        try {
          await open(url);
          await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between opens
        } catch (error) {
          console.log(chalk.red(`Failed to open: ${url}`));
        }
      }
      console.log(chalk.green('✅ All images opened in browser'));
    } else if (action === 'open_specific') {
      const choices = allUrls.map((url, index) => ({
        name: `Image ${index + 1}: ${url.substring(0, 60)}...`,
        value: url
      }));

      const { selectedUrl } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedUrl',
          message: 'Select image to open:',
          choices: choices
        }
      ]);

      try {
        await open(selectedUrl);
        console.log(chalk.green('✅ Image opened in browser'));
      } catch (error) {
        console.log(chalk.red('Failed to open image in browser'));
      }
    } else if (action === 'copy') {
      console.log(chalk.blue('\n📋 URLs (copy manually):'));
      allUrls.forEach((url, index) => {
        console.log(chalk.white(`${index + 1}. ${url}`));
      });
    }
  }
};

// Interactive post-generation menu
const showPostGenerationMenu = async () => {
  while (true) {
    console.log('\n' + '═'.repeat(60));
    displaySuccess('🎉 Generation completed successfully!');
    console.log('═'.repeat(60));

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do next?',
        choices: [
          { name: '🎨 Generate more images', value: 'generate_more' },
          { name: '📝 Try different prompt', value: 'new_prompt' },
          { name: '🔄 Use different model', value: 'change_model' },
          { name: '⚙️  Change settings', value: 'settings' },
          { name: '📋 View models list', value: 'list_models' },
          { name: '🔧 Configuration', value: 'config' },
          { name: '🚪 Exit CLI', value: 'exit' }
        ],
        default: 'generate_more'
      }
    ]);

    try {
      switch (action) {
        case 'generate_more':
          console.log(chalk.cyan('\n🎨 Generating more with same settings...'));
          await generateImages();
          break;

        case 'new_prompt':
          console.log(chalk.cyan('\n📝 Enter new prompt...'));
          const { prompt } = await inquirer.prompt([
            {
              type: 'input',
              name: 'prompt',
              message: 'Enter your prompt:',
              validate: (input) => {
                if (!input || input.trim() === '') {
                  return 'Prompt is required';
                }
                return true;
              }
            }
          ]);
          userPrompt = prompt;
          displaySuccess(`Prompt set: "${userPrompt}"`);

          // Ask for optimization
          const { optimize } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'optimize',
              message: 'Do you want to optimize your prompt using AI?',
              default: false
            }
          ]);

          if (optimize && selectedModels.length > 0 && selectedModels[0].optimization_system_prompt) {
            await optimizePrompt();
          }
          await generateImages();
          break;

        case 'change_model':
          console.log(chalk.cyan('\n🔄 Select new model...'));
          await selectModels();
          await configureParameters();
          await generateImages();
          break;

        case 'settings':
          console.log(chalk.cyan('\n⚙️ Adjusting settings...'));
          await configureParameters();
          await selectImageCount();
          await selectOutputDirectory();
          await showCostEstimate();
          await generateImages();
          break;

        case 'list_models':
          await listModels({});
          break;

        case 'config':
          console.log(chalk.cyan('\n🔧 Opening configuration...'));
          console.log(chalk.yellow('Tip: Use "fal-cli config" command for full config options'));
          const { configAction } = await inquirer.prompt([
            {
              type: 'list',
              name: 'configAction',
              message: 'Configuration options:',
              choices: [
                { name: '📋 Show current config', value: 'show' },
                { name: '🔐 Manage API key', value: 'key' },
                { name: '🔙 Back to main menu', value: 'back' }
              ]
            }
          ]);

          if (configAction === 'show') {
            await showConfig();
          } else if (configAction === 'key') {
            console.log(chalk.blue('Use: fal-cli config --set-key your_key'));
          }
          break;

        case 'exit':
          console.log('\n' + boxen(
            chalk.cyan.bold('👋 Thanks for using FAL CLI!\n') +
            chalk.gray('Generate amazing AI art anytime with: ') +
            chalk.yellow('fal-cli generate'),
            {
              padding: 1,
              margin: 1,
              borderStyle: 'round',
              borderColor: 'cyan'
            }
          ));
          process.exit(0);

        default:
          console.log(chalk.red('Unknown action'));
      }
    } catch (error) {
      displayError(`Action failed: ${error.message}`);
      console.log(chalk.yellow('Returning to main menu...'));
    }
  }
};

// Main CLI flow
const runCLI = async () => {
  try {
    displayWelcome();

    // Step 1: Authentication
    await authenticateUser();

    // Step 2: Model Selection
    await selectModels();

    // Step 3: Mode Selection
    await selectMode();

    // Step 4: Load Batch Data (if needed)
    await loadBatchData();

    // Step 5: Single Input (if needed)
    await getSingleInput();

    // Step 6: Prompt Optimization
    await optimizePrompt();

    // Step 7: Parameter Configuration
    await configureParameters();

    // Step 8: Image Count
    await selectImageCount();

    // Step 9: Batch Size
    await selectBatchSize();

    // Step 10: Output Directory
    await selectOutputDirectory();

    // Step 11: Cost and Confirmation
    await showCostEstimate();

    // Step 12: Generation
    await generateImages();

    // Step 13: Interactive post-generation menu
    await showPostGenerationMenu();

  } catch (error) {
    displayError(`CLI failed: ${error.message}`);
    process.exit(1);
  }
};

// Additional command implementations

// Direct generation function for CLI commands
const runDirectGeneration = async (options) => {
  displayWelcome();

  // Set global state from options
  userPrompt = options.prompt;

  // Load and validate model
  const models = await getAllModels();
  const model = await getModelById(options.model);
  if (!model) {
    throw new Error(`Model '${options.model}' not found`);
  }
  selectedModels = [{ key: options.model, ...model }];

  // Authenticate
  await authenticateUser();

  // Optimize prompt if requested
  if (options.optimize !== false) {
    await optimizePrompt();
  }

  // Use default parameters
  parameters = model.defaultParams || {};

  // Set default image count
  imagesPerModel = 1;

  // Set output directory
  outputDirectory = path.resolve(options.output);

  // Generate
  await generateImages();
};

// List models command
const listModels = async (options) => {
  const models = await getAllModels();

  if (options.json) {
    console.log(JSON.stringify(models, null, 2));
    return;
  }

  console.log(chalk.cyan.bold('\n📋 Available AI Models\n'));

  const categories = {};
  Object.entries(models).forEach(([key, model]) => {
    if (!categories[model.category]) {
      categories[model.category] = [];
    }
    categories[model.category].push({ key, ...model });
  });

  Object.entries(categories).forEach(([category, modelList]) => {
    if (options.category && category !== options.category) return;

    console.log(chalk.yellow.bold(`🏷️  ${category}:`));
    modelList.forEach((model, index) => {
      console.log(`  ${index + 1}. ${chalk.white.bold(model.name)}`);
      console.log(`     ${chalk.gray(model.description)}`);
      console.log(`     ${chalk.green(`Cost: $${model.costPerImage}/image`)} | ${chalk.blue(`Max: ${model.maxImages} images`)}`);
    });
    console.log('');
  });
};

// Configure settings command
const configureSettings = async (options) => {
  if (options.setKey) {
    try {
      if (!validateApiKey(options.setKey)) {
        displayError('Invalid API key format. Expected format: uuid:hex_string');
        return;
      }

      await storeApiKey(options.setKey);
      displaySuccess('✅ FAL API key stored securely!');
      displayInfo(`📁 Stored in: ${getConfigPath()}`);
      displayInfo('🔐 Key is encrypted and safe from other applications');
    } catch (error) {
      displayError(`Failed to store API key: ${error.message}`);
    }
    return;
  }

  if (options.show) {
    console.log(chalk.cyan.bold('\n⚙️  Current Configuration\n'));

    // Check all possible API key sources
    const envKey = process.env.FAL_KEY;
    const hasSecureKey = await hasStoredApiKey();
    const configPath = getConfigPath();

    console.log(chalk.gray('API Key Sources:'));
    console.log(`  ${chalk.gray('Environment variable:')} ${envKey ? chalk.green('✓ Set') : chalk.red('✗ Not set')}`);
    console.log(`  ${chalk.gray('Secure storage:')} ${hasSecureKey ? chalk.green('✓ Stored') : chalk.red('✗ Not stored')}`);

    if (hasSecureKey) {
      console.log(`  ${chalk.gray('Config file:')} ${chalk.blue(configPath)}`);
    }

    // Check current active key
    let activeSource = 'None';
    if (envKey) activeSource = 'Environment variable';
    else if (hasSecureKey) activeSource = 'Secure storage';

    console.log(`  ${chalk.gray('Active source:')} ${activeSource !== 'None' ? chalk.green(activeSource) : chalk.red(activeSource)}`);

    // Show model information
    const models = await getAllModels();
    console.log(`\n${chalk.gray('Available models:')} ${chalk.blue(models.length)}`);

    console.log('\n' + chalk.gray('💡 Priority order: Environment variable > Secure storage > .env file'));
    console.log('');
    return;
  }

  // Interactive configuration
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to configure?',
      choices: [
        { name: '🔐 Set FAL API key (secure storage)', value: 'setKey' },
        { name: '📋 View current settings', value: 'show' },
        { name: '🗑️  Remove stored API key', value: 'remove' },
        { name: '✅ Test API connection', value: 'test' },
        { name: '❌ Cancel', value: 'cancel' }
      ]
    }
  ]);

  if (action === 'setKey') {
    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your FAL API key:',
        validate: (input) => {
          if (!input || input.trim() === '') {
            return 'API key is required';
          }
          if (!validateApiKey(input.trim())) {
            return 'Invalid API key format. Expected format: uuid:hex_string';
          }
          return true;
        }
      }
    ]);
    await configureSettings({ setKey: apiKey.trim() });
  } else if (action === 'show') {
    await configureSettings({ show: true });
  } else if (action === 'remove') {
    try {
      await removeApiKey();
      displaySuccess('✅ API key removed from secure storage');
    } catch (error) {
      displayError(`Failed to remove API key: ${error.message}`);
    }
  } else if (action === 'test') {
    await testApiConnection();
  }
};

// Test API connection
const testApiConnection = async () => {
  try {
    // First ensure we have an API key
    await authenticateUser();

    const spinner = ora('Testing FAL API connection...').start();

    // Test with a simple model list request
    const models = await getAllModels();

    if (models && models.length > 0) {
      spinner.succeed(`✅ API connection successful! Found ${models.length} available models`);
      displayInfo('🌐 Your FAL API key is working correctly');
    } else {
      spinner.fail('❌ API connection failed - no models returned');
      displayError('API key may be invalid or FAL service may be unavailable');
    }
  } catch (error) {
    if (error.message && error.message.includes('401')) {
      displayError('❌ Invalid API key - please check your FAL API key');
    } else if (error.message && error.message.includes('network')) {
      displayError('❌ Network error - please check your internet connection');
    } else {
      displayError(`❌ API test failed: ${error.message}`);
    }
  }
};

// Optimize prompt command
const optimizePromptCommand = async (prompt, options) => {
  await authenticateUser();

  const models = await getAllModels();
  let targetModel;

  if (options.model) {
    targetModel = getModelById(options.model);
    if (!targetModel) {
      throw new Error(`Model '${options.model}' not found`);
    }
  } else {
    // Use first available model as default
    const modelKey = Object.keys(models)[0];
    targetModel = { key: modelKey, ...models[modelKey] };
  }

  console.log(chalk.cyan.bold('\n✨ Prompt Optimization\n'));
  console.log(`${chalk.gray('Original:')} ${prompt}`);
  console.log(`${chalk.gray('Target Model:')} ${targetModel.name}\n`);

  try {
    const optimizedPrompt = await optimizeSinglePrompt(prompt, targetModel);

    console.log(boxen(
      `${chalk.white.bold('Optimized Prompt:')}\n\n${chalk.green(optimizedPrompt)}`,
      {
        padding: 1,
        borderColor: 'green',
        borderStyle: 'round'
      }
    ));
  } catch (error) {
    throw new Error(`Optimization failed: ${error.message}`);
  }
};

// Commands
program
  .command('generate')
  .alias('gen')
  .description('🎨 Start interactive image generation session')
  .option('-m, --model <model>', 'Specify model ID to use')
  .option('-p, --prompt <prompt>', 'Text prompt for generation')
  .option('-b, --batch', 'Enable batch mode (requires prompts.txt)')
  .option('-o, --output <directory>', 'Output directory for generated images')
  .option('--optimize', 'Automatically optimize prompts with AI')
  .option('--no-optimize', 'Skip prompt optimization')
  .action(async (options) => {
    try {
      if (options.prompt && options.model) {
        // Direct generation mode
        await runDirectGeneration(options);
      } else {
        // Interactive mode
        await runCLI();
      }
    } catch (error) {
      displayError(`Generation failed: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('models')
  .alias('ls')
  .description('📋 List available AI models')
  .option('-c, --category <category>', 'filter by category')
  .option('--json', 'output in JSON format')
  .action(async (options) => {
    try {
      await listModels(options);
    } catch (error) {
      displayError(`Failed to list models: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('⚙️  Configure CLI settings')
  .option('--set-key <key>', 'set FAL API key')
  .option('--show', 'show current configuration')
  .action(async (options) => {
    try {
      await configureSettings(options);
    } catch (error) {
      displayError(`Configuration failed: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('optimize')
  .alias('opt')
  .description('✨ Optimize a text prompt for better generation')
  .argument('<prompt>', 'text prompt to optimize')
  .option('-m, --model <model>', 'target model for optimization')
  .action(async (prompt, options) => {
    try {
      await optimizePromptCommand(prompt, options);
    } catch (error) {
      displayError(`Optimization failed: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('version')
  .alias('v')
  .description('📦 Show version information')
  .action(() => {
    console.log(chalk.cyan.bold(`\n🎨 FAL CLI v${program.opts().version || '3.0.0'}`));
    console.log(chalk.gray('OpenAPI compatible image generation CLI'));
    console.log(chalk.gray('Built with ❤️  for the AI community\n'));
  });

// Main execution
(async () => {
  try {
    // Default action when no command is provided
    if (process.argv.length <= 2) {
      displayWelcome();
      await runCLI();
    } else {
      program.parse();
    }
  } catch (error) {
    displayError(`CLI failed: ${error.message}`);
    process.exit(1);
  }
})();
