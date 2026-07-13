export type InputSourceType = "initial_input" | "previous_agent" | "custom_blend";

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  systemInstruction: string;
  model: string;
  inputSource: InputSourceType;
  inputAgentId?: string; // If previous_agent or custom_blend, references the source agent ID
  customBlendTemplate?: string; // Multi-input template using variables like {initial_input} and {prev_output}
  temperature: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  agents: Agent[];
  initialInput: string;
  category: string;
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  versionNumber: number;
  name: string;
  createdAt: number;
  description: string;
  agents: Agent[];
  initialInput: string;
}

export interface AgentRunState {
  agentId: string;
  status: "idle" | "running" | "completed" | "failed";
  input: string;
  output: string;
  error?: string;
  duration?: number; // Execution time in ms
  model?: string; // Model used for this agent run
  cost?: number; // Execution cost in USD
  tokens?: {
    input: number;
    output: number;
  };
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowName?: string; // Cached workflow name at time of run
  status: "idle" | "running" | "completed" | "failed" | "paused";
  currentAgentId: string | null;
  agentStates: Record<string, AgentRunState>;
  startedAt?: number;
  completedAt?: number;
  globalInput: string;
  isBatch?: boolean;
  batchGroupId?: string;
}
