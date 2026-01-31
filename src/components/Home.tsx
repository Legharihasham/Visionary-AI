import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, Variants } from 'framer-motion';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const { scrollY } = useScroll();

    // Parallax effects
    const y1 = useTransform(scrollY, [0, 1000], [0, 300]);
    const opacityHero = useTransform(scrollY, [0, 800], [1, 0]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const fadeInUp: Variants = {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeInOut" } }
    };

    const staggerContainer: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    return (
        <div className="min-h-screen relative overflow-x-hidden bg-[#050505] text-white selection:bg-accent-cyan/30 selection:text-white">

            {/* Dynamic Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                {/* Mouse Follower Blob */}
                <div
                    className="absolute w-[600px] h-[600px] rounded-full opacity-[0.05] blur-[120px] transition-all duration-1000 ease-out will-change-transform"
                    style={{
                        background: 'radial-gradient(circle, #00d4ff 0%, transparent 70%)',
                        left: mousePos.x - 300,
                        top: mousePos.y - 300,
                    }}
                />

                {/* Static Gradient Accents */}
                <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] rounded-full bg-blue-900/10 blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-900/10 blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />

                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black_40%,transparent_100%)]" />
            </div>

            {/* Navigation Bar */}
            <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 md:px-12">
                <div className="max-w-7xl mx-auto flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
                            <img src="/app-icon.png" alt="Visionary AI Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold tracking-tight text-lg">Visionary AI</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
                        <a href="#features" className="hover:text-white transition-colors">Capabilities</a>
                        <a href="#system" className="hover:text-white transition-colors">The System</a>
                        <a href="#global" className="hover:text-white transition-colors">Global</a>
                    </div>
                    <button
                        onClick={() => navigate('/session')}
                        className="px-6 py-2 bg-white text-black rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                        Try Demo
                    </button>
                </div>
            </nav>

            <main className="relative z-10 w-full">

                {/* HERO SECTION */}
                <section className="min-h-[150vh] flex flex-col justify-center items-center px-6 pt-32 pb-60">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={staggerContainer}
                        style={{ opacity: opacityHero, y: y1 }}
                        className="text-center max-w-5xl mx-auto space-y-12"
                    >
                        {/* Status Chip */}
                        <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-light border border-white/10">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-mono uppercase tracking-widest text-green-400">System Online v3.0</span>
                        </motion.div>

                        {/* Animated Headline */}
                        <div className="space-y-4">
                            <motion.h1 variants={fadeInUp} className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9]">
                                <span className="block bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">HIGHER-LEVEL</span>
                                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 animate-gradient-x p-2">
                                    INTELLIGENCE
                                </span>
                            </motion.h1>
                            <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
                                Transforms your workflow with real-time multimodal perception.
                                <span className="text-gray-200 font-medium"> It sees what you see, and guides what you do.</span>
                            </motion.p>
                        </div>

                        {/* CTA Buttons */}
                        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                            <button
                                onClick={() => navigate('/session')}
                                className="group relative px-8 py-4 bg-white text-black rounded-xl font-bold text-lg hover:scale-105 transition-transform duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                            >
                                <span className="flex items-center gap-3">
                                    Start Session
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </span>
                            </button>
                            <button className="px-8 py-4 glass text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors border border-white/10 flex items-center gap-3">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Watch Demo
                            </button>
                        </motion.div>
                    </motion.div>
                </section>

                {/* THE SYSTEM SECTION */}
                <section id="system" className="py-32 px-6 relative">
                    <div className="max-w-7xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8 }}
                            className="mb-20"
                        >
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">The System</h2>
                            <p className="text-xl text-gray-400 max-w-2xl">
                                Built on the Gemini 2.5 Flash Native Audio Preview architecture, ensuring zero-latency multimodal understanding.
                            </p>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                {
                                    title: "Cognitive Core",
                                    desc: "Advanced reasoning engine that interprets visual context instantly.",
                                    icon: "🧠",
                                    gradient: "from-purple-500/20 to-blue-500/20"
                                },
                                {
                                    title: "Neural Voice",
                                    desc: "Natural, bidirectional conversational interface with <100ms latency.",
                                    icon: "🎙️",
                                    gradient: "from-cyan-500/20 to-teal-500/20"
                                },
                                {
                                    title: "Visual Cortex",
                                    desc: "High-fidelity screen analysis at 60fps for precise guidance.",
                                    icon: "👁️",
                                    gradient: "from-purple-500/20 to-blue-500/20"
                                }
                            ].map((card, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: i * 0.1 }}
                                    className={`relative p-8 rounded-3xl bg-gradient-to-br ${card.gradient} border border-white/5 backdrop-blur-sm overflow-hidden group hover:border-white/20 transition-all duration-500`}
                                >
                                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="relative z-10">
                                        <div className="text-4xl mb-6">{card.icon}</div>
                                        <h3 className="text-2xl font-bold mb-4">{card.title}</h3>
                                        <p className="text-gray-400 leading-relaxed">{card.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* PRODUCTIVITY ENGINE */}
                <section id="features" className="py-32 px-6 bg-white/[0.02] border-y border-white/5">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="inline-block px-4 py-1 rounded-full bg-blue-500/10 text-blue-400 font-mono text-sm mb-6 border border-blue-500/20">
                                PRODUCTIVITY ENGINE
                            </div>
                            <h2 className="text-5xl font-bold mb-8 leading-tight">
                                Code Smarter.<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                                    Navigate Faster.
                                </span>
                            </h2>
                            <ul className="space-y-6">
                                {[
                                    "Real-time code analysis and debugging assistant",
                                    "Instant UI/UX feedback on your live viewport",
                                    "Automated workflow suggestions based on context",
                                    "Voice-controlled navigation for hands-free documentation"
                                ].map((item, i) => (
                                    <motion.li
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.3 + (i * 0.1) }}
                                        className="flex items-center gap-4 text-lg text-gray-300"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        {item}
                                    </motion.li>
                                ))}
                            </ul>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="relative"
                        >
                            {/* Abstract Graphic representing analysis */}
                            <div className="aspect-square rounded-3xl bg-gradient-to-tr from-gray-900 to-black border border-white/10 p-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-grid-white/[0.05] [mask-image:linear-gradient(to_bottom,transparent,black)]" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] animate-pulse-slow" />

                                {/* Floating Code Cards */}
                                <motion.div
                                    animate={{ y: [0, -20, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute top-20 right-10 p-4 glass rounded-xl border border-white/10 hover:border-blue-500/50 transition-colors w-64"
                                >
                                    <div className="flex gap-2 mb-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/50" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-2 w-3/4 bg-white/20 rounded" />
                                        <div className="h-2 w-1/2 bg-white/20 rounded" />
                                    </div>
                                </motion.div>

                                <motion.div
                                    animate={{ y: [0, 20, 0] }}
                                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                    className="absolute bottom-20 left-10 p-4 glass rounded-xl border border-white/10 hover:border-purple-500/50 transition-colors w-56"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">AI</div>
                                        <div className="h-2 w-20 bg-white/20 rounded" />
                                    </div>
                                    <div className="h-16 bg-white/5 rounded-lg border border-white/5" />
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* GLOBAL REACH */}
                <section id="global" className="py-32 px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-4xl font-bold mb-16">Universal Understanding</h2>

                        <div className="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto">
                            {[
                                "English", "Español", "Français", "Deutsch", "中文",
                                "日本語", "한국어", "Português", "Italiano", "Русский",
                                "العربية", "हिन्दी"
                            ].map((lang, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.05 }}
                                    className="px-6 py-3 glass rounded-full border border-white/10 hover:bg-white/10 hover:border-white/30 hover:scale-110 transition-all duration-300 cursor-default"
                                >
                                    <span className="text-white/80 font-medium">{lang}</span>
                                </motion.div>
                            ))}
                        </div>

                        <p className="mt-12 text-gray-500 font-mono text-sm tracking-widest uppercase">
                            + 30 more via automatic detection
                        </p>
                    </motion.div>
                </section>

                {/* DEVELOPER FOOTER */}
                <footer className="border-t border-white/5 bg-black/50 backdrop-blur-3xl pt-20 pb-10 px-6">
                    <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                        {/* Profile */}
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                                <img
                                    src="/hasham.jpg"
                                    alt="Muhammad Hasham Khan"
                                    className="w-16 h-16 rounded-full border-2 border-white/10 relative z-10 object-cover"
                                />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Muhammad Hasham Khan</h3>
                                <p className="text-sm text-gray-400">Google Certified AI Specialist</p>
                            </div>
                        </div>

                        {/* Socials */}
                        <div className="flex gap-4">
                            {[
                                { name: "GitHub", url: "https://github.com/Legharihasham" },
                                { name: "LinkedIn", url: "https://www.linkedin.com/in/muhammad-hasham-khan-b07365270" },
                                { name: "Email", url: "mailto:legharihasham408@gmail.com" }
                            ].map((social, i) => (
                                <a
                                    key={i}
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium"
                                >
                                    {social.name}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="text-center mt-16 text-xs text-gray-600 font-mono">
                        © 2026 VISIONARY AI . SYSTEM STATUS: OPERATIONAL
                    </div>
                </footer>

            </main>
        </div>
    );
};

export default Home;
