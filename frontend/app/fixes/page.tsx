"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Scale,
    ChevronLeft,
    ChevronDown,
    Shield,
    FileText,
    Home,
    Download,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Wrench,
    Code2,
    Hammer,
    Zap,
    ChevronRight,
    ArrowLeft,
    Terminal,
    Cpu,
    Boxes,
    GitBranch,
    ClipboardCheck,
    History
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getFeature, FeatureContext } from "@/lib/context";
import { ThemeToggle } from "@/components/theme-toggle";

interface ComplianceIssue {
    severity: "HIGH" | "MEDIUM" | "LOW" | "CRITICAL";
    title: string;
    summary: string;
    problem: string;
    fix: string;
    steps: string[];
}

export default function FixesPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const featureId = searchParams.get("feature_id");

    const [feature, setFeature] = useState<FeatureContext | null>(null);
    const [openIssueIndex, setOpenIssueIndex] = useState<number | null>(0);
    const [fixes, setFixes] = useState<ComplianceIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [executiveSummary, setExecutiveSummary] = useState("");

    useEffect(() => {
        if (!featureId) {
            router.push("/dashboard");
            return;
        }

        const data = getFeature(featureId);
        if (!data) {
            router.push("/dashboard");
            return;
        }
        setFeature(data);

        if (data.legal_review?.run_id) {
            fetchOrGenerateFixes(data.feature_id, data.legal_review.run_id);
        } else {
            setLoading(false);
        }
    }, [featureId]);

    const fetchOrGenerateFixes = async (fid: string, rid: string) => {
        try {
            // 1. Fetch Existing Results
            const result = await api.pipeline.getResults(fid, rid);
            let autoFixData = result.auto_fix;

            // Handle JSON string if applicable
            if (typeof autoFixData === 'string') {
                try {
                    const cleanJson = autoFixData.replace(/```json/g, '').replace(/```/g, '').trim();
                    autoFixData = JSON.parse(cleanJson);
                } catch (e) {
                    autoFixData = null;
                }
            }

            if (autoFixData && autoFixData.auto_fix) {
                autoFixData = autoFixData.auto_fix;
            }

            // 2. If no fixes found, Trigger Generation
            if (!autoFixData || !autoFixData.fixes || autoFixData.fixes.length === 0) {
                setGenerating(true);
                try {
                    const autofixResult = await api.pipeline.runAutofix(fid, rid);
                    autoFixData = autofixResult.auto_fix;

                    if (typeof autoFixData === 'string') {
                        try {
                            const cleanJson = autoFixData.replace(/```json/g, '').replace(/```/g, '').trim();
                            autoFixData = JSON.parse(cleanJson);
                        } catch (e) {
                            console.error("Failed to parse generated auto_fix JSON:", e);
                        }
                    }

                    if (autoFixData && autoFixData.auto_fix) {
                        autoFixData = autoFixData.auto_fix;
                    }

                } catch (genError) {
                    console.error("Failed to generate fixes:", genError);
                } finally {
                    setGenerating(false);
                }
            }

            // 3. Map Data to UI
            if (autoFixData && autoFixData.fixes) {
                setExecutiveSummary(autoFixData.summary || "Remediation logic synthesized.");
                mapAndSetFixes(autoFixData.fixes);
            }

        } catch (error) {
            console.error("Failed to fetch/generate fixes:", error);
        } finally {
            setLoading(false);
        }
    };

    const mapAndSetFixes = (backendFixes: any[]) => {
        const mapped = backendFixes.map((f: any) => ({
            severity: (f.severity || "MEDIUM").toUpperCase(),
            title: f.title || f.name || "Compliance Fix",
            summary: f.description || f.summary || "No description provided.",
            problem: f.issue_reference || f.problem || "Associated with identified compliance gap.",
            fix: f.remediation_strategy || f.strategy || "Apply recommended changes.",
            steps: Array.isArray(f.implementation_steps)
                ? f.implementation_steps
                : Array.isArray(f.steps) ? f.steps : [f.implementation_steps || f.steps || "Review code manually."]
        }));
        setFixes(mapped);
    };

    const getSeverityStyles = (severity: string) => {
        switch (severity) {
            case "CRITICAL":
            case "HIGH":
                return "border-red-500 text-red-500 bg-red-500/5";
            case "MEDIUM":
                return "border-amber-500 text-amber-500 bg-amber-500/5";
            default:
                return "border-teal text-teal bg-teal/5";
        }
    };

    if (loading || generating) {
        return (
            <div className="min-h-screen bg-parchment dark:bg-[#0A0A0A] flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                    <Scale className="w-16 h-16 text-teal animate-spin-slow" />
                    <Wrench className="w-6 h-6 text-teal absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="font-serif text-2xl text-teal">
                        {generating ? "Synthesizing Remediation Plan..." : "Analyzing Artifacts..."}
                    </h2>
                    <p className="text-slate/60 text-[10px] uppercase tracking-widest max-w-sm font-bold">
                        Assembling automated remediation sequence
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-parchment dark:bg-[#0A0A0A] text-charcoal dark:text-parchment pb-20">
            {/* Header */}
            <header className="px-6 py-4 border-b border-charcoal/5 dark:border-white/5 flex justify-between items-center bg-parchment/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <Link href={`/verdict?feature_id=${featureId}`} className="p-2 hover:bg-charcoal/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate/50" />
                    </Link>
                    <div className="h-4 w-px bg-charcoal/10 dark:bg-white/10" />
                    <div className="flex items-center gap-2">
                        <Hammer className="w-5 h-5 text-teal" />
                        <h1 className="font-serif text-lg font-bold text-teal dark:text-parchment">{feature?.feature_name} — Remediation</h1>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 pt-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    
                    {/* Left Column: Task List */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="font-serif text-xl">Action Items</h2>
                            <span className="text-[10px] text-teal bg-teal/5 px-2 py-0.5 rounded-full border border-teal/10 uppercase tracking-tighter font-bold">
                                {fixes.length} fixes pending
                            </span>
                        </div>
                        
                        <div className="space-y-3">
                            {fixes.map((fix, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setOpenIssueIndex(idx)}
                                    className={cn(
                                        "w-full text-left p-4 rounded-2xl border transition-all group",
                                        openIssueIndex === idx 
                                            ? "bg-teal/5 border-teal shadow-lg shadow-teal/5 scale-[1.02]" 
                                            : "bg-white dark:bg-[#151515] border-charcoal/5 dark:border-white/5 hover:border-teal/30"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={cn(
                                            "text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-widest",
                                            getSeverityStyles(fix.severity)
                                        )}>
                                            {fix.severity}
                                        </span>
                                        {openIssueIndex === idx && <Zap className="w-3 h-3 text-teal animate-pulse" />}
                                    </div>
                                    <h3 className={cn(
                                        "font-serif text-sm leading-tight",
                                        openIssueIndex === idx ? "text-teal" : "text-slate-700 dark:text-slate-300"
                                    )}>
                                        {fix.title}
                                    </h3>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Active Task Details */}
                    <div className="lg:col-span-8">
                        <AnimatePresence mode="wait">
                            {openIssueIndex !== null && fixes[openIssueIndex] && (
                                <motion.div
                                    key={openIssueIndex}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="bg-white dark:bg-[#151515] border border-charcoal/5 dark:border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden min-h-[600px]"
                                >
                                    {/* Task Header */}
                                    <div className="relative z-10 mb-10">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-12 h-12 rounded-2xl bg-teal/10 flex items-center justify-center text-teal">
                                                <ClipboardCheck className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase text-teal tracking-widest font-bold">Recommended Sequence</div>
                                                <h2 className="font-serif text-3xl md:text-4xl text-charcoal dark:text-parchment">
                                                    {fixes[openIssueIndex].title}
                                                </h2>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-charcoal/[0.02] dark:bg-white/[0.02] border border-charcoal/5 dark:border-white/5 rounded-2xl p-6">
                                                <h4 className="text-[10px] uppercase text-slate/40 mb-3 flex items-center gap-2 font-bold">
                                                    <AlertCircle className="w-3 h-3" />
                                                    The Problem
                                                </h4>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 font-serif leading-relaxed italic">
                                                    "{fixes[openIssueIndex].problem}"
                                                </p>
                                            </div>
                                            <div className="bg-teal/[0.02] border border-teal/10 rounded-2xl p-6">
                                                <h4 className="text-[10px] uppercase text-teal/40 mb-3 flex items-center gap-2 font-bold">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    The Solution
                                                </h4>
                                                <p className="text-sm text-teal/80 dark:text-teal/40 font-serif leading-relaxed font-bold">
                                                    {fixes[openIssueIndex].fix}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Implementation Steps */}
                                    <div className="space-y-4 relative z-10">
                                        <h3 className="text-xs font-bold text-teal uppercase tracking-widest flex items-center gap-2 mb-6">
                                            <GitBranch className="w-4 h-4" />
                                            Implementation Log
                                        </h3>
                                        <div className="space-y-4">
                                            {fixes[openIssueIndex].steps.map((step, sidx) => (
                                                <motion.div 
                                                    key={sidx}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: sidx * 0.1 }}
                                                    className="flex items-start gap-4 p-4 rounded-xl bg-charcoal/[0.02] dark:bg-white/[0.02] border border-charcoal/5 dark:border-white/5 group hover:border-teal/30 transition-colors"
                                                >
                                                    <div className="w-6 h-6 rounded-lg bg-teal/10 text-teal text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                                                        {sidx + 1}
                                                    </div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed group-hover:text-charcoal dark:group-hover:text-parchment transition-colors font-medium">
                                                        {step}
                                                    </p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Watermark/Icon */}
                                    <div className="absolute -bottom-10 -right-10 opacity-[0.03] rotate-12">
                                        <Cpu className="w-64 h-64" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Summary Section Below */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-8 p-8 bg-charcoal/[0.02] dark:bg-white/[0.02] border border-dashed border-charcoal/10 dark:border-white/10 rounded-[2rem]"
                        >
                            <h4 className="font-serif text-lg mb-2 flex items-center gap-2">
                                <History className="w-4 h-4 text-slate/40" />
                                Executive Remediation Summary
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-serif italic leading-relaxed">
                                {executiveSummary}
                            </p>
                        </motion.div>
                    </div>
                </div>

                {/* Final Actions */}
                <div className="mt-20 flex flex-col items-center space-y-8">
                    <div className="h-px w-32 bg-teal/20" />
                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                        <button className="flex items-center justify-center gap-3 px-8 py-4 bg-white dark:bg-[#151515] border-2 border-charcoal/5 dark:border-white/5 rounded-2xl hover:border-teal/30 transition-all font-serif">
                            <Download className="w-5 h-5 text-teal" />
                            Download Compliance Log
                        </button>
                        <Link 
                            href="/" 
                            className="flex items-center justify-center gap-3 px-8 py-4 bg-teal text-white rounded-2xl hover:scale-105 transition-all font-serif shadow-xl shadow-teal/20"
                        >
                            <Home className="w-5 h-5" />
                            Return Command
                            <ChevronRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}