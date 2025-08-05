# 🎨 Unofficial FAL CLI

**Professional command-line interface for FAL AI Models**

> ⚠️ **IMPORTANT**: This is an **unofficial** CLI tool for FAL AI. It is **not affiliated with, endorsed by, or officially supported by FAL**. This is a community-built tool that uses the public FAL API.

Generate high-quality images with FLUX, Imagen, Qwen Image, and more AI models through an intuitive, professional CLI experience. This tool provides a powerful command-line interface to interact with FAL's AI models for image generation, with features like prompt optimization, batch processing, and professional workflow management.

## 🚀 **Current Capabilities & Roadmap**

### **✅ Currently Implemented**
- **Text-to-Image Generation**: Full support for all text-to-image models
- **Multiple Model Support**: FLUX Pro variants, Imagen 4 Ultra, Qwen Image
- **MCP Server Integration**: Complete Model Context Protocol support
- **Prompt Optimization**: AI-powered prompt enhancement
- **Batch Processing**: Multiple prompts and models
- **Cost Management**: Spending limits and cost calculation
- **Interactive CLI**: Full command-line interface

### **🔄 Planned Features (Next Version)**
- **Image-to-Image Generation**: Support for image-to-image models
- **Text-to-Video Generation**: Support for text-to-video models
- **Image Enhancement**: Upscaling and enhancement capabilities

## 🔗 **MCP Server Support**

**This CLI includes Model Context Protocol (MCP) server support!** Connect the FAL CLI to AI assistants like Claude Desktop, Cody, Cursor, and other MCP-compatible tools for seamless AI-powered image generation.

### **🏗️ Dual Interface**
- **🖥️ Traditional CLI**: Full interactive command-line interface 
- **🔌 MCP Server**: Protocol-based integration for AI assistants
- **🔄 Shared Logic**: Both interfaces use the same core logic and dataa

### **🛠️ MCP Server Tools**
The MCP server provides the following tools for AI assistants:

| Tool | Description | Usage |
|------|-------------|-------|
| `generate_image` | Generate images with FAL AI models | Single image generation with full parameter control |
| `list_models` | Get available models and pricing | View all supported models with costs and descriptions |
| `optimize_prompt` | AI-powered prompt enhancement | Improve prompts for better generation results |
| `batch_generate` | Generate multiple images | Batch processing with multiple prompts and models |
| `calculate_cost` | Estimate generation costs | Calculate costs before generating images |
| `get_model_info` | Detailed model information | Get specific model parameters and capabilities |

### **📦 MCP Server Setup & Integration**

#### **1. Start MCP Server**
```bash
# Start the MCP server on default port (3001)
npm run mcp-server

# Or specify custom port
PORT=3002 npm run mcp-server
```

#### **2. Claude Desktop Integration**
Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "fal-cli": {
      "command": "node",
      "args": ["/path/to/fal-cli/mcp-server.js"],
      "env": {
        "FAL_KEY": "your_fal_api_key_here"
      }
    }
  }
}
```

#### **3. Cursor Integration**
Add to your Cursor MCP configuration:

```json
{
  "mcpServers": {
    "fal-cli": {
      "command": "node",
      "args": ["/path/to/fal-cli/mcp-server.js"]
    }
  }
}
```

#### **4. Environment Variables**
Ensure your FAL API key is available:

```bash
# Method 1: .env file (recommended)
echo "FAL_KEY=your_fal_api_key_here" > .env

# Method 2: Environment variable
export FAL_KEY="your_fal_api_key_here"

