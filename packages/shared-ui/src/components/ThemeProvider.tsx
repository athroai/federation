import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { eventBus } from '@athro/shared-services';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
  initialMode?: ThemeMode;
}

/**
 * ThemeProvider ensures consistent theming across all federated applications
 * Implements "UI remains coherent regardless of source" principle
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  initialMode = 'system'
}) => {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  // Apply theme to document
  useEffect(() => {
    const applyTheme = (newMode: ThemeMode) => {
      // Determine actual mode if 'system'
      const effectiveMode = newMode === 'system' 
        ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        : newMode;
        
      // Apply to document
      document.documentElement.setAttribute('data-theme', effectiveMode);
      
      // Store in localStorage for persistence
      localStorage.setItem('athro-theme', newMode);
    };
    
    applyTheme(mode);
    
    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (mode === 'system') {
        applyTheme('system');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);
  
  // Sync theme changes across applications using event bus
  useEffect(() => {
    // Broadcast theme changes to other apps
    const broadcastThemeChange = (newMode: ThemeMode) => {
      eventBus.publish('ui.theme.changed', {
        mode: newMode,
        timestamp: new Date().toISOString()
      });
    };
    
    // Listen for theme changes from other apps
    const unsubscribe = eventBus.subscribe('ui.theme.changed', (data: { mode: ThemeMode }) => {
      if (data.mode !== mode) {
        setMode(data.mode);
      }
    });
    
    // Set up effect for broadcasting
    const originalSetMode = setMode;
    setMode = (newMode: ThemeMode) => {
      originalSetMode(newMode);
      broadcastThemeChange(newMode);
    };
    
    return () => unsubscribe();
  }, []);
  
  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
