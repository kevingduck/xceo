/**
 * Route preloader utility to intelligently preload components based on user navigation patterns
 */

import { 
  LazyDashboard, 
  LazyTasks, 
  LazyAnalytics,
  LazyChat,
  LazyBusiness,
  LazyTeam
} from '@/components/lazy-routes';

interface PreloadConfig {
  delay?: number;
  priority?: 'high' | 'medium' | 'low';
  condition?: () => boolean;
}

interface RoutePreloadConfig {
  [key: string]: PreloadConfig;
}

// Configuration for route preloading
const ROUTE_PRELOAD_CONFIG: RoutePreloadConfig = {
  dashboard: { 
    delay: 0, // Preload immediately
    priority: 'high' 
  },
  tasks: { 
    delay: 1000, // Preload after 1 second
    priority: 'high' 
  },
  analytics: { 
    delay: 2000, // Preload after 2 seconds when user is likely exploring
    priority: 'medium' 
  },
  chat: { 
    delay: 3000, // Common feature, preload with medium priority
    priority: 'medium' 
  },
  business: { 
    delay: 5000, // Less frequent, lower priority
    priority: 'low' 
  },
  team: { 
    delay: 5000, // Less frequent, lower priority
    priority: 'low' 
  }
};

// Map route names to lazy components
const ROUTE_COMPONENTS = {
  dashboard: LazyDashboard,
  tasks: LazyTasks,
  analytics: LazyAnalytics,
  chat: LazyChat,
  business: LazyBusiness,
  team: LazyTeam
};

class RoutePreloader {
  private preloadedRoutes = new Set<string>();
  private preloadTimeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Start preloading routes based on configuration
   */
  startPreloading() {
    // Clear any existing timeouts
    this.clearTimeouts();

    Object.entries(ROUTE_PRELOAD_CONFIG).forEach(([route, config]) => {
      // Check if condition is met (if provided)
      if (config.condition && !config.condition()) {
        return;
      }

      const timeout = setTimeout(() => {
        this.preloadRoute(route);
      }, config.delay || 0);

      this.preloadTimeouts.set(route, timeout);
    });
  }

  /**
   * Preload a specific route
   */
  preloadRoute(routeName: string) {
    if (this.preloadedRoutes.has(routeName)) {
      return; // Already preloaded
    }

    const component = ROUTE_COMPONENTS[routeName as keyof typeof ROUTE_COMPONENTS];
    if (component && component.preload) {
      try {
        component.preload();
        this.preloadedRoutes.add(routeName);
        console.log(`🚀 Preloaded route: ${routeName}`);
      } catch (error) {
        console.error(`Failed to preload route ${routeName}:`, error);
      }
    }
  }

  /**
   * Preload routes based on current route context
   */
  preloadByContext(currentRoute: string) {
    const contextualPreloads = {
      '/': ['tasks', 'analytics'], // From dashboard, likely to go to tasks or analytics
      '/tasks': ['analytics', 'chat'], // From tasks, might check analytics or communicate
      '/analytics': ['dashboard', 'business'], // From analytics, might go back to dashboard or business
      '/chat': ['tasks', 'dashboard'], // From chat, might create tasks or go to dashboard
      '/business': ['team', 'offerings'], // Business context routes
      '/team': ['business', 'tasks'] // Team context routes
    };

    const routesToPreload = contextualPreloads[currentRoute as keyof typeof contextualPreloads] || [];
    
    routesToPreload.forEach(route => {
      // Preload with a small delay to not interfere with current page loading
      setTimeout(() => this.preloadRoute(route), 1000);
    });
  }

  /**
   * Preload on user interaction hints (hover, focus, etc.)
   */
  preloadOnInteraction(routeName: string) {
    // Immediate preload when user shows intent
    this.preloadRoute(routeName);
  }

  /**
   * Clear all preload timeouts
   */
  clearTimeouts() {
    this.preloadTimeouts.forEach(timeout => clearTimeout(timeout));
    this.preloadTimeouts.clear();
  }

  /**
   * Get preloading statistics
   */
  getStats() {
    return {
      preloadedRoutes: Array.from(this.preloadedRoutes),
      pendingTimeouts: this.preloadTimeouts.size,
      totalConfiguredRoutes: Object.keys(ROUTE_PRELOAD_CONFIG).length
    };
  }
}

// Create singleton instance
export const routePreloader = new RoutePreloader();

/**
 * Hook to integrate route preloading with navigation
 */
export function useRoutePreloader() {
  const startPreloading = () => routePreloader.startPreloading();
  const preloadRoute = (routeName: string) => routePreloader.preloadRoute(routeName);
  const preloadByContext = (currentRoute: string) => routePreloader.preloadByContext(currentRoute);
  const preloadOnInteraction = (routeName: string) => routePreloader.preloadOnInteraction(routeName);
  const getStats = () => routePreloader.getStats();

  return {
    startPreloading,
    preloadRoute,
    preloadByContext,
    preloadOnInteraction,
    getStats
  };
}

/**
 * Utility to add preload hints to navigation elements
 */
export function addPreloadListeners() {
  // Add event listeners to navigation elements
  const addHoverPreload = (selector: string, routeName: string) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      element.addEventListener('mouseenter', () => {
        routePreloader.preloadOnInteraction(routeName);
      }, { once: true });
    });
  };

  // Common navigation selectors and their routes
  const navigationMap = {
    '[href="/tasks"]': 'tasks',
    '[href="/analytics"]': 'analytics',
    '[href="/chat"]': 'chat',
    '[href="/business"]': 'business',
    '[href="/team"]': 'team'
  };

  Object.entries(navigationMap).forEach(([selector, route]) => {
    addHoverPreload(selector, route);
  });
}