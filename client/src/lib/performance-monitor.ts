/**
 * Performance monitoring utility for tracking bundle sizes, load times, and optimization metrics
 */

interface PerformanceMetrics {
  bundleSize?: number;
  loadTime?: number;
  timestamp: number;
  route?: string;
  chunkName?: string;
}

interface ComponentLoadMetric {
  name: string;
  loadTime: number;
  size?: number;
  cached: boolean;
  timestamp: number;
}

interface BundleInfo {
  name: string;
  size: number;
  compressed: boolean;
  loadTime?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private componentMetrics: ComponentLoadMetric[] = [];
  private observer?: PerformanceObserver;

  constructor() {
    this.initializeObserver();
    this.trackInitialPageLoad();
  }

  /**
   * Initialize Performance Observer to track resource loading
   */
  private initializeObserver() {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.processPerformanceEntry(entry);
        });
      });

      try {
        this.observer.observe({ 
          entryTypes: ['resource', 'navigation', 'measure'] 
        });
      } catch (error) {
        console.warn('Performance Observer not fully supported:', error);
      }
    }
  }

  /**
   * Process individual performance entries
   */
  private processPerformanceEntry(entry: PerformanceEntry) {
    if (entry.entryType === 'resource') {
      const resourceEntry = entry as PerformanceResourceTiming;
      
      // Track JS chunk loading
      if (resourceEntry.name.includes('.js') && resourceEntry.name.includes('hash')) {
        this.trackChunkLoad(resourceEntry);
      }
    } else if (entry.entryType === 'navigation') {
      const navEntry = entry as PerformanceNavigationTiming;
      this.trackNavigationMetrics(navEntry);
    }
  }

  /**
   * Track chunk loading performance
   */
  private trackChunkLoad(entry: PerformanceResourceTiming) {
    const chunkName = this.extractChunkName(entry.name);
    const loadTime = entry.responseEnd - entry.requestStart;
    const size = entry.transferSize || entry.encodedBodySize;

    this.metrics.push({
      timestamp: entry.startTime,
      loadTime,
      bundleSize: size,
      chunkName
    });

    console.log(`📦 Chunk loaded: ${chunkName} (${this.formatBytes(size)}, ${loadTime.toFixed(2)}ms)`);
  }

  /**
   * Track component lazy loading
   */
  trackComponentLoad(componentName: string, startTime: number, cached = false) {
    const loadTime = performance.now() - startTime;
    
    const metric: ComponentLoadMetric = {
      name: componentName,
      loadTime,
      cached,
      timestamp: performance.now()
    };

    this.componentMetrics.push(metric);
    
    const cacheStatus = cached ? '(cached)' : '';
    console.log(`🧩 Component loaded: ${componentName} (${loadTime.toFixed(2)}ms) ${cacheStatus}`);
  }

  /**
   * Track navigation performance
   */
  private trackNavigationMetrics(entry: PerformanceNavigationTiming) {
    const metrics = {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      pageLoad: entry.loadEventEnd - entry.loadEventStart,
      firstByte: entry.responseStart - entry.requestStart,
      domInteractive: entry.domInteractive - entry.fetchStart
    };

    console.log('🚀 Navigation metrics:', metrics);
  }

  /**
   * Track initial page load performance
   */
  private trackInitialPageLoad() {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      const metrics = {
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
      };

      console.log('📊 Initial page load metrics:', metrics);
    });
  }

  /**
   * Extract chunk name from URL
   */
  private extractChunkName(url: string): string {
    const matches = url.match(/\/([^\/]+)-[a-f0-9]+\.js$/);
    return matches ? matches[1] : 'unknown';
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const totalBundleSize = this.metrics.reduce((sum, metric) => 
      sum + (metric.bundleSize || 0), 0
    );

    const avgLoadTime = this.metrics.length > 0 
      ? this.metrics.reduce((sum, metric) => sum + (metric.loadTime || 0), 0) / this.metrics.length
      : 0;

    const componentLoadTimes = this.componentMetrics.map(m => m.loadTime);
    const avgComponentLoadTime = componentLoadTimes.length > 0
      ? componentLoadTimes.reduce((sum, time) => sum + time, 0) / componentLoadTimes.length
      : 0;

    return {
      totalBundleSize: this.formatBytes(totalBundleSize),
      chunksLoaded: this.metrics.length,
      avgLoadTime: avgLoadTime.toFixed(2) + 'ms',
      componentsLoaded: this.componentMetrics.length,
      avgComponentLoadTime: avgComponentLoadTime.toFixed(2) + 'ms',
      cachedComponents: this.componentMetrics.filter(m => m.cached).length
    };
  }

  /**
   * Get detailed metrics for debugging
   */
  getDetailedMetrics() {
    return {
      chunkMetrics: this.metrics,
      componentMetrics: this.componentMetrics,
      summary: this.getPerformanceSummary()
    };
  }

  /**
   * Log performance summary to console
   */
  logSummary() {
    const summary = this.getPerformanceSummary();
    console.group('📊 Performance Summary');
    Object.entries(summary).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    console.groupEnd();
  }

  /**
   * Track bundle size analysis (for development)
   */
  analyzeBundle() {
    if (process.env.NODE_ENV === 'development') {
      // In development, we can analyze the chunks being loaded
      const chunkAnalysis = this.metrics.reduce((acc, metric) => {
        if (metric.chunkName) {
          if (!acc[metric.chunkName]) {
            acc[metric.chunkName] = {
              size: metric.bundleSize || 0,
              loadTime: metric.loadTime || 0,
              count: 1
            };
          } else {
            acc[metric.chunkName].count++;
            acc[metric.chunkName].loadTime += metric.loadTime || 0;
          }
        }
        return acc;
      }, {} as Record<string, { size: number; loadTime: number; count: number }>);

      console.table(chunkAnalysis);
    }
  }

  /**
   * Clean up observer
   */
  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook for tracking component performance
 */
export function usePerformanceMonitor() {
  const trackComponentLoad = (componentName: string, startTime: number, cached = false) => {
    performanceMonitor.trackComponentLoad(componentName, startTime, cached);
  };

  const getSummary = () => performanceMonitor.getPerformanceSummary();
  const getDetailedMetrics = () => performanceMonitor.getDetailedMetrics();
  const logSummary = () => performanceMonitor.logSummary();

  return {
    trackComponentLoad,
    getSummary,
    getDetailedMetrics,
    logSummary
  };
}

/**
 * Higher-order component to track component load performance
 */
export function withPerformanceTracking<T extends object>(
  Component: any,
  componentName: string
) {
  const { useEffect, createElement } = require('react');
  
  return function PerformanceTrackedComponent(props: T) {
    const startTime = performance.now();
    
    useEffect(() => {
      performanceMonitor.trackComponentLoad(componentName, startTime);
    }, []);

    return createElement(Component, props);
  };
}

// Global performance monitor access for debugging
if (typeof window !== 'undefined') {
  (window as any).__performanceMonitor = performanceMonitor;
}