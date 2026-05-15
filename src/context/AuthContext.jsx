import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  isBiometricAvailable,
  registerBiometric,
  authenticateBiometric,
  hasBiometricCredential,
} from '../utils/biometric.js';

/**
 * AuthContext — sesión del usuario actual + estado biométrico.
 *
 * Esta app no tiene login por usuario/password: el "login" consiste en elegir
 * un usuario del catálogo `usuarios` cargado por DataContext. AuthContext
 * mantiene la selección actual (`currentUser`) y expone `login` / `logout`.
 *
 * Adicionalmente maneja el bloqueo biométrico inicial (Face ID / Touch ID).
 */

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);

  // ── Biometric lock state ────────────────────────────────────
  const [bioLocked, setBioLocked] = useState(true);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioRegistered, setBioRegistered] = useState(false);
  const [bioError, setBioError] = useState('');

  useEffect(() => {
    (async () => {
      const avail = await isBiometricAvailable();
      setBioAvailable(avail);
      const stored = hasBiometricCredential();
      setBioRegistered(!!stored);
      if (!avail) setBioLocked(false); // no biometric available → skip lock
    })();
  }, []);

  const unlockBiometric = useCallback(async () => {
    setBioError('');
    try {
      if (!bioRegistered) {
        await registerBiometric();
        setBioRegistered(true);
        setBioLocked(false);
      } else {
        const ok = await authenticateBiometric();
        if (ok) setBioLocked(false);
      }
    } catch (e) {
      setBioError(e.name === 'NotAllowedError' ? 'Autenticación cancelada' : 'Error: ' + e.message);
    }
  }, [bioRegistered]);

  const login = useCallback((user) => {
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const isAdmin = currentUser?.rol === 'admin';
  const isOperador = currentUser?.rol === 'operador';

  const value = useMemo(() => ({
    currentUser,
    login,
    logout,
    isAdmin,
    isOperador,
    // biometric
    bioLocked,
    bioAvailable,
    bioRegistered,
    bioError,
    unlockBiometric,
  }), [currentUser, login, logout, isAdmin, isOperador, bioLocked, bioAvailable, bioRegistered, bioError, unlockBiometric]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
