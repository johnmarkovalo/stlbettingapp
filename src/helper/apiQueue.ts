/**
 * API Request Queue with Deduplication, Rate Limiting, Cancellation, and Circuit Breaker
 * Prevents duplicate requests, handles rate limiting gracefully, and provides abort support
 */

interface QueuedRequest<T> {
  id: string;
  request: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  retryCount: number;
  priority: number;
  signal?: AbortSignal;
  url: string;
}

interface RequestCache {
  data: any;
  timestamp: number;
}

// Circuit breaker states
type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  halfOpenRequests: number;
}

class ApiQueue {
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private requestCache = new Map<string, RequestCache>();
  private pendingRequests = new Map<string, Promise<any>>();
  
  // Configuration
  private readonly CACHE_TTL = 30000; // Increased to 30 seconds for transaction lists
  private readonly MAX_CONCURRENT = 2;
  private readonly RATE_LIMIT_DELAY = 1000;
  private readonly MAX_RETRIES = 3;
  private readonly BASE_BACKOFF = 2000;
  
  // State
  private activeRequests = 0;
  private lastRequestTime = 0;

  // Circuit breaker
  private circuitState: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenSuccessCount = 0;
  private readonly circuitConfig: CircuitBreakerConfig = {
    failureThreshold: 5, // Open circuit after 5 consecutive failures
    recoveryTimeout: 30000, // Try again after 30 seconds
    halfOpenRequests: 2, // Allow 2 successful requests to close circuit
  };

