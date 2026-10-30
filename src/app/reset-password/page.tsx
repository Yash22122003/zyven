'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, CheckCircle2, KeyRound, ArrowRight } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const initialToken = searchParams.get('token') || '';

  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [step, setStep] = useState<'request' | 'reset'>(initialToken ? 'reset' : 'request');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resetLink, setResetLink] = useState('');

  // Step 1: Request Password Reset
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to request password reset');
      }

      if (data.resetToken) {
        setToken(data.resetToken);
        setResetLink(data.resetUrl);
        setStep('reset');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error requesting reset');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          token: token.trim() || undefined,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccessMessage(data.message || 'Password updated successfully!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-1">
        <Link href="/" className="inline-flex items-center gap-2 group mb-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-950 flex items-center justify-center text-white font-bold text-xs tracking-wider">
            Z
          </div>
          <span className="font-extrabold text-lg tracking-tight text-zinc-950">ZYVEN</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
          Reset Your Password
        </h1>
        <p className="text-xs text-zinc-500">
          {step === 'request'
            ? 'Enter your account email to initiate password recovery'
            : 'Enter and confirm your new password below'}
        </p>
      </div>

      <Card className="p-6 sm:p-7 border-zinc-200/90 shadow-sm space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {successMessage ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950">Password Updated</h2>
              <p className="text-xs text-zinc-600 mt-1">{successMessage}</p>
            </div>
            <Link href="/login" className="block pt-2">
              <Button size="lg" className="w-full font-semibold">
                Sign In Now
              </Button>
            </Link>
          </div>
        ) : step === 'request' ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <Input
              label="Account Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button
              type="submit"
              size="lg"
              className="w-full font-semibold gap-2"
              isLoading={loading}
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <Input
              label="Account Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="New Password"
              type="password"
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              size="lg"
              className="w-full font-semibold gap-2"
              isLoading={loading}
            >
              <KeyRound className="w-4 h-4" />
              <span>Update Password</span>
            </Button>
          </form>
        )}
      </Card>

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-950 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-zinc-50/50">
      <Suspense fallback={<div className="text-xs text-zinc-400">Loading reset password...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
