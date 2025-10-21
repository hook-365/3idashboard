/**
 * Request Manager - Debouncing and Request Optimization
 * Prevents duplicate requests and implements intelligent caching
 */

import logger from '@/lib/logger';

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  abortController?: AbortController;
}

interface RequestOptions {
  debounceMs?: number;
  cacheMs?: number;
  retryCount?: number;
  retryDelay?: number;
  timeout?: number;
}

class RequestManager {
  private pendingRequests = new Map<string, PendingRequest>();
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Make a debounced request
   * Prevents duplicate requests within the debounce window
   */
  async debouncedRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      debounceMs = 300,
      cacheMs = 5000,
      retryCount = 2,
      retryDelay = 1000,
      timeout = 10000,
    } = options;

    // Clear any existing debounce timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Return promise that resolves after debounce delay
    return new Promise((resolve, reject) => {
      const timer = setTimeout(async () => {
        try {
          const result = await this.makeRequest(key, requestFn, {
            cacheMs,
            retryCount,
            retryDelay,
            timeout,
          });
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.debounceTimers.delete(key);
        }
      }, debounceMs);

      this.debounceTimers.set(key, timer);
    });
  }

  /**
   * Make a request with deduplication
   * Multiple calls with the same key will return the same promise
   */
  async deduplicatedRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: RequestOptions = {}
  ): Promise<T> {
    const { cacheMs = 5000 } = options;

    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending) {
      logger.debug({ key }, 'Returning pending request');
      return pending.promise;
    }

    // Check cache
    const cached = this.getCached(key, cacheMs);
    if (cached !== null) {
      logger.debug({ key }, 'Returning cached response');
      return cached;
    }

    // Make new request
    return this.makeRequest(key, requestFn, options);
  }

  /**
   * Make the actual request with retry logic
   */
  private async makeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: RequestOptions
  ): Promise<T> {
    const { cacheMs = 5000, retryCount = 2, retryDelay = 1000, timeout = 10000 } = options;

    // Create abort controller for timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    // Create promise with timeout
    const promise = this.withRetry(
      async () => {
        try {
          // Pass abort signal if the request function supports it
          const result = await requestFn();
          clearTimeout(timeoutId);
          return result;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      },
      retryCount,
      retryDelay
    );

    // Store as pending
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
      abortController,
    });

    try {
      const result = await promise;

      // Cache successful result
      this.requestCache.set(key, {
        data: result,
        timestamp: Date.now(),
      });

      logger.debug({ key }, 'Request completed successfully');
      return result;
    } catch (error) {
      logger.error({ key, error }, 'Request failed');
      throw error;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Retry logic for failed requests
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    retries: number,
    delay: number
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }

      logger.debug({ retriesLeft: retries }, 'Retrying request');
      await this.sleep(delay);
      return this.withRetry(fn, retries - 1, delay * 1.5); // Exponential backoff
    }
  }

  /**
   * Get cached response if still fresh
   */
  private getCached(key: string, maxAge: number): any | null {
    const cached = this.requestCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > maxAge) {
      this.requestCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Cancel a pending request
   */
  cancelRequest(key: string): boolean {
    const pending = this.pendingRequests.get(key);
    if (pending?.abortController) {
      pending.abortController.abort();
      this.pendingRequests.delete(key);
      logger.debug({ key }, 'Request cancelled');
      return true;
    }
    return false;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.requestCache.clear();
    logger.debug('Request cache cleared');
  }

  /**
   * Clear specific cache entry
   */
  clearCacheEntry(key: string): boolean {
    return this.requestCache.delete(key);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    pendingRequests: number;
    cachedResponses: number;
    debounceTimers: number;
  } {
    return {
      pendingRequests: this.pendingRequests.size,
      cachedResponses: this.requestCache.size,
      debounceTimers: this.debounceTimers.size,
    };
  }

  /**
   * Batch multiple requests
   */
  async batchRequests<T>(
    requests: Array<{ key: string; fn: () => Promise<T> }>,
    options: RequestOptions = {}
  ): Promise<T[]> {
    const promises = requests.map(({ key, fn }) =>
      this.deduplicatedRequest(key, fn, options)
    );

    return Promise.all(promises);
  }

  /**
   * Request with automatic batching
   */
  private batchQueue = new Map<string, Array<{ resolve: Function; reject: Function }>>();
  private batchTimers = new Map<string, NodeJS.Timeout>();

  async batchedRequest<T>(
    batchKey: string,
    itemKey: string,
    batchFn: (keys: string[]) => Promise<Map<string, T>>,
    batchDelay = 50
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Add to batch queue
      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, []);
      }

      const queue = this.batchQueue.get(batchKey)!;
      queue.push({ resolve, reject });

      // Clear existing timer
      const existingTimer = this.batchTimers.get(batchKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer to execute batch
      const timer = setTimeout(async () => {
        const currentQueue = this.batchQueue.get(batchKey) || [];
        this.batchQueue.delete(batchKey);
        this.batchTimers.delete(batchKey);

        if (currentQueue.length === 0) return;

        try {
          // Execute batch function
          const keys = currentQueue.map((_, index) => `${itemKey}_${index}`);
          const results = await batchFn(keys);

          // Resolve individual promises
          currentQueue.forEach((item, index) => {
            const result = results.get(`${itemKey}_${index}`);
            if (result !== undefined) {
              item.resolve(result);
            } else {
              item.reject(new Error('No result for batch item'));
            }
          });
        } catch (error) {
          // Reject all promises
          currentQueue.forEach(item => item.reject(error));
        }
      }, batchDelay);

      this.batchTimers.set(batchKey, timer);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const requestManager = new RequestManager();

// Export convenience functions
export function debouncedFetch<T>(
  url: string,
  options?: RequestInit & RequestOptions
): Promise<T> {
  const { debounceMs, cacheMs, retryCount, retryDelay, timeout, ...fetchOptions } = options || {};

  return requestManager.debouncedRequest(
    url,
    async () => {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    { debounceMs, cacheMs, retryCount, retryDelay, timeout }
  );
}

export function deduplicatedFetch<T>(
  url: string,
  options?: RequestInit & RequestOptions
): Promise<T> {
  const { cacheMs, retryCount, retryDelay, timeout, ...fetchOptions } = options || {};

  return requestManager.deduplicatedRequest(
    url,
    async () => {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    { cacheMs, retryCount, retryDelay, timeout }
  );
}