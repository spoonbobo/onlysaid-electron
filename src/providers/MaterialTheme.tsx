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
          // Indigo shades - more vibrant and modern
          main: '#5c6bc0',      // Same for both modes for consistency
          light: '#8e99f3',
          dark: '#26418f',
          contrastText: '#ffffff',
        },
        secondary: {
          // Teal shades - balanced complementary color
          main: '#26a69a',      // Same for both modes for consistency
          light: '#64d8cb',
          dark: '#00766c',
          contrastText: '#ffffff',
        },
        error: {
          main: mode === 'light' ? '#f44336' : '#ef5350',
          light: mode === 'light' ? '#e57373' : '#ff8a80',
          dark: mode === 'light' ? '#d32f2f' : '#c62828',
        },
        warning: {
          main: mode === 'light' ? '#ff9800' : '#ffa726',
          light: mode === 'light' ? '#ffb74d' : '#ffcc80',
          dark: mode === 'light' ? '#f57c00' : '#ef6c00',
        },
        info: {
          main: mode === 'light' ? '#2196f3' : '#29b6f6',
          light: mode === 'light' ? '#64b5f6' : '#81d4fa',
          dark: mode === 'light' ? '#1976d2' : '#0288d1',
        },
        success: {
          main: mode === 'light' ? '#4caf50' : '#66bb6a',
          light: mode === 'light' ? '#81c784' : '#a5d6a7',
          dark: mode === 'light' ? '#388e3c' : '#2e7d32',
        },
        background: {
          default: mode === 'light' ? '#f8f9fa' : '#121212',
          paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
        },
        text: {
          primary: mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)',
          secondary: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)',
          disabled: mode === 'light' ? 'rgba(0, 0, 0, 0.38)' : 'rgba(255, 255, 255, 0.38)',
        },
        divider: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
        action: {
          active: mode === 'light' ? 'rgba(0, 0, 0, 0.54)' : 'rgba(255, 255, 255, 0.7)',
          hover: mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
          selected: mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.16)',
          disabled: mode === 'light' ? 'rgba(0, 0, 0, 0.26)' : 'rgba(255, 255, 255, 0.3)',
          disabledBackground: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
        },
      },
      typography: {
        fontFamily: [
          'Poppins',
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
                    backgroundColor: '#5c6bc0',
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
