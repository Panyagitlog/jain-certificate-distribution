import { LOG_LEVEL, LOG_LEVELS, ERROR_CODES } from './constants';

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(ERROR_CODES.VALIDATION_FAILED, message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * File error
 */
export class FileError extends AppError {
  constructor(message: string, code: string = ERROR_CODES.INVALID_FILE) {
    super(code, message, 400);
    this.name = 'FileError';
  }
}

/**
 * Network error
 */
export class NetworkError extends AppError {
  constructor(message: string = 'Network error') {
    super(ERROR_CODES.NETWORK_ERROR, message, 500);
    this.name = 'NetworkError';
  }
}

/**
 * Centralized logging system
 */
class Logger {
  private isDev = import.meta.env.MODE === 'development';

  private formatTime(): string {
    return new Date().toISOString();
  }

  private shouldLog(level: number): boolean {
    return level >= LOG_LEVEL;
  }

  private formatMessage(
    level: string,
    message: string,
    data?: any
  ): string {
    const timestamp = this.formatTime();
    let formatted = `[${timestamp}] [${level}] ${message}`;

    if (data) {
      formatted += `\n${JSON.stringify(data, null, 2)}`;
    }

    return formatted;
  }

  /**
   * Debug log
   */
  debug(message: string, data?: any): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }

  /**
   * Info log
   */
  info(message: string, data?: any): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.info(this.formatMessage('INFO', message, data));
    }
  }

  /**
   * Warning log
   */
  warn(message: string, data?: any): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  /**
   * Error log
   */
  error(message: string, error?: Error | any, data?: any): void {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      let fullMessage = message;

      if (error instanceof Error) {
        fullMessage += `\n${error.name}: ${error.message}\n${error.stack}`;
      } else if (error) {
        fullMessage += `\n${JSON.stringify(error, null, 2)}`;
      }

      console.error(this.formatMessage('ERROR', fullMessage, data));

      // In production, send error to monitoring service
      if (!this.isDev) {
        this.sendToMonitoring(message, error, data);
      }
    }
  }

  /**
   * Send error to external monitoring service (Sentry, etc.)
   */
  private sendToMonitoring(message: string, error?: any, data?: any): void {
    // Placeholder for error tracking integration
    // Example: Sentry.captureException(error);
    console.debug('Error would be sent to monitoring service:', {
      message,
      error,
      data,
    });
  }

  /**
   * Log API request
   */
  logApiRequest(method: string, url: string, data?: any): void {
    this.debug(`API Request: ${method} ${url}`, data);
  }

  /**
   * Log API response
   */
  logApiResponse(method: string, url: string, status: number, data?: any): void {
    this.debug(`API Response: ${method} ${url} (${status})`, data);
  }

  /**
   * Log API error
   */
  logApiError(
    method: string,
    url: string,
    status: number,
    error: any
  ): void {
    this.error(`API Error: ${method} ${url} (${status})`, error);
  }
}

export const logger = new Logger();

/**
 * Error handler middleware
 */
export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    logger.error(error.message, error);
    return error;
  }

  if (error instanceof Error) {
    logger.error(error.message, error);

    // Handle specific error types
    if (error.name === 'TypeError') {
      return new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred',
        500,
        error
      );
    }

    if (error.message.includes('Network')) {
      return new NetworkError(error.message);
    }

    return new AppError(
      ERROR_CODES.INTERNAL_ERROR,
      error.message,
      500,
      error
    );
  }

  logger.error('Unknown error', error);
  return new AppError(
    ERROR_CODES.INTERNAL_ERROR,
    'An unknown error occurred',
    500,
    error
  );
}

/**
 * Async error wrapper for Express-like error handling
 */
export function asyncHandler(
  fn: (...args: any[]) => Promise<any>
) {
  return async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleError(error);
    }
  };
}

/**
 * Error boundary helper
 */
export function createErrorBoundary(onError?: (error: Error) => void) {
  return (error: Error, errorInfo: React.ErrorInfo) => {
    logger.error('React Error Boundary caught:', error, errorInfo);

    if (onError) {
      onError(error);
    }
  };
}

/**
 * Retry logic for failed operations
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        if (onRetry) {
          onRetry(attempt, lastError);
        }

        logger.warn(`Retry attempt ${attempt}/${maxAttempts}`, {
          error: lastError.message,
          nextDelay: delay,
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }

  throw lastError || new Error('Max retry attempts reached');
}

/**
 * Validation helper
 */
export function validate<T>(
  data: any,
  schema: Record<string, (value: any) => { valid: boolean; error?: string }>
): T {
  const errors: Record<string, string> = {};

  for (const [field, validator] of Object.entries(schema)) {
    const result = validator(data[field]);
    if (!result.valid && result.error) {
      errors[field] = result.error;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return data;
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(
  json: string,
  fallback: T,
  onError?: (error: Error) => void
): T {
  try {
    return JSON.parse(json);
  } catch (error) {
    if (onError && error instanceof Error) {
      onError(error);
    }
    logger.warn('JSON parse error, using fallback', { json });
    return fallback;
  }
}

/**
 * Check if error is a specific type
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Error message formatter for UI
 */
export function formatErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

/**
 * Error details for debugging
 */
export function getErrorDetails(error: unknown): Record<string, any> {
  if (isAppError(error)) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    error: String(error),
    type: typeof error,
  };
}

/**
 * Throw if not valid
 */
export function throwIfInvalid(condition: boolean, message: string): void {
  if (!condition) {
    throw new ValidationError(message);
  }
}

/**
 * Assert value is not null/undefined
 */
export function assertNotNull<T>(
  value: T | null | undefined,
  message: string
): T {
  if (value === null || value === undefined) {
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      message,
      400
    );
  }
  return value;
}
