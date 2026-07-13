import React, { useState } from "react";
import { ArrowDown, Bot, Edit2, Play, Settings, Trash2, ArrowUp, Plus, ArrowRight, HelpCircle, HelpCircle as HelpIcon, Sparkles, Copy, GripVertical } from "lucide-react";
import { Agent, Workflow, WorkflowRun, WorkflowVersion } from "../types";
import VisualConnectionMap from "./VisualConnectionMap";

interface WorkflowCanvasProps {
  workflow: Workflow;
  activeRun: WorkflowRun | null;
  versions: WorkflowVersion[];
  onUpdateWorkflowMetadata: (name: string, description: string) => void;
  onAddAgent: () => void;
  onEditAgent: (agentId: string) => void;
  onDeleteAgent: (agentId: string) => void;
  onCloneAgent: (agentId: string) => void;
  onMoveAgentUp: (index: number) => void;
  onMoveAgentDown: (index: number) => void;
  onReorderAgents: (agents: Agent[]) => void;
  onSaveVersion: (workflowId: string, name: string, description: string) => void;
  onRestoreVersion: (version: WorkflowVersion) => void;
  onDeleteVersion: (versionId: string) => void;
}

export default function WorkflowCanvas({
  workflow,
  activeRun,
  versions,
  onUpdateWorkflowMetadata,
  onAddAgent,
  onEditAgent,
  onDeleteAgent,
  onCloneAgent,
  onMoveAgentUp,
  onMoveAgentDown,
  onReorderAgents,
  onSaveVersion,
  onRestoreVersion,
  onDeleteVersion,
}: WorkflowCanvasProps) {
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  
  // Versions display state
  const [showVersions, setShowVersions] = useState(false);
  const [newVersionName, setNewVersionName] = useState("");
  const [newVersionDesc, setNewVersionDesc] = useState("");

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number, e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") || 
      target.closest("input") || 
      target.closest("select") || 
      target.closest("textarea") || 
      target.closest("a")
    ) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (targetIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    
    if (draggedIndex !== targetIndex) {
      const updatedAgents = [...workflow.agents];
      const [draggedItem] = updatedAgents.splice(draggedIndex, 1);
      updatedAgents.splice(targetIndex, 0, draggedItem);
      onReorderAgents(updatedAgents);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Filter versions specifically for the active workflow
  const workflowVersions = versions.filter((v) => v.workflowId === workflow.id);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateWorkflowMetadata(e.target.value, workflow.description);
  };

  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateWorkflowMetadata(workflow.name, e.target.value);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-dot-grid">
      {/* Workflow Metadata Configuration Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-colors duration-200">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Workflow Configuration</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider font-mono">Workflow Name</label>
            <input
              type="text"
              value={workflow.name}
              onChange={handleNameChange}
              placeholder="e.g. Content Writer Assistant"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider font-mono">Description / Goal</label>
            <textarea
              rows={2}
              value={workflow.description}
              onChange={handleDescChange}
              placeholder="Describe the overall objective of this collaborative pipeline..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all duration-200 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Toggle Version Control */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Version Snapshots</span>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              {workflowVersions.length} saved
            </span>
          </div>
          <button
            onClick={() => setShowVersions(!showVersions)}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition flex items-center gap-1 cursor-pointer"
          >
            {showVersions ? "Hide Version History" : "Manage Versions / Snapshots"}
          </button>
        </div>

        {showVersions && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/85 grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Save New Version Form */}
            <div className="md:col-span-4 bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 space-y-3 animate-fadeIn">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">Save Current Pipeline</h4>
              <div className="space-y-2.5">
                <div>
                  <input
                    type="text"
                    value={newVersionName}
                    onChange={(e) => setNewVersionName(e.target.value)}
                    placeholder="Snapshot note (e.g., Stable v1.0)"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <textarea
                    rows={2}
                    value={newVersionDesc}
                    onChange={(e) => setNewVersionDesc(e.target.value)}
                    placeholder="What did you configure or change? (optional)"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 transition resize-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSaveVersion(workflow.id, newVersionName, newVersionDesc);
                    setNewVersionName("");
                    setNewVersionDesc("");
                  }}
                  className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save as New Version</span>
                  <kbd className="ml-1 opacity-80 text-[9px] px-1.5 py-0.5 rounded bg-indigo-700 text-indigo-100 font-mono font-bold border border-indigo-500 shadow-3xs">Ctrl+S</kbd>
                </button>
              </div>
            </div>

            {/* Versions List */}
            <div className="md:col-span-8 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">Saved Snapshots History</h4>
              
              {workflowVersions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50/20 dark:bg-slate-950/10">
                  <p className="text-xs font-semibold">No version snapshots saved yet.</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Use the form on the left to capture a restore point.</p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {workflowVersions.map((v) => (
                    <div
                      key={v.id}
                      className="bg-slate-50/40 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-200/60 dark:border-slate-850/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/30">
                            v{v.versionNumber}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {v.name}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            {formatTime(v.createdAt)}
                          </span>
                        </div>
                        {v.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-1">
                            {v.description}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 pl-1">
                          <Bot className="w-3 h-3" />
                          <span>{v.agents.length} Agent Node{v.agents.length !== 1 ? "s" : ""}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={() => onRestoreVersion(v)}
                          className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/30 font-bold text-xs px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => onDeleteVersion(v.id)}
                          className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                          title="Delete snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Visual Agent Pipe Sections */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-slate-200/80 dark:border-slate-850 pb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-sans">Agent Sequence Blueprint</h2>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* View Mode Tabs Selector */}
            {workflow.agents.length > 0 && (
              <div className="bg-slate-100 dark:bg-slate-950 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-850 flex shadow-2xs">
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "list"
                      ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  List Layout
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "map"
                      ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Connection Map
                </button>
              </div>
            )}

            <button
              onClick={onAddAgent}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition border border-indigo-600 shadow-sm shadow-indigo-100 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Node</span>
              <kbd className="opacity-80 text-[8px] px-1 py-0.5 rounded bg-indigo-700 text-indigo-100 font-mono font-bold border border-indigo-500 shadow-3xs">Ctrl+Shift+A</kbd>
            </button>
          </div>
        </div>

        {workflow.agents.length === 0 ? (
          <div className="text-center py-12 px-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/60 dark:bg-slate-900/40">
            <Bot className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3 animate-bounce" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Agents in Pipeline</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Add at least one intelligent agent node to establish your multi-agent architecture.
            </p>
            <button
              onClick={onAddAgent}
              className="mt-4 inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold text-xs px-4 py-2 rounded-xl transition border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Your First Agent
            </button>
          </div>
        ) : viewMode === "map" ? (
          <VisualConnectionMap workflow={workflow} activeRun={activeRun} />
        ) : (
          <div className="space-y-4 relative">
            {workflow.agents.map((agent, index) => {
              const runState = activeRun?.agentStates[agent.id];
              const isRunning = runState?.status === "running";
              const isCompleted = runState?.status === "completed";
              const isFailed = runState?.status === "failed";

              // Find input agent name
              const inputAgent = workflow.agents.find((a) => a.id === agent.inputAgentId);

              const isDragSource = draggedIndex === index;
              const isDragTarget = dragOverIndex === index && draggedIndex !== index;

              return (
                <div
                  key={agent.id}
                  className={`relative transition-all duration-200 ${
                    isDragSource ? "opacity-30 scale-[0.99] border-dashed" : ""
                  }`}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(index, e)}
                  onDragOver={(e) => handleDragOver(index, e)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(index, e)}
                >
                  {/* Visual Connection Arrow Bridge */}
                  {index > 0 && (
                    <div className="flex justify-center -my-1 relative z-10">
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-xs text-[10px] font-mono font-bold tracking-wider uppercase transition-colors duration-200">
                        <ArrowDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400 animate-bounce" />
                        <span className="text-slate-500 dark:text-slate-400">Context Flow</span>
                      </div>
                    </div>
                  )}

                  {/* Individual Node Box */}
                  <div
                    className={`p-5 rounded-2xl border transition relative overflow-hidden transition-colors duration-200 ${
                      isRunning
                        ? "bg-indigo-50/10 dark:bg-indigo-950/20 border-indigo-500 dark:border-indigo-500 shadow-md shadow-indigo-100/10"
                        : isCompleted
                        ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
                        : isFailed
                        ? "bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/50"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                    } ${
                      isDragTarget
                        ? "border-indigo-500 dark:border-indigo-400 bg-indigo-50/10 dark:bg-indigo-950/10 ring-2 ring-indigo-500/15 border-dashed"
                        : ""
                    }`}
                  >
                    {/* Status accent glow */}
                    {isRunning && (
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 animate-pulse" />
                    )}
                    {isCompleted && (
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                    )}
                    {isFailed && (
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
                    )}

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Left: Metadata & Status */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <div
                            className="flex items-center justify-center cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                            title="Drag handle to reorder agent"
                          >
                            <GripVertical className="w-4 h-4 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 shrink-0" />
                          </div>
                          <span className="flex items-center justify-center w-5.5 h-5.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-indigo-600 dark:text-indigo-400 font-mono font-bold border border-slate-200 dark:border-slate-700">
                            {index + 1}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">{agent.name}</h3>
                          <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {agent.role}
                          </span>
                          <span className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/40">
                            {agent.model}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">
                          &ldquo;{agent.description || "No expertise bio provided."}&rdquo;
                        </p>

                        {/* Input Source visual representation */}
                        <div className="pt-1.5">
                          <div className="inline-flex items-center gap-1.5 bg-slate-50/80 dark:bg-slate-950/60 rounded-lg px-2.5 py-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400 dark:text-slate-500">INPUT:</span>
                            {agent.inputSource === "initial_input" && (
                              <span className="text-sky-600 dark:text-sky-400 font-semibold uppercase">Global Starting Input</span>
                            )}
                            {agent.inputSource === "previous_agent" && (
                              <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                                Output of Node {inputAgent ? inputAgent.name : "Previous Agent"}
                              </span>
                            )}
                            {agent.inputSource === "custom_blend" && (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                Dynamic Composite Blend
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 md:self-start self-end">
                        {/* Reordering */}
                        <div className="flex items-center bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 shadow-2xs">
                          <button
                            disabled={index === 0}
                            onClick={() => onMoveAgentUp(index)}
                            className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition disabled:opacity-30 disabled:hover:text-slate-500 disabled:hover:bg-transparent cursor-pointer"
                            title="Move Agent Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={index === workflow.agents.length - 1}
                            onClick={() => onMoveAgentDown(index)}
                            className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition disabled:opacity-30 disabled:hover:text-slate-500 disabled:hover:bg-transparent cursor-pointer"
                            title="Move Agent Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Edit, Clone & Delete */}
                        <div className="flex items-center bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 shadow-2xs">
                          <button
                            onClick={() => onEditAgent(agent.id)}
                            className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Edit Agent Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onCloneAgent(agent.id)}
                            className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Clone/Duplicate Agent"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteAgent(agent.id)}
                            className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                            title="Delete Agent"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Active agent run indicator */}
                    {isRunning && (
                      <div className="mt-4 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 rounded-xl px-4 py-2.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                        </span>
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium font-mono animate-pulse">
                          Generating response using Google Gemini...
                        </p>
                      </div>
                    )}

                    {/* Completion Statistics */}
                    {isCompleted && runState?.duration && (
                      <div className="mt-3 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-3">
                        <span>✓ Executed in {runState.duration}ms</span>
                        <span>• Output: {runState.output.length} chars</span>
                      </div>
                    )}

                    {/* Failure feedback */}
                    {isFailed && runState?.error && (
                      <div className="mt-3 text-xs bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 p-2.5 rounded-xl font-mono">
                        Error: {runState.error}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
