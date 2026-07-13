import React, { useEffect, useState } from "react";
import { X, Sparkles, Wand2, Info, Bot, Settings, Cpu, Coins, HelpCircle } from "lucide-react";
import { Agent, InputSourceType } from "../types";

interface AgentDrawerProps {
  isOpen: boolean;
  agent: Agent | null;
  precedingAgents: Agent[];
  onSave: (agent: Agent) => void;
  onClose: () => void;
}

export default function AgentDrawer({
  isOpen,
  agent,
  precedingAgents,
  onSave,
  onClose,
}: AgentDrawerProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [systemInstruction, setSystemInstruction] = useState("");
  const [model, setModel] = useState("gemini-3.5-flash");
  const [inputSource, setInputSource] = useState<InputSourceType>("initial_input");
  const [inputAgentId, setInputAgentId] = useState("");
  const [customBlendTemplate, setCustomBlendTemplate] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [generationError, setGenerationError] = useState("");

  // Sync state when agent props change
  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setRole(agent.role);
      setDescription(agent.description);
      setSystemInstruction(agent.systemInstruction);
      setModel(agent.model);
      setInputSource(agent.inputSource);
      setInputAgentId(agent.inputAgentId || "");
      setCustomBlendTemplate(agent.customBlendTemplate || "");
      setTemperature(agent.temperature);
    } else {
      // Default blank values for a new agent
      setName("Reviewer Agent");
      setRole("Quality Editor");
      setDescription("Reviews draft for clarity and tone.");
      setSystemInstruction("You are a helpful assistant.");
      setModel("gemini-3.5-flash");
      setInputSource(precedingAgents.length > 0 ? "previous_agent" : "initial_input");
      setInputAgentId(precedingAgents.length > 0 ? precedingAgents[precedingAgents.length - 1].id : "");
      setCustomBlendTemplate(
        "Analyze the original prompt: \"{initial_input}\"\n\nReview the preceding agent's output:\n{prev_output}"
      );
      setTemperature(0.5);
    }
    setGenerationError("");
  }, [agent, isOpen, precedingAgents]);

  if (!isOpen) return null;

  // Handle auto-generation of prompt using AI
  const handleAISuggestPrompt = async () => {
    if (!role) {
      setGenerationError("Please fill out the Agent Role first to guide the AI.");
      return;
    }
    setIsGeneratingPrompt(true);
    setGenerationError("");

    try {
      const response = await fetch("/api/suggest-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role, description }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from suggestion API");
      }

      const data = await response.json();
      if (data.prompt) {
        setSystemInstruction(data.prompt);
      } else {
        throw new Error("No prompt content in response");
      }
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "Failed to auto-generate prompt. Check server logs.");
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const savedAgent: Agent = {
      id: agent ? agent.id : `agent-${Date.now()}`,
      name: name.trim(),
      role: role.trim() || "Assistant",
      description: description.trim(),
      systemInstruction: systemInstruction.trim(),
      model,
      inputSource,
      inputAgentId: inputSource !== "initial_input" ? inputAgentId : undefined,
      customBlendTemplate: inputSource === "custom_blend" ? customBlendTemplate : undefined,
      temperature,
    };

    onSave(savedAgent);
    onClose();
  };

  // Token Pricing Estimation calculations
  const modelPricing: Record<string, { name: string; inputPerM: number; outputPerM: number }> = {
    "gemini-3.5-flash": { name: "Gemini 3.5 Flash", inputPerM: 0.075, outputPerM: 0.30 },
    "gemini-3.1-pro-preview": { name: "Gemini 3.1 Pro", inputPerM: 1.25, outputPerM: 5.00 },
    "gemini-3.1-flash-lite": { name: "Gemini 3.1 Flash Lite", inputPerM: 0.0375, outputPerM: 0.15 },
  };

  const getEstimates = () => {
    const systemInstructionWords = systemInstruction ? systemInstruction.trim().split(/\s+/).filter(Boolean).length : 0;
    const roleWords = role ? role.trim().split(/\s+/).filter(Boolean).length : 0;
    const descWords = description ? description.trim().split(/\s+/).filter(Boolean).length : 0;

    const promptBaseTokens = Math.round((systemInstructionWords + roleWords + descWords) * 1.3) + 15;

    let routingOverheadTokens = 150; // Direct starting prompt
    if (inputSource === "previous_agent") {
      routingOverheadTokens = 450; // Preceding agent output
    } else if (inputSource === "custom_blend") {
      const blendWords = customBlendTemplate ? customBlendTemplate.trim().split(/\s+/).filter(Boolean).length : 0;
      routingOverheadTokens = Math.round(blendWords * 1.3) + 450;
    }

    const estInputTokens = Math.max(20, promptBaseTokens + routingOverheadTokens);

    let baseOutputTokens = 350;
    if (model === "gemini-3.1-pro-preview") {
      baseOutputTokens = 500;
    } else if (model === "gemini-3.1-flash-lite") {
      baseOutputTokens = 250;
    }

    const tempMultiplier = 0.8 + (temperature * 0.3);
    const estOutputTokens = Math.round(baseOutputTokens * tempMultiplier);

    const pricing = modelPricing[model] || modelPricing["gemini-3.5-flash"];
    const inputCost = (estInputTokens / 1_000_000) * pricing.inputPerM;
    const outputCost = (estOutputTokens / 1_000_000) * pricing.outputPerM;
    const totalCost = inputCost + outputCost;

    let tier = "Ultra-Low Cost";
    let tierColor = "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/30";
    if (totalCost >= 0.003) {
      tier = "Premium Cost";
      tierColor = "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/30";
    } else if (totalCost >= 0.0008) {
      tier = "Standard Cost";
      tierColor = "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/30";
    } else if (totalCost >= 0.0001) {
      tier = "Low Cost";
      tierColor = "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/30";
    }

    return {
      estInputTokens,
      estOutputTokens,
      totalTokens: estInputTokens + estOutputTokens,
      inputCost,
      outputCost,
      totalCost,
      tier,
      tierColor,
      pricing
    };
  };

  const estimates = getEstimates();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Background Backdrop Overlay */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Panel Content */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl z-10 transition-colors duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/40 dark:bg-slate-950/20">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-850 dark:text-slate-100">
              {agent ? "Modify Agent Node" : "Configure New Agent Node"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-150 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Node Identity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono mb-1.5">
                Agent Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lead Researcher"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono mb-1.5">
                Expertise Role
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. SEO Specialist"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono mb-1.5">
              Brief Goal / Objective
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Scans raw text to extract high-traffic keywords."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition"
            />
          </div>

          {/* Model Configuration */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/30 p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div>
              <label className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono mb-1.5 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                Select Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:border-indigo-500 shadow-2xs"
              >
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (Default)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Heavy Reasoning)</option>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Ultra Fast)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono mb-1.5">
                Temperature ({temperature})
              </label>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="range"
                  min="0.1"
                  max="1.2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Agent Token & Cost Estimator */}
          <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4.5 space-y-3.5 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans">
                  Usage & Cost Estimator
                </h4>
              </div>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${estimates.tierColor}`}>
                {estimates.tier}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xl font-mono font-bold text-slate-900 dark:text-slate-50">
                  ${estimates.totalCost.toFixed(6)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-sans font-medium">
                  / execution run
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/5 dark:bg-emerald-400/5 px-2 py-0.5 rounded border border-emerald-500/10 dark:border-emerald-400/10">
                {(estimates.totalCost * 100).toFixed(4)}¢
              </span>
            </div>

            {/* Split Visual Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                <span>Input (~{estimates.estInputTokens} tokens)</span>
                <span>Output (~{estimates.estOutputTokens} tokens)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-900 flex overflow-hidden border border-slate-200/50 dark:border-slate-850">
                <div
                  className="bg-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${(estimates.estInputTokens / estimates.totalTokens) * 100}%` }}
                  title={`Input tokens: ${estimates.estInputTokens}`}
                />
                <div
                  className="bg-cyan-500 h-full transition-all duration-300"
                  style={{ width: `${(estimates.estOutputTokens / estimates.totalTokens) * 100}%` }}
                  title={`Output tokens: ${estimates.estOutputTokens}`}
                />
              </div>
            </div>

            {/* Pricing Rates Table */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-150 dark:border-slate-850 rounded-lg p-2.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500">Input rate:</span>
                <span className="text-slate-700 dark:text-slate-300">${estimates.pricing.inputPerM.toFixed(4)} / 1M tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500">Output rate:</span>
                <span className="text-slate-700 dark:text-slate-300">${estimates.pricing.outputPerM.toFixed(2)} / 1M tokens</span>
              </div>
              <div className="h-px bg-slate-100 dark:bg-slate-850 my-1.5" />
              <div className="flex gap-1.5 items-start leading-normal text-[9px] text-slate-400">
                <HelpCircle className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                <p>
                  Calculated using character counts, dynamic routing inputs, selected model rates, and temperature multipliers.
                </p>
              </div>
            </div>
          </div>

          {/* Context Input Routing */}
          <div className="bg-slate-50 dark:bg-slate-950/30 p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono mb-1.5">
                Data Input Routing
              </label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="inputSource"
                    checked={inputSource === "initial_input"}
                    onChange={() => setInputSource("initial_input")}
                    className="accent-indigo-600 cursor-pointer"
                  />
                  <span>Direct Starting Input (Input Prompt)</span>
                </label>

                {precedingAgents.length > 0 && (
                  <>
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="inputSource"
                        checked={inputSource === "previous_agent"}
                        onChange={() => {
                          setInputSource("previous_agent");
                          if (!inputAgentId && precedingAgents.length > 0) {
                            setInputAgentId(precedingAgents[precedingAgents.length - 1].id);
                          }
                        }}
                        className="accent-indigo-600 cursor-pointer"
                      />
                      <span>Output of Preceding Agent</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="inputSource"
                        checked={inputSource === "custom_blend"}
                        onChange={() => {
                          setInputSource("custom_blend");
                          if (!inputAgentId && precedingAgents.length > 0) {
                            setInputAgentId(precedingAgents[precedingAgents.length - 1].id);
                          }
                        }}
                        className="accent-indigo-600 cursor-pointer"
                      />
                      <span>Dynamic Custom Blend (Multiple Inputs)</span>
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Target Preceding Node Select */}
            {inputSource !== "initial_input" && precedingAgents.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono mb-1.5">
                  Source Agent Output
                </label>
                <select
                  value={inputAgentId}
                  onChange={(e) => setInputAgentId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:border-indigo-500 shadow-2xs"
                >
                  {precedingAgents.map((pa, idx) => (
                    <option key={pa.id} value={pa.id}>
                      Node {idx + 1}: {pa.name} ({pa.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Blend Template Input */}
            {inputSource === "custom_blend" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                    Blend Prompt Template
                  </label>
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">Variables available</span>
                </div>
                <textarea
                  rows={3}
                  value={customBlendTemplate}
                  onChange={(e) => setCustomBlendTemplate(e.target.value)}
                  placeholder="e.g. Here is the starting idea: {initial_input}&#10;Research findings: {prev_output}"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 font-mono outline-none resize-none shadow-2xs"
                />
                <div className="flex gap-1.5 items-start text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                  <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <p>
                    Use <code className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1 py-0.5 rounded font-mono font-semibold">{`{initial_input}`}</code> for global user prompt, and <code className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1 py-0.5 rounded font-mono font-semibold">{`{prev_output}`}</code> for the output of the selected source agent.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* System Instructions Prompt */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                System Instruction Prompt
              </label>

              <button
                type="button"
                onClick={handleAISuggestPrompt}
                disabled={isGeneratingPrompt}
                className="inline-flex items-center gap-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/50 transition cursor-pointer disabled:opacity-50"
              >
                {isGeneratingPrompt ? (
                  <>
                    <Settings className="w-3 h-3 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3 h-3" />
                    Optimize with AI
                  </>
                )}
              </button>
            </div>

            <textarea
              rows={6}
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              placeholder="Configure the agent's core identity, criteria, and guardrails here..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none resize-none leading-relaxed"
            />

            {generationError && (
              <p className="text-[10px] font-mono text-rose-600 mt-1">{generationError}</p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs transition border border-indigo-600 shadow-md shadow-indigo-100"
          >
            Save Node Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
