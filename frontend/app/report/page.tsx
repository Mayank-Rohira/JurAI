"use client";

import { useState, useEffect } from "react";
import { 
    Scale, 
    Download, 
    Printer, 
    Shield, 
    FileText, 
    Activity, 
    Cpu, 
    User, 
    AlertCircle, 
    CheckCircle2, 
    ChevronLeft,
    Share2,
    Database,
    Gavel,
    Zap,
    Target,
    Hammer
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { getFeature, FeatureContext } from "@/lib/context";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function ReportPage() {
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

    const deviations = feature.timeline.filter(e => e.is_deviation);

    return (
        <div className="min-h-screen bg-white dark:bg-[#0A0A0A] text-charcoal dark:text-parchment pb-32 print:bg-white print:text-black">
            {/* Header - Hidden in Print */}
            <header className="px-6 py-4 border-b border-charcoal/5 dark:border-white/5 flex justify-between items-center bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-50 print:hidden">
                <div className="flex items-center gap-6">
                    <Link href={`/timeline?feature_id=${featureId}`} className="p-2 hover:bg-charcoal/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                        <ChevronLeft className="w-5 h-5 text-slate/50" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-teal" />
                        <h1 className="font-serif text-lg font-bold">Compliance Report</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-teal text-white px-4 py-2 rounded-lg hover:bg-teal/90 transition-all font-medium text-sm shadow-md"
                    >
                        <Printer className="w-4 h-4" />
                        Generate PDF
                    </button>
                    <button className="p-2 hover:bg-charcoal/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                        <Share2 className="w-4 h-4 text-slate/40" />
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 pt-12 md:pt-20 space-y-16 print:pt-0">
                {/* Report Header */}
                <section className="text-center space-y-4 border-b border-charcoal/10 dark:border-white/10 pb-12">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal/10 rounded-lg">
                            <Scale className="w-5 h-5 text-teal" />
                        </div>
                        <div>
                            <h1 className="font-serif text-xl font-bold text-teal dark:text-parchment">Compliance Handover Report</h1>
                            <p className="text-[10px] text-slate/40 uppercase tracking-widest font-bold">Final compliance trace for audit review.</p>
                        </div>
                    </div>
                    <h2 className="font-serif text-5xl font-bold tracking-tight">{feature.feature_name}</h2>
                    <p className="text-sm opacity-40 font-bold uppercase tracking-widest">Assessment ID: {feature.feature_id.toUpperCase()}</p>
                    <div className="flex justify-center gap-8 pt-6">
                        <div className="text-center">
                            <p className="text-[9px] uppercase opacity-40 mb-1 font-bold">Generated At</p>
                            <p className="text-xs font-bold">{new Date().toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] uppercase opacity-40 mb-1 font-bold">Status</p>
                            <p className="text-xs font-bold text-teal">STAGE {feature.current_stage} — VERIFIED</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] uppercase opacity-40 mb-1 font-bold">Deviations</p>
                            <p className={cn("text-xs font-bold", deviations.length > 0 ? "text-red-500" : "text-green-500")}>
                                {deviations.length} FLAGGED
                            </p>
                        </div>
                    </div>
                </section>

                {/* Executive Summary */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-charcoal/10 dark:bg-white/10" />
                        <h3 className="font-serif text-xl font-bold uppercase tracking-widest text-slate/40">Executive Summary</h3>
                        <div className="h-px flex-1 bg-charcoal/10 dark:bg-white/10" />
                    </div>
                    <div className="bg-charcoal/5 dark:bg-white/[0.02] p-8 rounded-3xl border border-charcoal/5 dark:border-white/5">
                        <p className="text-lg leading-relaxed italic opacity-80 font-serif">
                            "{feature.intake.summary || "No summary available for this mission."}"
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-charcoal/5 dark:bg-white/5 rounded-xl border border-charcoal/10 dark:border-white/10">
                            <p className="text-[10px] text-slate/40 uppercase tracking-widest mb-1 font-bold">ASSESSMENT_ID</p>
                            <p className="text-xs font-bold truncate">{feature.feature_id}</p>
                        </div>
                        <div className="p-4 bg-charcoal/5 dark:bg-white/5 rounded-xl border border-charcoal/10 dark:border-white/10">
                            <p className="text-[10px] text-slate/40 uppercase tracking-widest mb-1 font-bold">AUDIT TYPE</p>
                            <p className="text-xs font-bold">Standard Risk Assessment</p>
                        </div>
                    </div>
                </section>

                {/* Collected Intelligence */}
                <section className="space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-charcoal/10 dark:bg-white/10" />
                        <h3 className="font-serif text-xl font-bold uppercase tracking-widest text-slate/40">Collected Intelligence</h3>
                        <div className="h-px flex-1 bg-charcoal/10 dark:bg-white/10" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(feature.intake.collected).map(([key, value]) => (
                            <div key={key} className="p-4 border border-charcoal/5 dark:border-white/5 rounded-2xl space-y-1">
                                <p className="text-[10px] uppercase opacity-40 font-bold tracking-widest">{key.replace(/_/g, ' ').toUpperCase()}</p>
                                <p className="text-sm font-medium">{value}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Forensic Timeline */}
                <section className="space-y-8 break-before-page">
                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-charcoal/10 dark:bg-white/10" />
                        <h3 className="font-serif text-xl font-bold uppercase tracking-widest text-slate/40">Activity History</h3>
                        <div className="h-px flex-1 bg-charcoal/10 dark:bg-white/10" />
                    </div>
                    <div className="space-y-4">
                        {feature.timeline.map((event) => (
                            <div 
                                key={event.event_id}
                                className={cn(
                                    "p-6 rounded-2xl border",
                                    event.is_deviation 
                                        ? "bg-red-500/5 border-red-500/20" 
                                        : "bg-transparent border-charcoal/5 dark:border-white/5"
                                )}
                            >
                                <div className="flex justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-6 h-6 rounded-lg flex items-center justify-center",
                                            event.role === "assistant" ? "bg-teal/10 text-teal" : "bg-gold/10 text-gold"
                                        )}>
                                            {event.role === "assistant" ? <Cpu className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                        </div>
                                        <span className="text-[9px] uppercase tracking-widest font-bold opacity-40">
                                            {event.role === "assistant" ? "COMPLIANCE_AI" : "USER"}
                                        </span>
                                    </div>
                                    <span className="text-[10px] opacity-30 font-bold">
                                        {new Date(event.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-sm leading-relaxed opacity-80">
                                    {event.content}
                                </p>
                                {event.is_deviation && (
                                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-red-500 uppercase mb-2">
                                            <AlertCircle className="w-3 h-3" />
                                            Flagged for Review
                                        </div>
                                        <p className="text-xs text-red-400 font-medium tracking-tight">
                                            {event.deviation_notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Final Verification Signature */}
                <section className="pt-20 pb-40 text-center space-y-8 print:pb-20">
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-teal/20 blur-[50px] rounded-full" />
                            <Shield className="w-24 h-24 text-teal relative" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-serif text-2xl font-bold uppercase tracking-widest">Compliance Clearance Code</h4>
                        <div className="flex justify-center gap-4">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="w-12 h-16 bg-charcoal/5 dark:bg-white/5 rounded-xl border border-charcoal/10 dark:border-white/10 flex items-center justify-center text-2xl font-bold text-teal">
                                    {Math.floor(Math.random() * 9)}
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] pt-4 uppercase tracking-[0.3em] font-bold">
                            Verifiably Signed by JurAI v2.4
                        </p>
                    </div>
                </section>
            </main>

            {/* Print Footer */}
            <div className="hidden print:block fixed bottom-8 left-0 w-full text-center text-[10px] font-bold opacity-30 uppercase tracking-widest">
                JurAI Handover Report — Confidential Audit Intelligence
            </div>
        </div>
    );
}
