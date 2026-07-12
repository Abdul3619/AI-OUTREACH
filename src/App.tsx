import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from './services/api.ts';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Import View Modules
import DashboardView from './components/DashboardView.tsx';
import LeadsView from './components/leads/LeadsView.tsx';
import BusinessProfileEditor from './components/BusinessProfileEditor.tsx';
import SettingsPanel from './components/SettingsPanel.tsx';
import AuthView from './components/AuthView.tsx';
import CampaignManager from './components/outreach/CampaignManager.tsx';
import OutreachWorkspace from './components/outreach/OutreachWorkspace.tsx';
import EcosystemHub from './components/ecosystem/EcosystemHub.tsx';

// Icons
import {
  Bot, LayoutDashboard, Sparkles, Settings, LogOut, Menu, X, Bell,
  Search, ShieldAlert, Sparkle, Command, CheckSquare, Layers, HelpCircle, User,
  Users, Target, Send
} from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

function AppContent() {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<'dashboard' | 'leads' | 'profile' | 'settings' | 'campaigns' | 'outreach' | 'ecosystem'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Dialog States
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  
  // Theme Toggle state (Light/Dark/System)
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  // Fetch the active user session status
  const { data: session, isLoading, isError, refetch } = useQuery({
    queryKey: ['session'],
    queryFn: () => apiService.getSession(),
    retry: false
  });

  // Handle hotkeys (Cmd+K / Ctrl+K for command palette)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const logoutMutation = useMutation({
    mutationFn: () => apiService.logout(),
    onSuccess: () => {
      queryClient.setQueryData(['session'], null);
      queryClient.clear();
      refetch();
    }
  });

  // Simple client-side theme application
  useEffect(() => {
    const root = window.document.documentElement;
    if (themeMode === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [themeMode]);

  // Loading indicator for active session fetching
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-200 font-sans">
        <div className="flex flex-col items-center gap-3">
          <Bot className="w-12 h-12 text-violet-500 animate-bounce" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-violet-500 rounded-full animate-ping"></span>
            <span className="text-sm text-slate-400 font-medium">Initializing workspace session pipeline...</span>
          </div>
        </div>
      </div>
    );
  }

  // If no session exists, render login interface
  if (isError || !session || !session.user) {
    return <AuthView onSuccess={() => refetch()} />;
  }

  const mockNotifications = [
    { id: '1', title: 'Opportunity rating detected', desc: 'Medical clinic website lacks responsive viewport tag (Score 88)', read: false },
    { id: '2', title: 'Task reminder: callback active', desc: 'Reach back to regional legal practitioner regarding SEO copy drafts', read: true },
    { id: '3', title: 'Multi-Agent registry synched', desc: 'Agent 5 (QA) passed generated pitch proposal for tech client', read: true }
  ];

  // Commands lookup for Command Palette
  const navigationCommands = [
    { label: 'Jump to Dashboard Metrics', action: () => { setActiveView('dashboard'); setCommandPaletteOpen(false); } },
    { label: 'Jump to CRM Lead Pipeline', action: () => { setActiveView('leads'); setCommandPaletteOpen(false); } },
    { label: 'Edit Sender Business Profile', action: () => { setActiveView('profile'); setCommandPaletteOpen(false); } },
    { label: 'General Configuration Settings', action: () => { setActiveView('settings'); setCommandPaletteOpen(false); } },
    { label: 'Toggle Light/Dark Theme Accent', action: () => { setThemeMode(prev => prev === 'dark' ? 'light' : 'dark'); setCommandPaletteOpen(false); } },
    { label: 'Perform Master Database Backup', action: () => { alert('JSON DB Snapshot download generated!'); setCommandPaletteOpen(false); } },
    { label: 'Sign out of active session', action: () => { logoutMutation.mutate(); setCommandPaletteOpen(false); } }
  ];

  const filteredCommands = navigationCommands.filter(cmd =>
    cmd.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen font-sans flex flex-col md:flex-row transition-colors duration-200 ${
      themeMode === 'light' ? 'bg-slate-50 text-slate-800' : 'bg-slate-950 text-slate-100'
    }`}>
      
      {/* ========================================== */}
      {/* 1. SIDEBAR NAVIGATION LAYOUT FRAME */}
      {/* ========================================== */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 transform ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 md:static shrink-0 transition-transform duration-200 ease-out border-r ${
        themeMode === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="h-full flex flex-col justify-between p-4">
          <div>
            {/* Header / Brand */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center shadow-md">
                  <Bot className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-sm tracking-tight text-slate-100 block">Outreach CRM</span>
                  <span className="text-[10px] text-slate-400 font-mono">SaaS Engine v1.1</span>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="md:hidden p-1.5 rounded hover:bg-slate-800">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Workspace Selector Dropdown */}
            <div className="relative mb-6">
              <button
                onClick={() => setWorkspaceOpen(prev => !prev)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-lg text-left transition-all"
              >
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Workspace</span>
                  <span className="text-xs font-semibold text-slate-200 truncate block">
                    {session.workspace?.name || 'Default Campaign'}
                  </span>
                </div>
                <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>

              {workspaceOpen && (
                <div className="absolute left-0 right-0 mt-2 z-40 bg-slate-900 border border-slate-800 rounded-lg shadow-xl p-1.5 space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block px-2.5 py-1">Select Campaign</span>
                  <button
                    onClick={() => setWorkspaceOpen(false)}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-slate-850 text-xs text-slate-200 font-medium"
                  >
                    North America B2B Campaign (Active)
                  </button>
                  <button
                    onClick={() => { alert('Campaign virtualization is prepared for Phase 2!'); setWorkspaceOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-slate-850 text-xs text-slate-500 italic"
                  >
                    + Spawn Workspace Campaign
                  </button>
                </div>
              )}
            </div>

            {/* Navigation links */}
            <nav className="space-y-1">
              {[
                { id: 'dashboard', label: 'CRM Dashboard', icon: LayoutDashboard },
                { id: 'leads', label: 'CRM Pipeline', icon: Users },
                { id: 'campaigns', label: 'Niche Campaigns', icon: Target },
                { id: 'outreach', label: 'Outreach Workspace', icon: Send },
                { id: 'profile', label: 'Sender Persona', icon: Sparkles },
                { id: 'ecosystem', label: 'Integrations Hub', icon: Layers },
                { id: 'settings', label: 'System Settings', icon: Settings }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id as any);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-medium transition-all ${
                      activeView === item.id
                        ? 'bg-violet-600 text-white font-semibold shadow-md shadow-violet-600/10'
                        : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User profile & Sign Out footer */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-3 min-w-0 px-1">
              <img
                src={session.user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                alt="Avatar"
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-slate-800 object-cover shrink-0"
              />
              <div className="min-w-0">
                <span className="text-xs font-semibold text-slate-200 truncate block">
                  {session.user?.fullName || 'Active User'}
                </span>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-mono">
                  {session.user?.role || 'member'} Role
                </span>
              </div>
            </div>

            <button
              onClick={() => logoutMutation.mutate()}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-red-950/20 hover:text-red-400 border border-transparent hover:border-red-500/10 transition-all text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out Session</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================== */}
      {/* 2. TOP NAVIGATION HEADER PANEL */}
      {/* ========================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className={`h-16 shrink-0 border-b flex items-center justify-between px-6 ${
          themeMode === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          {/* Mobile menu and Search Bar trigger */}
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 rounded hover:bg-slate-800">
              <Menu className="w-5 h-5 text-slate-400" />
            </button>

            {/* Inline search bar (Triggers Command Palette) */}
            <div
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-3 max-w-sm w-full bg-slate-950 border border-slate-850 hover:border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-400 cursor-pointer transition-all"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span className="flex-1">Search commands...</span>
              <kbd className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono">⌘K</kbd>
            </div>
          </div>

          {/* Right Action Widgets (Theme, Notifications) */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setThemeMode(prev => prev === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Toggle Theme Preset"
            >
              <Sparkle className="w-4 h-4 text-violet-400" />
            </button>

            {/* Notifications Menu */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(prev => !prev)}
                className="p-2 rounded-lg bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-200 transition-colors relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-violet-500 rounded-full"></span>
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-4 z-40 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                    <span className="font-bold text-xs text-slate-100">Workspace Alerts</span>
                    <button onClick={() => setNotificationsOpen(false)} className="text-[10px] text-violet-400 hover:underline">Dismiss</button>
                  </div>
                  <div className="space-y-2.5">
                    {mockNotifications.map((notif) => (
                      <div key={notif.id} className="text-xs space-y-0.5 relative pl-3.5">
                        {!notif.read && <span className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-violet-400 rounded-full"></span>}
                        <span className="font-semibold text-slate-200 block leading-snug">{notif.title}</span>
                        <p className="text-[10px] text-slate-400 leading-tight">{notif.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ========================================== */}
        {/* 3. MAIN WORKSPACE SCROLLABLE PANEL */}
        {/* ========================================== */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeView === 'dashboard' && <DashboardView />}
            {activeView === 'leads' && <LeadsView />}
            {activeView === 'campaigns' && <CampaignManager />}
            {activeView === 'outreach' && <OutreachWorkspace />}
            {activeView === 'profile' && <BusinessProfileEditor />}
            {activeView === 'ecosystem' && <EcosystemHub />}
            {activeView === 'settings' && <SettingsPanel />}
          </div>
        </main>
      </div>

      {/* ========================================== */}
      {/* 4. KEYBOARD-ACCESSIBLE COMMAND PALETTE DIALOG */}
      {/* ========================================== */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl shadow-slate-950">
            {/* Search Header */}
            <div className="p-4 border-b border-slate-850 flex items-center gap-3 bg-slate-950/40">
              <Command className="w-4 h-4 text-violet-400 shrink-0" />
              <input
                type="text"
                placeholder="Search command actions (e.g. Dashboard, Profile, Theme)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-xs text-slate-200 focus:ring-0"
                autoFocus
              />
              <button
                onClick={() => setCommandPaletteOpen(false)}
                className="text-[10px] bg-slate-850 border border-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono"
              >
                ESC
              </button>
            </div>

            {/* Results */}
            <div className="p-2 max-h-64 overflow-y-auto space-y-0.5">
              {filteredCommands.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 text-center">No matching command structures found.</p>
              ) : (
                filteredCommands.map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={cmd.action}
                    className="w-full text-left px-3.5 py-2.5 rounded-lg hover:bg-slate-850 text-xs text-slate-300 hover:text-slate-100 flex items-center justify-between font-medium transition-colors"
                  >
                    <span>{cmd.label}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Jump →</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
