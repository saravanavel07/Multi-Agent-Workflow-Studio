import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, Info, Activity } from "lucide-react";
import * as d3 from "d3";
import { Workflow, WorkflowRun } from "../types";

interface VisualConnectionMapProps {
  workflow: Workflow;
  activeRun: WorkflowRun | null;
}

interface GraphNode {
  id: string;
  name: string;
  role: string;
  model?: string;
  status: "idle" | "running" | "completed" | "failed";
  seqIndex: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string;
  target: string;
  type: "initial" | "flow" | "blend";
}

export default function VisualConnectionMap({ workflow, activeRun }: VisualConnectionMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  // Handle container resizing
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({
        width: Math.max(width, 600),
        height: Math.max(height, 350)
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Set up D3 simulation and rendering
  useEffect(() => {
    if (!svgRef.current) return;

    const { width, height } = dimensions;

    // 1. Build Nodes List
    const nodes: GraphNode[] = [];
    
    // Determine the general running status of the whole workflow to light up start node
    const runStatus = activeRun?.status || "idle";
    const startStatus = runStatus !== "idle" ? "completed" : "idle";

    // Add Special "Start" Node
    nodes.push({
      id: "start",
      name: "Global Starting Input",
      role: "Workflow Seed Trigger",
      status: startStatus,
      seqIndex: 0,
    });

    // Add Agent Nodes
    workflow.agents.forEach((agent, idx) => {
      const runState = activeRun?.agentStates[agent.id];
      let agentStatus: "idle" | "running" | "completed" | "failed" = "idle";
      if (runState) {
        agentStatus = runState.status;
      }
      nodes.push({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        model: agent.model,
        status: agentStatus,
        seqIndex: idx + 1,
      });
    });

    // 2. Build Links List
    const links: GraphLink[] = [];
    workflow.agents.forEach((agent, idx) => {
      if (agent.inputSource === "initial_input") {
        links.push({
          source: "start",
          target: agent.id,
          type: "initial",
        });
      } else if (agent.inputSource === "previous_agent") {
        if (agent.inputAgentId && workflow.agents.some(a => a.id === agent.inputAgentId)) {
          links.push({
            source: agent.inputAgentId,
            target: agent.id,
            type: "flow",
          });
        } else if (idx > 0) {
          links.push({
            source: workflow.agents[idx - 1].id,
            target: agent.id,
            type: "flow",
          });
        }
      } else if (agent.inputSource === "custom_blend") {
        // Blends both starting input AND the selected preceding agent output
        links.push({
          source: "start",
          target: agent.id,
          type: "initial",
        });
        if (agent.inputAgentId && workflow.agents.some(a => a.id === agent.inputAgentId)) {
          links.push({
            source: agent.inputAgentId,
            target: agent.id,
            type: "blend",
          });
        } else if (idx > 0) {
          links.push({
            source: workflow.agents[idx - 1].id,
            target: agent.id,
            type: "blend",
          });
        }
      }
    });

    // Clean up any old SVG rendering
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Append internal styling for animations
    svg.append("style").text(`
      @keyframes link-flow-active {
        to {
          stroke-dashoffset: -16;
        }
      }
      .flow-link-active {
        stroke-dasharray: 6, 4;
        animation: link-flow-active 0.8s linear infinite;
      }
      .flow-link-completed {
        stroke-dasharray: 8, 4;
        animation: link-flow-active 2.5s linear infinite;
      }
      @keyframes status-pulse {
        0% { transform: scale(1); opacity: 0.9; }
        50% { transform: scale(1.3); opacity: 0.4; }
        100% { transform: scale(1); opacity: 0.9; }
      }
      .pulse-indicator {
        transform-origin: center;
        animation: status-pulse 1.8s infinite ease-in-out;
      }
    `);

    // Define Defs for Arrow Markers
    const defs = svg.append("defs");
    
    // Sleek Gray Arrow (Idle)
    defs.append("marker")
      .attr("id", "arrow-idle")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 7)
      .attr("refY", 5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M 0 1 L 10 5 L 0 9 z")
      .attr("fill", "#cbd5e1");

    // Dynamic Indigo Arrow (Running)
    defs.append("marker")
      .attr("id", "arrow-running")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 7)
      .attr("refY", 5)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M 0 1 L 10 5 L 0 9 z")
      .attr("fill", "#6366f1");

    // Radiant Emerald Arrow (Completed)
    defs.append("marker")
      .attr("id", "arrow-completed")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 7)
      .attr("refY", 5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M 0 1 L 10 5 L 0 9 z")
      .attr("fill", "#10b981");

    // 3. Set Up Interactive Pan & Zoom
    const svgGroup = svg.append("g").attr("id", "zoom-canvas-group");
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on("zoom", (event) => {
        svgGroup.attr("transform", event.transform.toString());
      });
    svg.call(zoomBehavior as any);

    // Initial position calculator based on linear sequence sequence rank
    nodes.forEach((node) => {
      node.x = 120 + node.seqIndex * 270;
      node.y = height / 2 + (node.id === "start" ? 0 : (node.seqIndex % 2 === 0 ? 30 : -30));
    });

    // 4. Set Up Force Simulation to keep nodes nicely distributed & draggable
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, any>(links)
        .id((d) => d.id)
        .distance(270)
        .strength(0.2)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("collision", d3.forceCollide().radius(110))
      .force("x", d3.forceX<GraphNode>()
        .x((d) => 120 + d.seqIndex * 270)
        .strength(0.9)
      )
      .force("y", d3.forceY<GraphNode>()
        .y(height / 2)
        .strength(0.4)
      );

    simulationRef.current = simulation;

    // 5. Draw Links (Sleek bezier connections)
    const link = svgGroup.append("g")
      .attr("class", "links-layer")
      .selectAll("path")
      .data(links)
      .enter()
      .append("path")
      .attr("fill", "none")
      .attr("stroke", (d: any) => {
        const targetState = nodes.find(n => n.id === d.target.id || n.id === d.target);
        if (targetState?.status === "running") return "#6366f1";
        if (targetState?.status === "completed") return "#10b981";
        if (targetState?.status === "failed") return "#f43f5e";
        return "#cbd5e1";
      })
      .attr("stroke-width", (d: any) => {
        const targetState = nodes.find(n => n.id === d.target.id || n.id === d.target);
        return targetState?.status === "running" ? 3 : 1.75;
      })
      .attr("class", (d: any) => {
        const targetState = nodes.find(n => n.id === d.target.id || n.id === d.target);
        if (targetState?.status === "running") return "flow-link-active";
        if (targetState?.status === "completed") return "flow-link-completed";
        return "";
      })
      .attr("marker-end", (d: any) => {
        const targetState = nodes.find(n => n.id === d.target.id || n.id === d.target);
        if (targetState?.status === "running") return "url(#arrow-running)";
        if (targetState?.status === "completed") return "url(#arrow-completed)";
        return "url(#arrow-idle)";
      });

    // 6. Draw Nodes Group
    const node = svgGroup.append("g")
      .attr("class", "nodes-layer")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "cursor-grab active:cursor-grabbing select-none")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any
      );

    // Background Cards definition
    node.each(function (d: any) {
      const g = d3.select(this);

      if (d.id === "start") {
        // Draw Start Node (Pill Card)
        g.append("rect")
          .attr("x", -90)
          .attr("y", -30)
          .attr("width", 180)
          .attr("height", 60)
          .attr("rx", 30)
          .attr("stroke-width", 2)
          .attr("class", "fill-slate-50 dark:fill-slate-950 stroke-slate-200 dark:stroke-slate-800 shadow-sm filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.03)]");

        // Dynamic Glow Circle for active pipeline runs
        if (d.status === "completed") {
          g.append("rect")
            .attr("x", -93)
            .attr("y", -33)
            .attr("width", 186)
            .attr("height", 66)
            .attr("rx", 33)
            .attr("fill", "none")
            .attr("stroke", "#38bdf8")
            .attr("stroke-width", 1.5)
            .attr("class", "opacity-60");
        }

        // Title text
        g.append("text")
          .attr("x", 0)
          .attr("y", -1)
          .attr("text-anchor", "middle")
          .attr("class", "font-sans font-bold text-[11px] fill-slate-800 dark:fill-slate-200")
          .text(d.name);

        // Subtitle role text
        g.append("text")
          .attr("x", 0)
          .attr("y", 13)
          .attr("text-anchor", "middle")
          .attr("class", "font-mono font-bold text-[9px] uppercase tracking-wider fill-sky-600 dark:fill-sky-400")
          .text(d.role);

        // Small indicator icon anchor point
        g.append("circle")
          .attr("cx", -65)
          .attr("cy", 0)
          .attr("r", 4)
          .attr("fill", "#0284c7");
      } else {
        // Draw Agent Node (Box Card)
        const isRunning = d.status === "running";
        const isCompleted = d.status === "completed";
        const isFailed = d.status === "failed";

        let cardStroke = "#e2e8f0";
        let titleFill = "fill-indigo-600";
        if (isRunning) {
          cardStroke = "#6366f1";
          titleFill = "fill-indigo-700";
        } else if (isCompleted) {
          cardStroke = "#10b981";
          titleFill = "fill-emerald-700";
        } else if (isFailed) {
          cardStroke = "#f43f5e";
          titleFill = "fill-rose-700";
        }

        // Shadow and background
        g.append("rect")
          .attr("x", -110)
          .attr("y", -40)
          .attr("width", 220)
          .attr("height", 80)
          .attr("rx", 14)
          .attr("stroke", cardStroke)
          .attr("stroke-width", isRunning ? 2.5 : 1.5)
          .attr("class", `fill-white dark:fill-slate-950 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.04)] hover:drop-shadow-md transition-all duration-300`);

        // Node Side-color vertical status stripe
        g.append("rect")
          .attr("x", -109)
          .attr("y", -30)
          .attr("width", 4.5)
          .attr("height", 60)
          .attr("rx", 2)
          .attr("fill", isRunning ? "#6366f1" : isCompleted ? "#10b981" : isFailed ? "#f43f5e" : "#94a3b8");

        // Sequence badge
        g.append("text")
          .attr("x", -93)
          .attr("y", -18)
          .attr("class", `font-mono font-bold text-[8.5px] tracking-wider uppercase ${titleFill}`)
          .text(`NODE #${d.seqIndex}`);

        // Agent Name
        const truncatedName = d.name.length > 22 ? d.name.slice(0, 20) + "..." : d.name;
        g.append("text")
          .attr("x", -93)
          .attr("y", -1)
          .attr("class", "font-sans font-bold text-[11.5px] fill-slate-800 dark:fill-slate-100")
          .text(truncatedName);

        // Agent Expertise Role
        const truncatedRole = d.role.length > 28 ? d.role.slice(0, 25) + "..." : d.role;
        g.append("text")
          .attr("x", -93)
          .attr("y", 13)
          .attr("class", "font-sans font-medium text-[9.5px] fill-slate-500 dark:fill-slate-400 italic")
          .text(truncatedRole);

        // Model tag (code style)
        g.append("text")
          .attr("x", -93)
          .attr("y", 26)
          .attr("class", "font-mono text-[8.5px] fill-slate-400 dark:fill-slate-500 font-semibold")
          .text(d.model || "gemini-3.5-flash");

        // Status Indicator Lamp with Pulse Animation
        const statusGroup = g.append("g").attr("transform", "translate(92, -22)");

        if (isRunning) {
          // Glow pulse circle behind
          statusGroup.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 7)
            .attr("fill", "#6366f1")
            .attr("class", "pulse-indicator");

          statusGroup.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 4)
            .attr("fill", "#4f46e5");
        } else if (isCompleted) {
          statusGroup.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 4.5)
            .attr("fill", "#10b981");
        } else if (isFailed) {
          statusGroup.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 4.5)
            .attr("fill", "#f43f5e");
        } else {
          statusGroup.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 3.5)
            .attr("fill", "#94a3b8");
        }
      }
    });

    // 7. Simulation Tick updates
    simulation.on("tick", () => {
      // S-curve connector drawing logic
      link.attr("d", (d: any) => {
        const sourceX = d.source.id === "start" ? d.source.x + 90 : d.source.x + 110;
        const sourceY = d.source.y;
        const targetX = d.target.x - 110;
        const targetY = d.target.y;

        const dx = Math.abs(targetX - sourceX) * 0.45;
        return `M ${sourceX} ${sourceY} C ${sourceX + dx} ${sourceY}, ${targetX - dx} ${targetY}, ${targetX} ${targetY}`;
      });

      node.attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
    });

    // Fit view function by default
    const initialTransform = d3.zoomIdentity.translate(20, 0).scale(Math.min(1, width / (nodes.length * 270 + 200)));
    svg.call(zoomBehavior.transform as any, initialTransform);

    // Drag behavior implementations
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = event.x;
      d.fy = event.y;
    }

    return () => {
      simulation.stop();
    };
  }, [workflow, activeRun, dimensions]);

  // Reset the zoom & pan back to visual default
  const handleResetZoom = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const { width } = dimensions;
    const nodesCount = workflow.agents.length + 1;
    const defaultTransform = d3.zoomIdentity.translate(20, 0).scale(Math.min(1, width / (nodesCount * 270 + 200)));
    
    svg.transition()
      .duration(500)
      .call(d3.zoom().transform as any, defaultTransform);
  };

  // Zoom incremental buttons
  const handleZoomIn = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(200)
      .call(d3.zoom().scaleBy as any, 1.25);
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(200)
      .call(d3.zoom().scaleBy as any, 0.8);
  };

  // Unlock all nodes from pinned coords
  const handleUnlockPositions = () => {
    if (simulationRef.current) {
      simulationRef.current.nodes().forEach((n: any) => {
        n.fx = null;
        n.fy = null;
      });
      simulationRef.current.alpha(0.5).restart();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[400px] relative transition-colors duration-200">
      {/* Topology Header Controls */}
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40 transition-colors duration-200">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">Dynamic Flow Topology</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUnlockPositions}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Unlock and recalculate card layout"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-0.5" />
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Reset Viewport"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* D3 Canvas container */}
      <div ref={containerRef} className="flex-1 w-full h-full relative bg-dot-grid overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full block select-none"
          style={{ minHeight: "100%" }}
        />

        {/* Hover Information overlay */}
        <div className="absolute bottom-3 left-4 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs text-[9.5px] text-slate-500 dark:text-slate-400 font-medium">
          <Info className="w-3 h-3 text-indigo-500" />
          <span>Nodes are interactive! Drag nodes to arrange or mouse wheel to zoom/pan.</span>
        </div>
      </div>
    </div>
  );
}
