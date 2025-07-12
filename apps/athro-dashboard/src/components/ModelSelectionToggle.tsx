import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  FormControlLabel,
  Switch,
  Typography,
  Chip,
  Tooltip,
  Alert,
  IconButton
} from '@mui/material';
import { Info, Speed, Psychology } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { userPreferencesService } from '../services/userPreferencesService';

interface ModelSelectionToggleProps {
  onModelChange?: (model: 'gpt-4.1' | 'gpt-4o-mini') => void;
}

export const ModelSelectionToggle: React.FC<ModelSelectionToggleProps> = ({ onModelChange }) => {
  const { user, userTier } = useAuth();
  const [currentModel, setCurrentModel] = useState<'gpt-4.1' | 'gpt-4o-mini'>('gpt-4o-mini');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load current model preference
  useEffect(() => {
    const loadModelPreference = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        userPreferencesService.setUser(user);
        const preference = await userPreferencesService.getModelPreference();
        setCurrentModel(preference);
      } catch (error) {
        console.error('Failed to load model preference:', error);
        setCurrentModel('gpt-4o-mini'); // Safe default
      } finally {
        setLoading(false);
      }
    };

    loadModelPreference();
  }, [user]);

  // Handle model change
  const handleModelChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || userTier !== 'full') return;

    const newModel: 'gpt-4.1' | 'gpt-4o-mini' = event.target.checked ? 'gpt-4.1' : 'gpt-4o-mini';
    
    try {
      setSaving(true);
      await userPreferencesService.setModelPreference(newModel);
      setCurrentModel(newModel);
      onModelChange?.(newModel);
      
      console.log(`✅ Model preference updated to: ${newModel}`);
    } catch (error) {
      console.error('Failed to save model preference:', error);
      // Revert the UI state on error
    } finally {
      setSaving(false);
    }
  };

  // Check if toggle should be enabled
  const isToggleEnabled = userTier === 'full';
  const isModelAdvanced = currentModel === 'gpt-4.1';

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: '#e4c97e', fontWeight: 600 }}>
          AI Model Selection
        </Typography>
        <Tooltip title="Choose between GPT-4.1 (slower, more accurate) and GPT-4o Mini (faster, more efficient). Quiz generation always uses GPT-4.1 regardless of this setting.">
          <IconButton size="small" sx={{ ml: 0.5, color: '#b5cbb2' }}>
            <Info fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ 
        p: 2, 
        border: '1px solid rgba(228, 201, 126, 0.3)', 
        borderRadius: 2,
        backgroundColor: 'rgba(228, 201, 126, 0.05)'
      }}>
        <FormControl fullWidth disabled={loading || saving}>
          <FormControlLabel
            control={
              <Switch
                checked={isModelAdvanced}
                onChange={handleModelChange}
                disabled={!isToggleEnabled || loading || saving}
                color="primary"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#e4c97e',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#e4c97e',
                  },
                }}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ color: isToggleEnabled ? '#e4c97e' : '#999' }}>
                  {isModelAdvanced ? 'GPT-4.1 (Advanced)' : 'GPT-4o Mini (Fast)'}
                </Typography>
                {isModelAdvanced ? (
                  <Chip 
                    icon={<Psychology />} 
                    label="Accurate" 
                    size="small" 
                    sx={{ 
                      backgroundColor: 'rgba(228, 201, 126, 0.2)',
                      color: '#e4c97e',
                      fontSize: '0.7rem'
                    }} 
                  />
                ) : (
                  <Chip 
                    icon={<Speed />} 
                    label="Efficient" 
                    size="small" 
                    sx={{ 
                      backgroundColor: 'rgba(181, 203, 178, 0.2)',
                      color: '#b5cbb2',
                      fontSize: '0.7rem'
                    }} 
                  />
                )}
              </Box>
            }
            sx={{ 
              '& .MuiFormControlLabel-label': { 
                opacity: isToggleEnabled ? 1 : 0.6 
              }
            }}
          />
        </FormControl>

        {/* Tier restriction notice */}
        {userTier !== 'full' && (
          <Alert 
            severity="info" 
            sx={{ 
              mt: 2, 
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              '& .MuiAlert-message': { fontSize: '0.8rem', color: '#b5cbb2' }
            }}
          >
            Model selection is available for Full tier users only. 
            {userTier === 'free' && ' Free tier uses GPT-4o Mini for chat and GPT-4.1 for quizzes.'}
            {userTier === 'lite' && ' Lite tier uses GPT-4o Mini for chat and GPT-4.1 for quizzes.'}
          </Alert>
        )}

        {/* Current model info */}
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(228, 201, 126, 0.2)' }}>
          <Typography variant="caption" sx={{ color: '#b5cbb2', display: 'block', mb: 1 }}>
            Current Chat Model:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#e4c97e' }}>
              {currentModel === 'gpt-4.1' ? 'GPT-4.1' : 'GPT-4o Mini'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>
              • Quizzes always use GPT-4.1 for accuracy
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}; 