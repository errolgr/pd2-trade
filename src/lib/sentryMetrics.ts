/**
 * Sentry Metrics Utility
 * Provides a safe wrapper for Sentry metrics that works with different Sentry SDK versions
 */
import * as Sentry from '@sentry/react';

interface MetricTags {
  [key: string]: string | number | boolean;
}

/**
 * Increment a counter metric
 */
export function incrementMetric(name: string, value: number = 1, tags?: MetricTags): void {
  try {
    // Try using metrics API if available (Sentry v8+)
    if (Sentry.metrics && typeof Sentry.metrics.count === 'function') {
      Sentry.metrics.count(name, value, tags ? { attributes: tags } : undefined);
      return;
    }
  } catch (e) {
    // Metrics API not available, fall back to breadcrumbs
  }
  
  // Fallback: Use breadcrumbs for tracking
  Sentry.addBreadcrumb({
    category: 'metric',
    message: name,
    level: 'info',
    data: {
      value,
      tags,
      type: 'count',
    },
  });
}

/**
 * Record a distribution metric
 */
export function distributionMetric(name: string, value: number, tags?: MetricTags): void {
  try {
    // Try using metrics API if available (Sentry v8+)
    if (Sentry.metrics && typeof Sentry.metrics.distribution === 'function') {
      Sentry.metrics.distribution(name, value, tags ? { attributes: tags } : undefined);
      return;
    }
  } catch (e) {
    // Metrics API not available, fall back to breadcrumbs
  }
  
  // Fallback: Use breadcrumbs for tracking
  Sentry.addBreadcrumb({
    category: 'metric',
    message: name,
    level: 'info',
    data: {
      value,
      tags,
      type: 'distribution',
    },
  });
}

/**
 * Record a gauge metric
 */
export function gaugeMetric(name: string, value: number, tags?: MetricTags): void {
  try {
    // Try using metrics API if available (Sentry v8+)
    if (Sentry.metrics && typeof Sentry.metrics.gauge === 'function') {
      Sentry.metrics.gauge(name, value, tags ? { attributes: tags } : undefined);
      return;
    }
  } catch (e) {
    // Metrics API not available, fall back to breadcrumbs
  }
  
  // Fallback: Use breadcrumbs for tracking
  Sentry.addBreadcrumb({
    category: 'metric',
    message: name,
    level: 'info',
    data: {
      value,
      tags,
      type: 'gauge',
    },
  });
}

