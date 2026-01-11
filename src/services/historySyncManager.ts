/**
 * History Sync Manager Service
 * Centralized sync orchestration with state machine, cancellation, and delta sync
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {DatabaseService} from '../database/DatabaseService';
import {
  getTransactionsAPI,
  getTransactionViaTicketCodeAPI,
  getTransactionsBulkAPI,
  sendTransactionAPI,
  sendTransactionsBulkAPI,
  checkTransactionsExistAPI,
} from '../helper/api';
import {convertToBets} from '../helper';
import {processBatch} from '../helper/batchProcessor';
import moment from 'moment';

// ============================================================================
// Types
// ============================================================================

export type SyncState =
  | 'idle'
  | 'loading_local'
  | 'fetching_server'
  | 'comparing'
  | 'saving'
  | 'uploading'
  | 'complete'
  | 'error'
  | 'cancelled';

export interface SyncParams {
  token: string;
  date: string;
  draw: number;
  type: number;
  keycode: string;
}

export interface SyncProgress {
  state: SyncState;
  message: string;
  processed: number;
  total: number;
  localCount: number;
  serverCount: number;
  savedCount: number;
  uploadedCount: number;
}

export interface SyncResult {
  success: boolean;
  transactions: any[];
  totalAmount: number;
  error?: string;
  aborted: boolean;
}

type SyncListener = (progress: SyncProgress) => void;

// ============================================================================
// Sync Manager Class
// ============================================================================

class HistorySyncManager {
  private state: SyncState = 'idle';
  private abortController: AbortController | null = null;
  private pendingSync: Promise<SyncResult> | null = null;
  private currentParams: SyncParams | null = null;
  private listeners: Set<SyncListener> = new Set();
  private progress: SyncProgress = this.getInitialProgress();

  // Cache for sync timestamps
  private syncTimestamps: Map<string, number> = new Map();
  private readonly SYNC_CACHE_KEY = 'history_sync_timestamps';
  private readonly STALE_THRESHOLD = 30000; // 30 seconds

  constructor() {
    this.loadSyncTimestamps();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Request a sync operation. Returns cached/local data immediately,
   * then syncs in background.
   */
  async requestSync(params: SyncParams): Promise<SyncResult> {
    const paramsKey = this.getParamsKey(params);

    // If already syncing with same params, return pending promise
    if (
      this.pendingSync &&
      this.currentParams &&
      this.getParamsKey(this.currentParams) === paramsKey
    ) {
      console.log('🔄 [SyncManager] Sync already in progress for same params, returning pending');
      return this.pendingSync;
    }

    // If syncing with different params, cancel current sync
    if (this.pendingSync && this.state !== 'idle') {
      console.log('🔄 [SyncManager] Cancelling previous sync for new params');
      this.cancel();
      // Wait a bit for cancellation to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Start new sync
    this.currentParams = params;
    this.abortController = new AbortController();
    this.pendingSync = this.performSync(params);

    return this.pendingSync;
  }

  /**
   * Cancel current sync operation
   */
  cancel(): void {
    if (this.abortController) {
      console.log('📛 [SyncManager] Cancelling sync');
      this.abortController.abort();
      this.setState('cancelled');
    }
  }

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return this.state;
  }

  /**
   * Get current progress
   */
  getProgress(): SyncProgress {
    return {...this.progress};
  }

  /**
   * Check if currently syncing
   */
  isSyncing(): boolean {
    return this.state !== 'idle' && this.state !== 'complete' && this.state !== 'error' && this.state !== 'cancelled';
  }

  /**
   * Subscribe to sync progress updates
   */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Immediately send current progress
    listener(this.progress);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Check if data is stale and needs refresh
   */
  isDataStale(params: SyncParams): boolean {
    const key = this.getParamsKey(params);
    const lastSync = this.syncTimestamps.get(key);
    if (!lastSync) return true;
    return Date.now() - lastSync > this.STALE_THRESHOLD;
  }

  /**
   * Get local transactions immediately (for optimistic UI)
   */
  async getLocalTransactions(params: SyncParams): Promise<{
    transactions: any[];
    totalAmount: number;
  }> {
    try {
      const db = DatabaseService.getInstance();
      const transactions = await db.getTransactions(
        params.date,
        params.draw,
        params.type,
      );

      const transArray = Array.isArray(transactions) ? transactions : [];
      const totalAmount = transArray.reduce(
        (sum, item) => sum + (item.total || 0),
        0,
      );

      return {transactions: transArray, totalAmount};
    } catch (error) {
      console.error('❌ [SyncManager] Error getting local transactions:', error);
      return {transactions: [], totalAmount: 0};
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getInitialProgress(): SyncProgress {
    return {
      state: 'idle',
      message: '',
      processed: 0,
      total: 0,
      localCount: 0,
      serverCount: 0,
      savedCount: 0,
      uploadedCount: 0,
    };
  }

  private getParamsKey(params: SyncParams): string {
    return `${params.date}_${params.draw}_${params.type}`;
  }

  private setState(state: SyncState, message: string = ''): void {
    this.state = state;
    this.progress = {
      ...this.progress,
      state,
      message,
    };
    this.notifyListeners();
  }

  private updateProgress(updates: Partial<SyncProgress>): void {
    this.progress = {...this.progress, ...updates};
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const progress = {...this.progress};
    this.listeners.forEach(listener => {
      try {
        listener(progress);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  private async loadSyncTimestamps(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.SYNC_CACHE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.syncTimestamps = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Error loading sync timestamps:', error);
    }
  }

  private async saveSyncTimestamp(key: string): Promise<void> {
    this.syncTimestamps.set(key, Date.now());
    try {
      const data = Object.fromEntries(this.syncTimestamps);
      await AsyncStorage.setItem(this.SYNC_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving sync timestamp:', error);
    }
  }

  private isAborted(): boolean {
    return this.abortController?.signal.aborted ?? false;
  }

  private checkAborted(): void {
    if (this.isAborted()) {
      throw new DOMException('Sync aborted', 'AbortError');
    }
  }

  // ============================================================================
  // Core Sync Logic
  // ============================================================================

  private async performSync(params: SyncParams): Promise<SyncResult> {
    const paramsKey = this.getParamsKey(params);
    const signal = this.abortController?.signal;

    try {
      console.log('🚀 [SyncManager] Starting sync:', paramsKey);
      this.progress = this.getInitialProgress();

      // Step 1: Load local transactions immediately
      this.setState('loading_local', 'Loading local transactions...');
      const {transactions: localTransactions} = await this.getLocalTransactions(params);
      const localTicketcodes = new Set(localTransactions.map((t: any) => t.ticketcode));

      this.updateProgress({localCount: localTransactions.length});
      console.log(`📊 [SyncManager] Found ${localTransactions.length} local transactions`);

      this.checkAborted();

      // Step 2: Fetch server transactions
      this.setState('fetching_server', 'Fetching from server...');
      const serverResponse = await getTransactionsAPI(
        params.token,
        params.date,
        params.draw,
        params.type,
        params.keycode,
      );

      this.checkAborted();

      // Parse server response
      let serverTicketcodes: string[] = [];
      let isTicketcodeOnly = false;

      if (Array.isArray(serverResponse)) {
        if (serverResponse.length > 0 && typeof serverResponse[0] === 'string') {
          isTicketcodeOnly = true;
          serverTicketcodes = serverResponse;
        } else {
          serverTicketcodes = serverResponse.map((t: any) => t.ticketcode).filter(Boolean);
        }
      }

      this.updateProgress({serverCount: serverTicketcodes.length});
      console.log(`📊 [SyncManager] Found ${serverTicketcodes.length} server transactions`);

      this.checkAborted();

      // Step 3: Compare and find missing
      this.setState('comparing', 'Finding missing transactions...');
      const missingTicketcodes = serverTicketcodes.filter(
        tc => typeof tc === 'string' && !localTicketcodes.has(tc),
      );
      const uniqueMissing = [...new Set(missingTicketcodes)];

      console.log(`📊 [SyncManager] ${uniqueMissing.length} transactions to fetch`);

      this.checkAborted();

      // Step 4: Fetch and save missing transactions
      let savedCount = 0;
      if (uniqueMissing.length > 0 && isTicketcodeOnly) {
        this.setState('saving', `Fetching ${uniqueMissing.length} transactions...`);

        savedCount = await this.fetchAndSaveMissing(
          params.token,
          uniqueMissing,
          signal,
        );
      }

      this.updateProgress({savedCount});

      this.checkAborted();

      // Step 4.5: CRITICAL - Reconcile local "unsynced" transactions that already exist on server
      // This fixes the issue where local transactions stay "unsynced" even though they're already on the server
      const reconciledCount = await this.reconcileAlreadySyncedTransactions(
        params,
        serverTicketcodes,
      );
      if (reconciledCount > 0) {
        console.log(`✅ [SyncManager] Reconciled ${reconciledCount} transactions that were already on server`);
      }

      this.checkAborted();

      // Step 5: Upload unsynced transactions (only those NOT already on server)
      this.setState('uploading', 'Uploading unsynced transactions...');
      const uploadedCount = await this.uploadUnsynced(params, signal, new Set(serverTicketcodes));
      this.updateProgress({uploadedCount});

      this.checkAborted();

      // Step 6: Get final transactions
      this.setState('complete', 'Sync complete');
      const {transactions: finalTransactions, totalAmount} =
        await this.getLocalTransactions(params);

      // Save sync timestamp
      await this.saveSyncTimestamp(paramsKey);

      console.log(
        `✅ [SyncManager] Sync complete: ${finalTransactions.length} transactions, total: ${totalAmount}`,
      );

      this.resetState();

      return {
        success: true,
        transactions: finalTransactions,
        totalAmount,
        aborted: false,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('📛 [SyncManager] Sync was aborted');
        this.setState('cancelled', 'Sync cancelled');
        
        // Return local data on abort
        const {transactions, totalAmount} = await this.getLocalTransactions(params);
        this.resetState();
        
        return {
          success: false,
          transactions,
          totalAmount,
          aborted: true,
        };
      }

      console.error('❌ [SyncManager] Sync error:', error);
      this.setState('error', error.message || 'Sync failed');

      // Return local data on error
      const {transactions, totalAmount} = await this.getLocalTransactions(params);
      this.resetState();

      return {
        success: false,
        transactions,
        totalAmount,
        error: error.message,
        aborted: false,
      };
    }
  }

  private async fetchAndSaveMissing(
    token: string,
    ticketcodes: string[],
    signal?: AbortSignal,
  ): Promise<number> {
    const db = DatabaseService.getInstance();
    let savedCount = 0;

    // Use bulk API for large batches
    if (ticketcodes.length >= 30) {
      console.log(`📦 [SyncManager] Using bulk API for ${ticketcodes.length} transactions`);

      const CHUNK_SIZE = 30;
      for (let i = 0; i < ticketcodes.length; i += CHUNK_SIZE) {
        if (signal?.aborted) break;

        const chunk = ticketcodes.slice(i, i + CHUNK_SIZE);

        try {
          const transactions = await getTransactionsBulkAPI(token, chunk);

          if (Array.isArray(transactions)) {
            for (const tx of transactions) {
              if (signal?.aborted) break;
              if (tx && tx.ticketcode) {
                const saved = await this.saveTransaction(db, tx);
                if (saved) savedCount++;
              }
            }
          }

          this.updateProgress({
            processed: Math.min(i + CHUNK_SIZE, ticketcodes.length),
            total: ticketcodes.length,
          });

          // Delay between chunks
          if (i + CHUNK_SIZE < ticketcodes.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`❌ [SyncManager] Bulk fetch error for chunk ${i}:`, error);
          // Continue with next chunk
        }
      }
    } else {
      // Use individual requests for small batches
      console.log(`📦 [SyncManager] Using individual requests for ${ticketcodes.length} transactions`);

      const result = await processBatch({
        items: ticketcodes,
        processor: async (ticketcode: string) => {
          const tx = await getTransactionViaTicketCodeAPI(token, ticketcode);
          if (tx && tx.ticketcode) {
            const saved = await this.saveTransaction(db, tx);
            return saved;
          }
          return false;
        },
        concurrency: 2,
        delayBetweenBatches: 500,
        signal,
        onProgress: (processed, total) => {
          this.updateProgress({processed, total});
        },
      });

      savedCount = result.results.filter(Boolean).length;
    }

    return savedCount;
  }

  private async saveTransaction(db: DatabaseService, tx: any): Promise<boolean> {
    try {
      // Check if already exists
      const existing = await db.getTransactionByTicketCode(tx.ticketcode);
      if (existing) {
        console.log(`ℹ️ Transaction ${tx.ticketcode} already exists`);
        return false;
      }

      const bets = convertToBets(tx.trans_data);
      if (!Array.isArray(bets) || bets.length === 0) {
        return false;
      }

      const total = bets.reduce((sum: number, bet: any) => {
        return sum + (Number(bet.targetAmount) || 0) + (Number(bet.rambolAmount) || 0);
      }, 0);

      const newTransaction = {
        ...tx,
        status: 'synced',
        total,
        created_at: moment(tx.printed_at).format('YYYY-MM-DD HH:mm:ss'),
        bets,
        trans_data: tx.trans_data,
        trans_no: tx.trans_no || 1,
      };

      await db.insertTransaction(newTransaction, bets);
      return true;
    } catch (error) {
      console.error(`❌ Error saving transaction ${tx.ticketcode}:`, error);
      return false;
    }
  }

  /**
   * CRITICAL: Reconcile local "unsynced" transactions that already exist on server
   * This fixes the issue where transactions stay "unsynced" even though they're already synced
   */
  private async reconcileAlreadySyncedTransactions(
    params: SyncParams,
    serverTicketcodes: string[],
  ): Promise<number> {
    const db = DatabaseService.getInstance();

    try {
      // Get all unsynced transactions for this date/draw/type
      const unsyncedTransactions = await db.getUnsyncedTransactionsBatch(
        params.date,
        params.draw,
        params.type,
        1000, // Get all unsynced
        0,
      );

      if (unsyncedTransactions.length === 0) {
        return 0;
      }

      // Find which unsynced transactions already exist on server
      const serverTicketcodeSet = new Set(serverTicketcodes);
      const alreadySyncedCodes = unsyncedTransactions
        .filter((tx: any) => serverTicketcodeSet.has(tx.ticketcode))
        .map((tx: any) => tx.ticketcode);

      if (alreadySyncedCodes.length > 0) {
        console.log(
          `🔄 [SyncManager] Found ${alreadySyncedCodes.length} local "unsynced" transactions that are already on server`,
        );

        // Mark them as synced
        await db.updateTransactionStatusBatch(alreadySyncedCodes, 'synced');
        console.log(`✅ [SyncManager] Marked ${alreadySyncedCodes.length} transactions as synced`);
      }

      return alreadySyncedCodes.length;
    } catch (error) {
      console.error('❌ [SyncManager] Error reconciling transactions:', error);
      return 0;
    }
  }

  private async uploadUnsynced(
    params: SyncParams,
    signal?: AbortSignal,
    serverTicketcodes?: Set<string>,
  ): Promise<number> {
    const db = DatabaseService.getInstance();

    try {
      const unsyncedCount = await db.getUnsyncedTransactionsCount(
        params.date,
        params.draw,
        params.type,
      );

      if (unsyncedCount === 0) {
        console.log('📤 [SyncManager] No unsynced transactions to upload');
        return 0;
      }

      console.log(`📤 [SyncManager] Uploading ${unsyncedCount} unsynced transactions`);

      const BATCH_SIZE = 20;
      let uploadedCount = 0;
      let skippedCount = 0;

      for (let offset = 0; offset < unsyncedCount; offset += BATCH_SIZE) {
        if (signal?.aborted) break;

        const batch = await db.getUnsyncedTransactionsBatch(
          params.date,
          params.draw,
          params.type,
          BATCH_SIZE,
          offset,
        );

        if (batch.length === 0) break;

        // Process each transaction
        const successfulCodes: string[] = [];
        const alreadyOnServerCodes: string[] = [];

        for (const tx of batch) {
          if (signal?.aborted) break;

          // CRITICAL: Skip if this transaction is already on server
          if (serverTicketcodes && serverTicketcodes.has(tx.ticketcode)) {
            console.log(`ℹ️ [SyncManager] Skipping ${tx.ticketcode} - already on server`);
            alreadyOnServerCodes.push(tx.ticketcode);
            skippedCount++;
            continue;
          }

          try {
            const bets = await db.getBetsByTransaction(tx.id);
            const total = Array.isArray(bets)
              ? bets.reduce((sum, bet: any) => {
                  return sum + (Number(bet.targetAmount) || 0) + (Number(bet.rambolAmount) || 0);
                }, 0)
              : 0;

            const payload = {
              ...tx,
              status: 'VALID',
              gateway: 'Retrofit',
              keycode: params.keycode,
              remarks: '',
              printed_at: tx.created_at,
              declared_gross: total,
              bets,
            };

            const response = await sendTransactionAPI(params.token, payload);
            // Validate response has success: true, not just that response exists
            if (response?.success === true) {
              successfulCodes.push(tx.ticketcode);
              uploadedCount++;
            } else if (response) {
              // Response exists but success !== true - log the failure
              console.warn(`⚠️ [SyncManager] Server rejected ${tx.ticketcode}:`, response.message || 'Unknown error');
            }
          } catch (error: any) {
            // If server returns 409 Conflict or indicates duplicate, mark as synced
            if (error?.response?.status === 409 || 
                error?.message?.toLowerCase().includes('duplicate') ||
                error?.message?.toLowerCase().includes('already exists')) {
              console.log(`ℹ️ [SyncManager] ${tx.ticketcode} already exists on server (conflict)`);
              alreadyOnServerCodes.push(tx.ticketcode);
            } else {
              console.error(`❌ Error uploading ${tx.ticketcode}:`, error);
            }
          }
        }

        // Update status for successful uploads
        if (successfulCodes.length > 0) {
          await db.updateTransactionStatusBatch(successfulCodes, 'synced');
        }

        // Also mark transactions that were already on server as synced
        if (alreadyOnServerCodes.length > 0) {
          await db.updateTransactionStatusBatch(alreadyOnServerCodes, 'synced');
        }

        this.updateProgress({
          uploadedCount,
        });

        // Delay between batches
        if (offset + BATCH_SIZE < unsyncedCount) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (skippedCount > 0) {
        console.log(`📤 [SyncManager] Skipped ${skippedCount} transactions already on server`);
      }

      return uploadedCount;
    } catch (error) {
      console.error('❌ [SyncManager] Error uploading unsynced:', error);
      return 0;
    }
  }

  private resetState(): void {
    this.pendingSync = null;
    this.abortController = null;
    this.currentParams = null;
    this.state = 'idle';
  }

  /**
   * Reconcile local "synced" transactions against server
   * Finds transactions marked as synced locally but missing from server
   * Resets their status to "printed" for re-upload
   *
   * @param token - Auth token
   * @param onProgress - Optional callback for progress updates
   * @returns Object with counts of checked, missing, and fixed transactions
   */
  async reconcileSyncedTransactions(
    token: string,
    onProgress?: (progress: {checked: number; total: number; missing: number}) => void,
  ): Promise<{checked: number; missing: number; fixed: number}> {
    const BATCH_SIZE = 500; // Server accepts up to 1000, use 500 for safety
    const db = DatabaseService.getInstance();

    try {
      console.log('🔄 [Reconcile] Starting reconciliation...');

      // Get all locally "synced" ticketcodes
      const syncedTransactions = await db.getTransactionsByStatus('synced');
      const allTicketcodes = syncedTransactions.map(t => t.ticketcode);
      const total = allTicketcodes.length;

      if (total === 0) {
        console.log('✅ [Reconcile] No synced transactions to check');
        return {checked: 0, missing: 0, fixed: 0};
      }

      console.log(`📊 [Reconcile] Checking ${total} synced transactions...`);

      const missingCodes: string[] = [];
      let checked = 0;

      // Process in batches
      for (let i = 0; i < allTicketcodes.length; i += BATCH_SIZE) {
        const batch = allTicketcodes.slice(i, i + BATCH_SIZE);

        try {
          const response = await checkTransactionsExistAPI(token, batch);

          if (response?.success && Array.isArray(response.existing)) {
            const existingSet = new Set(response.existing);
            // Find codes in this batch that don't exist on server
            for (const code of batch) {
              if (!existingSet.has(code)) {
                missingCodes.push(code);
              }
            }
          }
        } catch (error) {
          console.error(`❌ [Reconcile] Batch check failed:`, error);
          // Continue with next batch rather than failing entirely
        }

        checked += batch.length;
        onProgress?.({checked, total, missing: missingCodes.length});
      }

      // Reset missing transactions to "printed" for re-sync
      let fixed = 0;
      if (missingCodes.length > 0) {
        console.log(`⚠️ [Reconcile] Found ${missingCodes.length} missing transactions, resetting status...`);
        await db.updateTransactionStatusBatch(missingCodes, 'printed');
        fixed = missingCodes.length;
      }

      console.log(`✅ [Reconcile] Complete: checked=${checked}, missing=${missingCodes.length}, fixed=${fixed}`);
      return {checked, missing: missingCodes.length, fixed};
    } catch (error) {
      console.error('❌ [Reconcile] Error during reconciliation:', error);
      throw error;
    }
  }
}

// Singleton instance
export const historySyncManager = new HistorySyncManager();
