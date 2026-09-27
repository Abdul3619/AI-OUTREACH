import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api.ts';
import { Lead, OutreachMessage, PluginDefinition, InboxMessage, AppNotification, LeadStatus } from '../../types.ts';
import { 
  Users, Bot, Clipboard, Mail, Phone, Calendar, CheckSquare, Layers, 
  Sparkles, RefreshCw, AlertTriangle, ArrowRight, CheckCircle2, 
  Send, HelpCircle, Clock, Check, Inbox, MessageSquare, Play, PlayCircle, ToggleLeft, ToggleRight, Settings, Smartphone, Facebook, Linkedin
} from 'lucide-react';

export default function OutreachWorkspace() {
  const queryClient = useQueryClient();
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [activeChannel, setActiveChannel] = useState<'email' | 'linkedin' | 'whatsapp' | 'facebook' | 'contact_form'>('email');
  
  // Follow-up / Scheduling Dialog Form State
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Simulator inputs
  const [simulateBody, setSimulateBody] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);

  // Fetch all leads
  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => apiService.getLeads('default-workspace-456')
  });

  // Automatically select first lead if none selected
  useEffect(() => {
    if (leads.length > 0 && !selectedLeadId) {
      setSelectedLeadId(leads[0].id);
    }
  }, [leads, selectedLeadId]);

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  // Fetch proposals for selected lead
  const { data: proposals = [], isLoading: proposalsLoading } = useQuery<OutreachMessage[]>({
    queryKey: ['lead-proposals', selectedLeadId],
    queryFn: () => apiService.getLeadProposals(selectedLeadId),
    enabled: !!selectedLeadId
  });

  // Fetch active plugins
  const { data: plugins = [], isLoading: pluginsLoading } = useQuery<PluginDefinition[]>({
    queryKey: ['plugins'],
    queryFn: () => apiService.getPluginDefinitions()
  });

  // Fetch mock inbox messages
  const { data: inboxMessages = [], isLoading: inboxLoading } = useQuery<InboxMessage[]>({
    queryKey: ['inbox'],
    queryFn: () => apiService.getInboxMessages()
  });

  // active proposals
  const activeProposal = proposals.find(p => p.channel === activeChannel) || proposals[0];

  // Proposal Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      apiService.updateProposalStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-proposals', selectedLeadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSuccessMessage('Outreach status updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  });

  // Toggle Plugin Mutation
  const togglePluginMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => 
      apiService.updatePluginConfig(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    }
  });

  // Simulate Incoming Message Mutation
  const simulateMsgMutation = useMutation({
    mutationFn: (data: { leadId: string; sender?: string; subject?: string; body?: string }) => 
      apiService.simulateIncomingMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsSimulating(false);
      setSimulateBody('');
      setSuccessMessage('Successfully simulated buyer reply! Alert triggered.');
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  });

  // Update lead status directly (when moving stage manually)
  const updateLeadStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) => 
      apiService.updateLead(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });

  const handleCopyClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage('Copied to clipboard!');
    setTimeout(() => setSuccessMessage(''), 2000);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProposal || !scheduleDate) return;

    // Simulate scheduling outreach
    updateStatusMutation.mutate({
      id: activeProposal.id,
      status: 'scheduled'
    });

    // Also update lead's next follow up date
    apiService.updateLead(selectedLeadId, {
      nextFollowUpDate: `${scheduleDate}T${scheduleTime || '09:00'}:00`
    });

    setIsScheduling(false);
  };

  const handleSimulateReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId) return;

    simulateMsgMutation.mutate({
      leadId: selectedLeadId,
      sender: selectedLead?.email ? `${selectedLead.contactName || 'Buyer'} <${selectedLead.email}>` : undefined,
      body: simulateBody || undefined
    });
  };

  // Build Outreach Timeline events based on real-time fields
  const getTimelineEvents = (lead: Lead, msg?: OutreachMessage) => {
    const events: { title: string; desc: string; date: string; status: 'completed' | 'pending' }[] = [
      {
        title: 'Lead Created',
        desc: `Prospect entered pipeline from source: ${lead.leadSource || 'Manual Import'}`,
        date: lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'N/A',
        status: 'completed'
      }
    ];

    if (lead.scoreSeo > 0 || lead.opportunityScore > 0) {
      events.push({
        title: 'Website Intelligence Crawl',
        desc: `SEO Health: ${lead.scoreSeo}%, Opportunity: ${lead.opportunityScore}% (${lead.opportunityPriority})`,
        date: lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : 'N/A',
        status: 'completed'
      });
    }

    if (msg) {
      events.push({
        title: 'Proposal AI Generated',
        desc: `Agent 4 (Proposal) drafted personal ${msg.channel} template [Score: ${msg.detailedQualityMetrics?.overallScore || 80}%]`,
        date: msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : 'N/A',
        status: 'completed'
      });

      if (msg.status === 'approved' || msg.status === 'ready' || msg.status === 'scheduled' || msg.status === 'sent') {
        events.push({
          title: 'Proposal Approved',
          desc: 'Human audit completed. Content locked and cleared for outreach companion.',
          date: msg.updatedAt ? new Date(msg.updatedAt).toLocaleDateString() : 'N/A',
          status: 'completed'
        });
      }

      if (msg.status === 'scheduled') {
        events.push({
          title: 'Outreach Scheduled',
          desc: `Set to dispatch follow-up reminder on ${lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString() : 'N/A'}`,
          date: msg.updatedAt ? new Date(msg.updatedAt).toLocaleDateString() : 'N/A',
          status: 'completed'
        });
      }

      if (msg.status === 'sent' || msg.status === 'replied') {
        events.push({
          title: 'Message Sent / Logged',
          desc: `Pitch verified and dispatched manually via ${msg.channel} channel companion.`,
          date: msg.updatedAt ? new Date(msg.updatedAt).toLocaleDateString() : 'N/A',
          status: 'completed'
        });
      }
    }

    if ((lead.status as string) === 'replied' || (lead.status as string) === 'replied_received') {
      events.push({
        title: 'Reply Message Received',
        desc: 'Simulated incoming buyer reply synched. Response recorded in CRM workspace inbox.',
        date: new Date().toLocaleDateString(),
        status: 'completed'
      });
    }

    return events;
  };

  // Get follow-up recommendation scripts based on Opportunity Score & Status
  const getFollowUpRecommendation = (lead?: Lead) => {
    if (!lead) return null;
    
    if (lead.status === LeadStatus.DISCOVERED) {
      return {
        label: 'Perform Crawler SEO Audit',
        script: 'Review the lead profile details, select "Generate Proposal", and trigger the server-side Cheerio scraping engine.',
        actionText: 'Run AI Crawl Audit',
        action: () => alert('Please trigger the audit in the Lead Detail panel inside CRM Pipeline!')
      };
    }

    if (lead.status === LeadStatus.QUALIFIED || lead.status === LeadStatus.RESEARCHING) {
      return {
        label: 'Initiate Personalized Pitch Draft',
        script: 'Select a delivery channel (Email or WhatsApp) and trigger Agent 4 to outline SWOT solutions matching this lead.',
        actionText: 'Generate AI Proposal',
        action: () => alert('Please use the "Generate Proposal" panel to draft a personalized copy.')
      };
    }

    if ((lead.status as string) === 'replied' || (lead.status as string) === 'replied_received') {
      return {
        label: 'Aesthetic Schedule Video Call',
        script: 'Send a calendar booking link. Reference their query, answer their specific CMS integration timeline, and suggest a 15-minute screen share.',
        actionText: 'Copy Calendar Link',
        action: () => handleCopyClipboard('Hi Dr. Sarah, here is my direct calendar to secure our quick call: https://calendly.com/alphatech/intro')
      };
    }

    return {
      label: 'Wait 3 Days & Follow Up',
      script: 'Our recommendation engine suggests a brief reminder nudge: "Hi, just checking in to see if you had a chance to look over the custom mockup I prepared for your mobile site?"',
      actionText: 'Copy Follow-up Script',
      action: () => handleCopyClipboard('Hi, just checking in to see if you had a chance to look over the custom mockup I prepared for your website layout?')
    };
  };

  const currentRecommendation = getFollowUpRecommendation(selectedLead);

  if (leadsLoading || pluginsLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-violet-500 mb-2" />
        <span className="text-xs font-mono">Loading Outreach command console...</span>
      </div>
    );
  }

  // Generate mailto: link
  const mailtoLink = activeProposal && selectedLead
    ? `mailto:${selectedLead.email || ''}?subject=${encodeURIComponent(activeProposal.subjectLine || '')}&body=${encodeURIComponent(activeProposal.bodyContent || '')}`
    : '#';

  // Generate WhatsApp web link
  const whatsappLink = activeProposal && selectedLead
    ? `https://web.whatsapp.com/send?phone=${encodeURIComponent(selectedLead.phone || '')}&text=${encodeURIComponent(activeProposal.bodyContent || '')}`
    : '#';

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Success Notification Toast */}
      {successMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-950 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-xl flex items-center gap-2 shadow-2xl animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Bot className="w-6 h-6 text-violet-500 animate-pulse" />
            Outreach Workspace
          </h1>
          <p className="text-xs text-slate-400">
            Human-in-the-Loop dispatch companion. Edit, approve, manually jump to delivery paths, and track follow-up recommenders.
          </p>
        </div>

        {/* Lead Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Active Prospect:</span>
          <select
            value={selectedLeadId}
            onChange={(e) => setSelectedLeadId(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:border-violet-600 transition-colors"
          >
            {leads.map(l => (
              <option key={l.id} value={l.id}>{l.businessName} ({l.opportunityPriority || 'Medium'})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ========================================== */}
        {/* LEFT COLUMN: ACTIVE DRAFT EDITOR & COMPANION */}
        {/* ========================================== */}
        <div className="lg:col-span-2 space-y-6">
          {selectedLead ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
              {/* Channel Tabs */}
              <div className="flex border-b border-slate-800 bg-slate-950/40">
                {[
                  { id: 'email', label: 'Email Outbound', icon: Mail },
                  { id: 'linkedin', label: 'LinkedIn Sales', icon: Linkedin },
                  { id: 'whatsapp', label: 'WhatsApp direct', icon: Smartphone },
                  { id: 'facebook', label: 'FB Messenger', icon: Facebook },
                  { id: 'contact_form', label: 'Contact Web Form', icon: MessageSquare }
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveChannel(tab.id as any)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                        activeChannel === tab.id 
                          ? 'border-violet-600 text-violet-400 bg-violet-600/5' 
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Proposal Content & Human Approval Flow */}
              <div className="p-6 space-y-6">
                {activeProposal ? (
                  <div className="space-y-6">
                    {/* Quality Indicators Header */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-mono">
                      <div className="flex gap-4">
                        <span>Personalization: <strong className="text-violet-400">{activeProposal.detailedQualityMetrics?.personalization || 80}%</strong></span>
                        <span>Spam Risk: <strong className="text-emerald-400">{activeProposal.detailedQualityMetrics?.spamScore || 10}%</strong></span>
                        <span>Natural Tone: <strong className="text-sky-400">{activeProposal.detailedQualityMetrics?.overallScore || 85}%</strong></span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        activeProposal.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                        activeProposal.status === 'scheduled' ? 'bg-amber-500/10 text-amber-400 font-semibold animate-pulse' :
                        activeProposal.status === 'ready' ? 'bg-sky-500/10 text-sky-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        Status: {activeProposal.status}
                      </span>
                    </div>

                    {/* Subject Line (if email) */}
                    {activeProposal.subjectLine && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Outreach Subject Line</span>
                        <div className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs font-medium text-slate-200">
                          {activeProposal.subjectLine}
                        </div>
                      </div>
                    )}

                    {/* Pitch Draft Body */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Personalized Proposal Copy</span>
                        <span className="text-[10px] text-slate-500 font-mono">AI Model: gemini-2.5-pro</span>
                      </div>
                      <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg text-xs leading-relaxed text-slate-300 font-serif min-h-[160px] whitespace-pre-wrap">
                        {activeProposal.bodyContent}
                      </div>
                    </div>

                    {/* Strict Human Review Dials */}
                    <div className="pt-4 border-t border-slate-800 space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div>
                          <h4 className="text-xs font-bold text-slate-300">Human Approval Control</h4>
                          <p className="text-[10px] text-slate-500">Lock generated material and confirm dispatch path compliance.</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {activeProposal.status !== 'approved' && activeProposal.status !== 'scheduled' && activeProposal.status !== 'sent' && (
                            <button
                              onClick={() => updateStatusMutation.mutate({ id: activeProposal.id, status: 'approved' })}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[10px] flex items-center gap-1.5 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve Draft
                            </button>
                          )}
                          
                          {activeProposal.status === 'approved' && (
                            <>
                              <button
                                onClick={() => setIsScheduling(true)}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-[10px] flex items-center gap-1.5 transition-colors"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                Schedule Follow-up
                              </button>

                              <button
                                onClick={() => updateStatusMutation.mutate({ id: activeProposal.id, status: 'ready' })}
                                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg text-[10px] flex items-center gap-1.5 transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Mark Ready
                              </button>
                            </>
                          )}

                          {(activeProposal.status === 'approved' || activeProposal.status === 'ready' || activeProposal.status === 'scheduled') && (
                            <button
                              onClick={() => {
                                updateStatusMutation.mutate({ id: activeProposal.id, status: 'sent' });
                                // also update lead status
                                updateLeadStatusMutation.mutate({ id: selectedLeadId, status: 'contacted' });
                              }}
                              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg text-[10px] flex items-center gap-1.5 transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Mark Sent
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Scheduling Form Block */}
                      {isScheduling && (
                        <form onSubmit={handleScheduleSubmit} className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg space-y-3 animate-fade-in">
                          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configure Reminder Dispatches</h5>
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="date"
                              required
                              value={scheduleDate}
                              onChange={(e) => setScheduleDate(e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-violet-600"
                            />
                            <input
                              type="time"
                              required
                              value={scheduleTime}
                              onChange={(e) => setScheduleTime(e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-violet-600"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setIsScheduling(false)}
                              className="px-2 py-1 rounded border border-slate-800 hover:bg-slate-850 text-[10px] text-slate-400"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-semibold rounded-lg"
                            >
                              Schedule
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Manual Action Jump Boxes */}
                      <div className="space-y-2 pt-4 border-t border-slate-800/60">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Direct Companion Delivery Links</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <button
                            onClick={() => handleCopyClipboard(activeProposal.bodyContent)}
                            className="flex items-center justify-center gap-1.5 p-2 bg-slate-950 border border-slate-850 hover:bg-slate-850 rounded-lg text-[10px] text-slate-300 font-semibold transition-all"
                          >
                            <Clipboard className="w-3.5 h-3.5" />
                            Copy Copy
                          </button>

                          {activeChannel === 'email' && (
                            <a
                              href={mailtoLink}
                              onClick={() => {
                                updateStatusMutation.mutate({ id: activeProposal.id, status: 'sent' });
                                updateLeadStatusMutation.mutate({ id: selectedLeadId, status: 'contacted' });
                              }}
                              className="flex items-center justify-center gap-1.5 p-2 bg-slate-950 border border-slate-850 hover:bg-slate-850 rounded-lg text-[10px] text-slate-300 font-semibold transition-all"
                            >
                              <Mail className="w-3.5 h-3.5 text-sky-400" />
                              Launch Mailto
                            </a>
                          )}

                          {activeChannel === 'whatsapp' && (
                            <a
                              href={whatsappLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => {
                                updateStatusMutation.mutate({ id: activeProposal.id, status: 'sent' });
                                updateLeadStatusMutation.mutate({ id: selectedLeadId, status: 'contacted' });
                              }}
                              className="flex items-center justify-center gap-1.5 p-2 bg-slate-950 border border-slate-850 hover:bg-slate-850 rounded-lg text-[10px] text-slate-300 font-semibold transition-all"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-400" />
                              WhatsApp Web
                            </a>
                          )}

                          {selectedLead.linkedinUrl && (
                            <a
                              href={selectedLead.linkedinUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-center gap-1.5 p-2 bg-slate-950 border border-slate-850 hover:bg-slate-850 rounded-lg text-[10px] text-slate-300 font-semibold transition-all"
                            >
                              <Linkedin className="w-3.5 h-3.5 text-blue-400" />
                              LinkedIn DM
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center space-y-3 text-slate-500">
                    <Sparkles className="w-8 h-8 text-slate-600 animate-spin" />
                    <p className="text-xs font-semibold">No active pitch proposal found for {selectedLead.businessName} on this channel.</p>
                    <p className="text-[10px] text-slate-500 max-w-sm">Use the "Generate Proposal" trigger inside the CRM Pipeline view to build tailored outreach templates matching their weakness factors.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/50 p-12">
              <Users className="w-10 h-10 text-slate-700 animate-bounce" />
              <h3 className="text-sm font-semibold mt-2">No qualified leads available</h3>
              <p className="text-xs text-slate-500">Discovered leads must be audited first to qualify for active outreach work.</p>
            </div>
          )}

          {/* ========================================== */}
          {/* MIDDLE BLOCK: SIMULATED INBOX PREPARATION */}
          {/* ========================================== */}
          {selectedLead && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-violet-500" />
                  CRM Workspace Inbox (Simulated Sync)
                </h3>
                <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest animate-pulse">● Ready for Sync</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Simulator Triggers */}
                <div className="md:col-span-1 space-y-3 bg-slate-950/40 p-4 border border-slate-850 rounded-xl flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Buyer Reply Simulator</span>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Press play to simulate receiving an incoming reply from <strong>{selectedLead.businessName}</strong>. 
                    </p>
                  </div>

                  <form onSubmit={handleSimulateReply} className="space-y-3 pt-3 border-t border-slate-850">
                    <textarea
                      placeholder="Insert customized client reply message..."
                      value={simulateBody}
                      onChange={(e) => setSimulateBody(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-violet-600 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 outline-none resize-none"
                    />
                    <button
                      type="submit"
                      disabled={simulateMsgMutation.isPending}
                      className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      Simulate Reply
                    </button>
                  </form>
                </div>

                {/* Simulated Emails Thread List */}
                <div className="md:col-span-2 space-y-2 max-h-56 overflow-y-auto pr-1">
                  {inboxMessages.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic py-6 text-center">Inbox is empty. Pitch a lead and simulate a reply!</p>
                  ) : (
                    inboxMessages.map(msg => (
                      <div key={msg.id} className="p-3 bg-slate-950/60 border border-slate-850 rounded-lg text-xs space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-slate-200 block truncate">{msg.sender}</span>
                          <span className="text-[9px] text-slate-500 font-mono">{new Date(msg.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 block">{msg.subject}</span>
                        <p className="text-[10px] text-slate-400 leading-relaxed pt-1 border-t border-slate-900 italic font-sans">
                          "{msg.body}"
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* RIGHT COLUMN: OUTREACH TIMELINE & INTEGRATIONS */}
        {/* ========================================== */}
        <div className="space-y-6">
          {/* Active Connectors/Plugins Panel */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Active Connectors
              <Settings className="w-3.5 h-3.5 text-slate-500" />
            </h3>
            <div className="space-y-3">
              {plugins.slice(0, 4).map(plugin => (
                <div key={plugin.id} className="flex items-center justify-between p-2.5 bg-slate-950/50 border border-slate-850 rounded-lg text-xs">
                  <div>
                    <span className="font-semibold text-slate-200 block">{plugin.provider}</span>
                    <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">{plugin.name}</span>
                  </div>
                  <button
                    onClick={() => togglePluginMutation.mutate({ id: plugin.id, enabled: !plugin.enabled })}
                    className="p-1"
                    title={plugin.enabled ? 'Disable Plugin' : 'Enable Plugin'}
                  >
                    {plugin.enabled ? (
                      <ToggleRight className="w-8 h-8 text-violet-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Follow-Up Recommendation Recommender */}
          {selectedLead && currentRecommendation && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-1 text-[10px] font-bold text-violet-400 uppercase tracking-widest font-mono">
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                Recommendation Engine
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200">{currentRecommendation.label}</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">{currentRecommendation.script}</p>
              </div>
              <button
                onClick={currentRecommendation.action}
                className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-[10px] font-bold transition-all"
              >
                {currentRecommendation.actionText}
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Outreach Timeline Component */}
          {selectedLead && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-violet-500" />
                Outreach History Timeline
              </h3>
              <div className="relative border-l border-slate-800 pl-4 space-y-5 ml-1.5 py-1">
                {getTimelineEvents(selectedLead, activeProposal).map((evt, i) => (
                  <div key={i} className="relative text-xs">
                    {/* Event Dot */}
                    <span className="absolute -left-[21.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-violet-500 ring-4 ring-slate-900" />
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-200 block leading-tight">{evt.title}</span>
                      <span className="text-[9px] text-slate-500 font-mono">{evt.date}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug mt-0.5">{evt.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