# Method 3: CLI config (shared with MCP)
pnpm fal-cli config --set-key your_fal_api_key_here
```

### **🎯 MCP Usage Examples**

#### **For AI Assistants (like Claude/Cursor)**
Once configured, you can ask your AI assistant:

- *"Generate an image of a sunset using FLUX Pro"*
- *"List all available FAL AI models with their costs"*
- *"Optimize this prompt: 'a cat sitting on a chair'"*
- *"Calculate the cost to generate 10 images with Imagen 4"*
- *"Generate multiple images with different models for comparison"*

#### **Advanced MCP Features**
- **Automatic Model Selection**: AI assistants can choose the best model for your request
- **Cost Optimization**: Automatic cost calculation and optimization suggestions
- **Batch Processing**: Generate multiple variations or compare different models
- **Prompt Enhancement**: AI-powered prompt optimization for better results

### **🔄 CLI + MCP Workflow**
You can use both interfaces simultaneously:

```bash
# Terminal 1: Start MCP server for AI assistants
npm run mcp-server

# Terminal 2: Use CLI directly
pnpm fal-cli generate -p "cyberpunk city" -m "flux-pro-ultra"

# AI Assistant: Generate and compare multiple models
# "Generate the same prompt with FLUX and Imagen models for comparison"
```

## ✨ Features

### 🤖 **AI Model Support**
- **5 Premium Models**: FLUX Pro variants, Imagen 4 Ultra, Qwen Image
- **Multi-model Selection**: Generate with multiple models simultaneously
- **Model-specific Optimization**: Tailored prompts for each model's strengths
- **Real-time Cost Calculation**: See costs before generation

### 🎯 **Smart Prompt Enhancement**
- **AI-powered Optimization**: LLM-enhanced prompts for better results
- **Model-specific Prompts**: Each model gets optimized prompts based on its capabilities
- **Interactive Enhancement**: Choose when to optimize prompts

### 📦 **Batch Processing & Workflows**
- **Batch Mode**: Process multiple prompts from text files
- **Custom Output Directories**: Save anywhere on your system
- **Unique Filenames**: No overwrites with timestamp + random suffixes

### 🔧 **Advanced CLI**
- **Subcommand Architecture**: `generate`, `models`, `optimize`, `config`
- **Global Installation**: Use from any directory on your system
- **Interactive & Direct Modes**: Both GUI-style prompts and direct commands
- **Beautiful Output**: Colorful progress, spinners, and formatted results

### 🌐 **Browser Integration**
- **FAL URL Display**: View generated image URLs after creation
- **One-click Browser Opening**: Open images directly from terminal
- **Batch URL Management**: Open all images or select specific ones
- **Copy-friendly URLs**: Easy copying for sharing

## 📦 Installation

### Prerequisites
- **Node.js 18+** (Required for ES modules)
- **pnpm** (recommended) or npm
- **FAL API Key** (Get one from [fal.ai](https://fal.ai))

### Install Dependencies
```bash
# Clone or download this repository
cd fal-cli

# Install all dependencies
pnpm install
```

### Setup API Key
You need a FAL API key to use this CLI. Get one from [fal.ai](https://fal.ai):

```bash
# Method 1: Create .env file (recommended)
echo "FAL_KEY=your_fal_api_key_here" > .env

# Method 2: Use the CLI config command
pnpm fal-cli config --set-key your_fal_api_key_here

# Method 3: Environment variable
export FAL_KEY="your_fal_api_key_here"
```

### Global Installation (Optional)
```bash
# Make CLI available globally
npm link

# Now you can use 'fal-cli' from anywhere
fal-cli --help
```

## 🚀 Quick Start

### **First Time Setup**
```bash
# 1. Install dependencies
pnpm install

# 2. Set your FAL API key
pnpm fal-cli config --set-key your_fal_api_key_here

# 3. Test with a simple generation
pnpm fal-cli generate -p "a beautiful sunset" -m "qwen-image"
```

### **Common Usage Patterns**
```bash
# Interactive mode (recommended for beginners)
pnpm fal-cli

# Direct generation with specific settings
pnpm fal-cli generate -p "cyberpunk city at night" -m "flux-pro-ultra" -o ~/Desktop/ai-images

# List all available models with details
pnpm fal-cli models

# Optimize a prompt before generation
pnpm fal-cli optimize "a cat sitting on a chair"

