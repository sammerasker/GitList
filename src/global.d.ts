/// <reference types="chrome" />

// Global type declarations for Chrome extension APIs
declare global {
  namespace globalThis {
    var chrome: typeof chrome;
  }
}

export {};
