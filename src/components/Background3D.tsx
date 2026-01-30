import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Float, Stars } from '@react-three/drei';
import * as random from 'maath/random/dist/maath-random.esm';

const ParticleField = (props: any) => {
    const ref = useRef<any>(null);

    // Generate random points in a sphere
    const sphere = useMemo(() => random.inSphere(new Float32Array(5000), { radius: 1.5 }), []);

    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.x -= delta / 10;
            ref.current.rotation.y -= delta / 15;
        }
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
                <PointMaterial
                    transparent
                    color="#0066ff"
                    size={0.002}
                    sizeAttenuation={true}
                    depthWrite={false}
                    opacity={0.8}
                />
            </Points>
        </group>
    );
};

const Background3D: React.FC = () => {
    return (
        <div className="fixed inset-0 -z-10 bg-black">
            <Canvas camera={{ position: [0, 0, 1] }}>
                <Float speed={0.5} rotationIntensity={0.5} floatIntensity={0.2}>
                    <ParticleField />
                </Float>
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <ambientLight intensity={0.5} />
            </Canvas>
            {/* Gradient overlay to ensure text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-[#000] to-[#000] pointer-events-none" />
        </div>
    );
};

export default Background3D;
