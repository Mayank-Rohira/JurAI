"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Scale,
    Shield,
    CheckCircle2,
    ChevronRight,
    Gavel,
    FileText,
    Activity,
    Brain,
    Clock,
    BookOpen,
    ScrollText,
    Search,
    Users,
    Hammer,
    Sparkles,
    Zap,
    Target,
    Award,
    LineChart,
    Home,
    User,
    Settings
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { api, API_BASE_URL } from "@/lib/api";
import { juraiStorage, Session } from "@/lib/storage";
import { NavBar } from "@/components/NavBar";

// --- Navigation Component ---
// Locally defined Navigation removed in favor of shared NavBar

// Three agents with detailed roles
const AGENTS = [
    {
        name: "Regulation Detective",
        title: "Regulatory Analyst",
        icon: Shield,
        id: "REG-001",
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        ringColor: "ring-blue-500/20",
        position: { x: "left-8", y: "top-8" },
        role: "Analyzes regulatory compliance with GDPR, CCPA, and other data protection laws"
    },
    {
        name: "Design Counsel",
        title: "UI Auditor",
        icon: Scale,
        id: "CRT-009",
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/20",
        ringColor: "ring-purple-500/20",
        position: { x: "right-8", y: "top-8" },
        role: "Reviews UI/UX for dark patterns, accessibility issues, and deceptive practices"
    },
    {
        name: "Compliance Validator",
        title: "Compliance Lead",
        icon: CheckCircle2,
        id: "JDG-100",
        color: "text-teal",
        bgColor: "bg-teal/10",
        borderColor: "border-teal/20",
        ringColor: "ring-teal/20",
        position: { x: "left-1/2", y: "top-8" },
        role: "Evaluates all evidence and delivers final legal verdict"
    },
];

