import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useThreeStore } from '@/renderer/stores/Avatar/ThreeStore';

interface Avatar3DProps {
  width?: number;
  height?: number;
  enableControls?: boolean;
  autoRotate?: boolean;
}

// Avatar Model Component
function AvatarModel() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { 
    currentAppearance, 
    currentAnimation, 
    animationSpeed,
    selectedModel,
    getModelById 
  } = useThreeStore();

  const currentModel = getModelById(selectedModel || 'alice-3d');

  // Create a simple avatar geometry based on appearance
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Rotate the avatar slowly
      meshRef.current.rotation.y += delta * 0.5 * animationSpeed;
      
      // Add some idle animation
      if (currentAnimation === 'idle') {
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      } else if (currentAnimation === 'wave') {
        meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.2;
      }
    }
  });

  return (
    <group>
      {/* Head */}
      <mesh ref={meshRef} position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color={currentAppearance.skinColor} />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[-0.1, 1.6, 0.25]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={currentAppearance.eyeColor} />
      </mesh>
      <mesh position={[0.1, 1.6, 0.25]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={currentAppearance.eyeColor} />
      </mesh>
      
      {/* Hair */}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color={currentAppearance.hairColor} />
      </mesh>
      
      {/* Body */}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.3, 0.4, 0.8, 32]} />
        <meshStandardMaterial color={currentAppearance.clothingColor} />
      </mesh>
      
      {/* Arms */}
      <mesh position={[-0.5, 0.9, 0]}>
        <cylinderGeometry args={[0.1, 0.08, 0.6, 16]} />
        <meshStandardMaterial color={currentAppearance.skinColor} />
      </mesh>
      <mesh position={[0.5, 0.9, 0]}>
        <cylinderGeometry args={[0.1, 0.08, 0.6, 16]} />
        <meshStandardMaterial color={currentAppearance.skinColor} />
      </mesh>
      
      {/* Legs */}
      <mesh position={[-0.15, 0.1, 0]}>
        <cylinderGeometry args={[0.12, 0.1, 0.6, 16]} />
        <meshStandardMaterial color={currentAppearance.clothingColor} />
      </mesh>
      <mesh position={[0.15, 0.1, 0]}>
        <cylinderGeometry args={[0.12, 0.1, 0.6, 16]} />
        <meshStandardMaterial color={currentAppearance.clothingColor} />
      </mesh>
    </group>
  );
}

// Lighting Setup
function Lighting() {
  const { lightingSettings } = useThreeStore();
  
  return (
    <>
      <ambientLight 
        color={lightingSettings.ambientLight.color} 
        intensity={lightingSettings.ambientLight.intensity} 
      />
      <directionalLight
        position={[
          lightingSettings.directionalLight.position.x,
          lightingSettings.directionalLight.position.y,
          lightingSettings.directionalLight.position.z
        ]}
        color={lightingSettings.directionalLight.color}
        intensity={lightingSettings.directionalLight.intensity}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      {lightingSettings.pointLights.map((light, index) => (
        <pointLight
          key={index}
          position={[light.position.x, light.position.y, light.position.z]}
          color={light.color}
          intensity={light.intensity}
          distance={light.distance}
        />
      ))}
    </>
  );
}

// Loading Component
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="gray" wireframe />
    </mesh>
  );
}

// Main Avatar3D Component
export default function Avatar3D({ 
  width, 
  height, 
  enableControls = true, 
  autoRotate = false 
}: Avatar3DProps) {
  const { 
    cameraSettings, 
    sceneSettings, 
    enableShadows, 
    enableAntialiasing,
    renderQuality 
  } = useThreeStore();

  // Performance settings based on quality
  const getPerformanceSettings = () => {
    switch (renderQuality) {
      case 'low':
        return { pixelRatio: 0.5, shadows: false, antialias: false };
      case 'medium':
        return { pixelRatio: 1, shadows: enableShadows, antialias: enableAntialiasing };
      case 'high':
        return { pixelRatio: Math.min(window.devicePixelRatio, 2), shadows: enableShadows, antialias: enableAntialiasing };
      default:
        return { pixelRatio: 1, shadows: enableShadows, antialias: enableAntialiasing };
    }
  };

  const performanceSettings = getPerformanceSettings();

  // Use full container if width/height not specified
  const containerStyle = {
    width: width || '100%',
    height: height || '100%'
  };

  return (
    <div style={containerStyle}>
      <Canvas
        shadows={performanceSettings.shadows}
        dpr={performanceSettings.pixelRatio}
        gl={{ 
          antialias: performanceSettings.antialias,
          alpha: true,
          powerPreference: "high-performance"
        }}
        camera={{
          position: [cameraSettings.position.x, cameraSettings.position.y, cameraSettings.position.z],
          fov: cameraSettings.fov,
          near: cameraSettings.near,
          far: cameraSettings.far
        }}
        style={{ background: sceneSettings.backgroundColor }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Lighting />
          
          {sceneSettings.fog && (
            <fog 
              attach="fog" 
              args={[sceneSettings.fog.color, sceneSettings.fog.near, sceneSettings.fog.far]} 
            />
          )}
          
          <AvatarModel />
          
          {enableControls && (
            <OrbitControls 
              enablePan={false}
              enableZoom={true}
              enableRotate={true}
              autoRotate={autoRotate}
              autoRotateSpeed={0.5}
              minDistance={2}
              maxDistance={10}
              target={[cameraSettings.target.x, cameraSettings.target.y, cameraSettings.target.z]}
            />
          )}
          
          {performanceSettings.shadows && (
            <ContactShadows 
              position={[0, -0.5, 0]} 
              opacity={0.4} 
              scale={3} 
              blur={2} 
              far={4} 
            />
          )}
          
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
} 