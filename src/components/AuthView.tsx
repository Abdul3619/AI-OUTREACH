import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api.ts';
import { Bot, LogIn, Key, HelpCircle, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface AuthViewProps {
  onSuccess: () => void;
}

export default function AuthView({ onSuccess }: AuthViewProps) {
  const queryClient = useQueryClient();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Login Mutation
  const loginMutation = useMutation({
    mutationFn: (cred: { email: string }) => apiService.login(cred),
    onSuccess: (data) => {
      queryClient.setQueryData(['session'], data);
      onSuccess();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    }
  });

  // Signup Mutation
  const signupMutation = useMutation({
    mutationFn: (payload: { email: string; fullName: string; companyName?: string }) =>
      apiService.signup(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['session'], data);
      onSuccess();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Signup failed. Please try again.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email) {
      setErrorMsg('Email address is required.');
      return;
    }

    if (isSignUp) {
      if (!fullName) {
        setErrorMsg('Your Full Name is required.');
        return;
      }
      signupMutation.mutate({ email, fullName, companyName: companyName || undefined });
    } else {
      loginMutation.mutate({ email });
    }
  };

  const fillMockCredentials = (type: 'owner' | 'admin') => {
    if (type === 'owner') {
      setEmail('abdulwahababdullah3619@gmail.com');
    } else {
      setEmail('admin@alphagrowth.com');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full z-10">
        {/* Title branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-600/20 mb-3 border border-violet-500/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">AI Outreach CRM Platform</h1>
          <p className="text-xs text-slate-400 mt-1">Multi-Agent Lead intelligence & Pipeline manager</p>
        </div>

        {/* Auth form card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl shadow-slate-950/50">
          <h2 className="text-lg font-bold text-slate-100 mb-1">
            {isSignUp ? 'Create Workspace Account' : 'Welcome back'}
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            {isSignUp
              ? 'Get started with isolated workspaces & agent routing'
              : 'Sign in to access your business lead campaigns'}
          </p>

          {errorMsg && (
            <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-400 text-xs rounded-lg mb-5 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Abdulwahab Abdullah"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Company/Agency Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Alpha Tech Solutions"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="abdulwahababdullah3619@gmail.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
                {!isSignUp && (
                  <span className="text-[10px] text-violet-400 cursor-pointer hover:underline">Forgot?</span>
                )}
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                disabled
              />
              <span className="text-[9px] text-slate-500 mt-1 block">Password check is bypassed for fast offline testing.</span>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending || signupMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-violet-600/10 mt-6"
            >
              {loginMutation.isPending || signupMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {isSignUp ? 'Register Account' : 'Authenticate Session'}
            </button>
          </form>

          {/* Quick-select default sandbox testing profiles */}
          {!isSignUp && (
            <div className="mt-6 pt-5 border-t border-slate-850">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Sandbox Test Profiles</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fillMockCredentials('owner')}
                  className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 text-slate-300 text-[10px] font-mono rounded-lg transition-all text-left truncate"
                >
                  abdulwahab... (Owner)
                </button>
                <button
                  onClick={() => fillMockCredentials('admin')}
                  className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 text-slate-300 text-[10px] font-mono rounded-lg transition-all text-left truncate"
                >
                  admin@alph... (Admin)
                </button>
              </div>
            </div>
          )}

          {/* Tab swap */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setErrorMsg(null);
                setIsSignUp(!isSignUp);
              }}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
