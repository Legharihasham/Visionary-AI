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
                            <div className="w-2 h-2 bg-accent-cyan rounded-full status-dot" />
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">System Active</span>
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/20">v3.0.0</div>
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
                            Screen analysis • Voice interaction • Neural guidance
                        </p>
                    </div>

                    {/* CTA Button */}
                    <div className="pt-8" style={{ animationDelay: '0.6s' }}>
                        <button
                            onClick={() => navigate('/session')}
                            className="group relative px-12 py-5 btn-metallic corner-accent"
                        >
                            <span className="relative z-10 flex items-center gap-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/80 group-hover:text-accent-cyan transition-colors duration-300">
                                Initialize Session
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
