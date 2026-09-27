import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api.ts';
import {
  Users, Bot, Layers, Activity, Calendar, CheckSquare, Plus,
  Trash2, AlertCircle, RefreshCw, Star, ArrowUpRight, TrendingUp
} from 'lucide-react';

export default function DashboardView() {
  const queryClient = useQueryClient();
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDate, setTaskDate] = useState('');

  // 1. Fetch Registered Plugins
  const { data: plugins } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiService.getPlugins()
  });

  // 2. Fetch Active Micro-Agents
  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiService.getAgents()
  });

  // 3. Fetch Operational Tasks
  const { data: tasks, isLoading: isTasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiService.getTasks()
  });

  // 4. Fetch System Activity Log Stream
  const { data: logs, isLoading: isLogsLoading } = useQuery({
    queryKey: ['logs'],
    queryFn: () => apiService.getLogs(6)
  });

  // --- Mutations for Tasks ---
  const createTaskMutation = useMutation({
    mutationFn: (newTask: { title: string; description?: string; dueDate?: string }) =>
      apiService.createTask(newTask),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      setTaskTitle('');
      setTaskDesc('');
      setTaskDate('');
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

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskTitle.trim()) {
      createTaskMutation.mutate({
        title: taskTitle,
        description: taskDesc || undefined,
        dueDate: taskDate || undefined
      });
    }
  };

  // Simulated metrics
  const leadStats = {
    totalDiscovered: 45,
    qualifiedLeads: 28,
    repliedRate: 40,
    openRate: 68
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. HERO KPI STATS PANELS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Discovered Leads', value: leadStats.totalDiscovered, icon: Users, accent: 'text-violet-400', desc: '+12% from yesterday' },
          { title: 'Qualified Outreach Leads', value: leadStats.qualifiedLeads, icon: Star, accent: 'text-indigo-400', desc: 'Ready for pitch campaigns' },
          { title: 'Avg Open rate ratio', value: `${leadStats.openRate}%`, icon: ArrowUpRight, accent: 'text-emerald-400', desc: 'Enterprise target average' },
          { title: 'Outreach response rate', value: `${leadStats.repliedRate}%`, icon: TrendingUp, accent: 'text-amber-400', desc: 'High performance metrics' }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.title}</span>
                <div className={`p-2 bg-slate-850 rounded-lg ${stat.accent}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-100">{stat.value}</div>
              <span className="text-[10px] text-slate-500 mt-1 block font-mono">{stat.desc}</span>
            </div>
          );
        })}
      </div>

      {/* 2. MAIN WORKSPACE BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Reminders and Interactive Task manager */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI PROACTIVE ADVISORY PANEL */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-slate-850 pb-2">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-violet-400 animate-pulse" />
                <h3 className="font-bold text-slate-100 text-xs sm:text-sm">AI Proactive Advisory recommendations</h3>
              </div>
              <span className="px-1.5 py-0.5 bg-violet-600/10 border border-violet-500/20 text-violet-400 font-mono text-[8px] rounded uppercase font-bold tracking-wider">
                Continuous Learning v2.0
              </span>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-950 border border-slate-850 rounded-lg p-3 flex justify-between items-center gap-3">
                <div className="min-w-0 text-left">
                  <span className="px-1.5 py-0.2 rounded text-[7px] font-mono uppercase font-bold border inline-block mb-1 bg-red-500/10 border-red-500/15 text-red-400">
                    very high priority
                  </span>
                  <h4 className="font-bold text-slate-200 text-xs truncate">Opportunity Alert: Downtown Dental Clinic</h4>
                  <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                    SEO rating is low (42/100) due to missing meta headers. We recommend launching an optimized booking scheduler proposal.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-850 rounded-lg p-3 flex justify-between items-center gap-3">
                <div className="min-w-0 text-left">
                  <span className="px-1.5 py-0.2 rounded text-[7px] font-mono uppercase font-bold border inline-block mb-1 bg-amber-500/10 border-amber-500/15 text-amber-400">
                    high priority
                  </span>
                  <h4 className="font-bold text-slate-200 text-xs truncate">Prospect Idle Warning: Apex Legal Partners</h4>
                  <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                    No active proposals or communications have occurred in 5 days. Click to trigger auto-drafting proposal sequence.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-850">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-violet-400" />
                <h3 className="font-bold text-slate-100">Task Scheduler & Callback Reminders</h3>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                {tasks ? tasks.filter(t => !t.isCompleted).length : 0} Pending
              </span>
            </div>

            {/* List of Tasks */}
            {isTasksLoading ? (
              <div className="flex justify-center py-6">
                <RefreshCw className="w-5 h-5 text-violet-500 animate-spin" />
              </div>
            ) : tasks?.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">No schedule tasks found. Create some below!</p>
            ) : (
              <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-1">
                {tasks?.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-lg border flex items-center justify-between gap-4 transition-all ${
                      task.isCompleted
                        ? 'bg-slate-950/40 border-slate-900 text-slate-500 line-through'
                        : 'bg-slate-950 border-slate-850 text-slate-200 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={task.isCompleted}
                        onChange={(e) => toggleTaskMutation.mutate({ id: task.id, isCompleted: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-800 text-violet-600 bg-slate-900 focus:ring-violet-500 mt-0.5 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="font-medium text-xs break-words">{task.title}</span>
                        {task.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{task.description}</p>
                        )}
                        <span className="text-[9px] text-slate-500 font-mono mt-1 block">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTaskMutation.mutate(task.id)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-900 transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Inline Task Form */}
            <form onSubmit={handleAddTask} className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-3">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Schedule New CRM Follow-Up</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Task title (e.g. Call back medical lead)"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                  required
                />
                <input
                  type="date"
                  value={taskDate}
                  onChange={(e) => setTaskDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <input
                type="text"
                placeholder="Optional description note"
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
              />
              <button
                type="submit"
                disabled={createTaskMutation.isPending}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-semibold text-xs rounded-lg transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Schedule reminder
              </button>
            </form>
          </div>

          {/* Connected Registries checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Plugins Checklist */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-slate-850">
                <Layers className="w-4 h-4 text-violet-400" />
                <h4 className="font-bold text-xs text-slate-100">Active Integrations Check</h4>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {plugins?.slice(0, 6).map((plugin) => (
                  <div key={plugin.id} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-400 truncate">{plugin.name}</span>
                    {plugin.isConfigured ? (
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-semibold">Active</span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-850 px-1.5 py-0.5 rounded font-mono">Inactive</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Micro-Agents Checklist */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-slate-850">
                <Bot className="w-4 h-4 text-violet-400" />
                <h4 className="font-bold text-xs text-slate-100">AI Micro-Agents Registry</h4>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {agents?.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-400 truncate">{agent.name}</span>
                    <span className="text-[9px] bg-slate-850 text-slate-500 px-1 py-0.5 rounded font-mono">v{agent.version}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Operational Timeline Logs (Live status checks) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-850">
              <Activity className="w-5 h-5 text-violet-400" />
              <h3 className="font-bold text-slate-100">Live System Timeline Logs</h3>
            </div>

            {isLogsLoading ? (
              <div className="flex justify-center py-10">
                <RefreshCw className="w-5 h-5 text-violet-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {logs?.map((log) => (
                  <div key={log.id} className="relative pl-5 border-l border-slate-800 text-xs py-1">
                    {/* Circle bullet */}
                    <div className="absolute -left-1 top-2.5 w-2 h-2 rounded-full bg-violet-500 shadow-sm shadow-violet-500/20"></div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[10px] text-violet-400 uppercase tracking-wide font-mono">
                        {log.actionType}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-tight">{log.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-850 text-[10px] text-slate-500 font-mono text-center">
            SYSTEM TELEMETRY ONLINE ● CROWLER API PROXY 3000
          </div>
        </div>

      </div>
    </div>
  );
}
