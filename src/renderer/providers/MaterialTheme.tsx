import { ReactNode, useMemo, useCallback } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Theme } from '@mui/material';
import { useThemeStore } from '@/renderer/stores/Theme/ThemeStore';

interface ThemeContextProviderProps {
  children: ReactNode;
}

// Cache themes to avoid recreation
const themeCache = new Map<string, Theme>();

// Memoized theme creation function
const createOptimizedTheme = (
  mode: 'light' | 'dark',
  customization: any,
  isCustomThemeEnabled: boolean
) => {
  // Create cache key from theme parameters
  const cacheKey = JSON.stringify({ mode, customization, isCustomThemeEnabled });
  
  if (themeCache.has(cacheKey)) {
    return themeCache.get(cacheKey)!;
  }

  const currentColors = isCustomThemeEnabled 
    ? customization.colors[mode]
    : customization.colors[mode];

  // Pre-calculate font family string
  const fontFamily = isCustomThemeEnabled 
    ? [customization.typography.fontFamily, 'Arial', 'sans-serif'].join(',')
    : 'Inter, "Source Sans Pro", Roboto, "Noto Serif HK", "Space Mono", "Space Grotesk", Arial, sans-serif';

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: currentColors.primary,
        // Remove redundant light/dark calculations - let MUI handle them
        contrastText: '#ffffff',
      },
      secondary: {
        main: currentColors.secondary,
        contrastText: '#ffffff',
      },
      error: { main: currentColors.error },
      warning: { main: currentColors.warning },
      info: { main: currentColors.info },
      success: { main: currentColors.success },
      background: {
        default: currentColors.background,
        paper: currentColors.paper,
      },
      // Let MUI calculate text colors automatically
    },
    typography: {
      fontFamily,
      fontSize: isCustomThemeEnabled ? customization.typography.fontSize : 14,
    },
    spacing: isCustomThemeEnabled ? customization.spacing : 8,
    components: {
      // Optimize component overrides
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: isCustomThemeEnabled ? customization.borderRadius : 8,
            textTransform: 'none',
            fontWeight: 500,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: isCustomThemeEnabled ? customization.borderRadius : 8,
            backgroundImage: 'none',
          },
        },
      },
      // Optimize switch component with CSS variables
      MuiSwitch: {
        styleOverrides: {
          root: {
            '--switch-width': '42px',
            '--switch-height': '26px',
            '--thumb-size': '22px',
            width: 'var(--switch-width)',
            height: 'var(--switch-height)',
            padding: 0,
            '& .MuiSwitch-switchBase': {
              padding: 0,
              margin: 2,
              transitionDuration: '300ms',
              '&.Mui-checked': {
                transform: 'translateX(16px)',
                color: '#fff',
                '& + .MuiSwitch-track': {
                  backgroundColor: currentColors.primary,
                  opacity: 1,
                  border: 0,
                },
              },
            },
            '& .MuiSwitch-thumb': {
              boxSizing: 'border-box',
              width: 'var(--thumb-size)',
              height: 'var(--thumb-size)',
            },
            '& .MuiSwitch-track': {
              borderRadius: 'calc(var(--switch-height) / 2)',
              backgroundColor: mode === 'light' ? '#E9E9EA' : '#39393D',
              opacity: 1,
            },
          },
        },
      },
    },
  });

  // Cache the theme
  themeCache.set(cacheKey, theme);
  
  // Limit cache size to prevent memory leaks
  if (themeCache.size > 10) {
    const [firstKey] = themeCache.keys();
    themeCache.delete(firstKey);
  }

  return theme;
};

export function ThemeContextProvider({ children }: ThemeContextProviderProps) {
  const { mode, customization, isCustomThemeEnabled } = useThemeStore();

  const theme = useMemo(() => 
    createOptimizedTheme(mode, customization, isCustomThemeEnabled),
    [mode, customization, isCustomThemeEnabled]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

// Export the useThemeStore hook for convenience
export { useThemeStore } from '@/renderer/stores/Theme/ThemeStore';
