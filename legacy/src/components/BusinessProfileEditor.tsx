import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api.ts';
import { Save, RefreshCw, Layers, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';

export default function BusinessProfileEditor() {
  const queryClient = useQueryClient();
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('consultative');
  const [serviceInput, setServiceInput] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch the active profile
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['businessProfile'],
    queryFn: () => apiService.getProfile('default-workspace-456')
  });

  // Keep internal states in sync with query cache
  useEffect(() => {
    if (profile) {
      setCompanyName(profile.companyName || '');
      setIndustry(profile.industry || '');
      setTargetAudience(profile.targetAudience || '');
      setToneOfVoice(profile.toneOfVoice || 'consultative');
      setServices(profile.services || []);
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (updates: any) => apiService.updateProfile(updates),
    onSuccess: (data) => {
      queryClient.setQueryData(['businessProfile'], data);
      setSuccessMsg('Business profile saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  });

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (serviceInput.trim() && !services.includes(serviceInput.trim())) {
      setServices([...services, serviceInput.trim()]);
      setServiceInput('');
    }
  };

  const handleRemoveService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      workspaceId: 'default-workspace-456',
      companyName,
      industry,
      targetAudience,
      toneOfVoice,
      services
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 font-sans">
        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
        <p className="text-sm text-slate-400">Loading sender persona profile...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-6 text-center font-sans">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="text-white font-semibold mb-1">Failed to load Profile</h3>
        <p className="text-sm text-slate-400">Please confirm that your Express background server is active.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto font-sans">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-400" />
          Business Sender Persona (Your Agency)
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Define your agency offerings and tone. AI micro-agents (Agent 3 & 4) read this profile to match your services to the target lead's detected weaknesses, ensuring natural pitches without clichés.
        </p>
      </div>

      {successMsg && (
        <div className="mb-6 p-3 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-2 animate-fade-in">
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Industry Sector</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Digital Growth, Creative Marketing, IT Solutions"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Audience / ICP</label>
          <textarea
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            rows={3}
            placeholder="Describe your ideal customer profile (ICP), e.g., local medical clinics, regional lawyers, or e-commerce stores earning $10k-$100k/mo"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tone of Voice</label>
            <select
              value={toneOfVoice}
              onChange={(e) => setToneOfVoice(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
            >
              <option value="consultative">Consultative & Helpful (Highly Recommended)</option>
              <option value="bold">Bold & Direct (Guerilla Pitching)</option>
              <option value="casual">Casual & Conversational (Freelancer style)</option>
              <option value="scholarly">Scholarly & Analytical (Data-Backed Pitching)</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1.5 flex items-start gap-1">
              <MessageSquare className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
              <span>Consultative tone generates empathetic, pain-point driven proposals with highest conversions.</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">List of Services / Core Offerings</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={serviceInput}
                onChange={(e) => setServiceInput(e.target.value)}
                placeholder="e.g. High-Speed SEO Optimization"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
              />
              <button
                type="button"
                onClick={handleAddService}
                className="px-3 py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg transition-all border border-slate-800"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {services.length === 0 ? (
                <span className="text-xs text-slate-500 italic">No services listed yet. Add some above.</span>
              ) : (
                services.map((service, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 text-xs bg-violet-950/40 text-violet-300 px-2.5 py-1 rounded-lg border border-violet-500/20"
                  >
                    {service}
                    <button
                      type="button"
                      onClick={() => handleRemoveService(index)}
                      className="text-violet-400 hover:text-violet-200 font-bold ml-1 text-[11px]"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-850">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-semibold text-sm rounded-xl transition-all"
          >
            {updateMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Business Profile
          </button>
        </div>
      </form>
    </div>
  );
}
