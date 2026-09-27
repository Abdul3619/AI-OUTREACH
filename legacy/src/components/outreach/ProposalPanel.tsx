import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api.ts';
import { Lead, OutreachMessage, ProposalVersion, ObjectionPrediction, MessageStatus } from '../../types.ts';
import {
  Sparkles, Check, X, ChevronDown, RefreshCw, FileText, Clipboard,
  Sliders, ThumbsUp, ThumbsDown, Archive, Copy, ExternalLink,
  MessageSquare, BarChart3, AlertCircle, RefreshCcw, HelpCircle
} from 'lucide-react';

interface ProposalPanelProps {
  lead: Lead;
  onUpdateLead: (updates: Partial<Lead>) => void;
}

export default function ProposalPanel({ lead, onUpdateLead }: ProposalPanelProps) {
  const queryClient = useQueryClient();
  const [selectedProposalType, setSelectedProposalType] = useState('website_redesign');
  const [selectedTone, setSelectedTone] = useState('professional');
  const [selectedLanguage, setSelectedLanguage] = useState(lead.languageCode || 'en');
  const [selectedChannel, setSelectedChannel] = useState('email');

  // Active reviewing state
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [subjectEdit, setSubjectEdit] = useState('');
  const [bodyEdit, setBodyEdit] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [showObjectionPanel, setShowObjectionPanel] = useState(true);
  const [showVersions, setShowVersions] = useState(false);

  // Fetch proposals for this lead
  const { data: proposals, isLoading: isProposalsLoading, refetch: refetchProposals } = useQuery({
    queryKey: ['leadProposals', lead.id],
    queryFn: () => apiService.getLeadProposals(lead.id),
    enabled: !!lead.id
  });

  // Fetch memory dashboard stats
  const { data: memoryData, refetch: refetchMemory } = useQuery({
    queryKey: ['proposalMemoryStats'],
    queryFn: () => apiService.getProposalMemory()
  });

  // Automatically select the first proposal if exists
  useEffect(() => {
    if (proposals && proposals.length > 0 && !selectedProposalId) {
      setSelectedProposalId(proposals[0].id);
      setSubjectEdit(proposals[0].subjectLine || '');
      setBodyEdit(proposals[0].bodyContent || '');
    }
  }, [proposals]);

  const activeProposal = proposals?.find(p => p.id === selectedProposalId);

  // Mutations
  const generateProposalMutation = useMutation({
    mutationFn: (opts: any) => apiService.generateProposal(lead.id, opts),
    onSuccess: (newProposal) => {
      queryClient.invalidateQueries({ queryKey: ['leadProposals', lead.id] });
      queryClient.invalidateQueries({ queryKey: ['leadDetails', lead.id] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      setSelectedProposalId(newProposal.id);
      setSubjectEdit(newProposal.subjectLine || '');
      setBodyEdit(newProposal.bodyContent || '');
      setIsEditing(false);
    }
  });

  const updateProposalMutation = useMutation({
    mutationFn: (updates: { id: string; subjectLine: string; bodyContent: string; author?: string }) =>
      apiService.updateProposal(updates.id, {
        subjectLine: updates.subjectLine,
        bodyContent: updates.bodyContent,
        author: updates.author
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['leadProposals', lead.id] });
      setSubjectEdit(updated.subjectLine || '');
      setBodyEdit(updated.bodyContent || '');
      setIsEditing(false);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: (opts: { id: string; status: string; feedback?: string }) =>
      apiService.updateProposalStatus(opts.id, opts.status, opts.feedback),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['leadProposals', lead.id] });
      queryClient.invalidateQueries({ queryKey: ['proposalMemoryStats'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setFeedbackText('');
    }
  });

  const restoreVersionMutation = useMutation({
    mutationFn: (opts: { id: string; versionNumber: number }) =>
      apiService.restoreProposalVersion(opts.id, opts.versionNumber),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['leadProposals', lead.id] });
      setSubjectEdit(updated.subjectLine || '');
      setBodyEdit(updated.bodyContent || '');
      setShowVersions(false);
    }
  });

  const handleGenerate = () => {
    generateProposalMutation.mutate({
      proposalType: selectedProposalType,
      tone: selectedTone,
      language: selectedLanguage,
      channel: selectedChannel
    });
  };

  const handleSaveEdit = () => {
    if (activeProposal) {
      updateProposalMutation.mutate({
        id: activeProposal.id,
        subjectLine: subjectEdit,
        bodyContent: bodyEdit,
        author: 'User Manager'
      });
    }
  };

  const handleStatusChange = (status: 'approved' | 'rejected' | 'archived') => {
    if (activeProposal) {
      updateStatusMutation.mutate({
        id: activeProposal.id,
        status,
        feedback: status === 'rejected' ? feedbackText : undefined
      });
    }
  };

  const handleCopyClipboard = () => {
    if (bodyEdit) {
      navigator.clipboard.writeText(bodyEdit);
      alert('Proposal copy copied to clipboard successfully!');
    }
  };

  const handleMailto = () => {
    if (activeProposal && lead.email) {
      const subject = encodeURIComponent(subjectEdit || '');
      const body = encodeURIComponent(bodyEdit || '');
      window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`);
    }
  };

  return (
    <div className="space-y-6 text-xs text-slate-300">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COMPONENT (COL 7): Dynamic Wizard and Proposal Editor */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Generation Setup Form */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-850">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <h3 className="font-bold text-slate-100 text-sm">Proposal Generation Companion</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Proposal Core Subject/Type</label>
                <select
                  value={selectedProposalType}
                  onChange={(e) => setSelectedProposalType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-violet-500"
                >
                  <option value="website_redesign">Website Redesign (UX/UI revamp)</option>
                  <option value="seo">SEO and Core Web Optimization</option>
                  <option value="ai_automation">AI Assistant & Chat Automation</option>
                  <option value="crm_implementation">Sales CRM Systems Implementation</option>
                  <option value="business_automation">Business Workflow Automations</option>
                  <option value="digital_transformation">Enterprise Digital Transformation</option>
                  <option value="custom_software">Bespoke Custom Software Development</option>
                  <option value="consulting">General Strategy Consulting</option>
                  <option value="general_introduction">Quick Introduction & Partnership</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Outreach Voice Tone</label>
                <select
                  value={selectedTone}
                  onChange={(e) => setSelectedTone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-violet-500"
                >
                  <option value="professional">Professional (Authoritative & Clean)</option>
                  <option value="friendly">Friendly & Warm (Local Partner feel)</option>
                  <option value="executive">Executive (High-level ROI & Outcomes)</option>
                  <option value="luxury">Luxury & Premium (Sophisticated design focus)</option>
                  <option value="technical">Technical (Data-driven, precise)</option>
                  <option value="creative">Creative (Bold, hook-focused)</option>
                  <option value="consultative">Consultative (Question & problem solving)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Target Localization Language</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-violet-500"
                >
                  <option value="en">English (US/UK Global Business)</option>
                  <option value="fr">French (Formel et Poli)</option>
                  <option value="es">Spanish (Bilingüe y Directo)</option>
                  <option value="de">German (Strikte Geschäftsetikette - Sie)</option>
                  <option value="ar">Arabic (عربي - Right to left native greetings)</option>
                  <option value="pt">Portuguese (Profissional e Claro)</option>
                  <option value="it">Italian (Formale ed Elegante)</option>
                  <option value="nl">Dutch (Direct en Professioneel)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Communication Channel Target</label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-violet-500"
                >
                  <option value="email">Formal Business Email</option>
                  <option value="linkedin">LinkedIn Direct Connect Draft</option>
                  <option value="whatsapp">WhatsApp Direct Outreach Script</option>
                  <option value="contact_form">Website Contact Form Message</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generateProposalMutation.isPending}
              className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-bold rounded-lg shadow-md hover:shadow-lg hover:shadow-violet-600/10 transition-all flex items-center justify-center gap-1.5"
            >
              {generateProposalMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Bespoke Pitch and self-healing QA check...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Draft Ultra-Personalized AI Pitch</span>
                </>
              )}
            </button>
          </div>

          {/* Active Proposal View / Editor */}
          {activeProposal ? (
            <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-violet-400" />
                  <span className="font-extrabold text-slate-200">Outreach Pitch Draft</span>
                  <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-[9px] font-mono font-bold text-violet-400">
                    Version {activeProposal.version || 1}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                    activeProposal.status === MessageStatus.APPROVED ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' :
                    activeProposal.status === MessageStatus.REJECTED ? 'bg-rose-950/40 text-rose-400 border border-rose-900/40' :
                    'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}>
                    {activeProposal.status}
                  </span>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => setShowVersions(!showVersions)}
                    className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[10px] font-bold hover:border-slate-700 flex items-center gap-1 text-slate-400"
                  >
                    <RefreshCcw className="w-3 h-3" />
                    <span>Restore Version</span>
                  </button>
                  {isEditing ? (
                    <button
                      onClick={handleSaveEdit}
                      disabled={updateProposalMutation.isPending}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px]"
                    >
                      Save Version
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSubjectEdit(activeProposal.subjectLine || '');
                        setBodyEdit(activeProposal.bodyContent || '');
                        setIsEditing(true);
                      }}
                      className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:border-slate-700 font-bold rounded text-[10px] text-slate-400"
                    >
                      Edit Copy
                    </button>
                  )}
                </div>
              </div>

              {/* Version Restoration Dropdown overlay */}
              {showVersions && activeProposal.versions && (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 block pb-1 border-b border-slate-900">Restore Previous Snapshot</span>
                  {activeProposal.versions.map((v: ProposalVersion) => (
                    <div key={v.versionNumber} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-900/50">
                      <div>
                        <span className="font-bold text-violet-400">Version {v.versionNumber}</span>
                        <span className="text-slate-500 font-mono ml-2">by {v.author} on {new Date(v.createdAt).toLocaleDateString()}</span>
                      </div>
                      <button
                        onClick={() => restoreVersionMutation.mutate({ id: activeProposal.id, versionNumber: v.versionNumber })}
                        className="text-[10px] text-violet-400 hover:underline"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Subject block */}
              {activeProposal.channel === 'email' && (
                <div>
                  <label className="block text-slate-500 font-mono text-[10px] mb-1 uppercase">Email Subject Line</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={subjectEdit}
                      onChange={(e) => setSubjectEdit(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                    />
                  ) : (
                    <div className="bg-slate-950/60 border border-slate-850 px-3 py-2 rounded-lg font-bold text-slate-200">
                      {activeProposal.subjectLine}
                    </div>
                  )}
                </div>
              )}

              {/* Body Content Editor */}
              <div>
                <label className="block text-slate-500 font-mono text-[10px] mb-1 uppercase">Proposal Copy Editor</label>
                {isEditing ? (
                  <textarea
                    rows={12}
                    value={bodyEdit}
                    onChange={(e) => setBodyEdit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-violet-500 leading-relaxed"
                  />
                ) : (
                  <div className="bg-slate-950/60 border border-slate-850 p-4.5 rounded-lg whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-300 max-h-[380px] overflow-y-auto">
                    {activeProposal.bodyContent}
                  </div>
                )}
              </div>

              {/* Human-in-the-Loop Operations bar */}
              <div className="pt-3 border-t border-slate-850 flex flex-wrap gap-2.5 justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyClipboard}
                    className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 rounded-lg font-bold flex items-center gap-1.5"
                  >
                    <Clipboard className="w-3.5 h-3.5 text-violet-400" />
                    <span>Copy Draft</span>
                  </button>
                  {activeProposal.channel === 'email' && lead.email && (
                    <button
                      onClick={handleMailto}
                      className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 rounded-lg font-bold flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
                      <span>Send Direct (Mailto)</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusChange('approved')}
                    className="px-4 py-1.5 bg-emerald-950/50 border border-emerald-900/50 hover:bg-emerald-900/50 text-emerald-400 rounded-lg font-bold flex items-center gap-1"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Approve Draft</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange('rejected')}
                    className="px-4 py-1.5 bg-rose-950/50 border border-rose-900/50 hover:bg-rose-900/50 text-rose-400 rounded-lg font-bold flex items-center gap-1"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    <span>Reject Draft</span>
                  </button>
                </div>
              </div>

              {/* Objection Feedback input box if rejected */}
              {activeProposal.status === MessageStatus.REJECTED && (
                <div className="bg-rose-950/10 border border-rose-950/40 p-3 rounded-lg space-y-2">
                  <span className="text-[10px] font-bold text-rose-400 block">Provide Refinement Feedback (Memory Learning)</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Too pushy about the pricing, make it more friendly..."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      className="flex-1 bg-slate-950 border border-rose-900/40 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
                    />
                    <button
                      onClick={() => handleStatusChange('rejected')}
                      className="px-3 bg-rose-900 hover:bg-rose-800 text-white rounded-lg text-[10px] font-bold"
                    >
                      Submit Feedback
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/25 border border-dashed border-slate-850 rounded-xl p-10 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-slate-700 mx-auto" />
              <h4 className="font-bold text-slate-300">No pitch drafted for this prospect yet</h4>
              <p className="text-slate-500 max-w-sm mx-auto text-[11px]">
                Adjust the criteria above and click the draft button to let the multi-agent generator create an ultra-personalized copy.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT COMPONENT (COL 5): Quality indicators, Objection predictor, Case studies */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* 1. QA Metrics Indicators */}
          {activeProposal && (
            <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-850">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-violet-400" />
                  <h3 className="font-bold text-slate-100 text-xs">Proposal Quality Metrics</h3>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  (activeProposal.detailedQualityMetrics?.overallScore || 80) > 80 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' : 'bg-amber-950/40 text-amber-400'
                }`}>
                  Score: {activeProposal.detailedQualityMetrics?.overallScore || 80}/100
                </span>
              </div>

              {/* Progress Gauges */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Personalization Level</span>
                    <span className="text-violet-400 font-bold">{activeProposal.detailedQualityMetrics?.personalization || 80}%</span>
                  </div>
                  <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500" style={{ width: `${activeProposal.detailedQualityMetrics?.personalization || 80}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Professionalism Tone</span>
                    <span className="text-violet-400 font-bold">{activeProposal.detailedQualityMetrics?.professionalism || 85}%</span>
                  </div>
                  <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500" style={{ width: `${activeProposal.detailedQualityMetrics?.professionalism || 85}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Readability Flow</span>
                    <span className="text-violet-400 font-bold">{activeProposal.detailedQualityMetrics?.readability || 80}%</span>
                  </div>
                  <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500" style={{ width: `${activeProposal.detailedQualityMetrics?.readability || 80}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Spam Risk Meter</span>
                    <span className={`font-bold ${(activeProposal.detailedQualityMetrics?.spamScore || 10) < 30 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {activeProposal.detailedQualityMetrics?.spamScore || 10}%
                    </span>
                  </div>
                  <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                    <div className={`h-full ${
                      (activeProposal.detailedQualityMetrics?.spamScore || 10) < 30 ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} style={{ width: `${activeProposal.detailedQualityMetrics?.spamScore || 10}%` }}></div>
                  </div>
                  <span className="text-[8px] text-slate-500 italic">Self-healed & kept below 30% spam barrier</span>
                </div>
              </div>

              {/* Localization / Tone Details */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-850/50">
                <div className="bg-slate-950/50 p-2 border border-slate-850 rounded-lg">
                  <span className="text-[9px] text-slate-500 block">Localization Quality</span>
                  <span className="font-extrabold text-slate-300 font-mono text-[10px]">
                    {activeProposal.detailedQualityMetrics?.localizationQuality || 85}% Accuracy
                  </span>
                </div>
                <div className="bg-slate-950/50 p-2 border border-slate-850 rounded-lg">
                  <span className="text-[9px] text-slate-500 block">Matched Tone Profile</span>
                  <span className="font-extrabold text-violet-400 font-mono text-[10px] capitalize">
                    {activeProposal.tone || 'Professional'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Objection Predictor Panel */}
          {activeProposal && showObjectionPanel && activeProposal.objections && (
            <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-850">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-slate-100 text-xs">Internal Objection Predictor</h3>
                </div>
                <span className="text-[8px] bg-amber-950/40 border border-amber-900/30 text-amber-400 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                  Internal Only
                </span>
              </div>

              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {activeProposal.objections.map((obj: ObjectionPrediction, index: number) => (
                  <div key={index} className="bg-slate-950/50 border border-slate-850 rounded-lg p-2.5 space-y-1.5">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                      <span className="font-bold text-slate-200 text-[11px]">Concern: {obj.concern}</span>
                    </div>
                    <p className="text-slate-400 leading-normal text-[10px]">{obj.explanation}</p>
                    <div className="bg-slate-900 border-l-2 border-violet-500 p-2 text-slate-300 italic text-[10px]">
                      <strong className="block text-violet-400 not-italic text-[9px] uppercase tracking-wider mb-0.5">Recommended Counter-strategy:</strong>
                      "{obj.suggestedResponse}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Portfolio Case Studies Matcher */}
          {activeProposal && activeProposal.portfolioMatches && activeProposal.portfolioMatches.length > 0 && (
            <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 shadow-sm space-y-4.5">
              <div className="pb-1 border-b border-slate-850">
                <h3 className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-violet-400" />
                  <span>Matched Case Studies & Portfolio</span>
                </h3>
              </div>

              <div className="space-y-2.5">
                {activeProposal.portfolioMatches.map((proj, idx) => (
                  <div key={idx} className="bg-slate-950/50 border border-slate-850 rounded-lg p-3 flex justify-between gap-3">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-200 block text-[11px]">{proj.title}</span>
                      <p className="text-slate-400 text-[10px] leading-normal">{proj.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-emerald-400 font-mono block">{proj.relevance}%</span>
                      <span className="text-[8px] text-slate-500 block uppercase font-mono mt-0.5">Match</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM COMPONENT: Long-term Preference Registry & Outreach Memory */}
      {memoryData && (
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
            <BarChart3 className="w-4.5 h-4.5 text-violet-400" />
            <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wider">Outreach Performance Registry (Long-term CRM Memory)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 text-center">
              <span className="text-slate-500 text-[10px] uppercase font-mono block">Average Pitch Score</span>
              <span className="text-2xl font-black text-violet-400 block mt-1">{memoryData.avgScore || 80}/100</span>
              <span className="text-[9px] text-slate-500 mt-1 block">Across all drafted proposals</span>
            </div>

            <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 text-center">
              <span className="text-slate-500 text-[10px] uppercase font-mono block">Approved Pitches</span>
              <span className="text-2xl font-black text-emerald-400 block mt-1">{memoryData.approvedCount || 0}</span>
              <span className="text-[9px] text-slate-500 mt-1 block">Locked to client preferences</span>
            </div>

            <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 text-center">
              <span className="text-slate-500 text-[10px] uppercase font-mono block">Objection Feedback Loops</span>
              <span className="text-2xl font-black text-rose-400 block mt-1">{memoryData.rejectedCount || 0}</span>
              <span className="text-[9px] text-slate-500 mt-1 block">Rejections driving learning</span>
            </div>

            <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 text-center">
              <span className="text-slate-500 text-[10px] uppercase font-mono block">Historical Pitches logged</span>
              <span className="text-2xl font-black text-slate-300 block mt-1">{memoryData.totalCount || 0}</span>
              <span className="text-[9px] text-slate-500 mt-1 block">Total outbound pitches indexed</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3">
            {/* Highly successful openings */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">High-Converting Pitch Openings</span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {memoryData.successfulOpenings?.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No approved opening templates in registry yet.</p>
                ) : (
                  memoryData.successfulOpenings?.map((op: any, i: number) => (
                    <div key={i} className="bg-slate-950 border border-slate-850 rounded-lg p-2.5 space-y-1">
                      <p className="text-[11px] leading-relaxed italic text-slate-300 font-mono">"{op.text}..."</p>
                      <span className="text-[9px] text-violet-400 font-mono block">
                        Category: {op.type.toUpperCase()} | Industry Target: {op.industry}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Frequently Reused Sections */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reused Solution Modules</span>
              <div className="space-y-2">
                {memoryData.frequentlyReusedSections?.map((section: string, index: number) => (
                  <div key={index} className="bg-slate-950/50 border border-slate-850 px-3.5 py-2.5 rounded-lg flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full shrink-0"></span>
                    <span className="text-[11px] text-slate-300">{section}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
