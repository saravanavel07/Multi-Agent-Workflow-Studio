import { useState, useEffect, useRef, ChangeEvent } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import WorkflowCanvas from "./components/WorkflowCanvas";
import WorkflowRunner from "./components/WorkflowRunner";
import AgentDrawer from "./components/AgentDrawer";
import { defaultWorkflows } from "./templates";
import { Workflow, Agent, WorkflowRun, AgentRunState, WorkflowVersion } from "./types";
import { Bot, Layers, Sparkles, Terminal, BarChart3 } from "lucide-react";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string>("");
  const activeWorkflow = workflows.find((w) => w.id === activeWorkflowId) || workflows[0];
  const [globalInput, setGlobalInput] = useState("");
  const [runState, setRunState] = useState<WorkflowRun | null>(null);

  // History and Dashboard state
  const [pastRuns, setPastRuns] = useState<WorkflowRun[]>([]);
  const [currentView, setCurrentView] = useState<"canvas" | "dashboard">("canvas");

  // Batch execution state
  const [activeBatch, setActiveBatch] = useState<{
    groupId: string;
    inputs: string[];
    currentIndex: number;
    isRunning: boolean;
    results: { input: string; runId: string; status: "completed" | "failed" }[];
  } | null>(null);

  // Version history state
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [modalVersionName, setModalVersionName] = useState("");
  const [modalVersionDesc, setModalVersionDesc] = useState("");

  // Load versions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("multi_agent_studio_workflow_versions");
    if (saved) {
      try {
        setVersions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse workflow versions:", e);
      }
    }
  }, []);

  const handleSaveVersion = (workflowId: string, name: string, description: string) => {
    const wf = workflows.find((w) => w.id === workflowId);
    if (!wf) return;

    const existing = versions.filter((v) => v.workflowId === workflowId);
    const nextNum = existing.length > 0 ? Math.max(...existing.map((v) => v.versionNumber)) + 1 : 1;

    const newVersion: WorkflowVersion = {
      id: `version-${Date.now()}`,
      workflowId,
      versionNumber: nextNum,
      name: name.trim() || `v${nextNum} Snapshot`,
      createdAt: Date.now(),
      description: description.trim(),
      agents: JSON.parse(JSON.stringify(wf.agents)), // deep clone
      initialInput: wf.initialInput || "",
    };

    const updated = [newVersion, ...versions];
    setVersions(updated);
    localStorage.setItem("multi_agent_studio_workflow_versions", JSON.stringify(updated));
    showToast(`Saved version v${nextNum} "${newVersion.name}" successfully!`);
  };

  const handleRestoreVersion = (version: WorkflowVersion) => {
    const updated = workflows.map((w) => {
      if (w.id === version.workflowId) {
        return {
          ...w,
          agents: JSON.parse(JSON.stringify(version.agents)), // deep clone
          initialInput: version.initialInput,
        };
      }
      return w;
    });

    saveWorkflows(updated);
    // Sync global input if we are currently looking at this workflow
    if (activeWorkflowId === version.workflowId) {
      setGlobalInput(version.initialInput);
    }
    showToast(`Restored to version v${version.versionNumber} "${version.name}" successfully!`);
  };

  const handleDeleteVersion = (versionId: string) => {
    const updated = versions.filter((v) => v.id !== versionId);
    setVersions(updated);
    localStorage.setItem("multi_agent_studio_workflow_versions", JSON.stringify(updated));
    showToast("Deleted version snapshot.");
  };

  // Load past runs history
  useEffect(() => {
    const savedRuns = localStorage.getItem("multi_agent_studio_past_runs");
    if (savedRuns) {
      try {
        setPastRuns(JSON.parse(savedRuns));
      } catch (e) {
        console.error("Failed to parse saved runs:", e);
      }
    }
  }, []);

  // Save completed or failed runs to history automatically
  useEffect(() => {
    if (runState && (runState.status === "completed" || runState.status === "failed")) {
      setPastRuns((prevPast) => {
        if (prevPast.some((r) => r.id === runState.id)) {
          const updated = prevPast.map((r) => (r.id === runState.id ? runState : r));
          localStorage.setItem("multi_agent_studio_past_runs", JSON.stringify(updated));
          return updated;
        } else {
          const activeWf = workflows.find((w) => w.id === runState.workflowId);
          const runToSave = {
            ...runState,
            workflowName: activeWf?.name || "Custom Pipeline",
          };
          const updated = [...prevPast, runToSave];
          localStorage.setItem("multi_agent_studio_past_runs", JSON.stringify(updated));
          return updated;
        }
      });
    }
  }, [runState, workflows]);

  const handleDeleteRun = (runId: string) => {
    const updated = pastRuns.filter((r) => r.id !== runId);
    setPastRuns(updated);
    localStorage.setItem("multi_agent_studio_past_runs", JSON.stringify(updated));
    showToast("Deleted historical run record.");
  };

  const handleClearHistory = () => {
    setPastRuns([]);
    localStorage.removeItem("multi_agent_studio_past_runs");
    showToast("All execution run history has been cleared.");
  };

  const handleImportHistory = (importedRuns: WorkflowRun[]) => {
    setPastRuns((prevPast) => {
      const runMap = new Map<string, WorkflowRun>();
      prevPast.forEach((r) => runMap.set(r.id, r));
      importedRuns.forEach((r) => runMap.set(r.id, r));
      const updated = Array.from(runMap.values());
      updated.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
      localStorage.setItem("multi_agent_studio_past_runs", JSON.stringify(updated));
      return updated;
    });
    showToast(`Successfully imported ${importedRuns.length} execution run record(s).`);
  };

  // Modal drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  // Batch execution functions and effect manager
  const startSingleWorkflowRunFromBatch = (groupId: string, index: number, inputPrompt: string) => {
    if (!activeWorkflow || activeWorkflow.agents.length === 0) return;

    isPauseRequested.current = false;

    // Initialize individual node states
    const initialAgentStates: Record<string, AgentRunState> = {};
    activeWorkflow.agents.forEach((agent) => {
      initialAgentStates[agent.id] = {
        agentId: agent.id,
        status: "idle",
        input: "",
        output: "",
        model: agent.model,
      };
    });

    const initialRun: WorkflowRun = {
      id: `run-${groupId}-${index}`,
      workflowId: activeWorkflow.id,
      status: "running",
      currentAgentId: activeWorkflow.agents[0].id,
      agentStates: initialAgentStates,
      startedAt: Date.now(),
      globalInput: inputPrompt,
      isBatch: true,
      batchGroupId: groupId,
    };

    setRunState(initialRun);

    // Trigger sequential pipeline
    executeStep(0, initialRun, initialAgentStates);
  };

  const startBatchRun = (inputs: string[]) => {
    if (!activeWorkflow || activeWorkflow.agents.length === 0) return;
    if (inputs.length === 0) return;

    const groupId = `${Date.now()}`;
    const newBatch = {
      groupId,
      inputs,
      currentIndex: 0,
      isRunning: true,
      results: [],
    };
    setActiveBatch(newBatch);

    // Start first item
    startSingleWorkflowRunFromBatch(groupId, 0, inputs[0]);
    showToast(`Launching Batch Run of ${inputs.length} inputs sequentially...`);
  };

  const cancelBatchRun = () => {
    if (activeBatch) {
      setActiveBatch((prev) => prev ? { ...prev, isRunning: false } : null);
      resetWorkflowRun();
      showToast("Batch run cancelled.", "error");
    }
  };

  // Batch run manager effect
  useEffect(() => {
    if (!activeBatch || !activeBatch.isRunning || !activeWorkflow) return;

    const currentRunId = `run-${activeBatch.groupId}-${activeBatch.currentIndex}`;
    
    if (runState && runState.id === currentRunId) {
      if (runState.status === "completed" || runState.status === "failed") {
        const currentResult = {
          input: activeBatch.inputs[activeBatch.currentIndex],
          runId: runState.id,
          status: runState.status,
        };

        const alreadyRecorded = activeBatch.results.some(r => r.runId === runState.id);
        if (alreadyRecorded) return;

        const updatedResults = [...activeBatch.results, currentResult];
        const nextIndex = activeBatch.currentIndex + 1;

        if (nextIndex < activeBatch.inputs.length) {
          setActiveBatch({
            ...activeBatch,
            currentIndex: nextIndex,
            results: updatedResults,
          });

          setTimeout(() => {
            startSingleWorkflowRunFromBatch(activeBatch.groupId, nextIndex, activeBatch.inputs[nextIndex]);
          }, 200);
        } else {
          setActiveBatch({
            ...activeBatch,
            isRunning: false,
            results: updatedResults,
          });
          showToast(`Completed batch run of ${activeBatch.inputs.length} inputs! Check Dashboard for results.`);
        }
      }
    }
  }, [runState, activeBatch, activeWorkflow]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const isPauseRequested = useRef(false);

  // 1. Initial State Loading from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("multi_agent_studio_workflows");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWorkflows(parsed);
          setActiveWorkflowId(parsed[0].id);
          setGlobalInput(parsed[0].initialInput || "");
          return;
        }
      } catch (e) {
        console.error("Failed to parse saved workflows:", e);
      }
    }
    // Set system defaults
    setWorkflows(defaultWorkflows);
    setActiveWorkflowId(defaultWorkflows[0].id);
    setGlobalInput(defaultWorkflows[0].initialInput);
    localStorage.setItem("multi_agent_studio_workflows", JSON.stringify(defaultWorkflows));
  }, []);

  // Sync Input when active workflow switches
  useEffect(() => {
    const active = workflows.find((w) => w.id === activeWorkflowId);
    if (active) {
      setGlobalInput(active.initialInput || "");
      setRunState(null); // Clear execution when swapping tabs
    }
  }, [activeWorkflowId, workflows]);

  // Save changes helper
  const saveWorkflows = (updated: Workflow[]) => {
    setWorkflows(updated);
    localStorage.setItem("multi_agent_studio_workflows", JSON.stringify(updated));
  };

  // 2. Global Input Handlers
  const handleGlobalInputChange = (val: string) => {
    setGlobalInput(val);
    if (activeWorkflow) {
      const updated = workflows.map((w) =>
        w.id === activeWorkflowId ? { ...w, initialInput: val } : w
      );
      saveWorkflows(updated);
    }
  };

  // 3. Sequential Execution Engine
  const startWorkflowRun = async () => {
    if (!activeWorkflow || activeWorkflow.agents.length === 0) return;

    isPauseRequested.current = false;

    // Initialize individual node states
    const initialAgentStates: Record<string, AgentRunState> = {};
    activeWorkflow.agents.forEach((agent) => {
      initialAgentStates[agent.id] = {
        agentId: agent.id,
        status: "idle",
        input: "",
        output: "",
        model: agent.model, // Cache model used in the workflow sequence
      };
    });

    const initialRun: WorkflowRun = {
      id: `run-${Date.now()}`,
      workflowId: activeWorkflow.id,
      status: "running",
      currentAgentId: activeWorkflow.agents[0].id,
      agentStates: initialAgentStates,
      startedAt: Date.now(),
      globalInput,
    };

    setRunState(initialRun);

    // Trigger sequential pipeline
    executeStep(0, initialRun, initialAgentStates);
  };

  const executeStep = async (
    index: number,
    currentRun: WorkflowRun,
    currentAgentStates: Record<string, AgentRunState>
  ) => {
    if (!activeWorkflow) return;

    if (index >= activeWorkflow.agents.length) {
      // Completed full pipeline successfully
      setRunState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: "completed",
          currentAgentId: null,
          completedAt: Date.now(),
        };
      });
      return;
    }

    // Handle interactive pause request
    if (isPauseRequested.current) {
      setRunState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: "paused",
        };
      });
      return;
    }

    const agent = activeWorkflow.agents[index];

    // Transition state of current node to 'running'
    const updatedStates = { ...currentAgentStates };
    updatedStates[agent.id] = {
      ...updatedStates[agent.id],
      status: "running",
    };

    setRunState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        currentAgentId: agent.id,
        agentStates: updatedStates,
      };
    });

    // Dynamic prompt calculation depending on source mappings
    let computedPrompt = "";
    if (agent.inputSource === "initial_input") {
      computedPrompt = currentRun.globalInput;
    } else {
      const sourceOutput = agent.inputAgentId
        ? updatedStates[agent.inputAgentId]?.output || ""
        : "";

      if (agent.inputSource === "previous_agent") {
        computedPrompt = sourceOutput;
      } else if (agent.inputSource === "custom_blend") {
        const template =
          agent.customBlendTemplate || "Global Prompt: {initial_input}\nContext:\n{prev_output}";
        computedPrompt = template
          .replace(/\{initial_input\}/g, currentRun.globalInput)
          .replace(/\{prev_output\}/g, sourceOutput);
      }
    }

    updatedStates[agent.id].input = computedPrompt;

    const startTime = Date.now();

    try {
      const response = await fetch("/api/run-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: computedPrompt,
          systemInstruction: agent.systemInstruction,
          model: agent.model,
          temperature: agent.temperature,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Backend error received from agent.");
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      // Mark node completed
      updatedStates[agent.id] = {
        ...updatedStates[agent.id],
        status: "completed",
        output: data.text,
        duration,
        cost: data.metrics?.cost || 0,
        tokens: data.metrics ? {
          input: data.metrics.promptTokens,
          output: data.metrics.completionTokens
        } : {
          input: Math.ceil(computedPrompt.length / 4.2),
          output: Math.ceil(data.text.length / 4.2)
        },
      };

      const nextRunState = {
        ...currentRun,
        agentStates: updatedStates,
      };

      setRunState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          agentStates: updatedStates,
        };
      });

      // Chain onto next index
      executeStep(index + 1, nextRunState, updatedStates);
    } catch (err: any) {
      console.error("Failed executing step index:", index, err);
      updatedStates[agent.id] = {
        ...updatedStates[agent.id],
        status: "failed",
        error: err.message || "Unknown execution error occurred.",
      };

      setRunState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: "failed",
          completedAt: Date.now(),
          agentStates: updatedStates,
        };
      });
    }
  };

  const pauseWorkflowRun = () => {
    isPauseRequested.current = true;
    setRunState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        status: "paused",
      };
    });
  };

  const resumeWorkflowRun = () => {
    if (!runState || !activeWorkflow) return;

    isPauseRequested.current = false;

    // Discover first unfinished agent node index
    const resumeIndex = activeWorkflow.agents.findIndex(
      (a) => runState.agentStates[a.id]?.status !== "completed"
    );

    if (resumeIndex === -1) {
      setRunState((prev) => {
        if (!prev) return null;
        return { ...prev, status: "completed", currentAgentId: null };
      });
      return;
    }

    const resumedRun = {
      ...runState,
      status: "running" as const,
    };

    setRunState(resumedRun);

    // Continue executing
    executeStep(resumeIndex, resumedRun, runState.agentStates);
  };

  const resetWorkflowRun = () => {
    isPauseRequested.current = false;
    setRunState(null);
  };

  const handleUpdateAgentOutput = (agentId: string, text: string) => {
    if (!runState) return;
    const updatedStates = { ...runState.agentStates };
    if (updatedStates[agentId]) {
      updatedStates[agentId] = {
        ...updatedStates[agentId],
        output: text,
      };
      setRunState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          agentStates: updatedStates,
        };
      });
    }
  };

  // 4. Blueprint Node Editing & CRUD
  const handleOpenAddAgent = () => {
    setEditingAgent(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEditAgent = (agentId: string) => {
    if (!activeWorkflow) return;
    const target = activeWorkflow.agents.find((a) => a.id === agentId);
    if (target) {
      setEditingAgent(target);
      setIsDrawerOpen(true);
    }
  };

  const getPrecedingAgents = () => {
    if (!activeWorkflow) return [];
    if (!editingAgent) return activeWorkflow.agents;
    const idx = activeWorkflow.agents.findIndex((a) => a.id === editingAgent.id);
    if (idx === -1) return activeWorkflow.agents;
    return activeWorkflow.agents.slice(0, idx);
  };

  const handleSaveAgent = (savedAgent: Agent) => {
    if (!activeWorkflow) return;

    let updatedAgents = [...activeWorkflow.agents];
    if (editingAgent) {
      // Edit
      updatedAgents = updatedAgents.map((a) => (a.id === savedAgent.id ? savedAgent : a));
    } else {
      // Add
      updatedAgents.push(savedAgent);
    }

    const updatedWorkflows = workflows.map((w) =>
      w.id === activeWorkflowId ? { ...w, agents: updatedAgents } : w
    );
    saveWorkflows(updatedWorkflows);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const isModKey = isMac ? e.metaKey : e.ctrlKey;

      const key = e.key.toLowerCase();

      // Ctrl+S / Cmd+S : Save Version Snapshot
      if (isModKey && key === "s" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (activeWorkflow) {
          setModalVersionName("");
          setModalVersionDesc("");
          setIsSaveModalOpen(true);
        }
      }

      // Ctrl+R / Cmd+R : Run Workflow sequence
      if (isModKey && key === "r" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (activeWorkflow) {
          if (activeWorkflow.agents.length === 0) {
            showToast("Cannot run: Add at least one Agent to the sequence.", "error");
            return;
          }
          if (!globalInput.trim()) {
            showToast("Cannot run: Please provide a Starting Input Prompt first.", "error");
            return;
          }

          if (runState?.status === "running") {
            showToast("Workflow pipeline is already running.", "error");
          } else if (runState?.status === "paused") {
            resumeWorkflowRun();
            showToast("Resuming pipeline run...");
          } else {
            startWorkflowRun();
            showToast("Launching pipeline...");
          }
        }
      }

      // Ctrl+Shift+A / Cmd+Shift+A : Add New Agent Node
      if (isModKey && e.shiftKey && key === "a" && !e.altKey) {
        e.preventDefault();
        handleOpenAddAgent();
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => {
      window.removeEventListener("keydown", handleGlobalShortcuts);
    };
  }, [activeWorkflow, runState, globalInput]);

  const handleDeleteAgent = (agentId: string) => {
    if (!activeWorkflow) return;
    const updatedAgents = activeWorkflow.agents.filter((a) => a.id !== agentId);
    const updatedWorkflows = workflows.map((w) =>
      w.id === activeWorkflowId ? { ...w, agents: updatedAgents } : w
    );
    saveWorkflows(updatedWorkflows);
  };

  const handleCloneAgent = (agentId: string) => {
    if (!activeWorkflow) return;
    const index = activeWorkflow.agents.findIndex((a) => a.id === agentId);
    if (index === -1) return;

    const sourceAgent = activeWorkflow.agents[index];
    const clonedAgent: Agent = {
      ...sourceAgent,
      id: `agent-${Date.now()}`,
      name: `${sourceAgent.name} (Copy)`,
    };

    const updatedAgents = [...activeWorkflow.agents];
    updatedAgents.splice(index + 1, 0, clonedAgent);

    const updatedWorkflows = workflows.map((w) =>
      w.id === activeWorkflowId ? { ...w, agents: updatedAgents } : w
    );
    saveWorkflows(updatedWorkflows);
    showToast(`Cloned agent "${sourceAgent.name}" successfully!`);
  };

  const handleMoveAgentUp = (index: number) => {
    if (!activeWorkflow || index === 0) return;
    const updated = [...activeWorkflow.agents];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;

    const updatedWorkflows = workflows.map((w) =>
      w.id === activeWorkflowId ? { ...w, agents: updated } : w
    );
    saveWorkflows(updatedWorkflows);
  };

  const handleMoveAgentDown = (index: number) => {
    if (!activeWorkflow || index === activeWorkflow.agents.length - 1) return;
    const updated = [...activeWorkflow.agents];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;

    const updatedWorkflows = workflows.map((w) =>
      w.id === activeWorkflowId ? { ...w, agents: updated } : w
    );
    saveWorkflows(updatedWorkflows);
  };

  const handleReorderAgents = (updatedAgents: Agent[]) => {
    if (!activeWorkflow) return;
    const updatedWorkflows = workflows.map((w) =>
      w.id === activeWorkflowId ? { ...w, agents: updatedAgents } : w
    );
    saveWorkflows(updatedWorkflows);
  };

  const handleUpdateWorkflowMetadata = (name: string, description: string) => {
    const updatedWorkflows = workflows.map((w) =>
      w.id === activeWorkflowId ? { ...w, name, description } : w
    );
    saveWorkflows(updatedWorkflows);
  };

  // 5. Sidebar Blueprint CRUD
  const handleCreateWorkflow = () => {
    const newId = `user-${Date.now()}`;
    const newWorkflow: Workflow = {
      id: newId,
      name: "Custom Agent Pipeline",
      description: "My custom multi-agent routing workspace.",
      category: "Custom",
      initialInput: "What are 3 interesting research questions on quantum computing?",
      agents: [
        {
          id: `agent-${Date.now()}-1`,
          name: "Planner Node",
          role: "Planner",
          description: "Generates high-level research targets.",
          systemInstruction:
            "You are a strategic planner. Outline 3 targeted high-level questions for analyzing the topic.",
          model: "gemini-3.5-flash",
          inputSource: "initial_input",
          temperature: 0.5,
        },
      ],
    };

    const updated = [...workflows, newWorkflow];
    saveWorkflows(updated);
    setActiveWorkflowId(newId);
  };

  const handleDeleteWorkflow = (id: string) => {
    const filtered = workflows.filter((w) => w.id !== id);
    saveWorkflows(filtered);
    if (activeWorkflowId === id && filtered.length > 0) {
      setActiveWorkflowId(filtered[0].id);
    }
  };

  const handleResetToDefault = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all pipelines to defaults? Custom workflows will be removed."
      )
    ) {
      setWorkflows(defaultWorkflows);
      setActiveWorkflowId(defaultWorkflows[0].id);
      setGlobalInput(defaultWorkflows[0].initialInput);
      localStorage.setItem("multi_agent_studio_workflows", JSON.stringify(defaultWorkflows));
      setRunState(null);
    }
  };

  const handleExportWorkflow = () => {
    if (!activeWorkflow) {
      showToast("No active workflow to export.", "error");
      return;
    }
    try {
      const exportData = {
        name: activeWorkflow.name,
        description: activeWorkflow.description,
        category: activeWorkflow.category || "Custom",
        initialInput: activeWorkflow.initialInput,
        agents: activeWorkflow.agents.map(({ id, ...agent }) => ({
          ...agent,
          id,
        })),
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      
      const safeName = activeWorkflow.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      downloadAnchor.setAttribute("download", `workflow_${safeName || "export"}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast(`Exported "${activeWorkflow.name}" successfully!`);
    } catch (err) {
      console.error(err);
      showToast("Failed to export workflow.", "error");
    }
  };

  const handleImportWorkflow = (e: ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (!parsed || typeof parsed !== "object") {
          showToast("Invalid JSON file format.", "error");
          return;
        }
        if (!parsed.name) {
          showToast("Invalid workflow: 'name' field is missing.", "error");
          return;
        }
        if (parsed.agents && !Array.isArray(parsed.agents)) {
          showToast("Invalid workflow: 'agents' must be an array.", "error");
          return;
        }

        const newWorkflowId = `user-imported-${Date.now()}`;
        const idMap: Record<string, string> = {};
        const rawAgents = Array.isArray(parsed.agents) ? parsed.agents : [];
        
        rawAgents.forEach((agent: any, idx: number) => {
          const oldId = agent.id || `agent-old-${idx}`;
          const newId = `agent-imported-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`;
          idMap[oldId] = newId;
        });

        const importedAgents: Agent[] = rawAgents.map((agent: any, idx: number) => {
          const oldId = agent.id || `agent-old-${idx}`;
          const mappedId = idMap[oldId];
          
          let mappedInputAgentId = undefined;
          if (agent.inputAgentId) {
            mappedInputAgentId = idMap[agent.inputAgentId] || agent.inputAgentId;
          }

          return {
            id: mappedId,
            name: agent.name || `Agent Node ${idx + 1}`,
            role: agent.role || "Assistant",
            description: agent.description || "Imported expert agent.",
            systemInstruction: agent.systemInstruction || "",
            model: agent.model || "gemini-3.5-flash",
            inputSource: agent.inputSource || "initial_input",
            inputAgentId: mappedInputAgentId,
            customBlendTemplate: agent.customBlendTemplate,
            temperature: typeof agent.temperature === "number" ? agent.temperature : 0.7,
          };
        });

        const importedWorkflow: Workflow = {
          id: newWorkflowId,
          name: parsed.name,
          description: parsed.description || "Imported multi-agent pipeline.",
          category: parsed.category || "Custom",
          initialInput: parsed.initialInput || "Welcome to your imported pipeline!",
          agents: importedAgents,
        };

        const updated = [...workflows, importedWorkflow];
        saveWorkflows(updated);
        setActiveWorkflowId(newWorkflowId);
        showToast(`Imported "${importedWorkflow.name}" successfully!`);
      } catch (err) {
        console.error(err);
        showToast("Failed to parse JSON file.", "error");
      } finally {
        e.target.value = "";
      }
    };
    fileReader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200 font-sans">
      <Navbar />

      {/* Main Workspace Frame */}
      {activeWorkflow ? (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Left Panel: Blueprints & Saved Items */}
          <Sidebar
            workflows={workflows}
            activeWorkflowId={activeWorkflowId}
            onSelectWorkflow={setActiveWorkflowId}
            onCreateWorkflow={handleCreateWorkflow}
            onDeleteWorkflow={handleDeleteWorkflow}
            onResetToDefault={handleResetToDefault}
            onExportWorkflow={handleExportWorkflow}
            onImportWorkflow={handleImportWorkflow}
          />

          {/* Middle Panel: Visual Designer Canvas or Analytics Dashboard */}
          <main className="flex-1 border-r border-slate-200 dark:border-slate-800 flex flex-col min-w-0 bg-[#F1F5F9] dark:bg-slate-950">
            {/* View Toggle Bar */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between transition-colors duration-200 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">Workspace View Mode</span>
              </div>
              <div className="bg-slate-100 dark:bg-slate-950 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-850 flex shadow-2xs">
                <button
                  onClick={() => setCurrentView("canvas")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    currentView === "canvas"
                      ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  Designer Canvas
                </button>
                <button
                  onClick={() => setCurrentView("dashboard")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer relative ${
                    currentView === "dashboard"
                      ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Performance Analytics
                  {pastRuns.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-indigo-600 dark:bg-indigo-500 text-white font-mono text-[8px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                      {pastRuns.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {currentView === "dashboard" ? (
              <Dashboard
                pastRuns={pastRuns}
                onDeleteRun={handleDeleteRun}
                onClearHistory={handleClearHistory}
                onImportHistory={handleImportHistory}
                onCloseDashboard={() => setCurrentView("canvas")}
              />
            ) : (
              <WorkflowCanvas
                workflow={activeWorkflow}
                activeRun={runState}
                versions={versions}
                onUpdateWorkflowMetadata={handleUpdateWorkflowMetadata}
                onAddAgent={handleOpenAddAgent}
                onEditAgent={handleOpenEditAgent}
                onDeleteAgent={handleDeleteAgent}
                onCloneAgent={handleCloneAgent}
                onMoveAgentUp={handleMoveAgentUp}
                onMoveAgentDown={handleMoveAgentDown}
                onReorderAgents={handleReorderAgents}
                onSaveVersion={handleSaveVersion}
                onRestoreVersion={handleRestoreVersion}
                onDeleteVersion={handleDeleteVersion}
              />
            )}
          </main>

          {/* Right Panel: Execution logs / Live Run */}
          <WorkflowRunner
            workflow={activeWorkflow}
            globalInput={globalInput}
            onGlobalInputChange={handleGlobalInputChange}
            runState={runState}
            onStartRun={startWorkflowRun}
            onPauseRun={pauseWorkflowRun}
            onResumeRun={resumeWorkflowRun}
            onResetRun={resetWorkflowRun}
            onUpdateAgentOutput={handleUpdateAgentOutput}
            activeBatch={activeBatch}
            onStartBatchRun={startBatchRun}
            onCancelBatchRun={cancelBatchRun}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center py-20 bg-slate-50 dark:bg-slate-950">
          <div className="text-center space-y-3">
            <Sparkles className="w-10 h-10 text-indigo-600 dark:text-indigo-400 mx-auto animate-spin" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Bootstrapping studio environment...</p>
          </div>
        </div>
      )}

      {/* Agent Edit Slide-over drawer modal */}
      <AgentDrawer
        isOpen={isDrawerOpen}
        agent={editingAgent}
        precedingAgents={getPrecedingAgents()}
        onSave={handleSaveAgent}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Save Version Modal dialog */}
      {isSaveModalOpen && (
        <div id="save-version-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center gap-3.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">Save Version Snapshot</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Capture a restore point for active workflow "{activeWorkflow?.name}"</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono mb-1.5">Snapshot Name</label>
                <input
                  type="text"
                  autoFocus
                  value={modalVersionName}
                  onChange={(e) => setModalVersionName(e.target.value)}
                  placeholder="e.g. Stable v1.0, Added Filter Node"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all duration-200"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (activeWorkflow) {
                        handleSaveVersion(activeWorkflow.id, modalVersionName, modalVersionDesc);
                        setIsSaveModalOpen(false);
                      }
                    } else if (e.key === "Escape") {
                      setIsSaveModalOpen(false);
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono mb-1.5">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={modalVersionDesc}
                  onChange={(e) => setModalVersionDesc(e.target.value)}
                  placeholder="What works well in this configuration?"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all duration-200 resize-none leading-relaxed"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setIsSaveModalOpen(false);
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                Press <kbd className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[9px] border border-slate-200 dark:border-slate-700 font-bold">Esc</kbd> to dismiss
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeWorkflow) {
                      handleSaveVersion(activeWorkflow.id, modalVersionName, modalVersionDesc);
                      setIsSaveModalOpen(false);
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md shadow-indigo-100 border border-indigo-600"
                >
                  Save Snapshot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-xl border shadow-lg transition-all transform duration-300 animate-slide-in ${
          toast.type === "success"
            ? "bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300"
            : "bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300"
        }`}>
          {toast.type === "success" ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
