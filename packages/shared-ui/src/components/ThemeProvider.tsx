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
  
  // Broadcast theme changes to other apps
  const broadcastThemeChange = (newMode: ThemeMode) => {
    eventBus.publish('ui.theme.changed', {
      mode: newMode,
      timestamp: new Date().toISOString()
    });
  };
  
  // Enhanced setMode that broadcasts changes
  const enhancedSetMode = (newMode: ThemeMode) => {
    setMode(newMode);
    broadcastThemeChange(newMode);
  };

  // Sync theme changes across applications using event bus
  useEffect(() => {
    // Listen for theme changes from other apps
    const unsubscribe = eventBus.subscribe('ui.theme.changed', (payload: any) => {
      const data = payload.payload || payload;
      if (data.mode !== mode) {
        setMode(data.mode);
      }
    });
    
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [mode]);
  
  return (
    <ThemeContext.Provider value={{ mode, setMode: enhancedSetMode }}>
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
