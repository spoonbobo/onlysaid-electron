import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useThreeStore } from '@/renderer/stores/Avatar/ThreeStore';

interface Avatar3DProps {
  width?: number;
  height?: number;
  enableControls?: boolean;
  autoRotate?: boolean;
}

// Avatar Model Component
function AvatarModel({ autoRotate = false }: { autoRotate?: boolean }) {
  const meshRef = useRef<THREE.Group>(null);
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
      // Only rotate if autoRotate is enabled
      if (autoRotate) {
        meshRef.current.rotation.y += delta * 0.5 * animationSpeed;
      }
      
      // Add some idle animation (but reset rotation first if not auto-rotating)
      if (!autoRotate) {
        // Keep the avatar facing forward when not auto-rotating
        meshRef.current.rotation.y = 0;
      }
      
      if (currentAnimation === 'idle') {
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
      } else if (currentAnimation === 'wave') {
        meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.1;
      } else {
        // Reset position and Z rotation when no animation
        meshRef.current.position.y = 0;
        meshRef.current.rotation.z = 0;
      }
    }
  });

  return (
    <group ref={meshRef}>
      {/* Head - More oval shaped */}
      <mesh position={[0, 1.65, 0]}>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor} 
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* Eyes - More realistic positioning */}
      <mesh position={[-0.08, 1.7, 0.22]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0.08, 1.7, 0.22]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      
      {/* Pupils */}
      <mesh position={[-0.08, 1.7, 0.25]}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial color={currentAppearance.eyeColor} />
      </mesh>
      <mesh position={[0.08, 1.7, 0.25]}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial color={currentAppearance.eyeColor} />
      </mesh>
      
      {/* Eyebrows */}
      <mesh position={[-0.08, 1.78, 0.18]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.08, 0.02, 0.02]} />
        <meshStandardMaterial color={currentAppearance.hairColor} />
      </mesh>
      <mesh position={[0.08, 1.78, 0.18]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.08, 0.02, 0.02]} />
        <meshStandardMaterial color={currentAppearance.hairColor} />
      </mesh>
      
      {/* Nose */}
      <mesh position={[0, 1.65, 0.25]}>
        <coneGeometry args={[0.03, 0.08, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor} 
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* Mouth */}
      <mesh position={[0, 1.55, 0.22]}>
        <sphereGeometry args={[0.06, 16, 8, 0, Math.PI]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Hair - More realistic shape */}
      <mesh position={[0, 1.8, -0.05]}>
        <sphereGeometry args={[0.32, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.8]} />
        <meshStandardMaterial 
          color={currentAppearance.hairColor}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      {/* Neck */}
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.25, 16]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* Torso - More human proportions */}
      <mesh position={[0, 0.85, 0]}>
        <capsuleGeometry args={[0.25, 0.6, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.clothingColor}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
      
      {/* Shoulders */}
      <mesh position={[-0.35, 1.1, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial 
          color={currentAppearance.clothingColor}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[0.35, 1.1, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial 
          color={currentAppearance.clothingColor}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
      
      {/* Upper Arms */}
      <mesh position={[-0.35, 0.85, 0]}>
        <capsuleGeometry args={[0.08, 0.35, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0.35, 0.85, 0]}>
        <capsuleGeometry args={[0.08, 0.35, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* Lower Arms */}
      <mesh position={[-0.35, 0.45, 0]}>
        <capsuleGeometry args={[0.07, 0.3, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0.35, 0.45, 0]}>
        <capsuleGeometry args={[0.07, 0.3, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* Hands */}
      <mesh position={[-0.35, 0.25, 0]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0.35, 0.25, 0]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* Hips */}
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.22, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
        <meshStandardMaterial 
          color={currentAppearance.clothingColor}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
      
      {/* Upper Legs */}
      <mesh position={[-0.12, 0.05, 0]}>
        <capsuleGeometry args={[0.1, 0.5, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.clothingColor}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[0.12, 0.05, 0]}>
        <capsuleGeometry args={[0.1, 0.5, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.clothingColor}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
      
      {/* Lower Legs */}
      <mesh position={[-0.12, -0.35, 0]}>
        <capsuleGeometry args={[0.08, 0.4, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0.12, -0.35, 0]}>
        <capsuleGeometry args={[0.08, 0.4, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* Feet */}
      <mesh position={[-0.12, -0.65, 0.05]}>
        <boxGeometry args={[0.12, 0.08, 0.25]} />
        <meshStandardMaterial color="#2E2E2E" />
      </mesh>
      <mesh position={[0.12, -0.65, 0.05]}>
        <boxGeometry args={[0.12, 0.08, 0.25]} />
        <meshStandardMaterial color="#2E2E2E" />
      </mesh>
    </group>
  );
}

// Lighting Setup
function Lighting() {22222
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

// Background Component
function BackgroundComponent() {
  const { sceneSettings } = useThreeStore();
  
  // Create gradient texture
  const createGradientTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    if (ctx && sceneSettings.gradientColors) {
      const gradient = ctx.createLinearGradient(
        sceneSettings.gradientColors.direction === 'horizontal' ? 0 : 
        sceneSettings.gradientColors.direction === 'diagonal' ? 0 : 256,
        sceneSettings.gradientColors.direction === 'vertical' ? 0 : 
        sceneSettings.gradientColors.direction === 'diagonal' ? 0 : 256,
        sceneSettings.gradientColors.direction === 'horizontal' ? 512 : 
        sceneSettings.gradientColors.direction === 'diagonal' ? 512 : 256,
        sceneSettings.gradientColors.direction === 'vertical' ? 512 : 
        sceneSettings.gradientColors.direction === 'diagonal' ? 512 : 256
      );
      
      gradient.addColorStop(0, sceneSettings.gradientColors.start);
      gradient.addColorStop(1, sceneSettings.gradientColors.end);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  if (sceneSettings.backgroundType === 'gradient' && sceneSettings.gradientColors) {
    const gradientTexture = createGradientTexture();
    
    return (
      <mesh scale={[100, 100, 1]} position={[0, 0, -50]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={gradientTexture} side={THREE.BackSide} />
      </mesh>
    );
  }

  if (sceneSettings.backgroundType === 'environment') {
    return <Environment preset={sceneSettings.environmentPreset || 'city'} background />;
  }

  // For solid color, we'll use the Canvas style background
  return null;
}

// Grid Component
function GridComponent() {
  const { sceneSettings } = useThreeStore();
  
  if (!sceneSettings.grid?.enabled) return null;
  
  return (
    <Grid
      args={[sceneSettings.grid.size, sceneSettings.grid.divisions]}
      position={[0, -0.7, 0]}
      cellColor={sceneSettings.grid.color}
      sectionColor={sceneSettings.grid.color}
      fadeDistance={30}
      fadeStrength={1}
    />
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

  // Determine background style for Canvas
  const getCanvasBackground = () => {
    if (sceneSettings.backgroundType === 'solid') {
      return sceneSettings.backgroundColor;
    }
    // For gradient and environment, we handle them inside the Canvas
    return 'transparent';
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
        style={{ background: getCanvasBackground() }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Lighting />
          
          {sceneSettings.fog && (
            <fog 
              attach="fog" 
              args={[sceneSettings.fog.color, sceneSettings.fog.near, sceneSettings.fog.far]} 
            />
          )}
          
          <BackgroundComponent />
          <GridComponent />
          
          <AvatarModel autoRotate={autoRotate} />
          
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
          
          {sceneSettings.backgroundType !== 'environment' && (
            <Environment preset={sceneSettings.environmentPreset || 'city'} />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
} 