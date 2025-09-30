/**
 * Request Deduplication Utility
 * Prevents duplicate concurrent requests by sharing a single pending promise
 * across multiple callers
 */
import { logger } from '../logger';

export class RequestDeduplicator {
  private pending = new Map<string, Promise<unknown>>();
  private stats = {
    hits: 0,
    misses: 0,
  };

  /**
   * Deduplicate a request by key
   * If a request with the same key is already pending, return that promise
   * Otherwise, execute the fetcher and cache the promise
   */
  async dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Check if request is already pending
    if (this.pending.has(key)) {
      this.stats.hits++;
      logger.debug({
        dedup_key: key,
        type: 'request_dedup_hit',
        total_hits: this.stats.hits,
      }, `Request deduplication hit: ${key}`);
      return this.pending.get(key) as Promise<T>;
    }

    // No pending request, execute fetcher
    this.stats.misses++;
    logger.debug({
      dedup_key: key,
      type: 'request_dedup_miss',
    }, `Request deduplication miss: ${key}`);

    const promise = fetcher()
      .finally(() => {
        // Clean up after request completes (success or failure)
        this.pending.delete(key);
      });

    this.pending.set(key, promise);
    return promise;
  }

  /**
   * Clear a specific key from pending requests
   */
  clear(key: string): void {
    this.pending.delete(key);
  }

  /**
   * Clear all pending requests
   */
  clearAll(): void {
    this.pending.clear();
  }

  /**
   * Get deduplication statistics
   */
  getStats() {
    return {
      ...this.stats,
      pending: this.pending.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
    };
  }

  /**
   * Get pending request keys
   */
  getPendingKeys(): string[] {
    return Array.from(this.pending.keys());
  }
}

// Global singleton instance
export const globalDeduplicator = new RequestDeduplicator();

/**
 * Helper function for easy deduplication
 */
export async function dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  return globalDeduplicator.dedupe(key, fetcher);
}

export default RequestDeduplicator;