export default function AnalysisPage() {
    const [analyzing, setAnalyzing] = useState(true);
    const [runId, setRunId] = useState<string | null>(null);
    const [featureId, setFeatureId] = useState<string | null>(null);
    const [activeThinker, setActiveThinker] = useState<string | null>(null);
    const [currentReport, setCurrentReport] = useState<string | null>("Initializing System...");
    const [agentThoughts, setAgentThoughts] = useState<{ [key: string]: string[] }>({
        "REG-001": [],
        "CRT-009": [],
        "JDG-100": []
    });

    // Track expanded state for clicking agents
    const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

    const thoughtRefs = {
        "REG-001": useRef<HTMLDivElement>(null),
        "CRT-009": useRef<HTMLDivElement>(null),
        "JDG-100": useRef<HTMLDivElement>(null)
    };

    // Helper to map backend agent names to frontend IDs
    const getAgentIdFromName = (name: string) => {
        if (name.includes("Jury") || name.includes("Primary")) return "REG-001";
        if (name.includes("Critic") || name.includes("Reviewer")) return "CRT-009";
        if (name.includes("Judge")) return "JDG-100";
        return "REG-001"; // Default
    };

    // Auto-scroll logic
    useEffect(() => {
        if (activeThinker && thoughtRefs[activeThinker as keyof typeof thoughtRefs]?.current) {
            const thoughtBox = thoughtRefs[activeThinker as keyof typeof thoughtRefs].current;
            if (thoughtBox) {
                thoughtBox.scrollTop = thoughtBox.scrollHeight;
            }
        }
    }, [agentThoughts, activeThinker]);

    // --- MAIN PIPELINE LOGIC ---
    useEffect(() => {
        let isMounted = true;
        const searchParams = new URLSearchParams(window.location.search);
        const rId = searchParams.get("run_id");
        const fId = searchParams.get("feature_id");
        setRunId(rId);
        setFeatureId(fId);
        const pipelineContext = localStorage.getItem("pipeline_context");

        const init = async () => {
            // 1. STREAMING MODE (New Analysis) - Triggered when context exists
            if (pipelineContext && !runId) {
                try {
                    const contextData = JSON.parse(pipelineContext);
                    // REMOVED: localStorage.removeItem("pipeline_context"); -- Moved to "done" event to support StrictMode remounts

                    // Start the stream
                    const response = await fetch(`${API_BASE_URL}/stream/pipeline`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(contextData)
                    });

                    if (!response.body) throw new Error("No stream body");

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = "";

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        let lines = buffer.split("\n");
                        // Keep the last partial line in buffer
                        buffer = lines.pop() || "";

                        let currentEventType = "message"; // default

                        for (const line of lines) {
                            const trimmedLine = line.trim();
                            if (!trimmedLine) continue;

                            if (trimmedLine.startsWith("event:")) {
                                currentEventType = trimmedLine.substring(6).trim();
                            } else if (trimmedLine.startsWith("data:")) {
                                const dataStr = trimmedLine.substring(5).trim();

                                try {
                                    // Handle Events based on type
                                    if (currentEventType === "done") {
                                        // PIPELINE COMPLETE -> TRIGGER AUTOFIX -> SHOW BUTTON
                                        if (isMounted) setCurrentReport("Analysis complete. Finalizing report...");

                                        localStorage.removeItem("pipeline_context"); // Consume context now that we are done

                                        const payload = JSON.parse(dataStr);
                                        
                                        // Update state with IDs from stream immediately
                                        if (payload.run_id) setRunId(payload.run_id);
                                        if (payload.feature_id) setFeatureId(payload.feature_id);

                                        if (payload.feature_id && payload.run_id) {
                                            // Update URL with real IDs so user can refresh if needed
                                            const newUrl = `${window.location.pathname}?run_id=${payload.run_id}&feature_id=${payload.feature_id}`;
                                            window.history.replaceState({}, '', newUrl);

                                            // Sync with Storage
                                            const currentUser = juraiStorage.getCurrentUser();
                                            if (currentUser) {
                                                juraiStorage.saveSession({
                                                    id: payload.feature_id,
                                                    userId: currentUser.id,
                                                    status: "completed",
                                                    lastRunId: payload.run_id
                                                });
                                            }

                                            // Trigger Autofix in background
                                            try {
                                                await api.pipeline.runAutofix(payload.feature_id, payload.run_id);
                                            } catch (autofixError) {
                                                console.error("Background autofix failed:", autofixError);
                                            }
                                        }

                                        if (isMounted) {
                                            setCurrentReport("Analysis complete. Finalizing report...");
                                            setAnalyzing(false); // This shows the button
                                        }
                                        return;
                                    }
                                    else if (currentEventType === "status") {
                                        // Generic status update
                                        const msg = dataStr.startsWith('"') ? JSON.parse(dataStr) : dataStr;
                                        if (isMounted) setCurrentReport(msg);
                                    }
                                    else if (currentEventType === "error") {
                                        console.error("Stream Error:", dataStr);
                                        if (isMounted) setCurrentReport("Error: " + dataStr);
                                        // Might want to stop analysis or show error state
                                        if (isMounted) setAnalyzing(false);
                                    }
                                    else if (currentEventType === "diff" || currentEventType === "risk") {
                                        // These are background results, just ignore for UI stream, 
                                        // or update report text
                                        if (isMounted) setCurrentReport(`Processing ${currentEventType} analysis...`);
                                    }
                                    else if (
                                        currentEventType === "jury_thinking" ||
                                        currentEventType === "critic_thinking" ||
                                        currentEventType === "judge_thinking"
                                    ) {
                                        // Parse Log
                                        const payload = JSON.parse(dataStr);
                                        const msg = payload.msg || payload;
                                        const isLog = payload.is_log;

                                        // Determine Agent
                                        let agentName = "System";
                                        if (currentEventType.includes("jury")) agentName = "Jury_Primary";
                                        else if (currentEventType.includes("critic")) agentName = "Critic_Reviewer";
                                        else if (currentEventType.includes("judge")) agentName = "Judge";

                                        const agentId = getAgentIdFromName(agentName);

                                        // Update UI State
                                        if (isMounted) {
                                            setActiveThinker(agentId);

                                            if (isLog) {
                                                // It's a thought trace
                                                const cleanMsg = typeof msg === 'string' ? msg : JSON.stringify(msg);
                                                // Secondary filter for JSON or extremely long lines that look like data
                                                const isCode = cleanMsg.includes('{') || cleanMsg.includes('[') || cleanMsg.length > 300;
                                                
                                                if (!isCode) {
                                                    setAgentThoughts(prev => ({
                                                        ...prev,
                                                        [agentId]: [...(prev[agentId] || []), cleanMsg]
                                                    }));
                                                }
                                            } else {
                                                // It's a high level status message being emitted by agent
                                                setCurrentReport(typeof msg === 'string' ? msg : JSON.stringify(msg));
                                            }
                                        }
                                    }
                                    else if (currentEventType === "jury_report" || currentEventType === "critic_feedback" || currentEventType === "judge_verdict") {
                                        // Use these major milestones to update the central report text
                                        const payload = JSON.parse(dataStr);
                                        if (currentEventType === "jury_report") {
                                            if (isMounted) setCurrentReport("Regulatory review complete.");
                                        } else if (currentEventType === "critic_feedback") {
                                            if (isMounted) setCurrentReport("Audit in progress...");
                                        } else if (currentEventType === "judge_verdict") {
                                            if (isMounted) setCurrentReport("Analysis finalized.");
                                        }
                                    }
                                } catch (e) { console.error("Stream parse error", e); }
                            }
                        }
                    }
                } catch (e) {
                    console.error("Streaming failed", e);
                    if (isMounted) {
                        setAnalyzing(false); // Fail safe to show button
                        setCurrentReport("Connection failed. Please check backend.");
                    }
                }
                return;
            }

            // 2. FETCH MODE (Existing Run) - If user refreshes or comes back
            if (runId && featureId) {
                try {
                    const result = await api.pipeline.getResults(featureId, runId);
                    // If we have a verdict or status is complete, stop analyzing
                    if (result.verdict || result.status === "CORE_COMPLETED" || result.status === "AUTOFIX_COMPLETED" || result.status === "RISK_COMPLETED") {
                        if (isMounted) {
                            setAnalyzing(false); // <--- THIS SHOWS THE BUTTON
                            setCurrentReport("Analysis complete. Report available.");

                            // Load existing traces if available
                            if (result.agent_trace && Array.isArray(result.agent_trace)) {
                                const thoughts: any = { "REG-001": [], "CRT-009": [], "JDG-100": [] };
                                result.agent_trace.forEach((traceItem: any) => {
                                    const agentId = getAgentIdFromName(traceItem.agent);
                                    if (traceItem.logs) {
                                        thoughts[agentId].push(...traceItem.logs);
                                    } else if (traceItem.content) {
                                        // If no granular logs, use content steps
                                        thoughts[agentId].push(traceItem.step + ": " + (typeof traceItem.content === 'string' ? traceItem.content.substring(0, 100) + "..." : ""));
                                    }
                                });
                                setAgentThoughts(thoughts);
                            }
                        }
                    } else {
                        // If still processing (IN_PROGRESS), implies we missed the stream start
                        // We could poll here, but for now just show Waiting 
                        if (isMounted) setCurrentReport("Analysis in progress (Background)...");
                        // Ideally we would SSE stream attach to existing run, but our backend SSE starts new run.
                        // So we just wait or show button to refresh.
                        setTimeout(() => {
                            if (isMounted) setAnalyzing(false);
                        }, 3000);
                    }
                } catch (e) {
                    console.error("Fetch failed", e);
                    if (isMounted) setAnalyzing(false);
                }
                return;
            }

            // 3. Fallback / Idle
            if (isMounted) {
                // No context, no runID. Just idle.
                setAnalyzing(false);
                setCurrentReport("Ready for analysis.");
            }
        };

        init();
        return () => { isMounted = false; };
    }, []); // Run once on mount

    // --- Helpers ---
    const getAgentById = (id: string) => AGENTS.find(agent => agent.id === id);
    const getAgentThoughts = (agentId: string) => agentThoughts[agentId] || [];

    const handleAgentClick = (agentId: string) => {
        setExpandedAgents(prev => {
            const newSet = new Set(prev);
            if (newSet.has(agentId)) newSet.delete(agentId);
            else newSet.add(agentId);
            return newSet;
        });
    };

    const shouldShowThinkBox = (agentId: string) => {
        if (activeThinker === agentId) return true;
        if (expandedAgents.has(agentId)) return true;
        if (!analyzing && getAgentThoughts(agentId).length > 0) return true; // Show results after done
        return false;
    };

    const renderThinkBoxContent = (agentId: string) => {
        const thoughts = getAgentThoughts(agentId);
        if (thoughts.length === 0) {
            return (
                <div className="text-center text-slate-400 dark:text-slate-500 py-8">
                    <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Waiting for {getAgentById(agentId)?.title}...</p>
                </div>
            );
        }
        return (
            <div className="space-y-1.5">
                {thoughts.map((thought, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="text-xs leading-relaxed pl-3 border-l-2 border-teal/30 text-slate-600 dark:text-slate-400 font-mono"
                    >
                        {thought}
                    </motion.div>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-parchment font-sans selection:bg-teal/10 selection:text-teal overflow-x-hidden">
            <NavBar />

            {/* Status Banner */}
            <div className="fixed top-20 left-0 right-0 z-40 flex justify-center px-6">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 backdrop-blur-sm rounded-full border shadow-lg transition-colors",
                        analyzing
                            ? "bg-white/90 dark:bg-[#151515]/90 border-teal/20"
                            : "bg-teal/10 border-teal/50"
                    )}
                >
                    <Activity className={cn("w-4 h-4 text-teal", analyzing ? "animate-pulse" : "")} />
                    <span className="text-xs font-mono uppercase tracking-wider text-teal">
                        {analyzing ? "Analysis in Progress..." : "Analysis Complete"}
                    </span>
                </motion.div>
            </div>

            <main className="flex-1 p-4 md:p-6 pt-48 md:pt-56">
                {/* Agents Grid */}
                <div className="flex flex-col lg:flex-row justify-center items-center lg:items-start gap-8 lg:gap-16 mb-8">
                    {AGENTS.map((agent) => (
                        <div key={agent.id} className="w-full lg:w-1/3 flex flex-col items-center">
                            <div className="relative mb-4">
                                <motion.div
                                    onClick={() => handleAgentClick(agent.id)}
                                    animate={activeThinker === agent.id ? {
                                        scale: [1, 1.05, 1],
                                        boxShadow: ["0 0 0px rgba(13,148,136,0)", "0 0 20px rgba(13,148,136,0.3)", "0 0 0px rgba(13,148,136,0)"]
                                    } : {}}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className={cn(
                                        "w-20 h-20 md:w-24 md:h-24 rounded-full border-2 flex items-center justify-center transition-all duration-500 relative cursor-pointer hover:scale-105 bg-white dark:bg-[#111]",
                                        agent.borderColor,
                                        activeThinker === agent.id && "ring-2 ring-teal"
                                    )}
                                >
                                    <agent.icon className={cn("w-10 h-10 md:w-12 md:h-12 transition-colors duration-500", agent.color)} />
                                    {activeThinker === agent.id && (
                                        <div className="absolute -top-2 -right-2">
                                            <Brain className="w-5 h-5 text-teal animate-pulse" />
                                        </div>
                                    )}
                                </motion.div>
                            </div>

                            <div className="text-center mb-4">
                                <p className={cn("font-serif text-lg font-bold", agent.color)}>{agent.title}</p>
                                <p className="text-xs font-mono uppercase tracking-tight text-slate/40">{agent.name}</p>
                            </div>

                            {/* Thinking Box */}
                            <AnimatePresence>
                                {shouldShowThinkBox(agent.id) && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="w-full max-w-md"
                                    >
                                        <div className={cn(
                                            "bg-white dark:bg-[#151515] border border-teal/20 rounded-lg shadow-lg h-64 transition-all duration-300 flex flex-col",
                                            activeThinker === agent.id ? "ring-1 ring-teal/30" : "opacity-80"
                                        )}>
                                            <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/50 flex items-center gap-2">
                                                <Brain className="w-4 h-4 text-teal" />
                                                <span className="text-xs font-mono font-bold text-teal uppercase">Analysis Logs</span>
                                            </div>
                                            <div
                                                ref={thoughtRefs[agent.id as keyof typeof thoughtRefs]}
                                                className="flex-1 overflow-y-auto p-4 space-y-2"
                                            >
                                                {renderThinkBoxContent(agent.id)}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>

                {/* Report & Verdict Button */}
                <div className="max-w-4xl mx-auto mb-8 text-center space-y-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentReport}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white/70 dark:bg-[#151515]/70 border border-charcoal/20 dark:border-white/20 rounded-lg p-6 shadow-sm inline-block min-w-[300px]"
                        >
                            <div className="flex items-center justify-center gap-2 mb-2 text-teal">
                                <ScrollText className="w-4 h-4" />
                                <span className="text-xs font-bold font-mono uppercase tracking-widest">Status</span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                {currentReport}
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    {/* VIEW VERDICT BUTTON - Only shows when analyzing is FALSE */}
                    <AnimatePresence>
                        {!analyzing && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ type: "spring", bounce: 0.5 }}
                            >
                                <div className="p-1 rounded-2xl bg-gradient-to-r from-teal/20 via-blue-500/20 to-purple-500/20 inline-block">
                                    <div className="bg-parchment dark:bg-[#0A0A0A] rounded-xl p-8 border border-teal/20">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="p-3 bg-teal/10 rounded-full">
                                                <CheckCircle2 className="w-8 h-8 text-teal" />
                                            </div>
                                             <h3 className="font-serif text-2xl text-teal dark:text-parchment">Analysis Complete</h3>
                                             <p className="text-slate-600 dark:text-slate-400 max-w-md">
                                                 The compliance team has reviewed all aspects of your feature. A final report and remediation plan are ready.
                                             </p>

                                            <Link
                                                href={`/verdict?run_id=${runId}&feature_id=${featureId}`}
                                                className="mt-4 group relative inline-flex items-center justify-center px-12 py-4 bg-teal text-parchment font-serif text-xl rounded-lg shadow-xl hover:shadow-teal/40 transition-all duration-300 overflow-hidden"
                                            >
                                                <span className="relative z-10 flex items-center gap-3">
                                                    <Hammer className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                                                    View Full Report
                                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                                </span>
                                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {/* Re-analysis Section */}
                <div className="mt-12 bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/10 rounded-xl p-8 shadow-sm">
                    <h2 className="font-serif text-2xl text-teal mb-4">Submit Changes for Re-analysis</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 font-light">
                        If you've updated your feature based on these findings, provide the new details below for a follow-up compliance review.
                    </p>
                    <textarea
                        className="w-full h-32 bg-[#1E1E1E] text-parchment border border-white/20 rounded-lg p-4 mb-6 focus:ring-1 focus:ring-teal outline-none transition-all placeholder:text-slate/50"
                        placeholder="Describe the changes you've made to the feature..."
                    ></textarea>
                    <div className="flex justify-end">
                        <button 
                            onClick={() => {
                                const currentUser = juraiStorage.getCurrentUser();
                                if (!currentUser) {
                                    // Handle case where user is not logged in, e.g., redirect to login
                                    console.error("User not logged in for re-analysis.");
                                    return;
                                }

                                const session = juraiStorage.getSession(featureId || "");
                                if (session) {
                                    // Update session status to pending for re-analysis
                                    juraiStorage.saveSession({
                                        ...session,
                                        status: "pending",
                                        lastAnalysis: new Date().toISOString()
                                    });
                                    window.location.href = `/questionnaire?session_id=${featureId}`;
                                } else {
                                    console.error("Session not found for re-analysis.");
                                }
                            }}
                            className="px-8 py-3 bg-teal text-parchment font-serif text-lg rounded-lg hover:bg-teal/90 transition-colors shadow-lg shadow-teal/20"
                        >
                            Submit for Re-analysis
                        </button>
                    </div>
                </div>

            </main>

            {/* Background Decoration */}
            <div className="fixed inset-0 -z-10 pointer-events-none opacity-[0.02] dark:opacity-[0.03]">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
            </div>
        </div>
    );
}