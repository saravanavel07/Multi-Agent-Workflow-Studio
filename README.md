# Multi-Agent Workflow Studio

A visual, browser-based workflow designer for building and running multi-agent AI pipelines with Gemini models. It lets you chain specialized agents into a directed execution flow, test prompts in real time, track cost and token usage, and manage versioned workflow snapshots in a single interface.

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-99.2%25-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js" alt="Node.js Express" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite" alt="Vite 6" />
</p>

## Overview

Multi-Agent Workflow Studio is a no-code/low-code environment for designing AI agent graphs. Instead of writing brittle pipelines by hand, you can create agent nodes, define their roles and instructions, connect them serially or through dynamic data blending, and execute the workflow against any prompt.

The app combines:

- a visual workflow canvas for designing agent chains
- an execution runner for sequential workflow orchestration
- a dashboard for run history, token metrics, and cost estimation
- version snapshots for restoring previous workflow states
- batch execution support for multiple inputs
- import/export of workflow blueprints

This project is built using React on the front end and an Express + Vite server on the back end, with Gemini-powered generation through the official Google GenAI SDK.

## Features

### Visual workflow authoring
- Create, edit, reorder, clone, and delete agent nodes
- Configure agent role, system instruction, model, and temperature
- Choose input sources such as initial input, previous agent output, or custom blend templates
- Save workflow versions and restore them later

### Execution intelligence
- Run a workflow step-by-step with live status tracking
- Pause and resume execution mid-pipeline
- Review per-agent output, input, duration, cost, and token counts
- Execute batch runs across multiple prompts

### Analytics and monitoring
- Monitor historical workflow runs
- Evaluate token usage and estimate model costs
- View execution status and debug agent failures
- Track workflow performance from the built-in dashboard

### Workflow portability
- Export workflows as JSON
- Import workflow definitions from JSON files
- Reset to bundled default templates or create custom pipelines

## Tech Stack

- Frontend: React 19, Vite, TypeScript
- Styling: Tailwind CSS
- Backend: Express.js, Node.js
- AI Integration: Google GenAI SDK (`@google/genai`)
- Visualization: D3, Recharts
- Animation/UI: Lucide, Motion

## Project Structure

```text
.
├── src/
│   ├── components/
│   │   ├── AgentDrawer.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── WorkflowCanvas.tsx
│   │   ├── WorkflowRunner.tsx
│   │   └── ...
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── templates.ts
│   ├── types.ts
│   └── ...
├── server.ts
├── index.html
├── metadata.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── package-lock.json
├── README.md
└── .env.example (if added in your environment)
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A valid Gemini API key from Google AI Studio

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_google_gemini_api_key_here
```

### 3. Run the development server

```bash
npm run dev
```

This starts the Express server and Vite dev environment for the application.

### 4. Build for production

```bash
npm run build
```

### 5. Start the production build

```bash
npm run start
```

## Available Scripts

```json
{
  "dev": "tsx server.ts",
  "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
  "start": "node dist/server.cjs",
  "clean": "rm -rf dist server.js",
  "lint": "tsc --noEmit"
}
```

## Workflow Model

Each workflow is composed of one or more agent nodes. A node can receive input from:

- the global workflow input
- the previous agent in sequence
- a custom prompt template blending both sources

This makes it easy to create structured AI pipelines such as:

- research planning
- content drafting
- technical review
- analysis and summarization pipelines
- orchestration flows with multiple specialized agents

## Example Use Cases

- AI interview assistant workflows
- Research synthesis pipelines
- Product and engineering requirement generation
- Automated QA and review agents
- Multi-step prompt orchestration for enterprise tasks

## Architecture Notes

The backend exposes a lightweight API used by the front end:

- `POST /api/run-agent` executes a single agent with a model and system instructions
- `POST /api/suggest-prompt` generates a prompt recommendation from a role and description
- `GET /api/health` returns server health status

This separation allows the UI to remain interactive while using server-side execution and model access for AI requests.

## Contributing

Contributions are welcome. If you would like to improve the app, add new workflow templates, refine the UX, or fix bugs, please open an issue or submit a pull request.

## License

This project currently does not include an explicit license file. If you plan to distribute or reuse it publicly, add a license that matches your intended usage rights.

## Author

Built for exploring agent workflows, orchestration patterns, and AI application prototyping.

## Notes

- The repository is primarily TypeScript-based and optimized for workflow experimentation and dashboard-driven AI execution.
- Model pricing and token metrics are estimated using the Gemini API metadata and displayed in the interface.
- Persisted workflow and run history are stored locally in the browser to support interactive demos and rapid iteration.

---

If you want, I can also create a cleaner version with:
- a branded hero section
- screenshot placeholders
- a more enterprise-style marketing README
- a GitHub-ready badge suite and demo GIF section
- a shorter, minimal README for public repos