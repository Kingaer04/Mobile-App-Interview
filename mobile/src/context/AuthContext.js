import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken } from '../lib/api';

const STORAGE_KEY = 'citizen-reports/session';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  const persist = useCallback(async (session) => {
    setAuthToken(session?.token ?? null);
    setToken(session?.token ?? null);
    setUser(session?.user ?? null);
    if (session) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  // Restore a saved session on launch and confirm it is still valid.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const session = JSON.parse(raw);
          setAuthToken(session.token);
          setToken(session.token);
          setUser(session.user);
          try {
            const { user: fresh } = await api.me();
            await persist({ token: session.token, user: fresh });
          } catch (e) {
            if (e.status === 401) await persist(null); // expired → log out; offline → keep session
          }
        }
      } finally {
        setReady(true);
      }
    })();
  }, [persist]);

  const value = useMemo(() => ({
    user,
    token,
    ready,
    login: async (email, password) => persist(await api.login(email, password)),
    register: async (name, email, password) => persist(await api.register(name, email, password)),
    logout: () => persist(null),
  }), [user, token, ready, persist]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
