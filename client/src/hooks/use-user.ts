import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InsertUser, SelectUser } from "@db/schema";

type RequestResult = {
  ok: true;
  message: string;
  user?: { id: number; username: string };
} | {
  ok: false;
  message: string;
};

async function handleRequest(
  url: string,
  method: string,
  body?: InsertUser
): Promise<RequestResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        // Ensure credentials are included in the request headers
        "Accept": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include", // This is crucial for maintaining session cookies
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      return {
        ok: false,
        message: errorData.message || 'Request failed'
      };
    }

    const data = await response.json();
    return data;
  } catch (e: any) {
    return { 
      ok: false, 
      message: e.toString() 
    };
  }
}

async function fetchUser(): Promise<SelectUser | null> {
  try {
    const response = await fetch('/api/user', {
      credentials: 'include',
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      const data = await response.json();
      throw new Error(data.message || response.statusText);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export function useUser() {
  const queryClient = useQueryClient();

  const { data: user, error, isLoading } = useQuery<SelectUser | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: false
  });

  const loginMutation = useMutation<RequestResult, Error, InsertUser>({
    mutationFn: (userData) => handleRequest('/api/login', 'POST', userData),
    onSuccess: (data) => {
      if (!data.ok) {
        throw new Error(data.message);
      }
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const logoutMutation = useMutation<RequestResult, Error>({
    mutationFn: () => handleRequest('/api/logout', 'POST'),
    onSuccess: (data) => {
      if (!data.ok) {
        throw new Error(data.message);
      }
      queryClient.invalidateQueries({ queryKey: ['user'] });
      // Clear all queries on logout
      queryClient.clear();
    },
  });

  const registerMutation = useMutation<RequestResult, Error, InsertUser>({
    mutationFn: (userData) => handleRequest('/api/register', 'POST', userData),
    onSuccess: (data) => {
      if (!data.ok) {
        throw new Error(data.message);
      }
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}