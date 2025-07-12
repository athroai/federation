import React, { useState } from 'react';
import { getAllAthros } from '@athro/shared-athros';
import type { Athro, ConfidenceLevel } from '@athro/shared-types';
import styles from './DashboardOnboardingFlow.module.css';

// Step 1: Select Subjects
// Step 2: Confidence/Quiz
// Step 3: Prioritise
// Step 4: Schedule Sessions

const CONFIDENCE_LEVELS = [
  { key: 'HIGH', label: 'High', desc: 'I feel confident in this subject.', color: '#4fc38a' },
  { key: 'MEDIUM', label: 'Medium', desc: 'I feel okay, but could use more practice.', color: '#e4c97e' },
  { key: 'LOW', label: 'Low', desc: 'I find this subject challenging.', color: '#e85a6a' }
];

export const DashboardOnboardingFlow: React.FC = () => {
  const allAthros = getAllAthros();
  const [step, setStep] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [subjectConf, setSubjectConf] = useState<Record<string, ConfidenceLevel>>({});
  const [prioritizedIds, setPrioritizedIds] = useState<string[]>([]);

  // Step 2: Confidence/Quiz
  const [confidenceIdx, setConfidenceIdx] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  // Placeholder quiz state
  const [quizComplete, setQuizComplete] = useState(false);
  const selectedAthros = allAthros.filter(a => selectedIds.includes(a.id));
  const currentAthro = selectedAthros[confidenceIdx];

  const handleSetConfidence = (level: ConfidenceLevel) => {
    if (!currentAthro) return;
    setSubjectConf(prev => ({ ...prev, [currentAthro.id]: level }));
    setShowQuiz(false);
    setQuizComplete(false);
    // Move to next subject or finish
    if (confidenceIdx < selectedAthros.length - 1) {
      setConfidenceIdx(confidenceIdx + 1);
    } else {
      setConfidenceIdx(0);
      setStep(3);
    }
  };

  // Step 1: Select Subjects
  const renderSelectSubjects = () => (
    <div>
      <h2 style={{ color: '#e4c97e', marginBottom: 24 }}>Select Your Athros</h2>
      <div className={styles['athro-card-grid']}>
        {allAthros.map(athro => (
          <div
            key={athro.id}
            className={styles['athro-card-uniform']}
            onClick={() => {
              setSelectedIds(ids => ids.includes(athro.id) ? ids.filter(id => id !== athro.id) : [...ids, athro.id]);
            }}
            style={{
              position: 'relative',
              border: selectedIds.includes(athro.id) ? '3px solid #e4c97e' : '2px solid #b5cbb2',
              borderRadius: '1.2rem',
              background: selectedIds.includes(athro.id) ? 'rgba(228, 201, 126, 0.15)' : '#ffffff',
              boxShadow: selectedIds.includes(athro.id) ? '0 0 15px rgba(228, 201, 126, 0.6)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '1.2rem 1.1rem',
              cursor: 'pointer',
              transition: 'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden',
              userSelect: 'none',
              margin: '0 auto',
              boxSizing: 'border-box',
              color: '#ffffff',
              fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif',
              fontSize: '16px',
              lineHeight: '24px',
              textRendering: 'optimizeLegibility',
            }}
          >
            <img src={`/athros/${athro.image.replace(/^.*[\/]/, '')}`} alt={athro.name} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: '1rem', marginBottom: 12, background: '#eee', flexShrink: 0 }} />
            <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#2c3e50', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{athro.name}</div>
            <div style={{ fontSize: '0.9rem', color: '#7f8c8d', marginTop: '-0.2rem', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{athro.subject}</div>
            <div style={{ fontSize: '0.95rem', color: '#b5cbb2', marginTop: 8, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', maxHeight: 40 }}>{athro.description}</div>
            {selectedIds.includes(athro.id) && (
              <div style={{ position: 'absolute', top: 10, right: 10, background: '#e4c97e', color: '#1c2a1e', borderRadius: '50%', padding: '0.3rem 0.5rem', fontWeight: 'bold', zIndex: 2 }}>✓</div>
            )}
          </div>
        ))}
      </div>
      <button
        style={{ background: '#e4c97e', color: '#1c2a1e', fontWeight: 700, borderRadius: '1rem', padding: '0.8rem 2.2rem', fontSize: '1.15rem', margin: '0 auto', display: 'block', boxShadow: '0 2px 8px #e4c97e44', border: 'none', cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer' }}
        onClick={() => setStep(2)}
        disabled={selectedIds.length === 0}
      >Continue</button>
    </div>
  );

  // Step 2: Confidence/Quiz
  const renderConfidenceQuiz = () => {
    if (!currentAthro) return null;
    // If quiz is active, show quiz placeholder
    if (showQuiz) {
      return (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <h2 style={{ color: '#e4c97e', marginBottom: 24 }}>Quiz for {currentAthro.name}</h2>
          <div style={{ color: '#fffbe6', marginBottom: 24 }}>Quiz functionality coming soon.<br/>Pretend you took a quiz!</div>
          <button
            style={{ background: '#4fc38a', color: '#fff', fontWeight: 700, borderRadius: '1rem', padding: '0.8rem 2.2rem', fontSize: '1.15rem', margin: '0 auto', display: 'block', border: 'none', cursor: 'pointer' }}
            onClick={() => {
              setQuizComplete(true);
            }}
          >Finish Quiz</button>
          {quizComplete && (
            <div style={{ marginTop: 24 }}>
              <div style={{ color: '#e4c97e', marginBottom: 12 }}>Quiz complete! Set confidence to Medium?</div>
              <button
                style={{ background: '#e4c97e', color: '#1c2a1e', fontWeight: 700, borderRadius: '1rem', padding: '0.8rem 2.2rem', fontSize: '1.15rem', margin: '0 auto', display: 'block', border: 'none', cursor: 'pointer' }}
                onClick={() => handleSetConfidence('MEDIUM')}
              >Set to Medium & Continue</button>
            </div>
          )}
        </div>
      );
    }
    return (
      <div style={{ textAlign: 'center', padding: 32 }}>
        <h2 style={{ color: '#e4c97e', marginBottom: 24 }}>How confident are you in {currentAthro.subject}?</h2>
        <img src={`/athros/${currentAthro.image.replace(/^.*[\/]/, '')}`} alt={currentAthro.name} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: '1rem', marginBottom: 12, background: '#eee' }} />
        <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#2c3e50', marginBottom: 8 }}>{currentAthro.name}</div>
        <div style={{ fontSize: '0.9rem', color: '#7f8c8d', marginBottom: 16 }}>{currentAthro.subject}</div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: 24 }}>
          {CONFIDENCE_LEVELS.map(level => (
            <button
              key={level.key}
              onClick={() => handleSetConfidence(level.key as ConfidenceLevel)}
              style={{
                background: subjectConf[currentAthro.id] === level.key ? level.color : 'rgba(36,54,38,0.78)',
                color: subjectConf[currentAthro.id] === level.key ? '#1c2a1e' : '#e3e8e1',
                border: subjectConf[currentAthro.id] === level.key ? `2px solid ${level.color}` : 'none',
                fontWeight: 600,
                borderRadius: '1rem',
                padding: '0.7rem 1.5rem',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px #0002',
                minWidth: 120,
                transition: 'background 0.13s, color 0.13s',
              }}
            >
              {level.label}
            </button>
          ))}
        </div>
        <div style={{ color: '#b5cbb2', fontSize: '0.98rem', textAlign: 'center', marginBottom: '1.2rem' }}>
          {subjectConf[currentAthro.id] ? CONFIDENCE_LEVELS.find(l => l.key === subjectConf[currentAthro.id])?.desc : 'Select your confidence level.'}
        </div>
        <button
          style={{ background: '#e4c97e', color: '#1c2a1e', fontWeight: 700, borderRadius: '1rem', padding: '0.8rem 2.2rem', fontSize: '1.15rem', margin: '0 auto 1rem auto', boxShadow: '0 2px 8px #e4c97e44', border: 'none', cursor: 'pointer', display: 'block' }}
          onClick={() => setShowQuiz(true)}
        >Not sure? Take a Quiz</button>
      </div>
    );
  };

  // Step 3: Placeholder for Prioritise
  const renderPrioritise = () => (
    <div>
      <h2 style={{ color: '#e4c97e', marginBottom: 24 }}>Prioritise Your Athros</h2>
      {/* TODO: Implement prioritisation logic */}
      <button style={{ marginTop: 32 }} onClick={() => setStep(4)}>Continue</button>
    </div>
  );

  // Step 4: Placeholder for Schedule Sessions
  const renderSchedule = () => (
    <div>
      <h2 style={{ color: '#e4c97e', marginBottom: 24 }}>Schedule Sessions</h2>
      {/* TODO: Implement scheduling logic */}
      <button style={{ marginTop: 32 }} onClick={() => setStep(1)}>Restart</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 32 }}>
      {step === 1 && renderSelectSubjects()}
      {step === 2 && renderConfidenceQuiz()}
      {step === 3 && renderPrioritise()}
      {step === 4 && renderSchedule()}
    </div>
  );
}; 