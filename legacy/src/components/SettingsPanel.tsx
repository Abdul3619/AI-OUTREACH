import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api.ts';
import {
  Settings, Bot, Sliders, Mail, Database, Palette, Bell,
  Globe, Shield, HardDrive, Share2, Save, CheckCircle, AlertCircle, RefreshCw, Layers
} from 'lucide-react';

export default function SettingsPanel() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('general');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch settings from API
  const { data: settings, isLoading, isError, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiService.getSettings()
  });

  // Mutation to update settings
  const updateMutation = useMutation({
    mutationFn: ({ section, value }: { section: string; value: any }) =>
      apiService.updateSettings(section, value),
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      setSuccessMsg('Settings updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 font-sans">
        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
        <p className="text-sm text-slate-400">Loading system settings module...</p>
      </div>
    );
  }

  if (isError || !settings) {
    return (
      <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-6 text-center font-sans">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="text-white font-semibold mb-1">Configuration Load Failed</h3>
        <p className="text-sm text-slate-400 mb-4">The API gateway was unable to read the persistent JSON DB.</p>
        <button onClick={() => refetch()} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-all font-medium">
          Retry Fetch
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings, desc: 'Agency business details & localization metrics' },
    { id: 'ai', label: 'AI Configuration', icon: Bot, desc: 'Configure LLM parameter limits & QA loop logic' },
    { id: 'plugins', label: 'Plugin Registry', icon: Layers, desc: 'Swappable third-party connectors status' },
    { id: 'email', label: 'Email Provider', icon: Mail, desc: 'SMTP, Resend, and OAuth dispatch keys' },
    { id: 'database', label: 'Database Setup', icon: Database, desc: 'Cloud SQL, Supabase and local JSON configurations' },
    { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Choose theme preset accents & layout density' },
    { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Configure dispatch triggers & alert targets' },
    { id: 'language', label: 'Language & Locale', icon: Globe, desc: 'Configure default proposal translation filters' },
    { id: 'security', label: 'Security & Access', icon: Shield, desc: 'Configure MFA constraints & session parameters' },
    { id: 'backup', label: 'System Backup', icon: HardDrive, desc: 'Schedule persistent backups & data export maps' },
    { id: 'integrations', label: 'OAuth Integrations', icon: Share2, desc: 'Connected accounts and external tokens' }
  ];

  // Tab Content Render Map
  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralSettingsTab
            config={settings.general || {}}
            onSave={(val) => updateMutation.mutate({ section: 'general', value: val })}
            isSaving={updateMutation.isPending}
          />
        );
      case 'ai':
        return (
          <AISettingsTab
            config={settings.ai || {}}
            onSave={(val) => updateMutation.mutate({ section: 'ai', value: val })}
            isSaving={updateMutation.isPending}
          />
        );
      case 'plugins':
        return <PluginsTab config={settings.plugins || {}} />;
      case 'email':
        return (
          <EmailSettingsTab
            config={settings.plugins || {}}
            onSave={(val) => updateMutation.mutate({ section: 'plugins', value: val })}
            isSaving={updateMutation.isPending}
          />
        );
      case 'database':
        return (
          <DatabaseSettingsTab
            config={settings.plugins || {}}
            onSave={(val) => updateMutation.mutate({ section: 'plugins', value: val })}
            isSaving={updateMutation.isPending}
          />
        );
      case 'appearance':
        return (
          <AppearanceTab
            config={settings.appearance || {}}
            onSave={(val) => updateMutation.mutate({ section: 'appearance', value: val })}
            isSaving={updateMutation.isPending}
          />
        );
      case 'notifications':
        return (
          <NotificationsTab
            config={settings.notifications || {}}
            onSave={(val) => updateMutation.mutate({ section: 'notifications', value: val })}
            isSaving={updateMutation.isPending}
          />
        );
      case 'language':
        return (
          <LanguageTab
            config={settings.language || {}}
            onSave={(val) => updateMutation.mutate({ section: 'language', value: val })}
            isSaving={updateMutation.isPending}
          />
        );
      case 'security':
        return (
          <SecurityTab
            config={settings.security || {}}
            onSave={(val) => updateMutation.mutate({ section: 'security', value: val })}
            isSaving={updateMutation.isPending}
          />
        );
      case 'backup':
        return (
          <BackupTab
            config={settings.backup || {}}
            onSave={(val) => updateMutation.mutate({ section: 'backup', value: val })}
            isSaving={updateMutation.isPending}
          />
        );
      case 'integrations':
        return <IntegrationsTab config={settings.plugins || {}} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 font-sans">
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-72 shrink-0">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
          <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800">
            <h3 className="font-semibold text-slate-200 text-sm">System Preference Hub</h3>
            <p className="text-xs text-slate-400">Manage SaaS client configurations</p>
          </div>
          <nav className="p-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                    activeTab === tab.id
                      ? 'bg-violet-600/10 text-violet-400 border border-violet-500/20 font-medium'
                      : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="truncate">
                    <div className="text-sm truncate">{tab.label}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Form Working Panel */}
      <div className="flex-1 min-w-0">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md relative min-h-[500px]">
          {/* Header */}
          <div className="mb-6 border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-slate-100">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {tabs.find((t) => t.id === activeTab)?.desc}
            </p>
          </div>

          {/* Success Alerts */}
          {successMsg && (
            <div className="mb-6 p-3 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Tab Subcomponents */}
          <div className="text-slate-200">{renderTabContent()}</div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// TAB RENDERER SUBCOMPONENTS WITH ROBUST MOCK & EDIT FLOWS
// -------------------------------------------------------------

/* 1. GENERAL SETTINGS */
interface GeneralTabProps {
  config: any;
  onSave: (val: any) => void;
  isSaving: boolean;
}
function GeneralSettingsTab({ config, onSave, isSaving }: GeneralTabProps) {
  const [companyName, setCompanyName] = useState(config.companyName || '');
  const [supportEmail, setSupportEmail] = useState(config.supportEmail || '');
  const [timezone, setTimezone] = useState(config.timezone || 'America/New_York');
  const [currency, setCurrency] = useState(config.currency || 'USD');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ companyName, supportEmail, timezone, currency });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Company/Agency Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Support Email Address</label>
          <input
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Operation Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
          >
            <option value="America/New_York">Eastern Standard Time (EST)</option>
            <option value="America/Chicago">Central Standard Time (CST)</option>
            <option value="America/Denver">Mountain Standard Time (MST)</option>
            <option value="America/Los_Angeles">Pacific Standard Time (PST)</option>
            <option value="Europe/London">Greenwich Mean Time (GMT)</option>
            <option value="UTC">UTC Universal Coordinated Time</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Default Currency Accent</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
          >
            <option value="USD">USD ($) US Dollar</option>
            <option value="EUR">EUR (€) Euro</option>
            <option value="GBP">GBP (£) British Pound</option>
            <option value="CAD">CAD ($) Canadian Dollar</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end pt-4 border-t border-slate-850">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-medium text-sm rounded-lg transition-all"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save General settings
        </button>
      </div>
    </form>
  );
}

