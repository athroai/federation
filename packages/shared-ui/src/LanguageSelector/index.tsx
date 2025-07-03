import React, { useState, useRef, useEffect } from 'react';

// Since we can't directly import from shared-services (would violate the "ONLY THROUGH THE GATE" principle),
// we'll define these types here and expect them to be passed in
export interface LanguageDetails {
  name: string;
  nativeName: string;
  flag: string;
}

export type SupportedLanguageCode = string;

// Styles for the language selector
const styles = {
  container: {
    position: 'relative' as const,
    display: 'inline-block',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '4px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
    color: 'var(--text-primary, #333)',
    transition: 'background-color 0.2s',
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    width: '220px',
    maxHeight: '300px',
    overflowY: 'auto' as const,
    backgroundColor: 'var(--bg-card, white)',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    padding: '8px 0',
  },
  languageItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  activeLanguage: {
    backgroundColor: 'var(--bg-selected, rgba(25, 118, 210, 0.08))',
  },
  flag: {
    marginRight: '8px',
    fontSize: '18px',
  },
  languageInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  languageName: {
    fontSize: '14px',
    fontWeight: '500' as const,
  },
  nativeName: {
    fontSize: '12px',
    color: 'var(--text-secondary, #666)',
  }
};

// Props for the component
interface LanguageSelectorProps {
  className?: string;
  buttonStyle?: React.CSSProperties;
  dropdownStyle?: React.CSSProperties;
  showNativeNames?: boolean;
  currentLanguage: SupportedLanguageCode;
  languages: Record<SupportedLanguageCode, LanguageDetails>;
  onLanguageChange: (lang: SupportedLanguageCode) => void;
  translateLabel?: (text: string) => string;
  isRTL?: boolean;
}

/**
 * LanguageSelector - A shared UI component for selecting languages
 * 
 * This component can be used across all federation apps to provide
 * a consistent language selection experience.
 * 
 * Following federation architecture principles:
 * - Component is UI-only with no business logic
 * - All state and event handling is delegated to the parent
 * - No direct dependencies on services from other packages
 */
const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className,
  buttonStyle,
  dropdownStyle,
  showNativeNames = true,
  currentLanguage,
  languages,
  onLanguageChange,
  translateLabel = (text) => text, // Default implementation if no translation function provided
  isRTL = false,
}) => {
  // State to track if dropdown is open
  const [isOpen, setIsOpen] = useState(false);
  
  // Ref for dropdown container
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Handle language selection
  const handleSelectLanguage = (lang: SupportedLanguageCode) => {
    onLanguageChange(lang);
    setIsOpen(false);
  };
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Current language details
  const currentLanguageDetails = languages[currentLanguage];
  
  if (!currentLanguageDetails) {
    console.error(`Language ${currentLanguage} not found in provided languages`);
    return null;
  }
  
  return (
    <div 
      ref={dropdownRef}
      className={className} 
      style={{
        ...styles.container,
        direction: isRTL ? 'rtl' : 'ltr'
      }}
      data-testid="language-selector"
    >
      {/* Language selector button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ ...styles.button, ...buttonStyle }}
        aria-label={translateLabel('Select language')}
        aria-expanded={isOpen}
        data-testid="language-selector-button"
      >
        <span>{currentLanguageDetails.flag}</span>
        <span>{currentLanguageDetails.name}</span>
        <span>▼</span>
      </button>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div 
          style={{ 
            ...styles.dropdown, 
            ...dropdownStyle,
            left: isRTL ? 0 : 'auto',
            right: isRTL ? 'auto' : 0
          }}
          data-testid="language-dropdown"
        >
          {Object.entries(languages).map(([code, details]) => (
            <div
              key={code}
              onClick={() => handleSelectLanguage(code)}
              style={{
                ...styles.languageItem,
                ...(code === currentLanguage ? styles.activeLanguage : {})
              }}
              role="option"
              aria-selected={code === currentLanguage}
              data-testid={`language-option-${code}`}
            >
              <span style={{
                ...styles.flag,
                marginRight: isRTL ? 0 : '8px',
                marginLeft: isRTL ? '8px' : 0
              }}>{details.flag}</span>
              <div style={styles.languageInfo}>
                <span style={styles.languageName}>
                  {details.name}
                </span>
                {showNativeNames && code !== 'en' && (
                  <span style={styles.nativeName}>
                    {details.nativeName}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
