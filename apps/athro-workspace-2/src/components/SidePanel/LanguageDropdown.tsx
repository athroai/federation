import React, { useState } from 'react';

interface LanguageDropdownProps {
  onInjectText?: (text: string) => void;
  onSendMessage?: (message: string) => void;
}

const LanguageDropdown: React.FC<LanguageDropdownProps> = ({ onInjectText, onSendMessage }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('');

  const languages = [
    { code: 'ar', name: 'Arabic' },
    { code: 'zh', name: 'Chinese' },
    { code: 'nl', name: 'Dutch' },
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ga', name: 'Irish' },
    { code: 'it', name: 'Italian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'pl', name: 'Polish' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'es', name: 'Spanish' },
    { code: 'tl', name: 'Tagalog' },
    { code: 'uk', name: 'Ukrainian' },
    { code: 'cy', name: 'Welsh' }
  ];

  const translationRequests = {
    ar: "يرجى متابعة محادثتنا باللغة العربية.",
    zh: "请用中文继续我们的对话。",
    nl: "Ga alsjeblieft door met ons gesprek in het Nederlands.",
    en: "Please continue our conversation in English.",
    fr: "S'il vous plaît, continuez notre conversation en français.",
    de: "Bitte setzen Sie unser Gespräch auf Deutsch fort.",
    hi: "कृपया हमारी बातचीत हिंदी में जारी रखें।",
    ga: "Lean ar aghaidh lenár comhrá as Gaeilge, le do thoil.",
    it: "Per favore, continua la nostra conversazione in italiano.",
    ja: "日本語で会話を続けてください。",
    ko: "한국어로 대화를 계속해 주세요.",
    pl: "Proszę kontynuuj naszą rozmowę po polsku.",
    pt: "Por favor, continue nossa conversa em português.",
    ru: "Пожалуйста, продолжите наш разговор на русском языке.",
    es: "Por favor, continúa nuestra conversación en español.",
    tl: "Pakipatuloy ang aming pag-uusap sa Tagalog.",
    uk: "Будь ласка, продовжуйте нашу розмову українською мовою.",
    cy: "popeth yn cymraeg, os gwelwch i fod yn dda."
  };

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
  };

  const handleSelectLanguage = () => {
    if (selectedLanguage === '') return;
    
    console.log('Language selected:', selectedLanguage);
    
    const translationRequest = translationRequests[selectedLanguage as keyof typeof translationRequests];
    
    console.log('Translation request:', translationRequest);
    
    if (onSendMessage && translationRequest) {
      console.log('Sending language request to chat:', translationRequest);
      onSendMessage(translationRequest);
    } else {
      console.error('Failed to send language request:', { selectedLanguage, translationRequest, onSendMessage });
    }
    
    // Reset to neutral state after selection
    setTimeout(() => {
      setSelectedLanguage('');
    }, 100);
  };

  return (
    <div style={{
      padding: '1rem',
      borderTop: '1px solid rgba(228, 201, 126, 0.2)',
      borderBottom: '1px solid rgba(228, 201, 126, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    }}>


      {/* Dropdown and Button Side by Side */}
      <div style={{
        display: 'flex',
        gap: '0.5rem'
      }}>
        <select
          value={selectedLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          style={{
            flex: 1,
            padding: '0.5rem',
            background: 'rgba(79, 195, 138, 0.1)',
            border: '1px solid #4fc38a',
            borderRadius: '0.25rem',
            color: '#4fc38a',
            fontSize: '0.8rem',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="">Chat Language</option>
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </select>
        
        <button
          onClick={handleSelectLanguage}
          disabled={selectedLanguage === ''}
          style={{
            padding: '0.5rem 0.75rem',
            background: selectedLanguage === '' ? 'rgba(79, 195, 138, 0.3)' : '#4fc38a',
            border: 'none',
            borderRadius: '0.25rem',
            color: selectedLanguage === '' ? 'rgba(79, 195, 138, 0.5)' : '#17221c',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            cursor: selectedLanguage === '' ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
        >
          Switch
        </button>
      </div>
    </div>
  );
};

export default LanguageDropdown; 