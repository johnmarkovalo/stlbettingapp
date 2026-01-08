/**
 * Unified Batch Processor with abort signal support
 * Replaces processInBatches and processInBatchesWithConcurrency
 */

export interface BatchOptions<T, R> {
  items: T[];
  processor: (item: T) => Promise<R>;
  concurrency?: number;
  delayBetweenBatches?: number;
  onProgress?: (processed: number, total: number, results: R[]) => void;
  signal?: AbortSignal;
  deduplicate?: boolean;
  deduplicateKey?: (item: T) => string;
  retryOnError?: boolean;
  maxRetries?: number;
}

export interface BatchResult<R> {
  results: R[];
  successful: number;
  failed: number;
  aborted: boolean;
}

/**
 * Check if operation was aborted
 */
function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Operation aborted', 'AbortError');
  }
}

/**
 * Process items in batches with concurrency control, cancellation, and progress tracking
 */
export async function processBatch<T, R>(
  options: BatchOptions<T, R>,
): Promise<BatchResult<R>> {
  const {
    items,
    processor,
    concurrency = 2,
    delayBetweenBatches = 500,
    onProgress,
    signal,
    deduplicate = true,
    deduplicateKey = (item: T) => JSON.stringify(item),
    retryOnError = false,
    maxRetries = 2,
  } = options;

  const results: R[] = [];
  let successful = 0;
  let failed = 0;

  // Deduplicate items if enabled
  let processItems = items;
  if (deduplicate) {
    const seen = new Set<string>();
    processItems = items.filter(item => {
      const key = deduplicateKey(item);
      if (seen.has(key)) {
        console.log(`🔄 Duplicate item filtered in batch processor`);
        return false;
      }
      seen.add(key);
      return true;
    });

    if (processItems.length < items.length) {
      console.log(
        `📊 Batch processor deduplicated: ${items.length} → ${processItems.length} items`,
      );
    }
  }

  const total = processItems.length;

  if (total === 0) {
    return {results, successful: 0, failed: 0, aborted: false};
  }

  try {
    for (let i = 0; i < total; i += concurrency) {
      // Check for abort before each batch
      checkAborted(signal);

      const batch = processItems.slice(i, Math.min(i + concurrency, total));

      const batchResults = await Promise.allSettled(
        batch.map(async item => {
          checkAborted(signal);

          let lastError: any;
          const attempts = retryOnError ? maxRetries + 1 : 1;

          for (let attempt = 0; attempt < attempts; attempt++) {
            try {
              checkAborted(signal);
              return await processor(item);
            } catch (error: any) {
              lastError = error;

              // Don't retry abort errors
              if (error.name === 'AbortError') {
                throw error;
              }

              // Don't retry on last attempt
              if (attempt < attempts - 1) {
                // Exponential backoff for retries
                const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }

          throw lastError;
        }),
      );

      // Process results
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          successful++;
        } else {
          failed++;
          // Check if it was an abort error
          if (result.reason?.name === 'AbortError') {
            throw result.reason;
          }
        }
      });

      // Report progress
      const processed = Math.min(i + concurrency, total);
      onProgress?.(processed, total, results);

      // Delay between batches (except for last batch)
      if (i + concurrency < total && delayBetweenBatches > 0) {
        checkAborted(signal);
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    return {results, successful, failed, aborted: false};
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('📛 Batch processing aborted');
      return {results, successful, failed, aborted: true};
    }
    throw error;
  }
}

/**
 * Create an abort controller with timeout
 */
export function createTimeoutAbortController(
  timeoutMs: number,
): AbortController {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  // Clear timeout if aborted early
  controller.signal.addEventListener('abort', () => {
    clearTimeout(timeoutId);
  });

  return controller;
}

/**
 * Merge multiple abort signals into one
 */
export function mergeAbortSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
  const controller = new AbortController();

  const validSignals = signals.filter((s): s is AbortSignal => s !== undefined);

  for (const signal of validSignals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', () => controller.abort(), {once: true});
  }

  return controller.signal;
}
