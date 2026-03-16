"use client";

import { Shield, Scale, AlertCircle, CheckCircle2, ChevronDown, User, Settings, Menu, Gavel, Search, Bell, X, Terminal, Cpu, Zap, Activity, ChevronRight } from "lucide-react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";

export default function Home() {
  const { user, login, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, isSignUp ? name : undefined);
  };

  const targetRef = useRef(null);
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

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-teal/10 selection:text-teal relative overflow-hidden bg-parchment dark:bg-[#0A0A0A]">
      
      {/* Background Subtle Gradient */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-teal/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-gold/5 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className="fixed top-0 w-full z-50 bg-parchment/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md border-b border-charcoal/5 dark:border-white/5 px-6 py-4 flex justify-between items-center"
      >
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="relative">
              <Scale className="w-6 h-6 text-teal transition-transform group-hover:rotate-12" />
              <motion.div
                className="absolute -top-1 -right-1 w-2 h-2 bg-gold rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight text-teal dark:text-parchment">JurAI</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => user ? router.push("/dashboard") : setIsModalOpen(true)}
              className="text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:text-teal transition-colors font-bold"
            >
                Dashboard
            </button>
            <div className="w-1 h-1 bg-charcoal/10 dark:bg-white/10 rounded-full" />
            <button 
              onClick={() => user ? router.push("/settings") : setIsModalOpen(true)}
              className="text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:text-teal transition-colors font-bold"
            >
                Settings
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 mr-2 pr-4 border-r border-charcoal/10 dark:border-white/10">
            <ThemeToggle />
          </div>
          <button
            onClick={() => { setIsSignUp(false); setIsModalOpen(true); }}
            className="hidden sm:block text-[10px] uppercase tracking-widest text-teal dark:text-parchment px-4 py-2 hover:bg-teal/5 rounded-sm transition-colors font-bold"
          >
            Log In
          </button>
          <button
            onClick={() => { setIsSignUp(true); setIsModalOpen(true); }}
            className="text-[10px] uppercase tracking-widest bg-teal text-parchment px-5 py-2 rounded-sm shadow-lg hover:shadow-teal/20 hover:-translate-y-0.5 transition-all active:translate-y-0 font-bold"
          >
            Sign Up
          </button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section ref={targetRef} className="relative h-screen flex flex-col items-center justify-center text-center px-6 pt-20 overflow-hidden">
        {/* Background Image / Texture */}
        <div className="absolute inset-0 -z-20">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-[0.2] dark:opacity-[0.15] grayscale" />
          <div className="absolute inset-0 bg-gradient-to-b from-parchment via-transparent to-parchment dark:from-[#0A0A0A] dark:via-transparent dark:to-[#0A0A0A]" />
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <motion.div
            style={{ opacity, scale }}
            animate={{
              rotate: 360,
            }}
            transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/4 left-1/4 w-[50rem] h-[50rem] border border-teal/5 dark:border-teal/10 rounded-full"
          />
          <motion.div
            style={{ opacity, scale }}
            animate={{
              rotate: -360,
            }}
            transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-1/4 right-1/4 w-[40rem] h-[40rem] border border-teal/5 dark:border-teal/10 rounded-full"
          />
        </div>

        <motion.div
          style={{ opacity, scale, y }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl space-y-8 relative"
        >
          {/* Tech Watermark */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 opacity-[0.03] dark:opacity-[0.07] pointer-events-none">
            <Terminal className="w-96 h-96" />
          </div>

          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal/20 bg-teal/5 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
            <span className="text-[9px] uppercase tracking-[0.3em] text-teal font-bold">AI Compliance Audit Engine</span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="font-serif text-8xl md:text-[14rem] text-teal dark:text-parchment tracking-tighter leading-none select-none relative">
            JurAI
          </motion.h1>

          <motion.div variants={itemVariants} className="space-y-4 max-w-3xl mx-auto">
            <p className="text-2xl md:text-4xl font-serif italic text-slate/80 dark:text-slate/80">
              “Building Your Legal Fortress”
            </p>
            <p className="text-sm md:text-base text-charcoal/60 dark:text-parchment/40 uppercase tracking-widest leading-relaxed">
                Scan. Identify. Resolve. <br/>
                Deep AI analysis for modern business compliance.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="pt-8 flex flex-col items-center justify-center gap-6">
            <button
              onClick={() => user ? router.push("/dashboard") : setIsModalOpen(true)}
              className="relative inline-flex items-center justify-center px-12 py-5 bg-teal text-parchment font-serif text-xl rounded-sm shadow-2xl hover:shadow-teal/40 transition-all duration-500 group overflow-hidden w-full sm:w-auto hover:bg-teal/90"
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer" />
              <span className="relative z-10 flex items-center gap-3">
                <Shield className="w-5 h-5 opacity-50" />
                Start Compliance Assessment
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 1 }}
              className="text-slate/30 text-center"
            >
              <p className="text-[10px] uppercase tracking-widest mb-2 font-bold">Proceed</p>
              <ChevronDown className="w-5 h-5 mx-auto animate-bounce" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Meet Your AI Team */}
      <section className="py-32 px-6 bg-white dark:bg-[#0D0D0D] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-charcoal/10 dark:via-white/10 to-transparent" />
        
        {/* Decorative Grid */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20 space-y-4"
          >
            <h2 className="font-serif text-5xl text-teal dark:text-parchment">Expert AI Advisors</h2>
            <p className="text-[10px] uppercase tracking-[0.4em] text-gold font-bold">Comprehensive Analysis Protocols</p>
            <p className="text-slate/70 dark:text-slate/40 max-w-2xl mx-auto text-sm uppercase tracking-widest leading-relaxed">
              Autonomous legal agents specialized in identifying regulatory risks and design flaws.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Juror",
                role: "Regulatory Risk Analyst",
                desc: "Analyzes global frameworks for liability patterns and statutory compliance.",
                icon: Shield,
                code: "ADVISOR-01",
                image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop"
              },
              {
                name: "Critic",
                role: "Design Reviewer",
                desc: "Reviews interfaces for unethical dark patterns and deceptive UX practices.",
                icon: Cpu,
                code: "ADVISOR-02",
                image: "https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=800&auto=format&fit=crop"
              },
              {
                name: "Judge",
                role: "Compliance Lead",
                desc: "Synthesizes analysis into actionable verdicts and final certification.",
                icon: Activity,
                code: "ADVISOR-03",
                image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=800&auto=format&fit=crop"
              }
            ].map((juror, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
                className="group relative bg-parchment dark:bg-[#151515] border border-charcoal/10 dark:border-white/5 rounded-2xl overflow-hidden h-[450px] transition-all hover:border-teal/30 hover:shadow-2xl hover:shadow-teal/5"
              >
                {/* Image Overlay */}
                <div className="absolute inset-0 z-0">
                  <img
                    src={juror.image}
                    alt={juror.name}
                    className="w-full h-full object-cover grayscale opacity-30 group-hover:opacity-60 transition-all duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-parchment dark:from-[#151515] via-transparent to-transparent" />
                </div>

                {/* Content */}
                <div className="relative z-10 p-8 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center text-teal group-hover:bg-teal group-hover:text-parchment transition-all duration-500">
                            <juror.icon className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] text-slate/30 group-hover:text-teal/40 transition-colors font-bold tracking-widest">{juror.code}</span>
                    </div>
                    <h3 className="font-serif text-3xl text-teal dark:text-parchment mb-1">{juror.name}</h3>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold mb-6">{juror.role}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-y-2 group-hover:translate-y-0 uppercase tracking-tighter">
                      {juror.desc}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-charcoal/5 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
                        <span className="text-[9px] text-teal uppercase tracking-widest font-bold">Secure Connection</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate/20 group-hover:text-teal transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 bg-parchment dark:bg-[#0A0A0A] border-t border-charcoal/5 dark:border-white/5 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Scale className="w-6 h-6 text-teal" />
                <span className="font-serif text-2xl font-bold tracking-tight text-teal dark:text-parchment">JurAI</span>
              </div>
              <p className="text-[10px] text-slate/50 max-w-xs uppercase tracking-widest font-bold">
                EST. 2024. Enterprise-grade compliance infrastructure.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <h4 className="text-[10px] uppercase tracking-[0.3em] text-teal font-bold">Products</h4>
                <ul className="space-y-2 text-[10px] uppercase tracking-widest text-slate/60 font-bold">
                  <li className="hover:text-teal cursor-pointer transition-colors">Risk Assessment</li>
                  <li className="hover:text-teal cursor-pointer transition-colors">Audit Trail</li>
                  <li className="hover:text-teal cursor-pointer transition-colors">Documentation</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] uppercase tracking-[0.3em] text-teal font-bold">Legal</h4>
                <ul className="space-y-2 text-[10px] uppercase tracking-widest text-slate/60 font-bold">
                  <li className="hover:text-teal cursor-pointer transition-colors">Privacy Policy</li>
                  <li className="hover:text-teal cursor-pointer transition-colors">Terms of Service</li>
                  <li className="hover:text-teal cursor-pointer transition-colors">Ethics</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] uppercase tracking-[0.3em] text-teal font-bold">Support</h4>
                <ul className="space-y-2 text-[10px] uppercase tracking-widest text-slate/60 font-bold">
                  <li className="hover:text-teal cursor-pointer transition-colors">Contact Us</li>
                  <li className="hover:text-teal cursor-pointer transition-colors">Help Center</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-charcoal/5 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-[9px] uppercase tracking-[0.5em] font-bold">
              © 2024 JURAI SYSTEMS — SECURE PLATFORM
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

      {/* Authentication Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal/80 dark:bg-black/90 backdrop-blur-xl"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-parchment dark:bg-[#151515] rounded-[3rem] shadow-2xl border border-charcoal/10 dark:border-white/10 overflow-hidden p-12"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal via-gold to-teal" />
              
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-8 right-8 p-2 text-slate-400 hover:text-teal transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center mb-10">
                <div className="w-16 h-16 rounded-2xl bg-teal/10 flex items-center justify-center text-teal mx-auto mb-6">
                    <Shield className="w-8 h-8" />
                </div>
                <h2 className="font-serif text-3xl font-bold text-teal dark:text-parchment mb-2">Welcome to JurAI</h2>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                  {isSignUp ? 'Create your account' : 'Sign in to your dashboard'}
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {isSignUp && (
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-6 py-4 bg-white dark:bg-[#0A0A0A] border border-charcoal/10 dark:border-white/10 rounded-2xl text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-6 py-4 bg-white dark:bg-[#0A0A0A] border border-charcoal/10 dark:border-white/10 rounded-2xl text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all text-sm"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-6 py-4 bg-white dark:bg-[#0A0A0A] border border-charcoal/10 dark:border-white/10 rounded-2xl text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-teal text-parchment py-5 rounded-2xl font-serif text-lg shadow-xl shadow-teal/20 hover:scale-[1.02] transition-all active:scale-100 mt-8"
                >
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-[10px] uppercase tracking-widest text-teal font-bold hover:underline"
                >
                  {isSignUp ? 'Already have an account? Log In' : 'No account yet? Sign Up'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}