# Batch processing from file
echo "beautiful landscape\ncyberpunk city\nabstract art" > prompts.txt
pnpm fal-cli generate --batch --optimize

# View comprehensive help
pnpm fal-cli --help
```

## 📋 Commands

### `generate` (default)
Start interactive image generation session

```bash
pnpm fal-cli generate [options]
pnpm fal-cli gen [options]    # alias

Options:
  -m, --model <model>     Specify model ID to use
  -p, --prompt <prompt>   Text prompt for generation
  -b, --batch            Enable batch mode (requires prompts.txt)
  --optimize             Automatically optimize prompts with AI
  --no-optimize          Skip prompt optimization
```

**Interactive Mode:**
When you run without options, the CLI guides you through each step:
```bash
pnpm fal-cli generate
# 1. Select models (multi-select with SPACE)
# 2. Choose single prompt or batch mode
# 3. Enter prompt or load prompts.txt
# 4. Optimize prompts (optional)
# 5. Configure parameters (optional)
# 6. Set image count and iterations
# 7. Choose output directory
# 8. Review cost estimate
# 9. Generate images
# 10. Open URLs in browser
```

**Direct Mode Examples:**
```bash
# Simple generation
pnpm fal-cli generate -p "cyberpunk city at night" -m "flux-pro-ultra"

# With custom output directory
pnpm fal-cli generate -p "mountain landscape" -m "qwen-image" -o ~/Desktop/ai-art

# Batch mode with optimization
pnpm fal-cli generate --batch --optimize -o ./output

# Skip prompt optimization
pnpm fal-cli generate -p "abstract art" -m "imagen4-ultra" --no-optimize
```

### `models`
List available AI models

```bash
pnpm fal-cli models [options]
pnpm fal-cli ls [options]     # alias

Options:
  -c, --category <category>   Filter by category
  --json                     Output in JSON format
```

**Examples:**
```bash
# List all models with details
pnpm fal-cli models
# Shows: Name, Cost, Max Images, Category, Description

# Filter by category
pnpm fal-cli models -c "Professional"
pnpm fal-cli models -c "Ultra Quality"
pnpm fal-cli models -c "General Purpose"

# JSON output for scripting
pnpm fal-cli models --json > models.json

# Quick list with alias
pnpm fal-cli ls
```

**Sample Output:**
```
🤖 Available AI Models:

📂 Professional Category:
  • FLUX Pro Kontext Max    | $0.08/img | Max: 4 | Advanced contextual understanding
  • FLUX Pro Kontext        | $0.04/img | Max: 4 | Professional contexts & consistency

📂 Ultra Quality Category:
  • FLUX Pro Ultra v1.1     | $0.06/img | Max: 4 | Ultra-high resolution (2K-4MP)
  • Imagen 4 Ultra          | $0.06/img | Max: 4 | Photorealistic precision

📂 General Purpose Category:
  • Qwen Image              | $0.05/img | Max: 4 | Excellent text rendering
```

### `optimize`
Optimize a text prompt for better generation

```bash
pnpm fal-cli optimize <prompt> [options]
pnpm fal-cli opt <prompt> [options]    # alias

Options:
  -m, --model <model>    Target model for optimization
```

**Examples:**
```bash
# Basic optimization (uses default model)
pnpm fal-cli optimize "a beautiful sunset"

# Optimize for specific model
pnpm fal-cli optimize "portrait of a woman" -m "imagen4-ultra"
pnpm fal-cli optimize "cyberpunk scene" -m "flux-pro-ultra"
pnpm fal-cli optimize "logo design" -m "qwen-image"

# Use alias
pnpm fal-cli opt "abstract art"
```

**Sample Optimization:**
```
🎯 Original: "a cat"

🤖 Optimizing with FLUX Pro Ultra v1.1...
✨ Optimized: "elegant domestic cat with detailed fur texture, natural lighting 
revealing individual whiskers and expressive amber eyes, sitting gracefully with 
perfect posture, soft shadows creating depth, photorealistic quality with fine 
detail capture, ultra-high resolution rendering"

