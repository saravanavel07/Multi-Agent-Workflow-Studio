import { ChangeEvent, useState } from "react";
import { Bot, Layers, Plus, Trash2, FolderSync, Info, Download, Upload, Search, X } from "lucide-react";
import { Workflow } from "../types";

interface SidebarProps {
  workflows: Workflow[];
  activeWorkflowId: string;
  onSelectWorkflow: (id: string) => void;
  onCreateWorkflow: () => void;
  onDeleteWorkflow: (id: string) => void;
  onResetToDefault: () => void;
  onExportWorkflow: () => void;
  onImportWorkflow: (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function Sidebar({
  workflows,
  activeWorkflowId,
  onSelectWorkflow,
  onCreateWorkflow,
  onDeleteWorkflow,
  onResetToDefault,
  onExportWorkflow,
  onImportWorkflow,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter workflows by search query (matching name or category)
  const filteredWorkflows = workflows.filter((wf) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const nameMatch = (wf.name || "").toLowerCase().includes(query);
    const catMatch = (wf.category || "").toLowerCase().includes(query);
    return nameMatch || catMatch;
  });

  // Separate into pre-built templates vs custom user creations
  const systemTemplates = filteredWorkflows.filter((w) => !w.id.startsWith("user-"));
  const userWorkflows = filteredWorkflows.filter((w) => w.id.startsWith("user-"));

  return (
    <aside className="w-full lg:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 transition-colors duration-200">
      {/* Header / Actions */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2.5">
        <button
          onClick={onCreateWorkflow}
          id="btn-create-workflow"
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-md shadow-indigo-100 border border-indigo-600 text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create New Workflow
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onExportWorkflow}
            id="btn-export-workflow"
            className="flex items-center justify-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold px-3 py-2 rounded-xl transition border border-slate-200 dark:border-slate-800 text-xs cursor-pointer shadow-2xs"
            title="Export current workflow config to a JSON file"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            Export Config
          </button>

          <label
            id="lbl-import-workflow"
            className="flex items-center justify-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold px-3 py-2 rounded-xl transition border border-slate-200 dark:border-slate-800 text-xs cursor-pointer shadow-2xs"
            title="Import workflow config from a JSON file"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            Import JSON
            <input
              type="file"
              accept=".json"
              onChange={onImportWorkflow}
              className="hidden"
            />
          </label>
        </div>

        <button
          onClick={onResetToDefault}
          id="btn-reset-defaults"
          className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-4 py-2 rounded-xl transition border border-slate-200 dark:border-slate-700 text-xs cursor-pointer"
        >
          <FolderSync className="w-3.5 h-3.5" />
          Reset All to Defaults
        </button>
      </div>

      {/* Sticky Search bar */}
      <div className="px-4 pt-4 pb-0 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter workflows by name or category..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-0.5 rounded-md cursor-pointer"
              title="Clear search filter"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Workflow Selection List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* No Search Matches */}
        {filteredWorkflows.length === 0 && (
          <div className="text-center py-12 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-950/20">
            <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2.5" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No matching workflows</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
              No templates or custom pipelines match &ldquo;{searchQuery}&rdquo;.
            </p>
          </div>
        )}

        {/* Templates Section */}
        {systemTemplates.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Studio Templates</span>
            </div>

            <div className="space-y-2">
              {systemTemplates.map((wf) => {
                const isActive = activeWorkflowId === wf.id;
                return (
                  <div
                    key={wf.id}
                    onClick={() => onSelectWorkflow(wf.id)}
                    className={`group p-3.5 rounded-xl border transition cursor-pointer text-left relative overflow-hidden ${
                      isActive
                        ? "bg-slate-50 dark:bg-slate-950/60 border-indigo-500 dark:border-indigo-500 shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-sm font-semibold transition ${
                        isActive ? "text-slate-900 dark:text-slate-100" : "text-slate-800 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                      }`}>
                        {wf.name}
                      </h3>
                      <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                        isActive 
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/30" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}>
                        {wf.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {wf.description}
                    </p>
                    <div className={`mt-2.5 flex items-center gap-1 text-[11px] font-mono font-semibold ${
                      isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"
                    }`}>
                      <Bot className="w-3.5 h-3.5" />
                      <span>{wf.agents.length} Agent Node{wf.agents.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* User Saved Workflows Section */}
        {(userWorkflows.length > 0 || !searchQuery) && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
              <Bot className="w-3.5 h-3.5 text-indigo-500" />
              <span>Custom Workflows</span>
            </div>

            {userWorkflows.length === 0 ? (
              <div className="text-center py-6 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40">
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                  No custom workflows yet. Click &quot;Create New Workflow&quot; to build your own!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {userWorkflows.map((wf) => {
                  const isActive = activeWorkflowId === wf.id;
                  return (
                    <div
                      key={wf.id}
                      onClick={() => onSelectWorkflow(wf.id)}
                      className={`group p-3.5 rounded-xl border transition cursor-pointer text-left relative overflow-hidden ${
                        isActive
                          ? "bg-slate-50 dark:bg-slate-950/60 border-indigo-500 dark:border-indigo-500 shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`text-sm font-semibold transition truncate ${
                          isActive ? "text-slate-900 dark:text-slate-100" : "text-slate-800 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                        }`}>
                          {wf.name || "Untitled Workflow"}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteWorkflow(wf.id);
                          }}
                          className="text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Delete workflow"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {wf.description || "No description provided."}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className={`text-[11px] font-mono font-semibold flex items-center gap-1 ${
                          isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"
                        }`}>
                          <Layers className="w-3.5 h-3.5" />
                          {wf.agents.length} Agent{wf.agents.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Guide Panel in Sidebar Foot */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-3.5">
        <div className="flex gap-2 text-xs text-slate-600 dark:text-slate-400">
          <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Multi-agent systems pass outputs to subsequent nodes. Connect inputs to compose powerful contextual chains!
          </p>
        </div>

        <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono block mb-1.5">Keyboard Shortcuts</span>
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900/60 px-2 py-1 rounded">
              <span>Run Pipeline</span>
              <kbd className="bg-white dark:bg-slate-800 px-1 rounded shadow-3xs text-[9px] border border-slate-200 dark:border-slate-700 font-bold">Ctrl+R</kbd>
            </div>
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900/60 px-2 py-1 rounded">
              <span>Save Version</span>
              <kbd className="bg-white dark:bg-slate-800 px-1 rounded shadow-3xs text-[9px] border border-slate-200 dark:border-slate-700 font-bold">Ctrl+S</kbd>
            </div>
            <div className="col-span-2 flex items-center justify-between bg-slate-100 dark:bg-slate-900/60 px-2 py-1 rounded">
              <span>Add New Node</span>
              <kbd className="bg-white dark:bg-slate-800 px-1.5 rounded shadow-3xs text-[9px] border border-slate-200 dark:border-slate-700 font-bold">Ctrl+Shift+A</kbd>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
