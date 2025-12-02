// src/config.js
const _global = typeof window !== 'undefined' ? window : globalThis;

// Default config (can be overridden per-page)
export const defaultConfig = {
  API_BASE: 'http://43.138.49.60:9991/api/SigninLog',
  TASK_ID: 0,                 // override in each page
  DEFAULT_TOKEN: ''           // optional: only for local dev
};

export function setConfig(partial) {
  _global.H5Config = Object.assign({}, defaultConfig, _global.H5Config || {}, partial || {});
  return _global.H5Config;
}

export function getConfig() {
  return _global.H5Config || defaultConfig;
}

// Call AFTER common.js is loaded (so H5Bridge exists)
export function injectDevToken() {
  const cfg = getConfig();
  try {
    if (cfg.DEFAULT_TOKEN && _global.H5Bridge && typeof _global.H5Bridge.deliverToken === 'function') {
      _global.H5Bridge.deliverToken(cfg.DEFAULT_TOKEN);
    }
  } catch {}
}
