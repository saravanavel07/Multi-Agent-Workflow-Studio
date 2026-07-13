import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Copy, Check, Terminal, Clock, FileText, CheckCircle2, AlertCircle, Edit, ArrowRight, Activity, Layers, StopCircle, HelpCircle, CheckSquare, Zap } from "lucide-react";
import { Workflow, WorkflowRun } from "../types";

interface WorkflowRunnerProps {
  workflow: Workflow;
  globalInput: string;
  onGlobalInputChange: (val: string) => void;
  runState: WorkflowRun | null;
  onStartRun: () => void;
  onPauseRun: () => void;
  onResumeRun: () => void;
  onResetRun: () => void;
  onUpdateAgentOutput: (agentId: string, text: string) => void;
  // Batch props
  activeBatch: {
    groupId: string;
    inputs: string[];
    currentIndex: number;
    isRunning: boolean;
    results: { input: string; runId: string; status: "completed" | "failed" }[];
  } | null;
  onStartBatchRun: (inputs: string[]) => void;
  onCancelBatchRun: () => void;
}

// Custom High-Fidelity Mini-Markdown Parser
function MiniMarkdown({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  let inCodeBlock = false;
  let codeLines: string[] = [];

  const rendered = lines.map((line, idx) => {
    // Code block check
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false;
        const codeText = codeLines.join("\n");
        codeLines = [];
        return (
          <pre key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-indigo-200 overflow-x-auto my-3 select-text">
            <code>{codeText}</code>
          </pre>
        );
      } else {
        inCodeBlock = true;
        return null;
      }
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return null;
    }

    // Headers
    if (line.startsWith("### ")) {
      return (
        <h4 key={idx} className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4 mb-2 flex items-center gap-1.5 font-sans">
          {parseInline(line.slice(4))}
        </h4>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h3 key={idx} className="text-base font-bold text-indigo-700 dark:text-indigo-400 mt-5 mb-2.5 font-sans border-b border-slate-200 dark:border-slate-800 pb-1">
          {parseInline(line.slice(3))}
        </h3>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <h2 key={idx} className="text-lg font-bold text-indigo-800 dark:text-indigo-300 mt-6 mb-3 font-sans">
          {parseInline(line.slice(2))}
        </h2>
      );
    }

    // Bullet points
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      return (
        <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed ml-4 list-disc pl-1 my-1.5">
          {parseInline(line.trim().slice(2))}
        </li>
      );
    }

    // Numbered lists
    const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      return (
        <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed ml-4 list-decimal pl-1 my-1.5">
          {parseInline(numMatch[2])}
        </li>
      );
    }

    // Empty lines
    if (!line.trim()) {
      return <div key={idx} className="h-2" />;
    }

    // Standard paragraph
    return (
      <p key={idx} className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed my-2 select-text">
        {parseInline(line)}
      </p>
    );
  });

  return <div className="space-y-1 select-text">{rendered.filter(Boolean)}</div>;
}

// Parse bolding, code bits inline
function parseInline(text: string) {
  // Regex to match bold tags: **text**
  const boldRegex = /\*\*(.*?)\*\*/g;
  // Regex to match inline code tag: `code`
  const codeRegex = /`(.*?)`/g;

  let parts: (string | React.ReactNode)[] = [text];

  // Helper to replace string parts with components
  const replaceParts = (
    regex: RegExp,
    renderFn: (match: string, i: number) => React.ReactNode
  ) => {
    const newParts: (string | React.ReactNode)[] = [];
    parts.forEach((part) => {
      if (typeof part !== "string") {
        newParts.push(part);
        return;
      }

      let lastIndex = 0;
      let match;
      regex.lastIndex = 0; // reset regex
      let idx = 0;

      while ((match = regex.exec(part)) !== null) {
        if (match.index > lastIndex) {
          newParts.push(part.substring(lastIndex, match.index));
        }
        newParts.push(renderFn(match[1], idx++));
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < part.length) {
        newParts.push(part.substring(lastIndex));
      }
    });
    parts = newParts;
  };

  replaceParts(boldRegex, (match, i) => (
    <strong key={`b-${i}`} className="font-bold text-slate-800 dark:text-slate-200">
      {match}
    </strong>
  ));

  replaceParts(codeRegex, (match, i) => (
    <code key={`c-${i}`} className="bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-mono text-[10px] border border-slate-200 dark:border-slate-700">
      {match}
    </code>
  ));

  return <>{parts}</>;
}

