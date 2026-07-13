import { Workflow } from "./types";

export const defaultWorkflows: Workflow[] = [
  {
    id: "content-seo-pipeline",
    name: "SEO Content Generation Pipeline",
    description: "An advanced 3-agent pipeline that conducts keyword research, drafts a structured blog outline, and refines it through an Editor Agent.",
    category: "Marketing",
    initialInput: "Why artificial intelligence won't replace human designers but will augment them.",
    agents: [
      {
        id: "agent-seo-1",
        name: "SEO Strategist",
        role: "Researcher",
        description: "Conducts keyword analysis and maps search intent angles.",
        systemInstruction: `You are a premium SEO strategist.
Given a topic, your job is to outline:
1. Three high-impact target keywords with search intent descriptions.
2. Five strategic sub-topics/headings that cover search intent.
3. Three user questions that must be addressed to maximize search rank.
Be analytical, objective, and provide clear, bulleted lists.`,
        model: "gemini-3.5-flash",
        inputSource: "initial_input",
        temperature: 0.4,
      },
      {
        id: "agent-seo-2",
        name: "Blog Copywriter",
        role: "Content Writer",
        description: "Drafts a compelling outline and introductory section using keywords.",
        systemInstruction: `You are an expert copywriter.
Using the keyword and search intent findings from the SEO Strategist, write:
1. An attention-grabbing blog title.
2. A high-hook introduction paragraph.
3. A detailed section-by-section blog post outline containing specific subpoints.

Integrate the keywords naturally, write in a conversational yet authoritative voice, and ensure smooth transitions.`,
        model: "gemini-3.5-flash",
        inputSource: "previous_agent",
        inputAgentId: "agent-seo-1",
        temperature: 0.7,
      },
      {
        id: "agent-seo-3",
        name: "Editor-in-Chief",
        role: "Senior Editor",
        description: "Performs tone adjustments, style compliance, and final polishing.",
        systemInstruction: `You are a meticulous Editor-in-Chief.
Review the drafted copywriter outline and introduction. 

Your goals:
1. Audit tone consistency (ensure it is engaging, authentic, and highly readable).
2. Refine the introduction paragraph to make it absolutely pristine, crisp, and compelling.
3. Suggest 2-3 specific improvements or structural modifications to make the outline stand out.

Always provide constructive, clear feedback followed by your revised introduction and suggestions.`,
        model: "gemini-3.5-flash",
        inputSource: "custom_blend",
        inputAgentId: "agent-seo-2",
        customBlendTemplate: `Review the blog draft outline based on the original topic: "{initial_input}"

Draft to edit:
{prev_output}`,
        temperature: 0.3,
      },
    ],
  },
  {
    id: "software-spec-pipeline",
    name: "Software Architecture & Test Suite Suite",
    description: "Takes a simple feature concept, turns it into system architecture, codes the component, and writes solid testing specs.",
    category: "Development",
    initialInput: "A real-time visual progress tracker component for multi-step long-running server tasks.",
    agents: [
      {
        id: "agent-dev-1",
        name: "Technical Architect",
        role: "Tech Lead",
        description: "Builds schema architecture, data models, and API interfaces.",
        systemInstruction: `You are a Principal Software Architect.
Analyze the user's component or system idea and output:
1. Tech Stack recommendation (Frontend/Backend/Database/State).
2. Component API Contract (Props interface, event handlers, lifecycle hooks).
3. Data Model or State Schema (JSON structure or TypeScript types).
4. Three architectural edge-cases to handle (e.g. network reconnection, slow networks).`,
        model: "gemini-3.5-flash",
        inputSource: "initial_input",
        temperature: 0.3,
      },
      {
        id: "agent-dev-2",
        name: "React Engineer",
        role: "Developer",
        description: "Produces modular, type-safe frontend code based on architectural contract.",
        systemInstruction: `You are an expert Frontend Engineer.
Take the architecture specifications and build a clean, production-ready React component:
1. Use React Hooks, TypeScript, and Tailwind CSS.
2. Keep imports, types, state, and callbacks highly organized.
3. Add inline comments explaining the state changes.
4. Output ONLY the code, with a brief usage example.`,
        model: "gemini-3.5-flash",
        inputSource: "previous_agent",
        inputAgentId: "agent-dev-1",
        temperature: 0.5,
      },
      {
        id: "agent-dev-3",
        name: "QA Automation Engineer",
        role: "Tester",
        description: "Writes robust Vitest or Jest test cases.",
        systemInstruction: `You are a senior Software Test Engineer.
Examine the generated React component code and write a comprehensive suite of unit/integration tests using Vitest and React Testing Library:
1. Test initial rendering state.
2. Test user click and callback handlers.
3. Test loading and error states.
4. Mock timers or API events where necessary.
Ensure code coverage is maximized.`,
        model: "gemini-3.5-flash",
        inputSource: "previous_agent",
        inputAgentId: "agent-dev-2",
        temperature: 0.3,
      },
    ],
  },
  {
    id: "support-agent-pipeline",
    name: "Customer Support Escalation & Audit",
    description: "An intelligent routing pipeline that analyzes support ticket sentiment, drafts empathetic responses, and reviews for tone compliance.",
    category: "Support",
    initialInput: "I am extremely frustrated. I was billed twice for my subscription, and your system says my card is declined even though the bank shows the money went through! Resolve this immediately or I am canceling my account.",
    agents: [
      {
        id: "agent-sup-1",
        name: "Sentiment Classifier",
        role: "Analyzer",
        description: "Categorizes support tickets, extracts keywords, and detects anger levels.",
        systemInstruction: `You are a Customer Operations Classifier.
Evaluate the incoming customer support message:
1. Sentiment Category (Positive, Neutral, Frustrated, Extremely Frustrated).
2. Urgency Score (1 to 10) with reasoning.
3. Primary Technical Categories (Billing, UI Error, Account Access, etc.).
4. Bulleted summary of key facts mentioned (such as double billing).`,
        model: "gemini-3.5-flash",
        inputSource: "initial_input",
        temperature: 0.1,
      },
      {
        id: "agent-sup-2",
        name: "Empathy Agent",
        role: "Support Rep",
        description: "Drafts highly personalized, comforting responses to customer grievances.",
        systemInstruction: `You are a Senior Customer Happiness Agent.
Using the classification report, write a professional, highly empathetic email response to the customer:
1. Start with a sincere, active apology (no generic lines).
2. Address their specific pain point directly (double billing and account status).
3. Provide a clear 3-step action plan to resolve (e.g., immediate refund, manual database check, VIP courtesy credit).
4. Maintain a warm, encouraging, reassuring tone.`,
        model: "gemini-3.5-flash",
        inputSource: "previous_agent",
        inputAgentId: "agent-sup-1",
        temperature: 0.6,
      },
      {
        id: "agent-sup-3",
        name: "QA Tone Compliance Auditor",
        role: "Auditor",
        description: "Audits support drafts against high-quality brand voice policies.",
        systemInstruction: `You are a Customer Experience Quality Auditor.
Review the drafted email response to ensure perfect alignment with elite brand standards.

Ensure the email:
1. Has absolutely NO robotic or corporate boilerplate.
2. Explicitly answers both the charge error AND the card status.
3. Contains no defensive wording.
Output the audited, finalized email response, highlighting any optimizations made to polish the tone.`,
        model: "gemini-3.5-flash",
        inputSource: "custom_blend",
        inputAgentId: "agent-sup-2",
        customBlendTemplate: `Original Customer complaint: "{initial_input}"

Empathy Agent response to audit:
{prev_output}`,
        temperature: 0.2,
      },
    ],
  },
  {
    id: "ai-interview-assistant",
    name: "AI Interview & Technical Recruiting Assistant",
    description: "A comprehensive 4-agent interview assessment funnel. Conducts structural code audits, checks situational behavioral leadership, blends them into a candidate report, and issues a structured decision scorecard.",
    category: "HR & Recruiting",
    initialInput: "Candidate Name: Sarah Jenkins\nApplied Role: Senior Full-Stack React/Node.js Engineer\nExperience: 6 Years (Fintech scalability, GraphQL microservices, AWS migrations)\nSubmitted Debounce Code Snippet:\n```js\nfunction debounce(fn, delay) {\n  let timer;\n  return function(...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), delay);\n  };\n}\n```",
    agents: [
      {
        id: "agent-interview-1",
        name: "Technical Code Auditor",
        role: "Systems Evaluator",
        description: "Reviews the candidate's code submissions for leaks, performance flaws, and edge cases.",
        systemInstruction: `You are a Principal Software Architect.
Analyze the candidate's submitted Javascript code snippet for:
1. Technical flaws, resource/memory leak risks (e.g. stale event listener bindings, un-cleared timers on component unmounts).
2. Advanced enhancements (e.g., immediate execution flag, custom signal cancellations).
3. Code layout, formatting, and naming standards.
Produce a thorough, expert-level technical evaluation report.`,
        model: "gemini-3.5-flash",
        inputSource: "initial_input",
        temperature: 0.2,
      },
      {
        id: "agent-interview-2",
        name: "Behavioral Assessor",
        role: "Culture Evaluator",
        description: "Formulates role-specific situational questions to assess leadership and soft skills.",
        systemInstruction: `You are an executive HR Director.
Based on the candidate's background, years of experience, and target role, outline:
1. Three high-signal situational questions addressing real-world leadership, team collaboration, and high-pressure system downtime.
2. A list of key green-flag traits to look for in their answers (e.g. ownership, trade-off communication).
3. Recommended rating criteria (1 to 5) for assessing answers.`,
        model: "gemini-3.5-flash",
        inputSource: "initial_input",
        temperature: 0.6,
      },
      {
        id: "agent-interview-3",
        name: "Hiring Report Synthesizer",
        role: "Talent Acquisition Lead",
        description: "Merges technical code reviews and behavioral assessments into a unified candidate feedback profile.",
        systemInstruction: `You are a Senior Talent Acquisition Director.
Integrate both the Technical Code Audit and HR Behavioral questions into a cohesive Candidate Interview Brief.
Include:
1. Executive Summary of Sarah Jenkins' profile.
2. Code review feedback summarized for non-technical stakeholders.
3. Combined onboarding action plan.
Make it concise, elegant, and ready for review.`,
        model: "gemini-3.5-flash",
        inputSource: "custom_blend",
        inputAgentId: "agent-interview-1",
        customBlendTemplate: `Candidate Details: {initial_input}

Code Assessment Report:
{prev_output}`,
        temperature: 0.4,
      },
      {
        id: "agent-interview-4",
        name: "Hiring Decision Director",
        role: "Hiring Committee Chair",
        description: "Generates the official hiring scorecard with rating, recommended salary band, and onboarding recommendations.",
        systemInstruction: `You are the VP of Engineering and Hiring Committee Chair.
Formulate the final, official recruitment recommendation based on the Synthesis Report.
Output a structured:
1. Recommendation (Strong Hire / Hire / Hold / No Hire) with strategic justification.
2. Technical focus areas to probe further if a final round is held.
3. Suggested annual compensation bracket (based on standard Senior Engineer ranges, e.g. $145,000 - $175,000).
4. Onboarding plan for her first 30 days.`,
        model: "gemini-3.5-flash",
        inputSource: "previous_agent",
        inputAgentId: "agent-interview-3",
        temperature: 0.3,
      },
    ],
  },
  {
    id: "automated-research-pipeline",
    name: "Automated Research & Grounding Pipeline",
    description: "A high-fidelity 4-agent academic research pipeline. Summarizes literature, synthesizes metadata patterns, stress-tests claims against logical criteria, and formats an executive science brief.",
    category: "Academic & Research",
    initialInput: "Research Subject: The long-term neurological and cognitive effects of multi-screen microtasking and smartphone notification fragmentation on information workers.",
    agents: [
      {
        id: "agent-res-1",
        name: "Academic Literature Reviewer",
        role: "Lead Scholar",
        description: "Dissects historical studies, extracting experimental hypotheses and neuro-cognitive methodologies.",
        systemInstruction: `You are an elite Cognitive Science Research Professor.
Identify:
1. Three primary neuro-cognitive hypotheses explaining attention fragmentation (e.g., working memory overload, cost of task-switching).
2. Key scientific methodologies typically utilized in these studies (e.g., fMRI scans, subjective attention metrics).
3. Notable historical study themes or baseline academic assumptions.
Provide an academic-grade literature review output with structured headers.`,
        model: "gemini-3.5-flash",
        inputSource: "initial_input",
        temperature: 0.3,
      },
      {
        id: "agent-res-2",
        name: "Meta-Synthesis Analyst",
        role: "Synthesis Director",
        description: "Collates literature findings into a unified, coherent psychological and neurobiological framework.",
        systemInstruction: `You are an expert meta-analyst.
Using the literature findings, map out a cohesive theoretical framework:
1. Link attention switching costs to real-world burnout statistics.
2. Outline the physiological impact (e.g. cortisol spikes, dopamine loop exhaustion).
3. Map a unified cognitive journey of a modern knowledge worker under constant interruption.
Write in a clear, authoritative, and analytical scientific voice.`,
        model: "gemini-3.5-flash",
        inputSource: "previous_agent",
        inputAgentId: "agent-res-1",
        temperature: 0.5,
      },
      {
        id: "agent-res-3",
        name: "Scientific Fact Auditor",
        role: "Rigorous Auditor",
        description: "Audits synthesized claims against criteria of logical consistency and highlights speculative conclusions.",
        systemInstruction: `You are a Chief Peer Reviewer.
Your goal is to peer-review the synthesis report to identify:
1. Speculative or over-extrapolated claims (e.g., claiming notifications cause irreversible damage without longitudinal evidence).
2. Logical inconsistencies or weak transitions between brain chemistry and workplace behavioral outputs.
3. Points that require stronger grounding or additional citations.
List these reviews systematically, followed by a revised, hyper-grounded copy of the core synthesis arguments.`,
        model: "gemini-3.5-flash",
        inputSource: "custom_blend",
        inputAgentId: "agent-res-2",
        customBlendTemplate: `Original Research Subject: "{initial_input}"

Review Meta-Synthesis Report:
{prev_output}`,
        temperature: 0.2,
      },
      {
        id: "agent-res-4",
        name: "Executive Science Brief Writer",
        role: "Science Communicator",
        description: "Distills peer-reviewed arguments into an elegant, high-impact memo designed for business leaders and policy makers.",
        systemInstruction: `You are a World-Class Scientific Journalist.
Translate the audited scientific findings into a compelling 1-page Executive Brief for corporate leaders and policy makers.
Your brief must contain:
1. The Core Scientific Takeaway (the bottom-line truth about multi-screen multitasking).
2. Actionable Organizational Protocols (e.g., email-free focus hours, async-first workspace design).
3. Individual Cognitive Hygiene rules (e.g., attention batching, physical screen boundaries).
Maximize impact with stellar typography layout, direct scannable bullet points, and an objective yet persuasive style.`,
        model: "gemini-3.5-flash",
        inputSource: "previous_agent",
        inputAgentId: "agent-res-3",
        temperature: 0.4,
      },
    ],
  },
  {
    id: "scalable-enterprise-network",
    name: "Scalable Enterprise Software Delivery Network",
    description: "A complex 5-agent pipeline showcasing the studio's advanced scalability, flowing from product specification to tech architecture, development, QA testing, and DevOps container setup.",
    category: "Scalability & Systems",
    initialInput: "Product Goal: An enterprise-grade, event-driven telemetry dashboard designed to ingest, queue, and render up to 10,000 real-time Webhook payloads per second with a high-throughput visualization layer.",
    agents: [
      {
        id: "agent-scale-1",
        name: "Director of Product Management",
        role: "Product Owner",
        description: "Creates detailed user stories, functional requirements, and system-wide constraints.",
        systemInstruction: `You are an Enterprise Product Director.
Analyze the requested product goal and document:
1. Core User Stories (epics, user flows, notification criteria).
2. Key Performance Indicators (KPIs) (e.g. sub-100ms UI update latency, 99.99% ingress success).
3. Product Scope boundaries and out-of-scope items.
Keep it extremely organized, utilizing formal product specs format.`,
        model: "gemini-3.5-flash",
        inputSource: "initial_input",
        temperature: 0.4,
      },
      {
        id: "agent-scale-2",
        name: "Principal Solutions Architect",
        role: "Systems Architect",
        description: "Maps out ingestion buffers, database schemas, and microservice topologies.",
        systemInstruction: `You are a Principal Cloud Systems Architect.
Using the product specifications, design the architectural blueprint:
1. Ingestion Buffer Architecture (e.g. Apache Kafka, Redis Streams, or RabbitMQ queueing).
2. Relational vs NoSQL database selection (Drizzle + PostgreSQL or TimescaleDB for telemetry data).
3. Cache, synchronization, and Event Bus mechanisms.
4. Scale-to-zero configurations for development environments.`,
        model: "gemini-3.5-flash",
        inputSource: "previous_agent",
        inputAgentId: "agent-scale-1",
        temperature: 0.3,
      },
      {
        id: "agent-scale-3",
        name: "Lead Full-Stack React & Node Engineer",
        role: "Principal Developer",
        description: "Produces robust TypeScript components and event handlers reflecting the specifications.",
        systemInstruction: `You are a Senior Staff Engineer.
Write high-performance TypeScript components and ingestion routes:
1. Outlining the SSE (Server-Sent Events) or WebSocket node route in Express.
2. Designing a high-performance React telemetry dashboard component styled with Tailwind.
3. Adding deep structural optimizations (such as state batching and Canvas rendering instead of heavy DOM updates).`,
        model: "gemini-3.5-flash",
        inputSource: "previous_agent",
        inputAgentId: "agent-scale-2",
        temperature: 0.5,
      },
      {
        id: "agent-scale-4",
        name: "QA Automation Lead",
        role: "QA Director",
        description: "Creates end-to-end Cypress test suites and load testing scripts with Playwright/Artillery.",
        systemInstruction: `You are a Principal QA Architect.
Generate a comprehensive automated test strategy:
1. Unit testing definitions for telemetry state calculations.
2. Artillery load-testing configuration YAML definitions simulating 10,000 requests/sec.
3. End-to-end Cypress test scripts confirming ingestion buffer safety and failure recovery.`,
        model: "gemini-3.5-flash",
        inputSource: "previous_agent",
        inputAgentId: "agent-scale-3",
        temperature: 0.3,
      },
      {
        id: "agent-scale-5",
        name: "Cloud DevOps & Platform Engineer",
        role: "Infrastructure Lead",
        description: "Configures optimized multi-stage Dockerfiles, Kubernetes horizontal pod autoscalers, and CI/CD parameters.",
        systemInstruction: `You are a Staff DevOps Engineer.
Using the entire architectural workflow, build the target deployment blueprints:
1. A multi-stage, secure, production-grade Dockerfile for the Express server.
2. Kubernetes Horizontal Pod Autoscaler (HPA) YAML settings targeting high CPU/Memory utilization.
3. A fully automated GitHub Actions CI/CD workflow executing tests and triggering a secure rolling update deployment.
Optimize all configurations for extreme high-availability and zero downtime.`,
        model: "gemini-3.5-flash",
        inputSource: "custom_blend",
        inputAgentId: "agent-scale-4",
        customBlendTemplate: `Architecture, Code and QA Inputs:
{prev_output}

High-Throughput Goals:
{initial_input}`,
        temperature: 0.2,
      },
    ],
  },
];
