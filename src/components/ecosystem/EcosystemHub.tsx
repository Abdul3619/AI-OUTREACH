import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api.ts';
import { PluginDefinition } from '../../types.ts';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  Brain, WifiOff, Users, Sparkles
} from 'lucide-react';
import {
  MemoryModule,
  RAGModule,
  EnterpriseModule,
  WorkflowsModule,
  RecommendationsModule,
  QAMonitoringModule,
  OfflineSyncModule
} from './Phase9Modules.tsx';
import { ConnectedAccountsModule } from './ConnectedAccountsModule.tsx';
import {
  Layers, Cpu, Play, Square, RefreshCw, Plus, Trash2, ArrowDownToLine,
  ArrowUpFromLine, ShieldCheck, Database, Server, Clock, AlertCircle, CheckCircle2,
  Settings, Power, Radio, Zap, FileJson, FileText, Check, HelpCircle, HardDrive, RotateCcw,
  Lock, Eye, Activity, Fingerprint, AlertTriangle, Key, Mail, Target
} from 'lucide-react';

export default function EcosystemHub() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'connected-accounts' | 'installed-plugins' | 'ai-providers' | 'email-providers' | 'storage-providers' | 'databases' | 'calendars' | 'api-keys' | 'webhooks' | 'sync-health'>('connected-accounts');

  // Sidebar navigation options
  const navTabs = [
    { id: 'connected-accounts', label: 'Connected Accounts', icon: ShieldCheck, desc: 'Authorize and manage OAuth connections' },
    { id: 'installed-plugins', label: 'Installed Plugins', icon: Layers, desc: 'Configure modular SaaS integration connectors' },
    { id: 'ai-providers', label: 'AI Providers', icon: Brain, desc: 'Gemini, OpenAI, Claude, Style Memory & RAG' },
    { id: 'email-providers', label: 'Email Providers', icon: Mail, desc: 'Gmail, Resend, SMTP' },
    { id: 'storage-providers', label: 'Storage Providers', icon: HardDrive, desc: 'Google Drive, Dropbox, Data Portability' },
    { id: 'databases', label: 'Databases', icon: Database, desc: 'Supabase, Firebase, Disaster Recovery' },
    { id: 'calendars', label: 'Calendars', icon: Clock, desc: 'Google Calendar, Outlook' },
    { id: 'api-keys', label: 'Developer API Keys', icon: Key, desc: 'Manage access tokens and API limits' },
    { id: 'webhooks', label: 'Webhooks & Workflows', icon: Zap, desc: 'Automation rules and workflow nodes' },
    { id: 'sync-health', label: 'Sync & Health', icon: Activity, desc: 'Diagnostics, QA Monitor, Job Queue' }
  ] as const;

  return (
    <div className="space-y-6 font-sans">
      {/* Upper Title Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-violet-400 font-mono text-xs font-semibold uppercase tracking-wider mb-1">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Operational Control Center</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
            Ecosystem & Integration Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Admin management console for modular plugins, automated CRM triggers, active job scheduling, backup snapshots, and real-time node diagnostics.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-400">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
          <span>SYSTEM DISPATCHER: ACTIVE</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Nav */}
        <aside className="w-full lg:w-72 shrink-0 space-y-2">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1 shadow-lg">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-lg text-left transition-all ${
                    isSelected
                      ? 'bg-violet-600/10 border border-violet-500/30 text-violet-400 font-semibold shadow-md shadow-violet-600/5'
                      : 'border border-transparent text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs block tracking-wide">{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 text-[11px] text-slate-400 space-y-2 font-mono">
            <span className="text-xs font-semibold text-slate-300 block">Orchestrator Logs</span>
            <div className="space-y-1 opacity-75">
              <p>• Hooked 11 plugin endpoints</p>
              <p>• Automation listener loaded</p>
              <p>• Snapshot watcher primed</p>
            </div>
          </div>
        </aside>

        {/* Workspace Working Panel */}
        <main className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md relative min-h-[520px]">
          {activeTab === 'connected-accounts' && <ConnectedAccountsModule />}
          {activeTab === 'installed-plugins' && <PluginsModule />}
          {activeTab === 'ai-providers' && (
            <div className="space-y-8">
              <MemoryModule />
              <RAGModule />
            </div>
          )}
          {activeTab === 'email-providers' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-mono">Email provider configuration (Resend, SendGrid, SMTP) will appear here.</p>
            </div>
          )}
          {activeTab === 'storage-providers' && <ImportExportModule />}
          {activeTab === 'databases' && <BackupModule />}
          {activeTab === 'calendars' && (
             <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
               <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
               <p className="text-xs font-mono">Calendar syncing rules will appear here.</p>
             </div>
          )}
          {activeTab === 'api-keys' && <EnterpriseModule />}
          {activeTab === 'webhooks' && (
            <div className="space-y-8">
              <RulesModule />
              <WorkflowsModule />
            </div>
          )}
          {activeTab === 'sync-health' && (
            <div className="space-y-8">
              <DiagnosticsModule />
              <QAMonitoringModule />
              <JobsModule />
              <OfflineSyncModule />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// =========================================================================
// SUBCOMPONENTS - 1. PLUGINS CONNECTOR MODULE
// =========================================================================
function PluginsModule() {
  const queryClient = useQueryClient();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, any>>({});
  const [editingPlugin, setEditingPlugin] = useState<PluginDefinition | null>(null);
  const [configFields, setConfigFields] = useState<Record<string, string>>({});

  const { data: plugins, isLoading, refetch } = useQuery({
    queryKey: ['integration-plugins'],
    queryFn: () => apiService.getIntegrationPlugins()
  });

  const updatePluginMutation = useMutation({
    mutationFn: ({ id, enabled, config }: { id: string; enabled?: boolean; config?: Record<string, string> }) =>
      apiService.updateIntegrationPlugin(id, { enabled, config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-plugins'] });
      setEditingPlugin(null);
    }
  });

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await apiService.testIntegrationPlugin(id);
      setTestResult(prev => ({ ...prev, [id]: res }));
    } catch {
      setTestResult(prev => ({
        ...prev,
        [id]: { status: 'failed', details: 'Connection failed due to invalid network credentials.' }
      }));
    } finally {
      setTestingId(null);
    }
  };

  const startEditing = (p: PluginDefinition) => {
    setEditingPlugin(p);
    setConfigFields({ ...p.config });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 font-mono">
        <RefreshCw className="w-7 h-7 text-violet-500 animate-spin" />
        <span className="text-xs text-slate-400">Syncing plugin connector registry...</span>
      </div>
    );
  }

  const getCategoryColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-600/10 text-blue-400 border-blue-500/20';
      case 'messaging': return 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20';
      case 'calendar': return 'bg-purple-600/10 text-purple-400 border-purple-500/20';
      case 'crm': return 'bg-amber-600/10 text-amber-400 border-amber-500/20';
      case 'export': return 'bg-teal-600/10 text-teal-400 border-teal-500/20';
      default: return 'bg-slate-600/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400" />
            <span>Plugin Ecosystem Marketplace</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Configure keys, enable adapters, and execute handshakes.</p>
        </div>
        <button onClick={() => refetch()} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plugins?.map((plugin) => {
          const result = testResult[plugin.id];
          return (
            <div key={plugin.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-200 text-sm truncate">{plugin.name}</h3>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{plugin.provider}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono border uppercase tracking-wider ${getCategoryColor(plugin.type)}`}>
                    {plugin.type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal min-h-[34px]">{plugin.description}</p>
              </div>

              {/* Actions & Status */}
              <div className="mt-4 pt-3 border-t border-slate-900/60 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${plugin.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
                    <span className="text-slate-400 text-[11px]">{plugin.enabled ? 'Connection Active' : 'Disconnected'}</span>
                  </div>

                  <button
                    onClick={() => updatePluginMutation.mutate({ id: plugin.id, enabled: !plugin.enabled })}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 transition-colors ${
                      plugin.enabled
                        ? 'bg-red-500/5 hover:bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    <Power className="w-2.5 h-2.5" />
                    <span>{plugin.enabled ? 'Disable' : 'Enable'}</span>
                  </button>
                </div>

                {/* Handshake Result Alert */}
                {result && (
                  <div className={`p-2 rounded text-[10px] font-mono leading-relaxed border ${
                    result.status === 'success'
                      ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-950/20 border-red-500/20 text-red-400'
                  }`}>
                    <div className="flex items-center justify-between font-bold mb-0.5">
                      <span>{result.status === 'success' ? '✔ Handshake Successful' : '✘ Handshake Failed'}</span>
                      {result.latency && <span>{result.latency}ms</span>}
                    </div>
                    <p className="opacity-90">{result.details}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => startEditing(plugin)}
                    className="px-2 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 font-semibold rounded text-xs border border-slate-800 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Configure</span>
                  </button>
                  <button
                    onClick={() => handleTestConnection(plugin.id)}
                    disabled={testingId === plugin.id}
                    className="px-2 py-1.5 bg-violet-600/10 hover:bg-violet-600/20 disabled:bg-violet-950/10 text-violet-400 hover:text-violet-300 font-semibold rounded text-xs border border-violet-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    {testingId === plugin.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Radio className="w-3.5 h-3.5" />
                    )}
                    <span>Test Latency</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editing Dialog Backdrop */}
      {editingPlugin && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-slate-200 text-sm">Configure: {editingPlugin.name}</h3>
                <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{editingPlugin.provider}</span>
              </div>
              <button onClick={() => setEditingPlugin(null)} className="p-1 hover:bg-slate-800 rounded text-slate-400">
                <Trash2 className="w-4 h-4 text-slate-500 hover:text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">Secret API Token / Key</label>
                <input
                  type="password"
                  placeholder="Enter secure API token credentials"
                  value={configFields.apiKey || ''}
                  onChange={(e) => setConfigFields(prev => ({ ...prev, apiKey: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">Gateway Integration Endpoint URL</label>
                <input
                  type="text"
                  placeholder="https://api.example.com/v1"
                  value={configFields.endpoint || ''}
                  onChange={(e) => setConfigFields(prev => ({ ...prev, endpoint: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors font-mono"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPlugin(null)}
                  className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-850 rounded text-xs text-slate-400 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => updatePluginMutation.mutate({
                    id: editingPlugin.id,
                    config: configFields
                  })}
                  className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded transition-colors"
                >
                  Commit Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// SUBCOMPONENTS - 2. BACKGROUND JOB QUEUE MODULE
// =========================================================================
function JobsModule() {
  const queryClient = useQueryClient();
  const [selectedLogsJobId, setSelectedLogsJobId] = useState<string | null>(null);

  const { data: jobs, refetch, isFetching } = useQuery({
    queryKey: ['integration-jobs'],
    queryFn: () => apiService.getIntegrationJobs(),
    refetchInterval: 3000 // auto poll every 3s while viewed
  });

  const cancelJobMutation = useMutation({
    mutationFn: (id: string) => apiService.cancelIntegrationJob(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integration-jobs'] })
  });

  const retryJobMutation = useMutation({
    mutationFn: (id: string) => apiService.retryIntegrationJob(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integration-jobs'] })
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'running': return 'bg-violet-500/10 border-violet-500/20 text-violet-400';
      case 'failed': return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'cancelled': return 'bg-slate-500/10 border-slate-500/20 text-slate-400';
      default: return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    }
  };

  const selectedJob = jobs?.find(j => j.id === selectedLogsJobId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-400" />
            <span>Asynchronous Background Job Queue</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Real-time telemetry stream of background tasks and document compilers.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-850 rounded text-xs text-slate-300 font-mono border border-slate-800"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Poll State</span>
        </button>
      </div>

      <div className="space-y-3">
        {(!jobs || jobs.length === 0) ? (
          <div className="bg-slate-950 border border-slate-850 rounded-xl p-8 text-center text-slate-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-mono">No active background jobs scheduled in current session.</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-200 text-sm">{job.name}</h3>
                    <span className="text-[10px] bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded font-mono uppercase border border-slate-800/50">{job.type}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono block mt-1">ID: {job.id} • Commenced: {new Date(job.startedAt).toLocaleTimeString()}</span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                  <span className={`px-2 py-0.5 border rounded text-[9px] font-mono uppercase tracking-wider ${getStatusStyle(job.status)}`}>
                    {job.status}
                  </span>

                  {job.status === 'running' && (
                    <button
                      onClick={() => cancelJobMutation.mutate(job.id)}
                      className="p-1.5 bg-red-500/5 hover:bg-red-500/10 text-red-400 border border-red-500/20 rounded hover:text-red-300"
                      title="Abort Job Thread"
                    >
                      <Square className="w-3 h-3" />
                    </button>
                  )}

                  {(job.status === 'failed' || job.status === 'cancelled') && (
                    <button
                      onClick={() => retryJobMutation.mutate(job.id)}
                      className="p-1.5 bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 border border-violet-500/20 rounded hover:text-violet-300"
                      title="Re-schedule Job"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedLogsJobId(job.id)}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 text-[10px] rounded border border-slate-800 font-mono"
                  >
                    Inspect Logs
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                  <span>Compilation Progress</span>
                  <span className="font-bold">{job.progress}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-850">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      job.status === 'failed'
                        ? 'bg-red-500'
                        : job.status === 'completed'
                        ? 'bg-emerald-500'
                        : 'bg-violet-500'
                    }`}
                    style={{ width: `${job.progress}%` }}
                  ></div>
                </div>
              </div>

              {job.error && (
                <div className="p-2.5 bg-red-950/20 border border-red-500/20 rounded-lg text-[10px] font-mono text-red-400 leading-snug flex gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>ERROR HANDLER LOG: {job.error}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Logs Terminal Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-850 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-violet-400" />
                <span className="font-bold text-xs font-mono text-slate-200">Terminal Output — {selectedJob.name}</span>
              </div>
              <button
                onClick={() => setSelectedLogsJobId(null)}
                className="text-[10px] bg-slate-850 border border-slate-800 px-2 py-0.5 rounded text-slate-400 hover:text-slate-200"
              >
                Close Logs
              </button>
            </div>

            <div className="p-4 bg-slate-950 font-mono text-[10px] text-slate-300 leading-relaxed overflow-y-auto max-h-96 space-y-1 select-text">
              {selectedJob.logs.map((log: string, idx: number) => (
                <div key={idx} className="hover:bg-slate-900 px-2 py-0.5 rounded">
                  <span className="text-slate-500 select-none mr-2">[{idx + 1}]</span>
                  <span>{log}</span>
                </div>
              ))}
              <div className="text-violet-500 animate-pulse mt-2 pl-2">System awaiting callback signal... _</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// SUBCOMPONENTS - 3. AUTOMATION WORKFLOW RULES
// =========================================================================
function RulesModule() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [trigger, setTrigger] = useState('analysis_completed');
  const [action, setAction] = useState('suggest_proposal');
  const [actionParams, setActionParams] = useState<Record<string, any>>({ proposalType: 'email', tone: 'consultative' });

  const { data: rules, isLoading, refetch } = useQuery({
    queryKey: ['integration-rules'],
    queryFn: () => apiService.getAutomationRules()
  });

  const createRuleMutation = useMutation({
    mutationFn: (newRule: any) => apiService.createAutomationRule(newRule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-rules'] });
      setIsCreating(false);
      setRuleName('');
    }
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiService.updateAutomationRule(id, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integration-rules'] })
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteAutomationRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integration-rules'] })
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 font-mono">
        <RefreshCw className="w-7 h-7 text-violet-500 animate-spin" />
        <span className="text-xs text-slate-400">Loading visual rules database...</span>
      </div>
    );
  }

  const getTriggerLabel = (slug: string) => {
    switch (slug) {
      case 'analysis_completed': return 'When Website Analysis Finishes';
      case 'lead_created': return 'When New Lead is Discovered';
      case 'high_opportunity_detected': return 'When Opportunity Rating exceeds Threshold';
      case 'followup_due': return 'When Lead Follow-up Date arrives';
      default: return slug;
    }
  };

  const getActionLabel = (slug: string) => {
    switch (slug) {
      case 'suggest_proposal': return 'Auto-draft Custom Pitch Proposal';
      case 'send_notification': return 'Dispatch Multi-channel System Alert';
      case 'create_followup_task': return 'Create Callback Booking Reminder';
      default: return slug;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-400" />
            <span>CRM Workflow Automation Engine</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Define visual workspace instructions to link event triggers with actions.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs rounded-lg transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Rule</span>
        </button>
      </div>

      <div className="space-y-3">
        {(!rules || rules.length === 0) ? (
          <div className="bg-slate-950 border border-slate-850 rounded-xl p-8 text-center text-slate-500">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-mono">No workflow automation rules currently created.</p>
          </div>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="bg-slate-950 border border-slate-850 rounded-xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-200 text-sm truncate">{rule.name}</h3>
                  <span className="text-[9px] text-slate-500 font-mono">{rule.id}</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                  <span className="text-slate-500">TRIGGER:</span>
                  <span className="px-1.5 py-0.5 bg-slate-900 text-slate-300 border border-slate-800/80 rounded leading-none">
                    {getTriggerLabel(rule.trigger)}
                  </span>
                  <span className="text-slate-500">→ ACTION:</span>
                  <span className="px-1.5 py-0.5 bg-violet-950/20 text-violet-400 border border-violet-500/20 rounded leading-none">
                    {getActionLabel(rule.action)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-auto border-t border-slate-900 md:border-t-0 pt-3 md:pt-0">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-slate-400 text-[11px]">{rule.enabled ? 'Rule Active' : 'Suspended'}</span>
                  <button
                    onClick={() => toggleRuleMutation.mutate({ id: rule.id, enabled: !rule.enabled })}
                    className={`p-1 border rounded transition-colors ${
                      rule.enabled
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${rule.enabled ? 'opacity-100' : 'opacity-30'}`} />
                  </button>
                </div>

                <button
                  onClick={() => deleteRuleMutation.mutate(rule.id)}
                  className="p-1.5 hover:bg-slate-850 text-slate-500 hover:text-red-400 rounded transition-colors"
                  title="Purge Rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Rule Dialog */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createRuleMutation.mutate({ name: ruleName, trigger, action, actionParams });
            }}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-slate-200 text-sm">Create Automation Trigger</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Map CRM activities to background pipeline tasks.</p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Trigger email on dental leads"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">When Trigger Fires</label>
                <select
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                >
                  <option value="analysis_completed">Website analysis completes successfully</option>
                  <option value="lead_created">New prospect is created or uploaded</option>
                  <option value="high_opportunity_detected">Opportunity rating exceeds 85% threshold</option>
                  <option value="followup_due">CRM follow-up reminder expires</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">Execute Action</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                >
                  <option value="suggest_proposal">Draft customized email outreach pitch</option>
                  <option value="send_notification">Dispatch workspace alert & priority log</option>
                  <option value="create_followup_task">Create callback reminder task</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-850 rounded text-xs text-slate-400 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded transition-colors"
              >
                Assemble Rule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// SUBCOMPONENTS - 4. DATA PORTABILITY MODULE
// =========================================================================
function ImportExportModule() {
  const queryClient = useQueryClient();
  const [activeSub, setActiveSub] = useState<'import' | 'export'>('import');
  const [rawJson, setRawJson] = useState('');
  const [importResults, setImportResults] = useState<any[] | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  // Export fields selector state
  const exportFields = [
    { key: 'businessName', label: 'Business Name', checked: true },
    { key: 'website', label: 'Website Address', checked: true },
    { key: 'email', label: 'Email Contact', checked: true },
    { key: 'phone', label: 'Phone', checked: false },
    { key: 'industry', label: 'Detected Industry', checked: true },
    { key: 'city', label: 'Location City', checked: false },
    { key: 'opportunityScore', label: 'Opportunity score', checked: true },
    { key: 'websiteHealthScore', label: 'Website Health', checked: true }
  ];
  const [fieldsState, setFieldsState] = useState(exportFields);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf'>('csv');

  const loadMockLeads = () => {
    const mock = [
      { businessName: 'Lafayette Bistro', website: 'lafayettebistro.com', email: 'hello@lafayettebistro.com', industry: 'Restaurants', city: 'Montreal', country: 'Canada' },
      { businessName: 'Apex Legal Group', website: 'apexlegalgrp.com', email: 'contact@apexlegalgrp.com', industry: 'Law Firms', city: 'Boston', country: 'USA' },
      { businessName: 'Evergreen Health Clinic', website: 'evergreenhealth.ca', email: 'info@evergreenhealth.ca', industry: 'Medical Clinics', city: 'Vancouver', country: 'Canada' }
    ];
    setRawJson(JSON.stringify(mock, null, 2));
  };

  const handleValidate = async () => {
    try {
      const parsed = JSON.parse(rawJson);
      if (!Array.isArray(parsed)) {
        alert('Payload format validation failed. Root layout must be a JSON array of lead objects.');
        return;
      }
      const results = await apiService.validateImportLeads(parsed);
      setImportResults(results);
    } catch {
      alert('Invalid JSON structure. Please check bracket matches and quotes.');
    }
  };

  const handleCommit = async () => {
    if (!importResults) return;
    const session = queryClient.getQueryData(['session']) as any;
    const workspaceId = session?.workspace?.id || 'w-1';

    setIsCommitting(true);
    try {
      const validLeads = importResults.filter(r => r.isValid);
      await apiService.commitImportLeads(validLeads, workspaceId);
      alert('Import job dispatched to background queue! Progress can be monitored in the queue dashboard.');
      setImportResults(null);
      setRawJson('');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch {
      alert('Bulk lead commit operation failed.');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleExport = async () => {
    const selectedKeys = fieldsState.filter(f => f.checked).map(f => f.key);
    if (selectedKeys.length === 0) {
      alert('Select at least one workspace column to export.');
      return;
    }
    const session = queryClient.getQueryData(['session']) as any;
    const workspaceId = session?.workspace?.id;

    try {
      if (exportFormat === 'pdf') {
        const res = await apiService.exportLeads('pdf', selectedKeys, workspaceId);
        alert('Printable executive layout generated with ' + res.rows.length + ' active leads! Sending dispatch commands.');
      } else {
        await apiService.exportLeads(exportFormat, selectedKeys, workspaceId);
      }
    } catch {
      alert('File compilation failed.');
    }
  };

  const toggleField = (key: string) => {
    setFieldsState(prev => prev.map(f => f.key === key ? { ...f, checked: !f.checked } : f));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ArrowUpFromLine className="w-4 h-4 text-violet-400" />
            <span>Data Portability Hub</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Securely ingest external lead pools or export CRM logs in tabular file formats.</p>
        </div>

        <div className="flex bg-slate-950 p-1 border border-slate-850 rounded-lg text-xs font-mono font-semibold">
          <button
            onClick={() => { setActiveSub('import'); setImportResults(null); }}
            className={`px-3 py-1.5 rounded-md transition-all ${activeSub === 'import' ? 'bg-violet-600 text-white shadow' : 'text-slate-400'}`}
          >
            Bulk Ingest
          </button>
          <button
            onClick={() => setActiveSub('export')}
            className={`px-3 py-1.5 rounded-md transition-all ${activeSub === 'export' ? 'bg-violet-600 text-white shadow' : 'text-slate-400'}`}
          >
            Tabular Export
          </button>
        </div>
      </div>

      {activeSub === 'import' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-semibold uppercase">Paste JSON Leads Pool</span>
            <button
              onClick={loadMockLeads}
              className="text-[10px] text-violet-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Load sample B2B restaurants</span>
            </button>
          </div>

          <textarea
            rows={8}
            placeholder="[&#10;  { &quot;businessName&quot;: &quot;Sample Company&quot;, &quot;website&quot;: &quot;sample.com&quot; }&#10;]"
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-xl p-4 font-mono text-[11px] text-slate-300 focus:outline-none focus:border-violet-500 transition-colors whitespace-pre scrollbar-thin"
          />

          {!importResults ? (
            <button
              onClick={handleValidate}
              disabled={!rawJson.trim()}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-850 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Audit JSON Structure & Check Duplicates</span>
            </button>
          ) : (
            <div className="space-y-4 border border-slate-850 rounded-xl p-4 bg-slate-950/20">
              <div className="flex justify-between items-center border-b border-slate-850 pb-2.5 text-xs">
                <div>
                  <span className="font-bold text-slate-200">Pre-Import Sync Review</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Checking email syntax, website formats, and database conflicts.</p>
                </div>
                <button
                  onClick={() => setImportResults(null)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 font-mono"
                >
                  Clear Results
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {importResults.map((r, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-900 rounded-lg p-2.5 flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-200 block truncate">{r.businessName}</span>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 space-x-1.5">
                        {r.website && <span>Website: {r.website}</span>}
                        {r.email && <span>Email: {r.email}</span>}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0 font-mono text-[9px] uppercase tracking-wide">
                      {r.isDuplicate ? (
                        <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/15 rounded">Duplicate Entry</span>
                      ) : r.isValid ? (
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded">Valid & Primed</span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/15 rounded">Error flag</span>
                      )}

                      {r.errors.map((err: string, i: number) => (
                        <span key={i} className="text-red-400 block tracking-normal italic mt-0.5 lowercase font-sans">{err}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setImportResults(null)}
                  className="flex-1 py-2 bg-slate-950 hover:bg-slate-850 rounded text-xs text-slate-400 font-medium transition-colors"
                >
                  Back to Editor
                </button>
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={isCommitting || !importResults.some(r => r.isValid)}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>{isCommitting ? 'Commiting...' : 'Dispatch Import to Queue'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-850 rounded-xl p-4.5 space-y-4">
            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-2 font-mono uppercase tracking-wider">1. Select Columns to Package</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {fieldsState.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => toggleField(f.key)}
                    className={`flex items-center gap-2.5 p-2 rounded-lg text-left text-xs transition-colors border ${
                      f.checked
                        ? 'bg-violet-600/10 text-violet-400 border-violet-500/30'
                        : 'bg-slate-900 border-slate-850 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center shrink-0 ${f.checked ? 'border-violet-400 text-violet-400 bg-violet-600/10' : 'border-slate-700 text-transparent'}`}>
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span className="truncate">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-2 font-mono uppercase tracking-wider">2. Choose Output Format</span>
              <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                {[
                  { id: 'csv', label: 'CSV Tabular', icon: FileText, desc: 'Excel spreadsheet match' },
                  { id: 'json', label: 'JSON Payload', icon: FileJson, desc: 'REST server object' },
                  { id: 'pdf', label: 'PDF Summary', icon: Database, desc: 'Boardroom executive printout' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setExportFormat(f.id as any)}
                    className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all text-center ${
                      exportFormat === f.id
                        ? 'bg-violet-600/10 border-violet-500/30 text-violet-400 shadow shadow-violet-600/5'
                        : 'bg-slate-900 border-slate-850 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                    }`}
                  >
                    <f.icon className="w-5 h-5 text-violet-400" />
                    <div>
                      <span className="font-bold text-[11px] block">{f.label}</span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">{f.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleExport}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Generate & Download Export File</span>
          </button>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// SUBCOMPONENTS - 5. DISASTER RECOVERY & BACKUP MODULE
// =========================================================================
function BackupModule() {
  const queryClient = useQueryClient();
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  const { data: backups, isLoading, refetch } = useQuery({
    queryKey: ['integration-backups'],
    queryFn: () => apiService.getBackups()
  });

  const createMutation = useMutation({
    mutationFn: () => apiService.createBackup(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-backups'] });
      alert('Local database backup snapshot generated! File saved inside the secure workspace backup repository.');
    }
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => apiService.restoreBackup(id),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setConfirmRestoreId(null);
      alert('Disaster Recovery Rollback Completed Successfully! CRM databases, tasks logs, and settings have been completely restored.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteBackup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-backups'] });
      alert('Snapshot permanently deleted.');
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 font-mono">
        <RefreshCw className="w-7 h-7 text-violet-500 animate-spin" />
        <span className="text-xs text-slate-400">Scanning local backups directory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-violet-400" />
            <span>Disaster Recovery & Backup Console</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Secure, non-destructive snapshot recovery maps to rollback settings.</p>
        </div>
        <button
          onClick={() => createMutation.mutate()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs rounded-lg transition-all"
        >
          <Database className="w-3.5 h-3.5" />
          <span>Capture Snapshot</span>
        </button>
      </div>

      <div className="space-y-3">
        {(!backups || backups.length === 0) ? (
          <div className="bg-slate-950 border border-slate-850 rounded-xl p-8 text-center text-slate-500">
            <HardDrive className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-mono">No previous system snapshots recorded on current workspace container storage.</p>
          </div>
        ) : (
          backups.map((backup) => (
            <div key={backup.id} className="bg-slate-950 border border-slate-850 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-200">{backup.id}</span>
                  <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-mono">JSON DB</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono block mt-1.5">
                  Size: {Math.round(backup.sizeBytes / 1024 * 10) / 10} KB • Captured: {new Date(backup.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  onClick={() => setConfirmRestoreId(backup.id)}
                  className="px-2.5 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 hover:text-emerald-300 font-semibold text-xs border border-emerald-500/20 rounded transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Snapshot</span>
                </button>
                <button
                  onClick={() => deleteMutation.mutate(backup.id)}
                  className="p-2 bg-slate-900 hover:bg-red-950/20 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-500/10 rounded transition-all"
                  title="Wipe Backup Snapshot File"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Restore Safety Modal */}
      {confirmRestoreId && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-200 text-sm">Disaster Recovery Warning</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  You are about to restore the CRM database state to snapshot: <strong className="font-mono text-slate-300 text-xs block mt-1">{confirmRestoreId}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-normal bg-slate-950 border border-slate-850 p-3 rounded-lg font-mono">
              ★ SYSTEM SAFEGUARD: The gateway will automatically compile a protective rollback file of your current state prior to overwriting database matrices.
            </p>

            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setConfirmRestoreId(null)}
                className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-850 rounded text-xs text-slate-400 font-medium transition-colors"
              >
                Abort Rollback
              </button>
              <button
                type="button"
                onClick={() => restoreMutation.mutate(confirmRestoreId)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition-colors"
              >
                Trigger Restore Sequence
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// SUBCOMPONENTS - 6. SYSTEM DIAGNOSTICS MODULE
// =========================================================================
function DiagnosticsModule() {
  const queryClient = useQueryClient();
  const [diagnosticsSubTab, setDiagnosticsSubTab] = useState<'telemetry' | 'monitoring' | 'security' | 'integrity'>('telemetry');
  const [resetEmail, setResetEmail] = useState('');

  // 1. Diagnostics Query
  const { data: telemetry, isLoading: loadingTelemetry, refetch: refetchTelemetry } = useQuery({
    queryKey: ['integration-diagnostics'],
    queryFn: () => apiService.getDiagnostics(),
    refetchInterval: 10000 // auto-refresh every 10s
  });

  // 2. Integrity Query
  const { data: integrityReport, isLoading: loadingIntegrity, refetch: refetchIntegrity } = useQuery({
    queryKey: ['integration-integrity'],
    queryFn: () => apiService.getIntegrityReport(),
    enabled: diagnosticsSubTab === 'integrity'
  });

  // 3. Security Query
  const { data: securityPolicy, isLoading: loadingSecurity, refetch: refetchSecurity } = useQuery({
    queryKey: ['integration-security'],
    queryFn: () => apiService.getSecurityPolicy(),
    enabled: diagnosticsSubTab === 'security'
  });

  // Mutations
  const repairMutation = useMutation({
    mutationFn: () => apiService.repairIntegrity(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['integration-integrity'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      alert(`Auto-repair successfully executed! Fix details:\n${data.repairs.join('\n') || 'No issues required modification.'}`);
    }
  });

  const updateSecurityMutation = useMutation({
    mutationFn: (body: any) => apiService.updateSecurityPolicy(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-security'] });
      alert('Security policy parameters updated successfully.');
    }
  });

  const pwdResetMutation = useMutation({
    mutationFn: (email: string) => apiService.triggerPasswordReset(email),
    onSuccess: (data) => {
      alert(data.message);
      setResetEmail('');
    }
  });

  const resetLockoutMutation = useMutation({
    mutationFn: () => apiService.resetLockout(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-security'] });
      alert('Failed attempts counter has been reset and all security IP lockouts have been released.');
    }
  });

  if (loadingTelemetry || (diagnosticsSubTab === 'integrity' && loadingIntegrity) || (diagnosticsSubTab === 'security' && loadingSecurity)) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 font-mono">
        <RefreshCw className="w-7 h-7 text-violet-500 animate-spin" />
        <span className="text-xs text-slate-400">Loading operational subsystem dashboard...</span>
      </div>
    );
  }

  const { buildVersion, nodeVersion, database, aiService, plugins, queue, systemResources, logs, trends } = telemetry || {};

  return (
    <div className="space-y-6">
      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-violet-400" />
            <span>Diagnostics & Control Subsystems</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Enterprise auditing, security parameters, and server-side latency telemetry.</p>
        </div>

        {/* Sub-tab Pill bar */}
        <div className="flex bg-slate-950 p-1 border border-slate-850 rounded-lg text-xs font-mono font-semibold self-stretch sm:self-auto justify-around">
          <button
            onClick={() => setDiagnosticsSubTab('telemetry')}
            className={`px-3 py-1.5 rounded-md transition-all ${diagnosticsSubTab === 'telemetry' ? 'bg-violet-600 text-white' : 'text-slate-400'}`}
          >
            Core Status
          </button>
          <button
            onClick={() => setDiagnosticsSubTab('monitoring')}
            className={`px-3 py-1.5 rounded-md transition-all ${diagnosticsSubTab === 'monitoring' ? 'bg-violet-600 text-white' : 'text-slate-400'}`}
          >
            Telemetry Trends
          </button>
          <button
            onClick={() => setDiagnosticsSubTab('security')}
            className={`px-3 py-1.5 rounded-md transition-all ${diagnosticsSubTab === 'security' ? 'bg-violet-600 text-white' : 'text-slate-400'}`}
          >
            Security Policy
          </button>
          <button
            onClick={() => setDiagnosticsSubTab('integrity')}
            className={`px-3 py-1.5 rounded-md transition-all ${diagnosticsSubTab === 'integrity' ? 'bg-violet-600 text-white' : 'text-slate-400'}`}
          >
            Data Integrity
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: Standard Core Telemetry */}
      {diagnosticsSubTab === 'telemetry' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-[11px]">
            {/* Version Block */}
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                <Server className="w-4 h-4 text-violet-400" />
                <span className="font-bold text-slate-200 uppercase">Gateway Specs</span>
              </div>
              <div className="space-y-1 text-slate-400 leading-normal">
                <div className="flex justify-between"><span>Active Build:</span><span className="text-slate-300 font-bold">{buildVersion}</span></div>
                <div className="flex justify-between"><span>Node Engine:</span><span className="text-slate-300 font-bold">{nodeVersion}</span></div>
                <div className="flex justify-between"><span>Container Env:</span><span className="text-slate-300 font-bold">Production</span></div>
              </div>
            </div>

            {/* DB Metrics */}
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                <Database className="w-4 h-4 text-violet-400" />
                <span className="font-bold text-slate-200 uppercase">Database Status</span>
              </div>
              <div className="space-y-1 text-slate-400 leading-normal">
                <div className="flex justify-between"><span>JSON Allocation:</span><span className="text-emerald-400 font-bold">{database?.status}</span></div>
                <div className="flex justify-between"><span>File Storage:</span><span className="text-slate-300 font-bold">{Math.round((database?.fileSizeBytes || 0) / 1024 * 10) / 10} KB</span></div>
                <div className="flex justify-between"><span>Leads Index:</span><span className="text-slate-300 font-bold">{database?.recordsCount?.leads} rows</span></div>
              </div>
            </div>

            {/* Jobs Subsystem */}
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                <Clock className="w-4 h-4 text-violet-400" />
                <span className="font-bold text-slate-200 uppercase">Job Queue</span>
              </div>
              <div className="space-y-1 text-slate-400 leading-normal">
                <div className="flex justify-between"><span>Active Jobs:</span><span className="text-violet-400 font-bold">{queue?.activeCount} thread</span></div>
                <div className="flex justify-between"><span>Pending Tasks:</span><span className="text-slate-300 font-bold">{queue?.queuedCount}</span></div>
                <div className="flex justify-between"><span>Completed Runs:</span><span className="text-slate-300 font-bold">{queue?.completedCount}</span></div>
              </div>
            </div>
          </div>

          {/* Memory Allocations Gauge */}
          <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3 font-mono text-[11px]">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
              <Cpu className="w-4 h-4 text-violet-400" />
              <span className="font-bold text-slate-200 uppercase">Heap Allocations & Resident Memory</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Resident Set Size (RSS)</span>
                  <span className="font-bold text-slate-300">{systemResources?.memoryUsageMB?.rss} MB</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-850">
                  <div className="bg-violet-500 h-full rounded-full" style={{ width: `${Math.min(100, ((systemResources?.memoryUsageMB?.rss || 40) / 128) * 100)}%` }}></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>V8 Heap limit</span>
                  <span className="font-bold text-slate-300">{systemResources?.memoryUsageMB?.heapTotal} MB</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-850">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, ((systemResources?.memoryUsageMB?.heapTotal || 50) / 128) * 100)}%` }}></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>V8 Heap Used</span>
                  <span className="font-bold text-slate-300">{systemResources?.memoryUsageMB?.heapUsed} MB</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-850">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, ((systemResources?.memoryUsageMB?.heapUsed || 25) / 128) * 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Safe Unified Errors Stream */}
          <div className="space-y-3 font-mono text-[11px]">
            <div className="flex items-center gap-2 text-slate-200 font-bold uppercase tracking-wider pl-1">
              <AlertCircle className="w-4 h-4 text-violet-400" />
              <span>Safe System Logs Audit Stream (Unified Errors)</span>
            </div>

            <div className="bg-slate-950 border border-slate-850 rounded-xl p-3.5 space-y-3 max-h-56 overflow-y-auto leading-relaxed scrollbar-thin text-left">
              {logs?.map((log: any) => (
                <div key={log.id} className="border-b border-slate-900 pb-2.5 last:border-0 last:pb-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                      log.level === 'WARN' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    }`}>
                      {log.level}
                    </span>
                    <span className="text-violet-400 font-bold">[{log.component}]</span>
                    <span className="text-slate-400 italic text-[10px]">ID: {log.id}</span>
                  </div>
                  <p className="text-slate-300 font-sans font-medium">{log.message}</p>
                  <p className="text-[10px] text-emerald-400 font-mono bg-slate-900/50 px-2 py-1 border border-slate-850/40 rounded mt-1">
                    ★ RECOMMENDED ACTION: {log.suggestedAction}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Telemetry Trends Monitoring Graphs */}
      {diagnosticsSubTab === 'monitoring' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* API & AI Latency Trend Chart */}
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3">
              <div className="text-left">
                <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wide flex items-center gap-2">
                  <Activity className="w-4 h-4 text-violet-400 animate-pulse" />
                  <span>API Latency & AI Generation Speed (ms)</span>
                </h3>
                <p className="text-[10px] text-slate-400">Tracks performance trends and smart pipeline latencies over time.</p>
              </div>

              <div className="h-56 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorApi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="time" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', color: '#cbd5e1' }} />
                    <Area type="monotone" dataKey="apiLatency" name="API Response (ms)" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorApi)" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="aiLatency" name="AI Draft Gen (ms)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAi)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RAM Allocation & CPU Performance */}
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3">
              <div className="text-left">
                <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wide flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>CPU Load & Memory Allocation (Trends)</span>
                </h3>
                <p className="text-[10px] text-slate-400">Node thread utilization indexes and heap safety reserves.</p>
              </div>

              <div className="h-56 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="time" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', color: '#cbd5e1' }} />
                    <Area type="monotone" dataKey="cpuPercent" name="CPU Usage (%)" stroke="#10b981" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="memoryMb" name="RAM Resident (MB)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorMem)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Operational Metrics Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-[11px]">
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 block">Avg API Latency</span>
              <span className="text-base font-bold text-slate-100 block mt-1">56.5ms</span>
            </div>
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 block">Active CRM Seats</span>
              <span className="text-base font-bold text-violet-400 block mt-1">10 Sessions</span>
            </div>
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 block">Database Query speed</span>
              <span className="text-base font-bold text-emerald-400 block mt-1">1.5ms</span>
            </div>
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 block">Avg Job Fail Rate</span>
              <span className="text-base font-bold text-red-400 block mt-1">0.05%</span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Enterprise Security & MFA Policy */}
      {diagnosticsSubTab === 'security' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Security Parameters Block */}
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-4 font-mono text-[11px] text-left">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-2.5">
                <Lock className="w-4 h-4 text-violet-400" />
                <span className="font-bold text-slate-200 uppercase">Enterprise Policies</span>
              </div>

              {/* MFA Toggle */}
              <div className="flex items-center justify-between bg-slate-900 border border-slate-850 rounded-lg p-3">
                <div>
                  <span className="font-bold text-slate-200 block">Two-Factor Authentication (MFA)</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Forces dual token codes on CRM logins.</span>
                </div>
                <button
                  onClick={() => updateSecurityMutation.mutate({ mfaEnabled: !securityPolicy?.mfaEnabled })}
                  className={`px-3 py-1 bg-slate-950 border rounded font-semibold text-xs transition-colors ${
                    securityPolicy?.mfaEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {securityPolicy?.mfaEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Lockout Options */}
              <div className="space-y-3.5 pt-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Failed Login Lockout Threshold:</span>
                  <select
                    value={securityPolicy?.accountLockoutThreshold || 5}
                    onChange={(e) => updateSecurityMutation.mutate({ accountLockoutThreshold: Number(e.target.value) })}
                    className="bg-slate-900 border border-slate-850 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
                  >
                    <option value={3}>3 Attempts</option>
                    <option value={5}>5 Attempts (Default)</option>
                    <option value={10}>10 Attempts</option>
                  </select>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Session Idle Auto-Timeout:</span>
                  <select
                    value={securityPolicy?.sessionTimeoutMinutes || 120}
                    onChange={(e) => updateSecurityMutation.mutate({ sessionTimeoutMinutes: Number(e.target.value) })}
                    className="bg-slate-900 border border-slate-850 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={120}>120 Minutes (Default)</option>
                    <option value={480}>8 Hours</option>
                  </select>
                </div>
              </div>

              {/* Reset operations */}
              <div className="border-t border-slate-900 pt-3 flex gap-3">
                <button
                  onClick={() => resetLockoutMutation.mutate()}
                  className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded text-slate-300 font-semibold text-[10px] text-center transition-colors"
                >
                  Clear IP Lockouts
                </button>
                <button
                  onClick={() => pwdResetMutation.mutate('abdulwahababdullah3619@gmail.com')}
                  className="flex-1 py-1.5 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 rounded text-violet-400 font-bold text-[10px] text-center transition-all"
                >
                  Test Pwd Reset Trigger
                </button>
              </div>
            </div>

            {/* Active Devices & Device Logins */}
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3 font-mono text-[11px] text-left">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                <Fingerprint className="w-4 h-4 text-violet-400" />
                <span className="font-bold text-slate-200 uppercase">Device & Sessions Management</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {securityPolicy?.activeSessions?.map((sess: any) => (
                  <div key={sess.id} className="bg-slate-900 border border-slate-850/60 rounded-lg p-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-200 block">{sess.device}</span>
                      <span className="text-[9px] text-slate-500 block mt-1">{sess.location} • IP: {sess.ip}</span>
                    </div>
                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/15 font-bold uppercase shrink-0">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Security Sensitive Audit Timeline */}
          <div className="space-y-3 font-mono text-[11px]">
            <div className="flex items-center gap-2 text-slate-200 font-bold uppercase tracking-wider pl-1">
              <ShieldCheck className="w-4 h-4 text-violet-400" />
              <span>Privileged Security Audit Trails</span>
            </div>

            <div className="bg-slate-950 border border-slate-850 rounded-xl p-3.5 space-y-3 max-h-48 overflow-y-auto leading-relaxed scrollbar-thin text-left">
              {securityPolicy?.auditLogs?.map((audit: any) => (
                <div key={audit.id} className="flex gap-2.5 border-b border-slate-900 pb-2 last:border-0 last:pb-0 items-start text-[10.5px]">
                  <span className="text-slate-500 shrink-0 select-none">[{new Date(audit.timestamp).toLocaleTimeString()}]</span>
                  <span className={`px-1 rounded text-[8px] font-extrabold uppercase shrink-0 border self-start ${
                    audit.severity === 'high' ? 'bg-red-500/10 border-red-500/15 text-red-400' :
                    audit.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/15 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    {audit.event}
                  </span>
                  <p className="text-slate-300 font-sans font-medium">{audit.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Data Integrity and Repair */}
      {diagnosticsSubTab === 'integrity' && (
        <div className="space-y-6">
          <div className="bg-slate-950 border border-slate-850 rounded-xl p-4.5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-3 text-left">
              <div>
                <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-violet-400" />
                  <span>Real-Time Database Records Integrity Scan</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Scans relational pointer constraints, broken references, duplicated URLs, and contact structural anomalies.</p>
              </div>

              <div className="flex gap-2 w-full sm:w-auto self-stretch sm:self-auto font-mono text-[11px]">
                <button
                  onClick={() => refetchIntegrity()}
                  className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 font-semibold border border-slate-800 rounded transition-colors"
                >
                  Re-Scan
                </button>
                <button
                  onClick={() => repairMutation.mutate()}
                  disabled={repairMutation.isPending || !integrityReport?.issues || integrityReport.issues.length === 0}
                  className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-900 disabled:text-slate-500 disabled:border-slate-800 border border-transparent rounded text-white font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${repairMutation.isPending ? 'animate-spin' : ''}`} />
                  <span>Execute Auto-Repair</span>
                </button>
              </div>
            </div>

            {/* List of Integrity Concerns */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto scrollbar-thin font-mono text-[11px] text-left">
              {(!integrityReport?.issues || integrityReport.issues.length === 0) ? (
                <div className="text-center py-10 text-slate-500 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-75" />
                  <div>
                    <span className="font-bold text-slate-300 text-xs block">Perfect Structural Database Health!</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">No orphaned records, corrupted JSON schemas, or protocol mismatches detected.</span>
                  </div>
                </div>
              ) : (
                integrityReport.issues.map((issue: any) => (
                  <div key={issue.id} className="bg-slate-900/50 border border-slate-850 rounded-xl p-3 flex justify-between items-start gap-4">
                    <div className="space-y-1 text-slate-300">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-3.5 h-3.5 ${issue.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`} />
                        <span className="font-bold text-slate-200 text-xs">{issue.type}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                          issue.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/15 text-amber-400' : 'bg-blue-500/10 border-blue-500/15 text-blue-400'
                        }`}>
                          {issue.severity} priority
                        </span>
                      </div>
                      <p className="font-sans text-slate-400 text-xs leading-normal">{issue.description}</p>
                    </div>

                    <span className="text-[9px] text-slate-500 font-mono shrink-0 select-all border border-slate-800 bg-slate-950 px-2 py-0.5 rounded">
                      ID: {issue.recordId}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
