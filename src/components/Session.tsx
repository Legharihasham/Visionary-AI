import React, { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { ConnectionStatus, TranscriptionLine } from '../types';
import {
    decode,
    decodeAudioData,
    createAudioBlob,
    blobToBase64
} from '../utils/audioUtils';
import { useNavigate } from 'react-router-dom';

// Defer third-party libraries to load after hydration (bundle-defer-third-party)
const SpeedInsights = lazy(() => 
  import('@vercel/speed-insights/react').then(module => ({ default: module.SpeedInsights }))
);

const SAMPLE_RATE_IN = 16000;
const SAMPLE_RATE_OUT = 24000;
const FRAME_RATE = 1;
const JPEG_QUALITY = 0.6;

const Session: React.FC = () => {
    const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
    const [transcriptions, setTranscriptions] = useState<TranscriptionLine[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const navigate = useNavigate();
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    const screenVideoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const inputAudioCtxRef = useRef<AudioContext | null>(null);
    const outputAudioCtxRef = useRef<AudioContext | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const sessionRef = useRef<any>(null);
    const nextStartTimeRef = useRef<number>(0);
    const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const frameIntervalRef = useRef<number | null>(null);
    const currentInputTransRef = useRef<string>('');
    const currentOutputTransRef = useRef<string>('');
    const fullTranscriptionsRef = useRef<TranscriptionLine[]>([]);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcriptions]);

    const saveTranscript = useCallback(async () => {
        const transcript = fullTranscriptionsRef.current;
        if (transcript.length === 0) return;

        try {
            console.log('Saving transcript...', transcript.length, 'entries');
            // Note: Using fetch for transcript saving. For production, consider using
            // navigator.sendBeacon() if you need to ensure the request completes on page unload
            
            // Include Authorization header if API_SECRET_KEY is configured
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };
            
            const apiSecret = import.meta.env.VITE_API_SECRET_KEY;
            if (apiSecret) {
                headers['Authorization'] = `Bearer ${apiSecret}`;
            }
            
            await fetch('/api/save-transcript', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    transcript,
                    timestamp: Date.now()
                })
            });
            console.log('Transcript saved successfully');
        } catch (error) {
            console.error('Failed to save transcript:', error);
        }
    }, []);

    const stopAll = useCallback(() => {
        saveTranscript(); // Save before clearing

        if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
        if (sessionRef.current) sessionRef.current.close();
        activeSourcesRef.current.forEach(source => source.stop());
        activeSourcesRef.current.clear();
        if (screenVideoRef.current?.srcObject) {
            (screenVideoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        }
        setIsMuted(false);
        setStatus(ConnectionStatus.DISCONNECTED);
        // We don't clear fullTranscriptionsRef here immediately in case we want to show a summary, 
        // but for a new session we should.
        fullTranscriptionsRef.current = [];
    }, [saveTranscript]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (sessionRef.current) {
                stopAll();
            }
        };
    }, [stopAll]);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const newState = !prev;
            if (micStreamRef.current) {
                micStreamRef.current.getAudioTracks().forEach(track => {
                    track.enabled = !newState;
                });
            }
            return newState;
        });
    }, []);

    const startSession = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            alert("This project is still not supported on mobile devices and we will introduce it soon. Please use it on Windows or another computer OS browser.");
            return;
        }
        try {
            setStatus(ConnectionStatus.CONNECTING);
            setErrorMessage(null);

            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { displaySurface: 'monitor' },
                audio: false
            });
            if (screenVideoRef.current) {
                screenVideoRef.current.srcObject = screenStream;
            }

            inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE_IN });
            outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE_OUT });

            // SECURITY WARNING: API key is exposed in client-side code
            // In production, this should be handled via a server-side proxy
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY;
            if (!apiKey) {
                throw new Error('API key is not configured. Please set VITE_GEMINI_API_KEY in your environment variables.');
            }
            const ai = new GoogleGenAI({ apiKey });
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                    systemInstruction: `You are a real-time visual assistant. You can see the user's screen through captured frames. You hear the user's voice. Analyze the UI, identify buttons, forms, layouts, and errors. Explain what you see and provide verbal step-by-step guidance to help the user navigate or fix issues. Be natural, concise, and helpful.`,
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        setStatus(ConnectionStatus.CONNECTED);
                        navigator.mediaDevices.getUserMedia({ audio: true }).then(micStream => {
                            micStreamRef.current = micStream;
                            const source = inputAudioCtxRef.current!.createMediaStreamSource(micStream);
                            const processor = inputAudioCtxRef.current!.createScriptProcessor(4096, 1, 1);
                            processor.onaudioprocess = (e) => {
                                const inputData = e.inputBuffer.getChannelData(0);
                                const pcmBlob = createAudioBlob(inputData);
                                sessionPromise.then(session => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            };
                            source.connect(processor);
                            processor.connect(inputAudioCtxRef.current!.destination);
                        });

                        frameIntervalRef.current = window.setInterval(async () => {
                            if (screenVideoRef.current && canvasRef.current) {
                                const video = screenVideoRef.current;
                                const canvas = canvasRef.current;
                                const ctx = canvas.getContext('2d');
                                if (ctx && video.readyState >= 2) {
                                    canvas.width = video.videoWidth;
                                    canvas.height = video.videoHeight;
                                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                    canvas.toBlob(async (blob) => {
                                        if (blob) {
                                            const base64Data = await blobToBase64(blob);
                                            sessionPromise.then(session => {
                                                session.sendRealtimeInput({
                                                    media: { data: base64Data, mimeType: 'image/jpeg' }
                                                });
                                            });
                                        }
                                    }, 'image/jpeg', JPEG_QUALITY);
                                }
                            }
                        }, 1000 / FRAME_RATE);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTransRef.current += message.serverContent.outputTranscription.text;
                        } else if (message.serverContent?.inputTranscription) {
                            currentInputTransRef.current += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.turnComplete) {
                            const input = currentInputTransRef.current;
                            const output = currentOutputTransRef.current;

                            // Update both state and ref
                            if (input || output) {
                                const newItems = [
                                    ...(input ? [{ type: 'user' as const, text: input, timestamp: Date.now() }] : []),
                                    ...(output ? [{ type: 'ai' as const, text: output, timestamp: Date.now() }] : [])
                                ];

                                // Update Ref for final saving (full history)
                                fullTranscriptionsRef.current = [...fullTranscriptionsRef.current, ...newItems];

                                // Update State for UI (limited history)
                                setTranscriptions(prev => [
                                    ...prev,
                                    ...newItems
                                ].slice(-30));
                            }
                            currentInputTransRef.current = '';
                            currentOutputTransRef.current = '';
                        }
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioCtxRef.current) {
                            const ctx = outputAudioCtxRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, SAMPLE_RATE_OUT, 1);
                            const source = ctx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(ctx.destination);
                            source.onended = () => activeSourcesRef.current.delete(source);
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            activeSourcesRef.current.add(source);
                        }
                        if (message.serverContent?.interrupted) {
                            activeSourcesRef.current.forEach(s => s.stop());
                            activeSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e) => {
                        console.error('Gemini error:', e);
                        setErrorMessage('Connection error. Please try again.');
                        stopAll();
                    },
                    onclose: () => stopAll()
                }
            });
            sessionRef.current = await sessionPromise;
        } catch (err: any) {
            console.error(err);
            setErrorMessage(err.message || 'Failed to initialize. Ensure screen and mic access are granted.');
            setStatus(ConnectionStatus.ERROR);
        }
    };

    const isConnected = status === ConnectionStatus.CONNECTED;
    const isConnecting = status === ConnectionStatus.CONNECTING;
    const isDisconnected = status === ConnectionStatus.DISCONNECTED;

    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    return (
        <div className="flex flex-col h-screen bg-void overflow-hidden">
            {isHydrated && (
                <Suspense fallback={null}>
                    <SpeedInsights />
                </Suspense>
            )}

            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className={`absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[150px] transition-all duration-1000 ${isConnected ? 'bg-accent-cyan/[0.03]' : 'bg-accent-blue/[0.02]'
                    }`} />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-accent-violet/[0.02] blur-[120px]" />
            </div>

            {/* Header */}
            <header className={`relative z-20 flex justify-between items-center px-6 py-4 glass border-b border-white/5 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                <div className="flex items-center gap-5">
                    {/* Back Button */}
                    <button
                        onClick={() => navigate('/')}
                        className="group w-10 h-10 flex items-center justify-center border border-white/10 hover:border-accent-cyan/50 hover:glow-cyan transition-all duration-300"
                        aria-label="Navigate back to home page"
                    >
                        <svg className="w-4 h-4 text-white/50 group-hover:text-accent-cyan transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Logo */}
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className={`w-3 h-3 rounded-full transition-all duration-500 ${isConnected ? 'bg-accent-cyan status-dot' : isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-white/20'
                                }`} />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold tracking-tight">
                                <span className="text-white">Visionary</span>
                                <span className="text-white/30">AI</span>
                            </h1>
                            <div className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                                {isConnected ? 'Session Active' : isConnecting ? 'Connecting...' : 'Ready'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                    {isDisconnected && (
                        <button
                            onClick={startSession}
                            className="group relative px-8 py-3 btn-metallic overflow-hidden"
                            aria-label="Start Visionary AI session"
                        >
                            <span className="relative z-10 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-white/70 group-hover:text-accent-cyan transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <circle cx="12" cy="12" r="10" />
                                    <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
                                </svg>
                                Start Session
                            </span>
                        </button>
                    )}

                    {isConnected && (
                        <div className="flex items-center gap-2">
                            {/* Mute Button */}
                            <button
                                onClick={toggleMute}
                                className={`group w-10 h-10 flex items-center justify-center border transition-all duration-300 ${isMuted
                                    ? 'border-red-500/50 bg-red-500/10 hover:bg-red-500/20'
                                    : 'border-white/10 hover:border-accent-cyan/50'
                                    }`}
                                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                                aria-pressed={isMuted}
                            >
                                {isMuted ? (
                                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 19L5 5M12 18.5A6.5 6.5 0 015.5 12V10M8.5 5.14A4.5 4.5 0 0116.5 8v4a4.48 4.48 0 01-.29 1.6M12 22v-3.5" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4 text-white/50 group-hover:text-accent-cyan transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 2a4.5 4.5 0 014.5 4.5v5a4.5 4.5 0 01-9 0v-5A4.5 4.5 0 0112 2zM19 10v1.5a7 7 0 01-14 0V10M12 18.5V22" />
                                    </svg>
                                )}
                            </button>

                            {/* End Button */}
                            <button
                                onClick={stopAll}
                                className="group px-6 py-2.5 border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/50 transition-all duration-300"
                                aria-label="End Visionary AI session"
                            >
                                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-red-400">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <rect x="6" y="6" width="12" height="12" rx="1" />
                                    </svg>
                                    End
                                </span>
                            </button>
                        </div>
                    )}

                    {isConnecting && (
                        <div className="flex items-center gap-3 px-6 py-3">
                            <div className="w-4 h-4 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
                            <span className="text-xs font-mono uppercase tracking-widest text-white/40">Initializing...</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Error Banner */}
            {errorMessage && (
                <div className="relative z-10 mx-6 mt-4 px-5 py-4 glass border-l-2 border-red-500 animate-slide-down">
                    <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 8v4M12 16h.01" />
                        </svg>
                        <span className="text-sm text-red-300">{errorMessage}</span>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className={`relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 md:p-6 min-h-0 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

                {/* Video Panel */}
                <div className="lg:col-span-8 xl:col-span-9 flex flex-col min-h-0 panel rounded-lg overflow-hidden">
                    {/* Panel Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent-cyan status-dot' : 'bg-white/20'}`} />
                            <span className="text-xs font-medium uppercase tracking-wider text-white/40">Screen Feed</span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest text-white/20">
                            <span>1 FPS</span>
                            <span className="w-px h-3 bg-white/10" />
                            <span>Live</span>
                        </div>
                    </div>

                    {/* Video Area */}
                    <div className="flex-1 relative flex items-center justify-center bg-black/50 overflow-hidden">
                        {/* Grid Overlay */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

                        <video
                            ref={screenVideoRef}
                            autoPlay
                            muted
                            className={`w-full h-full object-contain transition-opacity duration-500 ${!isConnected && 'opacity-0 absolute'}`}
                            aria-label="Live screen capture feed"
                        />

                        {!isConnected && (
                            <div className="flex flex-col items-center gap-6 text-center">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                                            <rect x="2" y="3" width="20" height="14" rx="2" />
                                            <path d="M8 21h8M12 17v4" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-white/30">No screen connected</p>
                                    <p className="text-xs text-white/15 font-mono">Start a session to begin</p>
                                </div>
                            </div>
                        )}

                        {/* Live Indicator */}
                        {isConnected && (
                            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 glass-light rounded-full">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Live</span>
                            </div>
                        )}

                        {/* Voice Indicator */}
                        {isConnected && !isMuted && (
                            <div className="absolute bottom-4 right-4">
                                <div className="relative w-14 h-14 rounded-full glass flex items-center justify-center pulse-ring">
                                    <svg className="w-6 h-6 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M12 2a4.5 4.5 0 014.5 4.5v5a4.5 4.5 0 01-9 0v-5A4.5 4.5 0 0112 2z" />
                                        <path d="M19 10v1.5a7 7 0 01-14 0V10" />
                                    </svg>
                                </div>
                            </div>
                        )}
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Transcript Panel */}
                <div className="lg:col-span-4 xl:col-span-3 flex flex-col min-h-0 panel rounded-lg overflow-hidden">
                    {/* Panel Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                        <span className="text-xs font-medium uppercase tracking-wider text-white/40">Transcript</span>
                        <span className="text-[10px] font-mono text-white/20">{transcriptions.length} msgs</span>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {transcriptions.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center py-12">
                                <svg className="w-10 h-10 text-white/10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p className="text-xs text-white/20">Conversation will appear here</p>
                            </div>
                        ) : (
                            transcriptions.map((t, idx) => (
                                <div
                                    key={idx}
                                    className={`animate-fade-in ${t.type === 'user' ? 'pl-4' : 'pr-4'}`}
                                >
                                    <div className={`flex items-center gap-2 mb-1.5 text-[10px] font-mono uppercase tracking-wider ${t.type === 'user' ? 'text-accent-blue/60 justify-end' : 'text-white/30'
                                        }`}>
                                        <span>{t.type === 'user' ? 'You' : 'AI'}</span>
                                        <span className="text-white/10">•</span>
                                        <span className="text-white/20">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className={`px-4 py-3 rounded-lg text-sm leading-relaxed ${t.type === 'user' ? 'msg-user text-white/80' : 'msg-ai text-white/60'
                                        }`}>
                                        {t.text}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={transcriptEndRef} />
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-accent-cyan' : 'bg-white/20'}`} />
                            <span className="text-[10px] font-mono uppercase tracking-wider text-white/25">
                                {isConnected ? 'Listening' : 'Offline'}
                            </span>
                        </div>
                        <span className="text-[10px] font-mono text-white/15">E2E Encrypted</span>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Session;
