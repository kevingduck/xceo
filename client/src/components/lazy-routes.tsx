import { createRouteLazyComponent } from '@/lib/lazy-utils';
import { 
  PageSkeleton, 
  DashboardSkeleton, 
  AnalyticsSkeleton, 
  TasksSkeleton, 
  AdminSkeleton 
} from '@/components/ui/page-skeleton';

// Critical routes - preload these immediately
export const LazyDashboard = createRouteLazyComponent(
  () => import('@/pages/dashboard'),
  DashboardSkeleton,
  true // preload immediately
);

export const LazyTasks = createRouteLazyComponent(
  () => import('@/pages/tasks'),
  TasksSkeleton,
  true // preload immediately - often accessed
);

// Heavy components - lazy load on demand
export const LazyAnalytics = createRouteLazyComponent(
  () => import('@/pages/analytics'),
  AnalyticsSkeleton,
  false
);

export const LazyAdmin = createRouteLazyComponent(
  () => import('@/pages/admin'),
  AdminSkeleton,
  false
);

// Standard routes - lazy load on demand
export const LazyChat = createRouteLazyComponent(
  () => import('@/pages/chat'),
  PageSkeleton,
  false
);

export const LazyBusiness = createRouteLazyComponent(
  () => import('@/pages/business'),
  PageSkeleton,
  false
);

export const LazyTeam = createRouteLazyComponent(
  () => import('@/pages/team'),
  PageSkeleton,
  false
);

export const LazySettings = createRouteLazyComponent(
  () => import('@/pages/settings'),
  PageSkeleton,
  false
);

export const LazyResearch = createRouteLazyComponent(
  () => import('@/pages/research'),
  PageSkeleton,
  false
);

export const LazyOfferings = createRouteLazyComponent(
  () => import('@/pages/offerings'),
  PageSkeleton,
  false
);

export const LazyConfigureCEO = createRouteLazyComponent(
  () => import('@/pages/configure-ceo'),
  PageSkeleton,
  false
);

export const LazyHelp = createRouteLazyComponent(
  () => import('@/pages/help'),
  PageSkeleton,
  false
);

export const LazyNotFound = createRouteLazyComponent(
  () => import('@/pages/not-found'),
  PageSkeleton,
  false
);

// Auth page - might be needed immediately
export const LazyAuthPage = createRouteLazyComponent(
  () => import('@/pages/auth-page'),
  PageSkeleton,
  true
);