  /**
   * Generate a unique request ID from URL and params
   */
  private getRequestId(url: string, params?: any, data?: any): string {
    const key = JSON.stringify({url, params, data});
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `req_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Check if request is cached and still valid
   */
  private getCachedRequest<T>(requestId: string): T | null {
    const cached = this.requestCache.get(requestId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    return null;
  }

  /**
   * Cache request result
   */
  private setCachedRequest<T>(requestId: string, data: T): void {
    this.requestCache.set(requestId, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Calculate exponential backoff delay
   */
  private getBackoffDelay(retryCount: number): number {
    return this.BASE_BACKOFF * Math.pow(2, retryCount);
  }

  /**
   * Wait for rate limit window
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const waitTime = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }

  // ============================================================================
  // Circuit Breaker Methods
  // ============================================================================

  /**
   * Check if circuit breaker allows request
   */
  private canMakeRequest(): boolean {
    if (this.circuitState === 'closed') {
      return true;
    }

    if (this.circuitState === 'open') {
      // Check if recovery timeout has passed
      if (Date.now() - this.lastFailureTime >= this.circuitConfig.recoveryTimeout) {
        console.log('🔌 [Circuit Breaker] Transitioning to half-open state');
        this.circuitState = 'half-open';
        this.halfOpenSuccessCount = 0;
        return true;
      }
      return false;
    }

    // Half-open state allows limited requests
    return true;
  }

  /**
   * Record a successful request
   */
  private recordSuccess(): void {
    if (this.circuitState === 'half-open') {
      this.halfOpenSuccessCount++;
      if (this.halfOpenSuccessCount >= this.circuitConfig.halfOpenRequests) {
        console.log('🔌 [Circuit Breaker] Closing circuit - requests successful');
        this.circuitState = 'closed';
        this.failureCount = 0;
      }
    } else if (this.circuitState === 'closed') {
      this.failureCount = 0; // Reset failure count on success
    }
  }

  /**
   * Record a failed request
   */
  private recordFailure(): void {
    this.lastFailureTime = Date.now();

    if (this.circuitState === 'half-open') {
      console.log('🔌 [Circuit Breaker] Opening circuit - half-open request failed');
      this.circuitState = 'open';
      return;
    }

    this.failureCount++;
    if (this.failureCount >= this.circuitConfig.failureThreshold) {
      console.log(`🔌 [Circuit Breaker] Opening circuit after ${this.failureCount} failures`);
      this.circuitState = 'open';
    }
  }

  /**
   * Get circuit breaker state
   */
  getCircuitState(): CircuitState {
    return this.circuitState;
  }

  /**
   * Reset circuit breaker
   */
  resetCircuit(): void {
    this.circuitState = 'closed';
    this.failureCount = 0;
    this.halfOpenSuccessCount = 0;
    console.log('🔌 [Circuit Breaker] Reset to closed state');
  }

  // ============================================================================
  // Queue Processing
  // ============================================================================

  /**
   * Process queue with concurrency limit and rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 || this.activeRequests > 0) {
      // Process up to MAX_CONCURRENT requests
      while (
        this.activeRequests < this.MAX_CONCURRENT &&
        this.queue.length > 0
      ) {
        // Check circuit breaker
        if (!this.canMakeRequest()) {
          console.log('🔌 [Circuit Breaker] Circuit open, waiting for recovery');
          await new Promise(resolve => 
            setTimeout(resolve, this.circuitConfig.recoveryTimeout / 2)
          );
          continue;
        }

        const request = this.queue.shift();
        if (!request) break;

        // Check if request was aborted while in queue
        if (request.signal?.aborted) {
          request.reject(new DOMException('Request aborted', 'AbortError'));
          continue;
        }

        this.activeRequests++;
        this.waitForRateLimit()
          .then(() => this.executeRequest(request))
          .catch(error => {
            request.reject(error);
            this.activeRequests--;
          });
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processing = false;
  }

  /**
   * Execute a request with retry logic
   */
  private async executeRequest<T>(queuedRequest: QueuedRequest<T>): Promise<void> {
    try {
      // Check abort signal
      if (queuedRequest.signal?.aborted) {
        throw new DOMException('Request aborted', 'AbortError');
      }

      const result = await queuedRequest.request();
      this.recordSuccess();
      queuedRequest.resolve(result);
    } catch (error: any) {
      // Handle abort errors
      if (error.name === 'AbortError') {
        queuedRequest.reject(error);
        return;
      }

      // Handle 429 rate limit errors with exponential backoff
      if (error.response?.status === 429) {
        this.recordFailure();

        if (queuedRequest.retryCount < this.MAX_RETRIES && !queuedRequest.signal?.aborted) {
          const backoffDelay = this.getBackoffDelay(queuedRequest.retryCount);
          console.log(
            `⏳ Rate limited (429), retrying in ${backoffDelay}ms (attempt ${queuedRequest.retryCount + 1}/${this.MAX_RETRIES})`,
          );

          await new Promise(resolve => setTimeout(resolve, backoffDelay));

          // Check abort signal after delay
          if (queuedRequest.signal?.aborted) {
            queuedRequest.reject(new DOMException('Request aborted', 'AbortError'));
            return;
          }

          // Re-queue with incremented retry count
          queuedRequest.retryCount++;
          this.queue.unshift(queuedRequest);
        } else {
          queuedRequest.reject(error);
        }
      } else if (error.response?.status >= 500) {
        // Server errors count towards circuit breaker
        this.recordFailure();
        queuedRequest.reject(error);
      } else {
        // Other errors don't affect circuit breaker
        queuedRequest.reject(error);
      }
    } finally {
      this.activeRequests--;
      // Continue processing queue
      this.processQueue();
    }
  }

  /**
   * Add request to queue with deduplication and abort support
   */
  async enqueue<T>(
    url: string,
    requestFn: () => Promise<T>,
    params?: any,
    data?: any,
    priority: number = 0,
    signal?: AbortSignal,
  ): Promise<T> {
    const requestId = this.getRequestId(url, params, data);

    // Check if aborted before starting
    if (signal?.aborted) {
      throw new DOMException('Request aborted', 'AbortError');
    }

    // Check circuit breaker
    if (!this.canMakeRequest()) {
      throw new Error('Circuit breaker is open - too many failures');
    }

    // Check if request is already pending
    if (this.pendingRequests.has(requestId)) {
      console.log(`🔄 Request deduplicated: ${url}`);
      return this.pendingRequests.get(requestId) as Promise<T>;
    }

    // Check cache
    const cached = this.getCachedRequest<T>(requestId);
    if (cached !== null) {
      console.log(`💾 Request cached: ${url}`);
      return Promise.resolve(cached);
    }

    // Create new request promise
    const requestPromise = new Promise<T>((resolve, reject) => {
      // Handle abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          // Remove from queue if still pending
          const index = this.queue.findIndex(r => r.id === requestId);
          if (index !== -1) {
            this.queue.splice(index, 1);
          }
          this.pendingRequests.delete(requestId);
          reject(new DOMException('Request aborted', 'AbortError'));
        }, {once: true});
      }

      const queuedRequest: QueuedRequest<T> = {
        id: requestId,
        url,
        request: async () => {
          // Check abort before executing
          if (signal?.aborted) {
            throw new DOMException('Request aborted', 'AbortError');
          }
          const result = await requestFn();
          this.setCachedRequest(requestId, result);
          return result;
        },
        resolve,
        reject,
        retryCount: 0,
        priority,
        signal,
      };

      // Add to queue (sorted by priority)
      if (priority > 0) {
        const insertIndex = this.queue.findIndex(r => r.priority < priority);
        if (insertIndex === -1) {
          this.queue.push(queuedRequest);
        } else {
          this.queue.splice(insertIndex, 0, queuedRequest);
        }
      } else {
        this.queue.push(queuedRequest);
      }

      // Start processing if not already
      this.processQueue();
    });

    // Track pending request
    this.pendingRequests.set(requestId, requestPromise);

    // Clean up after request completes
    requestPromise
      .finally(() => {
        this.pendingRequests.delete(requestId);
      })
      .catch(() => {
        // Ignore errors in cleanup
      });

    return requestPromise;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.requestCache.clear();
  }

  /**
   * Clear specific cache entry
   */
  clearCacheEntry(url: string, params?: any, data?: any): void {
    const requestId = this.getRequestId(url, params, data);
    this.requestCache.delete(requestId);
  }

  /**
   * Cancel all pending requests
   */
  cancelAll(): void {
    console.log('📛 [ApiQueue] Cancelling all pending requests');
    
    // Reject all queued requests
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        request.reject(new DOMException('Request cancelled', 'AbortError'));
      }
    }

    // Clear pending requests map
    this.pendingRequests.clear();
  }

  /**
   * Get queue status
   */
  getStatus(): {
    queueLength: number;
    activeRequests: number;
    pendingRequests: number;
    circuitState: CircuitState;
    failureCount: number;
  } {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      pendingRequests: this.pendingRequests.size,
      circuitState: this.circuitState,
      failureCount: this.failureCount,
    };
  }
}

// Singleton instance
export const apiQueue = new ApiQueue();
