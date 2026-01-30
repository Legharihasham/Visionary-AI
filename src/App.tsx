import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { ConnectionStatus, TranscriptionLine } from './types';
import {
  decode,
  encode,
  decodeAudioData,
  createAudioBlob,
  blobToBase64
} from './utils/audioUtils';
import Background3D from './components/Background3D';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';

const SAMPLE_RATE_IN = 16000;
const SAMPLE_RATE_OUT = 24000;
const FRAME_RATE = 1; // 1 frame per second for UI analysis
const JPEG_QUALITY = 0.6;

const App: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [transcriptions, setTranscriptions] = useState<TranscriptionLine[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs for audio/video stream handling
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const frameIntervalRef = useRef<number | null>(null);

  // Transcription buffer
  const currentInputTransRef = useRef<string>('');
  const currentOutputTransRef = useRef<string>('');

  const stopAll = useCallback(() => {
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    if (sessionRef.current) sessionRef.current.close();

    activeSourcesRef.current.forEach(source => source.stop());
    activeSourcesRef.current.clear();

    if (screenVideoRef.current?.srcObject) {
      (screenVideoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }

    setStatus(ConnectionStatus.DISCONNECTED);
  }, []);

  const startSession = async () => {
    try {
      setStatus(ConnectionStatus.CONNECTING);
      setErrorMessage(null);

      // 1. Get Screen Stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false
      });
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = screenStream;
      }

      // 2. Setup Audio Contexts
      inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE_IN });
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE_OUT });

      // 3. Connect to Gemini Live
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: `You are a real-time visual assistant. 
          You can see the user's screen through captured frames. 
          You hear the user's voice. 
          Analyze the UI, identify buttons, forms, layouts, and errors. 
          Explain what you see and provide verbal step-by-step guidance to help the user navigate or fix issues. 
          Be natural, concise, and helpful.`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connection Opened');
            setStatus(ConnectionStatus.CONNECTED);

            // Start streaming microphone
            navigator.mediaDevices.getUserMedia({ audio: true }).then(micStream => {
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

            // Start streaming screen frames
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
            // Handle Audio Transcription
            if (message.serverContent?.outputTranscription) {
              currentOutputTransRef.current += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              currentInputTransRef.current += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              const input = currentInputTransRef.current;
              const output = currentOutputTransRef.current;
              if (input || output) {
                setTranscriptions(prev => [
                  ...prev,
                  ...(input ? [{ type: 'user' as const, text: input, timestamp: Date.now() }] : []),
                  ...(output ? [{ type: 'ai' as const, text: output, timestamp: Date.now() }] : [])
                ].slice(-20)); // Keep last 20 messages
              }
              currentInputTransRef.current = '';
              currentOutputTransRef.current = '';
            }

            // Handle Audio Data
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioCtxRef.current) {
              const ctx = outputAudioCtxRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, SAMPLE_RATE_OUT, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);

              source.onended = () => {
                activeSourcesRef.current.delete(source);
              };

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              activeSourcesRef.current.add(source);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => s.stop());
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('Gemini error:', e);
            setErrorMessage('Connection encountered an error. Please try again.');
            stopAll();
          },
          onclose: () => {
            console.log('Gemini connection closed');
            stopAll();
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to initialize session. Ensure screen capture and microphone access are granted.');
      setStatus(ConnectionStatus.ERROR);
    }
  };

  return (
    <>
      <Background3D />
      <div className="relative min-h-screen text-silver font-sans selection:bg-accent-cyan/20 selection:text-white overflow-x-hidden">
        <Analytics />

        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12">
          {/* Header */}
          <header className="flex flex-col md:flex-row justify-between items-center gap-6 glass p-6 rounded-2xl shadow-2xl animate-fade-in relative overflow-hidden group">
            {/* Ambient Glow behind header */}
            <div className="absolute inset-0 bg-blue-900/10 blur-3xl -z-10 group-hover:bg-blue-900/20 transition-all duration-700"></div>

            <div className="flex items-center gap-5 z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-[...]}" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 tracking-tight">
                  Visionary AI
                </h1>
                <p className="text-sm text-gray-400 font-medium tracking-wide">Real-time Multimodal Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-4 z-10">
              {status === ConnectionStatus.DISCONNECTED && (
                <button
                  onClick={startSession}
                  className="btn-metallic px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center gap-2 group hover:shadow-cyan-500/20"
                >
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                  Start Session
                </button>
              )}
              {status === ConnectionStatus.CONNECTED && (
                <button
                  onClick={stopAll}
                  className="btn-metallic px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center gap-2 border-red-500/50 hover:border-red-500 bg-gradient-to-br from-red-900/50 to-red-950/80"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  End Session
                </button>
              )}
              {status === ConnectionStatus.CONNECTING && (
                <div className="px-8 py-3 rounded-xl glass-light flex items-center gap-3 text-cyan-400 font-medium border border-cyan-500/30">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
                  <span>Establishing Uplink...</span>
                </div>
              )}
            </div>
          </header>

          {errorMessage && (
            <div className="bg-red-950/30 border border-red-500/50 backdrop-blur-md text-red-200 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-xl shadow-red-900/10">
              <svg className="w-6 h-6 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-semibold">{errorMessage}</p>
            </div>
          )}

          {/* Main Interface Area */}
          <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[600px]">
            {/* Left: Screen View */}
            <section className="lg:col-span-2 glass rounded-2xl flex flex-col overflow-hidden relative group border-t-2 border-t-white/5 transition-all hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-900/20">
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-cyan-500/30 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-cyan-500/30 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-cyan-500/30 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-cyan-500/30 rounded-br-lg"></div>

              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-xl">
                <h2 className="font-bold text-gray-200 flex items-center gap-3 tracking-wide">
                  <div className={`status-dot w-3 h-3 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-gray-600'}`}></div>
                  VISUAL INPUT STREAM
                </h2>
                <div className="text-xs text-cyan-500/80 uppercase tracking-[0.2em] font-bold font-mono">
                  {status === ConnectionStatus.CONNECTED ? 'LIVE FEED ACTIVE' : 'AWAITING SIGNAL'}
                </div>
              </div>

              <div className="flex-1 bg-black/80 flex items-center justify-center relative overflow-hidden">
                {/* Grid Pattern Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

                <video
                  ref={screenVideoRef}
                  autoPlay
                  muted
                  className={`w-full h-full object-contain relative z-10 ${status !== ConnectionStatus.CONNECTED && 'hidden'}`}
                />
                {status !== ConnectionStatus.CONNECTED && (
                  <div className="flex flex-col items-center gap-6 text-gray-700 animate-pulse relative z-10">
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center">
                      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 01-2-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-lg font-mono tracking-wider">NO SIGNAL DETECTED</p>
                  </div>
                )}

                {/* Visual indicator for voice activity */}
                {status === ConnectionStatus.CONNECTED && (
                  <div className="absolute bottom-8 right-8 z-20">
                    <div className="relative flex items-center justify-center w-20 h-20">
                      <div className="pulse-ring absolute inset-0 rounded-full"></div>
                      <div className="bg-blue-600 rounded-full w-14 h-14 flex items-center justify-center shadow-lg shadow-blue-500/40 relative z-10">
                        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Hidden Canvas for capture */}
              <canvas ref={canvasRef} className="hidden" />
            </section>

            {/* Right: Interaction Panel */}
            <section className="glass rounded-2xl flex flex-col overflow-hidden border-t-2 border-t-white/5 h-[600px] lg:h-auto hover:border-purple-500/30 transition-all">
              <div className="p-4 border-b border-white/5 bg-black/40 backdrop-blur-xl flex justify-between items-center">
                <h2 className="font-bold text-gray-200 tracking-wide">TRANSCRIPT LOG</h2>
                <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth custom-scrollbar bg-black/20">
                {transcriptions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-30 select-none">
                    <div className="w-16 h-16 rounded-xl border border-dashed border-gray-500 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <p className="font-mono text-sm">SYSTEM STANDBY_</p>
                  </div>
                ) : (
                  transcriptions.map((t, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${t.type === 'user' ? 'items-end' : 'items-start'} animate-scale-in`}
                    >
                      <div
                        className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed backdrop-blur-sm shadow-lg ${t.type === 'user'
                          ? 'msg-user text-white rounded-br-none'
                          : 'msg-ai text-gray-200 rounded-bl-none'
                          }`}
                      >
                        {t.text}
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 uppercase font-mono tracking-wider ml-1">
                        {t.type === 'user' ? 'USR' : 'SYS'} :: {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 bg-black/60 border-t border-white/5 backdrop-blur-md">
                <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
                  <div className={`w-1.5 h-1.5 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-cyan-400 animate-pulse' : 'bg-red-500'}`}></div>
                  <span>{status === ConnectionStatus.CONNECTED ? 'PROCESSING_DATA_STREAM...' : 'OFFLINE_MODE'}</span>
                </div>
              </div>
            </section>
          </main>

          <Features />

          <HowItWorks />

          <footer className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-white/5">
            <div className="glass-light p-6 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-colors">
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-200 uppercase tracking-widest text-xs mb-1">Vision Intelligence</p>
                <p className="text-gray-500 text-sm">Gemini 2.5 Multimodal Reasoning</p>
              </div>
            </div>
            <div className="glass-light p-6 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-colors">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.7" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-200 uppercase tracking-widest text-xs mb-1">Neural Voice Output</p>
                <p className="text-gray-500 text-sm">Low-latency Real-time Speech</p>
              </div>
            </div>
            <div className="glass-light p-6 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-colors">
              <div className="p-3 bg-green-500/10 rounded-xl text-green-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591  ..." />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-200 uppercase tracking-widest text-xs mb-1">Privacy First</p>
                <p className="text-gray-500 text-sm">Zero-Backend Architecture</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
      <SpeedInsights />
    </>
  );
};

export default App;