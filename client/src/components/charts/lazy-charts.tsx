import { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Chart skeleton component
function ChartSkeleton() {
  return <Skeleton className="h-[300px] w-full" />;
}

// Lazy components for different chart types
const LineChartComponent = lazy(async () => {
  const { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } = await import('recharts');
  return {
    default: ({ data, ...props }: any) => (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} {...props}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" />
        </LineChart>
      </ResponsiveContainer>
    )
  };
});

const BarChartComponent = lazy(async () => {
  const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } = await import('recharts');
  return {
    default: ({ data, ...props }: any) => (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} {...props}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    )
  };
});

const PieChartComponent = lazy(async () => {
  const { PieChart, Pie, Tooltip, ResponsiveContainer } = await import('recharts');
  return {
    default: ({ data, ...props }: any) => (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart {...props}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            fill="#3b82f6"
          />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    )
  };
});

// Export wrapped components with Suspense
export function LazyLineChart(props: any) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LineChartComponent {...props} />
    </Suspense>
  );
}

export function LazyBarChart(props: any) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <BarChartComponent {...props} />
    </Suspense>
  );
}

export function LazyPieChart(props: any) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <PieChartComponent {...props} />
    </Suspense>
  );
}