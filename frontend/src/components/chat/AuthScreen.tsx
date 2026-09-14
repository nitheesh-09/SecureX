'use client';

import React, { useState } from 'react';
import { AuthUser, AuthMode } from '@/types/chat';
import { loginUser, registerUser } from '@/lib/authDatabase';
import { SecureXLogo } from './SecureXLogo';

interface AuthScreenProps {
  onAuthSuccess: (user: AuthUser) => void;
  defaultMode?: AuthMode;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  defaultMode = 'login',
}) => {
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isUnregisteredError, setIsUnregisteredError] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    setGeneralError(null);
    setIsUnregisteredError(false);

    // Registration requires Name
    if (mode === 'register') {
      if (!name.trim()) {
        newErrors.name = 'Full name is required for registration';
      } else if (name.trim().length < 2) {
        newErrors.name = 'Name must be at least 2 characters';
      }
    }

    // Email is required for both Login and Registration
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Password is required for both Login and Registration
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsAuthenticating(true);
    setGeneralError(null);
    setIsUnregisteredError(false);

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (mode === 'login') {
        // STRICT DATABASE CHECK: Queries SQLite DB
        // If not registered, this throws "Account not found..."
        const user = await loginUser(cleanEmail, password);
        onAuthSuccess(user);
      } else {
        // REGISTER USER IN DATABASE
        const user = await registerUser(name.trim(), cleanEmail, password);
        onAuthSuccess(user);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      setGeneralError(msg);

      // If user is not registered, highlight option to register
      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('register')) {
        setIsUnregisteredError(true);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleQuickDemoFill = () => {
    if (mode === 'register') {
      setName('Dev Sender');
    }
    setEmail('sender@securex.internal');
    setPassword('securePass2026');
    setErrors({});
    setGeneralError(null);
    setIsUnregisteredError(false);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrors({});
    setGeneralError(null);
    setIsUnregisteredError(false);
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xl">
      {/* Brand Logo & Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <SecureXLogo size="lg" showSubtitle={true} />
        <h1 className="mt-4 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
          {mode === 'login' ? 'Sign In to SecureX' : 'Register SecureX Account'}
        </h1>
        <p className="mt-1 text-xs text-slate-600 font-sans">
          {mode === 'login'
            ? 'Enter your registered credentials to access your encrypted workspace.'
            : 'Register your email in the database to enable encrypted zero-leak file transfer.'}
        </p>
      </div>

      {/* Database Warning / Error Banner */}
      {generalError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-mono space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-red-600 font-bold">⚠️</span>
            <div className="flex-1">{generalError}</div>
          </div>
          {isUnregisteredError && mode === 'login' && (
            <button
              type="button"
              onClick={() => switchMode('register')}
              className="w-full py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Register &ldquo;{email}&rdquo; Now →</span>
            </button>
          )}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Full Name field (Only during Registration) */}
        {mode === 'register' && (
          <div>
            <label className="block text-xs font-mono text-slate-700 mb-1 font-semibold">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nitheesh Kumar"
              autoFocus
              className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-50 text-slate-900 text-sm border focus:outline-none transition-all ${
                errors.name
                  ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                  : 'border-slate-300 focus:border-red-600 focus:ring-1 focus:ring-red-600/20'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-[11px] text-red-600 font-mono font-medium">{errors.name}</p>
            )}
          </div>
        )}

        {/* Email Address field (Both Login & Registration) */}
        <div>
          <label className="block text-xs font-mono text-slate-700 mb-1 font-semibold">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. sender@securex.internal"
            className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-50 text-slate-900 text-sm border focus:outline-none transition-all ${
              errors.email
                ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                : 'border-slate-300 focus:border-red-600 focus:ring-1 focus:ring-red-600/20'
            }`}
          />
          {errors.email && (
            <p className="mt-1 text-[11px] text-red-600 font-mono font-medium">{errors.email}</p>
          )}
        </div>

        {/* Password field (Both Login & Registration) */}
        <div>
          <label className="block text-xs font-mono text-slate-700 mb-1 font-semibold">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-50 text-slate-900 text-sm border focus:outline-none transition-all ${
              errors.password
                ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                : 'border-slate-300 focus:border-red-600 focus:ring-1 focus:ring-red-600/20'
            }`}
          />
          {errors.password && (
            <p className="mt-1 text-[11px] text-red-600 font-mono font-medium">{errors.password}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isAuthenticating}
          className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-bold font-mono text-sm transition-all shadow-md shadow-red-600/25 cursor-pointer mt-2 active:scale-[0.99] flex items-center justify-center gap-2"
        >
          {isAuthenticating ? (
            <>
              <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8v8H4z" fill="currentColor" className="opacity-75" />
              </svg>
              <span>Verifying Database Credentials...</span>
            </>
          ) : (
            <span>{mode === 'login' ? 'Sign In & Open Workspace' : 'Register Account in Database'}</span>
          )}
        </button>

        {/* Database notice & Quick Fill */}
        <div className="pt-2 flex flex-col items-center gap-1.5 text-center">
          <button
            type="button"
            onClick={handleQuickDemoFill}
            className="text-[11px] font-mono text-red-600 hover:text-red-700 hover:underline cursor-pointer font-medium"
          >
            [ Fill Seeded Demo Account (sender@securex.internal) ]
          </button>
          <span className="text-[10px] font-mono text-slate-600">
            Database-backed authentication • Unregistered emails strictly blocked
          </span>
        </div>
      </form>

      {/* Switch between Login and Register */}
      <div className="mt-6 pt-5 border-t border-slate-200 text-center text-xs text-slate-600">
        {mode === 'login' ? (
          <p>
            Don&apos;t have an account in the database?{' '}
            <button
              type="button"
              onClick={() => switchMode('register')}
              className="text-red-600 hover:text-red-700 font-semibold font-mono underline ml-1 cursor-pointer"
            >
              Register Now
            </button>
          </p>
        ) : (
          <p>
            Already registered?{' '}
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-red-600 hover:text-red-700 font-semibold font-mono underline ml-1 cursor-pointer"
            >
              Sign In Here
            </button>
          </p>
        )}
      </div>
    </div>
  );
};
