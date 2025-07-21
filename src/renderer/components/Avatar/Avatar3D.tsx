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
    selectedModel,
    getModelById 
  } = useThreeStore();

  const currentModel = getModelById(selectedModel || 'alice-3d');

  // Keep avatar static - no animations
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y = 0;
      meshRef.current.position.y = 0;
      meshRef.current.rotation.z = 0;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Head - Anime style (larger, rounder) */}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor} 
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      
      {/* Large anime eyes - Left eye */}
      <mesh position={[-0.08, 1.75, 0.28]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="white" roughness={0.1} />
      </mesh>
      <mesh position={[0.08, 1.75, 0.28]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="white" roughness={0.1} />
      </mesh>
      
      {/* Large anime pupils */}
      <mesh position={[-0.08, 1.75, 0.35]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshStandardMaterial color={currentAppearance.eyeColor} />
      </mesh>
      <mesh position={[0.08, 1.75, 0.35]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshStandardMaterial color={currentAppearance.eyeColor} />
      </mesh>
      
      {/* Eye highlights (anime sparkle) */}
      <mesh position={[-0.06, 1.78, 0.36]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.1, 1.78, 0.36]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.3} />
      </mesh>
      
      {/* Smaller secondary highlights */}
      <mesh position={[-0.09, 1.72, 0.36]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.07, 1.72, 0.36]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Anime-style eyebrows (thinner, more arched) */}
      <mesh position={[-0.08, 1.85, 0.25]} rotation={[0, 0, -0.15]}>
        <capsuleGeometry args={[0.008, 0.08, 4, 8]} />
        <meshStandardMaterial color={currentAppearance.hairColor} />
      </mesh>
      <mesh position={[0.08, 1.85, 0.25]} rotation={[0, 0, 0.15]}>
        <capsuleGeometry args={[0.008, 0.08, 4, 8]} />
        <meshStandardMaterial color={currentAppearance.hairColor} />
      </mesh>
      
      {/* Small anime nose (just a tiny dot) */}
      <mesh position={[0, 1.68, 0.31]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor} 
          roughness={0.4}
        />
      </mesh>
      
      {/* Small anime mouth */}
      <mesh position={[0, 1.58, 0.3]}>
        <sphereGeometry args={[0.025, 16, 8, 0, Math.PI]} />
        <meshStandardMaterial color="#FF6B9D" roughness={0.2} />
      </mesh>
      
      {/* Anime blush marks */}
      <mesh position={[-0.2, 1.65, 0.25]}>
        <sphereGeometry args={[0.03, 16, 8]} />
        <meshStandardMaterial color="#FFB6C1" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0.2, 1.65, 0.25]}>
        <sphereGeometry args={[0.03, 16, 8]} />
        <meshStandardMaterial color="#FFB6C1" transparent opacity={0.6} />
      </mesh>
      
      {/* Anime hair - more voluminous and stylized */}
      <mesh position={[0, 1.9, -0.1]}>
        <sphereGeometry args={[0.35, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
        <meshStandardMaterial 
          color={currentAppearance.hairColor}
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>
      
      {/* Hair bangs */}
      <mesh position={[0, 1.95, 0.15]}>
        <sphereGeometry args={[0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.4]} />
        <meshStandardMaterial 
          color={currentAppearance.hairColor}
          roughness={0.8}
        />
      </mesh>
      
      {/* Side hair strands */}
      <mesh position={[-0.25, 1.8, 0.1]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[0.08, 0.3, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.hairColor}
          roughness={0.8}
        />
      </mesh>
      <mesh position={[0.25, 1.8, 0.1]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.08, 0.3, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.hairColor}
          roughness={0.8}
        />
      </mesh>
      
      {/* Neck - slimmer for anime style */}
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.18, 16]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor}
          roughness={0.3}
        />
      </mesh>
      
      {/* Torso - more stylized, smaller waist */}
      <mesh position={[0, 0.95, 0]}>
        <capsuleGeometry args={[0.18, 0.5, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.clothingColor}
          roughness={0.6}
        />
      </mesh>
      
      {/* Anime-style clothing details */}
      <mesh position={[0, 1.1, 0.19]}>
        <boxGeometry args={[0.3, 0.25, 0.02]} />
        <meshStandardMaterial 
          color={currentAppearance.clothingColor}
          roughness={0.5}
        />
      </mesh>
      
      {/* Arms - slimmer anime proportions */}
      <mesh position={[-0.25, 1.05, 0]}>
        <capsuleGeometry args={[0.045, 0.22, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.clothingColor}
          roughness={0.6}
        />
      </mesh>
      <mesh position={[0.25, 1.05, 0]}>
        <capsuleGeometry args={[0.045, 0.22, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.clothingColor}
          roughness={0.6}
        />
      </mesh>
      
      {/* Forearms */}
      <mesh position={[-0.25, 0.75, 0]}>
        <capsuleGeometry args={[0.04, 0.2, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0.25, 0.75, 0]}>
        <capsuleGeometry args={[0.04, 0.2, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor}
          roughness={0.3}
        />
      </mesh>
      
      {/* Hands - smaller, more delicate */}
      <mesh position={[-0.25, 0.6, 0]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0.25, 0.6, 0]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor}
          roughness={0.3}
        />
      </mesh>
      
      {/* Waist - very slim anime waist */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.12, 16]} />
        <meshStandardMaterial 
          color={currentAppearance.clothingColor}
          roughness={0.6}
        />
      </mesh>
      
      {/* Legs - anime proportions */}
      <mesh position={[-0.07, 0.3, 0]}>
        <capsuleGeometry args={[0.06, 0.35, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.clothingColor}
          roughness={0.6}
        />
      </mesh>
      <mesh position={[0.07, 0.3, 0]}>
        <capsuleGeometry args={[0.06, 0.35, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.clothingColor}
          roughness={0.6}
        />
      </mesh>
      
      {/* Lower legs - slim */}
      <mesh position={[-0.07, -0.05, 0]}>
        <capsuleGeometry args={[0.05, 0.3, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0.07, -0.05, 0]}>
        <capsuleGeometry args={[0.05, 0.3, 4, 8]} />
        <meshStandardMaterial 
          color={currentAppearance.skinColor}
          roughness={0.3}
        />
      </mesh>
      
      {/* Anime-style shoes - cuter, rounder */}
      <mesh position={[-0.07, -0.28, 0.06]}>
        <sphereGeometry args={[0.08, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial color="#FF69B4" roughness={0.4} />
      </mesh>
      <mesh position={[0.07, -0.28, 0.06]}>
        <sphereGeometry args={[0.08, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial color="#FF69B4" roughness={0.4} />
      </mesh>
      
      {/* Shoe straps */}
      <mesh position={[-0.07, -0.22, 0.1]}>
        <boxGeometry args={[0.1, 0.02, 0.02]} />
        <meshStandardMaterial color="#FF1493" />
      </mesh>
      <mesh position={[0.07, -0.22, 0.1]}>
        <boxGeometry args={[0.1, 0.02, 0.02]} />
        <meshStandardMaterial color="#FF1493" />
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