💡 Enhancement applied: Added texture details, lighting specification, and 
model-specific ultra-high resolution elements.
```

### `config`
Configure CLI settings

```bash
pnpm fal-cli config [options]

Options:
  --set-key <key>    Set FAL API key
  --show            Show current configuration
```

**Examples:**
```bash
# Interactive configuration menu
pnpm fal-cli config
# Options: Set API key, Show current config, Test connection

# Set API key directly
pnpm fal-cli config --set-key "your_api_key_here"

# View current settings
pnpm fal-cli config --show
```

**Configuration Features:**
- **Secure Storage**: API key stored in local .env file
- **Connection Testing**: Verify API key works with FAL
- **Environment Detection**: Automatically finds .env files
- **Cross-platform**: Works on Windows, macOS, Linux

## 🤖 Available Models

| Model | Category | Cost/Image | Max Images | Strengths |
|-------|----------|------------|------------|-----------|
| **FLUX Pro Kontext Max** | Professional | $0.08 | 4 | Advanced contextual understanding |
| **FLUX Pro Kontext** | Professional | $0.04 | 4 | Professional contexts & consistency |
| **FLUX Pro Ultra v1.1** | Ultra Quality | $0.06 | 4 | Ultra-high resolution (2K-4MP) |
| **Imagen 4 Ultra** | Ultra Quality | $0.06 | 4 | Photorealistic precision |
| **Qwen Image** | General Purpose | $0.05 | 4 | Excellent text rendering |

## 📁 Batch Processing

### **Creating Prompt Files**
Create a `prompts.txt` file in your project directory:

```txt
a serene mountain landscape at golden hour
cyberpunk city with neon lights reflecting on wet streets
portrait of an elegant woman in renaissance style
abstract geometric patterns in vibrant colors
minimalist logo design for a tech company
photo of a cozy coffee shop interior
```

### **Batch Mode Commands**
```bash
# Basic batch processing
pnpm fal-cli generate --batch

# Batch with optimization and custom output
pnpm fal-cli generate --batch --optimize -o ~/batch-results

# Batch with specific model
pnpm fal-cli generate --batch -m "flux-pro-ultra" --optimize
```

### **Batch Processing Features**
- **📄 Auto-detection**: Looks for `prompts.txt` in current directory
- **🔄 Multi-model**: Each prompt can be processed by multiple models
- **⚡ Parallel Processing**: Configurable batch size for concurrent requests
- **📊 Progress Tracking**: Real-time progress with completion counters
- **💰 Cost Calculation**: Shows total cost before processing
- **🔄 Resume Support**: Skip completed generations

### **Advanced Batch Workflows**
```bash
# Large batch with custom batch size
echo "prompt1\nprompt2\nprompt3\n..." > big_batch.txt
pnpm fal-cli generate --batch --optimize
# Choose batch size: 5 concurrent requests

# Multiple models with cost optimization
pnpm fal-cli generate --batch
# Select: FLUX Pro Kontext ($0.04) and Qwen Image ($0.05)
# 6 prompts × 2 models = $0.54 total
```

## ⚙️ Configuration

### Environment Variables
```bash
FAL_KEY=your_fal_api_key_here    # Required: Your FAL API key
```

## 📂 Output Management

### **Directory Structure**
Generated images are organized with unique session IDs:
```
generated-images/                    # Default base directory
├── gen_1736031234567_a3x9k2/       # Generation session
│   ├── flux-pro-ultra_prompt1_iter1_img1_timestamp_random.png
│   ├── flux-pro-ultra_prompt1_iter1_img2_timestamp_random.png
│   ├── qwen-image_prompt1_iter1_img1_timestamp_random.png
│   └── imagen4-ultra_prompt2_iter1_img1_timestamp_random.png
├── gen_1736031456789_b7m4n1/       # Another session
│   └── ...
└── custom_1736031678901_c8p5q3/    # Custom command session
    └── ...
