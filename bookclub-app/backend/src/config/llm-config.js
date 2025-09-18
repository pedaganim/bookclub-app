/*
 * LLM configuration and helpers
 */

function readEnv(name, def = '') {
  return process.env[name] ?? def;
}

const LLM_CONFIG = Object.freeze({
  provider: (readEnv('VISION_LLM_PROVIDER', 'openai') || 'openai').toLowerCase(),
  openai: {
    apiKey: readEnv('OPENAI_API_KEY', ''),
    defaultModel: readEnv('OPENAI_MODEL', 'gpt-4o-mini'),
  },
  anthropic: {
    apiKey: readEnv('ANTHROPIC_API_KEY', ''),
    defaultModel: readEnv('ANTHROPIC_MODEL', 'claude-3-haiku'),
  },
  ollama: {
    endpoint: readEnv('OLLAMA_ENDPOINT', ''),
    model: readEnv('OLLAMA_MODEL', 'phi3:instruct'),
  },
});

function getProvider() {
  return LLM_CONFIG.provider;
}

function getModel(providerOverride) {
  const p = (providerOverride || LLM_CONFIG.provider).toLowerCase();
  switch (p) {
    case 'openai':
      return LLM_CONFIG.openai.defaultModel;
    case 'anthropic':
      return LLM_CONFIG.anthropic.defaultModel;
    case 'ollama':
      return LLM_CONFIG.ollama.model;
    default:
      return 'unknown';
  }
}

function isConfigured(providerOverride) {
  const p = (providerOverride || LLM_CONFIG.provider).toLowerCase();
  if (p === 'openai') return !!LLM_CONFIG.openai.apiKey;
  if (p === 'anthropic') return !!LLM_CONFIG.anthropic.apiKey;
  if (p === 'ollama') return !!LLM_CONFIG.ollama.endpoint && !!LLM_CONFIG.ollama.model;
  return false;
}

module.exports = { LLM_CONFIG, getProvider, getModel, isConfigured };
