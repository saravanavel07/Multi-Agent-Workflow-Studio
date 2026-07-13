import { useEffect, useState } from "react";
import { Bot, Cpu, Link2, RefreshCw, Server, Sparkles, Sun, Moon } from "lucide-react";

export default function Navbar() {
  const [serverStatus, setServerStatus] = useState<"connecting" | "healthy" | "failed">("connecting");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          setServerStatus("healthy");
        } else {
          setServerStatus("failed");
        }
      } catch (err) {
        setServerStatus("failed");
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 py-4 sticky top-0 z-50 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/40 shadow-indigo-100/20 shadow-sm">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
                Multi-Agent Workflow Studio
              </h1>
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/50 font-bold">
                v1.2
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Design, sequence, and execute custom Gemini collaborative workflows
            </p>
          </div>
        </div>

        {/* Server Status, Theme Toggle, and Metadata */}
        <div className="flex items-center gap-3.5 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-1.5 border border-slate-200 dark:border-slate-800 transition-colors duration-200">
            <Server className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Backend Status:</span>
            {serverStatus === "connecting" && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Connecting
              </span>
            )}
            {serverStatus === "healthy" && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Healthy
              </span>
            )}
            {serverStatus === "failed" && (
              <span className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Offline
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-indigo-300 font-mono bg-indigo-50/60 dark:bg-indigo-950/30 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 transition-colors duration-200">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-700 dark:text-indigo-300 font-semibold">Gemini 3.5 Flash Active</span>
          </div>

          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            id="theme-toggle-btn"
            className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all duration-200 shadow-2xs cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? (
              <Sun className="w-4.5 h-4.5 text-amber-500" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-slate-600 hover:text-indigo-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
