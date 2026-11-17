import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const shimCode = `'use strict';

const _fetch = (input, init) => {
  if (init && typeof init === 'object' && 'dispatcher' in init) {
    const copy = { ...init };
    delete copy.dispatcher;
    return globalThis.fetch(input, copy);
  }
  return globalThis.fetch(input, init);
};

class Agent {
  constructor(_opts) {}
  async close() {}
  destroy() {}
}

class Client {
  constructor(_opts) {}
  async close() {}
  destroy() {}
}

class Pool {
  constructor(_opts) {}
  async close() {}
  destroy() {}
}

class Dispatcher {
  constructor(_opts) {}
  async close() {}
  destroy() {}
}

class DecoratorHandler {
  constructor(_opts) {}
}

const getGlobalDispatcher = () => new Dispatcher();
const setGlobalDispatcher = (..._args) => {};

const File = globalThis.File;
const FormData = globalThis.FormData;
const Headers = globalThis.Headers;
const Request = globalThis.Request;
const Response = globalThis.Response;

module.exports = {
  fetch: _fetch,
  Agent,
  Client,
  Pool,
  Dispatcher,
  DecoratorHandler,
  getGlobalDispatcher,
  setGlobalDispatcher,
  File,
  FormData,
  Headers,
  Request,
  Response,
  default: {
    fetch: _fetch,
    Agent,
    Client,
    Pool,
    Dispatcher,
    DecoratorHandler,
    getGlobalDispatcher,
    setGlobalDispatcher,
    File,
    FormData,
    Headers,
    Request,
    Response,
  },
};
`;

// 1. Patch undici index.js in node_modules/undici and node_modules/node-appwrite/node_modules/undici
const undiciPaths = [
  path.join(rootDir, "node_modules/undici/index.js"),
  path.join(rootDir, "node_modules/node-appwrite/node_modules/undici/index.js"),
];

for (const p of undiciPaths) {
  if (fs.existsSync(p)) {
    fs.writeFileSync(p, shimCode, "utf-8");
    console.log(`[patch-opennext] Replaced ${p} with Cloudflare-safe fetch shim`);
  }
}

// 2. Patch OpenNext bundle-server.js
const bundleServerPath = path.join(
  rootDir,
  "node_modules/@opennextjs/cloudflare/dist/cli/build/bundle-server.js"
);

if (fs.existsSync(bundleServerPath)) {
  let content = fs.readFileSync(bundleServerPath, "utf-8");

  if (!content.includes('"undici":')) {
    const target = '"next/dist/compiled/node-fetch":';
    const replacement = `"undici": path.resolve(process.cwd(), "src/lib/undici-shim.ts"),\n            "next/dist/compiled/node-fetch":`;

    if (content.includes(target)) {
      content = content.replace(target, replacement);
      fs.writeFileSync(bundleServerPath, content, "utf-8");
      console.log("[patch-opennext] Successfully patched bundle-server.js to alias undici");
    }
  } else {
    console.log("[patch-opennext] bundle-server.js already contains undici alias");
  }
}
