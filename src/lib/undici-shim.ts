/**
 * Shim that replaces `undici` imports with Cloudflare Workers-compatible
 * global equivalents.
 *
 * `node-appwrite` v29 uses `undici.fetch`, `undici.Agent`, `undici.File`,
 * and `undici.FormData` internally. Cloudflare Workers provide a global
 * `fetch` that handles TLS natively without `ALPNProtocols`, so we map
 * the named exports accordingly.
 */

// Global fetch wrapper that removes any undici-specific dispatcher options
const _fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  if (init && "dispatcher" in (init as Record<string, unknown>)) {
    const copy = { ...init } as Record<string, unknown>;
    delete copy.dispatcher;
    return globalThis.fetch(input, copy as RequestInit);
  }
  return globalThis.fetch(input, init);
};

// A no-op Agent that drops the `dispatcher` option harmlessly.
class Agent {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(..._args: unknown[]) {}
}

class DecoratorHandler {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(..._args: unknown[]) {}
}

class Dispatcher {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(..._args: unknown[]) {}
}

const getGlobalDispatcher = () => new Dispatcher();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const setGlobalDispatcher = (..._args: unknown[]) => {};

const _File = globalThis.File;
const _FormData = globalThis.FormData;
const _Headers = globalThis.Headers;
const _Request = globalThis.Request;
const _Response = globalThis.Response;

export {
  _fetch as fetch,
  Agent,
  DecoratorHandler,
  Dispatcher,
  getGlobalDispatcher,
  setGlobalDispatcher,
  _File as File,
  _FormData as FormData,
  _Headers as Headers,
  _Request as Request,
  _Response as Response,
};

const undiciShim = {
  fetch: _fetch,
  Agent,
  DecoratorHandler,
  Dispatcher,
  getGlobalDispatcher,
  setGlobalDispatcher,
  File: _File,
  FormData: _FormData,
  Headers: _Headers,
  Request: _Request,
  Response: _Response,
};

export default undiciShim;
