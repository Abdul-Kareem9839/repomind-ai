import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import { registerRequest, loginRequest, logoutRequest, meRequest } from '../services/auth.api.js';

export const AuthContext = createContext(null);

const initialState = {
  user: null,
  status: 'loading' // 'loading' | 'authenticated' | 'unauthenticated'
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { user: action.payload, status: 'authenticated' };
    case 'CLEAR_USER':
      return { user: null, status: 'unauthenticated' };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    meRequest()
      .then(({ user }) => dispatch({ type: 'SET_USER', payload: user }))
      .catch(() => dispatch({ type: 'CLEAR_USER' }));
  }, []);

  const login = useCallback(async (credentials) => {
    const { user } = await loginRequest(credentials);
    dispatch({ type: 'SET_USER', payload: user });
    return user;
  }, []);

  const register = useCallback(async (details) => {
    const { user } = await registerRequest(details);
    dispatch({ type: 'SET_USER', payload: user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => {});
    dispatch({ type: 'CLEAR_USER' });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
