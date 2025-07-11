import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Avatar3DModel {
  id: string;
  name: string;
  modelPath: string;
  textures: {
    skin?: string;
    hair?: string;
    clothing?: string;
    eyes?: string;
  };
  animations: string[];
  scale: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

export interface Avatar3DAppearance {
  skinColor: string;
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  clothingColor: string;
  clothingStyle: string;
  accessories: string[];
}

export interface CameraSettings {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
  near: number;
  far: number;
}

export interface LightingSettings {
  ambientLight: {
    color: string;
    intensity: number;
  };
  directionalLight: {
    color: string;
    intensity: number;
    position: { x: number; y: number; z: number };
  };
  pointLights: Array<{
    color: string;
    intensity: number;
    position: { x: number; y: number; z: number };
    distance: number;
  }>;
}

export interface ThreeScene {
  backgroundColor: string;
  fog?: {
    color: string;
    near: number;
    far: number;
  };
  environment?: string;
}

interface ThreeStore {
  // 3D Models
  avatar3DModels: Avatar3DModel[];
  selectedModel: string | null;
  setSelectedModel: (modelId: string) => void;
  
  // Appearance customization
  currentAppearance: Avatar3DAppearance;
  setAppearance: (appearance: Partial<Avatar3DAppearance>) => void;
  resetAppearance: () => void;
  
  // Camera settings
  cameraSettings: CameraSettings;
  setCameraSettings: (settings: Partial<CameraSettings>) => void;
  resetCamera: () => void;
  
  // Lighting
  lightingSettings: LightingSettings;
  setLightingSettings: (settings: Partial<LightingSettings>) => void;
  resetLighting: () => void;
  
  // Scene settings
  sceneSettings: ThreeScene;
  setSceneSettings: (settings: Partial<ThreeScene>) => void;
  
  // Animation control
  currentAnimation: string | null;
  animationSpeed: number;
  setCurrentAnimation: (animationName: string | null) => void;
  setAnimationSpeed: (speed: number) => void;
  
  // Rendering settings
  renderQuality: 'low' | 'medium' | 'high';
  enableShadows: boolean;
  enableAntialiasing: boolean;
  setRenderQuality: (quality: 'low' | 'medium' | 'high') => void;
  setEnableShadows: (enabled: boolean) => void;
  setEnableAntialiasing: (enabled: boolean) => void;
  
  // Workspace-specific 3D settings
  workspace3DSettings: Record<string, {
    selectedModel: string;
    appearance: Avatar3DAppearance;
    cameraSettings: CameraSettings;
  }>;
  setWorkspace3DSettings: (workspaceId: string, settings: any) => void;
  getWorkspace3DSettings: (workspaceId: string) => any;
  
  // Utilities
  getModelById: (modelId: string) => Avatar3DModel | null;
  exportSettings: () => string;
  importSettings: (settings: string) => void;
}

const defaultAppearance: Avatar3DAppearance = {
  skinColor: '#F4C2A1',
  hairColor: '#8B4513',
  hairStyle: 'short',
  eyeColor: '#4A90E2',
  clothingColor: '#2E5BBA',
  clothingStyle: 'casual',
  accessories: []
};

const defaultCameraSettings: CameraSettings = {
  position: { x: 0, y: 1.6, z: 3 },
  target: { x: 0, y: 1.6, z: 0 },
  fov: 50,
  near: 0.1,
  far: 1000
};

const defaultLightingSettings: LightingSettings = {
  ambientLight: {
    color: '#404040',
    intensity: 0.4
  },
  directionalLight: {
    color: '#ffffff',
    intensity: 1.0,
    position: { x: 5, y: 10, z: 5 }
  },
  pointLights: [
    {
      color: '#ffffff',
      intensity: 0.8,
      position: { x: -5, y: 5, z: 5 },
      distance: 20
    }
  ]
};

const defaultSceneSettings: ThreeScene = {
  backgroundColor: '#f0f0f0',
  fog: {
    color: '#f0f0f0',
    near: 10,
    far: 50
  }
};

const default3DModels: Avatar3DModel[] = [
  {
    id: 'alice-3d',
    name: 'Alice',
    modelPath: '/models/alice/alice.gltf',
    textures: {
      skin: '/textures/alice/skin.jpg',
      hair: '/textures/alice/hair.jpg',
      clothing: '/textures/alice/clothing.jpg',
      eyes: '/textures/alice/eyes.jpg'
    },
    animations: ['idle', 'wave', 'speak', 'think'],
    scale: 1.0,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    id: 'bob-3d',
    name: 'Bob',
    modelPath: '/models/bob/bob.gltf',
    textures: {
      skin: '/textures/bob/skin.jpg',
      hair: '/textures/bob/hair.jpg',
      clothing: '/textures/bob/clothing.jpg',
      eyes: '/textures/bob/eyes.jpg'
    },
    animations: ['idle', 'wave', 'speak', 'explain'],
    scale: 1.0,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  }
];

export const useThreeStore = create<ThreeStore>()(
  persist(
    (set, get) => ({
      // 3D Models
      avatar3DModels: default3DModels,
      selectedModel: 'alice-3d',
      
      setSelectedModel: (modelId: string) =>
        set({ selectedModel: modelId }),
      
      // Appearance
      currentAppearance: defaultAppearance,
      
      setAppearance: (appearance: Partial<Avatar3DAppearance>) =>
        set((state) => ({
          currentAppearance: { ...state.currentAppearance, ...appearance }
        })),
      
      resetAppearance: () =>
        set({ currentAppearance: defaultAppearance }),
      
      // Camera
      cameraSettings: defaultCameraSettings,
      
      setCameraSettings: (settings: Partial<CameraSettings>) =>
        set((state) => ({
          cameraSettings: { ...state.cameraSettings, ...settings }
        })),
      
      resetCamera: () =>
        set({ cameraSettings: defaultCameraSettings }),
      
      // Lighting
      lightingSettings: defaultLightingSettings,
      
      setLightingSettings: (settings: Partial<LightingSettings>) =>
        set((state) => ({
          lightingSettings: { ...state.lightingSettings, ...settings }
        })),
      
      resetLighting: () =>
        set({ lightingSettings: defaultLightingSettings }),
      
      // Scene
      sceneSettings: defaultSceneSettings,
      
      setSceneSettings: (settings: Partial<ThreeScene>) =>
        set((state) => ({
          sceneSettings: { ...state.sceneSettings, ...settings }
        })),
      
      // Animation
      currentAnimation: 'idle',
      animationSpeed: 1.0,
      
      setCurrentAnimation: (animationName: string | null) =>
        set({ currentAnimation: animationName }),
      
      setAnimationSpeed: (speed: number) =>
        set({ animationSpeed: Math.max(0.1, Math.min(3.0, speed)) }),
      
      // Rendering
      renderQuality: 'medium',
      enableShadows: true,
      enableAntialiasing: true,
      
      setRenderQuality: (quality: 'low' | 'medium' | 'high') =>
        set({ renderQuality: quality }),
      
      setEnableShadows: (enabled: boolean) =>
        set({ enableShadows: enabled }),
      
      setEnableAntialiasing: (enabled: boolean) =>
        set({ enableAntialiasing: enabled }),
      
      // Workspace settings
      workspace3DSettings: {},
      
      setWorkspace3DSettings: (workspaceId: string, settings: any) =>
        set((state) => ({
          workspace3DSettings: {
            ...state.workspace3DSettings,
            [workspaceId]: settings
          }
        })),
      
      getWorkspace3DSettings: (workspaceId: string) => {
        return get().workspace3DSettings[workspaceId] || null;
      },
      
      // Utilities
      getModelById: (modelId: string) => {
        const state = get();
        return state.avatar3DModels.find(model => model.id === modelId) || null;
      },
      
      exportSettings: () => {
        const state = get();
        return JSON.stringify({
          selectedModel: state.selectedModel,
          currentAppearance: state.currentAppearance,
          cameraSettings: state.cameraSettings,
          lightingSettings: state.lightingSettings,
          sceneSettings: state.sceneSettings,
          renderQuality: state.renderQuality,
          enableShadows: state.enableShadows,
          enableAntialiasing: state.enableAntialiasing
        });
      },
      
      importSettings: (settings: string) => {
        try {
          const parsed = JSON.parse(settings);
          set((state) => ({
            ...state,
            ...parsed
          }));
        } catch (error) {
          console.error('Failed to import 3D settings:', error);
        }
      }
    }),
    {
      name: "three-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        currentAppearance: state.currentAppearance,
        cameraSettings: state.cameraSettings,
        lightingSettings: state.lightingSettings,
        sceneSettings: state.sceneSettings,
        currentAnimation: state.currentAnimation,
        animationSpeed: state.animationSpeed,
        renderQuality: state.renderQuality,
        enableShadows: state.enableShadows,
        enableAntialiasing: state.enableAntialiasing,
        workspace3DSettings: state.workspace3DSettings,
      }),
      version: 1,
    }
  )
);