```

### **Filename Format**
```
{model-key}_{prompt-index}_{iteration}_{image-index}_{timestamp}_{random}.png
```

**Example:** `flux-pro-ultra_prompt1_iter2_img3_1736031234567_a3x9k2.png`
- **Model**: flux-pro-ultra
- **Prompt**: 1st prompt in batch
- **Iteration**: 2nd iteration
- **Image**: 3rd image from that API call
- **Timestamp**: Exact generation time
- **Random**: Prevents any filename conflicts

### **Custom Output Directories**
```bash
# Save to desktop
pnpm fal-cli generate -o ~/Desktop/ai-art

# Save to project folder
pnpm fal-cli generate -o ./results

# Absolute path
pnpm fal-cli generate -o /Users/username/Documents/AI-Images

# Interactive directory selection
pnpm fal-cli generate
# Choose: "Use custom output directory? Yes"
# Enter: "/path/to/your/directory"
```

## 🎯 Prompt Optimization

The CLI includes AI-powered prompt optimization that:

- 📝 **Analyzes** your original prompt
- 🎨 **Enhances** it with model-specific techniques
- 🔍 **Optimizes** for the target model's strengths
- ✨ **Improves** generation quality

**Before:** `"a cat"`

**After:** `"elegant domestic cat with detailed fur texture, natural lighting revealing individual whiskers and expressive amber eyes, sitting gracefully with perfect posture, soft shadows creating depth, photorealistic quality with fine detail capture"`

## 🛠️ Advanced Usage

### NPM Scripts
```bash
pnpm run models      # List models
pnpm run generate    # Start generation
pnpm run optimize    # Optimize prompts
pnpm run config      # Configure settings
```

### Global Options
```bash
-v, --verbose        Enable verbose logging
--no-color          Disable colored output
--help              Show help information
--version           Show version information
```

## 🎨 Model-Specific Tips

### FLUX Pro Kontext Max
- **Best for**: Complex scenes with multiple elements
- **Tip**: Use detailed contextual relationships between objects
- **Example**: `"elderly scholar absorbed in ancient manuscript, candlelight casting shadows across leather-bound volumes"`

### FLUX Pro Ultra v1.1
- **Best for**: Ultra-high resolution details
- **Tip**: Focus on material properties and surface textures
- **Example**: `"platinum ring with precisely cut diamond, hand-engraved filigree patterns, mirror-like surface reflections"`

### Imagen 4 Ultra
- **Best for**: Photorealistic images
- **Tip**: Use technical photography terms
- **Example**: `"alpine landscape with 35mm focal length, f/8 aperture, golden hour lighting at 3200K color temperature"`

### Qwen Image
- **Best for**: Images with text elements
- **Tip**: Specify exact text content and typography
- **Example**: `"vintage coffee shop sign displaying CAFÉ NOIR in hand-painted serif letterforms"`

## 🔧 Development

### Project Structure
```
fal-cli/
├── cli.js              # Main CLI application with all commands
├── models-new.js       # Model loader and utilities
├── models/             # Model configuration files (JSON)
│   ├── flux-kontext-max.json
│   ├── flux-kontext-pro.json
│   ├── flux-pro-ultra.json
│   ├── imagen4-ultra.json
│   └── qwen-image.json
├── package.json        # Dependencies and scripts
├── .env                # API key configuration (create this)
├── .gitignore          # Git ignore rules
└── README.md          # This documentation
```

### Adding New Models
1. **Create JSON file** in `models/` directory:
```json
{
  "id": "fal-ai/new-model",
  "key": "new-model", 
  "name": "New Model Name",
  "description": "Model description",
  "category": "Category Name",
  "cost_per_image": 0.05,
  "default_parameters": {
    "num_images": 1,
    "aspect_ratio": "16:9"
  },
  "supported_aspect_ratios": ["1:1", "16:9", "9:16"],
  "supported_formats": ["png", "jpg"],
  "max_images": 4,
  "optimization_system_prompt": "Custom prompt for this model..."
}
```
2. **Test the model** with CLI
3. **Update documentation** if needed

### Code Architecture
- **Modular Design**: Each command is a separate function
- **Async/Await**: All API calls use modern async patterns
- **Error Handling**: Comprehensive try-catch blocks
- **User Experience**: Colorful output with ora spinners
- **Configuration**: Environment-based API key management

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🔧 Troubleshooting

### **Common Issues**

#### **API Key Problems**
```bash
# Error: "API key not found"
# Solution: Set your API key
pnpm fal-cli config --set-key "your_key_here"

