import { ReactNode, useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useThemeStore } from '../stores/Theme/ThemeStore';

interface ThemeContextProviderProps {
  children: ReactNode;
}

export function ThemeContextProvider({ children }: ThemeContextProviderProps) {
  const { mode } = useThemeStore();

  const theme = useMemo(() =>
    createTheme({
      palette: {
        mode,
        primary: {
          // More accessible indigo with better contrast
          main: '#4f5bd5',
          light: '#7986cb',
          dark: '#3949ab',
          contrastText: '#ffffff',
        },
        secondary: {
          // Optimized teal for better harmony with primary
          main: '#009688',
          light: '#4db6ac',
          dark: '#00796b',
          contrastText: '#ffffff',
        },
        error: {
          main: mode === 'light' ? '#d32f2f' : '#f44336',
          light: mode === 'light' ? '#ef5350' : '#e57373',
          dark: mode === 'light' ? '#c62828' : '#d32f2f',
        },
        warning: {
          main: mode === 'light' ? '#ed6c02' : '#ff9800',
          light: mode === 'light' ? '#ff9800' : '#ffb74d',
          dark: mode === 'light' ? '#e65100' : '#f57c00',
        },
        info: {
          main: mode === 'light' ? '#0288d1' : '#29b6f6',
          light: mode === 'light' ? '#03a9f4' : '#4fc3f7',
          dark: mode === 'light' ? '#01579b' : '#0277bd',
        },
        success: {
          main: mode === 'light' ? '#2e7d32' : '#66bb6a',
          light: mode === 'light' ? '#4caf50' : '#81c784',
          dark: mode === 'light' ? '#1b5e20' : '#388e3c',
        },
        background: {
          // Softer backgrounds to reduce eye strain
          default: mode === 'light' ? '#f8f9fc' : '#121212',
          paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
        },
        text: {
          // Improved text contrast for better readability
          primary: mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.95)',
          secondary: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)',
          disabled: mode === 'light' ? 'rgba(0, 0, 0, 0.38)' : 'rgba(255, 255, 255, 0.45)',
        },
        divider: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
        action: {
          active: mode === 'light' ? 'rgba(0, 0, 0, 0.54)' : 'rgba(255, 255, 255, 0.7)',
          hover: mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.1)',
          selected: mode === 'light' ? 'rgba(79, 91, 213, 0.12)' : 'rgba(79, 91, 213, 0.2)',
          disabled: mode === 'light' ? 'rgba(0, 0, 0, 0.26)' : 'rgba(255, 255, 255, 0.3)',
          disabledBackground: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.08)',
        },
      },
      typography: {
        fontFamily: [
          'Inter',
          'Source Sans Pro',
          'Roboto',
          'Noto Serif HK',
          'Space Mono',
          'Space Grotesk',
          'Arial',
          'sans-serif',
        ].join(','),
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              textTransform: 'none',
              fontWeight: 500,
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              backgroundImage: 'none',
            },
          },
        },
        MuiSwitch: {
          styleOverrides: {
            root: {
              width: 42,
              height: 26,
              padding: 0,
              '& .MuiSwitch-switchBase': {
                padding: 0,
                margin: 2,
                transitionDuration: '300ms',
                '&.Mui-checked': {
                  transform: 'translateX(16px)',
                  color: '#fff',
                  '& + .MuiSwitch-track': {
                    backgroundColor: mode === 'light' ? '#4f5bd5' : '#4f5bd5',
                    opacity: 1,
                    border: 0,
                  },
                },
              },
              '& .MuiSwitch-thumb': {
                boxSizing: 'border-box',
                width: 22,
                height: 22,
              },
              '& .MuiSwitch-track': {
                borderRadius: 26 / 2,
                backgroundColor: mode === 'light' ? '#E9E9EA' : '#39393D',
                opacity: 1,
              },
            },
          },
        },
      },
    }), [mode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

// Export the useThemeStore hook for convenience
export { useThemeStore } from '../stores/Theme/ThemeStore';
