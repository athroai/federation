import { EventBusService } from '../eventBus';

// Define supported languages with their display information
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

// Define language type
export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// Define events for translation service
export const TRANSLATION_EVENTS = {
  LANGUAGE_CHANGED: 'language.changed',
  TRANSLATION_UPDATED: 'translation.updated',
  TRANSLATION_REQUESTED: 'translation.requested',
};

// Interface for translation configuration
export interface TranslationConfig {
  googleApiKey?: string;
  cacheExpiration?: number; // Time in milliseconds for cache entries to expire
  fallbackLanguage: SupportedLanguage;
}

// Interface for the cached translation entry
interface CachedTranslation {
  text: string;
  timestamp: number;
}

/**
 * TranslationService provides functionality to translate text across 
 * the Athro federation using Google Translate API.
 * It follows the federation architecture principles by using the EventBus
 * for cross-service communication.
 */
export class TranslationService {
  private static instance: TranslationService;
  private currentLanguage: SupportedLanguage = 'en';
  private translationCache: Map<string, CachedTranslation> = new Map();
  private config: TranslationConfig = {
    cacheExpiration: 24 * 60 * 60 * 1000, // 24 hours
    fallbackLanguage: 'en'
  };
  private eventBus: EventBusService;
  
  // Private constructor for singleton pattern
  private constructor(eventBus: EventBusService) {
    this.eventBus = eventBus;
    
    // Initialize from localStorage if available
    this.loadLanguagePreference();
    
    // Set up listener for changes from other services
    this.eventBus.on(TRANSLATION_EVENTS.LANGUAGE_CHANGED, (data: any) => {
      if (data && data.language && this.isValidLanguage(data.language)) {
        this.currentLanguage = data.language;
        this.notifyLanguageChanged(false); // Don't re-broadcast
      }
    });
    
    // Broadcast initial language to synchronize services
    setTimeout(() => {
      this.notifyLanguageChanged(true);
    }, 500);
  }
  