export default function WorkflowRunner({
  workflow,
  globalInput,
  onGlobalInputChange,
  runState,
  onStartRun,
  onPauseRun,
  onResumeRun,
  onResetRun,
  onUpdateAgentOutput,
  activeBatch,
  onStartBatchRun,
  onCancelBatchRun,
}: WorkflowRunnerProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [runMode, setRunMode] = useState<"single" | "batch">("single");
  const [batchInputText, setBatchInputText] = useState(
    "Write an intro for a blog about React 19\nWrite an intro for a blog about Vite 6\nWrite an intro for a blog about Gemini 2.5"
  );

  const isRunning = runState?.status === "running";
  const isPaused = runState?.status === "paused";
  const isCompleted = runState?.status === "completed";
  const isFailed = runState?.status === "failed";

  // Clock elapsed timer
  useEffect(() => {
    if (isRunning) {
      const start = Date.now() - (runState.startedAt || Date.now());
      setElapsed(Math.floor(start / 1000));
      timerRef.current = setInterval(() => {
        const current = Date.now() - (runState.startedAt || Date.now());
        setElapsed(Math.floor(current / 1000));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (!runState || runState.status === "idle") {
        setElapsed(0);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, runState]);

  const handleCopyText = (agentId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(agentId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEdit = (agentId: string, text: string) => {
    setEditingAgentId(agentId);
    setEditText(text);
  };

  const saveEdit = (agentId: string) => {
    onUpdateAgentOutput(agentId, editText);
    setEditingAgentId(null);
  };

  // Progress Calculations
  const totalAgents = workflow.agents.length;
  const completedAgents = runState
    ? Object.values(runState.agentStates).filter((s) => s.status === "completed").length
    : 0;
  const progressPercent = totalAgents > 0 ? (completedAgents / totalAgents) * 100 : 0;

  const batchInputs = batchInputText.split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <div className="w-full lg:w-110 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 shadow-xs transition-colors duration-200">
      {/* Configuration Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider font-mono">Pipeline Execution</h2>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        {!activeBatch?.isRunning && (
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl mb-4 border border-slate-200/50 dark:border-slate-850">
            <button
              onClick={() => setRunMode("single")}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                runMode === "single"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs border border-slate-200/20"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Single Run</span>
            </button>
            <button
              onClick={() => setRunMode("batch")}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                runMode === "batch"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs border border-slate-200/20"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Batch Mode</span>
            </button>
          </div>
        )}

        {/* Render Batch Active Dashboard */}
        {activeBatch && activeBatch.isRunning ? (
          <div className="bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/40 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-400 font-sans">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                </span>
                Processing Batch Pipeline...
              </div>
              <button
                onClick={onCancelBatchRun}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-bold border border-rose-100/50 dark:border-rose-900/30 transition cursor-pointer"
              >
                <StopCircle className="w-3.5 h-3.5" />
                Cancel Batch
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Overall Batch Progress</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {activeBatch.currentIndex + 1} / {activeBatch.inputs.length}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-2 border border-slate-200/50 dark:border-slate-800 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${((activeBatch.currentIndex) / activeBatch.inputs.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Current Input Prompt</span>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium italic line-clamp-2 leading-relaxed">
                &ldquo;{activeBatch.inputs[activeBatch.currentIndex]}&rdquo;
              </p>
            </div>

            {activeBatch.results.length > 0 && (
              <div className="text-[10px] font-mono text-slate-500 flex justify-between items-center border-t border-slate-100 dark:border-slate-800/60 pt-2">
                <span>Sequence Results:</span>
                <div className="flex gap-2">
                  <span className="text-emerald-500 font-bold">
                    ✓ {activeBatch.results.filter((r) => r.status === "completed").length} Success
                  </span>
                  {activeBatch.results.some((r) => r.status === "failed") && (
                    <span className="text-rose-500 font-bold">
                      ✗ {activeBatch.results.filter((r) => r.status === "failed").length} Fail
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : runMode === "batch" ? (
          /* Batch Entry Form */
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                  Batch Starting Prompts (One per line)
                </label>
                <span className="text-[9px] font-mono text-indigo-500 font-bold">
                  {batchInputs.length} prompts detected
                </span>
              </div>
              <textarea
                rows={4}
                value={batchInputText}
                onChange={(e) => setBatchInputText(e.target.value)}
                placeholder="Enter prompts, one on each line..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition resize-none leading-relaxed"
              />
              <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal italic">
                The active workflow will be initiated sequentially for each of the non-empty lines written above. Results are aggregated in the Analytics Dashboard.
              </p>
            </div>

            <button
              onClick={() => onStartBatchRun(batchInputs)}
              disabled={batchInputs.length === 0 || totalAgents === 0}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer shadow-md shadow-indigo-100 border border-indigo-600"
            >
              <Layers className="w-4 h-4" />
              <span>Launch Batch Sequence ({batchInputs.length})</span>
            </button>
          </div>
        ) : (
          /* Traditional Single Execution */
          <>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                Starting Input Prompt
              </label>
              <textarea
                rows={3}
                disabled={isRunning}
                value={globalInput}
                onChange={(e) => onGlobalInputChange(e.target.value)}
                placeholder="Enter the primary instructions or seed content for the first agent..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition resize-none leading-relaxed disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {!runState || runState.status === "idle" ? (
                <button
                  onClick={onStartRun}
                  disabled={!globalInput.trim() || totalAgents === 0}
                  className="col-span-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer shadow-md shadow-indigo-100 border border-indigo-600"
                >
                  <Play className="w-4.5 h-4.5 text-white" />
                  <span>Launch Pipeline</span>
                  <kbd className="ml-1 opacity-80 text-[9px] px-1.5 py-0.5 rounded bg-indigo-700 text-indigo-100 font-mono font-bold tracking-normal border border-indigo-500 shadow-3xs">
                    Ctrl+R
                  </kbd>
                </button>
              ) : (
                <>
                  {isRunning ? (
                    <button
                      onClick={onPauseRun}
                      className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs py-2 px-4 rounded-xl transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <Pause className="w-4 h-4" />
                      Pause
                    </button>
                  ) : isPaused ? (
                    <button
                      onClick={onResumeRun}
                      className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition border border-indigo-600 cursor-pointer"
                    >
                      <Play className="w-4 h-4" />
                      <span>Resume</span>
                      <kbd className="ml-1 opacity-80 text-[9px] px-1.5 py-0.5 rounded bg-indigo-700 text-indigo-100 font-mono font-bold border border-indigo-500 shadow-3xs">Ctrl+R</kbd>
                    </button>
                  ) : (
                    <div />
                  )}

                  <button
                    onClick={onResetRun}
                    className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs py-2 px-4 rounded-xl transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset Run
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Progress Monitor Bar & Stats */}
      {runState && runState.status !== "idle" && (
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              Progress: {completedAgents}/{totalAgents} nodes
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{Math.round(progressPercent)}%</span>
          </div>

          {/* Visual Bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500 pt-1">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Time: <strong className="text-slate-700 dark:text-slate-300">{elapsed}s</strong></span>
            </div>
            <div className="flex items-center gap-1 justify-end">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>
                Cost:{" "}
                <strong className="text-slate-700 dark:text-slate-300">
                  ${Object.values(runState.agentStates).reduce((acc, s) => {
                    const costVal = (s as any).cost;
                    if (costVal !== undefined) return acc + costVal;
                    // Fallback estimation
                    const inp = Math.ceil((s.input?.length || 0) / 4.2);
                    const out = Math.ceil((s.output?.length || 0) / 4.2);
                    const modelToUse = (s as any).model || "gemini-3.5-flash";
                    const est = modelToUse.toLowerCase().includes("pro") 
                      ? (inp * 1.25 + out * 5) / 1000000 
                      : (inp * 0.075 + out * 0.3) / 1000000;
                    return acc + est;
                  }, 0).toFixed(6)}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Chars:{" "}
                <strong className="text-slate-700 dark:text-slate-300">
                  {Object.values(runState.agentStates).reduce((acc, s) => acc + (s.output?.length || 0), 0)}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-1 justify-end">
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                Tokens:{" "}
                <strong className="text-slate-700 dark:text-slate-300">
                  {Object.values(runState.agentStates).reduce((acc, s) => {
                    const tk = (s as any).tokens;
                    if (tk) return acc + tk.input + tk.output;
                    const inp = Math.ceil((s.input?.length || 0) / 4.2);
                    const out = Math.ceil((s.output?.length || 0) / 4.2);
                    return acc + inp + out;
                  }, 0).toLocaleString()}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Execution Log Feed */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 select-text bg-slate-50/20 dark:bg-slate-950/10">
        {(!runState || runState.status === "idle") ? (
          <div className="text-center py-24 px-4">
            <Terminal className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">Execution Log</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
              Design your sequence, specify starting guidelines, and hit &quot;Launch Pipeline&quot; to execute real-time multi-agent cooperation.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {workflow.agents.map((agent, index) => {
              const state = runState.agentStates[agent.id];
              if (!state || state.status === "idle") return null;

              const isAgentRunning = state.status === "running";
              const isAgentCompleted = state.status === "completed";
              const isAgentFailed = state.status === "failed";

              return (
                <div
                  key={agent.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isAgentRunning
                      ? "bg-indigo-50/10 dark:bg-indigo-950/10 border-indigo-500 shadow-sm shadow-indigo-100/10 ring-1 ring-indigo-500/20"
                      : isAgentCompleted
                      ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
                      : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
                  }`}
                >
                  {/* Card Header metadata */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      {isAgentRunning && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75 animate-bounce"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                        </span>
                      )}
                      {isAgentCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      {isAgentFailed && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}

                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 font-sans">
                        Node {index + 1}: {agent.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAgentCompleted && (
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1 mr-1">
                          <span>{state.duration ? `${state.duration}ms` : ""}</span>
                          {((state as any).cost !== undefined) && (
                            <>
                              <span>•</span>
                              <span className="text-amber-600 dark:text-amber-500 font-semibold">${((state as any).cost).toFixed(6)}</span>
                            </>
                          )}
                          {((state as any).tokens) && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                {((state as any).tokens.input + (state as any).tokens.output).toLocaleString()} tkn
                              </span>
                            </>
                          )}
                        </span>
                      )}

                      <span className="text-[9px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-750 font-mono">
                        {agent.role}
                      </span>

                      {isAgentCompleted && state.output && (
                        <div className="flex items-center gap-1.5">
                          {/* Clipboard button */}
                          <button
                            onClick={() => handleCopyText(agent.id, state.output)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                            title="Copy output"
                          >
                            {copiedId === agent.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Editable Output */}
                          <button
                            onClick={() => startEdit(agent.id, state.output)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                            title="Edit output response"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rendering Content */}
                  {isAgentRunning && (
                    <div className="space-y-2 pt-1">
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-full" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-5/6" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-4/5" />
                    </div>
                  )}

                  {isAgentFailed && (
                    <div className="text-xs font-mono text-rose-600 dark:text-rose-400 leading-relaxed bg-rose-50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/50">
                      Error: {state.error || "Execution crashed. Ensure API key is configured."}
                    </div>
                  )}

                  {isAgentCompleted && state.output && (
                    <div>
                      {editingAgentId === agent.id ? (
                        <div className="space-y-2">
                          <textarea
                            rows={6}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 font-mono outline-none resize-y"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingAgentId(null)}
                              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-[10px] font-bold rounded-lg transition cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEdit(agent.id)}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                            >
                              Save Output
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="prose max-w-none text-left select-text">
                          <MiniMarkdown content={state.output} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
