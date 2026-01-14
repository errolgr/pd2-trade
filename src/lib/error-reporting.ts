/**
 * Shared error reporting utilities for Sentry
 */

import * as Sentry from '@sentry/react';
import { AccountMismatchError } from '@/hooks/pd2website/usePD2Website';

/**
 * Report API errors to Sentry with proper grouping
 * Groups errors by HTTP status code and endpoint, not by request-specific identifiers
 *
 * @param error - The error that occurred
 * @param serviceName - Name of the service/API (e.g., 'price-api', 'user-api')
 * @param endpoint - The API endpoint that failed
 * @param statusCode - HTTP status code (optional, will be extracted from error message if not provided)
 * @param additionalContext - Additional context data to include (e.g., itemName, userId, etc.)
 */
export function reportApiError(
  error: Error,
  serviceName: string,
  endpoint: string,
  statusCode?: number,
  additionalContext?: Record<string, string | number | boolean | null | undefined>,
) {
  // Don't report AccountMismatchError to Sentry - these are expected user errors
  if (error instanceof AccountMismatchError) {
    return;
  }

  const statusCodeStr = statusCode
    ? String(statusCode)
    : error.message.match(/API error: (\d+)/i)?.[1] || error.message.match(/API Error: (\d+)/i)?.[1];
  const statusCodeNum = statusCodeStr ? parseInt(statusCodeStr, 10) : null;

  // Only report 5xx errors to Sentry (server errors)
  // 4xx errors (like 404) are expected and don't need to be reported
  if (statusCodeNum && statusCodeNum >= 500 && statusCodeStr) {
    Sentry.withScope((scope) => {
      // Set fingerprint to group by status code and endpoint, not by request-specific identifiers
      scope.setFingerprint(['api-error', serviceName, `status-${statusCodeStr}`, endpoint]);

      // Set generic tags for filtering
      scope.setTag('error_type', 'api_error');
      scope.setTag('service', serviceName);
      scope.setTag('status_code', statusCodeStr);
      scope.setTag('endpoint', endpoint);

      // Add additional context as tags for easy filtering (but doesn't affect grouping)
      if (additionalContext) {
        Object.entries(additionalContext).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            scope.setTag(key, String(value));
          }
        });
      }

      // Add comprehensive context data (visible in Sentry but doesn't affect grouping)
      if (additionalContext && Object.keys(additionalContext).length > 0) {
        const contextData: Record<string, string | number | boolean> = {};
        Object.entries(additionalContext).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            contextData[key] = value;
          }
        });
        scope.setContext('request_context', contextData);
      }

      // Create a generic error message but preserve the original error's stack trace
      const genericError = new Error(`${serviceName} ${statusCodeStr} error on ${endpoint}`);
      genericError.name = 'APIError';

      // Preserve the original error's stack trace if available
      if (error.stack) {
        genericError.stack = error.stack;
      }

      Sentry.captureException(genericError, {
        extra: {
          originalError: error.message,
          originalStack: error.stack,
          service: serviceName,
          endpoint: endpoint,
          statusCode: statusCodeStr,
          ...(additionalContext || {}),
        },
      });
    });
  }

  // Only log to console in non-production environments to avoid duplicate Sentry reports
  // (Sentry's captureConsoleIntegration captures console.error in production)
  if (process.env.NODE_ENV !== 'production') {
    const contextStr = additionalContext
      ? Object.entries(additionalContext)
          .filter(([_, value]) => value !== null && value !== undefined)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
      : '';
    const contextPrefix = contextStr ? `[${contextStr}] ` : '';
    console.error(`${contextPrefix}Error on ${endpoint}:`, error);
  }
}
