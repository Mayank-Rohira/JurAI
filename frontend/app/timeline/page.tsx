"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
    Scale, 
    ArrowLeft, 
    CheckCircle2, 
    Circle, 
    Clock, 
    Zap, 
    Shield, 
    Gavel, 
    Hammer, 
    Rocket,
    ChevronRight,
    Search,
    Target,
    Activity,
    Cpu,
    User,
    AlertCircle,
    FileText
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { getFeature, saveFeature, FeatureContext, FeatureStage } from "@/lib/context";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const STAGES: { stage: FeatureStage; label: string; icon: any; desc: string }[] = [
    { stage: 1, label: "Discovery", icon: Search, desc: "Requirements & product logic gathering via AI chat." },
    { stage: 2, label: "Analysis", icon: Zap, desc: "Multi-agent AI compliance assessment & review." },
    { stage: 3, label: "Review", icon: Gavel, desc: "Consensus-based risk categorization & advisor notes." },
    { stage: 4, label: "Resolution", icon: Hammer, desc: "Engineering task generation & automated fixes." },
    { stage: 5, label: "Certified", icon: Rocket, desc: "Final validation & market readiness certification." }
];

export default function TimelinePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const featureId = searchParams.get("feature_id");

    const [feature, setFeature] = useState<FeatureContext | null>(null);

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
    }, [featureId]);

    if (!feature) return null;

    const currentStage = feature.current_stage;

    return (
        <div className="min-h-screen bg-parchment dark:bg-[#0A0A0A] text-charcoal dark:text-parchment pb-20">
            {/* Header */}
            <header className="px-6 py-4 border-b border-charcoal/5 dark:border-white/5 flex justify-between items-center bg-parchment/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <Link href={`/dashboard`} className="p-2 hover:bg-charcoal/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate/50" />
                    </Link>
                    <div className="h-4 w-px bg-charcoal/10 dark:bg-white/10" />
                    <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-teal" />
                        <h1 className="font-serif text-lg font-bold text-teal dark:text-parchment">{feature.feature_name} — Progress</h1>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Link 
                        href={`/report?feature_id=${featureId}`}
                        className="flex items-center gap-2 px-4 py-2 bg-charcoal dark:bg-parchment text-white dark:text-black rounded-lg hover:scale-105 transition-all text-sm font-bold shadow-xl"
                    >
                        <FileText className="w-4 h-4" />
                        GENERATE REPORT
                    </Link>
                    <ThemeToggle />
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 pt-20">
                <div className="text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal/5 border border-teal/20 rounded-full text-[10px] text-teal uppercase tracking-widest mb-6 font-bold">
                        <Activity className="w-3 h-3" />
                        Live Activity Feed
                    </div>
                    <h2 className="font-serif text-5xl mb-4 font-bold">Compliance Event Log</h2>
                    <p className="text-slate/60 dark:text-slate/40 max-w-lg mx-auto text-xs uppercase tracking-[0.2em] font-bold">
                        Chronological history of all compliance interactions
                    </p>
                </div>

                <div className="relative">
                    {/* Vertical Line */}
                    <div className="absolute left-8 top-0 bottom-0 w-px bg-charcoal/10 dark:bg-white/10 hidden md:block" />

                    <div className="space-y-12">
                        {STAGES.map((s, idx) => {
                            const isCompleted = currentStage > s.stage;
                            const isCurrent = currentStage === s.stage;
                            const isFuture = currentStage < s.stage;

                            return (
                                <motion.div 
                                    key={s.stage}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={cn(
                                        "relative flex flex-col md:flex-row gap-8 items-start md:items-center p-6 rounded-[2rem] border transition-all",
                                        isCurrent ? "bg-teal/5 border-teal shadow-xl shadow-teal/5" : "bg-white dark:bg-[#151515] border-charcoal/5 dark:border-white/5",
                                        isFuture && "opacity-40 grayscale"
                                    )}
                                >
                                    {/* Circle Icon */}
                                    <div className={cn(
                                        "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 z-10 transition-all duration-500",
                                        isCompleted ? "bg-teal text-parchment" : 
                                        isCurrent ? "bg-teal text-parchment animate-pulse" : 
                                        "bg-charcoal/5 dark:bg-white/5 text-slate/40"
                                    )}>
                                        {isCompleted ? <CheckCircle2 className="w-8 h-8" /> : <s.icon className="w-8 h-8" />}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-[10px] text-teal bg-teal/5 px-2 py-0.5 rounded-full border border-teal/10 uppercase font-bold tracking-tighter">
                                                Stage {s.stage}
                                            </span>
                                            {isCurrent && (
                                                <span className="text-[10px] text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/10 uppercase font-bold tracking-tighter animate-pulse">
                                                    In Progress
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-serif text-2xl mb-2">{s.label}</h3>
                                        <p className="text-sm text-slate/50 dark:text-slate/40 max-w-md font-light">
                                            {s.desc}
                                        </p>
                                    </div>

                                    <div>
                                        {isCompleted && (
                                            <Link 
                                                href={
                                                    s.stage === 1 ? `/questionnaire?feature_id=${featureId}` :
                                                    s.stage === 2 ? `/analysis?feature_id=${featureId}` :
                                                    s.stage === 3 ? `/verdict?feature_id=${featureId}` :
                                                    s.stage === 4 ? `/fixes?feature_id=${featureId}` :
                                                    "#"
                                                }
                                                className="text-[10px] text-teal hover:underline flex items-center gap-1 uppercase tracking-widest font-bold"
                                            >
                                                View Details
                                                <ChevronRight className="w-3 h-3" />
                                            </Link>
                                        )}
                                        {isCurrent && (
                                            <Link 
                                                href={
                                                    s.stage === 1 ? `/questionnaire?feature_id=${featureId}` :
                                                    s.stage === 2 ? `/analysis?feature_id=${featureId}` :
                                                    s.stage === 3 ? `/verdict?feature_id=${featureId}` :
                                                    s.stage === 4 ? `/fixes?feature_id=${featureId}` :
                                                    "#"
                                                }
                                                className="bg-teal text-parchment px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold hover:scale-105 transition-all shadow-lg shadow-teal/20"
                                            >
                                                Continue
                                            </Link>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
                <div className="mt-32 space-y-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="font-serif text-3xl font-bold">Activity Log</h3>
                            <p className="text-slate/40 text-xs uppercase tracking-widest mt-1 font-bold">Audit Trail History</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-teal/5 border border-teal/10 rounded-full text-[10px] text-teal font-bold uppercase">
                            {feature.timeline.length} EVENTS RECORDED
                        </div>
                    </div>

                    <div className="space-y-4">
                        {feature.timeline.length === 0 ? (
                            <div className="p-12 text-center bg-white dark:bg-[#151515] border border-dashed border-charcoal/10 dark:border-white/10 rounded-3xl">
                                <Activity className="w-12 h-12 text-slate/20 mx-auto mb-4" />
                                <p className="text-slate/40 text-xs uppercase tracking-widest font-bold">Awaiting interaction data...</p>
                            </div>
                        ) : (
                            feature.timeline.map((event: any, idx: number) => (
                                <motion.div 
                                    key={event.event_id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "p-6 rounded-2xl border transition-all group",
                                        event.is_deviation 
                                            ? "bg-red-500/5 border-red-500/20 shadow-lg shadow-red-500/5" 
                                            : "bg-white dark:bg-[#151515] border-charcoal/10 dark:border-white/10"
                                    )}
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                                event.role === "assistant" ? "bg-teal/10 text-teal" : "bg-gold/10 text-gold"
                                            )}>
                                                {event.role === "assistant" ? <Cpu className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">
                                                        {event.role === "assistant" ? "COMPLIANCE_AI" : "USER"}
                                                    </span>
                                                    <span className="text-[10px] opacity-30 font-bold">
                                                        {new Date(event.timestamp).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm leading-relaxed opacity-80">
                                                    {event.content}
                                                </p>
                                                {event.is_deviation && (
                                                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-red-500 uppercase mb-1">
                                                            <AlertCircle className="w-3 h-3" />
                                                            Flagged for Review
                                                        </div>
                                                        <p className="text-[11px] text-red-400 font-medium">
                                                            {event.deviation_notes || "Attention required for this interaction."}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const newTimeline = [...feature.timeline];
                                                newTimeline[idx] = {
                                                    ...newTimeline[idx],
                                                    is_deviation: !newTimeline[idx].is_deviation,
                                                    deviation_notes: !newTimeline[idx].is_deviation ? "Flagged for manual review." : undefined
                                                };
                                                saveFeature(feature.feature_id, { timeline: newTimeline });
                                                setFeature({ ...feature, timeline: newTimeline });
                                            }}
                                            className={cn(
                                                "shrink-0 px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-widest font-bold border transition-all",
                                                event.is_deviation 
                                                    ? "bg-red-500 text-white border-red-500" 
                                                    : "bg-transparent border-charcoal/10 dark:border-white/10 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:border-red-500/30 text-slate/40 hover:text-red-500"
                                            )}
                                        >
                                            {event.is_deviation ? "REMOVE FLAG" : "FLAG FOR REVIEW"}
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
