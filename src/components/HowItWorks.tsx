import React from 'react';
import { motion } from 'framer-motion';

const steps = [
    {
        num: "01",
        title: "Initialize System",
        description: "Click 'Start Session' to initialize the secure WebRTC connection with Gemini Cloud."
    },
    {
        num: "02",
        title: "Grant Access",
        description: "Select the screen or window you want the AI to analyze. Enable microphone permissions for voice."
    },
    {
        num: "03",
        title: "Collaborate",
        description: "Speak naturally. The AI sees what you see and responds instantly with audio and text."
    }
];

const HowItWorks: React.FC = () => {
    return (
        <section className="py-20 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent" />

            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                        Operational Workflow
                    </h2>
                    <p className="text-gray-500 uppercase tracking-widest text-sm font-semibold">
                        Seamless Integration Protocol
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.2 }}
                            viewport={{ once: true }}
                            className="relative pl-8 border-l-2 border-gray-800 hover:border-blue-500 transition-colors duration-300"
                        >
                            <span className="text-6xl font-bold text-gray-800 absolute -top-4 -left-6 bg-void z-0 opacity-20 select-none">
                                {step.num}
                            </span>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold text-white mb-4">{step.title}</h3>
                                <p className="text-gray-400">
                                    {step.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
