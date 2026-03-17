"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Scale,
    Shield,
    Gavel,
    FileText,
    Activity,
    Brain,
    Clock,
    BookOpen,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    X,
    FileCode,
    Globe,
    Scale as ScaleIcon,
    CheckCircle,
    XCircle,
    ClipboardCheck,
    Download,
    Zap,
    TrendingUp,
    ShieldAlert,
    Lock,
    Users,
    Target,
    Award,
    File
} from "lucide-react";
import jsPDF from "jspdf";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { TabNavigation } from "@/components/TabNavigation";

export default function VerdictPage() {
    const searchParams = useSearchParams();
    const runId = searchParams.get("run_id");
    const featureId = searchParams.get("feature_id");

    const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
    const [expandedEvidence, setExpandedEvidence] = useState<number | null>(null);
    const [showLegalDoc, setShowLegalDoc] = useState(false);

    // State for Dynamic Data
    const [detectedIssues, setDetectedIssues] = useState<any[]>([]);
    const [legalEvidences, setLegalEvidences] = useState<any[]>([]);
    const [verdictSummary, setVerdictSummary] = useState<string>("");
    const [riskAssessment, setRiskAssessment] = useState<any>(null);
    const [verdictData, setVerdictData] = useState<any>(null);

    const [metrics, setMetrics] = useState({
        confidence: 0,
        riskScore: 0,
        criticalCount: 0,
        totalCount: 0,
        time: "0:00"
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchResults = async () => {
            // 1. Handle Missing IDs (Loading State instead of Mock Data)
            if (!runId || !featureId) {
                console.warn("Missing run_id or feature_id");
                setIsLoading(false);
                return;
            }

            try {
                // 2. Fetch from Backend
                const result = await api.pipeline.getResults(featureId, runId);

                // 3. PARSING LOGIC: Handle cases where verdict is a JSON string or an Object
                let verdictData: any = {};

                if (result.verdict) {
                    if (typeof result.verdict === 'string') {
                        try {
                            // Clean markdown code blocks if present (e.g. ```json ... ```)
                            const cleanJson = result.verdict.replace(/```json/g, '').replace(/```/g, '').trim();
                            verdictData = JSON.parse(cleanJson);
                        } catch (e) {
                            console.error("Failed to parse verdict JSON string:", e);
                            // Fallback: Use the raw string as a description if parsing fails
                            verdictData = { issues: [], summary: result.verdict };
                        }
                    } else {
                        verdictData = result.verdict;
                    }
                }

                const trace = result.agent_trace || [];

                // 4. Calculate Analysis Time (from agent trace timestamps)
                let durationStr = "0:00";
                if (trace.length > 1) {
                    try {
                        const start = new Date(trace[0].timestamp).getTime();
                        const end = new Date(trace[trace.length - 1].timestamp).getTime();
                        const diffMs = end - start;
                        if (!isNaN(diffMs)) {
                            const minutes = Math.floor(diffMs / 60000);
                            const seconds = Math.floor((diffMs % 60000) / 1000);
                            durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                        }
                    } catch (e) {
                        console.error("Date parsing error", e);
                    }
                }

                // 5. Map Metrics
                // Prefer Risk Assessment pipeline data if available, otherwise fall back to Verdict data
                let riskData = result.risk_assessment || {};

                // Handle JSON string if applicable
                if (typeof riskData === 'string') {
                    try {
                        const cleanJson = riskData.replace(/```json/g, '').replace(/```/g, '').trim();
                        riskData = JSON.parse(cleanJson);
                    } catch (e) {
                        console.error("Failed to parse risk JSON string:", e);
                        riskData = {};
                    }
                }

                // Handle double nesting if present (result.risk_assessment.risk_assessment)
                if (riskData && riskData.risk_assessment) {
                    riskData = riskData.risk_assessment;
                }

                // Try to get risk score from Risk Pipeline -> then Verdict -> then Default
                let calculatedRisk = 50; // Default
                if (riskData.risk_score !== undefined) calculatedRisk = riskData.risk_score;
                else if (riskData.overall_risk_score !== undefined) calculatedRisk = riskData.overall_risk_score;
                else if (verdictData.risk_score !== undefined) calculatedRisk = verdictData.risk_score;
                else if (verdictData.compliance_score !== undefined) calculatedRisk = 100 - verdictData.compliance_score;

                const overallRisk = calculatedRisk;
                const confidence = verdictData.confidence ? Math.round(verdictData.confidence * 100) : 85;

                // 6. Map Issues (Standardize Schema)
                const issues: any[] = [];
                const rawIssues = Array.isArray(verdictData.issues) ? verdictData.issues : [];

                rawIssues.forEach((issue: any, iIdx: number) => {
                    issues.push({
                        id: `issue-${iIdx}`,
                        title: issue.title || "Compliance Observation",
                        description: issue.description || issue.summary || "Details not provided by Jury.",
                        severity: issue.severity || "Medium",
                        riskScore: issue.risk_score || overallRisk,
                        category: issue.category || "General",
                        impact: issue.impact || "Potential regulatory gap.",
                        remediation: issue.remediation || issue.fix_suggestion || "Review compliance guidelines."
                    });
                });

                // 7. Map Evidence
                const evidences: any[] = [];
                const rawEvidence = Array.isArray(verdictData.evidence_cited) ? verdictData.evidence_cited : [];

                rawEvidence.forEach((ev: any, eIdx: number) => {
                    evidences.push({
                        id: `ev-top-${eIdx}`,
                        title: ev.source || ev.title || "Legal Reference",
                        description: `Citation: ${ev.citation || 'N/A'}`,
                        reference: ev.citation || "General Reference",
                        severity: "Medium", // Evidence itself doesn't always have severity, default to Medium
                        category: "Regulation",
                        content: ev.content || ev.snippet || ev.text || "No text content available.",
                        riskScore: overallRisk,
                        frameworks: ev.frameworks || [],
                        jurisdiction: ev.jurisdiction || "Global"
                    });
                });

                // Update State
                setDetectedIssues(issues);
                setLegalEvidences(evidences);
                setVerdictSummary(verdictData.summary || "");
                setRiskAssessment(riskData);
                setVerdictData(verdictData);

                setMetrics({
                    confidence: confidence,
                    riskScore: Math.round(overallRisk),
                    criticalCount: issues.filter(i => (i.severity || "").toLowerCase() === "high" || (i.severity || "").toLowerCase() === "critical").length,
                    totalCount: issues.length,
                    time: durationStr
                });

            } catch (error) {
                console.error("Failed to fetch verdict results:", error);
                setError("Failed to retrieve analysis results. Please ensure the analysis has completed successfully.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchResults();
    }, [runId, featureId]);

    const isValidObject = (obj: any) => obj && typeof obj === 'object';

    // Helper for rendering
    const totalIssues = detectedIssues.length;
    const criticalIssues = metrics.criticalCount;

    const openLegalDocument = (evidence: any) => {
        setSelectedEvidence(evidence);
        setShowLegalDoc(true);
    };

    const closeLegalDocument = () => {
        setShowLegalDoc(false);
        setSelectedEvidence(null);
    };

    const toggleEvidence = (id: number) => {
        setExpandedEvidence(expandedEvidence === id ? null : id);
    };

    const handleDownload = async () => {
        if (!verdictData) return;
        setIsGeneratingReport(true);

        try {
            const pipelineContext = JSON.parse(localStorage.getItem("pipeline_context") || "{}");
            const featureName = pipelineContext.feature_name || "Feature Analysis";

            // 1. Gather data for refinement
            const reportData = {
                feature_name: featureName,
                user_input: pipelineContext.feature_description || "N/A",
                issues: detectedIssues.map(i => ({
                    title: i.title,
                    severity: i.severity,
                    description: i.description,
                    impact: i.impact,
                    remediation: i.remediation
                })),
                evidence: legalEvidences.map(e => ({
                    title: e.title,
                    reference: e.reference,
                    jurisdiction: e.jurisdiction,
                    content: e.content
                })),
                risk_assessment: riskAssessment || {}
            };

            // 2. Call AI Refinement
            const { report } = await api.ai.generateReport(reportData);

            // 3. Generate PDF
            const doc = new jsPDF();
            let y = 20;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 15;
            const lineHeight = 7;
            const maxWidth = 180;

            const addText = (text: string, fontSize: number, isBold: boolean = false) => {
                doc.setFontSize(fontSize);
                doc.setFont("helvetica", isBold ? "bold" : "normal");
                const lines = doc.splitTextToSize(text, maxWidth);
                lines.forEach((line: string) => {
                    if (y + lineHeight > pageHeight - margin) {
                        doc.addPage();
                        y = margin;
                    }
                    doc.text(line, margin, y);
                    y += lineHeight;
                });
                y += 3;
            };

            const addDivider = () => {
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, y, 195, y);
                y += 5;
            };

            // Simple Report Style as requested
            addText(`${featureName.toUpperCase()} - ANALYSIS REPORT`, 16, true);
            addText(`Case ID: ${featureId}`, 10);
            addText(`Generated: ${new Date().toLocaleString()}`, 10);
            addDivider();

            // Refined Content
            addText(report, 11);
            
            y += 10;
            addDivider();
            addText("GENERATED BY JURAI", 9, true);

            // Save with proper name
            const safeName = featureName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            doc.save(`Analysis_Report_${safeName}.pdf`);

        } catch (err) {
            console.error("PDF Generation Error:", err);
            alert("Failed to generate refined report. Please try again.");
        } finally {
            setIsGeneratingReport(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-parchment dark:bg-[#0A0A0A] flex items-center justify-center">
                <div className="text-teal font-serif text-xl animate-pulse">Loading Compliance Analysis...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-parchment dark:bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center">
                <div className="p-4 bg-red-500/10 rounded-full mb-6">
                    <AlertTriangle className="w-12 h-12 text-red-500" />
                </div>
                <h2 className="font-serif text-2xl text-red-500 mb-2">Analysis Fetch Failed</h2>
                <p className="text-slate-600 dark:text-slate-400 max-w-md mb-8">
                    {error}
                </p>
                <Link
                    href="/sessions"
                    className="px-8 py-3 bg-teal text-parchment rounded-lg font-serif hover:bg-teal/90 transition-colors"
                >
                    Back to Past Analysis
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-parchment dark:bg-[#0A0A0A] text-charcoal dark:text-parchment">

            {/* Header */}
            <header className="sticky top-0 z-50 px-6 py-4 border-b border-charcoal/10 dark:border-white/10 bg-parchment/90 dark:bg-[#0A0A0A]/90 backdrop-blur-sm">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-3">
                        <Scale className="w-6 h-6 text-teal" />
                        <div>
                            <h1 className="font-serif text-xl font-bold text-teal">Compliance Report</h1>
                            <p className="text-xs font-mono text-slate/60">Final Assessment Report</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <TabNavigation activeTab="verdict" />

                {/* Metrics Section */}
                <div className="mb-8">
                    <h2 className="font-serif text-2xl text-teal mb-4">Case Overview</h2>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/10 rounded-lg p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-teal/10 rounded-lg">
                                    <Target className="w-4 h-4 text-teal" />
                                </div>
                                <div>
                                    <div className="text-2xl font-serif text-teal">{metrics.confidence}%</div>
                                    <div className="text-xs font-mono text-slate/60">Confidence</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/10 rounded-lg p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Clock className="w-4 h-4 text-blue-500" />
                                </div>
                                <div>
                                    <div className="text-xl font-serif">{metrics.time}</div>
                                    <div className="text-xs font-mono text-slate/40">Analysis Time</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/10 rounded-lg p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-red-500/10 rounded-lg">
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                </div>
                                <div>
                                    <div className="text-2xl font-serif text-red-500">{criticalIssues}</div>
                                    <div className="text-xs font-mono text-slate/60">Critical Issues</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/10 rounded-lg p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <ScaleIcon className="w-4 h-4 text-purple-500" />
                                </div>
                                <div>
                                    <div className="text-xl font-serif">{totalIssues}</div>
                                    <div className="text-xs font-mono text-slate/60">Total Issues</div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Verdict Summary - Full Width */}
                <div className="mb-8">
                    <div className="bg-white dark:bg-[#151515] border border-teal/20 rounded-lg p-6 shadow-sm">
                        <h3 className="font-serif text-xl text-teal mb-3 flex items-center gap-2">
                            <Brain className="w-5 h-5" />
                            Report Summary
                        </h3>
                        <div className="text-slate-600 dark:text-slate-300 text-base leading-relaxed border-l-4 border-teal/20 pl-4">
                            {verdictSummary || "No summary available for this analysis."}
                        </div>
                    </div>
                </div>

                {/* Risk Assessment - Full Width Section */}
                <div className="mb-10">
                    <h2 className="font-serif text-2xl text-red-500 mb-4 flex items-center gap-2">
                        <ShieldAlert className="w-6 h-6" />
                        Risk Assessment
                    </h2>

                    <div className="bg-white dark:bg-[#151515] border border-red-500/20 rounded-lg p-6">
                        {/* Top Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-6 border-b border-charcoal/5 dark:border-white/5 pb-6">
                            <div className="text-center">
                                <div className="text-xs font-mono text-slate/60 mb-1 uppercase tracking-widest">Overall Risk</div>
                                <div className="text-3xl font-serif font-bold text-red-500">
                                    {riskAssessment?.overall_risk || "Unknown"}
                                </div>
                            </div>
                            <div className="text-center border-l border-charcoal/5 dark:border-white/5">
                                <div className="text-xs font-mono text-slate/60 mb-1 uppercase tracking-widest">Confidence</div>
                                <div className="text-3xl font-serif font-bold text-teal">
                                    {riskAssessment?.confidence ? Math.round(riskAssessment.confidence * 100) : metrics.confidence}%
                                </div>
                            </div>
                        </div>

                        {/* Summary Text */}
                        <div className="mb-6 bg-red-500/5 p-4 rounded-lg border border-red-500/10">
                            <div className="text-slate-700 dark:text-slate-300 italic text-base leading-relaxed text-center">
                                " {riskAssessment?.reasoning || riskAssessment?.summary || "Risk analysis details pending..."} "
                            </div>
                        </div>

                        {/* Risk Drivers */}
                        {riskAssessment?.drivers && riskAssessment.drivers.length > 0 && (
                            <div>
                                <h4 className="font-serif text-base text-charcoal dark:text-parchment mb-3 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-red-500" />
                                    Risk Drivers
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {riskAssessment.drivers.map((driver: any, idx: number) => (
                                        <div key={idx} className="border border-charcoal/5 dark:border-white/5 rounded-lg p-3 bg-charcoal/[0.02] hover:bg-white dark:hover:bg-white/5 transition-colors">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="px-2 py-0.5 bg-charcoal/5 dark:bg-white/10 rounded text-[10px] font-mono font-bold text-slate-500">
                                                    {driver.law}
                                                </div>
                                                <div className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded border",
                                                    driver.severity === 'Critical' ? "text-red-600 bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800" :
                                                        driver.severity === 'High' ? "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800" :
                                                            "text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800"
                                                )}>
                                                    {driver.severity}
                                                </div>
                                            </div>
                                            <div className="font-serif text-teal mb-1 text-sm">{driver.clause}</div>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">{driver.reason}</p>
                                            <div className="mt-2 text-[10px] text-slate/40 text-right">{driver.jurisdiction}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Grid - Issues & Evidence */}
                <div className="grid grid-cols-1 gap-12 mb-12">
                    {/* Detected Issues */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-serif text-2xl text-teal flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6" />
                                Detected Issues
                            </h2>
                            <span className="text-sm font-mono text-slate/60">
                                {totalIssues} total
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {detectedIssues.map((issue) => (
                                <div
                                    key={issue.id}
                                    className="bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/10 rounded-lg p-6 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "px-2 py-1 text-xs font-mono rounded",
                                                issue.severity === "Critical" ? "bg-red-500/10 text-red-500" :
                                                    issue.severity === "High" ? "bg-amber-500/10 text-amber-500" :
                                                        "bg-blue-500/10 text-blue-500"
                                            )}>
                                                {issue.severity}
                                            </span>
                                            <span className="text-xs font-mono text-slate/40 px-2 py-1 bg-charcoal/10 rounded">{issue.category}</span>
                                        </div>
                                        <div className="text-xl font-serif text-teal">{issue.riskScore}%</div>
                                    </div>

                                    <h3 className="font-serif text-lg mb-2 line-clamp-2" title={issue.title}>{issue.title}</h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-3">{issue.description}</p>

                                    <div className="space-y-3 pt-4 border-t border-charcoal/5">
                                        <div>
                                            <div className="text-xs font-bold text-slate/60 uppercase tracking-wider mb-1">Impact</div>
                                            <div className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                                <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                {issue.impact}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate/60 uppercase tracking-wider mb-1">Remediation</div>
                                            <div className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                                <ClipboardCheck className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                                                {issue.remediation}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {detectedIssues.length === 0 && !isLoading && (
                            <div className="p-8 text-center text-slate-400 border border-dashed rounded-lg bg-charcoal/5">
                                No specific non-compliance issues detected. Good job!
                            </div>
                        )}
                    </div>

                    {/* Legal Evidence Cards */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-serif text-2xl text-teal flex items-center gap-2">
                                <BookOpen className="w-6 h-6" />
                                Regulatory References
                            </h2>
                            <span className="text-sm font-mono text-slate/60">
                                {legalEvidences.length} citations
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {legalEvidences.map((evidence) => (
                                <div
                                    key={evidence.id}
                                    className="bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/10 rounded-lg overflow-hidden flex flex-col hover:border-teal/30 transition-colors"
                                >
                                    <div className="p-5 flex-1">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="px-2 py-1 bg-purple-500/10 text-purple-500 text-xs font-mono rounded flex items-center gap-1">
                                                <ScaleIcon className="w-3 h-3" />
                                                {evidence.frameworks[0] || "Regulation"}
                                            </div>
                                            <span className="px-2 py-1 bg-charcoal/5 text-slate-500 text-xs font-mono rounded flex items-center gap-1">
                                                <Globe className="w-3 h-3" />
                                                {evidence.jurisdiction}
                                            </span>
                                        </div>

                                        <h3 className="font-serif text-lg mb-1">{evidence.title}</h3>
                                        <div className="text-xs font-mono text-teal mb-4">{evidence.reference}</div>

                                        <div className="mb-4">
                                            <div className="text-xs font-bold text-slate/60 uppercase tracking-wider mb-1">Reasoning</div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-4">
                                                {evidence.content}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-charcoal/5 dark:bg-white/5 border-t border-charcoal/10 dark:border-white/10 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full",
                                                evidence.severity === "Critical" ? "bg-red-500" :
                                                    evidence.severity === "High" ? "bg-amber-500" : "bg-blue-500"
                                            )} />
                                            <span className="text-xs font-mono text-slate-500">{evidence.severity} Severity</span>
                                        </div>
                                        <button
                                            onClick={() => openLegalDocument(evidence)}
                                            className="text-xs font-bold text-teal hover:underline flex items-center gap-1"
                                        >
                                            View Clause <ChevronDown className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Fix Button Section */}
                <div className="bg-gradient-to-r from-teal/5 via-blue-500/5 to-purple-500/5 border border-teal/20 rounded-xl p-8 text-center">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="font-serif text-2xl text-teal mb-4">Implementation Plan</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-8">
                            All compliance issues have been identified. Generate automated fixes and compliance solutions.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button 
                                onClick={handleDownload}
                                disabled={isGeneratingReport}
                                className={cn(
                                    "inline-flex items-center justify-center px-10 py-4 bg-teal text-parchment font-serif text-xl rounded-lg transition-all shadow-xl shadow-teal/20",
                                    isGeneratingReport ? "opacity-70 cursor-not-allowed" : "hover:bg-teal/90"
                                )}
                            >
                                <Download className={cn("w-6 h-6 mr-3", isGeneratingReport && "animate-bounce")} />
                                {isGeneratingReport ? "Refining Analysis..." : "Download PDF Report"}
                            </button>
                        </div>
                    </div>
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
                                const features = JSON.parse(localStorage.getItem("jurai_features") || "[]");
                                const featureIndex = features.findIndex((f: any) => f.id === featureId);
                                if (featureIndex !== -1) {
                                    features[featureIndex].status = "pending";
                                    features[featureIndex].lastAnalysis = new Date().toISOString();
                                    localStorage.setItem("jurai_features", JSON.stringify(features));
                                    window.location.href = `/questionnaire?session_id=${featureId}`;
                                }
                            }}
                            className="px-8 py-3 bg-teal text-parchment font-serif text-lg rounded-lg hover:bg-teal/90 transition-colors shadow-lg shadow-teal/20"
                        >
                            Submit for Re-analysis
                        </button>
                    </div>
                </div>
            </main>

            {/* Legal Document Modal */}
            <AnimatePresence>
                {showLegalDoc && selectedEvidence && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div
                            className="bg-white dark:bg-[#151515] rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-charcoal/10 dark:border-white/10">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-serif text-xl mb-1">{selectedEvidence.title}</h3>
                                        <p className="text-sm text-slate/60">{selectedEvidence.reference}</p>
                                    </div>
                                    <button
                                        onClick={closeLegalDocument}
                                        className="p-2 hover:bg-charcoal/5 dark:hover:bg-white/10 rounded-lg"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                                    {selectedEvidence.content}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-charcoal/10 dark:border-white/10">
                                <button
                                    onClick={closeLegalDocument}
                                    className="w-full px-6 py-3 bg-teal text-parchment rounded-lg font-serif hover:bg-teal/90"
                                >
                                    Close Document
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}