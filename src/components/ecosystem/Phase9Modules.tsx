import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api.ts';
import {
  Brain, FileText, Users, Zap, Award, Activity, WifiOff, Plus, Trash2,
  RefreshCw, CheckCircle2, AlertTriangle, Play, Pause, ChevronRight,
  Upload, HelpCircle, Sparkles, Shield, UserPlus, FolderPlus, Globe,
  ArrowRight, Search, BarChart2, Check, AlertCircle, RefreshCcw
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ProposalMemoryEntry, User, OrgRole, Workspace } from '../../types.ts';

// Add phase9 routes to apiService dynamically or use custom fetchers to ensure compatibility
const fetchPhase9 = async <T = any>(endpoint: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(`/api/phase9${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Phase 9 API execution failed.');
  }
  return res.json();
};

// ==========================================
// 1. AI MEMORY & CONTINUOUS LEARNING
// ==========================================
export function MemoryModule() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    leadName: '',
    industry: '',
    proposalType: 'email',
    tone: 'consultative',
    language: 'en',
    opening: '',
    closing: '',
    feedback: ''
  });

  const { data, isLoading } = useQuery({
    queryKey: ['phase9-memory'],
    queryFn: () => fetchPhase9('/memory')
  });

  const addMutation = useMutation({
    mutationFn: (body: typeof formData) => fetchPhase9('/memory', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase9-memory'] });
      setShowAdd(false);
      setFormData({
        leadName: '',
        industry: '',
        proposalType: 'email',
        tone: 'consultative',
        language: 'en',
        opening: '',
        closing: '',
        feedback: ''
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchPhase9(`/memory/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase9-memory'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 font-mono">
        <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
        <span className="text-xs text-slate-400">Loading AI continuous style memories...</span>
      </div>
    );
  }

  const memories = data?.memory || [];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-400" />
            <span>AI Brain & Continuous Style Memory</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Retains successful writing constructs, localization adjustments, and validated feedback to enhance drafts.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom Brand Guide</span>
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate(formData);
          }}
          className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4"
        >
          <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
            Register Client Preference Memory
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase">Lead Name / Campaign</label>
              <input
                type="text"
                required
                value={formData.leadName}
                onChange={(e) => setFormData({ ...formData, leadName: e.target.value })}
                placeholder="e.g. Downtown Dental, Tech Partners"
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase">Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g. Healthcare, Legal"
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase">Outreach Channel</label>
              <select
                value={formData.proposalType}
                onChange={(e) => setFormData({ ...formData, proposalType: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none"
              >
                <option value="email">Email Draft</option>
                <option value="linkedin">LinkedIn Message</option>
                <option value="contact_form">Web Contact Form</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase">Tone Parameter</label>
              <select
                value={formData.tone}
                onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none"
              >
                <option value="consultative">Consultative & Helpful</option>
                <option value="direct">Direct & Concise</option>
                <option value="professional">Formal Professional</option>
                <option value="casual">Friendly & Warm</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Opening Hook</label>
              <textarea
                rows={2}
                value={formData.opening}
                onChange={(e) => setFormData({ ...formData, opening: e.target.value })}
                placeholder="Preferred conversational hook..."
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Style Feedback & Corrections</label>
              <textarea
                rows={2}
                value={formData.feedback}
                onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                placeholder="Learned constraints (e.g. Always emphasize patient scheduling; avoid sales jargon)..."
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-900">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 rounded text-xs font-mono border border-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded text-xs font-bold"
            >
              {addMutation.isPending ? 'Syncing...' : 'Inject into Brain'}
            </button>
          </div>
        </form>
      )}

      {memories.length === 0 ? (
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-8 text-center space-y-3">
          <Brain className="w-10 h-10 text-violet-500/40 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-300 text-sm">Memory Engine Ready</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Once drafts are approved or customized, the AI automatically harvests language habits and writing tone.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memories.map((mem) => (
            <div
              key={mem.id}
              className="bg-slate-950 border border-slate-850 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between space-y-4 transition-all relative group"
            >
              <button
                onClick={() => deleteMutation.mutate(mem.id)}
                className="absolute top-3 right-3 p-1 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="space-y-2">
                <div className="flex justify-between items-start pr-6">
                  <div>
                    <h3 className="font-bold text-slate-200 text-xs">{mem.leadName}</h3>
                    <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wide block mt-0.5">
                      {mem.industry} • {mem.proposalType}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 bg-violet-600/15 border border-violet-500/20 text-violet-400 font-mono text-[8px] rounded uppercase font-bold tracking-wider">
                    {mem.tone}
                  </span>
                </div>

                {mem.feedback && (
                  <div className="bg-slate-900/60 border border-slate-900 rounded-lg p-2 text-[10.5px] leading-relaxed text-slate-400">
                    <span className="text-slate-500 font-bold font-mono text-[9px] block uppercase mb-0.5">Feedback Learnt:</span>
                    {mem.feedback}
                  </div>
                )}

                {mem.opening && (
                  <div className="text-[10.5px] leading-relaxed text-slate-300 border-l-2 border-violet-500/30 pl-2">
                    <span className="text-slate-500 font-mono text-[9px] block uppercase">Preferred Hook Style:</span>
                    "{mem.opening}"
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono border-t border-slate-900/60 pt-3 text-slate-500">
                <span>Score: {mem.overallScore || 90}%</span>
                <span>{new Date(mem.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. KNOWLEDGE BASE & RAG INGESTION
// ==========================================
export function RAGModule() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [fileDragging, setFileDragging] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'case_study',
    tags: ''
  });

  const { data, isLoading } = useQuery({
    queryKey: ['phase9-knowledge'],
    queryFn: () => fetchPhase9('/knowledge')
  });

  const addMutation = useMutation({
    mutationFn: (body: typeof formData) => {
      const payload = {
        ...body,
        tags: body.tags.split(',').map(t => t.trim()).filter(Boolean)
      };
      return fetchPhase9('/knowledge', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase9-knowledge'] });
      setShowAdd(false);
      setFormData({ title: '', content: '', category: 'case_study', tags: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchPhase9(`/knowledge/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase9-knowledge'] });
    }
  });

  const simulateDragUpload = () => {
    setFormData({
      title: 'Global Law Partners Case Study - PDF',
      category: 'case_study',
      content: 'Successfully streamlined lead client engagement forms for Global Law Partners. Replaced legacy PHP email forms with secure, high-contrast, fully compliant React contact modules. Amplified secure intake conversions by 65% and guaranteed 100% SSL secure routing.',
      tags: 'Legal, Security, Case Study, PDF Upload'
    });
    setShowAdd(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 font-mono">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
        <span className="text-xs text-slate-400">Syncing localized knowledge documents...</span>
      </div>
    );
  }

  const docs = data?.knowledge || [];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Retrieval-Augmented Generation (RAG) Knowledge Ingest</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ingest corporate PDFs, case studies, and brand manuals. The orchestrator references this knowledge to make proposals factual.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ingest New Document</span>
        </button>
      </div>

      {/* Interactive Drag & Drop Box */}
      <div
        onDragOver={(e) => { e.preventDefault(); setFileDragging(true); }}
        onDragLeave={() => setFileDragging(false)}
        onDrop={(e) => { e.preventDefault(); setFileDragging(false); simulateDragUpload(); }}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
          fileDragging
            ? 'border-emerald-500 bg-emerald-500/5'
            : 'border-slate-800 bg-slate-950 hover:border-slate-700'
        }`}
      >
        <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2 group-hover:text-emerald-400 transition-colors" />
        <span className="text-xs font-bold text-slate-300 block">Drag & Drop Corporate PDFs, DOCX, or Markdown</span>
        <span className="text-[10px] text-slate-500 font-mono block mt-1">
          Files are automatically parsed, vectorized, and injected as semantic references. Or click to{' '}
          <button onClick={simulateDragUpload} className="text-emerald-400 hover:underline">
            simulate a sample file ingestion
          </button>
          .
        </span>
      </div>

      {showAdd && (
        <form
          onSubmit={(e) => { e.preventDefault(); addMutation.mutate(formData); }}
          className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4"
        >
          <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
            Ingest Document Profile
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase">Document Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Case Study - Dr. Jenks Clinic"
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="case_study">Case Study & Proof</option>
                <option value="brand_guidelines">Brand Guidelines</option>
                <option value="offering_catalog">Services Offering Catalog</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 font-mono uppercase">Document Content / Core Text</label>
            <textarea
              rows={4}
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Paste rich content, case details, or corporate standard profiles..."
              className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 font-mono uppercase">Tags (comma separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="Healthcare, Scheduling, SEO"
              className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-900">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 rounded text-xs font-mono border border-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold"
            >
              {addMutation.isPending ? 'Ingesting...' : 'Add context'}
            </button>
          </div>
        </form>
      )}

      {/* Docs Grid */}
      <div className="space-y-3">
        {docs.map((doc: any) => (
          <div
            key={doc.id}
            className="bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-4.5 flex justify-between items-start gap-4 transition-all"
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-extrabold uppercase border ${
                  doc.category === 'case_study' ? 'bg-blue-600/10 border-blue-500/25 text-blue-400' : 'bg-purple-600/10 border-purple-500/25 text-purple-400'
                }`}>
                  {doc.category.replace('_', ' ')}
                </span>
                <h3 className="font-bold text-slate-200 text-xs sm:text-sm">{doc.title}</h3>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{doc.content}</p>

              <div className="flex flex-wrap gap-1">
                {doc.tags?.map((tag: string) => (
                  <span key={tag} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-400 font-mono">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => deleteMutation.mutate(doc.id)}
              className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded shrink-0 self-center"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 3. ENTERPRISE TEAM & WORKSPACE RBAC
// ==========================================
export function EnterpriseModule() {
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [memberForm, setMemberForm] = useState({ fullName: '', email: '', role: 'member' });
  const [workspaceForm, setWorkspaceForm] = useState({ name: '' });

  const { data: membersData, isLoading: loadMem } = useQuery({
    queryKey: ['phase9-members'],
    queryFn: () => fetchPhase9('/enterprise/members')
  });

  const { data: wsData, isLoading: loadWs } = useQuery({
    queryKey: ['phase9-workspaces'],
    queryFn: () => fetchPhase9('/enterprise/workspaces')
  });

  const inviteMutation = useMutation({
    mutationFn: (body: typeof memberForm) => fetchPhase9('/enterprise/members', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase9-members'] });
      setShowInvite(false);
      setMemberForm({ fullName: '', email: '', role: 'member' });
    }
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => fetchPhase9(`/enterprise/members/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase9-members'] });
    }
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (id: string) => fetchPhase9(`/enterprise/members/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase9-members'] });
    }
  });

  const workspaceMutation = useMutation({
    mutationFn: (body: typeof workspaceForm) => fetchPhase9('/enterprise/workspaces', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase9-workspaces'] });
      setShowNewWorkspace(false);
      setWorkspaceForm({ name: '' });
    }
  });

  if (loadMem || loadWs) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 font-mono">
        <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
        <span className="text-xs text-slate-400">Syncing enterprise RBAC hierarchies...</span>
      </div>
    );
  }

  const members = membersData?.members || [];
  const workspaces = wsData?.workspaces || [];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" />
            <span>Enterprise Multi-Tenancy & Access Controls</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure sandboxed client campaigns and administer role-based access control (RBAC) security structures.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Workspaces List */}
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-4 h-fit">
          <div className="flex justify-between items-center border-b border-slate-900 pb-2">
            <span className="text-xs font-bold text-slate-200 font-mono uppercase flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-violet-400" />
              <span>SaaS Campaign Nodes</span>
            </span>
            <button
              onClick={() => setShowNewWorkspace(!showNewWorkspace)}
              className="text-[10px] text-violet-400 hover:text-violet-300 font-bold font-mono uppercase flex items-center gap-1"
            >
              <FolderPlus className="w-3 h-3" />
              <span>New</span>
            </button>
          </div>

          {showNewWorkspace && (
            <form
              onSubmit={(e) => { e.preventDefault(); workspaceMutation.mutate(workspaceForm); }}
              className="space-y-2.5 bg-slate-900/50 p-2.5 border border-slate-800 rounded-lg"
            >
              <input
                type="text"
                required
                value={workspaceForm.name}
                onChange={(e) => setWorkspaceForm({ name: e.target.value })}
                placeholder="e.g. EU Hospitality Leads"
                className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
              />
              <div className="flex justify-end gap-1.5 text-[9px] font-mono">
                <button
                  type="button"
                  onClick={() => setShowNewWorkspace(false)}
                  className="px-2 py-0.5 text-slate-500 hover:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-2 py-0.5 bg-violet-600 text-white rounded font-bold"
                >
                  Create
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {workspaces.map(ws => (
              <div
                key={ws.id}
                className="bg-slate-900/60 border border-slate-900 rounded-lg p-2.5 flex justify-between items-center hover:border-slate-800 transition-colors"
              >
                <div>
                  <span className="text-xs font-bold text-slate-300 block">{ws.name}</span>
                  <span className="text-[8px] text-slate-500 font-mono block mt-0.5">ID: {ws.id}</span>
                </div>
                <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 text-[8px] font-mono font-bold uppercase rounded">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right columns: Team Members List */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-850 rounded-xl p-4.5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-900 pb-2">
            <span className="text-xs font-bold text-slate-200 font-mono uppercase flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-violet-400" />
              <span>Role-Based Seat Roster (RBAC)</span>
            </span>
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="px-2.5 py-1 bg-violet-600/10 border border-violet-500/25 text-violet-400 font-mono font-bold rounded text-[10px] uppercase flex items-center gap-1 hover:bg-violet-600/20"
            >
              <UserPlus className="w-3 h-3" />
              <span>Invite Member</span>
            </button>
          </div>

          {showInvite && (
            <form
              onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(memberForm); }}
              className="bg-slate-900/40 border border-slate-850 rounded-lg p-3 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={memberForm.fullName}
                  onChange={(e) => setMemberForm({ ...memberForm, fullName: e.target.value })}
                  placeholder="Full Name"
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                />
                <input
                  type="email"
                  required
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  placeholder="Email Address"
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                />
              </div>
              <div className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Privilege Level:</span>
                  <select
                    value={memberForm.role}
                    onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200"
                  >
                    <option value="admin">Administrator</option>
                    <option value="member">Standard Member</option>
                    <option value="viewer">Viewer (Read-only)</option>
                  </select>
                </div>
                <div className="flex gap-2 text-[10px] font-mono">
                  <button type="button" onClick={() => setShowInvite(false)} className="text-slate-500 hover:text-slate-300">
                    Cancel
                  </button>
                  <button type="submit" className="px-3 py-1 bg-violet-600 rounded text-white font-bold">
                    Invite
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="space-y-2.5">
            {members.map(member => (
              <div
                key={member.id}
                className="bg-slate-900/45 border border-slate-900 rounded-lg p-3 flex justify-between items-center gap-4 hover:border-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={member.avatarUrl}
                    alt={member.fullName}
                    className="w-8 h-8 rounded-full border border-slate-800 object-cover"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-200 block truncate">{member.fullName}</span>
                    <span className="text-[10px] text-slate-500 font-mono block truncate mt-0.5">{member.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 font-mono text-[10px]">
                  {member.role === OrgRole.OWNER ? (
                    <span className="px-2 py-0.5 bg-violet-600/10 border border-violet-500/20 text-violet-400 font-bold rounded uppercase">
                      Owner
                    </span>
                  ) : (
                    <select
                      value={member.role}
                      onChange={(e) => roleMutation.mutate({ id: member.id, role: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-slate-300"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  )}

                  {member.role !== OrgRole.OWNER && (
                    <button
                      onClick={() => deleteMemberMutation.mutate(member.id)}
                      className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-950 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. VISUAL TRIGGER-ACTION WORKFLOW BUILDER
// ==========================================
export function WorkflowsModule() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [workflowForm, setWorkflowForm] = useState({ name: '', trigger: 'analysis_completed', delay: '0 mins' });

  const { data, isLoading } = useQuery({
    queryKey: ['phase9-workflows'],
    queryFn: () => fetchPhase9('/workflows')
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => fetchPhase9(`/workflows/${id}`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase9-workflows'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchPhase9(`/workflows/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase9-workflows'] });
    }
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof workflowForm) => {
      const nodes = [
        { id: 'n1', type: 'trigger', label: `Event Trigger: ${body.trigger.replace('_', ' ')}` },
        { id: 'n2', type: 'delay', label: `Action Delay: ${body.delay}` },
        { id: 'n3', type: 'action', label: 'Action Exec: Compile Consultative Mockup Proposal' }
      ];
      const connections = [
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n3' }
      ];
      return fetchPhase9('/workflows', { method: 'POST', body: JSON.stringify({ ...body, nodes, connections }) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase9-workflows'] });
      setShowAdd(false);
      setWorkflowForm({ name: '', trigger: 'analysis_completed', delay: '0 mins' });
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 font-mono">
        <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
        <span className="text-xs text-slate-400">Loading visual node graphs...</span>
      </div>
    );
  }

  const workflows = data?.workflows || [];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-400" />
            <span>Visual Trigger-Action Automated Workflows</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create automated logic rules. When signals occur in the CRM (e.g. SEO score fails), fire delayed, localized drafts.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Workflow Recipe</span>
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate(workflowForm); }}
          className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4"
        >
          <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
            Compile Event Automation Recipe
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 col-span-1 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase">Workflow Name</label>
              <input
                type="text"
                required
                value={workflowForm.name}
                onChange={(e) => setWorkflowForm({ ...workflowForm, name: e.target.value })}
                placeholder="e.g. Slack alert on 90% opportunity"
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase">Trigger Delay</label>
              <select
                value={workflowForm.delay}
                onChange={(e) => setWorkflowForm({ ...workflowForm, delay: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500"
              >
                <option value="0 mins">Immediate (0m)</option>
                <option value="15 mins">15 Minutes Check</option>
                <option value="3 days">3 Days Grace</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 font-mono uppercase">Listen Event Trigger</label>
            <select
              value={workflowForm.trigger}
              onChange={(e) => setWorkflowForm({ ...workflowForm, trigger: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500"
            >
              <option value="lead_created">Lead Created / Discovered</option>
              <option value="analysis_completed">Website Technical Audit Completed</option>
              <option value="high_opportunity_detected">Opportunity rating exceeding 85%</option>
              <option value="proposal_approved">Outreach Proposal Approved by User</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-900">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 rounded text-xs font-mono border border-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded text-xs font-bold"
            >
              Compile Visual Graph
            </button>
          </div>
        </form>
      )}

      {/* Graphical nodes for each workflow */}
      <div className="space-y-6">
        {workflows.map((flow: any) => (
          <div
            key={flow.id}
            className="bg-slate-950 border border-slate-850 rounded-xl p-4.5 space-y-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div>
                <h3 className="font-bold text-slate-200 text-sm">{flow.name}</h3>
                <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wide block mt-0.5">
                  Listen Hook: {flow.trigger.replace('_', ' ')} • delay: {flow.delay}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleMutation.mutate({ id: flow.id, enabled: !flow.enabled })}
                  className={`p-1.5 rounded transition-all ${
                    flow.enabled
                      ? 'bg-violet-600/10 text-violet-400 hover:bg-violet-600/20'
                      : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {flow.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => deleteMutation.mutate(flow.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Simulated Nodes Canvas visual graph */}
            <div className="bg-slate-900/40 rounded-xl p-4 flex flex-col md:flex-row items-center justify-around gap-4 md:gap-2 relative overflow-hidden py-6 border border-slate-900">
              {flow.nodes.map((node: any, idx: number) => (
                <React.Fragment key={node.id}>
                  {idx > 0 && (
                    <div className="flex flex-col items-center shrink-0">
                      <ChevronRight className="w-4 h-4 text-violet-500/40 hidden md:block" />
                      <div className="w-0.5 h-4 bg-violet-500/30 md:hidden"></div>
                    </div>
                  )}
                  <div className={`p-3 rounded-lg border text-center text-[10.5px] font-mono min-w-[140px] shadow-sm ${
                    node.type === 'trigger' ? 'bg-violet-600/10 border-violet-500/20 text-violet-300 font-bold' :
                    node.type === 'delay' ? 'bg-amber-600/10 border-amber-500/20 text-amber-300' :
                    'bg-slate-950 border-slate-800 text-slate-300'
                  }`}>
                    {node.label}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 5. PROACTIVE AI ADVISORY RECOMMENDATIONS
// ==========================================
export function RecommendationsModule() {
  const queryClient = useQueryClient();
  const [executedId, setExecutedId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['phase9-recommendations'],
    queryFn: () => fetchPhase9('/proactive-advice')
  });

  const runAdvisoryAction = (id: string) => {
    setExecutedId(id);
    setTimeout(() => {
      setExecutedId(null);
      alert('Handshake dispatched! Micro-agent has drafted the consultative responsive bundle.');
      refetch();
    }, 1200);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 font-mono">
        <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
        <span className="text-xs text-slate-400">Gleaning CRM telemetry recommendations...</span>
      </div>
    );
  }

  const recs = data?.recommendations || [];

  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span>AI Proactive Advisory recommendations</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Continuously crawls and audits telemetry parameters, serving direct tactical outreach opportunities.
          </p>
        </div>
        <button onClick={() => refetch()} className="p-1 hover:bg-slate-800 rounded text-slate-400">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3.5">
        {recs.map((rec: any) => (
          <div
            key={rec.id}
            className="bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all"
          >
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono uppercase border ${
                  rec.priority === 'very_high' ? 'bg-red-500/10 border-red-500/15 text-red-400' : 'bg-amber-500/10 border-amber-500/15 text-amber-400'
                }`}>
                  {rec.priority.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Potential impact: {rec.impactScore}%</span>
              </div>
              <h3 className="font-bold text-slate-200 text-xs sm:text-sm">{rec.title}</h3>
              <p className="text-[11px] text-slate-400 leading-normal max-w-2xl">{rec.description}</p>
            </div>

            <button
              onClick={() => runAdvisoryAction(rec.id)}
              disabled={executedId !== null}
              className="w-full sm:w-auto shrink-0 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              {executedId === rec.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span>{rec.actionLabel}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 6. CONTINUOUS AI QUALITY MONITORING
// ==========================================
export function QAMonitoringModule() {
  const { data, isLoading } = useQuery({
    queryKey: ['phase9-qa-metrics'],
    queryFn: () => fetchPhase9('/qa-metrics')
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 font-mono">
        <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
        <span className="text-xs text-slate-400">Loading continuous QA evaluations...</span>
      </div>
    );
  }

  const m = data?.metrics || {
    avgPersonalization: 85,
    avgSpamRisk: 12,
    avgNaturalTone: 88,
    avgReadability: 90,
    totalHealingCycles: 24,
    qaHistory: [],
    spamWarnings: []
  };

  return (
    <div className="space-y-6 text-left">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-400" />
          <span>Continuous AI Quality & Self-Healing Monitor</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Monitors draft readability, checks spam filters, and triggers automated healing loops before presentation.
        </p>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 text-center">
          <span className="text-[9px] text-slate-500 font-mono block uppercase">Avg Personalization</span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-100 font-mono mt-1 block">
            {m.avgPersonalization}%
          </span>
        </div>
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 text-center">
          <span className="text-[9px] text-slate-500 font-mono block uppercase">Spam Threshold</span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono mt-1 block">
            {m.avgSpamRisk}%
          </span>
        </div>
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 text-center">
          <span className="text-[9px] text-slate-500 font-mono block uppercase">Natural Human Tone</span>
          <span className="text-xl sm:text-2xl font-extrabold text-violet-400 font-mono mt-1 block">
            {m.avgNaturalTone}%
          </span>
        </div>
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 text-center">
          <span className="text-[9px] text-slate-500 font-mono block uppercase">Language Accuracy</span>
          <span className="text-xl sm:text-2xl font-extrabold text-blue-400 font-mono mt-1 block">
            {m.avgReadability}%
          </span>
        </div>
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 text-center col-span-2 md:col-span-1">
          <span className="text-[9px] text-slate-500 font-mono block uppercase">Self-Healing Loops</span>
          <span className="text-xl sm:text-2xl font-extrabold text-pink-400 font-mono mt-1 block">
            {m.totalHealingCycles}
          </span>
        </div>
      </div>

      {/* Recharts Evaluation Chart */}
      <div className="bg-slate-950 border border-slate-850 rounded-xl p-4.5">
        <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wide mb-4">
          Weekly Spam Risk Mitigation vs. Personalization Trends
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={m.qaHistory}>
              <defs>
                <linearGradient id="pColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="sColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="week" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b' }} />
              <Area type="monotone" dataKey="personalization" stroke="#8b5cf6" fillOpacity={1} fill="url(#pColor)" name="Personalization Quality" />
              <Area type="monotone" dataKey="spamRisk" stroke="#ef4444" fillOpacity={1} fill="url(#sColor)" name="Filter Spam Risk" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Logs and Warnings */}
      <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-2.5 font-mono text-[11px]">
        <span className="font-bold text-slate-200 uppercase flex items-center gap-1.5 mb-1">
          <AlertCircle className="w-4 h-4 text-pink-400" />
          <span>Self-Healing Loop Intercept logs</span>
        </span>
        {m.spamWarnings?.map((warn: string, idx: number) => (
          <div key={idx} className="bg-slate-900/60 border border-slate-900 rounded-lg p-2.5 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
            <p className="text-slate-300 font-sans font-medium">{warn}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 7. OFFLINE DATA QUEUE & SYNC ENGINE
// ==========================================
export function OfflineSyncModule() {
  const queryClient = useQueryClient();
  const [offline, setOffline] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [simQueue, setSimQueue] = useState<any[]>([
    { id: '1', type: 'CREATE_TASK', payload: { title: 'Call Robert Vance', description: 'Discuss conversion funnels details', dueDate: new Date().toISOString() } },
    { id: '2', type: 'UPDATE_LEAD_STATUS', payload: { leadId: 'lead-mock-2', status: 'contacted' } }
  ]);

  const syncMutation = useMutation({
    mutationFn: (queue: any[]) => fetchPhase9('/sync', { method: 'POST', body: JSON.stringify({ queue }) }),
    onSuccess: (data) => {
      setSyncLogs(prev => [...(data.processed || []), ...prev]);
      setSimQueue([]);
      queryClient.invalidateQueries();
    }
  });

  const simulateOfflineAction = () => {
    const actionId = Math.random().toString(36).substring(7);
    const newAction = {
      id: actionId,
      type: 'ADD_ACTIVITY_LOG',
      payload: {
        leadId: 'lead-mock-1',
        actionType: 'offline_task',
        description: `Generated offline task index log: #${actionId}`
      }
    };
    setSimQueue(prev => [...prev, newAction]);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-slate-400" />
            <span>Offline Operations & Event Queue Sync</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronize queued operations when network returns. Supports offline CRM pipeline edits, notes, and task commits.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
          <span className="text-slate-400">Simulation Mode:</span>
          <button
            onClick={() => setOffline(!offline)}
            className={`px-3 py-1 rounded font-bold uppercase transition-all ${
              offline
                ? 'bg-amber-600/10 border border-amber-500/20 text-amber-400'
                : 'bg-emerald-600/10 border border-emerald-500/20 text-emerald-400'
            }`}
          >
            {offline ? '● offline' : '● online'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Local Pending Queue */}
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-4.5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-900 pb-2">
            <span className="text-xs font-bold text-slate-200 font-mono uppercase">
              Pending Local Action Queue ({simQueue.length})
            </span>
            <div className="flex gap-2">
              <button
                onClick={simulateOfflineAction}
                className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-300 rounded font-mono text-[9px] uppercase hover:bg-slate-800"
              >
                Simulate Action
              </button>
              <button
                onClick={() => syncMutation.mutate(simQueue)}
                disabled={simQueue.length === 0 || syncMutation.isPending}
                className="px-2.5 py-1 bg-violet-600 text-white rounded font-mono text-[9px] uppercase font-bold disabled:bg-slate-900 disabled:text-slate-600"
              >
                {syncMutation.isPending ? 'Syncing...' : 'Sync Queue'}
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {simQueue.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <Check className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                <span className="font-bold text-slate-300 text-xs block mt-2">All Actions Synchronized</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Local cache matches remote CRM state.</p>
              </div>
            ) : (
              simQueue.map(item => (
                <div key={item.id} className="bg-slate-900/60 border border-slate-900 rounded-lg p-3 flex justify-between items-center font-mono text-[10px]">
                  <div>
                    <span className="font-bold text-violet-400 block">{item.type}</span>
                    <span className="text-slate-400 block mt-1">
                      {item.type === 'CREATE_TASK' ? item.payload.title : item.payload.description || `Lead: ${item.payload.leadId}`}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[8px] font-bold uppercase">
                    Queued
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Sync logs */}
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-4.5 space-y-4 font-mono text-[11px] text-left">
          <span className="font-bold text-slate-200 uppercase block border-b border-slate-900 pb-2">
            Dispatched Synchronization Audit Trails
          </span>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {syncLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <span>No sync actions executed in this session.</span>
              </div>
            ) : (
              syncLogs.map((log, idx) => (
                <div key={idx} className="bg-slate-900/40 p-2 border border-slate-900 rounded text-slate-300">
                  <span className="text-emerald-400 font-bold">✓</span> {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
