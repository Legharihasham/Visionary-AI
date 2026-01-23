import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [isLoaded, setIsLoaded] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setIsLoaded(true);
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-void">

            {/* Animated Gradient Orbs */}
            <div
                className="absolute w-[800px] h-[800px] rounded-full opacity-[0.03] blur-[100px] pointer-events-none transition-all duration-1000 ease-out"
                style={{
                    background: 'radial-gradient(circle, #00d4ff 0%, transparent 70%)',
                    left: mousePos.x - 400,
                    top: mousePos.y - 400,
                }}
            />
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-accent-blue/[0.02] blur-[120px] animate-pulse-slow" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent-violet/[0.02] blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />

            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black_20%,transparent_100%)]" />

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-accent-cyan/20 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animation: `float ${6 + Math.random() * 4}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 5}s`,
                        }}
                    />
                ))}
            </div>

            {/* Main Content */}
            <main className={`relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

                {/* Top Bar */}
                <div className="flex justify-between items-center mb-20">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="mt-8 w-2 h-2 bg-accent-cyan rounded-full status-dot" />
                        </div>
                        <span className="mt-8 text-[10px] font-mono uppercase tracking-[0.3em] text-white/50">System Active</span>

                    </div>
                    <div className="mt-8 text-[10px] font-mono uppercase tracking-[0.2em] text-white/20">v3.0.0</div>
                </div>

                {/* Hero Section */}
                <div className="text-center space-y-16">

                    {/* Logo Icon */}
                    <div className="flex justify-center mb-8" style={{ animationDelay: '0.2s' }}>
                        <div className="relative group">
                            {/* Outer Ring */}
                            <div className="absolute inset-0 rounded-full border border-white/5 scale-150 group-hover:scale-[1.7] transition-transform duration-700" />
                            <div className="absolute inset-0 rounded-full border border-white/[0.02] scale-[2] group-hover:scale-[2.3] transition-transform duration-700" />

                            {/* Main Icon Container */}
                            <div className="relative w-20 h-20 rounded-full glass flex items-center justify-center group-hover:glow-cyan transition-all duration-500">
                                <svg className="w-8 h-8 text-accent-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M12 5C5.5 5 2 12 2 12s3.5 7 10 7 10-7 10-7-3.5-7-10-7z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="relative">
                        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-[-0.04em] leading-[0.85]">
                            <span className="metallic-text">VISIONARY</span>
                            <br />
                            <span className="text-accent-cyan text-glow-cyan">AI</span>
                        </h1>

                        {/* Decorative Lines */}
                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 w-32 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    </div>

                    {/* Subtitle */}
                    <div className="max-w-xl mx-auto space-y-6" style={{ animationDelay: '0.4s' }}>
                        <p className="text-lg md:text-xl text-white/60 font-light tracking-wide leading-relaxed">
                            Real-time multimodal intelligence.
                            <span className="text-white/80"> See. Analyze. Guide.</span>
                        </p>
                        <p className="text-sm text-white/30 font-mono tracking-wide">
                            An AI multimodal assistant that can see your screen and talk to you in real-time
                        </p>
                    </div>

                    {/* CTA Button */}
                    <div className="pt-8" style={{ animationDelay: '0.6s' }}>
                        <button
                            onClick={() => navigate('/session')}
                            className="group relative px-12 py-5 btn-metallic corner-accent"
                        >
                            <span className="relative z-10 flex items-center gap-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/80 group-hover:text-accent-cyan transition-colors duration-300">
                                Try Now For Free
                                <svg className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </span>
                        </button>
                    </div>
                </div>

                {/* Feature Pills */}
                <div className="mt-32 flex flex-wrap justify-center gap-4" style={{ animationDelay: '0.8s' }}>
                    {[
                        { icon: '◈', label: 'Vision Analysis', desc: 'Real-time screen parsing' },
                        { icon: '◉', label: 'Voice Interface', desc: 'Natural conversation' },
                        { icon: '◇', label: 'Zero Latency', desc: 'Instant responses' },
                    ].map((feature, i) => (
                        <div
                            key={i}
                            className="group glass-light px-6 py-4 flex items-center gap-4 hover:glow-cyan transition-all duration-500 cursor-default"
                        >
                            <span className="text-accent-cyan text-lg group-hover:scale-110 transition-transform">{feature.icon}</span>
                            <div>
                                <div className="text-xs font-semibold text-white/70 uppercase tracking-wider">{feature.label}</div>
                                <div className="text-[10px] text-white/30 font-mono">{feature.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* About the Developer Section */}
                <div className="mt-32 relative" style={{ animationDelay: '1.0s' }}>
                    <div className="relative group">
                        {/* Background Glow */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-accent-blue/20 via-accent-cyan/20 to-accent-violet/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />

                        {/* Main Container */}
                        <div className="relative panel p-8 md:p-10 rounded-xl overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-50">
                                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/20">Dev_Profile_v1.0</span>
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                                {/* Profile Image Container */}
                                <div className="relative shrink-0">
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-accent-cyan to-accent-violet blur opacity-20 animate-pulse-slow" />
                                    <div className="w-40 h-40 md:w-48 md:h-48 rounded-full p-[2px] bg-gradient-to-tr from-accent-cyan via-white/20 to-accent-violet relative z-10">
                                        <div className="w-full h-full rounded-full overflow-hidden border-4 border-[#0a0a0a]">
                                            <img
                                                src="/hasham.jpg"
                                                alt="Muhammad Hasham Khan"
                                                className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
                                            />
                                        </div>
                                    </div>
                                    {/* Decorative rings */}
                                    <div className="absolute inset-0 border border-white/10 rounded-full scale-110 animate-spin-slow dashed-border" />
                                    <div className="absolute inset-0 border border-white/5 rounded-full scale-125" />
                                </div>

                                {/* Content Info */}
                                <div className="text-center md:text-left space-y-4 flex-1">
                                    <div>
                                        <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                            <div className="h-[1px] w-8 bg-accent-cyan/50" />
                                            <span className="text-xs font-mono text-accent-cyan tracking-widest uppercase">Developed By</span>
                                        </div>
                                        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-1">
                                            Muhammad Hasham Khan
                                        </h2>
                                        <p className="text-white/40 font-mono text-sm">Computer Science @University of Lahore</p>
                                    </div>

                                    <div className="space-y-3 py-4 border-y border-white/5 my-4">
                                        <div className="flex items-center justify-center md:justify-start gap-3 text-white/70">
                                            <span className="text-accent-cyan">◈</span>
                                            <span>Google Certified AI Specialist</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-row flex-wrap items-center gap-4">
                                        <a href="mailto:legharihasham408@gmail.com" className="group/btn relative px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all duration-300">
                                            <span className="flex items-center gap-3 text-sm font-mono text-white/80 group-hover/btn:text-accent-cyan">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                legharihasham408@gmail.com
                                            </span>
                                        </a>

                                        <a href="https://www.linkedin.com/in/muhammad-hasham-khan-b07365270?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" className="group/btn relative px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all duration-300">
                                            <span className="flex items-center gap-3 text-sm font-mono text-white/80 group-hover/btn:text-accent-cyan">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
                                                    <circle cx="4" cy="4" r="2" strokeWidth={1.5} />
                                                </svg>
                                                LinkedIn
                                            </span>
                                        </a>

                                        <a href="https://github.com/Legharihasham" className="group/btn relative px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all duration-300">
                                            <span className="flex items-center gap-3 text-sm font-mono text-white/80 group-hover/btn:text-accent-cyan">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                                                </svg>
                                                GitHub
                                            </span>
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Corner Accents */}
                            <div className="absolute top-0 left-0 w-20 h-20 border-l border-t border-white/10 rounded-tl-xl" />
                            <div className="absolute bottom-0 right-0 w-20 h-20 border-r border-b border-white/10 rounded-br-xl" />
                        </div>
                    </div>
                </div>

                {/* Bottom Info */}
                <div className="mt-32 flex justify-between items-end text-[10px] font-mono uppercase tracking-widest text-white/15">
                    <div className="space-y-1">
                        <div>Neural Engine v3</div>
                        <div className="text-white/10">Multimodal Processing</div>
                    </div>
                    <div className="text-center">
                        <div className="text-white/20">◆</div>
                    </div>
                    <div className="text-right space-y-1">
                        <div>Encrypted Channel</div>
                        <div className="text-accent-cyan/40">● Active</div>
                    </div>
                </div>
            </main>

            {/* Bottom Gradient Line */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
    );
};

export default Home;
