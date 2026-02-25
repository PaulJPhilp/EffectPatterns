/**
 * Deployment Test Client
 *
 * HTTP client for testing deployed API endpoints.
 */

import { DeploymentConfig } from "./environment-config";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface ApiResponse<T = unknown> {
  status: number;
  statusText: string;
  data: T;
  headers: Record<string, string>;
  duration: number;
}

/**
 * Deployment Test Client
 */
export class DeploymentClient {
  private config: DeploymentConfig;

  constructor(config: DeploymentConfig) {
    this.config = config;
  }

  /**
   * Make HTTP request to deployed API
   */
  async request<T = unknown>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const method = options.method || "GET";
    const timeout = options.timeout || this.config.timeout;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add API key if available
    if (this.config.apiKey) {
      headers["x-api-key"] = this.config.apiKey;
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(timeout),
    };

    if (options.body && method !== "GET") {
      requestOptions.body = JSON.stringify(options.body);
    }

      const startTime = Date.now();

    try {
      const response = await fetch(url, requestOptions);
      const duration = Date.now() - startTime;

      // Read body as text first to avoid "Body is unusable" error
      const text = await response.text();
      
      let data: T;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          data = JSON.parse(text) as T;
        } catch {
          // If JSON parsing fails, use text as-is
          data = text as unknown as T;
        }
      } else {
        // Non-JSON response, use text as-is
        data = text as unknown as T;
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        statusText: response.statusText,
        data,
        headers: responseHeaders,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          `Failed to connect to ${this.config.name} after ${duration}ms: ${error.message}`,
        );
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(
    endpoint: string,
    options?: Omit<RequestOptions, "method" | "body">,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  }

  /**
   * Check if API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get("/api/health");
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Search patterns
   */
  async searchPatterns(
    query: string,
    limit: number = 10,
  ): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (query) params.append("q", query);
    params.append("limit", String(limit));

    return this.get(`/api/patterns?${params}`);
  }

  /**
   * Get pattern by ID
   */
  async getPattern(id: string): Promise<ApiResponse> {
    return this.get(`/api/patterns/${encodeURIComponent(id)}`);
  }

  /**
   * Analyze code
   */
  async analyzeCode(source: string, filename?: string): Promise<ApiResponse> {
    return this.post("/api/analyze-code", {
      source,
      filename,
      analysisType: "all",
    });
  }

  /**
   * Review code
   */
  async reviewCode(code: string, filePath?: string): Promise<ApiResponse> {
    return this.post("/api/review-code", {
      code,
      filePath,
    });
  }

  /**
   * List analysis rules
   */
  async listRules(): Promise<ApiResponse> {
    return this.post("/api/list-rules", {});
  }

  /**
   * Generate pattern code
   */
  async generatePattern(
    patternId: string,
    variables?: Record<string, string>,
  ): Promise<ApiResponse> {
    return this.post("/api/generate-pattern", {
      patternId,
      variables: variables || {},
    });
  }

  /**
   * Analyze consistency across files
   */
  async analyzeConsistency(
    files: Array<{ filename: string; source: string }>,
  ): Promise<ApiResponse> {
    return this.post("/api/analyze-consistency", { files });
  }

  /**
   * Apply refactoring
   */
  async applyRefactoring(
    refactoringIds: string[],
    files: Array<{ filename: string; source: string }>,
    preview: boolean = true,
  ): Promise<ApiResponse> {
    return this.post("/api/apply-refactoring", {
      refactoringIds,
      files,
      preview,
    });
  }

  /**
   * Get environment info
   */
  getEnvironmentInfo() {
    return {
      environment: this.config.name,
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout,
    };
  }
}

/**
 * Create deployment client for given config
 */
export function createDeploymentClient(
  config: DeploymentConfig,
): DeploymentClient {
  return new DeploymentClient(config);
}
