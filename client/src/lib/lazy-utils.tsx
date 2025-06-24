import { lazy, ComponentType, LazyExoticComponent } from 'react';

interface LazyComponentOptions {
  fallback?: ComponentType;
  errorFallback?: ComponentType<{ error: Error; retry: () => void }>;
  preload?: boolean;
}

/**
 * Enhanced lazy component loader with built-in error handling and preloading
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
): LazyExoticComponent<T> & { preload: () => void } {
  const LazyComponent = lazy(importFn);
  
  // Add preload method to the lazy component
  const EnhancedLazyComponent = LazyComponent as LazyExoticComponent<T> & { preload: () => void };
  
  EnhancedLazyComponent.preload = () => {
    // Trigger the import to start loading the component
    importFn().catch(console.error);
  };
  
  // Auto-preload if specified
  if (options.preload) {
    EnhancedLazyComponent.preload();
  }
  
  return EnhancedLazyComponent;
}

/**
 * Preload multiple components
 */
export function preloadComponents(components: Array<{ preload: () => void }>) {
  components.forEach(component => {
    try {
      component.preload();
    } catch (error) {
      console.error('Failed to preload component:', error);
    }
  });
}

/**
 * Create a route-specific lazy component with appropriate skeleton
 */
export function createRouteLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallbackComponent: ComponentType,
  preload = false
) {
  return createLazyComponent(importFn, {
    fallback: fallbackComponent,
    preload
  });
}