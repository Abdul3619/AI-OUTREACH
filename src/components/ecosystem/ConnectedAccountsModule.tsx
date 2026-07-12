import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api.ts';
import { Settings, ShieldCheck, Zap, RefreshCw, Unplug, Clock, AlertCircle } from 'lucide-react';

export function ConnectedAccountsModule() {
  const queryClient = useQueryClient();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [authPopup, setAuthPopup] = useState<{ id: string, name: string } | null>(null);

  const fetchProviders = async () => {
    const res = await fetch('/api/oauth/providers');
    return res.json();
  };

  const { data, isLoading } = useQuery({
    queryKey: ['oauth-providers'],
    queryFn: fetchProviders,
    refetchInterval: 5000 // Poll every 5s to update statuses
  });

  const connectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/oauth/connect/${id}`);
      const data = await res.json();
      if (data.status === 'redirect') {
        const providerName = providers.find((p: any) => p.id === id)?.name || id;
        setAuthPopup({ id, name: providerName });
        // Simulate OAuth Popup/Redirect Flow
        return new Promise<void>((resolve) => {
          setTimeout(async () => {
            // After timeout, exchange code
            await fetch('/api/oauth/exchange', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ provider: id, code: 'mock_code_123' })
            });
            setAuthPopup(null);
            resolve();
          }, 2500); // 2.5s simulated popup wait
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['oauth-providers'] })
  });

  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => fetch(`/api/oauth/disconnect/${id}`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['oauth-providers'] })
  });

  const refreshMutation = useMutation({
    mutationFn: async (id: string) => fetch(`/api/oauth/refresh/${id}`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['oauth-providers'] })
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      setTestingId(id);
      try {
        const res = await fetch(`/api/oauth/test/${id}`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        alert(`Test successful: ${data.message}`);
      } catch (err: any) {
        alert(err.message || 'Test failed');
      } finally {
        setTestingId(null);
        queryClient.invalidateQueries({ queryKey: ['oauth-providers'] });
      }
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 font-mono">
        <RefreshCw className="w-7 h-7 text-violet-500 animate-spin" />
        <span className="text-xs text-slate-400">Loading OAuth providers...</span>
      </div>
    );
  }

  const providers = data?.providers || [];

  return (
    <div className="space-y-6 relative">
      {authPopup && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-xl">
          <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-6 flex flex-col items-center max-w-sm w-full mx-4">
            <RefreshCw className="w-8 h-8 text-violet-500 animate-spin mb-4" />
            <h3 className="text-sm font-bold text-slate-100 mb-1">Authenticating with {authPopup.name}</h3>
            <p className="text-xs text-slate-400 text-center font-mono">
              Waiting for authorization callback...
            </p>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-400" />
            <span>Connected Accounts (OAuth)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Securely authorize external platforms with scoped permissions and token management.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {providers.map((provider: any) => (
          <div key={provider.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start gap-2 mb-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-200 text-sm truncate">{provider.name}</h3>
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5 uppercase tracking-wider">{provider.category}</span>
                </div>
                {provider.status === 'connected' ? (
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono border uppercase tracking-wider bg-emerald-600/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Connected
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono border uppercase tracking-wider bg-slate-600/10 text-slate-400 border-slate-500/20">
                    Disconnected
                  </span>
                )}
              </div>
              
              {provider.status === 'connected' ? (
                <div className="space-y-1.5 mt-3 mb-4 text-[10px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account:</span>
                    <span className="text-slate-300 font-bold">{provider.account}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Scopes:</span>
                    <span className="text-violet-400 text-right break-all">{provider.scopes.join(', ') || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Expires:</span>
                    <span className="text-amber-400">{new Date(provider.tokenExpiration).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Health Status:</span>
                    <span className={provider.healthStatus === 'healthy' ? 'text-emerald-400' : 'text-red-400'}>{provider.healthStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Last Activity:</span>
                    <span className="text-slate-300">{provider.lastActivity ? new Date(provider.lastActivity).toLocaleString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Last Sync:</span>
                    <span className="text-slate-300">{provider.lastSync ? new Date(provider.lastSync).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 mb-4">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Connect to enable automatic synchronization and interactions with {provider.name}. Requires OAuth 2.0 authorization.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-slate-800 pt-3">
              {provider.status === 'connected' ? (
                <>
                  <button
                    onClick={() => disconnectMutation.mutate(provider.id)}
                    disabled={disconnectMutation.isPending}
                    className="flex-1 flex justify-center items-center gap-1.5 px-3 py-1.5 bg-red-500/5 hover:bg-red-500/10 text-red-400 border border-red-500/20 rounded font-semibold text-xs transition-colors disabled:opacity-50"
                  >
                    <Unplug className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                  <button
                    onClick={() => refreshMutation.mutate(provider.id)}
                    disabled={refreshMutation.isPending}
                    className="flex-1 flex justify-center items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-700 rounded font-semibold text-xs transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                    <span>Reconnect</span>
                  </button>
                  <button
                    onClick={() => testMutation.mutate(provider.id)}
                    disabled={testingId === provider.id}
                    className="flex-1 flex justify-center items-center gap-1.5 px-3 py-1.5 bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 border border-violet-500/20 rounded font-semibold text-xs transition-colors disabled:opacity-50"
                  >
                    {testingId === provider.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>Test</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => connectMutation.mutate(provider.id)}
                  disabled={connectMutation.isPending}
                  className="w-full flex justify-center items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  {connectMutation.isPending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>{connectMutation.isPending ? 'Authorizing...' : 'Connect Securely'}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
