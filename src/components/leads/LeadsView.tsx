import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api.ts';
import DataHealthDashboard from '../dashboard/DataHealthDashboard.tsx';
import ProposalPanel from '../outreach/ProposalPanel.tsx';
import {
  Lead, LeadStatus, OpportunityPriority, CommunicationChannel,
  LeadAttachment, LeadNoteHistory, Task, ActivityLog
} from '../../types.ts';
import {
  Users, Layers, Filter, Plus, Search, Trash2, Edit, Check, Eye,
  Activity, Calendar, DollarSign, Globe, Building2, Phone, Mail,
  ArrowRight, ChevronDown, ChevronUp, SlidersHorizontal, ExternalLink,
  FileText, History, Paperclip, CheckSquare, Star, ArrowUpRight,
  Sparkles, RefreshCw, X, HelpCircle, User, Upload, ArrowLeftRight,
  Clipboard, MessageSquare, ShieldAlert, GitMerge
} from 'lucide-react';

// Color Mapping for Statuses
const STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; border: string }> = {
  [LeadStatus.DISCOVERED]: { bg: 'bg-slate-900/50', text: 'text-slate-400', border: 'border-slate-800' },
  [LeadStatus.QUALIFIED]: { bg: 'bg-blue-950/20', text: 'text-blue-400', border: 'border-blue-900/50' },
  [LeadStatus.RESEARCHING]: { bg: 'bg-indigo-950/20', text: 'text-indigo-400', border: 'border-indigo-900/50' },
  [LeadStatus.READY_FOR_ANALYSIS]: { bg: 'bg-violet-950/20', text: 'text-violet-400', border: 'border-violet-900/50' },
  [LeadStatus.PROPOSAL_DRAFTED]: { bg: 'bg-purple-950/20', text: 'text-purple-400', border: 'border-purple-900/50' },
  [LeadStatus.AWAITING_APPROVAL]: { bg: 'bg-pink-950/20', text: 'text-pink-400', border: 'border-pink-900/50' },
  [LeadStatus.READY_TO_CONTACT]: { bg: 'bg-sky-950/20', text: 'text-sky-400', border: 'border-sky-900/50' },
  [LeadStatus.CONTACTED]: { bg: 'bg-amber-950/20', text: 'text-amber-400', border: 'border-amber-900/50' },
  [LeadStatus.FOLLOW_UP]: { bg: 'bg-orange-950/20', text: 'text-orange-400', border: 'border-orange-900/50' },
  [LeadStatus.NEGOTIATING]: { bg: 'bg-cyan-950/20', text: 'text-cyan-400', border: 'border-cyan-900/50' },
  [LeadStatus.WON]: { bg: 'bg-emerald-950/20', text: 'text-emerald-400', border: 'border-emerald-900/50' },
  [LeadStatus.LOST]: { bg: 'bg-rose-950/20', text: 'text-rose-400', border: 'border-rose-900/50' },
  [LeadStatus.ARCHIVED]: { bg: 'bg-zinc-950/20', text: 'text-zinc-500', border: 'border-zinc-900/50' },
};

// Color Mapping for Priorities
const PRIORITY_COLORS: Record<OpportunityPriority, { bg: string; text: string }> = {
  [OpportunityPriority.LOW]: { bg: 'bg-slate-800 text-slate-400', bgSelected: 'bg-slate-900' },
  [OpportunityPriority.MEDIUM]: { bg: 'bg-blue-950/40 text-blue-400', bgSelected: 'bg-blue-900/30' },
  [OpportunityPriority.HIGH]: { bg: 'bg-amber-950/40 text-amber-400', bgSelected: 'bg-amber-900/30' },
  [OpportunityPriority.VERY_HIGH]: { bg: 'bg-red-950/40 text-red-400', bgSelected: 'bg-red-900/30' },
} as any;

// A simple local markdown renderer to avoid external package bloat & maintain perfect styling consistency
function SimpleMarkdownRenderer({ content }: { content: string }) {
  if (!content) return <p className="text-slate-500 italic text-xs">No notes recorded yet. Write some markdown above!</p>;

  const lines = content.split('\n');
  return (
    <div className="space-y-2 text-xs text-slate-300 leading-relaxed font-sans">
      {lines.map((line, idx) => {
        // Headers
        if (line.startsWith('# ')) {
          return <h1 key={idx} className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-1 mt-3 mb-1 font-sans">{line.substring(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={idx} className="text-xs font-bold text-slate-200 mt-2.5 mb-1 font-sans">{line.substring(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={idx} className="text-xs font-semibold text-slate-300 mt-2 mb-0.5 font-sans">{line.substring(4)}</h3>;
        }
        // Lists
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <ul key={idx} className="list-disc pl-4 space-y-0.5 my-1">
              <li>{line.substring(2)}</li>
            </ul>
          );
        }
        // Horizontal Rules
        if (line.trim() === '---') {
          return <hr key={idx} className="border-slate-800 my-3" />;
        }
        // Code Blocks block
        if (line.startsWith('```')) {
          return null; // simple renderer skips code bounding boxes literally
        }
        // Empty lines
        if (!line.trim()) {
          return <div key={idx} className="h-1.5" />;
        }
        
        // Standard paragraphs
        return <p key={idx} className="my-1">{line}</p>;
      })}
    </div>
  );
}

