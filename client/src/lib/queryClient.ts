import { QueryClient } from "@tanstack/react-query";
import { queryErrorHandler } from "@/hooks/use-error-handler";
import { AsyncError } from "@/components/async-error-boundary";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });

        if (!res.ok) {
          const text = await res.text();
          let errorMessage = `${res.status}: ${res.statusText}`;
          
          try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorMessage;
          } catch {
            errorMessage = text || errorMessage;
          }

          throw new AsyncError(
            errorMessage,
            `HTTP_${res.status}`,
            res.status
          );
        }

        return res.json();
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      onError: queryErrorHandler,
    },
    mutations: {
      retry: false,
      onError: queryErrorHandler,
    }
  },
});
