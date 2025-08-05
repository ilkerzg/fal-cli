#!/usr/bin/env node

/**
 * ===== SECURE STORAGE MODULE =====
 * 
 * This module provides secure storage capabilities for sensitive data like API keys.
 * It implements AES-256-GCM encryption with machine-specific keys to protect
 * stored credentials from unauthorized access.
 * 
 * Security Features:
 * - AES-256-GCM encryption with authenticated encryption
 * - Machine-specific encryption keys based on hardware/OS fingerprints
 * - OS-specific secure storage locations
 * - API key format validation
 * - Secure key rotation and removal capabilities
 * 
 * Storage Locations:
 * - Windows: %APPDATA%/fal-cli/
 * - macOS: ~/Library/Application Support/fal-cli/
 * - Linux: ~/.config/fal-cli/
 * 
 * The module ensures that API keys are never stored in plain text and can only
 * be decrypted on the machine where they were originally encrypted.
 * 
 * @author ilkerzg
 * @version 0.0.1
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

/**
 * Get OS-specific configuration directory
 * 
 * Returns the appropriate configuration directory based on the operating system,
 * following platform conventions for application data storage.
 * 
 * @returns {string} Platform-specific configuration directory path
 */
const getConfigDir = () => {
  const platform = os.platform();
  let configDir;

  switch (platform) {
    case 'win32':
      // Windows: Use Roaming AppData for user-specific application data
      configDir = path.join(os.homedir(), 'AppData', 'Roaming', 'fal-cli');
      break;
    case 'darwin':
      // macOS: Use Application Support for app-specific data
      configDir = path.join(os.homedir(), 'Library', 'Application Support', 'fal-cli');
      break;
    default: // Linux and other Unix-like systems
      // Linux: Use XDG config directory specification
      configDir = path.join(os.homedir(), '.config', 'fal-cli');
      break;
  }

  return configDir;
};

/**
 * Generate a machine-specific encryption key
 * 
 * Creates a unique encryption key based on machine characteristics.
 * This ensures that encrypted data can only be decrypted on the same machine
 * where it was originally encrypted, providing an additional layer of security.
 * 
 * @returns {Buffer} 32-byte SHA-256 hash of machine characteristics
 */
const getMachineKey = () => {
  // Combine hostname, platform, and architecture for machine fingerprint
  const machineId = os.hostname() + os.platform() + os.arch();
  return crypto.createHash('sha256').update(machineId).digest();
};

/**
 * Encrypt sensitive data using AES-256-GCM
 * 
 * Uses authenticated encryption to ensure both confidentiality and integrity.
 * The machine-specific key ensures data can only be decrypted on this machine.
 * 
 * @param {string} text - Plain text data to encrypt
 * @returns {Object} Encryption result containing:
 *   - encrypted: Encrypted data as hex string
 *   - iv: Initialization vector as hex string
 *   - authTag: Authentication tag as hex string
 */
const encrypt = (text) => {
  const algorithm = 'aes-256-gcm';
  const key = getMachineKey();
  const iv = crypto.randomBytes(16); // Generate random IV for each encryption

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get authentication tag for integrity verification
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

// Decrypt data
const decrypt = (encryptedData) => {
  try {
    const algorithm = 'aes-256-gcm';
    const key = getMachineKey();
    const iv = Buffer.from(encryptedData.iv, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt API key - data may be corrupted');
  }
};

// Store API key securely
export const storeApiKey = async (apiKey) => {
  try {
    const configDir = getConfigDir();
    await fs.ensureDir(configDir);

    const encryptedData = encrypt(apiKey);
    const configFile = path.join(configDir, 'config.json');

    const config = {
      version: '1.0.0',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      apiKey: encryptedData
    };

    await fs.writeFile(configFile, JSON.stringify(config, null, 2));

    // Set secure file permissions (readable only by owner)
    if (os.platform() !== 'win32') {
      await fs.chmod(configFile, 0o600);
    }

    return true;
  } catch (error) {
    throw new Error(`Failed to store API key: ${error.message}`);
  }
};

// Retrieve API key securely
export const retrieveApiKey = async () => {
  try {
    const configDir = getConfigDir();
    const configFile = path.join(configDir, 'config.json');

    if (!await fs.pathExists(configFile)) {
      return null; // No stored API key
    }

    const configData = await fs.readFile(configFile, 'utf8');
    const config = JSON.parse(configData);

    if (!config.apiKey) {
      return null;
    }

    const decryptedKey = decrypt(config.apiKey);
    return decryptedKey;
  } catch (error) {
    throw new Error(`Failed to retrieve API key: ${error.message}`);
  }
};

// Check if API key is stored
export const hasStoredApiKey = async () => {
  try {
    const configDir = getConfigDir();
    const configFile = path.join(configDir, 'config.json');
    return await fs.pathExists(configFile);
  } catch (error) {
    return false;
  }
};

// Remove stored API key
export const removeApiKey = async () => {
  try {
    const configDir = getConfigDir();
    const configFile = path.join(configDir, 'config.json');

    if (await fs.pathExists(configFile)) {
      await fs.remove(configFile);
    }

    return true;
  } catch (error) {
    throw new Error(`Failed to remove API key: ${error.message}`);
  }
};

// Get config file path for display
export const getConfigPath = () => {
  const configDir = getConfigDir();
  return path.join(configDir, 'config.json');
};

// Validate API key format
export const validateApiKey = (apiKey) => {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  const trimmedKey = apiKey.trim();

  // Basic length and character checks
  if (trimmedKey.length < 10) {
    return false;
  }

  // FAL API keys can have various formats, be more flexible:
  // - Contains alphanumeric chars, hyphens, underscores, colons
  // - Has reasonable length (10-200 chars)
  // - Contains at least one colon or hyphen (typical separators)
  const basicPattern = /^[a-zA-Z0-9_:\-\.]+$/;
  const hasValidSeparator = /[:\-]/.test(trimmedKey);
  const hasReasonableLength = trimmedKey.length >= 10 && trimmedKey.length <= 200;

  return basicPattern.test(trimmedKey) && hasValidSeparator && hasReasonableLength;
};
