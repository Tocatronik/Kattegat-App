const ENDPOINT = '/api/log-error';
let lastSent = 0;
const queue = [];
const MIN_INTERVAL_MS = 500;

async function flush() {
  while (queue.length) {
    const item = queue.shift();
    try {
      await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
        keepalive: true,
      });
    } catch {
      // swallow — don't loop
    }
  }
}

export function reportError(error, context = {}) {
  try {
    const item = {
      source: 'client',
      level: 'error',
      message: error?.message || String(error),
      stack: error?.stack || null,
      url: typeof window !== 'undefined' ? window.location.href : null,
      context,
    };
    queue.push(item);
    const now = Date.now();
    if (now - lastSent > MIN_INTERVAL_MS) {
      lastSent = now;
      flush();
    }
  } catch {
    // never throw inside reporter
  }
}

/**
 * Wires window.onerror + window.onunhandledrejection.
 * Call once at app startup (from main.jsx).
 */
export function installGlobalReporter() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (event) => {
    reportError(event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, { type: 'unhandled_promise_rejection' });
  });
}
