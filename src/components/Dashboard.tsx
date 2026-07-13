import React, { useState, useMemo } from "react";
import {
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  Zap,
  Activity,
  Sparkles,
  Database,
  Bot,
  Layers,
  FileText,
  Download,
  Upload
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from "recharts";
import { WorkflowRun, AgentRunState } from "../types";

interface DashboardProps {
  pastRuns: WorkflowRun[];
  onDeleteRun: (runId: string) => void;
  onClearHistory: () => void;
  onImportHistory: (importedRuns: WorkflowRun[]) => void;
  onCloseDashboard: () => void;
}

export default function Dashboard({
  pastRuns,
  onDeleteRun,
  onClearHistory,
  onImportHistory,
  onCloseDashboard
}: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [logTab, setLogTab] = useState<"all" | "single" | "batch">("all");

  // Export entire run history to a JSON file
  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify(pastRuns, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `agent_workflow_past_runs_${new Date().toISOString().slice(0, 10)}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export past runs history.");
    }
  };

  // Import run history from a JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!Array.isArray(parsed)) {
          alert("Invalid file format: Expected a JSON array of workflow runs.");
          return;
        }

        // Validate basic keys of each element
        const validRuns = parsed.filter(run => run && typeof run === 'object' && 'id' in run && 'agentStates' in run);

        if (validRuns.length === 0) {
          alert("No valid workflow run records found in the uploaded file.");
          return;
        }

        onImportHistory(validRuns);
        
        // Reset file input
        e.target.value = "";
      } catch (err) {
        console.error("Import failed:", err);
        alert("Failed to parse the uploaded JSON file. Please ensure it is a valid past runs export.");
      }
    };

    fileReader.readAsText(file, "UTF-8");
  };

  // 1. Calculations & Summaries
  const stats = useMemo(() => {
    const total = pastRuns.length;
    const completed = pastRuns.filter((r) => r.status === "completed").length;
    const failed = pastRuns.filter((r) => r.status === "failed").length;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Latency & Costs
    let totalAgentRuns = 0;
    let totalLatency = 0;
    let totalChars = 0;
    let totalCost = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    // Model counters
    const modelCounts: Record<string, number> = {};

    // Agent metrics breakdown
    const agentMetrics: Record<string, { totalTime: number; count: number; name: string }> = {};

    pastRuns.forEach((run) => {
      (Object.values(run.agentStates) as AgentRunState[]).forEach((state) => {
        // Only count completed/failed states that actually ran
        if (state.status === "completed" || state.status === "failed") {
          if (state.duration) {
            totalLatency += state.duration;
            totalAgentRuns++;

            // Accumulate agent-specific metrics
            const agentKey = state.agentId;
            if (!agentMetrics[agentKey]) {
              agentMetrics[agentKey] = { totalTime: 0, count: 0, name: state.agentId };
            }
            agentMetrics[agentKey].totalTime += state.duration;
            agentMetrics[agentKey].count++;
          }

          if (state.output) {
            totalChars += state.output.length;
          }

          // Compute/Accumulate Tokens and Cost (with retroactive backfill)
          let currentCost = state.cost;
          let currentInputTokens = state.tokens?.input;
          let currentOutputTokens = state.tokens?.output;

          if (currentCost === undefined || currentInputTokens === undefined || currentOutputTokens === undefined) {
            const usedModel = state.model || "gemini-3.5-flash";
            const inputLen = state.input?.length || 0;
            const outputLen = state.output?.length || 0;
            currentInputTokens = Math.ceil(inputLen / 4.2);
            currentOutputTokens = Math.ceil(outputLen / 4.2);
            if (usedModel.toLowerCase().includes("pro")) {
              currentCost = (currentInputTokens * 1.25 + currentOutputTokens * 5.0) / 1000000;
            } else {
              currentCost = (currentInputTokens * 0.075 + currentOutputTokens * 0.3) / 1000000;
            }
          }

          totalCost += currentCost;
          totalPromptTokens += currentInputTokens;
          totalCompletionTokens += currentOutputTokens;

          // Count model usage
          const usedModel = state.model || "gemini-3.5-flash";
          modelCounts[usedModel] = (modelCounts[usedModel] || 0) + 1;
        }
      });
    });

    const avgLatency = totalAgentRuns > 0 ? Math.round(totalLatency / totalAgentRuns) : 0;

    // Sort models by frequency
    const modelLeaderboard = Object.entries(modelCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      completed,
      failed,
      successRate,
      avgLatency,
      totalChars,
      totalCost,
      totalPromptTokens,
      totalCompletionTokens,
      modelLeaderboard,
      agentMetrics: Object.values(agentMetrics)
    };
  }, [pastRuns]);

  // Model execution duration comparison for successful pipeline runs (run.status === "completed")
  const modelDurationData = useMemo(() => {
    const completedRuns = pastRuns.filter((r) => r.status === "completed");
    const durationsByModel: Record<string, { totalDuration: number; count: number; min: number; max: number }> = {};

    completedRuns.forEach((run) => {
      (Object.values(run.agentStates) as AgentRunState[]).forEach((state) => {
        if (state.status === "completed" && state.duration !== undefined) {
          const modelName = state.model || "gemini-3.5-flash";
          if (!durationsByModel[modelName]) {
            durationsByModel[modelName] = {
              totalDuration: 0,
              count: 0,
              min: state.duration,
              max: state.duration
            };
          }
          durationsByModel[modelName].totalDuration += state.duration;
          durationsByModel[modelName].count += 1;
          durationsByModel[modelName].min = Math.min(durationsByModel[modelName].min, state.duration);
          durationsByModel[modelName].max = Math.max(durationsByModel[modelName].max, state.duration);
        }
      });
    });

    return Object.entries(durationsByModel)
      .map(([model, info]) => {
        const avgMs = info.totalDuration / info.count;
        return {
          model,
          avgSeconds: parseFloat((avgMs / 1000).toFixed(2)),
          avgMs: Math.round(avgMs),
          count: info.count,
          minSeconds: parseFloat((info.min / 1000).toFixed(2)),
          maxSeconds: parseFloat((info.max / 1000).toFixed(2))
        };
      })
      .sort((a, b) => b.avgSeconds - a.avgSeconds); // Sort descending by average duration
  }, [pastRuns]);

  // Filter history
  const filteredRuns = useMemo(() => {
    return pastRuns
      .filter((run) => {
        if (logTab === "single" && run.isBatch) return false;
        if (logTab === "batch" && !run.isBatch) return false;

        const query = searchTerm.toLowerCase();
        const nameMatch = (run.workflowName || "Unknown Workflow").toLowerCase().includes(query);
        const inputMatch = run.globalInput.toLowerCase().includes(query);
        return nameMatch || inputMatch;
      })
      .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)); // Newest first
  }, [pastRuns, searchTerm, logTab]);

  // Group batch runs by batchGroupId
  const groupedBatchRuns = useMemo(() => {
    const batchGroups: Record<string, {
      groupId: string;
      workflowName: string;
      startedAt: number;
      completedAt: number;
      runs: WorkflowRun[];
      totalCount: number;
      successCount: number;
      failCount: number;
      totalDuration: number;
      totalChars: number;
    }> = {};

    pastRuns.forEach((run) => {
      if (run.isBatch && run.batchGroupId) {
        const groupId = run.batchGroupId;
        if (!batchGroups[groupId]) {
          batchGroups[groupId] = {
            groupId,
            workflowName: run.workflowName || "Custom Pipeline",
            startedAt: run.startedAt || Date.now(),
            completedAt: run.startedAt || Date.now(),
            runs: [],
            totalCount: 0,
            successCount: 0,
            failCount: 0,
            totalDuration: 0,
            totalChars: 0,
          };
        }

        const group = batchGroups[groupId];
        group.runs.push(run);
        group.totalCount++;
        
        if (run.status === "completed") {
          group.successCount++;
        } else {
          group.failCount++;
        }

        if (run.startedAt && run.startedAt < group.startedAt) {
          group.startedAt = run.startedAt;
        }
        if (run.startedAt && run.startedAt > group.completedAt) {
          group.completedAt = run.startedAt;
        }

        // Calculate total duration & chars
        let runDuration = 0;
        let runChars = 0;
        (Object.values(run.agentStates) as AgentRunState[]).forEach((s) => {
          if (s.duration) runDuration += s.duration;
          if (s.output) runChars += s.output.length;
        });
        group.totalDuration += runDuration;
        group.totalChars += runChars;
      }
    });

    return Object.values(batchGroups)
      .filter((group) => {
        if (!searchTerm) return true;
        const query = searchTerm.toLowerCase();
        return (
          group.workflowName.toLowerCase().includes(query) ||
          group.groupId.includes(query) ||
          group.runs.some((r) => r.globalInput.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => b.startedAt - a.startedAt);
  }, [pastRuns, searchTerm]);

  const toggleExpandRun = (id: string) => {
    setExpandedRunId(expandedRunId === id ? null : id);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Render horizontal bar chart for model frequency using clean SVG/HTML
  const maxModelCount = Math.max(...stats.modelLeaderboard.map((m) => m.count), 1);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-dot-grid">
      {/* Dashboard Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
              Execution Analytics & Performance
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deep metrics across previous cooperative pipeline invocations
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
          {/* Hidden File Input for Import */}
          <input
            type="file"
            id="import-history-input"
            accept=".json"
            onChange={handleImportJSON}
            className="hidden"
          />

          <button
            onClick={() => document.getElementById("import-history-input")?.click()}
            className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/20 hover:bg-slate-100 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-300 font-bold text-xs px-3.5 py-2 rounded-xl transition border border-slate-200/60 dark:border-slate-850 cursor-pointer shadow-2xs"
            title="Import execution history from a JSON backup file"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Backup
          </button>

          {pastRuns.length > 0 && (
            <>
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-bold text-xs px-3.5 py-2 rounded-xl transition border border-indigo-150 dark:border-indigo-900/30 cursor-pointer shadow-2xs"
                title="Export entire run history to a JSON backup file"
              >
                <Download className="w-3.5 h-3.5" />
                Export History
              </button>

              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete all historical run data?")) {
                    onClearHistory();
                  }
                }}
                className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 font-bold text-xs px-3.5 py-2 rounded-xl transition border border-rose-200/50 dark:border-rose-900/30 cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear History
              </button>
            </>
          )}

          <button
            onClick={onCloseDashboard}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs px-4 py-2 rounded-xl transition border border-slate-200 dark:border-slate-800 cursor-pointer shadow-sm"
          >
            Back to Canvas
          </button>
        </div>
      </div>

      {pastRuns.length === 0 ? (
        <div className="text-center py-20 px-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/60 dark:bg-slate-900/40">
          <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3.5 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Historical Run Data Available</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
            Launch multi-agent pipeline runs to begin collecting analytics, or import a previously exported past runs backup.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onCloseDashboard}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-indigo-100 border border-indigo-600 cursor-pointer"
            >
              Go to Pipeline Canvas
            </button>
            <button
              onClick={() => document.getElementById("import-history-input")?.click()}
              className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition border border-slate-200 dark:border-slate-800 cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-500" />
              Import Backup JSON
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CARD 1: Success Rate Gauge */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex items-center gap-4 transition-all hover:shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              {/* Radial Progress Ring */}
              <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="23"
                    className="stroke-slate-100 dark:stroke-slate-800 fill-none"
                    strokeWidth="4"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="23"
                    className="stroke-emerald-500 fill-none transition-all duration-500"
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 23}`}
                    strokeDashoffset={`${2 * Math.PI * 23 * (1 - stats.successRate / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-xs font-bold font-mono text-slate-850 dark:text-slate-100">
                  {stats.successRate}%
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                  Total Success Rate
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-sans">
                    {stats.completed}
                  </span>
                  <span className="text-xs text-slate-500">of {stats.total} runs</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[9px] font-semibold text-slate-500">
                  <span className="flex items-center gap-0.5 text-emerald-600">
                    <CheckCircle2 className="w-2.5 h-2.5" /> {stats.completed} OK
                  </span>
                  <span className="flex items-center gap-0.5 text-rose-500">
                    <XCircle className="w-2.5 h-2.5" /> {stats.failed} FAIL
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 2: Total Run Invocations */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex items-center gap-4 transition-all hover:shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100/80 dark:border-indigo-900/40 shrink-0">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                  Total Run Invocations
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 font-sans">
                  {stats.total}
                </h3>
                <p className="text-[10px] font-medium text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                  <Database className="w-3 h-3 text-slate-400" /> Persistent log active
                </p>
              </div>
            </div>

            {/* CARD 3: Avg Agent Latency */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex items-center gap-4 transition-all hover:shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100/80 dark:border-sky-900/40 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                  Avg Agent Latency
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 font-mono">
                  {(stats.avgLatency / 1000).toFixed(2)}s
                </h3>
                <p className="text-[10px] font-medium text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                  <Zap className="w-3 h-3 text-amber-500 animate-bounce" /> {stats.avgLatency} ms avg per node
                </p>
              </div>
            </div>

            {/* CARD 4: Total API Spend & Token Tracking */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex items-center gap-4 transition-all hover:shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100/80 dark:border-amber-900/40 shrink-0">
                <FileText className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                  Estimated API Investment
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 font-mono">
                  ${stats.totalCost.toFixed(6)}
                </h3>
                <p className="text-[9px] font-semibold text-slate-500 mt-0.5 flex flex-wrap items-center gap-1 font-mono">
                  <span>In: {stats.totalPromptTokens.toLocaleString()} tkn</span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span>Out: {stats.totalCompletionTokens.toLocaleString()} tkn</span>
                </p>
              </div>
            </div>
          </div>

          {/* Scalability & Enterprise Orchestration Banner */}
          <div className="bg-linear-to-r from-indigo-500/10 via-sky-500/5 to-transparent border border-indigo-100 dark:border-indigo-950 rounded-2xl p-6 shadow-2xs relative overflow-hidden transition-all duration-200 hover:shadow-xs">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-mono text-[9px] font-bold border border-indigo-100/40 dark:border-indigo-900/40 uppercase tracking-wider">
                  <Bot className="w-3 h-3 text-indigo-500" /> Scalability & Orchestration Engine
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-sans tracking-tight">
                  How Multi-Agent Studio Scales to Massive Networks
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Our core state-chaining backplane is optimized to orchestrate complex DAG topologies. When executing larger pipelines, parent nodes propagate structured outputs to downstream siblings via low-latency memory caching.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
                <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 p-3.5 rounded-xl text-center space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase font-mono tracking-wider">State Resolution</span>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Sub-1ms</div>
                  <span className="text-[8px] text-emerald-500 font-semibold font-mono">Ultra-Low Latency</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 p-3.5 rounded-xl text-center space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase font-mono tracking-wider">Max Node Capacity</span>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Unlimited</div>
                  <span className="text-[8px] text-indigo-500 font-semibold font-mono">Dynamic DAG Scaling</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 p-3.5 rounded-xl text-center space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase font-mono tracking-wider">Memory Backplane</span>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Contextual</div>
                  <span className="text-[8px] text-sky-500 font-semibold font-mono">Dynamic Blending</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 p-3.5 rounded-xl text-center space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase font-mono tracking-wider">Batch Capability</span>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Parallelized</div>
                  <span className="text-[8px] text-amber-500 font-semibold font-mono">Multi-Threaded Queue</span>
                </div>
              </div>
            </div>
          </div>

          {/* Model Popularity Leaderboard & Visual Trend Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Visual 1: Model Usage Leaderboard */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs transition-colors duration-200">
              <div className="flex items-center gap-2 mb-4.5">
                <Layers className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 font-sans">
                  Model Usage Frequency Leaderboard
                </h3>
              </div>

              {stats.modelLeaderboard.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 font-mono">
                  No model usage metrics recorded.
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.modelLeaderboard.map((item, idx) => {
                    const widthPercent = (item.count / maxModelCount) * 100;
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-[10px] text-indigo-600 font-bold border border-slate-200 dark:border-slate-850">
                              {idx + 1}
                            </span>
                            {item.name}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 font-bold">
                            {item.count} step{item.count !== 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Bar chart bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-200/50 dark:border-slate-850">
                          <div
                             className="bg-indigo-600 h-full rounded-full transition-all duration-500 flex items-center justify-end px-1.5"
                             style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Visual 2: Model Avg Execution Duration comparison (Recharts) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs transition-colors duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4.5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 font-sans">
                      Gemini Model Execution Latency
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold uppercase tracking-wider">
                    Successful runs
                  </span>
                </div>

                {modelDurationData.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 font-mono border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                    No successful run latency data available.
                  </div>
                ) : (
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={modelDurationData}
                        layout="vertical"
                        margin={{ top: 5, right: 15, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" className="dark:hidden" />
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" className="hidden dark:block" />
                        <XAxis
                          type="number"
                          tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                          tickLine={{ stroke: '#cbd5e1' }}
                          axisLine={{ stroke: '#cbd5e1' }}
                          className="dark:stroke-slate-700"
                          unit="s"
                        />
                        <YAxis
                          type="category"
                          dataKey="model"
                          tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                          tickLine={false}
                          axisLine={{ stroke: '#cbd5e1' }}
                          className="dark:stroke-slate-700"
                          width={110}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-slate-900 dark:bg-slate-950 text-white p-3 rounded-xl border border-slate-850 text-[10px] font-mono shadow-xl space-y-1">
                                  <p className="font-bold text-indigo-400 font-sans text-xs">{data.model}</p>
                                  <div className="h-px bg-slate-800 my-1" />
                                  <p><span className="text-slate-400">Avg Duration:</span> <span className="font-bold text-emerald-400">{data.avgSeconds}s</span> ({data.avgMs} ms)</p>
                                  <p><span className="text-slate-400">Min Duration:</span> {data.minSeconds}s</p>
                                  <p><span className="text-slate-400">Max Duration:</span> {data.maxSeconds}s</p>
                                  <p><span className="text-slate-400">Total Steps:</span> {data.count}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="avgSeconds"
                          radius={[0, 4, 4, 0]}
                        >
                          {modelDurationData.map((entry, index) => {
                            const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
                            const color = colors[index % colors.length];
                            return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-850 pt-2.5 mt-3.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                <span>Metrics grouped by model</span>
                <span>Avg latency per step</span>
              </div>
            </div>

            {/* Visual 3: Run Outcomes History Trend Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs transition-colors duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4.5">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 font-sans">
                      Recent Sequential Execution Outcomes
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold uppercase tracking-wider">
                    Last {Math.min(pastRuns.length, 12)} runs
                  </span>
                </div>

                {/* SVG Outcome Area Chart */}
                <div className="h-28 w-full flex items-end gap-2.5 pt-4">
                  {pastRuns.slice(-12).map((run, idx) => {
                    // Collect run statistics
                    let stepsSucceeded = 0;
                    let stepsFailed = 0;
                    let runTotalLatency = 0;

                    Object.values(run.agentStates).forEach((state) => {
                      if (state.status === "completed") stepsSucceeded++;
                      if (state.status === "failed") stepsFailed++;
                      if (state.duration) runTotalLatency += state.duration;
                    });

                    const totalAgentSteps = stepsSucceeded + stepsFailed || 1;
                    const fillPercent = run.status === "completed" ? 100 : (stepsSucceeded / totalAgentSteps) * 100;

                    return (
                      <div key={run.id} className="flex-1 flex flex-col items-center gap-1.5 h-full group relative">
                        {/* Tooltip Overlay */}
                        <div className="absolute bottom-full mb-1 bg-slate-900 text-white rounded px-2 py-1 text-[9px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none z-10 shadow-lg border border-slate-850">
                          <p className="font-bold text-indigo-400">{run.workflowName || "Workflow Run"}</p>
                          <p>Status: <span className={run.status === "completed" ? "text-emerald-400" : "text-rose-400"}>{run.status.toUpperCase()}</span></p>
                          <p>Duration: {(runTotalLatency / 1000).toFixed(2)}s</p>
                          <p>Date: {formatDate(run.startedAt)}</p>
                        </div>

                        {/* Bar Pillar visual */}
                        <div className="w-full flex-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-md overflow-hidden flex flex-col justify-end group-hover:scale-105 transition-all duration-200">
                          <div
                            className={`w-full rounded-b-md transition-all duration-500 ${
                              run.status === "completed"
                                ? "bg-emerald-500"
                                : run.status === "failed"
                                ? "bg-rose-500"
                                : "bg-indigo-400"
                            }`}
                            style={{ height: `${Math.max(fillPercent, 10)}%` }}
                          />
                        </div>

                        {/* Tiny Indicator badge */}
                        <span className="text-[8px] font-mono text-slate-400 font-semibold">
                          #{idx + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-850 pt-2.5 mt-3.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Completed Run
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Failed Run
                  </span>
                </div>
                <span>Hover bars to audit details</span>
              </div>
            </div>
          </div>

          {/* Historical Runs Audited Logs Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xs transition-colors duration-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Database className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 font-sans">
                  Pipeline Execution Log History
                </h3>
              </div>

              {/* Log Search Filter & Tabs */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-850/50 text-[10px] font-mono">
                  <button
                    onClick={() => setLogTab("all")}
                    className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                      logTab === "all"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs border border-slate-200/20"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    All ({pastRuns.length})
                  </button>
                  <button
                    onClick={() => setLogTab("single")}
                    className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                      logTab === "single"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs border border-slate-200/20"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    Single Runs ({pastRuns.filter((r) => !r.isBatch).length})
                  </button>
                  <button
                    onClick={() => setLogTab("batch")}
                    className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                      logTab === "batch"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs border border-slate-200/20"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    Batch Analytics ({new Set(pastRuns.filter((r) => r.isBatch && r.batchGroupId).map((r) => r.batchGroupId)).size})
                  </button>
                </div>

                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search workflow runs or inputs..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            </div>

            {logTab === "batch" ? (
              groupedBatchRuns.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500 font-mono">
                  No batch executions found. Run pipelines in Batch Mode to populate analytics.
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedBatchRuns.map((group) => {
                    const isGroupExpanded = expandedRunId === group.groupId;
                    const successRate = Math.round((group.successCount / group.totalCount) * 100);

                    return (
                      <div
                        key={group.groupId}
                        className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                          isGroupExpanded
                            ? "bg-indigo-50/5 dark:bg-slate-950/10 border-indigo-500/40"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        {/* Group Header Row */}
                        <div
                          onClick={() => toggleExpandRun(group.groupId)}
                          className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100/60 dark:border-indigo-900/40 shrink-0">
                              <Layers className="w-4.5 h-4.5" />
                            </div>
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-sans flex flex-wrap items-center gap-2">
                                Batch Run: {group.workflowName}
                                <span className="text-[9px] font-mono bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded-md font-bold">
                                  {group.totalCount} Inputs Sequenced
                                </span>
                              </h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                Batch Group ID: <span className="font-mono text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold">#{group.groupId.slice(-6)}</span> &bull; {formatDate(group.startedAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap text-[10px] font-mono text-slate-500 self-end md:self-auto">
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-slate-850">
                              <span className="text-slate-400">Success Rate:</span>
                              <span className={`font-bold ${successRate === 100 ? "text-emerald-500" : group.failCount > 0 ? "text-amber-500" : "text-indigo-500"}`}>
                                {successRate}% ({group.successCount}/{group.totalCount})
                              </span>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-slate-850">
                              <span className="text-slate-400">Duration:</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                {(group.totalDuration / 1000).toFixed(2)}s
                              </span>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-slate-850">
                              <span className="text-slate-400">Output Size:</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                {group.totalChars.toLocaleString()} Chars
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm("Delete this entire batch sequence from history?")) {
                                    group.runs.forEach((r) => onDeleteRun(r.id));
                                  }
                                }}
                                className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Delete Batch Run Group"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              {isGroupExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Aggregated Batch Detail List */}
                        {isGroupExpanded && (
                          <div className="px-4 pb-4 pt-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 space-y-3">
                            <div className="space-y-1">
                              <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                                Batch Aggregated Inputs & Status Summary
                              </h5>
                              <p className="text-[10px] text-slate-500 italic">
                                This batch processed {group.totalCount} prompt inputs. Below is the list of runs generated for each input. Click any run to expand its timeline and outputs.
                              </p>
                            </div>

                            <div className="space-y-2 border-l border-indigo-100 dark:border-indigo-900 ml-2 pl-4 py-1">
                              {group.runs.sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0)).map((run, runIndex) => {
                                const runTotalDuration = (Object.values(run.agentStates) as AgentRunState[]).reduce(
                                  (acc, s) => acc + (s.duration || 0),
                                  0
                                );
                                const numNodes = Object.keys(run.agentStates).length;
                                const isRunExpanded = expandedRunId === `${group.groupId}-${run.id}`;

                                return (
                                  <div
                                    key={run.id}
                                    className="border border-slate-200/60 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-3xs"
                                  >
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedRunId(isRunExpanded ? null : `${group.groupId}-${run.id}`);
                                      }}
                                      className="p-3 flex items-center justify-between gap-4 cursor-pointer select-none"
                                    >
                                      <div className="flex items-center gap-2.5 truncate">
                                        <span className="text-[10px] font-mono text-indigo-500 font-bold shrink-0">
                                          #{runIndex + 1}
                                        </span>
                                        {run.status === "completed" ? (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        ) : (
                                          <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                        )}
                                        <p className="text-xs text-slate-700 dark:text-slate-300 italic font-sans font-medium truncate max-w-sm md:max-w-xl">
                                          Input Prompt: &ldquo;{run.globalInput}&rdquo;
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-slate-400">
                                        <span className="bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded text-slate-500">
                                          {(runTotalDuration / 1000).toFixed(2)}s
                                        </span>
                                        <span className="bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded text-slate-500">
                                          {numNodes} Nodes
                                        </span>
                                        {isRunExpanded ? (
                                          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                                        ) : (
                                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                        )}
                                      </div>
                                    </div>

                                    {/* Expanded run timeline nested */}
                                    {isRunExpanded && (
                                      <div className="px-4 pb-4 pt-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                                        <div className="space-y-2">
                                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                                            Sequential Node Execution timeline
                                          </span>

                                          <div className="space-y-2.5 relative border-l border-indigo-50 dark:border-indigo-950 ml-2 pl-4 py-1">
                                            {(Object.entries(run.agentStates) as [string, AgentRunState][]).map(([agentId, state]) => {
                                              return (
                                                <div key={agentId} className="relative space-y-1">
                                                  {/* Timeline dot */}
                                                  <span className="absolute -left-[21px] top-1 w-2 h-2 rounded-full border bg-white dark:bg-slate-900 border-indigo-500" />

                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <h5 className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                                                      Node ID: {state.agentId}
                                                    </h5>
                                                    <span className="text-[8px] font-mono bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 px-1 py-0.2 rounded text-indigo-700 dark:text-indigo-400">
                                                      {state.model || "gemini-3.5-flash"}
                                                    </span>
                                                    {state.duration && (
                                                      <span className="text-[8px] font-mono text-slate-400">
                                                        ({state.duration} ms)
                                                      </span>
                                                    )}
                                                    {state.cost !== undefined && (
                                                      <span className="text-[8px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
                                                        (${state.cost.toFixed(6)})
                                                      </span>
                                                    )}
                                                    {state.tokens && (
                                                      <span className="text-[8px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                                                        ({state.tokens.input + state.tokens.output} tkn)
                                                      </span>
                                                    )}
                                                  </div>

                                                  {state.error ? (
                                                    <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 p-2.5 rounded-xl text-xs font-mono text-rose-700 dark:text-rose-400 leading-normal">
                                                      Error: {state.error}
                                                    </div>
                                                  ) : (
                                                    state.output && (
                                                      <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 p-3 rounded-xl text-xs text-slate-600 dark:text-slate-400 font-sans shadow-2xs max-h-36 overflow-y-auto whitespace-pre-wrap select-text leading-relaxed">
                                                        {state.output}
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Traditional log view */
              filteredRuns.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500 font-mono">
                  No matching runs found for your search query.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRuns.map((run) => {
                    const isExpanded = expandedRunId === run.id;
                    const runTotalDuration = (Object.values(run.agentStates) as AgentRunState[]).reduce(
                      (acc, s) => acc + (s.duration || 0),
                      0
                    );

                    // Count of nodes
                    const numNodes = Object.keys(run.agentStates).length;

                    return (
                      <div
                        key={run.id}
                        className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                          isExpanded
                            ? "bg-slate-50/40 dark:bg-slate-950/20 border-indigo-500/40"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        {/* Grid Header Row */}
                        <div
                          onClick={() => toggleExpandRun(run.id)}
                          className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            {run.status === "completed" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            )}

                            <div className="space-y-0.5">
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-sans flex flex-wrap items-center gap-2">
                                {run.workflowName || "Custom Pipeline"}
                                <span className="text-[9px] bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono px-1.5 py-0.5 rounded">
                                  {numNodes} Node{numNodes !== 1 ? "s" : ""}
                                </span>
                                {run.isBatch && (
                                  <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400 font-mono px-1.5 py-0.5 rounded font-bold animate-pulse">
                                    Batch Run
                                  </span>
                                )}
                              </h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-xs md:max-w-lg italic">
                                Starting prompt: &ldquo;{run.globalInput}&rdquo;
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 md:self-auto self-end text-[10px] font-mono text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {formatDate(run.startedAt)}
                            </span>

                            <span className="bg-slate-50 dark:bg-slate-950 px-2 py-0.5 border border-slate-200 dark:border-slate-850 rounded font-semibold text-slate-600 dark:text-slate-300">
                              {(runTotalDuration / 1000).toFixed(2)}s
                            </span>

                            <div className="flex items-center gap-1.5 pl-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm("Delete this single past run from logs?")) {
                                    onDeleteRun(run.id);
                                  }
                                }}
                                className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Delete Run Data"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expandable Agent Runs Details Panel */}
                        {isExpanded && (
                          <div className="px-4 pb-4.5 pt-1 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3.5">
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                                Starting Global Seed Instructions
                              </span>
                              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans shadow-2xs select-text">
                                {run.globalInput}
                              </div>
                            </div>

                            <div className="space-y-2.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                                Sequential Node Audit Timeline
                              </span>

                              <div className="space-y-2.5 relative border-l border-indigo-100 dark:border-indigo-900/50 ml-2.5 pl-4.5 py-1">
                                {(Object.entries(run.agentStates) as [string, AgentRunState][]).map(([agentId, state]) => {
                                  return (
                                    <div key={agentId} className="relative space-y-1">
                                      {/* Timeline dot */}
                                      <span className="absolute -left-7 top-1 w-2.5 h-2.5 rounded-full border bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-50 dark:ring-indigo-950" />

                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                          Node ID: {state.agentId}
                                        </h5>
                                        <span className="text-[9px] font-mono bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300">
                                          {state.model || "gemini-3.5-flash"}
                                        </span>
                                        {state.duration && (
                                          <span className="text-[9px] font-mono text-slate-500">
                                            ({state.duration} ms)
                                          </span>
                                        )}
                                        {state.cost !== undefined && (
                                          <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
                                            (${state.cost.toFixed(6)})
                                          </span>
                                        )}
                                        {state.tokens && (
                                          <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                                            ({state.tokens.input + state.tokens.output} tkn)
                                          </span>
                                        )}
                                        {state.status === "completed" ? (
                                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 px-1.5 py-0.5 rounded">
                                            ✓ COMPLETED
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 px-1.5 py-0.5 rounded">
                                            ✗ FAILED
                                          </span>
                                        )}
                                      </div>

                                      {state.error ? (
                                        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 p-2.5 rounded-xl text-xs font-mono text-rose-700 dark:text-rose-400 leading-normal">
                                          Error: {state.error}
                                        </div>
                                      ) : (
                                        state.output && (
                                          <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 p-3 rounded-xl text-xs text-slate-600 dark:text-slate-400 font-sans shadow-2xs max-h-48 overflow-y-auto whitespace-pre-wrap select-text leading-relaxed">
                                            {state.output}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