/* 2. AI SETTINGS */
interface AITabProps {
  config: any;
  onSave: (val: any) => void;
  isSaving: boolean;
}
function AISettingsTab({ config, onSave, isSaving }: AITabProps) {
  const [defaultModel, setDefaultModel] = useState(config.defaultModel || 'gemini-2.5-flash');
  const [temperature, setTemperature] = useState(config.temperature || 0.7);
  const [maxTokens, setMaxTokens] = useState(config.maxTokens || 2048);
  const [useQAFeedbackLoop, setUseQAFeedbackLoop] = useState(config.useQAFeedbackLoop !== false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ defaultModel, temperature, maxTokens, useQAFeedbackLoop });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Primary Crawler AI Model</label>
          <select
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
          >
            <option value="gemini-2.5-flash">gemini-2.5-flash (Ultra-Fast SWOT Analyzer)</option>
            <option value="gemini-2.5-pro">gemini-2.5-pro (High Precision Draft Copywriter)</option>
            <option value="gpt-4o">gpt-4o-mini (Swappable fallback engine)</option>
            <option value="claude-3-5-sonnet">claude-3-5-sonnet (High complexity editing)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Max Output Length (Tokens)</label>
          <input
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sampling Temperature ({temperature})</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-violet-500 focus:outline-none py-4"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>Deterministic (0.0)</span>
            <span>Creative (1.0)</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="qa_loop"
            checked={useQAFeedbackLoop}
            onChange={(e) => setUseQAFeedbackLoop(e.target.checked)}
            className="w-4 h-4 rounded border-slate-800 text-violet-600 bg-slate-950 focus:ring-violet-500"
          />
          <label htmlFor="qa_loop" className="text-sm text-slate-300 font-medium cursor-pointer">
            Enable Agent 5 (QA) Self-Healing feedback loops
          </label>
        </div>
      </div>
      <div className="flex justify-end pt-4 border-t border-slate-850">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-medium text-sm rounded-lg transition-all"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save AI parameters
        </button>
      </div>
    </form>
  );
}

