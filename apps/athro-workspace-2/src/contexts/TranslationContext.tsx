import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// Import the supported languages
// Note: In a real implementation, we would use the shared-services package
// but for simplicity, we'll define the supported languages here
import eventBus, { EVENTS } from '../services/eventBus';

export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  cy: { name: 'Welsh', nativeName: 'Cymraeg', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  pl: { name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  uk: { name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  ur: { name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
};

// Define the language type
export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// Use standard events from the eventBus service
// This follows the federation principle of standardized event names

// Define the context type
interface TranslationContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  languages: typeof SUPPORTED_LANGUAGES;
  isRTL: boolean;
  t: (text: string) => string;
  translate: (text: string) => Promise<string>;
}

// Create the context with default values
const TranslationContext = createContext<TranslationContextType>({
  language: 'en',
  setLanguage: () => {},
  languages: SUPPORTED_LANGUAGES,
  isRTL: false,
  t: (text: string) => text,
  translate: async (text: string) => text
});

// Custom hook for using the translation context
export const useTranslation = () => useContext(TranslationContext);

// Props for the provider component
interface TranslationProviderProps {
  children: ReactNode;
}

// Translation Provider component
export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  // State for current language
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const savedLang = localStorage.getItem('preferredLanguage');
      if (savedLang && Object.keys(SUPPORTED_LANGUAGES).includes(savedLang)) {
        return savedLang as SupportedLanguage;
      }
    } catch (e) {
      console.error('[Translation] Error loading language preference:', e);
    }
    return 'en';
  });
  
  // Track if current language is RTL
  const [isRTL, setIsRTL] = useState<boolean>(
    ['ar', 'ur'].includes(language)
  );

  // Translation cache for synchronous translations
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});

  // Set language handler
  const setLanguage = (lang: SupportedLanguage) => {
    if (language === lang) return;
    
    // Save to localStorage
    localStorage.setItem('preferredLanguage', lang);
    
    // Update state
    setLanguageState(lang);
    setIsRTL(['ar', 'ur'].includes(lang));
    
    // Notify the federation
    eventBus.emit(EVENTS.LANGUAGE_CHANGED, { 
      language: lang, 
      details: SUPPORTED_LANGUAGES[lang],
      timestamp: Date.now()
    });
    
    // Update document properties
    document.documentElement.lang = lang;
    document.documentElement.dir = ['ar', 'ur'].includes(lang) ? 'rtl' : 'ltr';
    
    console.log(`[Translation] Language changed to ${lang}`);
  };

  // Mock translation service for development
  // In production, this would call the Google Translate API
  const mockTranslate = (text: string, targetLang: SupportedLanguage): string => {
    if (targetLang === 'en') return text;
    
    // Very simple mock translation to test the UI
    const prefixes: Record<SupportedLanguage, string> = {
      en: '',
      cy: '[CY] ',
      ar: '[AR] ',
      pl: '[PL] ',
      uk: '[UK] ',
      ur: '[UR] ',
      es: '[ES] ',
      fr: '[FR] ',
      de: '[DE] ',
    };
    
    return prefixes[targetLang] + text;
  };

  // Asynchronous translation function
  const translate = async (text: string): Promise<string> => {
    if (!text) return '';
    
    // Skip translation for English (source language)
    if (language === 'en') return text;
    
    try {
      // In a real implementation, this would call the Google Translate API
      const translated = mockTranslate(text, language);
      
      // Update cache for synchronous access
      setTranslationCache(prev => ({
        ...prev,
        [text]: translated
      }));
      
      return translated;
    } catch (error) {
      console.error('[TranslationContext] Translation error:', error);
      return text;
    }
  };

  // Synchronous translation function (uses cache or falls back to original text)
  const t = (text: string): string => {
    if (!text) return '';
    
    // Skip translation for English (source language)
    if (language === 'en') return text;
    
    // Return from cache if available
    return translationCache[text] || text;
  };

  // Listen for language changes from other services in the federation
  useEffect(() => {
    const handleLanguageChange = (data: any) => {
      if (data && data.language && Object.keys(SUPPORTED_LANGUAGES).includes(data.language)) {
        const newLang = data.language as SupportedLanguage;
        
        // Only update if it's different from current language
        if (newLang !== language) {
          setLanguageState(newLang);
          setIsRTL(['ar', 'ur'].includes(newLang));
          
          // Update document properties
          document.documentElement.lang = newLang;
          document.documentElement.dir = ['ar', 'ur'].includes(newLang) ? 'rtl' : 'ltr';
          
          console.log(`[Translation] Language updated from federation: ${newLang}`);
        }
      }
    };

    // Subscribe to language change events
    const unsubscribe = eventBus.on(EVENTS.LANGUAGE_CHANGED, handleLanguageChange);
    
    // Listen for DOM events as well (for non-React components)
    const handleDomEvent = (e: any) => {
      if (e.detail && e.detail.language) {
        const newLang = e.detail.language as SupportedLanguage;
        if (newLang !== language && Object.keys(SUPPORTED_LANGUAGES).includes(newLang)) {
          setLanguageState(newLang);
          setIsRTL(['ar', 'ur'].includes(newLang));
        }
      }
    };
    
    document.addEventListener('athroLanguageChanged', handleDomEvent);
    
    // Announce current language to the federation
    setTimeout(() => {
      eventBus.emit(EVENTS.LANGUAGE_CHANGED, { 
        language, 
        details: SUPPORTED_LANGUAGES[language],
        source: 'workspace',
        timestamp: Date.now()
      });
    }, 500);

    // Cleanup listeners
    return () => {
      unsubscribe();
      document.removeEventListener('athroLanguageChanged', handleDomEvent);
    };
  }, [language]);
  
  // Pre-translate common UI elements when language changes
  useEffect(() => {
    if (language === 'en') return;
    
    // Pre-translate common UI strings
    const commonStrings = [
      'Next', 'Back', 'Cancel', 'Submit', 'Save', 'Delete',
      'Select a date', 'Search', 'Menu', 'Close', 'Open',
      'Schedule', 'Priority', 'Settings', 'Profile', 'Logout',
      'Help', 'FAQ', 'Contact', 'About', 'Learn More',
      'Workspace', 'Dashboard', 'Calendar', 'Home'
    ];
    
    // Add these to the cache
    const translateCommon = async () => {
      for (const text of commonStrings) {
        try {
          const translated = mockTranslate(text, language);
          setTranslationCache(prev => ({
            ...prev,
            [text]: translated
          }));
        } catch (e) {
          console.error(`[TranslationContext] Error pre-translating: ${text}`, e);
        }
      }
    };
    
    translateCommon();
  }, [language]);

  // Context value
  const value: TranslationContextType = {
    language,
    setLanguage,
    languages: SUPPORTED_LANGUAGES,
    isRTL,
    t,
    translate
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export default TranslationContext;