export default function LeadsView() {
  const queryClient = useQueryClient();
  
  // UI views
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'health'>('kanban');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  
  // Modal controllers
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  
  // Active Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [industryFilter, setIndustryFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');
  
  // Tag Manager specific states
  const [newTagName, setNewTagName] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>(['seo-issues', 'no-scheduler', 'high-priority', 'replied', 'seo-focus', 'french-market', 'mobile-flaw', 'very-high-priority']);
  
  // Create lead form state
  const [createForm, setCreateForm] = useState({
    businessName: '',
    website: '',
    industry: '',
    category: '',
    city: '',
    country: '',
    email: '',
    phone: '',
    whatsapp: '',
    linkedinUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    googleBusinessUrl: '',
    notes: '',
    priority: OpportunityPriority.MEDIUM,
    status: LeadStatus.DISCOVERED,
    tags: [] as string[]
  });

  // Fetch the active user session status
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: () => apiService.getSession()
  });

  const workspaceId = session?.workspace?.id || 'workspace-mock-1';

  // 1. Fetch CRM Leads with Queries
  const { data: leads, isLoading: isLeadsLoading } = useQuery({
    queryKey: ['leads', workspaceId, searchQuery, statusFilter, priorityFilter, industryFilter, tagFilter],
    queryFn: () => apiService.getLeads(workspaceId, {
      search: searchQuery || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      industry: industryFilter || undefined,
      tag: tagFilter || undefined
    })
  });

  // 2. Fetch Lead CRM Stats
  const { data: crmStats } = useQuery({
    queryKey: ['crmStats', workspaceId],
    queryFn: () => apiService.getLeadStats(workspaceId)
  });

  // 3. Fetch Single Selected Lead Details
  const { data: leadDetails, isLoading: isLeadDetailsLoading } = useQuery({
    queryKey: ['leadDetails', selectedLeadId],
    queryFn: () => apiService.getLead(selectedLeadId!),
    enabled: !!selectedLeadId
  });

  // Fetch all tasks for tasks view linking
  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiService.getTasks()
  });

  // --- MUTATIONS ---
  const createLeadMutation = useMutation({
    mutationFn: (newLead: any) => apiService.createLead({ ...newLead, workspaceId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['crmStats'] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      setCreateLeadOpen(false);
      setCreateForm({
        businessName: '',
        website: '',
        industry: '',
        category: '',
        city: '',
        country: '',
        email: '',
        phone: '',
        whatsapp: '',
        linkedinUrl: '',
        facebookUrl: '',
        instagramUrl: '',
        googleBusinessUrl: '',
        notes: '',
        priority: OpportunityPriority.MEDIUM,
        status: LeadStatus.DISCOVERED,
        tags: []
      });
    }
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Lead> }) => apiService.updateLead(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['crmStats'] });
      queryClient.invalidateQueries({ queryKey: ['leadDetails', data.id] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    }
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['crmStats'] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      setSelectedLeadId(null);
    }
  });

  const saveNotesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => apiService.addLeadNote(id, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leadDetails', data.id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    }
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: ({ id, fileName, fileSize, fileType }: { id: string; fileName: string; fileSize: number; fileType: string }) =>
      apiService.addLeadAttachment(id, fileName, fileSize, fileType),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leadDetails', data.id] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (newTask: { leadId: string; title: string; description?: string; dueDate?: string }) =>
      apiService.createTask(newTask),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    }
  });

  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      apiService.updateTask(id, isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const analyzeLeadMutation = useMutation({
    mutationFn: (id: string) => apiService.analyzeLead(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['crmStats'] });
      queryClient.invalidateQueries({ queryKey: ['leadDetails', data.id] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    }
  });

  // Drag and Drop implementation for Kanban Board
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const handleDragStart = (leadId: string) => {
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: LeadStatus) => {
    if (draggedLeadId) {
      updateLeadMutation.mutate({
        id: draggedLeadId,
        updates: { status }
      });
      setDraggedLeadId(null);
    }
  };

  // Bulk pipeline action (shift all filtered leads to a new stage)
  const handleBulkStatusChange = (newStatus: LeadStatus) => {
    if (leads && leads.length > 0) {
      if (confirm(`Are you sure you want to move all ${leads.length} filtered leads to "${newStatus}"?`)) {
        leads.forEach(l => {
          updateLeadMutation.mutate({
            id: l.id,
            updates: { status: newStatus }
          });
        });
      }
    }
  };

  // Note auto-save controller with simulated timer
  const [noteText, setNoteText] = useState('');
  const [isAutosaving, setIsAutosaving] = useState(false);

  useEffect(() => {
    if (leadDetails) {
      setNoteText(leadDetails.notes || '');
    }
  }, [leadDetails]);

  // Handle autosave simulation on typing notes with key debounce
  useEffect(() => {
    if (!selectedLeadId || noteText === (leadDetails?.notes || '')) return;

    const timeout = setTimeout(() => {
      setIsAutosaving(true);
      saveNotesMutation.mutate({
        id: selectedLeadId,
        notes: noteText
      }, {
        onSuccess: () => {
          setIsAutosaving(false);
        }
      });
    }, 2000); // 2 second debounce auto-save

    return () => clearTimeout(timeout);
  }, [noteText]);

  // Form submission handler
  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (createForm.businessName.trim()) {
      createLeadMutation.mutate(createForm);
    }
  };

  // Helper file uploader simulator
  const handleFileUploadSimulate = (leadId: string, files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      uploadAttachmentMutation.mutate({
        id: leadId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
    }
  };

  // List of columns to iterate
  const pipelineColumns = Object.values(LeadStatus);

  // Active unique values extracted for dropdown filters
  const uniqueIndustries = leads ? Array.from(new Set(leads.map(l => l.industry).filter(Boolean))) : [];

  return (
    <div className="space-y-6 font-sans">
      {/* ========================================== */}
      {/* 1. SECTION HEADER ACTIONS */}
      {/* ========================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-400" />
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">CRM Lead Management Pipeline</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Organize high-conversion outreach pipelines, manage files, track notes, and qualify sales prospects.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Swappers (Kanban / List / Health) */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'kanban' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Kanban Pipeline</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'list' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>List Grid View</span>
            </button>
            <button
              onClick={() => setViewMode('health')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'health' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Health & Integrity</span>
            </button>
          </div>

          {/* Quick Tag Manager */}
          <button
            onClick={() => setTagManagerOpen(true)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Manage Tags</span>
          </button>

          {/* Create Lead Button */}
          <button
            onClick={() => setCreateLeadOpen(true)}
            className="px-3.5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-violet-600/10 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Discover Lead</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. ADVANCED CRM MULTI-FILTERING ACTIONS */}
      {/* ========================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-850">
          <Filter className="w-4 h-4 text-violet-400" />
          <span className="font-bold text-xs text-slate-200">Segment & Search Criteria Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Query Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search company, site, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Pipeline Stage */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-violet-500 transition-colors"
          >
            <option value="">All Pipeline Stages</option>
            {pipelineColumns.map(col => (
              <option key={col} value={col}>{col.toUpperCase().replace(/_/g, ' ')}</option>
            ))}
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-violet-500 transition-colors"
          >
            <option value="">All Priorities</option>
            {Object.values(OpportunityPriority).map(prio => (
              <option key={prio} value={prio}>{prio} Priority</option>
            ))}
          </select>

          {/* Industry detection */}
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-violet-500 transition-colors"
          >
            <option value="">All Industries</option>
            {uniqueIndustries.map(ind => (
              <option key={ind as string} value={ind as string}>{ind}</option>
            ))}
          </select>

          {/* Tag filtering */}
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-violet-500 transition-colors"
          >
            <option value="">All Tags</option>
            {availableTags.map(tg => (
              <option key={tg} value={tg}>#{tg}</option>
            ))}
          </select>
        </div>

        {/* Bulk segment action & Active tag metrics */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span>Filtered Leads Count: <strong className="text-violet-400 font-mono font-bold">{leads?.length || 0}</strong></span>
            {(searchQuery || statusFilter || priorityFilter || industryFilter || tagFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('');
                  setPriorityFilter('');
                  setIndustryFilter('');
                  setTagFilter('');
                }}
                className="text-violet-400 hover:underline font-semibold flex items-center gap-1"
              >
                (Clear active filters)
              </button>
            )}
          </div>

          {/* Bulk pipeline status moves */}
          {leads && leads.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-850">
              <span className="font-mono text-[10px] text-slate-500">Bulk action:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatusChange(e.target.value as LeadStatus);
                    e.target.value = '';
                  }
                }}
                className="bg-transparent border-none text-[10px] text-violet-400 focus:outline-none font-bold"
              >
                <option value="">Shift filtered leads...</option>
                {pipelineColumns.map(st => (
                  <option key={st} value={st}>Move to {st.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. CORE DISPLAY ENGINE (KANBAN OR LIST GRID) */}
      {/* ========================================== */}
      {viewMode === 'health' ? (
        <DataHealthDashboard workspaceId={workspaceId} onSelectLead={(id) => setSelectedLeadId(id)} />
      ) : isLeadsLoading ? (
        <div className="flex justify-center items-center py-24 bg-slate-900/40 rounded-2xl border border-slate-850">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
            <span className="text-xs text-slate-400">Querying active CRM leads pipeline...</span>
          </div>
        </div>
      ) : leads?.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-850 max-w-lg mx-auto">
          <Layers className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <h3 className="font-bold text-slate-200 text-sm">No Qualified CRM Leads Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-normal">
            No prospects match your active segment filters. Reset criteria, check other workspace campaigns, or discover a new lead to begin.
          </p>
          <button
            onClick={() => setCreateLeadOpen(true)}
            className="mt-4 px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-md shadow-violet-600/10"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Discover First Lead</span>
          </button>
        </div>
      ) : viewMode === 'kanban' ? (
        // --- 13-COLUMN HORIZONTAL SCROLLABLE KANBAN ---
        <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="flex gap-4 min-w-[2800px] h-[520px]">
            {pipelineColumns.map((col) => {
              const columnLeads = leads?.filter(l => l.status === col) || [];
              const colors = STATUS_COLORS[col];
              
              return (
                <div
                  key={col}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(col)}
                  className="w-80 bg-slate-900/35 border border-slate-850/65 rounded-xl p-3 flex flex-col h-full shrink-0 transition-colors"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-850">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${colors.text.replace('text-', 'bg-')}`}></span>
                      <h3 className="font-bold text-xs text-slate-100 truncate uppercase tracking-tight">
                        {col.replace(/_/g, ' ')}
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-slate-850 text-slate-400 px-2 py-0.5 rounded-full shrink-0">
                      {columnLeads.length}
                    </span>
                  </div>

                  {/* Kanban Cards Scroll container */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-none">
                    {columnLeads.length === 0 ? (
                      <div className="flex items-center justify-center h-28 border border-dashed border-slate-850/60 rounded-xl">
                        <span className="text-[10px] text-slate-600 font-mono italic">Drag leads here</span>
                      </div>
                    ) : (
                      columnLeads.map((lead) => {
                        const prioColors = PRIORITY_COLORS[lead.opportunityPriority] || PRIORITY_COLORS[OpportunityPriority.MEDIUM];
                        return (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={() => handleDragStart(lead.id)}
                            onClick={() => setSelectedLeadId(lead.id)}
                            className="bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-3.5 cursor-grab active:cursor-grabbing transition-all hover:shadow-lg group relative"
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <span className="font-bold text-xs text-slate-200 group-hover:text-violet-400 truncate block">
                                {lead.businessName}
                              </span>
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${prioColors.bg}`}>
                                {lead.opportunityPriority}
                              </span>
                            </div>

                            {/* Website url */}
                            {lead.website && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mb-2 truncate">
                                <Globe className="w-3 h-3 text-slate-600" />
                                <span>{lead.website.replace('https://', '').replace('http://', '')}</span>
                              </div>
                            )}

                            {/* Scoring indicators */}
                            <div className="grid grid-cols-2 gap-2 border-t border-slate-900 pt-2 text-[10px] font-mono">
                              <div>
                                <span className="text-slate-500 block">Health Index</span>
                                <span className={`font-semibold ${
                                  lead.websiteHealthScore > 75 ? 'text-emerald-400' : lead.websiteHealthScore > 50 ? 'text-amber-400' : 'text-red-400'
                                }`}>
                                  {lead.websiteHealthScore}/100
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Opportunity</span>
                                <span className={`font-semibold ${
                                  lead.opportunityScore > 75 ? 'text-emerald-400' : lead.opportunityScore > 50 ? 'text-amber-400' : 'text-red-400'
                                }`}>
                                  {lead.opportunityScore}%
                                </span>
                              </div>
                            </div>

                            {/* Active tags mapping */}
                            {lead.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3.5">
                                {lead.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="text-[8px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-850">
                                    #{tag}
                                  </span>
                                ))}
                                {lead.tags.length > 2 && (
                                  <span className="text-[8px] bg-slate-900 text-slate-500 px-1 py-0.5 rounded">
                                    +{lead.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Hover overlay button */}
                            <div className="absolute right-3.5 bottom-3.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="w-3.5 h-3.5 text-violet-400" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // --- DATA GRID TABULAR LIST VIEW ---
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold">
                  <th className="p-4">Business Profile</th>
                  <th className="p-4">Pipeline Stage</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Health Index</th>
                  <th className="p-4">Opportunity</th>
                  <th className="p-4">Target Geography</th>
                  <th className="p-4">Tags</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {leads?.map((lead) => {
                  const colors = STATUS_COLORS[lead.status];
                  const prioColors = PRIORITY_COLORS[lead.opportunityPriority] || PRIORITY_COLORS[OpportunityPriority.MEDIUM];
                  
                  return (
                    <tr key={lead.id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="p-4">
                        <div className="min-w-0">
                          <button
                            onClick={() => setSelectedLeadId(lead.id)}
                            className="font-bold text-slate-200 hover:text-violet-400 block text-left"
                          >
                            {lead.businessName}
                          </button>
                          {lead.website && (
                            <span className="text-[10px] text-slate-500 font-mono">{lead.website}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.text.replace('text-', 'bg-')}`}></span>
                          {lead.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${prioColors.bg}`}>
                          {lead.opportunityPriority}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-semibold">
                        <span className={lead.websiteHealthScore > 75 ? 'text-emerald-400' : lead.websiteHealthScore > 50 ? 'text-amber-400' : 'text-red-400'}>
                          {lead.websiteHealthScore}/100
                        </span>
                      </td>
                      <td className="p-4 font-mono font-semibold">
                        <span className={lead.opportunityScore > 75 ? 'text-emerald-400' : lead.opportunityScore > 50 ? 'text-amber-400' : 'text-red-400'}>
                          {lead.opportunityScore}%
                        </span>
                      </td>
                      <td className="p-4 text-slate-300">
                        {lead.city && lead.country ? `${lead.city}, ${lead.country}` : lead.country || lead.city || 'Not Assigned'}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {lead.tags.slice(0, 3).map(tg => (
                            <span key={tg} className="text-[9px] bg-slate-950 border border-slate-850 text-slate-400 px-1.5 py-0.5 rounded">
                              #{tg}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedLeadId(lead.id)}
                            className="p-1.5 rounded bg-slate-950 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-slate-200 transition-all"
                            title="View Detail Panel"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteLeadMutation.mutate(lead.id)}
                            className="p-1.5 rounded bg-slate-950 border border-slate-800 hover:border-red-950 hover:text-red-400 text-slate-500 transition-all"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. DETAIL PANEL OVERLAY VIEW */}
      {/* ========================================== */}
      {selectedLeadId && (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-4xl bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col transform transition-transform">
          {isLeadDetailsLoading ? (
            <div className="flex-1 flex flex-col justify-center items-center">
              <RefreshCw className="w-8 h-8 text-violet-500 animate-spin mb-2" />
              <span className="text-xs text-slate-400">Loading Lead dossiers...</span>
            </div>
          ) : !leadDetails ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
              <span className="text-xs text-red-400">Dossier error: Lead files missing or deleted.</span>
              <button onClick={() => setSelectedLeadId(null)} className="mt-4 text-xs text-violet-400 underline">Dismiss</button>
            </div>
          ) : (
            <LeadDetailDossier
              lead={leadDetails}
              onClose={() => setSelectedLeadId(null)}
              onUpdate={(updates) => updateLeadMutation.mutate({ id: leadDetails.id, updates })}
              onDelete={() => {
                if (confirm('Are you sure you want to permanently purge this lead profile?')) {
                  deleteLeadMutation.mutate(leadDetails.id);
                }
              }}
              noteText={noteText}
              setNoteText={setNoteText}
              isAutosaving={isAutosaving}
              tasks={tasks?.filter(t => t.leadId === leadDetails.id) || []}
              onAddTask={(title, due) => createTaskMutation.mutate({ leadId: leadDetails.id, title, dueDate: due })}
              onToggleTask={(taskId, done) => toggleTaskMutation.mutate({ id: taskId, isCompleted: done })}
              onDeleteTask={(taskId) => deleteTaskMutation.mutate(taskId)}
              onUploadAttachment={(fileList) => handleFileUploadSimulate(leadDetails.id, fileList)}
              availableTags={availableTags}
              onAnalyze={() => analyzeLeadMutation.mutate(leadDetails.id)}
              isAnalyzing={analyzeLeadMutation.isPending}
            />
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* 5. CREATE LEAD SHEET MODAL */}
      {/* ========================================== */}
      {createLeadOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-violet-400" />
                <h3 className="font-bold text-slate-100 text-sm uppercase tracking-tight">Discover & Index Prospect Lead</h3>
              </div>
              <button onClick={() => setCreateLeadOpen(false)} className="p-1.5 rounded hover:bg-slate-800">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
              {/* Basic business info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Company Business Name*</label>
                  <input
                    type="text"
                    required
                    value={createForm.businessName}
                    onChange={(e) => setCreateForm({ ...createForm, businessName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                    placeholder="Downtown Medical Services"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Website URL</label>
                  <input
                    type="url"
                    value={createForm.website}
                    onChange={(e) => setCreateForm({ ...createForm, website: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                    placeholder="https://example-medical.com"
                  />
                </div>
              </div>

              {/* Segment classification */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-400 font-medium mb-1">Primary Industry Category</label>
                  <input
                    type="text"
                    value={createForm.industry}
                    onChange={(e) => setCreateForm({ ...createForm, industry: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                    placeholder="Healthcare & Medical"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Pipeline Stage</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as LeadStatus })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-violet-500"
                  >
                    {pipelineColumns.map(st => (
                      <option key={st} value={st}>{st.replace(/_/g, ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Opportunity Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as OpportunityPriority })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-violet-500"
                  >
                    {Object.values(OpportunityPriority).map(prio => (
                      <option key={prio} value={prio}>{prio}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Geographic metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Niche Category</label>
                  <input
                    type="text"
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                    placeholder="Dentist, Spa, Clinic"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">City Location</label>
                  <input
                    type="text"
                    value={createForm.city}
                    onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                    placeholder="Chicago"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Country</label>
                  <input
                    type="text"
                    value={createForm.country}
                    onChange={(e) => setCreateForm({ ...createForm, country: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                    placeholder="USA"
                  />
                </div>
              </div>

              {/* Direct Communication Channels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Contact Email Address</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                    placeholder="contact@dentalclinic.com"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Telephone Contact</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                    placeholder="+1 (555) 012-3456"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">WhatsApp Mobile Link</label>
                  <input
                    type="text"
                    value={createForm.whatsapp}
                    onChange={(e) => setCreateForm({ ...createForm, whatsapp: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                    placeholder="+1 (555) 012-3456"
                  />
                </div>
              </div>

              {/* Social mapping dossiers */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-400 font-medium mb-1">LinkedIn Business Profile Link</label>
                  <input
                    type="url"
                    value={createForm.linkedinUrl}
                    onChange={(e) => setCreateForm({ ...createForm, linkedinUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                    placeholder="https://linkedin.com/company/dental-clinic"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Instagram Link</label>
                  <input
                    type="url"
                    value={createForm.instagramUrl}
                    onChange={(e) => setCreateForm({ ...createForm, instagramUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                    placeholder="https://instagram.com/dentalclinic"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Google Maps Business URL</label>
                  <input
                    type="url"
                    value={createForm.googleBusinessUrl}
                    onChange={(e) => setCreateForm({ ...createForm, googleBusinessUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                    placeholder="https://maps.google.com/place/clinic"
                  />
                </div>
              </div>

              {/* Custom Tags Checklist */}
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Apply Initial Pipeline Tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tg => {
                    const isSelected = createForm.tags.includes(tg);
                    return (
                      <button
                        type="button"
                        key={tg}
                        onClick={() => {
                          const tags = isSelected
                            ? createForm.tags.filter(t => t !== tg)
                            : [...createForm.tags, tg];
                          setCreateForm({ ...createForm, tags });
                        }}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all ${
                          isSelected
                            ? 'bg-violet-600 border-violet-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        #{tg}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateLeadOpen(false)}
                  className="px-4 py-2 bg-slate-950 border border-slate-850 hover:bg-slate-900 rounded-lg font-semibold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLeadMutation.isPending}
                  className="px-4.5 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-850 text-white font-bold rounded-lg shadow-lg"
                >
                  Confirm Discovery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 6. TAG MANAGER DRAWER / MODAL */}
      {/* ========================================== */}
      {tagManagerOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4.5 h-4.5 text-violet-400" />
                <h3 className="font-bold text-slate-100 text-sm uppercase tracking-tight">Color Tag Registry Manager</h3>
              </div>
              <button onClick={() => setTagManagerOpen(false)} className="p-1.5 rounded hover:bg-slate-800">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Existing Tag List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Registered Tags</span>
              {availableTags.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No custom tags created.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tg => (
                    <div key={tg} className="inline-flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-xs text-slate-300">
                      <span>#{tg}</span>
                      <button
                        onClick={() => {
                          if (confirm(`Remove tag #${tg} from available list?`)) {
                            setAvailableTags(prev => prev.filter(t => t !== tg));
                          }
                        }}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Tag Inline */}
            <div className="space-y-2.5 pt-3 border-t border-slate-800">
              <label className="block text-slate-400 text-xs font-medium">Add New Tag Entry</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. cold-prospect"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                />
                <button
                  onClick={() => {
                    if (newTagName.trim() && !availableTags.includes(newTagName.trim())) {
                      setAvailableTags(prev => [...prev, newTagName.trim()]);
                      setNewTagName('');
                    }
                  }}
                  className="px-3.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold transition-all"
                >
                  Create
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setTagManagerOpen(false)}
                className="px-4.5 py-2 bg-slate-950 border border-slate-850 hover:bg-slate-900 rounded-lg text-xs font-bold text-slate-300"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// LEAD DETAIL DOSSIER COMPONENT LAYOUT
// ==========================================
interface LeadDetailDossierProps {
  lead: Lead;
  onClose: () => void;
  onUpdate: (updates: Partial<Lead>) => void;
  onDelete: () => void;
  noteText: string;
  setNoteText: (val: string) => void;
  isAutosaving: boolean;
  tasks: Task[];
  onAddTask: (title: string, due: string) => void;
  onToggleTask: (taskId: string, done: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  onUploadAttachment: (files: FileList | null) => void;
  availableTags: string[];
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

function LeadDetailDossier({
  lead, onClose, onUpdate, onDelete, noteText, setNoteText, isAutosaving,
  tasks, onAddTask, onToggleTask, onDeleteTask, onUploadAttachment, availableTags,
  onAnalyze, isAnalyzing
}: LeadDetailDossierProps) {
  
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'proposals' | 'notes' | 'reminders' | 'files' | 'audit'>('overview');
  
  // Local form editing controller
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editContactForm, setEditContactForm] = useState({
    contactName: lead.contactName || '',
    email: lead.email || '',
    phone: lead.phone || '',
    whatsapp: lead.whatsapp || '',
    linkedinUrl: lead.linkedinUrl || '',
    facebookUrl: lead.facebookUrl || '',
    instagramUrl: lead.instagramUrl || '',
    googleBusinessUrl: lead.googleBusinessUrl || '',
    category: lead.category || '',
    city: lead.city || '',
    country: lead.country || '',
    industry: lead.industry || ''
  });

  useEffect(() => {
    setEditContactForm({
      contactName: lead.contactName || '',
      email: lead.email || '',
      phone: lead.phone || '',
      whatsapp: lead.whatsapp || '',
      linkedinUrl: lead.linkedinUrl || '',
      facebookUrl: lead.facebookUrl || '',
      instagramUrl: lead.instagramUrl || '',
      googleBusinessUrl: lead.googleBusinessUrl || '',
      category: lead.category || '',
      city: lead.city || '',
      country: lead.country || '',
      industry: lead.industry || ''
    });
  }, [lead]);
  
  // Local task form state inside dossier
  const [localTaskTitle, setLocalTaskTitle] = useState('');
  const [localTaskDueDate, setLocalTaskDueDate] = useState('');

  const handleAddLocalTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (localTaskTitle.trim()) {
      onAddTask(
        localTaskTitle,
        localTaskDueDate || new Date(Date.now() + 86400000 * 3).toISOString()
      );
      setLocalTaskTitle('');
      setLocalTaskDueDate('');
    }
  };

  const handleSaveContact = () => {
    onUpdate(editContactForm);
    setIsEditingContact(false);
  };

  // Quick communication helper
  const mailtoLink = lead.email ? `mailto:${lead.email}?subject=SEO and Mobile UX Audit Inquiry` : null;
  const telLink = lead.phone ? `tel:${lead.phone}` : null;
  const whatsappLink = lead.whatsapp ? `https://wa.me/${lead.whatsapp.replace(/[^0-9]/g, '')}` : null;

  // Render the scoring progress bar
  const renderScoreBar = (label: string, score: number, desc: string) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="text-slate-400">{label}</span>
        <span className={`font-bold ${score > 75 ? 'text-emerald-400' : score > 50 ? 'text-amber-400' : 'text-red-400'}`}>{score}%</span>
      </div>
      <div className="h-1.5 bg-slate-900 border border-slate-850 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${score > 75 ? 'bg-emerald-500' : score > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
      <p className="text-[9px] text-slate-500 italic mt-0.5">{desc}</p>
    </div>
  );

  return (
    <div className="h-full flex flex-col justify-between bg-slate-950 text-xs">
      
      {/* 1. HEADER CONTROL RAIL */}
      <div className="p-5 border-b border-slate-900 bg-slate-900/40 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-slate-100 truncate block">{lead.businessName}</h2>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              Source: <span className="text-violet-400">{lead.leadSource}</span> | Assigned: <span className="text-slate-300">{lead.owner || 'Abdulwahab Abdullah'}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status quick override dropdown */}
          <select
            value={lead.status}
            onChange={(e) => onUpdate({ status: e.target.value as LeadStatus })}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-violet-400 focus:outline-none cursor-pointer"
          >
            {Object.values(LeadStatus).map(st => (
              <option key={st} value={st}>STAGE: {st.replace(/_/g, ' ').toUpperCase()}</option>
            ))}
          </select>

          {/* Delete Dossier */}
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-red-950 hover:text-red-400 text-slate-500 transition-colors"
            title="Purge Lead Profile"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Close Panel overlay */}
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. TABBED METRIC HEADERS */}
      <div className="bg-slate-950 border-b border-slate-900 px-4 flex overflow-x-auto scrollbar-thin">
        {[
          { id: 'overview', label: 'Dossier Overview', icon: Users },
          { id: 'analysis', label: 'AI Web Audit', icon: Sparkles },
          { id: 'proposals', label: 'AI Proposals', icon: MessageSquare },
          { id: 'notes', label: 'Markdown Notes', icon: FileText, suffix: isAutosaving ? 'Saving...' : '' },
          { id: 'reminders', label: 'Follow-up Tasks', icon: CheckSquare, count: tasks.length },
          { id: 'files', label: 'Dossier Files', icon: Paperclip, count: lead.attachments?.length || 0 },
          { id: 'audit', label: 'Action Timeline', icon: Activity }
        ].map(tb => {
          const Icon = tb.icon;
          const isActive = activeTab === tb.id;
          return (
            <button
              key={tb.id}
              onClick={() => setActiveTab(tb.id as any)}
              className={`px-4 py-3.5 border-b-2 text-[11px] font-semibold flex items-center gap-2 transition-all shrink-0 ${
                isActive
                  ? 'border-violet-500 text-violet-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tb.label}</span>
              {tb.count !== undefined && tb.count > 0 && (
                <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.2 rounded-full font-mono">{tb.count}</span>
              )}
              {tb.suffix && (
                <span className="text-[9px] text-amber-500 font-mono animate-pulse">{tb.suffix}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. CORE SCROLL CONTENT FRAME */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        
        {/* ========================================== */}
        {/* TAB 1: OVERVIEW & CONTACT DETAILS */}
        {/* ========================================== */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* LEFT SIDE: Contact form card */}
            <div className="lg:col-span-3 space-y-5">
              <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                  <h3 className="font-bold text-slate-100 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-violet-400" />
                    <span>Communication Registry Dossier</span>
                  </h3>
                  <button
                    onClick={() => {
                      if (isEditingContact) handleSaveContact();
                      else setIsEditingContact(true);
                    }}
                    className="text-[10px] text-violet-400 hover:underline font-bold"
                  >
                    {isEditingContact ? 'Save Changes' : 'Edit Contacts'}
                  </button>
                </div>

                {isEditingContact ? (
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Primary Contact Name</label>
                      <input
                        type="text"
                        value={editContactForm.contactName}
                        onChange={(e) => setEditContactForm({ ...editContactForm, contactName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                        placeholder="Dr. Jenkins"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Email</label>
                        <input
                          type="email"
                          value={editContactForm.email}
                          onChange={(e) => setEditContactForm({ ...editContactForm, email: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Phone</label>
                        <input
                          type="text"
                          value={editContactForm.phone}
                          onChange={(e) => setEditContactForm({ ...editContactForm, phone: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">WhatsApp</label>
                        <input
                          type="text"
                          value={editContactForm.whatsapp}
                          onChange={(e) => setEditContactForm({ ...editContactForm, whatsapp: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">LinkedIn</label>
                        <input
                          type="url"
                          value={editContactForm.linkedinUrl}
                          onChange={(e) => setEditContactForm({ ...editContactForm, linkedinUrl: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">City</label>
                        <input
                          type="text"
                          value={editContactForm.city}
                          onChange={(e) => setEditContactForm({ ...editContactForm, city: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Country</label>
                        <input
                          type="text"
                          value={editContactForm.country}
                          onChange={(e) => setEditContactForm({ ...editContactForm, country: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Active Actionable communication rails */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-2.5">
                      {mailtoLink ? (
                        <a href={mailtoLink} className="p-3 bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 rounded-xl border border-violet-500/15 flex items-center justify-between text-xs font-bold transition-all">
                          <span className="truncate">Email Outreach</span>
                          <Mail className="w-4 h-4 shrink-0" />
                        </a>
                      ) : (
                        <div className="p-3 bg-slate-900 border border-slate-850 text-slate-500 rounded-xl flex items-center justify-between text-[11px] italic">
                          <span>No Email</span>
                          <Mail className="w-4 h-4 shrink-0" />
                        </div>
                      )}

                      {telLink ? (
                        <a href={telLink} className="p-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/15 flex items-center justify-between text-xs font-bold transition-all">
                          <span>Phone Call</span>
                          <Phone className="w-4 h-4 shrink-0" />
                        </a>
                      ) : (
                        <div className="p-3 bg-slate-900 border border-slate-850 text-slate-500 rounded-xl flex items-center justify-between text-[11px] italic">
                          <span>No Phone</span>
                          <Phone className="w-4 h-4 shrink-0" />
                        </div>
                      )}

                      {whatsappLink ? (
                        <a href={whatsappLink} target="_blank" rel="noreferrer" className="p-3 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/15 flex items-center justify-between text-xs font-bold transition-all">
                          <span>WhatsApp</span>
                          <MessageSquare className="w-4 h-4 shrink-0" />
                        </a>
                      ) : (
                        <div className="p-3 bg-slate-900 border border-slate-850 text-slate-500 rounded-xl flex items-center justify-between text-[11px] italic">
                          <span>No WhatsApp</span>
                          <MessageSquare className="w-4 h-4 shrink-0" />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block uppercase tracking-wider text-[9px] font-mono">Contact Person</span>
                        <p className="text-slate-200 font-semibold mt-0.5">{lead.contactName || 'No contact person assigned'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 block uppercase tracking-wider text-[9px] font-mono">Location Map</span>
                        <p className="text-slate-200 font-semibold mt-0.5">
                          {lead.city || lead.country ? `${lead.city || ''}, ${lead.country || ''}` : 'Not Specified'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 block uppercase tracking-wider text-[9px] font-mono">Direct Email Address</span>
                        <p className="text-slate-200 font-semibold mt-0.5 font-mono">{lead.email || 'None'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 block uppercase tracking-wider text-[9px] font-mono">Mobile Contact</span>
                        <p className="text-slate-200 font-semibold mt-0.5 font-mono">{lead.phone || 'None'}</p>
                      </div>
                    </div>

                    {/* Social networks lookup links */}
                    <div className="pt-3 border-t border-slate-850 flex flex-wrap gap-2 text-[10px]">
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noreferrer" className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-md text-slate-300 flex items-center gap-1 transition-all">
                          <Globe className="w-3 h-3 text-violet-400" />
                          <span>Visit Website</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      )}
                      {lead.linkedinUrl && (
                        <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-md text-slate-300 flex items-center gap-1 transition-all">
                          <Layers className="w-3 h-3 text-blue-400" />
                          <span>LinkedIn</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      )}
                      {lead.googleBusinessUrl && (
                        <a href={lead.googleBusinessUrl} target="_blank" rel="noreferrer" className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-md text-slate-300 flex items-center gap-1 transition-all">
                          <Globe className="w-3 h-3 text-red-400" />
                          <span>Google Maps Listing</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* CRM tags applied currently */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-3.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Pipeline tags</span>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tg => {
                    const isSelected = lead.tags.includes(tg);
                    return (
                      <button
                        key={tg}
                        onClick={() => {
                          const updatedTags = isSelected
                            ? lead.tags.filter(t => t !== tg)
                            : [...lead.tags, tg];
                          onUpdate({ tags: updatedTags });
                        }}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all ${
                          isSelected
                            ? 'bg-violet-600 border-violet-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        #{tg}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Scoring metrics panel */}
            <div className="lg:col-span-2 space-y-5">
              {/* Opportunities summary */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-md text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-600"></div>
                
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opportunity rating score</span>
                <div className="py-2">
                  <div className={`text-4xl font-extrabold ${lead.opportunityScore > 75 ? 'text-emerald-400' : lead.opportunityScore > 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {lead.opportunityScore}%
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-slate-500 mt-1 block uppercase">
                    Priority status: <strong className="text-slate-300">{lead.opportunityPriority}</strong>
                  </span>
                </div>

                <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-3.5 text-left text-[11px] leading-relaxed">
                  <span className="font-bold text-slate-200 block mb-1">Recommended CRM Action Roadmap:</span>
                  <p className="text-slate-400 font-mono italic">{lead.suggestedAction || 'Analyze website to compile specific AI pain-point reports.'}</p>
                </div>
              </div>

              {/* Website health breakdown */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                  <span className="font-bold text-xs text-slate-200 uppercase tracking-wider">Website Health score</span>
                  <span className="font-bold text-xs text-violet-400 font-mono">{lead.websiteHealthScore}/100</span>
                </div>

                <div className="space-y-3">
                  {renderScoreBar('SEO Basics', lead.scoreSeo || 50, 'Metadata indexing accuracy')}
                  {renderScoreBar('Mobile UX Layout', lead.scoreMobile || 50, 'Responsive layout viewport testing')}
                  {renderScoreBar('Trust Signals & Security', lead.scoreTrust || 50, 'SSL verification and review listings')}
                  {renderScoreBar('Accessibilities', lead.scoreAccessibility || 50, 'Tag contrast and image labels')}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================== */}
        {/* TAB: WEBSITE AUDIT & AI INTELLIGENCE */}
        {/* ========================================== */}
        {activeTab === 'analysis' && isAnalyzing && (
          <div className="flex flex-col justify-center items-center py-20 w-full h-full">
            <div className="max-w-md w-full space-y-6 text-center">
              <RefreshCw className="w-12 h-12 text-violet-500 animate-spin mx-auto" />
              <div className="space-y-2">
                <h4 className="font-bold text-slate-200 text-sm">Deep Audit Pipeline In Progress</h4>
                <p className="text-xs text-slate-500">Crawling assets and orchestrating multi-agent analysis with Gemini...</p>
              </div>
              <AnalysisProgressStages />
            </div>
          </div>
        )}

        {activeTab === 'analysis' && !isAnalyzing && (!lead.aiAnalysisData || !lead.aiAnalysisData.lastAnalyzedAt) && (
          <div className="text-center py-16 max-w-md mx-auto space-y-5">
            <Sparkles className="w-12 h-12 text-violet-500 mx-auto animate-bounce" />
            <div className="space-y-2">
              <h3 className="font-bold text-slate-200 text-sm">Initiate Website Intelligence Audit</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect directly to the homepage of <strong className="text-slate-400">{lead.website || 'unassigned URL'}</strong>. Crawl metadata, analyze tech stacks, and run a full SWOT & Conversion Gap audit using Gemini-3.5-flash.
              </p>
            </div>
            {lead.website ? (
              <button
                onClick={onAnalyze}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-violet-600/10 hover:shadow-violet-600/20 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Execute Deep Website Audit</span>
              </button>
            ) : (
              <div className="p-4 bg-slate-900 border border-slate-850 text-slate-500 rounded-xl text-xs leading-normal">
                Website URL must be set before executing audits. Update the company contacts in the Dossier Overview first.
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && !isAnalyzing && lead.aiAnalysisData && lead.aiAnalysisData.lastAnalyzedAt && (
          <div className="space-y-6 animate-fade-in">
            {/* Header summary & Re-analyze actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-900">
              <div>
                <h3 className="font-bold text-slate-200 text-sm">AI Website Intelligence Dashboard</h3>
                <p className="text-[10px] text-slate-500">
                  Last analyzed: <span className="font-mono text-slate-400">{new Date(lead.aiAnalysisData.lastAnalyzedAt).toLocaleString()}</span>
                </p>
              </div>
              <button
                onClick={onAnalyze}
                className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-Run Audit</span>
              </button>
            </div>

            {/* Bento Grid Segment 1: Value Proposition Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10">
                <Sparkles className="w-32 h-32 text-violet-400" />
              </div>
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest font-mono">Synthesized Value Pitch</span>
              <blockquote className="text-sm font-semibold text-slate-200 mt-2 pl-4 border-l-2 border-violet-500 leading-relaxed font-sans">
                "{lead.aiAnalysisData.valueProposition || 'No explicit value statement extracted.'}"
              </blockquote>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Strengths List (SWOT) */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-3.5">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Strategic Strengths (SWOT)</span>
                {lead.aiAnalysisData.strengths && lead.aiAnalysisData.strengths.length > 0 ? (
                  <ul className="space-y-2.5">
                    {lead.aiAnalysisData.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic font-mono">No strengths recorded.</p>
                )}
              </div>

              {/* Gaps & Weaknesses List (SWOT) */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-3.5">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Gaps & Weaknesses (SWOT)</span>
                {lead.aiAnalysisData.weaknesses && lead.aiAnalysisData.weaknesses.length > 0 ? (
                  <ul className="space-y-2.5">
                    {lead.aiAnalysisData.weaknesses.map((wk, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 mt-1.5" />
                        <span>{wk}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic font-mono">No weaknesses detected.</p>
                )}
              </div>
            </div>

            {/* Bento Grid Segment 2: Tech stack & Demographics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-3.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Detected Tech Stack & CMS</span>
                <div className="flex flex-wrap gap-1.5">
                  {lead.aiAnalysisData.cmsDetected && (
                    <span className="px-2.5 py-1 bg-violet-600/15 border border-violet-500/20 rounded-md text-[10px] font-bold text-violet-400 uppercase">
                      CMS: {lead.aiAnalysisData.cmsDetected}
                    </span>
                  )}
                  {lead.aiAnalysisData.techStack && lead.aiAnalysisData.techStack.length > 0 ? (
                    lead.aiAnalysisData.techStack.map(tech => (
                      <span key={tech} className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-300 rounded font-mono text-[10px]">
                        {tech}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic font-mono">No framework headers detected.</span>
                  )}
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-3.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Target Audiences</span>
                <div className="flex flex-wrap gap-1.5">
                  {lead.aiAnalysisData.targetDemographics && lead.aiAnalysisData.targetDemographics.length > 0 ? (
                    lead.aiAnalysisData.targetDemographics.map(dem => (
                      <span key={dem} className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-[10px] font-medium">
                        {dem}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic font-mono">No target demographics mapped.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Missing Features - conversion boosters */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Missing Conversion-Optimized Features</span>
              {lead.aiAnalysisData.missingFeatures && lead.aiAnalysisData.missingFeatures.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {lead.aiAnalysisData.missingFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-850">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-300">{feat}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic font-mono text-center py-4 text-emerald-400 flex items-center justify-center gap-1.5">
                  <span>✓</span> High-conversion structure is fully complete.
                </p>
              )}
            </div>

            {/* Specific Defect Checklists (SEO, UX, accessibility, branding) */}
            <div className="space-y-4 pt-2 border-t border-slate-900">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">Structural Category Defects Mapped</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* SEO Defect Checklist */}
                <div className="bg-slate-900/20 border border-slate-850 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SEO Deficiencies</span>
                  {lead.aiAnalysisData.seoIssues && lead.aiAnalysisData.seoIssues.length > 0 ? (
                    <ul className="space-y-2">
                      {lead.aiAnalysisData.seoIssues.map((iss, idx) => (
                        <li key={idx} className="text-[11px] text-slate-400 flex items-start gap-2 leading-relaxed">
                          <span className="text-rose-500 text-xs shrink-0 font-bold mt-0.5">✕</span>
                          <span>{iss}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-emerald-400 italic font-mono flex items-center gap-1">
                      <span>✓</span> SEO structure conforms to standard indexes
                    </p>
                  )}
                </div>

                {/* UX Defect Checklist */}
                <div className="bg-slate-900/20 border border-slate-850 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">UX & Conversion Gaps</span>
                  {lead.aiAnalysisData.uxIssues && lead.aiAnalysisData.uxIssues.length > 0 ? (
                    <ul className="space-y-2">
                      {lead.aiAnalysisData.uxIssues.map((iss, idx) => (
                        <li key={idx} className="text-[11px] text-slate-400 flex items-start gap-2 leading-relaxed">
                          <span className="text-rose-500 text-xs shrink-0 font-bold mt-0.5">✕</span>
                          <span>{iss}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-emerald-400 italic font-mono flex items-center gap-1">
                      <span>✓</span> Visual experience layouts validated
                    </p>
                  )}
                </div>

                {/* Accessibility */}
                <div className="bg-slate-900/20 border border-slate-850 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Accessibility Flaws</span>
                  {lead.aiAnalysisData.accessibilityIssues && lead.aiAnalysisData.accessibilityIssues.length > 0 ? (
                    <ul className="space-y-2">
                      {lead.aiAnalysisData.accessibilityIssues.map((iss, idx) => (
                        <li key={idx} className="text-[11px] text-slate-400 flex items-start gap-2 leading-relaxed">
                          <span className="text-rose-500 text-xs shrink-0 font-bold mt-0.5">✕</span>
                          <span>{iss}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-emerald-400 italic font-mono flex items-center gap-1">
                      <span>✓</span> Standard accessibility indices satisfied
                    </p>
                  )}
                </div>

                {/* Branding flaws */}
                <div className="bg-slate-900/20 border border-slate-850 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Branding & Consistency Flaws</span>
                  {lead.aiAnalysisData.brandingIssues && lead.aiAnalysisData.brandingIssues.length > 0 ? (
                    <ul className="space-y-2">
                      {lead.aiAnalysisData.brandingIssues.map((iss, idx) => (
                        <li key={idx} className="text-[11px] text-slate-400 flex items-start gap-2 leading-relaxed">
                          <span className="text-rose-500 text-xs shrink-0 font-bold mt-0.5">✕</span>
                          <span>{iss}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-emerald-400 italic font-mono flex items-center gap-1">
                      <span>✓</span> Corporate visual guidelines compliant
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB: PROPOSAL INTELLIGENCE ENGINE & REVIEW */}
        {/* ========================================== */}
        {activeTab === 'proposals' && (
          <ProposalPanel lead={lead} onUpdateLead={onUpdate} />
        )}

        {/* ========================================== */}
        {/* TAB 2: RICH MARKDOWN NOTES & HISTORY */}
        {/* ========================================== */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="font-bold text-slate-200 text-xs">Rich Markdown CRM Editor</h3>
                <p className="text-[10px] text-slate-500">Auto-saves changes locally to pipeline state immediately as you type.</p>
              </div>
              <div className="flex items-center gap-2">
                {isAutosaving && <span className="text-[10px] text-violet-400 font-mono animate-pulse">Debouncing Auto-save...</span>}
                <span className="text-[9px] bg-slate-900 text-slate-400 px-2 py-0.5 border border-slate-800 rounded font-mono">Markdown syntax active</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[400px]">
              {/* Raw Editor */}
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="# Initial Client Briefing&#10;&#10;Use standard markdown syntax like # headings, - lists, or --- rules.&#10;&#10;## Gaps Identified:&#10;- Outdated mobile site navigation menu&#10;- Slow page loading speeds on landing segments"
                className="w-full h-full bg-slate-950 border border-slate-850 focus:border-violet-600 rounded-xl p-4 text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none resize-none leading-relaxed"
              />

              {/* Styled Previewer */}
              <div className="w-full h-full bg-slate-900/30 border border-slate-850 rounded-xl p-4 overflow-y-auto">
                <span className="text-[9px] font-mono uppercase text-slate-500 block mb-2 tracking-widest">Live Document Preview</span>
                <SimpleMarkdownRenderer content={noteText} />
              </div>
            </div>

            {/* Note Revision history */}
            {lead.noteHistory && lead.noteHistory.length > 0 && (
              <div className="pt-4 border-t border-slate-900 space-y-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Historical Note revisions</span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {lead.noteHistory.map(hist => (
                    <div key={hist.id} className="bg-slate-950 border border-slate-850 rounded-lg p-2.5 flex items-center justify-between text-[11px]">
                      <div className="min-w-0 pr-4">
                        <p className="text-slate-400 truncate font-mono italic">{hist.content}</p>
                        <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">{new Date(hist.updatedAt).toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Restore notes to this historical snapshot version?')) {
                            setNoteText(hist.content);
                            onUpdate({ notes: hist.content });
                          }
                        }}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-violet-400 rounded text-[10px] font-bold border border-slate-800 shrink-0"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: FOLLOW-UP TASKS MANAGER */}
        {/* ========================================== */}
        {activeTab === 'reminders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-900">
              <div>
                <h3 className="font-bold text-slate-200 text-xs">CRM Reminder Schedule & Action tasks</h3>
                <p className="text-[10px] text-slate-500">Setup specific callback alarms, contract timelines, or pitch review dates.</p>
              </div>
              <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                {tasks.filter(t => !t.isCompleted).length} Alarms Pending
              </span>
            </div>

            {/* Task list container */}
            {tasks.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">No action reminders scheduled for this lead. Create one below!</p>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg border flex items-center justify-between gap-4 transition-all ${
                      task.isCompleted
                        ? 'bg-slate-950/40 border-slate-900 text-slate-500 line-through'
                        : 'bg-slate-950 border-slate-850 text-slate-200 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={task.isCompleted}
                        onChange={(e) => onToggleTask(task.id, e.target.checked)}
                        className="w-4 h-4 rounded border-slate-850 text-violet-600 bg-slate-900 focus:ring-violet-500 mt-0.5 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-xs leading-snug block">{task.title}</span>
                        <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">Due Date: {new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-900 transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Task form inline */}
            <form onSubmit={handleAddLocalTask} className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Add Follow-up Reminder Task</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Task title (e.g. Email PDF responsive mockups)"
                  value={localTaskTitle}
                  onChange={(e) => setLocalTaskTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                  required
                />
                <input
                  type="date"
                  value={localTaskDueDate}
                  onChange={(e) => setLocalTaskDueDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg text-xs shadow-md shadow-violet-600/10 transition-all"
              >
                Schedule Follow-up Task
              </button>
            </form>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 4: DOSSIER FILE MANAGER */}
        {/* ========================================== */}
        {activeTab === 'files' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-900">
              <div>
                <h3 className="font-bold text-slate-200 text-xs">Contract Documents & Visual Proposal Draft Mockups</h3>
                <p className="text-[10px] text-slate-500">Cloud-ready repository metadata tracker to save proposals or design assets.</p>
              </div>
              <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                {lead.attachments?.length || 0} Files Archived
              </span>
            </div>

            {/* Visual files uploader mockup */}
            <div className="border border-dashed border-slate-800 bg-slate-900/10 rounded-xl p-8 text-center space-y-2 cursor-pointer relative hover:border-violet-600/55 transition-colors">
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => onUploadAttachment(e.target.files)}
              />
              <Upload className="w-8 h-8 text-violet-400 mx-auto animate-pulse" />
              <div className="text-xs">
                <span className="font-bold text-slate-300">Drag and drop file here</span> or <span className="text-violet-400 underline font-semibold">browse local disk</span>
              </div>
              <p className="text-[9px] text-slate-500 italic">Supports client mockups, design specifications, or PDF contract sheets (Max 20MB)</p>
            </div>

            {/* Files list */}
            {lead.attachments && lead.attachments.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dossier File Archives</span>
                <div className="divide-y divide-slate-850 border border-slate-850 rounded-xl bg-slate-950 overflow-hidden">
                  {lead.attachments.map(file => (
                    <div key={file.id} className="p-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-slate-900 border border-slate-800 text-violet-400 rounded-lg">
                          <FileText className="w-4 h-4 shrink-0" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-200 block truncate leading-snug">{file.fileName}</span>
                          <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                            Size: {(file.fileSize / 1024).toFixed(1)} KB | Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => alert(`Mocking file download sequence for: ${file.fileName}`)}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-violet-400 rounded-md text-[10px] font-bold transition-all shrink-0"
                      >
                        Download Simulation
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 5: LEAD-SPECIFIC AUDIT TIMELINE */}
        {/* ========================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="pb-1 border-b border-slate-900">
              <h3 className="font-bold text-slate-200 text-xs">Lead Audit Activity Stream</h3>
              <p className="text-[10px] text-slate-500">Live, automated logging trail tracking pipeline edits, notes saving, and reminders.</p>
            </div>

            {/* Quick telemetry logs stream */}
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              <div className="relative pl-5 border-l border-slate-800 text-xs py-1">
                <div className="absolute -left-1 top-2.5 w-2 h-2 rounded-full bg-violet-500 shadow-sm shadow-violet-500/20"></div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[10px] text-violet-400 uppercase tracking-wide font-mono">updated_at</span>
                  <span className="text-[9px] text-slate-500 font-mono">{new Date(lead.updatedAt).toLocaleString()}</span>
                </div>
                <p className="text-slate-300 leading-tight">Prospect dossiers synchronized in database-store JSON schema.</p>
              </div>

              <div className="relative pl-5 border-l border-slate-800 text-xs py-1">
                <div className="absolute -left-1 top-2.5 w-2 h-2 rounded-full bg-violet-500 shadow-sm shadow-violet-500/20"></div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[10px] text-violet-400 uppercase tracking-wide font-mono">created_at</span>
                  <span className="text-[9px] text-slate-500 font-mono">{new Date(lead.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-slate-300 leading-tight">First CRM prospect registration entry created.</p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 4. FOOTER STATUS BAR */}
      <div className="p-4 border-t border-slate-900 bg-slate-900/20 text-[10px] text-slate-500 font-mono text-center tracking-wider">
        ACTIVE RECORD DOSSIER PROFILE: {lead.id}
      </div>
      
    </div>
  );
}

function AnalysisProgressStages() {
  const [stageIdx, setStageIdx] = useState(0);
  const stages = [
    { text: "Queued for audit pipeline...", pct: 10 },
    { text: "Crawling homepage HTML raw source...", pct: 30 },
    { text: "Cleaning markup & stripping trackers...", pct: 50 },
    { text: "Extracting SEO metadata & tags...", pct: 70 },
    { text: "Analyzing SWOT & gaps with Gemini AI...", pct: 90 },
    { text: "Saving final report to CRM dossier...", pct: 98 }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIdx(prev => (prev < stages.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const current = stages[stageIdx];

  return (
    <div className="space-y-3.5 bg-slate-900 border border-slate-850 p-5 rounded-2xl text-left max-w-sm mx-auto">
      <div className="flex justify-between items-center text-[10px] font-mono">
        <span className="text-violet-400 font-bold uppercase animate-pulse">{current.text}</span>
        <span className="text-slate-400 font-bold">{current.pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-950 border border-slate-850 rounded-full overflow-hidden font-mono">
        <div 
          className="h-full bg-violet-500 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${current.pct}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-500 text-center font-sans">Please do not close this overlay during processing</p>
    </div>
  );
}