  // Get singleton instance
  public static getInstance(eventBus: EventBusService): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService(eventBus);
    }
    return TranslationService.instance;
  }
  
  // Set API key for Google Translate
  public setApiKey(apiKey: string): void {
    this.config.googleApiKey = apiKey;
  }
  
  // Validate language code
  private isValidLanguage(lang: string): lang is SupportedLanguage {
    return Object.keys(SUPPORTED_LANGUAGES).includes(lang);
  }
  
  // Load user's language preference from localStorage
  private loadLanguagePreference(): void {
    try {
      const savedLang = localStorage.getItem('preferredLanguage');
      if (savedLang && this.isValidLanguage(savedLang)) {
        this.currentLanguage = savedLang;
      } else {
        // Try to detect from browser
        const browserLang = navigator.language.split('-')[0];
        if (this.isValidLanguage(browserLang)) {
          this.currentLanguage = browserLang;
        }
      }
    } catch (e) {
      console.error('[Translation] Error loading language preference:', e);
    }
  }
  
  // Get current language code
  public getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }
  
  // Get current language details
  public getCurrentLanguageDetails() {
    return SUPPORTED_LANGUAGES[this.currentLanguage];
  }
  
  // Set language and notify all components
  public setLanguage(lang: SupportedLanguage): void {
    if (this.currentLanguage === lang) return;
    
    this.currentLanguage = lang;
    localStorage.setItem('preferredLanguage', lang);
    this.notifyLanguageChanged(true);
  }
  
  // Notify components about language change
  private notifyLanguageChanged(broadcast: boolean): void {
    const details = SUPPORTED_LANGUAGES[this.currentLanguage];
    
    // Emit language changed event through federation EventBus
    if (broadcast) {
      this.eventBus.emit(TRANSLATION_EVENTS.LANGUAGE_CHANGED, { 
        language: this.currentLanguage, 
        details,
        timestamp: Date.now()
      });
    }
    
    // Dispatch DOM event for non-React components
    const event = new CustomEvent('athroLanguageChanged', { 
      detail: { language: this.currentLanguage, details }
    });
    document.dispatchEvent(event);
    
    // Update document language for accessibility
    document.documentElement.lang = this.currentLanguage;
    
    // Update direction for RTL languages
    const isRTL = ['ar', 'ur'].includes(this.currentLanguage);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    
    console.log(`[Translation] Language changed to ${this.currentLanguage}`);
  }
  
  // Generate cache key for translations
  private getCacheKey(text: string, targetLang: SupportedLanguage): string {
    return `${text}|${targetLang}`;
  }
  
  // Check if translation is in cache and not expired
  private getFromCache(text: string, targetLang: SupportedLanguage): string | null {
    const key = this.getCacheKey(text, targetLang);
    const cached = this.translationCache.get(key);
    
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < (this.config.cacheExpiration || 0)) {
        return cached.text;
      } else {
        // Remove expired cache entry
        this.translationCache.delete(key);
      }
    }
    
    return null;
  }
  
  // Save translation to cache
  private saveToCache(text: string, translation: string, targetLang: SupportedLanguage): void {
    const key = this.getCacheKey(text, targetLang);
    this.translationCache.set(key, {
      text: translation,
      timestamp: Date.now()
    });
  }
  
  // Translate text using Google Translate API
  public async translateText(
    text: string, 
    targetLang: SupportedLanguage = this.currentLanguage, 
    sourceLang: SupportedLanguage = 'en'
  ): Promise<string> {
    // Skip translation if target language is the same as source
    if (targetLang === sourceLang) return text;
    
    // Check cache first
    const cached = this.getFromCache(text, targetLang);
    if (cached) return cached;
    
    // Make sure we have an API key
    if (!this.config.googleApiKey) {
      console.error('[Translation] Google API key not set. Please call setApiKey()');
      return text;
    }
    
    try {
      // In production, this would use the actual Google Translate API
      console.log(`[Translation] Translating to ${targetLang}: ${text.substring(0, 30)}...`);
      
      // Google Translate API call
      const url = `https://translation.googleapis.com/language/translate/v2?key=${this.config.googleApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          target: targetLang,
          source: sourceLang,
          format: 'text'
        })
      });
      
      // Parse response
      const data = await response.json();
      let translation = text;
      
      if (
        data && 
        data.data && 
        data.data.translations && 
        data.data.translations.length > 0
      ) {
        translation = data.data.translations[0].translatedText;
      } else {
        console.warn('[Translation] Empty or invalid response from Google API', data);
        // Fall back to mock translation for development
        translation = this.mockTranslate(text, targetLang);
      }
      
      // Save to cache
      this.saveToCache(text, translation, targetLang);
      
      // Broadcast that this text has been translated for other services
      this.eventBus.emit(TRANSLATION_EVENTS.TRANSLATION_UPDATED, {
        original: text,
        translation,
        language: targetLang,
        timestamp: Date.now()
      });
      
      return translation;
    } catch (error) {
      console.error('[Translation] Error translating text:', error);
      
      // Fall back to mock translation for development
      const mockTranslation = this.mockTranslate(text, targetLang);
      this.saveToCache(text, mockTranslation, targetLang);
      
      return mockTranslation;
    }
  }
  
  // Mock translation function for development - to be replaced with actual API
  private mockTranslate(text: string, targetLang: SupportedLanguage): string {
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
  }
  
  // Translate a component's text content
  public async translateComponent(
    componentId: string, 
    texts: Record<string, string>
  ): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    
    for (const [key, text] of Object.entries(texts)) {
      result[key] = await this.translateText(text);
    }
    
    return result;
  }
  
  // Translate chat message
  public async translateChatMessage(
    message: { content: string, role: string },
    targetLang: SupportedLanguage = this.currentLanguage
  ): Promise<{ content: string, role: string, originalContent?: string }> {
    // Skip translation for English or if already translated
    if (targetLang === 'en') {
      return message;
    }
    
    const translatedContent = await this.translateText(message.content, targetLang);
    
    return {
      ...message,
      originalContent: message.content,
      content: translatedContent
    };
  }
}

// Create a factory function to get the translation service
export const getTranslationService = (eventBus: EventBusService): TranslationService => {
  return TranslationService.getInstance(eventBus);
};
