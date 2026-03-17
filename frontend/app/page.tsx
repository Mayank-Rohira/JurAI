"use client";

import { Shield, Scale, AlertCircle, CheckCircle2, ChevronDown, User, Settings, Menu, Gavel, Search, Bell, X } from "lucide-react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";

import { NavBar } from "@/components/NavBar";

export default function Home() {

  const targetRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants: any = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-teal/10 selection:text-teal">
      {/* Navigation */}
      <NavBar />

      {/* Hero Section */}
      <section ref={targetRef} className="relative h-screen flex flex-col items-center justify-center text-center px-6 pt-20 overflow-hidden">
        {/* Background Image / Texture */}
        <div className="absolute inset-0 -z-20">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-parchment/60 via-parchment/20 to-parchment/60 dark:from-black/80 dark:via-black/40 dark:to-black/80" />
        </div>

        <motion.div
            style={{ opacity: mounted ? opacity : 0, scale: mounted ? scale : 1, y: mounted ? y : 0 }}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-5xl space-y-12 relative"
        >
          <motion.div variants={itemVariants} className="space-y-6">
            <h1 className="font-serif text-8xl md:text-[14rem] text-teal dark:text-parchment tracking-tighter leading-none select-none drop-shadow-2xl">
              JurAI
            </h1>
            <div className="h-px w-32 bg-gold/50 mx-auto" />
            <p className="text-2xl md:text-3xl font-serif italic text-teal/80 dark:text-parchment/90">
              “Automated Compliance Intelligence”
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-8">
            <p className="text-xl text-charcoal/70 dark:text-parchment/70 max-w-2xl mx-auto font-light leading-relaxed">
              Detect legal and regulatory risks before you build. A professional-grade compliance system for high-growth product teams.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link
                  href="/sessions"
                  className="group relative px-10 py-5 bg-teal text-parchment font-serif text-xl rounded-sm transition-all overflow-hidden shadow-2xl hover:scale-105 active:scale-95"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Begin Analysis
                  <ChevronDown className="w-5 h-5 -rotate-90 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Link>
            </div>
          </motion.div>

          <motion.div
              style={{ opacity: mounted ? opacity : 1 }}
              animate={mounted ? { y: [0, 10, 0] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute bottom-[-10rem] left-1/2 -translate-x-1/2 text-teal/30 dark:text-parchment/30"
          >
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] mb-2">Explore System</p>
            <ChevronDown className="w-6 h-6 mx-auto" />
          </motion.div>
        </motion.div>
      </section>

      {/* Meet Your AI Team */}
      <section className="py-32 px-6 bg-white dark:bg-[#0D0D0D] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-charcoal/10 dark:via-white/10 to-transparent" />

        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20 space-y-4"
          >
            <h2 className="font-serif text-5xl text-teal dark:text-parchment">Compliance Analysis</h2>
            <div className="w-24 h-1 bg-gold/30 mx-auto rounded-full" />
            <p className="text-slate/70 dark:text-slate/40 max-w-2xl mx-auto text-lg font-light">
              Specialized analysis modules designed to scrutinize every aspect of your product's compliance standing.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Regulatory Analyst",
                role: "Risk Assessment",
                desc: "Scans global databases for applicable statutes and quantifies potential liabilities with precision. Combines regulatory detection with advanced risk assessment.",
                icon: Shield,
                id: "RRA-001",
                color: "border-teal/20 dark:border-teal/10",
                image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop"
              },
              {
                name: "UI Auditor",
                role: "Design Review",
                desc: "Evaluates user interface patterns for dark patterns and accessibility violations. Ensures your product remains ethical and inclusive.",
                icon: Scale,
                id: "CRT-009",
                color: "border-gold/20 dark:border-gold/10",
                image: "https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=800&auto=format&fit=crop"
              },
              {
                name: "Compliance Lead",
                role: "Final Validation",
                desc: "The final authority on product readiness and compliance certification. Issues the definitive report on market entry and regulatory standing.",
                icon: CheckCircle2,
                id: "JDG-100",
                color: "border-teal/20 dark:border-teal/10",
                image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=800&auto=format&fit=crop"
              }
            ].map((juror, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
                whileHover={{ y: -10 }}
                className={`group relative bg-parchment dark:bg-[#151515] border ${juror.color} rounded-sm transition-all duration-500 cursor-default overflow-hidden h-[450px]`}
              >
                {/* Image Overlay */}
                <motion.div
                  className="absolute inset-0 z-20 transition-opacity duration-500"
                  initial={{ opacity: 1 }}
                  whileHover={{ opacity: 0 }}
                >
                  <img
                    src={juror.image}
                    alt={juror.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-teal/40 mix-blend-multiply opacity-20" />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent opacity-60" />
                  <div className="absolute bottom-8 left-8 text-parchment">
                    <h3 className="font-serif text-3xl mb-1">{juror.name}</h3>
                    <p className="text-gold font-medium text-[10px] uppercase tracking-[0.2em]">{juror.role}</p>
                  </div>
                </motion.div>

                {/* Content (Visible on Hover) */}
                <div className="relative z-10 p-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="absolute top-6 right-6 font-mono text-[10px] text-slate/20 tracking-widest group-hover:text-teal/40 transition-colors">
                      {juror.id}
                    </div>
                    <div className="mb-8 relative">
                      <div className="absolute inset-0 bg-teal/5 scale-150 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                      <juror.icon className="w-12 h-12 text-teal/80 stroke-[1.25px] relative z-10 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <h3 className="font-serif text-2xl text-teal dark:text-parchment mb-2">{juror.name}</h3>
                    <p className="text-gold font-medium text-[10px] uppercase tracking-[0.2em] mb-6">
                      {juror.role}
                    </p>
                    <p className="text-sm text-slate/70 dark:text-slate/40 leading-relaxed font-light">
                      {juror.desc}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-charcoal/5 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-slate/40 uppercase tracking-tighter">Status: Active</span>
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-1.5 h-1.5 rounded-full bg-teal"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 bg-parchment dark:bg-[#0A0A0A] border-t border-charcoal/5 dark:border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Scale className="w-6 h-6 text-teal" />
                <span className="font-serif text-2xl font-bold tracking-tight text-teal dark:text-parchment">JurAI</span>
              </div>
              <p className="text-sm text-slate/50 max-w-xs font-light">
                Professional-grade compliance intelligence system for high-growth product teams.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-teal">Platform</h4>
                <ul className="space-y-2 text-sm text-slate/60 font-light">
                  <li className="hover:text-teal cursor-pointer transition-colors">Analysis</li>
                  <li className="hover:text-teal cursor-pointer transition-colors">Case Files</li>
                  <li className="hover:text-teal cursor-pointer transition-colors">Statutes</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-teal">Legal</h4>
                <ul className="space-y-2 text-sm text-slate/60 font-light">
                  <li className="hover:text-teal cursor-pointer transition-colors">Privacy</li>
                  <li className="hover:text-teal cursor-pointer transition-colors">Terms</li>
                  <li className="hover:text-teal cursor-pointer transition-colors">Ethics</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-teal">Connect</h4>
                <ul className="space-y-2 text-sm text-slate/60 font-light">
                  <li className="hover:text-teal cursor-pointer transition-colors">Contact</li>
                  <li className="hover:text-teal cursor-pointer transition-colors">Support</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-charcoal/5 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-[10px] font-mono text-slate/40 uppercase tracking-widest">
              © 2024 JURAI SYSTEMS. ALL RIGHTS RESERVED.
            </div>
            <div className="flex gap-6">
              <div className="w-8 h-8 rounded-full border border-teal/10 flex items-center justify-center text-teal/40 hover:text-teal hover:border-teal/30 transition-all cursor-pointer">
                <span className="text-xs">𝕏</span>
              </div>
              <div className="w-8 h-8 rounded-full border border-teal/10 flex items-center justify-center text-teal/40 hover:text-teal hover:border-teal/30 transition-all cursor-pointer">
                <span className="text-xs">in</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}