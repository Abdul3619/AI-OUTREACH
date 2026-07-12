import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api.ts';
import { Campaign, Lead } from '../../types.ts';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend
} from 'recharts';
import { 
  Users, Bot, Plus, Trash2, Calendar, Target, Settings, Globe, Briefcase, 
  TrendingUp, RefreshCw, Layers, CheckCircle2, DollarSign, MessageSquare, Flame, X
} from 'lucide-react';

export default function CampaignManager() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  
  // Create Campaign Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [country, setCountry] = useState('USA');
  const [language, setLanguage] = useState('en');
  const [goal, setGoal] = useState('');

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: () => apiService.getCampaigns()
  });

  // Fetch leads to support campaign assignments
  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => apiService.getLeads('default-workspace-456')
  });

  // Create Campaign Mutation
  const createCampaignMutation = useMutation({
    mutationFn: (newCampaign: Partial<Campaign>) => apiService.createCampaign(newCampaign),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setIsCreateOpen(false);
      setName('');
      setDescription('');
      setTargetIndustry('');
      setGoal('');
    }
  });

  // Update Campaign Status Mutation
  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Campaign> }) => 
      apiService.updateCampaign(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    }
  });

  // Delete Campaign Mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      if (selectedCampaign?.id === selectedCampaign?.id) {
        setSelectedCampaign(null);
      }
    }
  });

  // Assign/Unassign Lead Mutations
  const addLeadMutation = useMutation({
    mutationFn: ({ campaignId, leadId }: { campaignId: string; leadId: string }) => 
      apiService.addLeadToCampaign(campaignId, leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });

  const removeLeadMutation = useMutation({
    mutationFn: ({ campaignId, leadId }: { campaignId: string; leadId: string }) => 
      apiService.removeLeadFromCampaign(campaignId, leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createCampaignMutation.mutate({
      name,
      description,
      targetIndustry,
      country,
      language,
      status: 'draft',
      goal,
      leads: []
    });
  };

  const handleStatusChange = (campaign: Campaign, newStatus: Campaign['status']) => {
    updateCampaignMutation.mutate({
      id: campaign.id,
      updates: { status: newStatus }
    });
  };

  // Filter leads not assigned to current campaign
  const availableLeads = leads.filter(l => !selectedCampaign?.leads.includes(l.id));

  // Mock campaign analytics chart data
  const chartData = campaigns.map(c => ({
    name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
    Outbox: c.successMetrics.sent,
    Replies: c.successMetrics.replies,
    Conversions: c.successMetrics.conversions,
    Revenue: c.successMetrics.revenue
  }));

  if (campaignsLoading || leadsLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-violet-500 mb-2" />
        <span className="text-xs font-mono">Syncing campaign index...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* 1. Header with Add Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Target className="w-6 h-6 text-violet-500" />
            Outreach Campaigns
          </h1>
          <p className="text-xs text-slate-400">
            Define target niches, configure localized languages, analyze success funnels, and manage assigned prospects.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-violet-600/10 transition-all self-start"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      {/* 2. Success Metrics Aggregation Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Active Campaigns',
            value: campaigns.filter(c => c.status === 'active').length,
            desc: `${campaigns.length} total campaigns`,
            icon: Target,
            color: 'text-emerald-500 bg-emerald-500/10'
          },
          {
            title: 'Prospects Managed',
            value: campaigns.reduce((acc, c) => acc + (c.leads?.length || 0), 0),
            desc: 'Assigned to active funnels',
            icon: Users,
            color: 'text-violet-500 bg-violet-500/10'
          },
          {
            title: 'Total Outbound',
            value: campaigns.reduce((acc, c) => acc + c.successMetrics.sent, 0),
            desc: 'Manually verified pitches',
            icon: Bot,
            color: 'text-sky-500 bg-sky-500/10'
          },
          {
            title: 'Pipeline Revenue',
            value: `$${campaigns.reduce((acc, c) => acc + c.successMetrics.revenue, 0).toLocaleString()}`,
            desc: 'Earned from won contracts',
            icon: DollarSign,
            color: 'text-amber-500 bg-amber-500/10'
          }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">{stat.title}</span>
                <div className={`p-1.5 rounded-lg ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold text-slate-100">{stat.value}</span>
                <span className="text-[10px] text-slate-500 block">{stat.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Campaign Performance Chart */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-violet-500" />
              Campaign Funnel Performance
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#f1f5f9', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="Outbox" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Replies" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Conversions" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                Niche Conversion Dials
              </h3>
              <div className="space-y-4">
                {campaigns.slice(0, 3).map((c, i) => {
                  const replyRate = c.successMetrics.replyRate || 0;
                  const convRate = c.successMetrics.conversionRate || 0;
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-300 truncate max-w-[150px]">{c.name}</span>
                        <span className="text-slate-400 font-mono text-[10px]">Reply: {replyRate}% • Conv: {convRate}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden flex">
                        <div className="h-full bg-violet-500" style={{ width: `${replyRate}%` }} />
                        <div className="h-full bg-emerald-500" style={{ width: `${convRate}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="pt-4 border-t border-slate-800/60 mt-4 text-[10px] text-slate-500 leading-snug">
              * Rates are calculated automatically by the multi-agent CRM logger as outreach drafts shift statuses to <strong>Sent</strong> and <strong>Replied</strong>.
            </div>
          </div>
        </div>
      )}

      {/* 4. Campaigns Listing & Details Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Campaigns Grid */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Available Campaigns ({campaigns.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {campaigns.length === 0 ? (
              <div className="col-span-2 bg-slate-900 border border-dashed border-slate-800 p-12 rounded-xl text-center space-y-2">
                <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-xs font-semibold text-slate-300">No campaigns found</h4>
                <p className="text-[10px] text-slate-500">Create your first campaign to group niche leads together.</p>
              </div>
            ) : (
              campaigns.map((c) => (
                <div 
                  key={c.id} 
                  onClick={() => setSelectedCampaign(c)}
                  className={`bg-slate-900 border p-5 rounded-xl space-y-4 cursor-pointer transition-all hover:border-slate-700 ${
                    selectedCampaign?.id === c.id ? 'border-violet-600 shadow-md ring-1 ring-violet-600/20' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{c.name}</h4>
                      <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block mt-0.5">
                        {c.targetIndustry || 'Unassigned Niche'}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                      c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                      c.status === 'completed' ? 'bg-sky-500/10 text-sky-400' :
                      c.status === 'paused' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 line-clamp-2 h-7">{c.description || 'No description provided.'}</p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-3 border-t border-slate-800/60 font-mono">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {c.leads?.length || 0} leads
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                      ${(c.successMetrics?.revenue || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Selected Campaign Pipeline & Leads Detail */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          {selectedCampaign ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{selectedCampaign.name}</h4>
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Campaign Settings</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedCampaign.status}
                    onChange={(e) => handleStatusChange(selectedCampaign, e.target.value as any)}
                    className="bg-slate-950 border border-slate-850 px-2 py-1 rounded-md text-[10px] font-semibold text-slate-300 outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button
                    onClick={() => {
                      if (confirm('Delete this campaign and unassign its leads?')) {
                        deleteCampaignMutation.mutate(selectedCampaign.id);
                      }
                    }}
                    className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                    title="Delete Campaign"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Goal & Description */}
              <div className="space-y-3 text-xs bg-slate-950/40 p-3 border border-slate-850 rounded-lg">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Target Goal</span>
                  <p className="text-slate-300 font-medium leading-relaxed">{selectedCampaign.goal || 'No specified goal yet.'}</p>
                </div>
                <div className="space-y-1 pt-2 border-t border-slate-850">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Niche Settings</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-slate-500" /> {selectedCampaign.country}</span>
                    <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-slate-500" /> {selectedCampaign.language.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {/* Leads Assignment List */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-300 block">Assigned Leads ({selectedCampaign.leads?.length || 0})</span>
                
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {selectedCampaign.leads?.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic py-2 text-center">No leads assigned to this campaign yet.</p>
                  ) : (
                    leads
                      .filter(l => selectedCampaign.leads.includes(l.id))
                      .map(l => (
                        <div key={l.id} className="flex items-center justify-between p-2 bg-slate-950/40 border border-slate-850 rounded-lg text-xs">
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-200 block truncate">{l.businessName}</span>
                            <span className="text-[9px] text-slate-500 block truncate">{l.website || 'No website'}</span>
                          </div>
                          <button
                            onClick={() => removeLeadMutation.mutate({ campaignId: selectedCampaign.id, leadId: l.id })}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                            title="Remove Lead"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Add Lead Selector Dropdown */}
              {availableLeads.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Assign New Prospect</span>
                  <div className="flex gap-2">
                    <select
                      id="lead-assign-select"
                      className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          addLeadMutation.mutate({ campaignId: selectedCampaign.id, leadId: val });
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Choose unassigned lead...</option>
                      {availableLeads.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.businessName} ({l.industry || 'No industry'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-2 text-slate-500">
              <Layers className="w-8 h-8 text-slate-600" />
              <p className="text-xs font-medium">Select a campaign card from the list to view target metrics, manage pipeline configurations, and assign local leads.</p>
            </div>
          )}
        </div>
      </div>

      {/* 5. Create Campaign Modal Dialog */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full overflow-hidden shadow-xl">
            <div className="px-5 py-4 bg-slate-950/40 border-b border-slate-850 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Target className="w-4 h-4 text-violet-500" />
                Spawn Outreach Niche Campaign
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. French Restaurants, Medical Clinics..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-violet-600 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Niche Description</label>
                <textarea
                  placeholder="Briefly describe the campaign objective..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-violet-600 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Industry</label>
                  <input
                    type="text"
                    placeholder="e.g. Healthcare, Legal"
                    value={targetIndustry}
                    onChange={(e) => setTargetIndustry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-600 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Country</label>
                  <input
                    type="text"
                    placeholder="e.g. USA, France"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-600 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Strategic Outreach Goal</label>
                <input
                  type="text"
                  placeholder="e.g. Secure 15 online booking agreements"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-violet-600 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-colors"
                />
              </div>

              <div className="pt-3 border-t border-slate-850 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-850 text-[11px] font-semibold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCampaignMutation.isPending}
                  className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[11px] font-semibold shadow-md shadow-violet-600/10"
                >
                  {createCampaignMutation.isPending ? 'Creating...' : 'Launch Campaign Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
