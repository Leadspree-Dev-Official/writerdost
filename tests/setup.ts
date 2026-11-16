// Polyfill undici.DecoratorHandler if missing in older undici versions for JSDOM
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const undici = require("undici");
  if (undici && !undici.DecoratorHandler) {
    undici.DecoratorHandler = class MockDecoratorHandler {};
  }
} catch {
  // Ignore if undici is not installed or resolved differently
}

import "@testing-library/jest-dom/vitest";
