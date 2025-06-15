import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark';

interface CustomColors {
  primary: string;
  secondary: string;
  error: string;
  warning: string;
  info: string;
  success: string;
  background: string;
  paper: string;
}

interface ThemeCustomization {
  colors: {
    light: CustomColors;
    dark: CustomColors;
  };
  typography: {
    fontFamily: string;
    fontSize: number;
  };
  borderRadius: number;
  spacing: number;
}

interface ThemeState {
  mode: ThemeMode;
  customization: ThemeCustomization;
  isCustomThemeEnabled: boolean;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  updateCustomization: (customization: Partial<ThemeCustomization>) => void;
  setCustomThemeEnabled: (enabled: boolean) => void;
  resetToDefaults: () => void;
}

const defaultCustomization: ThemeCustomization = {
  colors: {
    light: {
      primary: '#4f5bd5',
      secondary: '#009688',
      error: '#d32f2f',
      warning: '#ed6c02',
      info: '#0288d1',
      success: '#2e7d32',
      background: '#f8f9fc',
      paper: '#ffffff',
    },
    dark: {
      primary: '#4f5bd5',
      secondary: '#009688',
      error: '#f44336',
      warning: '#ff9800',
      info: '#29b6f6',
      success: '#66bb6a',
      background: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: 'Inter',
    fontSize: 14,
  },
  borderRadius: 8,
  spacing: 8,
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      customization: defaultCustomization,
      isCustomThemeEnabled: false,
      toggleMode: () => set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),
      setMode: (mode) => set({ mode }),
      updateCustomization: (newCustomization) => 
        set((state) => ({
          customization: {
            ...state.customization,
            ...newCustomization,
            colors: {
              ...state.customization.colors,
              ...newCustomization.colors,
            },
            typography: {
              ...state.customization.typography,
              ...newCustomization.typography,
            },
          },
        })),
      setCustomThemeEnabled: (enabled) => set({ isCustomThemeEnabled: enabled }),
      resetToDefaults: () => set({ 
        customization: defaultCustomization,
        isCustomThemeEnabled: false,
      }),
    }),
    {
      name: 'theme-storage',
    }
  )
);