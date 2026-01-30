import React from 'react';
import { motion } from 'framer-motion';

const features = [
    {
        title: "Real-time Vision",
        description: "Instant analysis of your screen at 1 FPS. Detects UI elements, text, and context with high precision.",
        icon: (
            <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
        )
    },
    {
        title: "Neural Voice",
        description: "Natural, low-latency voice interaction using Gemini 2.5. Talk to your AI just like a human.",
        icon: (
            <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
        )
    },
    {
        title: "Zero Latency",
        description: "Optimized WebRTC and WebSocket pipelines ensure instant feedback loops for seamless collaboration.",
        icon: (
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        )
    }
];

const Features: React.FC = () => {
    return (
        <section className="py-20 relative">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-4">
                        Next-Gen Intelligence
                    </h2>
                    <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                        Powered by Google's Gemini 2.5 Flash Native Model, bringing multimodal reasoning to your browser.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className="bg-gray-900/40 backdrop-blur-md border border-gray-800 p-8 rounded-2xl hover:bg-gray-800/60 transition-colors group"
                        >
                            <div className="mb-6 p-4 bg-gray-800/50 rounded-xl w-fit group-hover:scale-110 transition-transform duration-300 border border-gray-700">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">{feature.title}</h3>
                            <p className="text-gray-400 leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