/* 3. PLUGIN CONNECTORS REGISTRY */
function PluginsTab({ config }: { config: any }) {
  const { data: plugins, isLoading } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiService.getPlugins()
  });

  if (isLoading) {
    return <p className="text-xs text-slate-400 animate-pulse">Loading connected connectors registry...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="p-3.5 bg-blue-950/20 border border-blue-500/20 rounded-lg text-xs text-blue-400 mb-2">
        <strong>Phase 1 Spec Check:</strong> Each connector is declared, registered, and prepared with unified abstract adapters in the server-side registry. Add keys in sub-tabs to activate real-time client pipelines.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {plugins?.map((plugin) => (
          <div key={plugin.id} className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-slate-200">{plugin.name}</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase font-mono">{plugin.category}</span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{plugin.description}</p>
            </div>
            <div>
              {plugin.isConfigured ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                  Inactive
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 4. EMAIL PROVIDERS SETTINGS */
interface EmailProps {
  config: any;
  onSave: (val: any) => void;
  isSaving: boolean;
}
function EmailSettingsTab({ config, onSave, isSaving }: EmailProps) {
  const [resendKey, setResendKey] = useState(config.resend?.apiKey || '');
  const [smtpHost, setSmtpHost] = useState(config.smtp?.host || 'smtp.mailtrap.io');
  const [smtpPort, setSmtpPort] = useState(config.smtp?.port || 2525);
  const [smtpUser, setSmtpUser] = useState(config.smtp?.user || '');
  const [smtpPass, setSmtpPass] = useState(config.smtp?.pass || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...config,
      resend: { enabled: !!resendKey, apiKey: resendKey },
      smtp: { enabled: true, host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass, secure: false }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Option A: Resend API Configuration</h4>
        <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-3">
          <label className="block text-xs text-slate-400 mb-1">Resend API Secret Key</label>
          <input
            type="password"
            value={resendKey}
            onChange={(e) => setResendKey(e.target.value)}
            placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Option B: SMTP Client dispatch configs (Fallback)</h4>
        <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">SMTP Server Host</label>
            <input
              type="text"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              className="w-full bg-slate-900 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">SMTP Server Port</label>
            <input
              type="number"
              value={smtpPort}
              onChange={(e) => setSmtpPort(parseInt(e.target.value, 10))}
              className="w-full bg-slate-900 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">SMTP Server Username</label>
            <input
              type="text"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder="Mailtrap Username"
              className="w-full bg-slate-900 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs text-slate-400 mb-1">SMTP Server Password</label>
            <input
              type="password"
              value={smtpPass}
              onChange={(e) => setSmtpPass(e.target.value)}
              placeholder="SMTP Pass hash code"
              className="w-full bg-slate-900 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-850">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-medium text-sm rounded-lg transition-all"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Delivery channels
        </button>
      </div>
    </form>
  );
}

/* 5. DATABASE SETTINGS */
interface DBProps {
  config: any;
  onSave: (val: any) => void;
  isSaving: boolean;
}
function DatabaseSettingsTab({ config, onSave, isSaving }: DBProps) {
  const [activeDriver, setActiveDriver] = useState<'postgres' | 'supabase' | 'local'>('local');
  const [dbUri, setDbUri] = useState(config.postgres?.uri || 'postgresql://postgres@localhost:5432/crm_db');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...config,
      postgres: { enabled: activeDriver === 'postgres', uri: dbUri },
      supabase: { enabled: activeDriver === 'supabase' }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Relational Database Engine Driver</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: 'local', title: 'Standalone File Storage', desc: 'Saves automatically to durable server-side JSON DB', isPre: true },
            { id: 'postgres', title: 'PostgreSQL Engine', desc: 'Secure Google Cloud SQL relational database connection' },
            { id: 'supabase', title: 'Supabase Serverless', desc: 'PostgreSQL server with active real-time stream syncer' }
          ].map((engine) => (
            <button
              key={engine.id}
              type="button"
              onClick={() => setActiveDriver(engine.id as any)}
              className={`p-4 rounded-xl border text-left transition-all ${
                activeDriver === engine.id
                  ? 'bg-violet-600/15 border-violet-500/40 text-violet-300'
                  : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-400'
              }`}
            >
              <div className="font-semibold text-xs mb-1 text-slate-200">{engine.title}</div>
              <p className="text-[11px] leading-tight text-slate-400">{engine.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {activeDriver !== 'local' && (
        <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-2">
          <label className="block text-xs text-slate-400 mb-1">Database Connection URI / Access Endpoint</label>
          <input
            type="text"
            value={dbUri}
            onChange={(e) => setDbUri(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-slate-850">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-medium text-sm rounded-lg transition-all"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Apply Storage adapters
        </button>
      </div>
    </form>
  );
}

/* 6. APPEARANCE SETTINGS */
interface AppearanceProps {
  config: any;
  onSave: (val: any) => void;
  isSaving: boolean;
}
function AppearanceTab({ config, onSave, isSaving }: AppearanceProps) {
  const [theme, setTheme] = useState(config.theme || 'dark');
  const [compactMode, setCompactMode] = useState(config.compactMode || false);
  const [primaryColor, setPrimaryColor] = useState(config.primaryColor || 'violet');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ theme, compactMode, primaryColor });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Visual Theme Mode</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
          >
            <option value="dark">Deep Cosmic (Dark Palette)</option>
            <option value="light">Swiss Minimalist (Light Palette)</option>
            <option value="system">Follow device operating system presets</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Brand Accent Accents</label>
          <select
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
          >
            <option value="violet">Violet Quartz (Purple)</option>
            <option value="indigo">Indigo Stream (Blue-Indigo)</option>
            <option value="emerald">Emerald Meadow (Green)</option>
            <option value="amber">Amber Sunrise (Gold)</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="compact"
            checked={compactMode}
            onChange={(e) => setCompactMode(e.target.checked)}
            className="w-4 h-4 rounded border-slate-800 text-violet-600 bg-slate-950 focus:ring-violet-500"
          />
          <label htmlFor="compact" className="text-sm text-slate-300 font-medium cursor-pointer">
            Compact Density Layout mode (increases list item capacity)
          </label>
        </div>
      </div>
      <div className="flex justify-end pt-4 border-t border-slate-850">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-medium text-sm rounded-lg transition-all"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Apply Accents
        </button>
      </div>
    </form>
  );
}

/* 7. NOTIFICATIONS SETTINGS */
interface NotificationProps {
  config: any;
  onSave: (val: any) => void;
  isSaving: boolean;
}
function NotificationsTab({ config, onSave, isSaving }: NotificationProps) {
  const [emailAlerts, setEmailAlerts] = useState(config.emailAlerts !== false);
  const [weeklySummary, setWeeklySummary] = useState(config.weeklySummary !== false);
  const [highOpportunityAlerts, setHighOpportunityAlerts] = useState(config.highOpportunityAlerts !== false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ emailAlerts, weeklySummary, highOpportunityAlerts });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        {[
          { id: 'email_a', label: 'Email system alerts', desc: 'Dispatches urgent operational system status messages to your inbox', val: emailAlerts, set: setEmailAlerts },
          { id: 'weekly_s', label: 'Weekly pipeline digests', desc: 'Summarizes lead conversion rate, SWOT ratings, and active opportunities list', val: weeklySummary, set: setWeeklySummary },
          { id: 'high_o', label: 'Very High Opportunity detection notifications', desc: 'Triggers instant visual indicators when scores fall above 85/100', val: highOpportunityAlerts, set: setHighOpportunityAlerts }
        ].map((item) => (
          <div key={item.id} className="flex items-start gap-4 p-4 bg-slate-950 border border-slate-850 rounded-xl">
            <input
              type="checkbox"
              id={item.id}
              checked={item.val}
              onChange={(e) => item.set(e.target.checked)}
              className="w-4 h-4 rounded border-slate-800 text-violet-600 bg-slate-900 focus:ring-violet-500 mt-0.5"
            />
            <div>
              <label htmlFor={item.id} className="text-sm font-semibold text-slate-200 cursor-pointer">{item.label}</label>
              <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-4 border-t border-slate-850">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-medium text-sm rounded-lg transition-all"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Update Notifications
        </button>
      </div>
    </form>
  );
}

/* 8. LANGUAGE & LOCALE SETTINGS */
interface LanguageProps {
  config: any;
  onSave: (val: any) => void;
  isSaving: boolean;
}
function LanguageTab({ config, onSave, isSaving }: LanguageProps) {
  const [primary, setPrimary] = useState(config.primary || 'en');
  const [autoDetectLeadLanguage, setAutoDetectLeadLanguage] = useState(config.autoDetectLeadLanguage !== false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ primary, autoDetectLeadLanguage });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Default Draft Language (Region)</label>
          <select
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
          >
            <option value="en">English (US/UK - Conversational tone)</option>
            <option value="fr">French (France - Professional polite formal tone)</option>
            <option value="es">Spanish (Spain/LATAM - Direct engaging tone)</option>
            <option value="de">German (Germany - Formal "Sie" phrasing tone)</option>
            <option value="pt">Portuguese (Portugal/Brazil - Dynamic tone)</option>
            <option value="ar">Arabic (Right-to-Left layout alignment enabled)</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="lang_auto"
            checked={autoDetectLeadLanguage}
            onChange={(e) => setAutoDetectLeadLanguage(e.target.checked)}
            className="w-4 h-4 rounded border-slate-800 text-violet-600 bg-slate-950 focus:ring-violet-500"
          />
          <label htmlFor="lang_auto" className="text-sm text-slate-300 font-medium cursor-pointer">
            Automatically detect lead webpage language & match draft
          </label>
        </div>
      </div>
      <div className="flex justify-end pt-4 border-t border-slate-850">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-medium text-sm rounded-lg transition-all"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Apply Translation presets
        </button>
      </div>
    </form>
  );
}

/* 9. SECURITY SETTINGS */
interface SecurityProps {
  config: any;
  onSave: (val: any) => void;
  isSaving: boolean;
}
function SecurityTab({ config, onSave, isSaving }: SecurityProps) {
  const [mfaEnabled, setMfaEnabled] = useState(config.mfaEnabled || false);
  const [sessionTimeout, setSessionTimeout] = useState(config.sessionTimeout || 120);
  const [ipWhitelist, setIpWhitelist] = useState(config.ipWhitelist || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ mfaEnabled, sessionTimeout, ipWhitelist });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Auto logout period (Minutes)</label>
          <input
            type="number"
            value={sessionTimeout}
            onChange={(e) => setSessionTimeout(parseInt(e.target.value, 10))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Restricted Access IP Whitelist</label>
          <input
            type="text"
            value={ipWhitelist}
            onChange={(e) => setIpWhitelist(e.target.value)}
            placeholder="0.0.0.0, 192.168.1.1 (Optional)"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="mfa"
            checked={mfaEnabled}
            onChange={(e) => setMfaEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-slate-800 text-violet-600 bg-slate-950 focus:ring-violet-500"
          />
          <label htmlFor="mfa" className="text-sm text-slate-300 font-medium cursor-pointer">
            Enable mandatory Multi-Factor Authentication (MFA)
          </label>
        </div>
      </div>
      <div className="flex justify-end pt-4 border-t border-slate-850">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-medium text-sm rounded-lg transition-all"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enforce Security rules
        </button>
      </div>
    </form>
  );
}

/* 10. SYSTEM BACKUP SETTINGS */
interface BackupProps {
  config: any;
  onSave: (val: any) => void;
  isSaving: boolean;
}
function BackupTab({ config, onSave, isSaving }: BackupProps) {
  const [autoBackup, setAutoBackup] = useState(config.autoBackup !== false);
  const [backupFrequency, setBackupFrequency] = useState(config.backupFrequency || 'weekly');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ autoBackup, backupFrequency });
  };

  const handleManualExport = () => {
    alert('Export action simulated! Full CRM database JSON snapshot downloaded successfully.');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Automatic Backup Frequency</label>
          <select
            value={backupFrequency}
            onChange={(e) => setBackupFrequency(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
          >
            <option value="daily">Daily Snapshot (Secure SaaS Storage)</option>
            <option value="weekly">Weekly Rollback Snapshot</option>
            <option value="monthly">Monthly Master Backup</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="autobackup"
            checked={autoBackup}
            onChange={(e) => setAutoBackup(e.target.checked)}
            className="w-4 h-4 rounded border-slate-800 text-violet-600 bg-slate-950 focus:ring-violet-500"
          />
          <label htmlFor="autobackup" className="text-sm text-slate-300 font-medium cursor-pointer">
            Automatically duplicate rollback versions to cloud bucket
          </label>
        </div>
      </div>

      <div className="bg-slate-950 p-5 border border-slate-850 rounded-xl">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">Manual CRM Dump</h4>
        <p className="text-xs text-slate-400 mb-4">Click to export all active leads, business profiles, and communication logs in standard JSON format.</p>
        <button
          type="button"
          onClick={handleManualExport}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-all"
        >
          Generate JSON backup
        </button>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-850">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-medium text-sm rounded-lg transition-all"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enforce Backup rules
        </button>
      </div>
    </form>
  );
}

/* 11. OAUTH INTEGRATIONS SETTINGS */
function IntegrationsTab({ config }: { config: any }) {
  const handleSimulateOAuth = (service: string) => {
    alert(`Initiating OAuth handshake for ${service}... Client popup mock generated successfully!`);
  };

  return (
    <div className="space-y-4">
      <div className="p-3.5 bg-violet-950/20 border border-violet-500/20 rounded-lg text-xs text-violet-400 mb-2">
        Manage active tokens and API keys authorized to connect to third-party providers. Handled via isolated server-side proxies.
      </div>
      <div className="space-y-3">
        {[
          { id: 'google_workspace', name: 'Google Workspace (Gmail, Calendar, Maps)', desc: 'Integrates personalized mailto clients and scheduling widgets', active: false },
          { id: 'linkedin_auth', name: 'LinkedIn Professional Profile Auth', desc: 'Allows jump-box companion targeting of lead messages', active: false },
          { id: 'github_crm', name: 'GitHub Sync Adapter', desc: 'Saves developer templates and portfolio logs directly', active: false }
        ].map((service) => (
          <div key={service.id} className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between gap-4">
            <div>
              <span className="font-semibold text-sm text-slate-200 block">{service.name}</span>
              <p className="text-xs text-slate-400 mt-0.5">{service.desc}</p>
            </div>
            <button
              onClick={() => handleSimulateOAuth(service.name)}
              className="px-3 py-1.5 bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 border border-violet-500/20 text-xs font-semibold rounded-lg transition-all shrink-0"
            >
              Authorize Account
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
