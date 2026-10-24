/**
 * In-flight request de-duplication: identical requests made while one is
 * already running share its result instead of sending another API request.
 *
 * @module dedupe
 * @internal
 */

import { HashnodeError } from './errors';

interface Entry {
  promise: Promise<unknown>;
  /** Cancels the shared request once every caller waiting for it has aborted. */
  controller: AbortController;
  /** Callers still waiting for the result. */
  waiters: number;
}

/** Shares one in-flight request between callers that use the same key. */
export class InFlightRequests {
  readonly #pending = new Map<string, Entry>();

  /** Number of distinct requests currently in flight. */
  get size(): number {
    return this.#pending.size;
  }

  /**
   * Calls `start` unless a request with the same key is already in flight, in
   * which case its result is shared. Each caller receives its own deep copy,
   * so one caller changing the data can't affect another.
   *
   * Aborting `signal` rejects only this caller. The shared request is
   * cancelled, through the signal passed to `start`, only when every caller
   * waiting for it has aborted.
   */
  run<T>(
    key: string,
    start: (signal: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    let entry = this.#pending.get(key);
    if (!entry) {
      const created: Entry = {
        controller: new AbortController(),
        waiters: 0,
        promise: Promise.resolve(),
      };
      created.promise = start(created.controller.signal).finally(() => {
        this.#release(key, created);
      });
      // Callers handle the result; this only prevents an unhandled rejection
      // when every caller has already aborted.
      created.promise.catch(() => undefined);
      this.#pending.set(key, created);
      entry = created;
    }

    const shared = entry;
    shared.waiters++;
    const result = shared.promise.then((data) => structuredClone(data) as T);
    if (!signal) return result;

    return withAbort(result, signal, () => {
      shared.waiters--;
      if (shared.waiters === 0) {
        // Nobody is waiting any more: stop sharing and cancel the request.
        this.#release(key, shared);
        shared.controller.abort(signal.reason);
      }
    });
  }

  #release(key: string, entry: Entry): void {
    if (this.#pending.get(key) === entry) this.#pending.delete(key);
  }
}

function abortedError(signal: AbortSignal): HashnodeError {
  return new HashnodeError('Request was aborted', { code: 'ABORTED', cause: signal.reason });
}

/** Rejects with ABORTED when `signal` aborts, calling `onAbort` once. */
function withAbort<T>(promise: Promise<T>, signal: AbortSignal, onAbort: () => void): Promise<T> {
  if (signal.aborted) {
    promise.catch(() => undefined);
    onAbort();
    return Promise.reject(abortedError(signal));
  }
  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      onAbort();
      reject(abortedError(signal));
    };
    signal.addEventListener('abort', abort, { once: true });
    void promise.then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', abort);
    });
  });
}

/**
 * True for GraphQL query operations, which are safe to share. Mutations and
 * subscriptions are never de-duplicated.
 */
export function isQueryOperation(document: string): boolean {
  let text = document.trimStart();
  // Skip leading comments.
  while (text.startsWith('#')) {
    const newline = text.indexOf('\n');
    text = newline === -1 ? '' : text.slice(newline + 1).trimStart();
  }
  if (text.startsWith('{')) return true;
  return text.startsWith('query') && !/^query\w/.test(text);
}
