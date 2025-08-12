import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import {appConfig} from '../config/appConfig';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  error?: string;
}

export interface BetType {
  id: number;
  bettype: string;
  bettypeid: number;
  limits: number;
  capping: number;
  wintar: number;
  winram: number;
  winram2: number;
  draws: Array<{
    start: string;
    end: string;
  }>;
}

export interface SoldOut {
  id: number;
  combination: string;
  is_target: number;
  status: string;
}

export interface Transaction {
  id: number;
  ticketcode: string;
  betdate: string;
  bettime: number;
  bettypeid: number;
  total: number;
  status: string;
  created_at: string;
}

export interface Result {
  id: number;
  bettypeid: number;
  result: string;
  betdate: string;
  bettime: number;
  created_at: string;
}

// Extend Axios config to include retryCount
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  retryCount?: number;
}

// ============================================================================
// API CLIENT CONFIGURATION
// ============================================================================

class ApiClient {
  private client: AxiosInstance;
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second

  constructor() {
    this.client = axios.create({
      baseURL: appConfig.apiUrl,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      config => {
        console.log(
          `🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`,
        );
        if (config.params) {
          console.log('📋 Query Params:', config.params);
        }
        if (config.data) {
          console.log('📦 Request Body:', config.data);
        }
        return config;
      },
      error => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(
          `✅ API Response: ${response.status} ${response.config.url}`,
        );
        return response;
      },
      async (error: AxiosError) => {
        console.error(
          `❌ API Error: ${error.response?.status} ${error.config?.url}`,
        );

        // Retry logic for network errors
        if (error.code === 'ECONNABORTED' || !error.response) {
          const config = error.config as ExtendedAxiosRequestConfig;
          const currentRetryCount = config?.retryCount || 0;
          if (config && currentRetryCount < this.retryAttempts) {
            config.retryCount = currentRetryCount + 1;
            console.log(
              `🔄 Retrying request (${config.retryCount}/${this.retryAttempts})...`,
            );

            await new Promise(resolve =>
              setTimeout(resolve, this.retryDelay * config.retryCount),
            );
            return this.client.request(config);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  private createHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
    } as any; // Type assertion to avoid AxiosHeaders complexity
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    token: string,
    data?: any,
    params?: any,
  ): Promise<T> {
    try {
      const config: ExtendedAxiosRequestConfig = {
        method,
        url,
        headers: this.createHeaders(token),
        retryCount: 0,
      };

      if (data) config.data = data;
      if (params) config.params = params;

      const response = await this.client.request(config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  private handleError(error: any) {
    if (error.response) {
      // Server responded with error status
      console.error('Server Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error: No response received');
    } else {
      // Something else happened
      console.error('Request Error:', error.message);
    }
  }

  // ============================================================================
  // API METHODS
  // ============================================================================

  async syncBetTypes(token: string): Promise<BetType[]> {
    return this.makeRequest<BetType[]>('GET', 'betTypes', token);
  }

  async getSoldOuts(token: string): Promise<SoldOut[]> {
    return this.makeRequest<SoldOut[]>('GET', 'soldOuts', token);
  }

  async checkSoldOut(token: string, transData: string): Promise<ApiResponse> {
    return this.makeRequest<ApiResponse>(
      'POST',
      'transactions/checkBets',
      token,
      {trans_data: transData},
    );
  }

  async getTransactions(
    token: string,
    date: string,
    draw: number,
    type: number,
    keycode?: string,
  ): Promise<Transaction[]> {
    const url = keycode
      ? `transactions/${keycode}/betTypes/${type}`
      : `transactions`;
    const params = {date, draw, type};
    return this.makeRequest<Transaction[]>(
      'GET',
      url,
      token,
      undefined,
      params,
    );
  }

  async sendTransaction(token: string, transaction: any): Promise<ApiResponse> {
    return this.makeRequest<ApiResponse>(
      'POST',
      'transactions',
      token,
      transaction,
    );
  }

  async getTransactionByTicketCode(
    token: string,
    ticketcode: string,
  ): Promise<Transaction> {
    return this.makeRequest<Transaction>(
      'GET',
      `transactions/${ticketcode}`,
      token,
    );
  }

  async syncResult(
    token: string,
    type: number,
    draw: number,
    date: string,
  ): Promise<Result | null> {
    try {
      const result = await this.makeRequest<Result>(
        'GET',
        `results/${type}/draws/${draw}`,
        token,
        undefined,
        {date},
      );

      // Return null if response is empty object
      return JSON.stringify(result) !== '{}' ? result : null;
    } catch (error) {
      console.error('Error fetching results:', error);
      throw error;
    }
  }

  async checkTransaction(
    ticketcode: string,
    token: string,
  ): Promise<any | null> {
    try {
      const result = await this.makeRequest<any>(
        'GET',
        `transactions/scan/${ticketcode}`,
        token,
      );

      // Return null if response is empty object
      return JSON.stringify(result) !== '{}' ? result : null;
    } catch (error) {
      console.error('Error checking transaction:', error);
      throw error;
    }
  }
}

// ============================================================================
// INSTANCE & EXPORTS
// ============================================================================

const apiClient = new ApiClient();

// Export the client instance for direct use
export {apiClient};

// Export individual methods for backward compatibility
export const syncBetTypesAPI = (token: string) => apiClient.syncBetTypes(token);
export const getSoldOutsAPI = (token: string) => apiClient.getSoldOuts(token);
export const checkSoldOutAPI = (token: string, transData: string) =>
  apiClient.checkSoldOut(token, transData);
export const getTransactionsAPI = (
  token: string,
  date: string,
  draw: number,
  type: number,
  keycode?: string,
) => apiClient.getTransactions(token, date, draw, type, keycode);
export const sendTransactionAPI = (token: string, transaction: any) =>
  apiClient.sendTransaction(token, transaction);
export const getTransactionViaTicketCodeAPI = (
  token: string,
  ticketcode: string,
) => apiClient.getTransactionByTicketCode(token, ticketcode);
export const syncResultAPI = (
  token: string,
  type: number,
  draw: number,
  date: string,
) => apiClient.syncResult(token, type, draw, date);
export const checkTransactionAPI = (ticketcode: string, token: string) =>
  apiClient.checkTransaction(ticketcode, token);
