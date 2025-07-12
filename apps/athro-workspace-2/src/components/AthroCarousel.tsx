import React, { useEffect, useState, useRef } from "react";
import { Athro, ConfidenceLevel } from '../types/athro';
import StarIcon from '@mui/icons-material/Star';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface AthroGridProps {
  athros: Athro[];
  selectedAthro: Athro;
  onSelectAthro: (athro: Athro) => void;
}

const AthroGrid: React.FC<AthroGridProps> = ({
  athros,
  selectedAthro,
  onSelectAthro,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(6);
  const [cardSize, setCardSize] = useState(160);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate responsive card size and count based on screen width
  useEffect(() => {
    const updateLayout = () => {
      const screenWidth = window.innerWidth;
      let newCardsPerView: number;
      let newCardSize: number;
      
      if (screenWidth < 640) { // Mobile
        newCardsPerView = 2;
        newCardSize = Math.min(160, (screenWidth - 100) / 2); // Account for arrows and gaps
      } else if (screenWidth < 768) { // Small tablet
        newCardsPerView = 3;
        newCardSize = Math.min(160, (screenWidth - 120) / 3);
      } else if (screenWidth < 1024) { // Tablet
        newCardsPerView = 4;
        newCardSize = Math.min(160, (screenWidth - 140) / 4);
      } else if (screenWidth < 1280) { // Small desktop
        newCardsPerView = 5;
        newCardSize = Math.min(160, (screenWidth - 160) / 5);
      } else { // Large desktop
        newCardsPerView = 6;
        newCardSize = Math.min(160, (screenWidth - 180) / 6);
      }
      
      setCardsPerView(newCardsPerView);
      setCardSize(newCardSize);
    };
    
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);
  
  const maxIndex = Math.max(0, athros.length - cardsPerView);

  useEffect(() => {
    console.log('AthroGrid athros:', athros);
    const withConfidence = athros.filter(a => a.confidenceLevel);
    console.log('Athros with confidence levels:', withConfidence);
  }, [athros]);

  // Recalculate maxIndex when athros length changes
  useEffect(() => {
    const newMaxIndex = Math.max(0, athros.length - cardsPerView);
    if (currentIndex > newMaxIndex) {
      setCurrentIndex(newMaxIndex);
    }
  }, [athros.length, currentIndex, cardsPerView]);

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(maxIndex, prev + 1));
  };

  const visibleAthros = athros.slice(currentIndex, currentIndex + cardsPerView);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      width: '100%',
      padding: '0',
      margin: '0'
    }}>
      {/* Left Arrow */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrevious}
          style={{
            background: 'rgba(36, 54, 38, 0.9)',
            border: '2px solid #e4c97e',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#e4c97e',
            transition: 'all 0.2s ease',
            zIndex: 10,
            flexShrink: 0,
            marginLeft: '8px'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(36, 54, 38, 1)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(36, 54, 38, 0.9)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <ChevronLeftIcon fontSize="small" />
        </button>
      )}

      {/* Athro Cards Container */}
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          gap: '0.75rem',
          flex: 1,
          overflow: 'hidden',
          justifyContent: 'space-evenly',
          padding: '12px 4px',
          width: '100%'
        }}
      >
        {visibleAthros.map((athro) => (
          <button
            key={athro.id}
            onClick={() => onSelectAthro(athro)}
            style={{
              background: selectedAthro.id === athro.id 
                ? 'rgba(228, 201, 126, 0.1)' 
                : 'rgba(36, 54, 38, 0.3)',
              border: selectedAthro.id === athro.id 
                ? '2px solid #e4c97e' 
                : '2px solid rgba(228, 201, 126, 0.3)',
              borderRadius: '12px',
              cursor: 'pointer',
              opacity: selectedAthro.id === athro.id ? 1 : 0.8,
              transition: 'all 0.3s ease',
              outline: 'none',
              width: `${cardSize}px`,
              height: `${cardSize}px`,
              minWidth: `${cardSize}px`,
              minHeight: `${cardSize}px`,
              maxWidth: `${cardSize}px`,
              maxHeight: `${cardSize}px`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.75rem',
              boxShadow: selectedAthro.id === athro.id 
                ? '0 0 20px rgba(228, 201, 126, 0.3)' 
                : '0 4px 8px rgba(0, 0, 0, 0.2)',
              transform: selectedAthro.id === athro.id ? 'scale(1.05)' : 'scale(1)',
              position: 'relative',
              flexShrink: 0
            }}
            onMouseOver={(e) => {
              if (selectedAthro.id !== athro.id) {
              e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.3)';
              }
            }}
            onMouseOut={(e) => {
              if (selectedAthro.id !== athro.id) {
                e.currentTarget.style.opacity = '0.8';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
              }
            }}
          >
            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
              <img
                src={athro.image.startsWith('http') ? athro.image : `${window.location.origin}${athro.image}`}
                alt={athro.name}
                style={{
                  width: '60px',
                  height: '60px',
                  objectFit: 'cover',
                  borderRadius: '50%',
                  border: selectedAthro.id === athro.id ? '3px solid #e4c97e' : '2px solid rgba(228, 201, 126, 0.5)',
                  backgroundColor: 'rgba(36,54,38,0.9)',
                  transition: 'all 0.3s ease'
                }}
                onError={(e) => {
                  const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><circle cx="30" cy="30" r="30" fill="rgba(36,54,38,0.9)"/><text x="30" y="30" font-size="24" text-anchor="middle" dominant-baseline="middle" fill="#e4c97e">${athro.name?.[0] || 'A'}</text></svg>`;
                  e.currentTarget.src = fallbackSvg;
                  e.currentTarget.onerror = null;
                }}
              />
              {/* Confidence Level Indicator */}
              <div style={{
                position: 'absolute',
                bottom: '8px',
                right: '0px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: athro.confidenceLevel === 'HIGH' ? '#4fc38a' : 
                                athro.confidenceLevel === 'MEDIUM' ? '#e4c97e' : 
                                athro.confidenceLevel === 'LOW' ? '#e85a6a' :
                                'transparent',
                border: athro.confidenceLevel ? '2px solid #1c2a1e' : 'none',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                color: athro.confidenceLevel === 'MEDIUM' ? '#1c2a1e' : '#fff',
                opacity: athro.confidenceLevel ? 1 : 0,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
              }}>
                {athro.confidenceLevel && athro.confidenceLevel.charAt(0)}
              </div>
            </div>
            {/* Name and Priority Star */}
            <div style={{
              textAlign: 'center',
              color: '#e4c97e',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              width: '100%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              padding: '0 4px',
              marginBottom: '0.25rem'
            }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {athro.name}
              </span>
              {athro.isPriority && (
                <StarIcon style={{ color: '#e4c97e', fontSize: '1rem', flexShrink: 0 }} />
              )}
            </div>
            {/* Subject/Description */}
            <div style={{
              textAlign: 'center',
              color: 'rgba(228, 201, 126, 0.7)',
              fontSize: '0.75rem',
              width: '100%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              padding: '0 2px',
              lineHeight: '1.2'
            }}>
              {athro.subject || athro.description || 'Study Partner'}
            </div>
          </button>
        ))}
      </div>
      {/* Right Arrow */}
      {currentIndex < maxIndex && (
        <button
          onClick={handleNext}
          style={{
            background: 'rgba(36, 54, 38, 0.9)',
            border: '2px solid #e4c97e',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#e4c97e',
            transition: 'all 0.2s ease',
            zIndex: 10,
            flexShrink: 0,
            marginRight: '8px'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(36, 54, 38, 1)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(36, 54, 38, 0.9)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <ChevronRightIcon fontSize="small" />
        </button>
      )}
    </div>
  );
};

export default AthroGrid;
