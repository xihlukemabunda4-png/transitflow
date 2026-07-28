'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';

export function AuthPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password, displayName || undefined);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-80 rounded-tf-lg bg-tf-surface-raised border border-tf-border p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-1.5 rounded-tf-sm text-sm font-semibold ${
              mode === 'login' ? 'bg-tf-primary text-tf-primary-ink' : 'bg-tf-surface text-tf-text-muted'
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-1.5 rounded-tf-sm text-sm font-semibold ${
              mode === 'signup' ? 'bg-tf-primary text-tf-primary-ink' : 'bg-tf-surface text-tf-text-muted'
            }`}
          >
            Sign up
          </button>
        </div>

        <div className="space-y-2">
          {mode === 'signup' && (
            <input
              placeholder="Name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-tf-sm border border-tf-border bg-tf-surface px-3 py-2 text-sm text-tf-text"
            />
          )}
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-tf-sm border border-tf-border bg-tf-surface px-3 py-2 text-sm text-tf-text"
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-tf-sm border border-tf-border bg-tf-surface px-3 py-2 text-sm text-tf-text"
          />
          {error && <p className="text-xs text-tf-danger">{error}</p>}
          <button
            onClick={submit}
            disabled={submitting || !email || !password}
            className="w-full rounded-tf-sm bg-tf-primary text-tf-primary-ink font-bold py-2 text-sm disabled:opacity-50"
          >
            {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  );
}
