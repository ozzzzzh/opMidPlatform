import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser } from '@it-ops/shared';
import { getMe, loginRequest, logoutRequest, type LoginPayload } from '@/api/auth';
import { clearStoredToken, getStoredToken, setStoredToken } from './storage';

const AUTH_QUERY_KEY = ['auth', 'me'] as const;

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => getStoredToken());

  const meQuery = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getMe,
    enabled: Boolean(token),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (meQuery.isError) {
      clearStoredToken();
      setToken(null);
      queryClient.removeQueries({ queryKey: ['auth'] });
    }
  }, [meQuery.isError, queryClient]);

  const login = useCallback(
    async (payload: LoginPayload): Promise<AuthUser> => {
      const result = await loginRequest(payload);
      setStoredToken(result.accessToken);
      setToken(result.accessToken);
      queryClient.setQueryData(AUTH_QUERY_KEY, result.user);
      return result.user;
    },
    [queryClient],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest();
    } catch {
      // 即使服务端不可达，也必须清理本地凭据。
    } finally {
      clearStoredToken();
      setToken(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user: meQuery.data ?? null,
      loading: Boolean(token) && meQuery.isLoading,
      login,
      logout,
    }),
    [token, meQuery.data, meQuery.isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return context;
}