# Error: "Invalid API key"
# Solution: Get a new key from fal.ai
# Check: https://fal.ai for account setup
```

#### **Network Issues**
```bash
# Error: "Failed to connect to FAL API"
# Check: Internet connection
# Check: Firewall settings
# Try: Different network or VPN
```

#### **Generation Failures**
```bash
# Error: "Generation failed"
# Check: Prompt length (not too long)
# Check: Model availability
# Try: Different model or simpler prompt
```

#### **File Permission Errors**
```bash
# Error: "Cannot write to directory"
# Solution: Use different output directory
pnpm fal-cli generate -o ~/Desktop/ai-images

# Or fix permissions:
chmod 755 ./generated-images
```

### **Performance Tips**
- **Batch Size**: Use smaller batches (3-5) for better reliability
- **Concurrent Requests**: Don't exceed 10 parallel requests
- **Large Prompts**: Keep prompts under 500 characters
- **Directory**: Use SSDs for faster image saving

### **Debug Mode**
```bash
# Enable verbose logging
pnpm fal-cli generate -v --verbose

# Check model availability
pnpm fal-cli models --json

# Test API connection
pnpm fal-cli config --show
```

## ❓ Frequently Asked Questions

### **Q: Is this officially supported by FAL?**
**A:** No, this is an unofficial community tool. It uses the public FAL API but is not affiliated with or endorsed by FAL.

### **Q: How much does it cost to generate images?**
**A:** Costs vary by model:
- FLUX Pro Kontext: $0.04/image
- FLUX Pro Ultra: $0.06/image  
- Imagen 4 Ultra: $0.06/image
- Qwen Image: $0.05/image
The CLI shows exact costs before generation.

### **Q: Can I use this commercially?**
**A:** Check FAL's terms of service for commercial usage rights. This CLI tool itself is MIT licensed.

### **Q: Why are my prompts not generating good images?**
**A:** Try the prompt optimization feature:
```bash
pnpm fal-cli optimize "your prompt here"
```

### **Q: Can I add custom models?**
**A:** Yes! Add a JSON file to the `models/` directory following the existing schema.

### **Q: Does this work offline?**
**A:** No, it requires internet connection to access FAL's API.

### **Q: How do I update to the latest version?**
**A:** Pull the latest code and reinstall:
```bash
git pull origin main
pnpm install
```

## 🆘 Support & Community

### **Getting Help**
- 📚 **Documentation**: This comprehensive README
- 🐛 **Bug Reports**: Create detailed GitHub issues
- 💡 **Feature Requests**: Suggest improvements via issues
- 🗨️ **Community**: Join discussions about AI image generation

### **Before Asking for Help**
1. **Check this README** for your specific use case
2. **Try verbose mode**: `pnpm fal-cli generate -v`
3. **Test your API key**: `pnpm fal-cli config --show`
4. **Check model availability**: `pnpm fal-cli models`
5. **Try a simple prompt** first

### **When Reporting Issues**
Include:
- **Command used**: Full command with options
- **Error message**: Complete error output
- **Environment**: OS, Node.js version, pnpm version
- **API key status**: Working/not working (don't share the actual key)
- **Model used**: Which AI model you selected

---

**Built with ❤️ by ilkerzg**
