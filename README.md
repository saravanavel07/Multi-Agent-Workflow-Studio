# Multi-Agent Orchestration Studio

An enterprise-grade, high-fidelity orchestration studio for designing, testing, and scaling sequential AI agent networks (Directed Acyclic Graphs) using Gemini 2.5/3.5 models. This workspace empowers developers, architects, and product leaders to build robust pipelines, automate complex multi-stage tasks, execute heavy batches, and monitor full telemetry logs.

---

## 🚀 Architectural Foundations & Core Features

### 1. Dynamic DAG State-Chaining Backplane
* **Zero-overhead State Resolution**: Parent agent nodes propagate structured outputs to downstream siblings in sub-1ms using an in-memory caching context.
* **Flexible Input-Blending Patterns**: Agents can consume direct global instructions (`initial_input`), output from immediate sequential steps (`previous_agent`), or dynamic formatted prompts blending multiple parent outputs (`custom_blend`).
* **Scale-to-Zero Deployment Support**: Ready for Cloud Run containers, listening on single ingress ports, and optimized for minimal cold-start container latency.

### 2. High-Fidelity Evaluation Metrics & Token Tracking
Each pipeline execution collects full-stack telemetry and records it in the dynamic Analytics Dashboard:
* **Real-time Latency Profiling**: Tracks duration (ms) for every single node in the execution pathway.
* **Granular Input/Output Token Counters**: Real-time evaluation of token size for incoming system instructions, context variables, and generated responses.
* **Precise API Cost Estimation**: Calculates real-time API spend in USD using native usage metadata:
  * **Gemini Flash Series**: `$0.075 / 1M` input tokens and `$0.30 / 1M` output tokens.
  * **Gemini Pro Series**: `$1.25 / 1M` input tokens and `$5.00 / 1M` output tokens.
* **Overall Quality KPIs**: Summarizes global success/failure rates, aggregate latency, total accumulated spend, and popular model distributions on the dashboard telemetry hub.

### 3. Parallelized Batch Ingestion Mode
* **Multi-Input Sequencing**: Trigger any active pipeline configuration against multiple distinct input prompts simultaneously (one per line).
* **Aggregated Group History**: Group batch runs inside the database log history to let users expand specific execution groups, trace progress bars in real-time, and compare output differences across runs.

---

## 🛠️ Showcase Workflows (Ready-to-Use Templates)

We have expanded beyond generic templates to include enterprise and academic blueprints demonstrating robust scalability:

### 💼 AI Interview & Technical Recruiting Assistant
A comprehensive 4-agent interview assessment funnel that structures developer onboarding:
1. **Technical Code Auditor**: Performs deep static analysis on candidate code submissions for performance flaws, memory leaks, and un-cleared intervals.
2. **Behavioral Assessor**: Generates targeted situational leadership questions custom-tailored to the candidate's core resume.
3. **Hiring Report Synthesizer**: Blends technical findings with culture criteria into an executive brief.
4. **Hiring Decision Director**: Outputs a structured hiring committee scorecard with recommended salary brackets and a 30-day onboarding plan.

### 🔬 Automated Research & Grounding Pipeline
A high-signal 4-agent academic research pipeline:
1. **Academic Literature Reviewer**: Dissects research subjects and extracts experimental hypotheses.
2. **Meta-Synthesis Analyst**: Synthesizes cross-study literature into a unified biological and psychological theory.
3. **Scientific Fact Auditor**: Acts as a rigorous peer reviewer, pruning speculative claims and strengthening factual grounding.
4. **Executive Science Brief Writer**: Translates peer-reviewed outcomes into high-impact corporate policy memos.

### ⚡ Scalable Enterprise Software Delivery Network
A complex 5-agent pipeline demonstrating maximum DAG capability under heavy data volumes:
1. **Director of Product Management**: Writes comprehensive specifications, user epics, and engineering requirements.
2. **Principal Solutions Architect**: Maps cloud topologies, queues (Kafka/Redis Streams), and DB schemas (Drizzle/PostgreSQL).
3. **Lead Developer**: Generates high-performance TypeScript code, server routes, and web hooks.
4. **QA Automation Lead**: Drafts Cypress suites and Artillery load-testing YAML specifications.
5. **Platform DevOps Engineer**: Assembles multi-stage Dockerfiles, horizontal autoscaling manifests, and CI/CD parameters.

---

## 💻 Tech Stack & Installation

* **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Framer Motion
* **Backend**: Node.js Express Server, tsx compiler, esbuild production bundler
* **AI Model SDK**: `@google/genai` (TypeScript/Node standard package)

### Dev Environment Setup
1. Define the Gemini API Key inside a `.env` file:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
2. Install dependencies and boot the development workspace:
   ```bash
   npm install
   npm run dev
   ```
3. Compile the production bundle:
   ```bash
   npm run build
   ```
4. Spin up the bundled app:
   ```bash
   npm run start
   ```

---

## 📊 Telemetry Screenshot & Logs
All execution logs, detailed markdown reports, node errors, and token cost estimations are rendered dynamically under the **Dashboard** view in the application header. Switch layouts seamlessly to inspect, review, or copy final pipeline scorecards!
