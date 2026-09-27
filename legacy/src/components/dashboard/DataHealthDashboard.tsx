import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api.ts';
import { Lead, FieldValidation } from '../../types.ts';
import {
  ShieldAlert, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, AlertTriangle,
  ArrowRight, GitMerge, User, ExternalLink, Trash2, X, AlertOctagon, HelpCircle,
  Sparkles, FileText, Globe, Mail, Phone, ChevronRight, Check
} from 'lucide-react';

interface DataHealthDashboardProps {
  workspaceId: string;
  onSelectLead?: (leadId: string) => void;
}

export default function DataHealthDashboard({ workspaceId, onSelectLead }: DataHealthDashboardProps) {
  const queryClient = useQueryClient();
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [resolvingDuplicateGroup, setResolvingDuplicateGroup] = useState<{
    primaryLead: Lead;
    duplicates: Lead[];
  } | null>(null);

  // Form states for manual merge
  const [selectedFields, setSelectedFields] = useState<Record<string, any>>({});

  // 1. Fetch all leads in workspace
  const { data: leads, isLoading, isRefetching } = useQuery({
    queryKey: ['leads', workspaceId],
    queryFn: () => apiService.getLeads(workspaceId)
  });

  // --- Mutations ---
  const batchEnrichMutation = useMutation({
    mutationFn: () => apiService.batchEnrichLeads(workspaceId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      setIsProcessingBatch(false);
    },
    onError: () => {
      setIsProcessingBatch(false);
    }
  });

  const enrichSingleLeadMutation = useMutation({
    mutationFn: (leadId: string) => apiService.enrichLead(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    }
  });

  const mergeLeadsMutation = useMutation({
    mutationFn: (variables: { primaryId: string; duplicateLeadIds: string[]; fieldsToKeep: Partial<Lead> }) =>
      apiService.mergeLeads(variables.primaryId, variables.duplicateLeadIds, variables.fieldsToKeep),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      setResolvingDuplicateGroup(null);
      setSelectedFields({});
    }
  });

  const ignoreDuplicateMutation = useMutation({
    mutationFn: (variables: { id: string; duplicateId: string }) =>
      apiService.ignoreDuplicate(variables.id, variables.duplicateId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      if (resolvingDuplicateGroup) {
        // Remove the ignored duplicate from state
        const updatedDuplicates = resolvingDuplicateGroup.duplicates.filter(d => d.id !== variables.duplicateId);
        if (updatedDuplicates.length === 0) {
          setResolvingDuplicateGroup(null);
        } else {
          setResolvingDuplicateGroup({
            ...resolvingDuplicateGroup,
            duplicates: updatedDuplicates
          });
        }
      }
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-slate-900 border border-slate-800 rounded-xl">
        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Analyzing CRM data health...</p>
      </div>
    );
  }

  const allLeads = leads || [];
  
  // Local Type-safe Health Check Helper
  const getHasCriticalIssue = (l: Lead) => {
    const e = l.enrichment;
    if (!e) return false;
    return (
      e.missingFields.includes('email') ||
      e.missingFields.includes('website') ||
      !e.validations.email.valid ||
      !e.validations.phone.valid ||
      !e.validations.website.valid
    );
  };

  const getInvalidValidations = (l: Lead) => {
    const e = l.enrichment;
    if (!e) return [];
    const list: { field: string; message: string }[] = [];
    if (!e.validations.businessName.valid) {
      list.push({ field: 'Name', message: e.validations.businessName.error || 'Format check' });
    }
    if (!e.validations.website.valid) {
      list.push({ field: 'Website', message: e.validations.website.error || 'URL format check' });
    }
    if (!e.validations.email.valid) {
      list.push({ field: 'Email', message: e.validations.email.error || 'Email check' });
    }
    if (!e.validations.phone.valid) {
      list.push({ field: 'Phone', message: e.validations.phone.error || 'Phone check' });
    }
    if (!e.validations.country.valid) {
      list.push({ field: 'Country', message: e.validations.country.error || 'Country name check' });
    }
    if (!e.validations.city.valid) {
      list.push({ field: 'City', message: e.validations.city.error || 'City name check' });
    }
    return list;
  };

  // Calculate Data Health KPIs
  const totalLeadsCount = allLeads.length;
  const avgCompleteness = totalLeadsCount > 0
    ? Math.round(allLeads.reduce((acc, l) => acc + (l.enrichment?.completenessScore || 0), 0) / totalLeadsCount)
    : 0;

  // Track Field Errors & Missing Info
  let totalMissingEmails = 0;
  let totalMissingPhones = 0;
  let totalMissingWebsites = 0;
  let totalInvalidEmails = 0;
  let totalInvalidPhones = 0;
  let totalInvalidWebsites = 0;
  let totalCriticalIssues = 0;

  // Build a map of duplicate matches
  const duplicateGroups: { primary: Lead; duplicates: Lead[] }[] = [];
  const processedInDuplicate = new Set<string>();

  allLeads.forEach(lead => {
    const e = lead.enrichment;
    if (!e) return;

    if (e.missingFields.includes('email')) totalMissingEmails++;
    if (e.missingFields.includes('phone')) totalMissingPhones++;
    if (e.missingFields.includes('website')) totalMissingWebsites++;

    const emailVal = e.validations.email;
    if (emailVal && !emailVal.valid && !e.missingFields.includes('email')) totalInvalidEmails++;

    const phoneVal = e.validations.phone;
    if (phoneVal && !phoneVal.valid && !e.missingFields.includes('phone')) totalInvalidPhones++;

    const domainVal = e.validations.website;
    if (domainVal && !domainVal.valid && !e.missingFields.includes('website')) totalInvalidWebsites++;

    if (getHasCriticalIssue(lead)) {
      totalCriticalIssues++;
    }

    // Duplicate detection grouping
    const activeDuplicates = e.duplicateGroupIds.filter(id => !e.ignoredDuplicateIds.includes(id));
    const isDuplicate = activeDuplicates.length > 0;
    if (isDuplicate && !processedInDuplicate.has(lead.id)) {
      const matchingDuplicates = allLeads.filter(l => activeDuplicates.includes(l.id) && l.id !== lead.id);
      
      if (matchingDuplicates.length > 0) {
        duplicateGroups.push({
          primary: lead,
          duplicates: matchingDuplicates
        });
        processedInDuplicate.add(lead.id);
        matchingDuplicates.forEach(d => processedInDuplicate.add(d.id));
      }
    }
  });

  const handleRunBatchValidation = () => {
    setIsProcessingBatch(true);
    batchEnrichMutation.mutate();
  };

  const startResolvingDuplicates = (group: { primary: Lead; duplicates: Lead[] }) => {
    setResolvingDuplicateGroup({
      primaryLead: group.primary,
      duplicates: group.duplicates
    });
    // Pre-populate merge selections with the primary lead's fields
    setSelectedFields({
      businessName: group.primary.businessName,
      website: group.primary.website || '',
      email: group.primary.email || '',
      phone: group.primary.phone || '',
      owner: group.primary.owner,
      industry: group.primary.industry || '',
      category: group.primary.category || '',
      contactName: group.primary.contactName || '',
      city: group.primary.city || '',
      country: group.primary.country || '',
    });
  };

  const handleMergeSubmit = () => {
    if (!resolvingDuplicateGroup) return;
    const duplicateIds = resolvingDuplicateGroup.duplicates.map(d => d.id);
    
    mergeLeadsMutation.mutate({
      primaryId: resolvingDuplicateGroup.primaryLead.id,
      duplicateLeadIds: duplicateIds,
      fieldsToKeep: selectedFields
    });
  };

  // Determine Overall Health State Color
  let healthColor = 'text-emerald-400 bg-emerald-950/30 border-emerald-500/20';
  let healthLabel = 'Excellent Health';
  let healthProgressColor = 'bg-emerald-500';
  
  if (avgCompleteness < 50) {
    healthColor = 'text-red-400 bg-red-950/30 border-red-500/20';
    healthLabel = 'Needs Urgent Enrichment';
    healthProgressColor = 'bg-red-500';
  } else if (avgCompleteness < 75 || totalCriticalIssues > 0) {
    healthColor = 'text-amber-400 bg-amber-950/30 border-amber-500/20';
    healthLabel = 'Moderate Health';
    healthProgressColor = 'bg-amber-500';
  }

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-bold text-slate-100">Data Quality & Health Center</h2>
          </div>
          <p className="text-xs text-slate-400">
            Automatically validate, normalize, and score contact records before launching outreach campaigns.
          </p>
        </div>

        <button
          onClick={handleRunBatchValidation}
          disabled={isProcessingBatch || isRefetching}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800/80 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-violet-600/15"
        >
          {isProcessingBatch || isRefetching ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {isProcessingBatch || isRefetching ? 'Validating CRM...' : 'Validate & Enrich Database'}
        </button>
      </div>

      {/* 2. STATS OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COMPLETENESS SCORE GAUGE */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completeness score</h3>
              <span className={`text-[10px] font-semibold font-mono border px-2 py-0.5 rounded-full ${healthColor}`}>
                {healthLabel}
              </span>
            </div>

            <div className="flex items-end gap-4 my-3">
              <span className="text-5xl font-black text-slate-100 tracking-tight">{avgCompleteness}%</span>
              <div className="mb-2">
                <span className="text-xs text-slate-400 block font-medium">CRM Target Goal: 85%</span>
                <span className="text-[10px] text-slate-500 font-mono block">Across {totalLeadsCount} records</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${healthProgressColor} transition-all duration-500`}
                style={{ width: `${avgCompleteness}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0% Low</span>
              <span>85% Optimal</span>
              <span>100% Perfect</span>
            </div>
          </div>
        </div>

        {/* FIELD AUDIT FAILURES */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Integrity Field Audit</h3>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono font-semibold">
              {totalCriticalIssues} Critical Alerts
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-850">
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>Email validation check</span>
              </div>
              <span className="font-mono font-semibold text-slate-200">
                {totalMissingEmails} missing • <span className="text-red-400">{totalInvalidEmails} invalid</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-850">
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>Phone validation check</span>
              </div>
              <span className="font-mono font-semibold text-slate-200">
                {totalMissingPhones} missing • <span className="text-red-400">{totalInvalidPhones} invalid</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <div className="flex items-center gap-2 text-slate-300">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>Website domain check</span>
              </div>
              <span className="font-mono font-semibold text-slate-200">
                {totalMissingWebsites} missing • <span className="text-red-400">{totalInvalidWebsites} invalid</span>
              </span>
            </div>
          </div>
        </div>

        {/* DUPLICATION OVERVIEW */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duplicate Detection</h3>
              <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${
                duplicateGroups.length > 0
                  ? 'text-red-400 bg-red-950/30 border-red-500/20'
                  : 'text-emerald-400 bg-emerald-950/30 border-emerald-500/20'
              }`}>
                {duplicateGroups.length > 0 ? 'Action Required' : 'Fully Deduplicated'}
              </span>
            </div>

            <div className="flex items-end gap-3 my-2">
              <span className="text-5xl font-black text-slate-100 tracking-tight">
                {duplicateGroups.length}
              </span>
              <div className="mb-2">
                <span className="text-xs text-slate-400 block font-medium">Duplicate groups</span>
                <span className="text-[10px] text-slate-500 font-mono block">Matching website/email/phone</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            {duplicateGroups.length > 0 
              ? 'Warning: Outgoing emails might trigger duplicate outreach locks. Resolve matches below.'
              : 'Zero cross-lead record collisions detected. Your database is perfectly unique.'}
          </p>
        </div>

      </div>

      {/* 3. COLLIDED RECORDS / DUPLICATE WIZARD */}
      {duplicateGroups.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-850">
            <GitMerge className="w-5 h-5 text-violet-400" />
            <h3 className="font-bold text-slate-100 text-sm">CRM Duplicate Resolution Registry</h3>
          </div>

          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {duplicateGroups.map((group, idx) => (
              <div
                key={idx}
                className="bg-slate-950 border border-slate-850 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-800 transition-all"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200 truncate">{group.primary.businessName}</span>
                    <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                      Lead ID: {group.primary.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                    {group.primary.website && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-500" /> {group.primary.website}
                      </span>
                    )}
                    {group.primary.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-500" /> {group.primary.email}
                      </span>
                    )}
                    {group.primary.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-500" /> {group.primary.phone}
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-rose-400 font-medium">
                    Collides with {group.duplicates.length} other record(s): {group.duplicates.map(d => d.businessName).join(', ')}
                  </div>
                </div>

                <button
                  onClick={() => startResolvingDuplicates(group)}
                  className="w-full sm:w-auto flex items-center justify-center gap-1 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-violet-400 hover:text-violet-300 font-semibold text-xs border border-slate-800 rounded-lg transition-all shrink-0"
                >
                  <span>Resolve Collisions</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. UNDERPERFORMING / CRITICAL ATTRIBUTES TO IMPROVE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEADS WITH HIGH FAILURES */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-1.5 mb-4 pb-3 border-b border-slate-850">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <h3 className="font-bold text-slate-100 text-xs uppercase tracking-wider">Critical Validation Alerts</h3>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {allLeads.filter(l => getHasCriticalIssue(l)).length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">No outstanding validation alerts in database.</p>
            ) : (
              allLeads
                .filter(l => getHasCriticalIssue(l))
                .slice(0, 10)
                .map(lead => (
                  <div key={lead.id} className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex items-center justify-between text-xs gap-4">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-200 block truncate">{lead.businessName}</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {getInvalidValidations(lead).map((v, i) => (
                          <span key={i} className="text-[9px] font-mono text-rose-400 bg-rose-950/20 border border-rose-950 px-1.5 py-0.5 rounded">
                            {v.field}: {v.message}
                          </span>
                        ))}
                        {lead.enrichment?.missingFields.map((f, i) => (
                          <span key={i} className="text-[9px] font-mono text-amber-400 bg-amber-950/20 border border-amber-950 px-1.5 py-0.5 rounded">
                            missing {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => enrichSingleLeadMutation.mutate(lead.id)}
                        disabled={enrichSingleLeadMutation.isPending}
                        className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold px-2 py-1 bg-slate-900 hover:bg-slate-850 rounded border border-slate-800 transition-all"
                      >
                        Enrich
                      </button>
                      {onSelectLead && (
                        <button
                          onClick={() => onSelectLead(lead.id)}
                          className="text-[10px] text-slate-400 hover:text-slate-200 font-semibold px-2 py-1 bg-slate-900 hover:bg-slate-850 rounded border border-slate-800 transition-all"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* ACTIONABLE RECOMMENDATIONS LIST */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-1.5 mb-4 pb-3 border-b border-slate-850">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-slate-100 text-xs uppercase tracking-wider">Automated Enrich Recommendations</h3>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {allLeads.filter(l => l.enrichment && (l.enrichment.tagRecommendations.length > 0 || l.enrichment.industrySuggestions.length > 0)).length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">No new intelligent recommendations computed yet.</p>
            ) : (
              allLeads
                .filter(l => l.enrichment && (l.enrichment.tagRecommendations.length > 0 || l.enrichment.industrySuggestions.length > 0))
                .slice(0, 10)
                .map(lead => (
                  <div key={lead.id} className="bg-slate-950 p-3.5 rounded-lg border border-slate-850 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 truncate">{lead.businessName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Score: {lead.enrichment?.completenessScore}%</span>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-400 leading-normal">
                      {lead.enrichment && lead.enrichment.industrySuggestions.length > 0 && !lead.industry && (
                        <div>
                          <span className="text-slate-500 font-medium">Suggested Industry:</span>{' '}
                          <span className="text-emerald-400 font-bold">{lead.enrichment.industrySuggestions[0]}</span>
                        </div>
                      )}
                      {lead.enrichment && lead.enrichment.tagRecommendations.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <span className="text-slate-500 font-medium">Recommended Tags:</span>
                          {lead.enrichment.tagRecommendations.map((tag, i) => (
                            <span key={i} className="text-[9px] bg-violet-950/30 text-violet-400 border border-violet-900/40 px-1.5 py-0.5 rounded font-mono">
                              +{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-900">
                      <button
                        onClick={async () => {
                          const updates: Partial<Lead> = {};
                          if (lead.enrichment && lead.enrichment.industrySuggestions.length > 0 && !lead.industry) {
                            updates.industry = lead.enrichment.industrySuggestions[0];
                          }
                          if (lead.enrichment && lead.enrichment.tagRecommendations.length > 0) {
                            updates.tags = [...new Set([...lead.tags, ...lead.enrichment.tagRecommendations])];
                          }
                          await apiService.updateLead(lead.id, updates);
                          queryClient.invalidateQueries({ queryKey: ['leads', workspaceId] });
                        }}
                        className="text-[9px] bg-violet-900 hover:bg-violet-800 text-white font-semibold px-2.5 py-1 rounded transition-colors"
                      >
                        Apply Suggestions
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

      </div>

      {/* 5. RESOLVE DUPLICATE SLIDE-OVER OVERLAY PANEL */}
      {resolvingDuplicateGroup && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Overlay Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-violet-400" />
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">CRM Lead Collision Resolution</h4>
                  <p className="text-[11px] text-slate-400">Select which data attributes to persist. Non-selected record will be merged.</p>
                </div>
              </div>
              <button
                onClick={() => setResolvingDuplicateGroup(null)}
                className="text-slate-400 hover:text-slate-200 p-1 bg-slate-850 hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Overlay Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Field Selectors Table */}
              <div className="space-y-4">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Field Attribute Preservation</h5>
                
                <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-850 text-xs">
                  
                  {/* Field Row builder */}
                  {[
                    { label: 'Business Name', key: 'businessName', icon: FileText },
                    { label: 'Website URL', key: 'website', icon: Globe },
                    { label: 'Email address', key: 'email', icon: Mail },
                    { label: 'Phone lines', key: 'phone', icon: Phone },
                    { label: 'Company Owner', key: 'owner', icon: User },
                    { label: 'Industry tag', key: 'industry', icon: Sparkles },
                    { label: 'Category field', key: 'category', icon: Sparkles },
                    { label: 'Contact Name', key: 'contactName', icon: User },
                    { label: 'City location', key: 'city', icon: Globe },
                    { label: 'Country location', key: 'country', icon: Globe },
                  ].map(field => {
                    const FieldIcon = field.icon;
                    return (
                      <div key={field.key} className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-start bg-slate-950/20 hover:bg-slate-950/40 transition-all">
                        <div className="flex items-center gap-2 font-medium text-slate-300">
                          <FieldIcon className="w-3.5 h-3.5 text-slate-500" />
                          <span>{field.label}</span>
                        </div>
                        
                        <div className="sm:col-span-2 space-y-2">
                          {/* Option for Primary Lead */}
                          <label className="flex items-center gap-3.5 p-2 bg-slate-900 border border-slate-850 rounded-lg cursor-pointer hover:border-slate-800">
                            <input
                              type="radio"
                              name={`merge-${field.key}`}
                              checked={selectedFields[field.key] === (resolvingDuplicateGroup.primaryLead as any)[field.key]}
                              onChange={() => setSelectedFields({ ...selectedFields, [field.key]: (resolvingDuplicateGroup.primaryLead as any)[field.key] })}
                              className="text-violet-600 bg-slate-950 border-slate-800 focus:ring-violet-500 w-3.5 h-3.5"
                            />
                            <div className="min-w-0">
                              <span className="font-mono text-[10px] text-violet-400 block font-bold uppercase tracking-wider">Primary Record</span>
                              <span className="text-slate-200 truncate block">{(resolvingDuplicateGroup.primaryLead as any)[field.key] || <span className="text-slate-600 italic">empty</span>}</span>
                            </div>
                          </label>

                          {/* Options for Duplicates */}
                          {resolvingDuplicateGroup.duplicates.map((dup, dIdx) => (
                            <label key={dIdx} className="flex items-center gap-3.5 p-2 bg-slate-900 border border-slate-850 rounded-lg cursor-pointer hover:border-slate-800">
                              <input
                                type="radio"
                                name={`merge-${field.key}`}
                                checked={selectedFields[field.key] === (dup as any)[field.key]}
                                onChange={() => setSelectedFields({ ...selectedFields, [field.key]: (dup as any)[field.key] })}
                                className="text-violet-600 bg-slate-950 border-slate-800 focus:ring-violet-500 w-3.5 h-3.5"
                              />
                              <div className="min-w-0">
                                <span className="font-mono text-[10px] text-emerald-400 block font-bold uppercase tracking-wider">Duplicate #{dIdx + 1}</span>
                                <span className="text-slate-200 truncate block">{(dup as any)[field.key] || <span className="text-slate-600 italic">empty</span>}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                </div>
              </div>

              {/* Ignore as Duplicate pair option */}
              <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-2">
                <h6 className="text-xs font-bold text-slate-300">Are these actually distinct businesses?</h6>
                <p className="text-[11px] text-slate-400">
                  If these represent separate, valid target leads that happen to share attributes, you can ignore the match.
                </p>
                <div className="flex gap-2 pt-2">
                  {resolvingDuplicateGroup.duplicates.map((dup, dIdx) => (
                    <button
                      key={dIdx}
                      onClick={() => ignoreDuplicateMutation.mutate({ id: resolvingDuplicateGroup.primaryLead.id, duplicateId: dup.id })}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-850 text-slate-300 font-semibold text-[10px] rounded border border-slate-800 transition-colors"
                    >
                      Ignore Match #{dIdx + 1}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Overlay Footer */}
            <div className="p-5 border-t border-slate-800 flex items-center justify-end gap-3.5 bg-slate-950/20">
              <button
                onClick={() => setResolvingDuplicateGroup(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleMergeSubmit}
                disabled={mergeLeadsMutation.isPending}
                className="flex items-center gap-1.5 px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-bold text-xs rounded-xl transition-colors shadow-md shadow-violet-600/15"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>Execute Complete Merge</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
