import React, { useState, useEffect, useRef, ChangeEvent, FormEvent, useCallback, useMemo } from 'react';
import { Athro } from '../types/athro';
import { ChatService, ChatMessage, StreamingResponse } from '../services/openai';
import { ATHRO_PERSONALITIES } from '../data/athroPersonalities';
import SidePanel from './SidePanel/SidePanel';
import n8nEventService, { EventNames } from '../services/N8nEventService';
import SupabaseStudyService from '../services/SupabaseStudyService';
import PlaylistService from '../services/PlaylistService';
import { createClient } from '@supabase/supabase-js';
import katex from 'katex';
import 'katex/dist/katex.min.css';

import { marked } from 'marked';
import { StudyHistory } from '../types/history';
import { Resource } from '../types/resources';
import StudyHistoryModal from './StudyHistory/StudyHistoryModal';
import DocumentProcessingService from '../services/DocumentProcessingService';

import { formatCurrentDateTime } from '../utils/dateUtils';
import UserService from '../services/UserService';
import '../styles/chat.css';
import { StudyService } from '../services/StudyService';
import { Flashcard } from '../types/study';
import { useTimer } from '../contexts/TimerContext';
import { StudyHistorySummary } from '../types/history';
import ChatSessionService, { ChatSession } from '../services/ChatSessionService';
import { useAuth } from '../contexts/AuthContext';
import NotificationSystem from './common/NotificationSystem';
import { useNotifications } from '../hooks/useNotifications';

// Initialize Supabase client for getting public URLs
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ChatInterfaceProps {
  athro: Athro;
  onSaveSession?: () => void;
  onDeleteSession?: () => void;
  onViewHistory?: () => void;
  canSaveSession?: boolean;
  canDeleteSession?: boolean;
  sessionAction?: 'save' | 'delete' | 'history' | null;
  onSessionActionComplete?: () => void;
  currentSessionId?: string | null;
  onLoadSession?: (sessionId: string) => void;
  isCreatingSession?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ athro, onSaveSession, onDeleteSession, onViewHistory, canSaveSession, canDeleteSession, sessionAction, onSessionActionComplete, currentSessionId, onLoadSession, isCreatingSession }) => {
  // Check if we're running in embedded mode (inside dashboard)
  const isEmbedded = window.location.port === '5210' || window.parent !== window;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});
  const [isStreaming, setIsStreaming] = useState<Record<string, boolean>>({});
  const [streamingContent, setStreamingContent] = useState<Record<string, string>>({});
  const [usedResources, setUsedResources] = useState<string[]>([]);
  const [showOriginalText, setShowOriginalText] = useState<Record<string, boolean>>({});
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [userPreferredName, setUserPreferredName] = useState<string | null>(null);
  const chatService = useRef<ChatService | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const currentSessionRef = useRef<ChatSession | null>(null);
  const athroRef = useRef(athro); // Add ref to store athro properties to avoid infinite loops
  const isProcessingClickRef = useRef<boolean>(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [showSaveStudy, setShowSaveStudy] = useState(false);
  const [showLoadStudy, setShowLoadStudy] = useState(false);
  const [studyHistories, setStudyHistories] = useState<StudyHistorySummary[]>([]);
  const [showFlashcardSave, setShowFlashcardSave] = useState(false);
  const [flashcardToSave, setFlashcardToSave] = useState<any>(null);
  const [flashcardSaveTitle, setFlashcardSaveTitle] = useState('');
  const [flashcardSaveFront, setFlashcardSaveFront] = useState('');
  const [flashcardSaveBack, setFlashcardSaveBack] = useState('');
  
  // Track selected language for athro-languages
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  // Add notifications system
  const { notifications, removeNotification, showSuccess, showError } = useNotifications();

  // Add abort controller for stopping streaming
  const [currentAbortController, setCurrentAbortController] = useState<AbortController | null>(null);
  
  // Track last activity time
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  
  // Ref to track the last AI message for scrolling
  const lastAIMessageRef = useRef<HTMLDivElement>(null);

  // Scroll to show the top of the last AI response
  const scrollToLastAIResponse = () => {
    if (lastAIMessageRef.current) {
      lastAIMessageRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  // Auto-scroll to bottom when streaming content updates
  useEffect(() => {
    if (streamingContent[athro.id] && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [streamingContent[athro.id], athro.id]);

  // Auto-scroll when new messages are added
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages.length]);

  // Keep refs synchronized with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    currentSessionRef.current = currentSession;
  }, [currentSession]);

  // Update activity time when messages change (stable ref)
  const lastActivityTimeRef = useRef(Date.now());
  useEffect(() => {
    lastActivityTimeRef.current = Date.now();
    setLastActivityTime(Date.now());
  }, [messages.length]); // Only depend on messages.length to reduce re-renders

  // Auto-save session when messages change (debounced)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save messages whenever they change (debounced to avoid excessive saves)
  useEffect(() => {
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Only auto-save if we have messages and a valid athro
    if (messages.length > 0 && athroRef.current?.id) {
      autoSaveTimeoutRef.current = setTimeout(async () => {
        try {
          await ChatSessionService.saveActiveSession(athroRef.current.id, messages);
          console.log(`[ChatInterface] Auto-saved ${messages.length} messages for athro:`, athroRef.current.id);
        } catch (error) {
          console.error('[ChatInterface] Auto-save failed:', error);
        }
      }, 1000); // Debounce by 1 second
    }

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [messages]); // Auto-save whenever messages change

  // Initialize ChatService once - memoized to prevent re-creation
  const chatServiceInitialized = useRef(false);
  useEffect(() => {
    if (!chatServiceInitialized.current) {
      chatService.current = new ChatService(
        ATHRO_PERSONALITIES[athro.id] || {
          subject: athro.subject,
          examBoard: 'General',
          level: 'GCSE',
          teachingStyle: 'Interactive and supportive',
          specialCapabilities: ['math', 'science', 'literature', 'study-materials']
        },
        userPreferredName
      );
      chatServiceInitialized.current = true;
      console.log('[ChatInterface] ChatService initialized for athro:', athro.id);
    }
  }, [athro.id]); // Only depend on athro.id for re-initialization when switching athros

  // Update ChatService when user's preferred name changes (separate effect)
  useEffect(() => {
    if (chatService.current && userPreferredName !== null) {
      chatService.current.updateUserPreferredName(userPreferredName);
      console.log('Updated ChatService with preferred name:', userPreferredName);
    }
  }, [userPreferredName]);

  // Initialize session once when component mounts or athro changes
  const sessionInitialized = useRef<Set<string>>(new Set());
  useEffect(() => {
    const initializeSession = async () => {
      const currentAthro = athroRef.current;
      
      // Prevent re-initialization for the same athro
      if (sessionInitialized.current.has(currentAthro.id)) {
        return;
      }
      sessionInitialized.current.add(currentAthro.id);

      // Force clear Welsh sessions for testing
      if (currentAthro.id === 'athro-welsh') {
        console.log('🏴󠁧󠁢󠁷󠁬󠁳󠁿 Clearing Welsh sessions...');
        await ChatSessionService.clearAllSessions(currentAthro.id);
        // Also clear any related localStorage manually
        Object.keys(localStorage).forEach(key => {
          if (key.includes('athro_chat_session') && key.includes('athro-welsh')) {
            localStorage.removeItem(key);
          }
        });
        console.log('🏴󠁧󠁢󠁷󠁬󠁳󠁿 Welsh sessions cleared');
      }
      
      const existingSession = await ChatSessionService.getActiveSession(currentAthro.id);
      
      if (existingSession && existingSession.messages.length > 0 && currentAthro.id !== 'athro-welsh') {
        // Load existing session
        setMessages(existingSession.messages);
        setCurrentSession(existingSession);
        console.log('Loaded existing chat session:', existingSession.id);
      } else {
        // Create new session with welcome message
        const athroPersonality = ATHRO_PERSONALITIES[currentAthro.id];
        const subject = athroPersonality?.subject || currentAthro.subject || 'General';
        
        let welcomeContent = '';
        
        // Special welcome message for AthroLanguages
        if (currentAthro.id === 'athro-languages') {
          welcomeContent = `Hi${userPreferredName ? ` ${userPreferredName}` : ''}! **${currentAthro.name}** here to help! 🎓\n\nI'm your ${subject} tutor and I'm excited to work with you!\n\n🌍 **First, let's choose your target language:**\n\n**[French]** Français\n**[German]** Deutsch\n**[Spanish]** Español\n**[Italian]** Italiano\n**[Polish]** Polski\n**[Greek]** Ελληνικά\n**[Turkish]** Türkçe\n**[Ukrainian]** Українська\n**[Mandarin Chinese]** 中文\n**[Arabic]** العربية\n\nClick on the language you're studying, and I'll customize everything for you!`;
        } else if (currentAthro.id === 'athro-welsh') {
          // Special welcome message for AthroCymraeg with Welsh greeting and language options
          welcomeContent = `Shwmae! Sut hoffech chi gyfathrebu?\n\nHow would you like to communicate?\n\n**[Saesneg yn unig - English only]** - All responses in English\n**[Cymraeg yn unig - Welsh only]** - All responses in Welsh\n**[Ochor yn ochor - Side by Side]** - Dual columns with English and Welsh together\n\nChoose your preferred conversation style!`;
        } else {
          // Standard welcome message for other athros
          welcomeContent = `Hi${userPreferredName ? ` ${userPreferredName}` : ''}! **${currentAthro.name}** here to help! 🎓\n\nI'm your ${subject} tutor and I'm excited to work with you. Here are some options to get started:\n\n**[1] 📁 Upload Resources** - Share homework, questions, or study materials\n**[2] 💬 Discuss Something** - Ask about topics, concepts, or problems\n**[3] 🧠 Test Your Knowledge** - Practice with quizzes and exercises\n**[4] 🌟 Something Else** - Study planning, tips, or other help\n\nClick any option above to get started, or just type your question below!`;
        }
        
        const welcomeMessage: ChatMessage = {
          role: 'assistant',
          content: welcomeContent
        };
        
        const newMessages = [welcomeMessage];
        setMessages(newMessages);
        
        // Create and save new session
        const newSession = await ChatSessionService.saveActiveSession(currentAthro.id, newMessages);
        setCurrentSession(newSession);
        console.log('Created new chat session:', newSession.id);
        console.log('🏴󠁧󠁢󠁷󠁬󠁳󠁿 DEBUG: Session created for athro:', currentAthro.id, 'with welcome content:', welcomeContent.substring(0, 50) + '...');
      }
    };

    initializeSession();
    
    // Subscribe to chat messages from other services
    const chatMessageSubscription = n8nEventService.subscribe(
      EventNames.CHAT_MESSAGE_RECEIVED,
      (payload) => {
        // Only handle messages intended for this athro
        if (payload.athroId === athroRef.current.id) {
          console.log('Received chat message from another service:', payload);
          // You could update UI based on this information
        }
      }
    );
    
    // Notify other services that this chat interface is active
    const currentAthro = athroRef.current;
    const athroPersonality = ATHRO_PERSONALITIES[currentAthro.id];
    const subject = athroPersonality?.subject || currentAthro.subject || 'General';
    n8nEventService.publishEvent(EventNames.WORKSPACE_STATE_UPDATED, {
      athroId: currentAthro.id,
      component: 'ChatInterface',
      state: 'active',
      subject: subject
    });
    
    // Cleanup subscriptions when component unmounts
    return () => {
      chatMessageSubscription();
      
      // Clear any streaming states when component unmounts
      setIsTyping({});
      setIsStreaming({});
      setStreamingContent({});
      
      // Don't clear the session - we want it to persist when switching Athros
      // The session should only be cleared when explicitly saved or deleted
      console.log('[ChatInterface] Component cleanup - keeping session intact for athro:', athroRef.current.id);
    };
  }, [athro.id]); // Only depend on athro.id for re-initialization when switching athros

  // Page unload protection - save sessions before user leaves
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      // Save current session immediately before page closes
      if (messages.length > 0 && athroRef.current?.id) {
        try {
          await ChatSessionService.saveActiveSessionImmediate(athroRef.current.id, messages);
          console.log('[ChatInterface] Saved session before page unload');
        } catch (error) {
          console.error('[ChatInterface] Failed to save session before unload:', error);
        }
      }
    };

    const handleVisibilityChange = async () => {
      // Save when page becomes hidden (user switches tabs, minimizes browser, etc.)
      if (document.visibilityState === 'hidden' && messages.length > 0 && athroRef.current?.id) {
        try {
          await ChatSessionService.saveActiveSessionImmediate(athroRef.current.id, messages);
          console.log('[ChatInterface] Saved session on visibility change');
        } catch (error) {
          console.error('[ChatInterface] Failed to save session on visibility change:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [messages]); // Re-register when messages change to capture latest state

  // Fetch user's preferred name (once)
  const userNameFetched = useRef(false);
  useEffect(() => {
    if (!userNameFetched.current) {
      const fetchUserPreferredName = async () => {
        try {
          const userService = UserService.getInstance();
          const preferredName = await userService.getPreferredName();
          setUserPreferredName(preferredName);
          userNameFetched.current = true;
        } catch (error) {
          console.error('Failed to fetch user preferred name:', error);
          userNameFetched.current = true; // Mark as attempted
        }
      };

      fetchUserPreferredName();
    }
  }, []); // Run only once

  // Update welcome message when preferred name changes (only for initial welcome message)
  const hasUpdatedWelcomeMessage = useRef(false);
  const isWelcomeMessageRef = useRef(false);
  
  // Track when we have a welcome message (separate effect to avoid dependency issues)
  useEffect(() => {
    isWelcomeMessageRef.current = (
      messages.length === 1 && 
      messages[0]?.role === 'assistant' && 
      messages[0]?.content?.includes('here to help')
    );
  }, [messages.length]);
  
  useEffect(() => {
    if (
      isWelcomeMessageRef.current && 
      userPreferredName !== null && 
      !hasUpdatedWelcomeMessage.current
    ) {
      // This is a welcome message, update it with the preferred name
      const currentAthro = athroRef.current;
      const athroPersonality = ATHRO_PERSONALITIES[currentAthro.id];
      const subject = athroPersonality?.subject || currentAthro.subject || 'General';
      
      let welcomeContent = '';
      
      // Special welcome message for AthroLanguages
      if (currentAthro.id === 'athro-languages') {
        welcomeContent = `Hi${userPreferredName ? ` ${userPreferredName}` : ''}! **${currentAthro.name}** here to help! 🎓\n\nI'm your ${subject} tutor and I'm excited to work with you!\n\n🌍 **First, let's choose your target language:**\n\n**[French]** Français\n**[German]** Deutsch\n**[Spanish]** Español\n**[Italian]** Italiano\n**[Polish]** Polski\n**[Greek]** Ελληνικά\n**[Turkish]** Türkçe\n**[Ukrainian]** Українська\n**[Mandarin Chinese]** 中文\n**[Arabic]** العربية\n\nClick on the language you're studying, and I'll customize everything for you!`;
      } else if (currentAthro.id === 'athro-welsh') {
        // Special welcome message for AthroCymraeg with Welsh greeting and language options
        welcomeContent = `Shwmae! Sut hoffech chi gyfathrebu?\n\nHow would you like to communicate?\n\n**[Saesneg yn unig - English only]** - All responses in English\n**[Cymraeg yn unig - Welsh only]** - All responses in Welsh\n**[Ochor yn ochor - Side by Side]** - Dual columns with English and Welsh together\n\nChoose your preferred conversation style!`;
      } else {
        // Standard welcome message for other athros
        welcomeContent = `Hi${userPreferredName ? ` ${userPreferredName}` : ''}! **${currentAthro.name}** here to help! 🎓\n\nI'm your ${subject} tutor and I'm excited to work with you. Here are some options to get started:\n\n**[1] 📁 Upload Resources** - Share homework, questions, or study materials\n**[2] 💬 Discuss Something** - Ask about topics, concepts, or problems\n**[3] 🧠 Test Your Knowledge** - Practice with quizzes and exercises\n**[4] 🌟 Something Else** - Study planning, tips, or other help\n\nClick any option above to get started, or just type your question below!`;
      }
      
      const updatedWelcomeMessage: ChatMessage = {
        role: 'assistant',
        content: welcomeContent
      };
      
      setMessages([updatedWelcomeMessage]);
      hasUpdatedWelcomeMessage.current = true;
      
      // Update the session with the new welcome message (async to avoid blocking)
      const updateSession = async () => {
        try {
          await ChatSessionService.saveActiveSession(currentAthro.id, [updatedWelcomeMessage]);
        } catch (error) {
          console.error('Error updating welcome message in session:', error);
        }
      };
      updateSession();
      
      console.log('Updated welcome message with preferred name:', userPreferredName);
    }
  }, [userPreferredName]); // FIXED: Removed athro.id dependency to prevent infinite loops

  const renderMessage = (text: string): string => {
    // First handle LaTeX expressions
    let processedText = text;

    // Handle display math
    processedText = processedText.replace(/\$\$(.*?)\$\$/g, (_, math) => {
      try {
        return katex.renderToString(math, { displayMode: true });
      } catch (error) {
        console.error('Math rendering error:', error);
        return math;
      }
    });

    // Handle inline math
    processedText = processedText.replace(/\\\((.*?)\\\)/g, (_, math) => {
      try {
        return katex.renderToString(math, { displayMode: false });
      } catch (error) {
        console.error('Math rendering error:', error);
        return math;
      }
    });

    // Pre-process specific formatting patterns before markdown parsing
    // Convert bullet points with brackets to proper markdown
    processedText = processedText.replace(/• \[(.*?)\]/g, '• **$1**');
    
    // Convert standalone bullet points to proper markdown
    processedText = processedText.replace(/^• (.*?)$/gm, '- $1');
    
    // Convert numbered lists with brackets
    processedText = processedText.replace(/(\d+)\. \[(.*?)\]/g, '$1. **$2**');

    // Convert Markdown to HTML first (before custom formatting)
    const markedOptions = {
      gfm: true,
      breaks: true
    };
    
    let html = marked.parse(processedText, markedOptions) as string;
    
    // Add custom CSS classes to existing markdown elements
    html = html
      .replace(/<h1>/g, '<h1 class="chat-h1">')
      .replace(/<h2>/g, '<h2 class="chat-h2">')
      .replace(/<h3>/g, '<h3 class="chat-h3">')
      .replace(/<ul>/g, '<ul class="chat-ul">')
      .replace(/<ol>/g, '<ol class="chat-ol">')
      .replace(/<li>/g, '<li class="chat-li">')
      .replace(/<blockquote>/g, '<blockquote class="chat-blockquote">')
      .replace(/<table>/g, '<table class="chat-table">')
      .replace(/<th>/g, '<th class="chat-th">')
      .replace(/<td>/g, '<td class="chat-td">')
      .replace(/<strong>/g, '<strong class="chat-strong">')
      .replace(/<em>/g, '<em class="chat-em">');

    // Now apply custom formatting to the HTML
    html = html
      // Add special styling for main titles (H1)
      .replace(/<h1 class="chat-h1">(.*?)<\/h1>/g, '<div class="chat-title-main">$1</div>')
      // Add special styling for section titles (H2)
      .replace(/<h2 class="chat-h2">(.*?)<\/h2>/g, '<div class="chat-title-section">$1</div>')
      // Add special styling for subsection titles (H3)
      .replace(/<h3 class="chat-h3">(.*?)<\/h3>/g, '<div class="chat-title-subsection">$1</div>')
      // Create info boxes for important information
      .replace(/<p>💡 (.*?)<\/p>/g, '<div class="chat-info-box">💡 $1</div>')
      // Create warning boxes
      .replace(/<p>⚠️ (.*?)<\/p>/g, '<div class="chat-warning-box">⚠️ $1</div>')
      // Create success boxes
      .replace(/<p>✅ (.*?)<\/p>/g, '<div class="chat-success-box">✅ $1</div>')
      // Create definition boxes
      .replace(/<p>📖 (.*?): (.*?)<\/p>/g, '<div class="chat-definition-box"><div class="chat-definition-term">📖 $1</div><div class="chat-definition-content">$2</div></div>')
      // Create step-by-step boxes
      .replace(/<p>(\d+)\. (.*?)<\/p>/g, '<div class="chat-step-box"><div class="chat-step-number">$1</div><div class="chat-step-content">$2</div></div>')
      // Create key points boxes
      .replace(/<p>🔑 (.*?)<\/p>/g, '<div class="chat-key-point">🔑 $1</div>')
      // Create example boxes
      .replace(/<p>📝 (.*?)<\/p>/g, '<div class="chat-example-box">📝 $1</div>')
      // Create formula boxes
      .replace(/<p>🧮 (.*?)<\/p>/g, '<div class="chat-formula-box">🧮 $1</div>')
      // Create graph placeholders (for future implementation)
      .replace(/<p>📊 (.*?)<\/p>/g, '<div class="chat-graph-placeholder">📊 $1</div>');

    return html;
  };

  // REMOVED: All translation-related code that was causing infinite loops

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !chatService.current) return;

    // Don't create session on first message anymore - let WorkPage handle session creation
    console.log('[ChatInterface] Handling message submission, currentSessionId:', currentSessionId);

    // Create abort controller for this request
    const abortController = new AbortController();
    setCurrentAbortController(abortController);

    // Add user message to UI
    const userMessage: ChatMessage = { role: 'user', content: inputValue };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Clear input and scroll to bottom
    setInputValue('');
    
    // Start typing indicator
    setIsTyping(prev => ({
      ...prev,
      [athro.id]: true
    }));
    
    try {
      // Look for references to study materials
      const studyTriggers = [
        'show my study materials',
        'my study materials',
        'my notes',
        'my documents'
      ];
      
      if (studyTriggers.some(trigger => inputValue.toLowerCase().includes(trigger))) {
        // Handle study materials request
        console.log('Study materials request detected');
        // Acknowledge the request before processing
        const acknowledgement: ChatMessage = {
          role: 'assistant',
          content: `I'll help you with your study materials. Let me see what you have...`
        };
        
        setMessages([...updatedMessages, acknowledgement]);
        
        // Get study materials from study service
        try {
          // Get resources directly instead of using non-existent method
          const studyMaterials = await SupabaseStudyService.getResources(currentSessionId || 'temp-session', athro.id);
          
          if (studyMaterials && studyMaterials.length > 0) {
            const materialsResponse: ChatMessage = {
              role: 'assistant',
              content: `I found ${studyMaterials.length} study materials for ${athro.subject}. You can select them from the panel on the right to review together.`
            };
            
            setMessages([...updatedMessages, acknowledgement, materialsResponse]);
          } else {
            const noMaterialsResponse: ChatMessage = {
              role: 'assistant',
              content: `I don't see any study materials for ${athro.subject} yet. You can upload some using the upload button in the panel on the right.`
            };
            
            setMessages([...updatedMessages, acknowledgement, noMaterialsResponse]);
          }
        } catch (error) {
          console.error('Error fetching study materials:', error);
          const errorMessage: ChatMessage = {
            role: 'assistant',
            content: `I encountered an error trying to access your study materials. Please try again later.`
          };
          
          setMessages([...updatedMessages, acknowledgement, errorMessage]);
        }
        
        setIsTyping(prev => ({
          ...prev,
          [athro.id]: false
        }));
        setCurrentAbortController(null);
        return;
      }

      // Send to OpenAI API with streaming
      console.log('Sending message to OpenAI API via ChatService with streaming');
      
      // Check if user is in bilingual "Side by Side" mode by looking at recent messages
      // Look for either the trigger message OR any existing bilingual table format
      const isBilingualMode = updatedMessages.some(msg => 
        (msg.role === 'user' && msg.content.includes('All your responses from this point on will be responses in dual columns')) ||
        (msg.role === 'assistant' && msg.content.includes('| **English** |') && msg.content.includes('|---|---|'))
      );
      
      let context = `athroId: ${athro.id}`;
      
      // Add bilingual instructions if user selected "Side by Side" mode
      if (isBilingualMode) {
        // Determine the target language from the recent messages
        const bilingualMessage = updatedMessages.find(msg => 
          msg.role === 'assistant' && msg.content.includes('| **English** |')
        );
        
        let targetLanguage = 'Welsh'; // Default for Welsh tutor
        if (bilingualMessage) {
          if (bilingualMessage.content.includes('| **French** |')) targetLanguage = 'French';
          else if (bilingualMessage.content.includes('| **German** |')) targetLanguage = 'German';
          else if (bilingualMessage.content.includes('| **Spanish** |')) targetLanguage = 'Spanish';
          else if (bilingualMessage.content.includes('| **Italian** |')) targetLanguage = 'Italian';
          else if (bilingualMessage.content.includes('| **Polish** |')) targetLanguage = 'Polish';
          else if (bilingualMessage.content.includes('| **Greek** |')) targetLanguage = 'Greek';
          else if (bilingualMessage.content.includes('| **Turkish** |')) targetLanguage = 'Turkish';
          else if (bilingualMessage.content.includes('| **Ukrainian** |')) targetLanguage = 'Ukrainian';
          else if (bilingualMessage.content.includes('| **Mandarin Chinese** |')) targetLanguage = 'Mandarin Chinese';
          else if (bilingualMessage.content.includes('| **Arabic** |')) targetLanguage = 'Arabic';
        }
        
        context += `\n\nCRITICAL BILINGUAL MODE ACTIVATED: The user has selected "Side by Side" bilingual mode. You MUST respond EXACTLY like AthroCymraeg does in Welsh bilingual mode.

MANDATORY FORMAT - NO EXCEPTIONS:
Your ENTIRE response must be a markdown table with NO text outside the table. Follow this EXACT format:

| **English** | **${targetLanguage}** |
|-------------|------------|
| Now let's start learning! Here are some ways I can help: | [EXACT TRANSLATION] |
| What would you like to work on today? | [EXACT TRANSLATION] |
|  |  |
| **[Vocabulary Practice]** | **[TRANSLATED OPTION NAME]** |
| Learn new words and phrases | [EXACT TRANSLATION] |
| **[Grammar Help]** | **[TRANSLATED OPTION NAME]** |
| Master grammar rules and structures | [EXACT TRANSLATION] |
| **[Conversation Practice]** | **[TRANSLATED OPTION NAME]** |
| Practice speaking and dialogue | [EXACT TRANSLATION] |
| **[Reading Comprehension]** | **[TRANSLATED OPTION NAME]** |
| Understand texts and literature | [EXACT TRANSLATION] |
| **[Writing Skills]** | **[TRANSLATED OPTION NAME]** |
| Improve your writing abilities | [EXACT TRANSLATION] |
| **[Cultural Insights]** | **[TRANSLATED OPTION NAME]** |
| Learn about culture and customs | [EXACT TRANSLATION] |

ABSOLUTELY FORBIDDEN RESPONSES:
❌ "Fantastic choice! This will help you..."
❌ "From now on, our conversations will look like this:"
❌ "Feel free to ask questions about..."
❌ ANY text before the table
❌ ANY text after the table
❌ ANY explanatory text

✅ ONLY THE TABLE - NOTHING ELSE
✅ Start immediately with | **English** | **${targetLanguage}** |
✅ All clickable options must be in **[brackets]** inside the table

🚨 MANDATORY BILINGUAL CONTENT RULE: When creating cards, flashcards, vocabulary, exercises, or ANY educational content in Side by Side mode, you MUST provide content in BOTH languages:
- EVERY vocabulary item must be in both English and ${targetLanguage}
- EVERY flashcard must contain bilingual content
- EVERY exercise must be in both languages
- EVERY example must be translated to both languages
- NEVER provide single-language content when in bilingual mode
- NO EXCEPTIONS - bilingual means bilingual for ALL content

This is NON-NEGOTIABLE. AthroCymraeg does this perfectly - you must do EXACTLY the same.`;
      }
      
      // Add placeholder assistant message for streaming
      const placeholderMessage: ChatMessage = { role: 'assistant' as const, content: '' };
      const messagesWithPlaceholder = [...updatedMessages, placeholderMessage];
      setMessages(messagesWithPlaceholder);
      setIsStreaming(prev => ({
        ...prev,
        [athro.id]: true
      }));
      setStreamingContent(prev => ({
        ...prev,
        [athro.id]: ''
      }));
      
      // Use streaming API with abort controller
      const streamingResponse = await chatService.current.sendMessageStream(
        updatedMessages, 
        context,
        (chunk: string) => {
          setStreamingContent(prev => ({
            ...prev,
            [athro.id]: chunk
          }));
          // Update the placeholder message with streaming content
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
              newMessages[newMessages.length - 1] = { 
                role: 'assistant' as const, 
                content: chunk 
              };
            }
            return newMessages;
          });
          
          // Auto-scroll to follow the streaming text
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: 'smooth'
              });
            }
          }, 10); // Small delay to ensure DOM update
        },
        abortController
      );
      
      console.log('Streaming completed');
      
      if (streamingResponse.error && streamingResponse.error !== 'Request was aborted') {
        console.error('Chat service error:', streamingResponse.error);
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'I apologize, but I encountered an error. Please try again.'
        };
        setMessages([...updatedMessages, errorMessage]);
      } else if (streamingResponse.content) {
        console.log('Final response received:', streamingResponse.content);
        // The final message should already be set by streaming, but ensure it's correct
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages.length > 0) {
            newMessages[newMessages.length - 1] = { 
              role: 'assistant' as const, 
              content: streamingResponse.content || '' 
            };
          }
          return newMessages;
        });
        
        // Detect and offer to save flashcards only if not aborted
        if (streamingResponse.content && streamingResponse.isComplete) {
          offerFlashcardSave(streamingResponse.content);
        }
      }
      
      // Clear indicators
      setIsTyping(prev => ({
        ...prev,
        [athro.id]: false
      }));
      setIsStreaming(prev => ({
        ...prev,
        [athro.id]: false
      }));
      setStreamingContent(prev => ({
        ...prev,
        [athro.id]: ''
      }));
      setCurrentAbortController(null);
      
    } catch (error: any) {
      console.error('Error in chat communication:', error);
      
      // Don't show error if it was intentionally aborted
      if (error.name !== 'AbortError') {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'I apologize, but I encountered an error. Please try again.'
        };
        setMessages([...updatedMessages, errorMessage]);
      }
      
      // Clear indicators
      setIsTyping(prev => ({
        ...prev,
        [athro.id]: false
      }));
      setIsStreaming(prev => ({
        ...prev,
        [athro.id]: false
      }));
      setStreamingContent(prev => ({
        ...prev,
        [athro.id]: ''
      }));
      setCurrentAbortController(null);
    }
  };

  // Add stop function to abort streaming
  const handleStop = () => {
    if (currentAbortController) {
      currentAbortController.abort();
      setCurrentAbortController(null);
      
      // Clear streaming indicators immediately
      setIsTyping(prev => ({
        ...prev,
        [athro.id]: false
      }));
      setIsStreaming(prev => ({
        ...prev,
        [athro.id]: false
      }));
      setStreamingContent(prev => ({
        ...prev,
        [athro.id]: ''
      }));
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === 'string') {
        const content = event.target.result;
        
        const userMessage: ChatMessage = {
          role: 'user',
          content: `I'm uploading a file named "${file.name}" with the following content:\n\n${content.slice(0, 1000)}${content.length > 1000 ? '...(content truncated)' : ''}`
        };
        
        setMessages(prev => [...prev, userMessage]);
        
        if (chatService.current) {
          setIsTyping(prev => ({
            ...prev,
            [athro.id]: true
          }));
          chatService.current.sendMessage([...messages, userMessage])
            .then(responseContent => {
              const response: ChatMessage = {
                role: 'assistant',
                content: responseContent
              };
              
              setMessages(prev => [...prev, response]);
            })
            .catch(error => {
              console.error('Error getting response:', error);
              setMessages(prev => [
                ...prev,
                {
                  role: 'assistant',
                  content: 'I apologize, but I encountered an error processing your file. Please try again.'
                }
              ]);
            })
            .finally(() => {
              setIsTyping(prev => ({
                ...prev,
                [athro.id]: false
              }));
            });
        }
      }
    };
    reader.readAsText(file);
  };

  const handleUploadResource = async (file: File) => {
    try {
      const athroId = athro.id;
      const topic = `Uploaded by ${athro.name}'s student`;
      
      // Use currentSessionId if available and not pending, otherwise use a temporary session
      const sessionId = (currentSessionId && currentSessionId !== 'pending-session') ? currentSessionId : 'temp-session';
      
      const resource = await SupabaseStudyService.createResource(file, {
        sessionId,
        athroId,
        subject: athro.subject,
        topic
      });
      
      // Add the resource to used resources
      setUsedResources(prev => [...prev, resource.id]);
      
      // Inform the user that the resource was uploaded successfully
      const userMessage: ChatMessage = {
        role: 'user',
        content: `Resource "${file.name}" has been uploaded. CLICK ON THE RESOURCE for me to read it.`
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      return resource;
    } catch (error) {
      console.error('Error uploading resource:', error);
      return null;
    }
  };
  
  // Add missing handleSaveStudy function
  const handleSaveStudy = async (customTitle?: string) => {
    try {
      if (messages.length <= 1) {
        console.log('No messages to save');
        return;
      }
      
      // Create a new study history entry
      const title = customTitle || `Study Session with ${athro.name} - ${formatCurrentDateTime()}`;
      
      // Get currently selected resources
      const resources = usedResources.length > 0 ?
        await Promise.all(usedResources.map(id => SupabaseStudyService.getResourceById(id))) :
        [];
      
      // Filter out any null resources
      const validResources = resources.filter(r => r !== null) as Resource[];
      
      const historyData: Omit<StudyHistory, 'id' | 'createdAt'> = {
        title,
        athroId: athro.id,
        messages,
        resources: usedResources,
        updatedAt: Date.now(),
        flashcards: [],
        notes: [],
        mindMaps: []
      };
      
      const savedHistory = await SupabaseStudyService.saveStudyHistory(historyData);
      console.log('Saved study history:', savedHistory);
      
      // Show success message
      const successMessage: ChatMessage = {
        role: 'system',
        content: `✅ Study session "${title}" has been saved successfully!`
      };
      
      setMessages(prev => [...prev, successMessage]);
      
    } catch (error) {
      console.error('Error saving study:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const handleLoadStudy = async (historyId: string) => {
    // This method is deprecated - session loading is now handled by loadSessionContent event
    console.warn('[ChatInterface] handleLoadStudy called but is deprecated. Use loadSessionContent event instead.');
  };

  const handleSelectResource = async (resourceId: string) => {
    if (!resourceId) return;
    
    try {
      setIsTyping(prev => ({
        ...prev,
        [athro.id]: true
      }));
      
      // Use PlaylistService to get the document by ID
      const document = await PlaylistService.getDocumentById(resourceId);
      if (!document) {
        console.error(`Document with ID ${resourceId} not found`);
        setIsTyping(prev => ({
          ...prev,
          [athro.id]: false
        }));
        return;
      }
      
      // Add the resource ID to used resources if not already present
      if (!usedResources.includes(resourceId)) {
        setUsedResources(prev => [...prev, resourceId]);
      }

      // Extract file name from document name
      const fileName = document.name || 'Unknown file';
      
      console.log(`Processing document: ${fileName}, type: ${document.fileType}`);
      
      // Check if we're dealing with an image
      const isImage = document.fileType?.toLowerCase().startsWith('image/');
      
      // Check if this is a PDF document
      const isPdf = document.fileType?.toLowerCase().includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
      
      // Handle images differently - fetch from storage and show them directly in chat
      if (isImage) {
        try {
          // Get the public URL for the image from playlist-documents storage
          const { data: publicUrl } = supabase.storage
            .from('playlist-documents')
            .getPublicUrl(document.storagePath);
          
          const imageMessage: ChatMessage = {
            role: 'system',
            content: `<img src="${publicUrl.publicUrl}" alt="${fileName}" style="max-width: 100%; max-height: 80vh;" />`
          };
          
          setMessages(prev => [...prev, imageMessage]);
        } catch (error) {
          console.error('Error loading image:', error);
          const errorMessage: ChatMessage = {
            role: 'assistant',
            content: 'I apologize, but I encountered an error loading this image. Please try again.'
          };
          setMessages(prev => [...prev, errorMessage]);
        }
        
        setIsTyping(prev => ({
          ...prev,
          [athro.id]: false
        }));
        return;
      }
      
      // Create a system message introducing the resource to the chat
      let systemMessage: ChatMessage;
      if (isPdf) {
        // For PDFs, a much simpler message
        systemMessage = {
          role: 'system',
          content: `${athro.name} is now reviewing the PDF document "${fileName}".`
        };
      } else {
        // For other resources, keep the detailed format
        const resourceInfo = `Resource: ${fileName}\nType: ${document.fileType}\nSize: ${Math.round(document.fileSize / 1024)}KB`;
        systemMessage = {
          role: 'system',
          content: `${athro.name} is now referencing the following resource:\n\n${resourceInfo}`
        };
      }
      
      // Add the system message to indicate the document is being reviewed
      setMessages(prev => [...prev, systemMessage]);
      
      // Process the document content silently in the background
      // The AI will have access to the processed content but we won't show it in chat
      let processedContent = '';
      if (!isImage) {
        try {
          // Create a Resource-compatible object for DocumentProcessingService
          const resourceForProcessing = {
            id: document.id,
            athroId: document.athroId,
            subject: athro.subject, // Use current athro's subject
            topic: 'User uploaded document', // Default topic
            resourceType: document.fileType,
            resourcePath: document.storagePath,
            createdAt: document.createdAt,
            updatedAt: document.createdAt // Use createdAt as updatedAt since we don't have it
          };
          
          const result = await DocumentProcessingService.processDocument(resourceForProcessing);
          processedContent = result.content;
          if (!processedContent || processedContent.trim().length === 0) {
            const errorMsg: ChatMessage = {
              role: 'assistant',
              content: '⚠️ The document appears to be empty or could not be processed. Please check the file and try again.'
            };
            setMessages(prev => [...prev, errorMsg]);
            setIsTyping(prev => ({
              ...prev,
              [athro.id]: false
            }));
            setIsStreaming(prev => ({
              ...prev,
              [athro.id]: false
            }));
            setStreamingContent(prev => ({
              ...prev,
              [athro.id]: ''
            }));
            return;
          }
          console.log('🔍 Processed content length:', processedContent.length);
          console.log('🔍 Processed content preview:', processedContent.substring(0, 200));
          console.log('🔍 Processed content contains fallback message:', processedContent.includes('Unable to extract text') || processedContent.includes('PDF processing failed') || processedContent.includes('I can\'t directly access'));
        } catch (error) {
          console.error('Error processing document:', error);
          processedContent = `Error processing document: ${error instanceof Error ? error.message : 'Unknown error'}`;
          const errorMsg: ChatMessage = {
            role: 'assistant',
            content: `⚠️ There was an error processing the document: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
          setMessages(prev => [...prev, errorMsg]);
          setIsTyping(prev => ({
            ...prev,
            [athro.id]: false
          }));
          setIsStreaming(prev => ({
            ...prev,
            [athro.id]: false
          }));
          setStreamingContent(prev => ({
            ...prev,
            [athro.id]: ''
          }));
          return;
        }
      }
      
      // Create a simple user message asking for help with the document
      const userMessage: ChatMessage = {
        role: 'user',
        content: `Please review this ${isPdf ? 'PDF' : 'document'}: ${fileName}`
      };
      
      try {
        if (!chatService.current) {
          throw new Error('Chat service not initialized');
        }
        
        // Pass the resource content in the context
        const context = `DOCUMENT ANALYSIS REQUEST: The user has shared a document named "${fileName}" of type "${document.fileType}".

FULL DOCUMENT CONTENT (READ AND USE THIS CONTENT):

${processedContent}

INSTRUCTIONS: You have been provided with the complete document content above. Please:
1. Read and analyze the actual document content provided
2. Reference specific parts of the document in your response
3. Provide insights and help based on the document's actual content
4. Do NOT say you cannot access or review the document - you have the full content
5. Give specific, relevant help based on what you read in the document

Please analyze this document and provide a helpful response to the user's request.`;
        
        console.log('🔍 Context being sent to AI:', context.substring(0, 500));
        console.log('🔍 Full context length:', context.length);
        console.log('🔍 Context contains document content:', context.includes('FULL DOCUMENT CONTENT'));
        console.log('🔍 Context contains processed content:', context.includes(processedContent.substring(0, 50)));
        
        // Add placeholder assistant message for streaming
        const placeholderMessage: ChatMessage = { role: 'assistant' as const, content: '' };
        const messagesWithPlaceholder = [...messages, systemMessage, userMessage, placeholderMessage];
        setMessages(messagesWithPlaceholder);
        setIsStreaming(prev => ({
          ...prev,
          [athro.id]: true
        }));
        setStreamingContent(prev => ({
          ...prev,
          [athro.id]: ''
        }));
        
        // Create abort controller for this request
        const abortController = new AbortController();
        setCurrentAbortController(abortController);
        
        // Use streaming API with abort controller
        const streamingResponse = await chatService.current.sendMessageStream(
          [...messages, systemMessage, userMessage],
          context,
          (chunk: string) => {
            setStreamingContent(prev => ({
              ...prev,
              [athro.id]: chunk
            }));
            // Update the placeholder message with streaming content
            setMessages(prev => {
              const newMessages = [...prev];
              if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
                newMessages[newMessages.length - 1] = { 
                  role: 'assistant' as const, 
                  content: chunk 
                };
              }
              return newMessages;
            });
          },
          abortController
        );
        
        if (streamingResponse.error && streamingResponse.error !== 'Request was aborted') {
          throw new Error(streamingResponse.error);
        }
        
        // Finalize the message only if not aborted
        if (streamingResponse.content && streamingResponse.isComplete) {
          const response: ChatMessage = {
            role: 'assistant' as const,
            content: streamingResponse.content
          };
          
          const finalMessages = [...messages, systemMessage, userMessage, response];
          setMessages(finalMessages);
          
          // Check if the response contains flashcard content and offer to save
          offerFlashcardSave(streamingResponse.content);
        }
      } catch (error: any) {
        console.error('Error getting response for resource:', error);
        
        // Don't show error if it was intentionally aborted
        if (error.name !== 'AbortError') {
          const errorMessage: ChatMessage = {
            role: 'assistant',
            content: `⚠️ I apologize, but I encountered an error processing this resource.\nError details: ${error instanceof Error ? error.message : String(error)}`
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      } finally {
        setIsTyping(prev => ({
          ...prev,
          [athro.id]: false
        }));
        setIsStreaming(prev => ({
          ...prev,
          [athro.id]: false
        }));
        setStreamingContent(prev => ({
          ...prev,
          [athro.id]: ''
        }));
        setCurrentAbortController(null);
      }
    } catch (error) {
      console.error('Error selecting resource:', error);
      
      // Add error message to chat
      const errorMsg: ChatMessage = {
        role: 'system',
        content: `There was an error retrieving the resource. Please try again.`
      };
      
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  // Handle welcome message option clicks
  const handleWelcomeOptionClick = async (option: string, messageIndex: number) => {
    // Prevent multiple simultaneous clicks
    if (isProcessingClickRef.current) return;
    isProcessingClickRef.current = true;
    
    try {
      let responseContent = '';
      let userMessage = '';
      
      // Handle language selection for AthroLanguages
      if (['French', 'German', 'Spanish', 'Italian', 'Polish', 'Greek', 'Turkish', 'Ukrainian', 'Mandarin Chinese', 'Arabic'].includes(option)) {
        const languageNatives = {
          'French': 'Français',
          'German': 'Deutsch', 
          'Spanish': 'Español',
          'Italian': 'Italiano',
          'Polish': 'Polski',
          'Greek': 'Ελληνικά',
          'Turkish': 'Türkçe',
          'Ukrainian': 'Українська',
          'Mandarin Chinese': '中文',
          'Arabic': 'العربية'
        };
        
        // Store the selected language for later use
        setSelectedLanguage(option);
        
        userMessage = `I'm studying ${option}`;
        responseContent = `Perfect! 🎯 You're studying **${option}** (${languageNatives[option as keyof typeof languageNatives]})\n\n💬 **Now, how would you like our conversations to be structured?**\n\n**[English Only]** - All responses in English\n**[${option} Only]** - All responses in ${option}\n**[Side by Side]** - Dual columns with English and ${option} together\n\nChoose your preferred conversation style!`;
      } else if (['English Only', 'Side by Side', 'Saesneg yn unig - English only', 'Cymraeg yn unig - Welsh only', 'Ochor yn ochor - Side by Side'].includes(option) || option.endsWith(' Only')) {
        // Handle conversation preference selection
        if (option === 'English Only' || option === 'Saesneg yn unig - English only') {
          userMessage = 'I prefer all responses in English';
          responseContent = `Great choice! 🇬🇧 I'll provide all my responses in **English only**.\n\nNow let's start learning! Here are some ways I can help:\n\n**[Vocabulary Practice]** - Learn new words and phrases\n**[Grammar Help]** - Master grammar rules and structures\n**[Conversation Practice]** - Practice speaking and dialogue\n**[Reading Comprehension]** - Understand texts and literature\n**[Writing Skills]** - Improve your writing abilities\n**[Cultural Insights]** - Learn about culture and customs\n\nWhat would you like to work on today?`;
        } else if (option === 'Cymraeg yn unig - Welsh only') {
          userMessage = 'Rydw i\'n hoffi pob ymateb yn Gymraeg yn unig';
          responseContent = `Dewis ardderchog! 🏴󠁧󠁢󠁷󠁬󠁳󠁿 Byddaf yn darparu pob ymateb yn **Gymraeg yn unig**.\n\nNawr gadewch i ni ddechrau dysgu! Dyma rai ffyrdd y gallaf eich helpu:\n\n**[Ymarfer Geirfa]** - Dysgu geiriau a ymadroddion newydd\n**[Help Gramadeg]** - Meistroli rheolau a strwythurau gramadeg\n**[Ymarfer Sgwrs]** - Ymarfer siarad a dialog\n**[Dealltwriaeth Ddarllen]** - Deall testunau a llenyddiaeth\n**[Sgiliau Ysgrifennu]** - Gwella eich galluoedd ysgrifennu\n**[Mewnwelediad Diwylliannol]** - Dysgu am ddiwylliant ac arferion\n\nBeth hoffech chi weithio arno heddiw?`;
        } else if (option === 'Side by Side' || option === 'Ochor yn ochor - Side by Side') {
          // Use the selected language for side-by-side format
          const languageTranslations = {
            'French': 'Maintenant, commençons à apprendre ! Voici quelques façons dont je peux vous aider :',
            'German': 'Lassen Sie uns jetzt mit dem Lernen beginnen! Hier sind einige Möglichkeiten, wie ich Ihnen helfen kann:',
            'Spanish': '¡Ahora empezamos a aprender! Aquí tienes algunas formas en las que puedo ayudarte:',
            'Italian': 'Ora iniziamo ad imparare! Ecco alcuni modi in cui posso aiutarti:',
            'Polish': 'Teraz zaczynamy się uczyć! Oto kilka sposobów, w jakie mogę Ci pomóc:',
            'Greek': 'Τώρα ας αρχίσουμε να μαθαίνουμε! Ορίστε μερικοί τρόποι που μπορώ να σας βοηθήσω:',
            'Turkish': 'Şimdi öğrenmeye başlayalım! Size yardımcı olabileceğim bazı yollar:',
            'Ukrainian': 'Тепер давайте почнемо вчитися! Ось кілька способів, якими я можу вам допомогти:',
            'Mandarin Chinese': '现在让我们开始学习！以下是我可以帮助您的几种方式：',
            'Arabic': 'الآن دعونا نبدأ التعلم! إليك بعض الطرق التي يمكنني مساعدتك بها:',
            'Welsh': 'Nawr gadewch i ni ddechrau dysgu! Dyma rai ffyrdd y gallaf eich helpu:'
          };
          
          // For Welsh athro, use Welsh as the target language
          const targetLanguage = option === 'Ochor yn ochor - Side by Side' ? 'Welsh' : (selectedLanguage || 'French');
          const translatedText = languageTranslations[targetLanguage as keyof typeof languageTranslations] || languageTranslations['French'];
          
          userMessage = 'All your responses from this point on will be responses in dual columns - English on the left and my target language on the right';
          
          // Create dual-column format with clickable cards INSIDE the table - EXACTLY like AthroCymraeg
          if (targetLanguage === 'Welsh') {
            responseContent = `| **English** | **${targetLanguage}** |
|-------------|------------|
| Now let's start learning! Here are some ways I can help: | ${translatedText} |
| What would you like to work on today? | Beth hoffech chi weithio arno heddiw? |
|  |  |
| **[Vocabulary Practice]** | **[Ymarfer Geirfa]** |
| Learn new words and phrases | Dysgu geiriau a ymadroddion newydd |
| **[Grammar Help]** | **[Help Gramadeg]** |
| Master grammar rules and structures | Meistroli rheolau a strwythurau gramadeg |
| **[Conversation Practice]** | **[Ymarfer Sgwrs]** |
| Practice speaking and dialogue | Ymarfer siarad a dialog |
| **[Reading Comprehension]** | **[Dealltwriaeth Ddarllen]** |
| Understand texts and literature | Deall testunau a llenyddiaeth |
| **[Writing Skills]** | **[Sgiliau Ysgrifennu]** |
| Improve your writing abilities | Gwella eich galluoedd ysgrifennu |
| **[Cultural Insights]** | **[Mewnwelediad Diwylliannol]** |
| Learn about culture and customs | Dysgu am ddiwylliant ac arferion |`;
          } else {
            // For other languages (French, German, Spanish, etc.)
            const languageVocabTranslations = {
              'French': { vocab: 'Pratique du Vocabulaire', grammar: 'Aide Grammaticale', conversation: 'Pratique de Conversation', reading: 'Compréhension de Lecture', writing: 'Compétences d\'Écriture', cultural: 'Aperçus Culturels', vocabDesc: 'Apprendre de nouveaux mots et phrases', grammarDesc: 'Maîtriser les règles et structures grammaticales', conversationDesc: 'Pratiquer la parole et le dialogue', readingDesc: 'Comprendre les textes et la littérature', writingDesc: 'Améliorer vos capacités d\'écriture', culturalDesc: 'Apprendre la culture et les coutumes', question: 'Sur quoi aimeriez-vous travailler aujourd\'hui ?' },
              'German': { vocab: 'Vokabelpraxis', grammar: 'Grammatikhilfe', conversation: 'Konversationspraxis', reading: 'Leseverständnis', writing: 'Schreibfähigkeiten', cultural: 'Kulturelle Einblicke', vocabDesc: 'Neue Wörter und Phrasen lernen', grammarDesc: 'Grammatikregeln und -strukturen meistern', conversationDesc: 'Sprechen und Dialog üben', readingDesc: 'Texte und Literatur verstehen', writingDesc: 'Ihre Schreibfähigkeiten verbessern', culturalDesc: 'Über Kultur und Bräuche lernen', question: 'Woran möchten Sie heute arbeiten?' },
              'Spanish': { vocab: 'Práctica de Vocabulario', grammar: 'Ayuda Gramatical', conversation: 'Práctica de Conversación', reading: 'Comprensión Lectora', writing: 'Habilidades de Escritura', cultural: 'Perspectivas Culturales', vocabDesc: 'Aprender nuevas palabras y frases', grammarDesc: 'Dominar reglas y estructuras gramaticales', conversationDesc: 'Practicar hablar y diálogo', readingDesc: 'Entender textos y literatura', writingDesc: 'Mejorar tus habilidades de escritura', culturalDesc: 'Aprender sobre cultura y costumbres', question: '¿En qué te gustaría trabajar hoy?' },
              'Italian': { vocab: 'Pratica del Vocabolario', grammar: 'Aiuto Grammaticale', conversation: 'Pratica di Conversazione', reading: 'Comprensione della Lettura', writing: 'Abilità di Scrittura', cultural: 'Approfondimenti Culturali', vocabDesc: 'Imparare nuove parole e frasi', grammarDesc: 'Padroneggiare regole e strutture grammaticali', conversationDesc: 'Praticare parlare e dialogo', readingDesc: 'Capire testi e letteratura', writingDesc: 'Migliorare le tue abilità di scrittura', culturalDesc: 'Imparare cultura e costumi', question: 'Su cosa vorresti lavorare oggi?' },
              'Polish': { vocab: 'Praktyka Słownictwa', grammar: 'Pomoc Gramatyczna', conversation: 'Praktyka Konwersacji', reading: 'Rozumienie Czytania', writing: 'Umiejętności Pisania', cultural: 'Wgląd Kulturowy', vocabDesc: 'Uczyć się nowych słów i fraz', grammarDesc: 'Opanować zasady i struktury gramatyczne', conversationDesc: 'Ćwiczyć mówienie i dialog', readingDesc: 'Rozumieć teksty i literaturę', writingDesc: 'Poprawić umiejętności pisania', culturalDesc: 'Uczyć się kultury i zwyczajów', question: 'Nad czym chciałbyś dziś pracować?' },
              'Greek': { vocab: 'Εξάσκηση Λεξιλογίου', grammar: 'Βοήθεια Γραμματικής', conversation: 'Εξάσκηση Συνομιλίας', reading: 'Κατανόηση Ανάγνωσης', writing: 'Δεξιότητες Συγγραφής', cultural: 'Πολιτιστικές Απόψεις', vocabDesc: 'Μάθετε νέες λέξεις και φράσεις', grammarDesc: 'Κατακτήστε κανόνες και δομές γραμματικής', conversationDesc: 'Εξασκηθείτε στην ομιλία και τον διάλογο', readingDesc: 'Κατανοήστε κείμενα και λογοτεχνία', writingDesc: 'Βελτιώστε τις ικανότητες γραφής σας', culturalDesc: 'Μάθετε για τον πολιτισμό και τα έθιμα', question: 'Σε τι θα θέλατε να εργαστείτε σήμερα;' },
              'Turkish': { vocab: 'Kelime Pratiği', grammar: 'Dilbilgisi Yardımı', conversation: 'Konuşma Pratiği', reading: 'Okuma Anlayışı', writing: 'Yazma Becerileri', cultural: 'Kültürel İçgörüler', vocabDesc: 'Yeni kelimeler ve ifadeler öğrenin', grammarDesc: 'Dilbilgisi kuralları ve yapılarında ustalaşın', conversationDesc: 'Konuşma ve diyalog pratiği yapın', readingDesc: 'Metinleri ve edebiyatı anlayın', writingDesc: 'Yazma yeteneklerinizi geliştirin', culturalDesc: 'Kültür ve gelenekler hakkında bilgi edinin', question: 'Bugün ne üzerinde çalışmak istersiniz?' },
              'Ukrainian': { vocab: 'Практика Лексики', grammar: 'Допомога з Граматики', conversation: 'Практика Розмови', reading: 'Розуміння Читання', writing: 'Навички Письма', cultural: 'Культурні Прозріння', vocabDesc: 'Вивчайте нові слова та фрази', grammarDesc: 'Опановуйте граматичні правила та структури', conversationDesc: 'Практикуйте мовлення та діалог', readingDesc: 'Розумійте тексти та літературу', writingDesc: 'Покращуйте свої навички письма', culturalDesc: 'Вивчайте культуру та звичаї', question: 'Над чим ви хотіли б попрацювати сьогодні?' },
              'Mandarin Chinese': { vocab: '词汇练习', grammar: '语法帮助', conversation: '对话练习', reading: '阅读理解', writing: '写作技能', cultural: '文化见解', vocabDesc: '学习新单词和短语', grammarDesc: '掌握语法规则和结构', conversationDesc: '练习口语和对话', readingDesc: '理解文本和文学', writingDesc: '提高写作能力', culturalDesc: '了解文化和习俗', question: '您今天想学习什么内容？' },
              'Arabic': { vocab: 'ممارسة المفردات', grammar: 'مساعدة النحو', conversation: 'ممارسة المحادثة', reading: 'فهم القراءة', writing: 'مهارات الكتابة', cultural: 'نظرات ثقافية', vocabDesc: 'تعلم كلمات وعبارات جديدة', grammarDesc: 'إتقان قواعد النحو والهياكل', conversationDesc: 'ممارسة التحدث والحوار', readingDesc: 'فهم النصوص والأدب', writingDesc: 'تحسين قدرات الكتابة', culturalDesc: 'تعلم الثقافة والعادات', question: 'ما الذي تود العمل عليه اليوم؟' }
            };
            
            const translations = languageVocabTranslations[targetLanguage as keyof typeof languageVocabTranslations] || languageVocabTranslations['French'];
            
            responseContent = `| **English** | **${targetLanguage}** |
|-------------|------------|
| Now let's start learning! Here are some ways I can help: | ${translatedText} |
| What would you like to work on today? | ${translations.question} |
|  |  |
| **[Vocabulary Practice]** | **[${translations.vocab}]** |
| Learn new words and phrases | ${translations.vocabDesc} |
| **[Grammar Help]** | **[${translations.grammar}]** |
| Master grammar rules and structures | ${translations.grammarDesc} |
| **[Conversation Practice]** | **[${translations.conversation}]** |
| Practice speaking and dialogue | ${translations.conversationDesc} |
| **[Reading Comprehension]** | **[${translations.reading}]** |
| Understand texts and literature | ${translations.readingDesc} |
| **[Writing Skills]** | **[${translations.writing}]** |
| Improve your writing abilities | ${translations.writingDesc} |
| **[Cultural Insights]** | **[${translations.cultural}]** |
| Learn about culture and customs | ${translations.culturalDesc} |`;
          }
        } else {
          // Handle "[Language] Only" options
          const language = option.replace(' Only', '');
          userMessage = `I prefer all responses in ${language}`;
          responseContent = `¡Perfecto! 🎯 Proporcionaré todas mis respuestas solo en **${language}**.\n\n¡Ahora empezamos a aprender! Aquí hay algunas formas en que puedo ayudarte:\n\n**[Práctica de Vocabulario]** - Aprende nuevas palabras y frases\n**[Ayuda de Gramática]** - Domina las reglas y estructuras gramaticales\n**[Práctica de Conversación]** - Practica hablar y el diálogo\n**[Comprensión de Lectura]** - Entiende textos y literatura\n**[Habilidades de Escritura]** - Mejora tus habilidades de escritura\n**[Perspectivas Culturales]** - Aprende sobre cultura y costumbres\n\n¿En qué te gustaría trabajar hoy?`;
        }
      } else {
        // Handle regular welcome options
        switch (option) {
        case 'upload':
          responseContent = `📁 **Upload Resources**\n\nTo upload resources, homework, or questions:\n\n1. **Go to the Resources tab** in the sidebar (on the right)\n2. **Click "Choose File"** and select your file\n3. **Add description (optional)** and click "Save Resource"\n4. **Once uploaded**, click on the resource in the list\n5. **I'll review it** and help you understand the content!\n\n💡 I can help with PDFs, documents, images, and more. Just upload and I'll analyze everything for you.\n\n**Quick Actions:**\n• [Upload PDF] - Upload a PDF document\n• [Upload Image] - Upload an image or screenshot\n• [Upload Document] - Upload Word, PowerPoint, or other files\n• [Ask About Upload] - Get help with the upload process`;
          userMessage = 'I want to upload resources, homework, or questions';
          break;
          
        case 'discuss':
          responseContent = `💬 **Let's Discuss Something!**\n\nI'd love to help you explore any topic, question, or subject! Here are some ideas:\n\n**Quick Discussion Starters:**\n• [Explain a Concept] - Ask me to explain something you're learning\n• [Homework Help] - Get help with a specific problem\n• [Real-world Examples] - See how concepts apply in practice\n• [Related Topics] - Explore connected subjects\n• [Different Explanation] - Get the same concept explained differently\n\nWhat would you like to discuss? Just type your question or topic below, or click one of the options above!`;
          userMessage = 'I want to discuss something in particular';
          break;
          
        case 'test':
          responseContent = `🧠 **Knowledge Testing Time!**\n\nGreat! I love helping students test their knowledge. Here are some ways we can do this:\n\n**Testing Options:**\n• [Create Quiz] - I'll make a quiz on any topic\n• [Practice Problems] - Get exercises to solve\n• [Concept Check] - Test your understanding\n• [Flashcard Review] - Go through key concepts\n• [Mock Exam] - Practice with exam-style questions\n• [Random Questions] - Get mixed questions on your subject\n\nWhat subject or topic would you like to be tested on? Click an option above or tell me!`;
          userMessage = 'I want to be tested on something';
          break;
          
        case 'other':
          responseContent = `🌟 **Something Else**\n\nOf course! I'm here to help with whatever you need. Here are some other things I can do:\n\n**Additional Help Options:**\n• [Study Plan] - Create a personalized study schedule\n• [Note-taking Tips] - Improve your study techniques\n• [Exam Prep] - Get ready for tests and exams\n• [Learning Strategies] - Find what works best for you\n• [Motivation] - Get encouragement and support\n• [Career Guidance] - Connect studies to future goals\n• [Time Management] - Learn to balance your studies\n\nWhat's on your mind? I'm here to help with anything!`;
          userMessage = 'I need help with something else';
          break;
          
        default:
          return; // Exit early if unknown option
        }
      }
      
      // Prevent multiple rapid clicks
      if (!userMessage || !responseContent) return;
      
      // Add both messages in a single state update to prevent multiple re-renders
      const userMsg: ChatMessage = { role: 'user', content: userMessage };
      const assistantMsg: ChatMessage = { role: 'assistant', content: responseContent };
      
      setMessages(prev => [...prev, userMsg, assistantMsg]);
    } finally {
      isProcessingClickRef.current = false;
    }
  };

  // Handle response option clicks
  const handleResponseOptionClick = async (option: string, messageIndex: number) => {
    // Prevent multiple simultaneous clicks
    if (isProcessingClickRef.current) return;
    isProcessingClickRef.current = true;

    try {
      let userMessage = '';
      
      // Handle different option types with more specific content
      switch (option) {
        case 'Upload PDF':
          userMessage = 'I want to upload a PDF document for help';
          break;
        case 'Upload Image':
          userMessage = 'I want to upload an image for help';
          break;
        case 'Upload Document':
          userMessage = 'I want to upload a document for help';
          break;
        case 'Ask About Upload':
          userMessage = 'I have questions about uploading files';
          break;
        case 'Explain a Concept':
          userMessage = 'I need help understanding a concept';
          break;
        case 'Homework Help':
          userMessage = 'I need help with my homework';
          break;
        case 'Real-world Examples':
          userMessage = 'I want to see real-world examples';
          break;
        case 'Related Topics':
          userMessage = 'I want to explore related topics';
          break;
        case 'Different Explanation':
          userMessage = 'I need a different explanation approach';
          break;
        case 'Create Quiz':
          userMessage = 'I want to create a quiz to test my knowledge';
          break;
        case 'Practice Problems':
          userMessage = 'I want practice problems to work through';
          break;
        case 'Concept Check':
          userMessage = 'I want to check my understanding of concepts';
          break;
        case 'Flashcard Review':
          userMessage = 'I want to review using flashcards';
          break;
        case 'Mock Exam':
          userMessage = 'I want to take a mock exam';
          break;
        case 'Random Questions':
          userMessage = 'Give me random questions on my subject';
          break;
        case 'Study Plan':
          userMessage = 'I need help creating a study plan';
          break;
        case 'Note-taking Tips':
          userMessage = 'I want tips for better note-taking';
          break;
        case 'Exam Prep':
          userMessage = 'I need help preparing for exams';
          break;
        case 'Learning Strategies':
          userMessage = 'I want to learn better study strategies';
          break;
        case 'Motivation':
          userMessage = 'I need motivation and encouragement';
          break;
        case 'Career Guidance':
          userMessage = 'I want career guidance related to my studies';
          break;
        case 'Time Management':
          userMessage = 'I need help with time management for studying';
          break;
        case 'Vocabulary Practice':
          userMessage = 'I want to practice vocabulary and learn new words';
          break;
        case 'Grammar Help':
          userMessage = 'I need help with grammar rules and structures';
          break;
        case 'Conversation Practice':
          userMessage = 'I want to practice speaking and dialogue';
          break;
        case 'Reading Comprehension':
          userMessage = 'I want to work on understanding texts and literature';
          break;
        case 'Writing Skills':
          userMessage = 'I want to improve my writing abilities';
          break;
        case 'Cultural Insights':
          userMessage = 'I want to learn about culture and customs';
          break;
        case 'Ymarfer Geirfa':
          userMessage = 'I want to practice vocabulary and learn new words';
          break;
        case 'Help Gramadeg':
          userMessage = 'I need help with grammar rules and structures';
          break;
        case 'Ymarfer Sgwrs':
          userMessage = 'I want to practice speaking and dialogue';
          break;
        case 'Dealltwriaeth Ddarllen':
          userMessage = 'I want to work on understanding texts and literature';
          break;
        case 'Sgiliau Ysgrifennu':
          userMessage = 'I want to improve my writing abilities';
          break;
        case 'Mewnwelediad Diwylliannol':
          userMessage = 'I want to learn about culture and customs';
          break;
        case 'Práctica de Vocabulario':
          userMessage = 'Quiero practicar vocabulario y aprender nuevas palabras';
          break;
        case 'Ayuda de Gramática':
          userMessage = 'Necesito ayuda con las reglas y estructuras gramaticales';
          break;
        case 'Práctica de Conversación':
          userMessage = 'Quiero practicar hablar y el diálogo';
          break;
        case 'Comprensión de Lectura':
          userMessage = 'Quiero trabajar en entender textos y literatura';
          break;
        case 'Habilidades de Escritura':
          userMessage = 'Quiero mejorar mis habilidades de escritura';
          break;
        case 'Perspectivas Culturales':
          userMessage = 'Quiero aprender sobre cultura y costumbres';
          break;
        // French options
        case 'Pratique du Vocabulaire':
          userMessage = 'Je veux pratiquer le vocabulaire et apprendre de nouveaux mots';
          break;
        case 'Aide Grammaticale':
          userMessage = 'J\'ai besoin d\'aide avec les règles et structures grammaticales';
          break;
        case 'Pratique de Conversation':
          userMessage = 'Je veux pratiquer la parole et le dialogue';
          break;
        case 'Compréhension de Lecture':
          userMessage = 'Je veux travailler sur la compréhension des textes et de la littérature';
          break;
        case 'Compétences d\'Écriture':
          userMessage = 'Je veux améliorer mes capacités d\'écriture';
          break;
        case 'Aperçus Culturels':
          userMessage = 'Je veux apprendre la culture et les coutumes';
          break;
        // German options
        case 'Vokabelpraxis':
          userMessage = 'Ich möchte Vokabeln üben und neue Wörter lernen';
          break;
        case 'Grammatikhilfe':
          userMessage = 'Ich brauche Hilfe bei Grammatikregeln und -strukturen';
          break;
        case 'Konversationspraxis':
          userMessage = 'Ich möchte sprechen und Dialog üben';
          break;
        case 'Leseverständnis':
          userMessage = 'Ich möchte an dem Verstehen von Texten und Literatur arbeiten';
          break;
        case 'Schreibfähigkeiten':
          userMessage = 'Ich möchte meine Schreibfähigkeiten verbessern';
          break;
        case 'Kulturelle Einblicke':
          userMessage = 'Ich möchte über Kultur und Bräuche lernen';
          break;
        // Italian options
        case 'Pratica del Vocabolario':
          userMessage = 'Voglio praticare il vocabolario e imparare nuove parole';
          break;
        case 'Aiuto Grammaticale':
          userMessage = 'Ho bisogno di aiuto con le regole e le strutture grammaticali';
          break;
        case 'Pratica di Conversazione':
          userMessage = 'Voglio praticare il parlato e il dialogo';
          break;
        case 'Comprensione della Lettura':
          userMessage = 'Voglio lavorare sulla comprensione di testi e letteratura';
          break;
        case 'Abilità di Scrittura':
          userMessage = 'Voglio migliorare le mie abilità di scrittura';
          break;
        case 'Approfondimenti Culturali':
          userMessage = 'Voglio imparare la cultura e i costumi';
          break;
        // Polish options
        case 'Praktyka Słownictwa':
          userMessage = 'Chcę ćwiczyć słownictwo i uczyć się nowych słów';
          break;
        case 'Pomoc Gramatyczna':
          userMessage = 'Potrzebuję pomocy z zasadami i strukturami gramatycznymi';
          break;
        case 'Praktyka Konwersacji':
          userMessage = 'Chcę ćwiczyć mówienie i dialog';
          break;
        case 'Rozumienie Czytania':
          userMessage = 'Chcę pracować nad rozumieniem tekstów i literatury';
          break;
        case 'Umiejętności Pisania':
          userMessage = 'Chcę poprawić swoje umiejętności pisania';
          break;
        case 'Wgląd Kulturowy':
          userMessage = 'Chcę uczyć się kultury i zwyczajów';
          break;
        // Greek options
        case 'Εξάσκηση Λεξιλογίου':
          userMessage = 'Θέλω να εξασκήσω το λεξιλόγιο και να μάθω νέες λέξεις';
          break;
        case 'Βοήθεια Γραμματικής':
          userMessage = 'Χρειάζομαι βοήθεια με τους κανόνες και τις δομές γραμματικής';
          break;
        case 'Εξάσκηση Συνομιλίας':
          userMessage = 'Θέλω να εξασκήσω την ομιλία και τον διάλογο';
          break;
        case 'Κατανόηση Ανάγνωσης':
          userMessage = 'Θέλω να δουλέψω στην κατανόηση κειμένων και λογοτεχνίας';
          break;
        case 'Δεξιότητες Συγγραφής':
          userMessage = 'Θέλω να βελτιώσω τις ικανότητες γραφής μου';
          break;
        case 'Πολιτιστικές Απόψεις':
          userMessage = 'Θέλω να μάθω τον πολιτισμό και τα έθιμα';
          break;
        // Turkish options
        case 'Kelime Pratiği':
          userMessage = 'Kelime pratiği yapmak ve yeni kelimeler öğrenmek istiyorum';
          break;
        case 'Dilbilgisi Yardımı':
          userMessage = 'Dilbilgisi kuralları ve yapıları konusunda yardıma ihtiyacım var';
          break;
        case 'Konuşma Pratiği':
          userMessage = 'Konuşma ve diyalog pratiği yapmak istiyorum';
          break;
        case 'Okuma Anlayışı':
          userMessage = 'Metin ve edebiyat anlayışı üzerine çalışmak istiyorum';
          break;
        case 'Yazma Becerileri':
          userMessage = 'Yazma yeteneklerimi geliştirmek istiyorum';
          break;
        case 'Kültürel İçgörüler':
          userMessage = 'Kültür ve gelenekler hakkında bilgi edinmek istiyorum';
          break;
        // Ukrainian options
        case 'Практика Лексики':
          userMessage = 'Я хочу практикувати лексику та вивчати нові слова';
          break;
        case 'Допомога з Граматики':
          userMessage = 'Мені потрібна допомога з граматичними правилами та структурами';
          break;
        case 'Практика Розмови':
          userMessage = 'Я хочу практикувати мовлення та діалог';
          break;
        case 'Розуміння Читання':
          userMessage = 'Я хочу працювати над розумінням текстів та літератури';
          break;
        case 'Навички Письма':
          userMessage = 'Я хочу покращити свої навички письма';
          break;
        case 'Культурні Прозріння':
          userMessage = 'Я хочу вивчати культуру та звичаї';
          break;
        // Mandarin Chinese options
        case '词汇练习':
          userMessage = '我想练习词汇并学习新单词';
          break;
        case '语法帮助':
          userMessage = '我需要语法规则和结构的帮助';
          break;
        case '对话练习':
          userMessage = '我想练习口语和对话';
          break;
        case '阅读理解':
          userMessage = '我想提高对文本和文学的理解';
          break;
        case '写作技能':
          userMessage = '我想提高我的写作能力';
          break;
        case '文化见解':
          userMessage = '我想了解文化和习俗';
          break;
        // Arabic options
        case 'ممارسة المفردات':
          userMessage = 'أريد ممارسة المفردات وتعلم كلمات جديدة';
          break;
        case 'مساعدة النحو':
          userMessage = 'أحتاج إلى مساعدة في قواعد النحو والهياكل';
          break;
        case 'ممارسة المحادثة':
          userMessage = 'أريد ممارسة التحدث والحوار';
          break;
        case 'فهم القراءة':
          userMessage = 'أريد العمل على فهم النصوص والأدب';
          break;
        case 'مهارات الكتابة':
          userMessage = 'أريد تحسين قدرات الكتابة';
          break;
        case 'نظرات ثقافية':
          userMessage = 'أريد تعلم الثقافة والعادات';
          break;
        case 'English Only':
          userMessage = 'I want all our conversations to be in English only';
          break;
        case 'French Only':
          userMessage = 'Je veux que toutes nos conversations soient uniquement en français';
          break;
        case 'German Only':
          userMessage = 'Ich möchte, dass alle unsere Gespräche nur auf Deutsch sind';
          break;
        case 'Spanish Only':
          userMessage = 'Quiero que todas nuestras conversaciones sean solo en español';
          break;
        case 'Italian Only':
          userMessage = 'Voglio che tutte le nostre conversazioni siano solo in italiano';
          break;
        case 'Polish Only':
          userMessage = 'Chcę, żeby wszystkie nasze rozmowy były tylko po polsku';
          break;
        case 'Greek Only':
          userMessage = 'Θέλω όλες οι συζητήσεις μας να είναι μόνο στα ελληνικά';
          break;
        case 'Turkish Only':
          userMessage = 'Tüm konuşmalarımızın sadece Türkçe olmasını istiyorum';
          break;
        case 'Ukrainian Only':
          userMessage = 'Я хочу, щоб усі наші розмови були лише українською';
          break;
        case 'Mandarin Chinese Only':
          userMessage = '我希望我们所有的对话都只用中文';
          break;
        case 'Arabic Only':
          userMessage = 'أريد أن تكون جميع محادثاتنا باللغة العربية فقط';
          break;
        case 'Side by Side':
          userMessage = 'All your responses from this point on will be responses in dual columns - English on the left and my target language on the right';
          // Directly provide table response instead of going to API
          const targetLanguage = selectedLanguage || 'Italian'; // Default to Italian for AthroLanguages
          const languageOptions: Record<string, Record<string, string>> = {
            'Spanish': {
              'Vocabulary Practice': 'Práctica de Vocabulario',
              'Grammar Help': 'Ayuda con Gramática', 
              'Conversation Practice': 'Práctica de Conversación',
              'Reading Comprehension': 'Comprensión de Lectura',
              'Writing Skills': 'Habilidades de Escritura',
              'Cultural Insights': 'Perspectivas Culturales',
              'startLearning': '¡Ahora comencemos a aprender! Aquí hay algunas formas en que puedo ayudar:',
              'whatWork': '¿En qué te gustaría trabajar hoy?',
              'learnWords': 'Aprende nuevas palabras y frases',
              'masterGrammar': 'Domina las reglas y estructuras gramaticales',
              'practiceSpeak': 'Practica el habla y el diálogo',
              'understandTexts': 'Comprende textos y literatura',
              'improveWriting': 'Mejora tus habilidades de escritura',
              'learnCulture': 'Aprende sobre cultura y costumbres'
            },
            'French': {
              'Vocabulary Practice': 'Pratique du Vocabulaire',
              'Grammar Help': 'Aide Grammaticale',
              'Conversation Practice': 'Pratique de Conversation',
              'Reading Comprehension': 'Compréhension de Lecture',
              'Writing Skills': 'Compétences Rédactionnelles',
              'Cultural Insights': 'Aperçus Culturels',
              'startLearning': 'Maintenant, commençons à apprendre ! Voici quelques façons dont je peux vous aider :',
              'whatWork': 'Sur quoi aimeriez-vous travailler aujourd\'hui ?',
              'learnWords': 'Apprendre de nouveaux mots et expressions',
              'masterGrammar': 'Maîtriser les règles et structures grammaticales',
              'practiceSpeak': 'Pratiquer la parole et le dialogue',
              'understandTexts': 'Comprendre les textes et la littérature',
              'improveWriting': 'Améliorer vos compétences en écriture',
              'learnCulture': 'Apprendre la culture et les coutumes'
            },
            'German': {
              'Vocabulary Practice': 'Vokabelpraxis',
              'Grammar Help': 'Grammatikhilfe',
              'Conversation Practice': 'Gesprächspraxis',
              'Reading Comprehension': 'Leseverständnis',
              'Writing Skills': 'Schreibfähigkeiten',
              'Cultural Insights': 'Kulturelle Einblicke',
              'startLearning': 'Jetzt lasst uns mit dem Lernen beginnen! Hier sind einige Möglichkeiten, wie ich helfen kann:',
              'whatWork': 'Woran möchten Sie heute arbeiten?',
              'learnWords': 'Neue Wörter und Phrasen lernen',
              'masterGrammar': 'Grammatikregeln und -strukturen meistern',
              'practiceSpeak': 'Sprechen und Dialog üben',
              'understandTexts': 'Texte und Literatur verstehen',
              'improveWriting': 'Ihre Schreibfähigkeiten verbessern',
              'learnCulture': 'Kultur und Bräuche lernen'
            },
            'Polish': {
              'Vocabulary Practice': 'Praktyka Słownictwa',
              'Grammar Help': 'Pomoc Gramatyczna',
              'Conversation Practice': 'Praktyka Konwersacji',
              'Reading Comprehension': 'Rozumienie Tekstu',
              'Writing Skills': 'Umiejętności Pisania',
              'Cultural Insights': 'Wgląd Kulturowy',
              'startLearning': 'Teraz zacznijmy naukę! Oto kilka sposobów, w jakie mogę pomóc:',
              'whatWork': 'Nad czym chciałbyś dziś pracować?',
              'learnWords': 'Naucz się nowych słów i fraz',
              'masterGrammar': 'Opanuj zasady i struktury gramatyczne',
              'practiceSpeak': 'Ćwicz mówienie i dialog',
              'understandTexts': 'Zrozum teksty i literaturę',
              'improveWriting': 'Popraw swoje umiejętności pisania',
              'learnCulture': 'Poznaj kulturę i zwyczaje'
            },
            'Italian': {
              'Vocabulary Practice': 'Pratica del Vocabolario',
              'Grammar Help': 'Aiuto Grammaticale',
              'Conversation Practice': 'Pratica di Conversazione',
              'Reading Comprehension': 'Comprensione della Lettura',
              'Writing Skills': 'Abilità di Scrittura',
              'Cultural Insights': 'Approfondimenti Culturali',
              'startLearning': 'Ora iniziamo a imparare! Ecco alcuni modi in cui posso aiutare:',
              'whatWork': 'Su cosa vorresti lavorare oggi?',
              'learnWords': 'Impara nuove parole e frasi',
              'masterGrammar': 'Padroneggia regole e strutture grammaticali',
              'practiceSpeak': 'Pratica il parlato e il dialogo',
              'understandTexts': 'Comprendi testi e letteratura',
              'improveWriting': 'Migliora le tue abilità di scrittura',
              'learnCulture': 'Impara cultura e costumi'
            },
            'Greek': {
              'Vocabulary Practice': 'Εξάσκηση Λεξιλογίου',
              'Grammar Help': 'Βοήθεια Γραμματικής',
              'Conversation Practice': 'Εξάσκηση Συνομιλίας',
              'Reading Comprehension': 'Κατανόηση Ανάγνωσης',
              'Writing Skills': 'Δεξιότητες Συγγραφής',
              'Cultural Insights': 'Πολιτιστικές Απόψεις',
              'startLearning': 'Τώρα ας αρχίσουμε να μαθαίνουμε! Ορίστε μερικοί τρόποι που μπορώ να σας βοηθήσω:',
              'whatWork': 'Σε τι θα θέλατε να εργαστείτε σήμερα;',
              'learnWords': 'Μάθετε νέες λέξεις και φράσεις',
              'masterGrammar': 'Κατακτήστε κανόνες και δομές γραμματικής',
              'practiceSpeak': 'Εξασκηθείτε στην ομιλία και τον διάλογο',
              'understandTexts': 'Κατανοήστε κείμενα και λογοτεχνία',
              'improveWriting': 'Βελτιώστε τις ικανότητες γραφής σας',
              'learnCulture': 'Μάθετε για τον πολιτισμό και τα έθιμα'
            },
            'Turkish': {
              'Vocabulary Practice': 'Kelime Pratiği',
              'Grammar Help': 'Dilbilgisi Yardımı',
              'Conversation Practice': 'Konuşma Pratiği',
              'Reading Comprehension': 'Okuma Anlayışı',
              'Writing Skills': 'Yazma Becerileri',
              'Cultural Insights': 'Kültürel İçgörüler',
              'startLearning': 'Şimdi öğrenmeye başlayalım! Size yardımcı olabileceğim bazı yollar:',
              'whatWork': 'Bugün ne üzerinde çalışmak istersiniz?',
              'learnWords': 'Yeni kelimeler ve ifadeler öğrenin',
              'masterGrammar': 'Dilbilgisi kuralları ve yapılarında ustalaşın',
              'practiceSpeak': 'Konuşma ve diyalog pratiği yapın',
              'understandTexts': 'Metinleri ve edebiyatı anlayın',
              'improveWriting': 'Yazma yeteneklerinizi geliştirin',
              'learnCulture': 'Kültür ve gelenekler hakkında bilgi edinin'
            },
            'Ukrainian': {
              'Vocabulary Practice': 'Практика Лексики',
              'Grammar Help': 'Допомога з Граматики',
              'Conversation Practice': 'Практика Розмови',
              'Reading Comprehension': 'Розуміння Читання',
              'Writing Skills': 'Навички Письма',
              'Cultural Insights': 'Культурні Прозріння',
              'startLearning': 'Тепер давайте почнемо вчитися! Ось кілька способів, якими я можу вам допомогти:',
              'whatWork': 'Над чим ви хотіли б попрацювати сьогодні?',
              'learnWords': 'Вивчайте нові слова та фрази',
              'masterGrammar': 'Опановуйте граматичні правила та структури',
              'practiceSpeak': 'Практикуйте мовлення та діалог',
              'understandTexts': 'Розумійте тексти та літературу',
              'improveWriting': 'Покращуйте свої навички письма',
              'learnCulture': 'Вивчайте культуру та звичаї'
            },
            'Mandarin Chinese': {
              'Vocabulary Practice': '词汇练习',
              'Grammar Help': '语法帮助',
              'Conversation Practice': '对话练习',
              'Reading Comprehension': '阅读理解',
              'Writing Skills': '写作技能',
              'Cultural Insights': '文化见解',
              'startLearning': '现在让我们开始学习！以下是我可以帮助您的几种方式：',
              'whatWork': '您今天想学习什么内容？',
              'learnWords': '学习新单词和短语',
              'masterGrammar': '掌握语法规则和结构',
              'practiceSpeak': '练习口语和对话',
              'understandTexts': '理解文本和文学',
              'improveWriting': '提高写作能力',
              'learnCulture': '了解文化和习俗'
            },
            'Arabic': {
              'Vocabulary Practice': 'ممارسة المفردات',
              'Grammar Help': 'مساعدة النحو',
              'Conversation Practice': 'ممارسة المحادثة',
              'Reading Comprehension': 'فهم القراءة',
              'Writing Skills': 'مهارات الكتابة',
              'Cultural Insights': 'نظرات ثقافية',
              'startLearning': 'الآن دعونا نبدأ التعلم! إليك بعض الطرق التي يمكنني مساعدتك بها:',
              'whatWork': 'ما الذي تود العمل عليه اليوم؟',
              'learnWords': 'تعلم كلمات وعبارات جديدة',
              'masterGrammar': 'إتقان قواعد النحو والهياكل',
              'practiceSpeak': 'ممارسة التحدث والحوار',
              'understandTexts': 'فهم النصوص والأدب',
              'improveWriting': 'تحسين قدرات الكتابة',
              'learnCulture': 'تعلم الثقافة والعادات'
            }
          };
          
          const options = languageOptions[targetLanguage] || languageOptions['Italian'];
          
          // Provide direct table response - exactly like AthroCymraeg
          const responseContent = `| **English** | **${targetLanguage}** |
|-------------|------------|
| Now let's start learning! Here are some ways I can help: | ${options['startLearning']} |
| What would you like to work on today? | ${options['whatWork']} |
|  |  |
| **[Vocabulary Practice]** | **[${options['Vocabulary Practice']}]** |
| Learn new words and phrases | ${options['learnWords']} |
| **[Grammar Help]** | **[${options['Grammar Help']}]** |
| Master grammar rules and structures | ${options['masterGrammar']} |
| **[Conversation Practice]** | **[${options['Conversation Practice']}]** |
| Practice speaking and dialogue | ${options['practiceSpeak']} |
| **[Reading Comprehension]** | **[${options['Reading Comprehension']}]** |
| Understand texts and literature | ${options['understandTexts']} |
| **[Writing Skills]** | **[${options['Writing Skills']}]** |
| Improve your writing abilities | ${options['improveWriting']} |
| **[Cultural Insights]** | **[${options['Cultural Insights']}]** |
| Learn about culture and customs | ${options['learnCulture']} |`;
          
          // Add both messages directly and return early
          const userMsg: ChatMessage = { role: 'user', content: userMessage };
          const assistantMsg: ChatMessage = { role: 'assistant', content: responseContent };
          setMessages(prev => [...prev, userMsg, assistantMsg]);
          return;
        default:
          return; // Exit early if unknown option
      }
      
      if (!userMessage) return;
      
      // Create user message
      const userMsg: ChatMessage = { role: 'user', content: userMessage };
      
      // Get AI response with streaming
      if (chatService.current) {
        try {
          // Create abort controller for this request
          const abortController = new AbortController();
          setCurrentAbortController(abortController);

          setIsTyping(prev => ({
            ...prev,
            [athro.id]: true
          }));
          
          // Add user message and placeholder for assistant response in one atomic update
          setMessages(prev => [
            ...prev,
            userMsg,
            { role: 'assistant' as const, content: '' } // Placeholder for streaming
          ]);
          
          setIsStreaming(prev => ({
            ...prev,
            [athro.id]: true
          }));
          setStreamingContent(prev => ({
            ...prev,
            [athro.id]: ''
          }));
          
          // Prepare messages for API call (without the placeholder)
          const messagesForAPI = await new Promise<ChatMessage[]>((resolve) => {
            setMessages(prev => {
              const apiMessages = [...prev.slice(0, -1)]; // Remove placeholder
              resolve(apiMessages);
              return prev; // Keep current state
            });
          });
          
          const context = `athroId: ${athro.id}`;
          
          // Use streaming API with abort controller
          const streamingResponse = await chatService.current.sendMessageStream(
            messagesForAPI, 
            context,
            (chunk: string) => {
              setStreamingContent(prev => ({
                ...prev,
                [athro.id]: chunk
              }));
              // Update the placeholder message with streaming content
              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
                  newMessages[newMessages.length - 1] = { 
                    role: 'assistant' as const, 
                    content: chunk 
                  };
                }
                return newMessages;
              });
              
              // Auto-scroll to follow the streaming text
              setTimeout(() => {
                if (messagesContainerRef.current) {
                  messagesContainerRef.current.scrollTo({
                    top: messagesContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                  });
                }
              }, 10); // Small delay to ensure DOM update
            },
            abortController
          );
          
          if (streamingResponse.error && streamingResponse.error !== 'Request was aborted') {
            throw new Error(streamingResponse.error);
          }
          
          // Finalize the message only if not aborted
          if (streamingResponse.content && streamingResponse.isComplete) {
            const assistantMsg: ChatMessage = { role: 'assistant', content: streamingResponse.content };
            setMessages(prev => {
              const newMessages = [...prev];
              if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
                newMessages[newMessages.length - 1] = assistantMsg;
              }
              return newMessages;
            });
            
            // Check if the response contains flashcard content and offer to save
            offerFlashcardSave(streamingResponse.content);
          }
        } catch (error: any) {
          console.error('Error getting response:', error);
          
          // Don't show error if it was intentionally aborted
          if (error.name !== 'AbortError') {
            const errorMsg: ChatMessage = {
              role: 'assistant',
              content: '⚠️ I apologize, but I encountered an error. Please try again or type your question directly.'
            };
            setMessages(prev => {
              const newMessages = [...prev];
              if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant' && newMessages[newMessages.length - 1].content === '') {
                // Replace placeholder with error message
                newMessages[newMessages.length - 1] = errorMsg;
              } else {
                // Add error message
                newMessages.push(errorMsg);
              }
              return newMessages;
            });
          }
        } finally {
          setIsTyping(prev => ({
            ...prev,
            [athro.id]: false
          }));
          setIsStreaming(prev => ({
            ...prev,
            [athro.id]: false
          }));
          setStreamingContent(prev => ({
            ...prev,
            [athro.id]: ''
          }));
          setCurrentAbortController(null);
          isProcessingClickRef.current = false;
        }
      }
    } finally {
      isProcessingClickRef.current = false;
    }
  };

  // Extract clickable options from response messages
  const extractClickableOptions = (content: string): string[] => {
    const options: string[] = [];
    
    // Match patterns like [Option Name] - description
    const optionRegex = /\[([^\]]+)\]/g;
    let match;
    
    while ((match = optionRegex.exec(content)) !== null) {
      const optionName = match[1].trim();
      // Only include options that are in our known list
      const knownOptions = [
        'Upload PDF', 'Upload Image', 'Upload Document', 'Ask About Upload',
        'Explain a Concept', 'Homework Help', 'Real-world Examples', 'Related Topics', 'Different Explanation',
        'Create Quiz', 'Practice Problems', 'Concept Check', 'Flashcard Review', 'Mock Exam', 'Random Questions',
        'Study Plan', 'Note-taking Tips', 'Exam Prep', 'Learning Strategies', 'Motivation', 'Career Guidance', 'Time Management',
        'Vocabulary Practice', 'Grammar Help', 'Conversation Practice', 'Reading Comprehension', 'Writing Skills', 'Cultural Insights',
        'Práctica de Vocabulario', 'Ayuda de Gramática', 'Práctica de Conversación', 'Comprensión de Lectura', 'Habilidades de Escritura', 'Perspectivas Culturales',
        'English Only', 'Side by Side', 'French Only', 'German Only', 'Spanish Only', 'Italian Only', 'Polish Only', 'Greek Only', 'Turkish Only', 'Ukrainian Only', 'Mandarin Chinese Only', 'Arabic Only'
      ];
      
      if (knownOptions.includes(optionName)) {
        options.push(optionName);
      }
    }
    
    return options;
  };

  // Function to generate structured flashcard content
  const generateStructuredFlashcardContent = (flashcards: Array<{title: string, front: string, back: string}>) => {
    let content = `💾 **Flashcard Content Ready to Copy!**\n\nHere are your flashcards in a structured format. You can copy and paste these details into the Flashcards section in your study tools sidebar:\n\n`;
    
    flashcards.forEach((card, index) => {
      // Limit front and back to 200 characters each
      const truncatedFront = card.front.length > 200 ? card.front.substring(0, 200) + '...' : card.front;
      const truncatedBack = card.back.length > 200 ? card.back.substring(0, 200) + '...' : card.back;
      
      content += `📝 **Flashcard ${index + 1}: ${card.title}**\n**Front:** ${truncatedFront}\n**Back:** ${truncatedBack}\n\n`;
    });
    
    content += `💡 **Instructions:**\n\n1. **Copy the content above** - Select all the flashcard content from "📝 Flashcard 1" onwards\n2. **Open your Flashcards section** - Click on the Flashcards tab in your study tools sidebar\n3. **Paste and create** - Paste the content and use the "Create Flashcard" feature to add them to your study collection\n4. **Review regularly** - Set reminders and review these flashcards to reinforce your learning\n\n🎯 **Tip:** You can review these anytime and set reminders for when you should review them!`;
    
    return content;
  };

  // Function to detect flashcard content in messages
  const detectFlashcardContent = (content: string): {
    front: string;
    back: string;
    topic: string;
  } | null => {
    // Simple and robust pattern that catches the interactive quiz format
    // This pattern looks for: Flashcard #X: followed by question, then any content, then "Correct Answer:"
    const interactivePattern = /Flashcard\s*#\d+:\s*\n\n(.*?)\n\n.*?\n\n.*?\n\n.*?\n\n(.*?)\n\nCorrect Answer:\.?\s*(.*?)(?=\n\n|Would you like|Next question|$)/s;
    
    const match = content.match(interactivePattern);
    if (match) {
      const [, question, feedback, correctAnswer] = match;
      
      // Extract a meaningful title from the question (first 6 words)
      const questionWords = question.trim().split(' ');
      let title = questionWords.length > 0 ? questionWords.slice(0, 6).join(' ') : 'Flashcard Question';
      if (questionWords.length > 6) title += '...';
      
      return {
        front: question.trim(),
        back: `${feedback.trim()}\n\nCorrect Answer: ${correctAnswer.trim()}`,
        topic: title
      };
    }

    // Alternative pattern that's even more flexible
    const flexiblePattern = /Flashcard\s*#\d+:\s*\n\n(.*?)\n\n.*?\n\n.*?\n\n.*?\n\n(.*?)\n\nCorrect Answer[:\s]*(.*?)(?=\n\n|Would you like|Next question|$)/s;
    
    const flexibleMatch = content.match(flexiblePattern);
    if (flexibleMatch) {
      const [, question, feedback, correctAnswer] = flexibleMatch;
      
      // Extract a meaningful title from the question (first 6 words)
      const questionWords = question.trim().split(' ');
      let title = questionWords.length > 0 ? questionWords.slice(0, 6).join(' ') : 'Flashcard Question';
      if (questionWords.length > 6) title += '...';
      
      return {
        front: question.trim(),
        back: `${feedback.trim()}\n\nCorrect Answer: ${correctAnswer.trim()}`,
        topic: title
      };
    }

    // Pattern for direct flashcard format: "Flashcard X: Front: ... Back: ..."
    const directFlashcardPattern = /Flashcard\s*\d+:\s*\n\nFront:\s*(.*?)\n\nBack:\s*(.*?)(?=\n\n|What's your answer|Would you like|Next question|$)/s;
    
    const directMatch = content.match(directFlashcardPattern);
    if (directMatch) {
      const [, front, back] = directMatch;
      
      // Extract a meaningful title from the front content
      const frontWords = front.trim().split(' ');
      let title = frontWords.length > 0 ? frontWords.slice(0, 6).join(' ') : 'Flashcard Question';
      if (frontWords.length > 6) title += '...';
      
      return {
        front: front.trim(),
        back: back.trim(),
        topic: title
      };
    }

    // Fallback patterns for other formats
    const patterns = [
      // Pattern 1: "Flashcard X:" followed by Term/Description and Your Task with feedback
      /Flashcard\s*\d+:\s*\n(?:Term|Description):\s*"([^"]+)"\s*\n\s*Your Task:\s*(.*?)\n.*?✅\s*Feedback:\s*(.*?)(?=\n\n|Flashcard|\\nGreat work!|\\nAbsolutely,|$)/s,
      // Pattern 2: "📖 Flashcard X" followed by question and answer with "Your turn:" and "✅ Correct!"
      /📖\s*Flashcard\s*\d+\s*\n(.*?)\n.*?Your turn:\s*(.*?)\n.*?✅\s*Correct!.*?\n(.*?)(?=\n\n|Flashcard|\\nGreat work!|\\nAbsolutely,|$)/s,
      // Pattern 3: "Flashcard X Front: ... Back: ..." format
      /Flashcard\s*\d+\s*\nFront:\s*(.*?)\nBack:\s*(.*?)(?=\n\n|Flashcard|\\nThese flashcards cover|\\nWould you like to explore|$)/s
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        if (pattern.source.includes('Front:') && pattern.source.includes('Back:')) {
          // Completed flashcard format
          const [, front, back] = match;
          const frontWords = front.trim().split(' ');
          let title = frontWords.length > 0 ? frontWords.slice(0, 6).join(' ') : 'Flashcard';
          if (frontWords.length > 6) title += '...';
          
          return {
            front: front.trim(),
            back: back.trim(),
            topic: title
          };
        } else {
          // Other patterns
          const [, question, feedback, correctAnswer] = match;
          const questionWords = question.trim().split(' ');
          let title = questionWords.length > 0 ? questionWords.slice(0, 6).join(' ') : 'Flashcard Question';
          if (questionWords.length > 6) title += '...';
          
          return {
            front: question.trim(),
            back: `${feedback.trim()}\n\nCorrect Answer: ${correctAnswer.trim()}`,
            topic: title
          };
        }
      }
    }

    // Special pattern for the feedback-based flashcards with multiple cards
    const multiCardPattern = /Flashcard\s*\d+:\s*\n(?:Term|Description):\s*"([^"]+)"\s*\n\s*Your Task:\s*(.*?)\n.*?✅\s*Feedback:\s*(.*?)(?=\n\n|Flashcard|\\nGreat work!|\\nAbsolutely,|$)/gs;
    const multiCardMatches = [...content.matchAll(multiCardPattern)];
    
    if (multiCardMatches.length > 0) {
      // Use the first match for now (we could extend this to handle multiple cards)
      const [, term, task, feedback] = multiCardMatches[0];
      return {
        front: `Term: "${term}"\nYour Task: ${task.trim()}`,
        back: feedback.trim(),
        topic: athro.subject
      };
    }

    return null;
  };

  // Function to handle flashcard save
  const handleFlashcardSave = async () => {
    if (!flashcardToSave) return;

    try {
      const sessionId = currentSessionId || 'temp-session';
      await SupabaseStudyService.createFlashcard({
        athroId: athro.id,
        subject: athro.subject,
        topic: flashcardSaveTitle || flashcardToSave.topic,
        front: flashcardSaveFront || flashcardToSave.front,
        back: flashcardSaveBack || flashcardToSave.back
      }, sessionId);

      // Add success message
      const successMsg: ChatMessage = {
        role: 'assistant',
        content: `✅ **Flashcard saved successfully!**\n\nYour flashcard has been added to your study tools. You can find it in the Flashcards section of the sidebar.\n\n💡 **Tip:** You can review your flashcards anytime by opening the Flashcards tab in the study tools panel.`
      };

      setMessages(prev => [...prev, successMsg]);
      setShowFlashcardSave(false);
      setFlashcardToSave(null);
      setFlashcardSaveTitle('');
      setFlashcardSaveFront('');
      setFlashcardSaveBack('');
    } catch (error) {
      console.error('Error saving flashcard:', error);
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `⚠️ **Error saving flashcard**\n\nThere was an error saving your flashcard. Please try again or manually create it in the Flashcards section.`
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  // Function to detect multiple flashcards in a session
  const detectMultipleFlashcards = (content: string): Array<{title: string, front: string, back: string}> => {
    const flashcards: Array<{title: string, front: string, back: string}> = [];
    
    // Pattern for multiple flashcards with feedback
    const multiCardPattern = /Flashcard\s*\d+:\s*\n(?:Term|Description):\s*"([^"]+)"\s*\n\s*Your Task:\s*(.*?)\n.*?✅\s*Feedback:\s*(.*?)(?=\n\n|Flashcard|\\nGreat work!|\\nAbsolutely,|$)/gs;
    const multiCardMatches = [...content.matchAll(multiCardPattern)];
    
    if (multiCardMatches.length > 1) {
      multiCardMatches.forEach((match, index) => {
        const [, term, task, feedback] = match;
        // Use the term as the title if available, otherwise fallback to first 8 words of the task
        let title = term && term.trim() ? term.trim() : (task.trim().split(' ').slice(0, 8).join(' ') + (task.trim().split(' ').length > 8 ? '...' : ''));
        flashcards.push({
          title,
          front: `Term: "${term}"
Your Task: ${task.trim()}`,
          back: feedback.trim()
        });
      });
    }
    
    // Pattern for completed flashcard sets (like the example you showed)
    const completedSetPattern = /Flashcard\s*(\d+)\s*\nFront:\s*(.*?)\nBack:\s*(.*?)(?=\n\n|Flashcard|\\nThese flashcards cover|\\nWould you like to explore|$)/gs;
    const completedSetMatches = [...content.matchAll(completedSetPattern)];
    
    if (completedSetMatches.length > 0) {
      completedSetMatches.forEach((match, index) => {
        const [, cardNumber, front, back] = match;
        // Extract a meaningful title from the front content
        const frontWords = front.trim().split(' ');
        let title = frontWords.length > 0 ? frontWords.slice(0, 6).join(' ') : `Flashcard ${cardNumber}`;
        if (frontWords.length > 6) title += '...';
        
        flashcards.push({
          title,
          front: front.trim(),
          back: back.trim()
        });
      });
    }
    
    // Pattern for interactive quiz format - each question-answer-feedback cycle
    const interactivePattern = /(?:Flashcard\s*\d+:\s*)?(.*?)\n.*?(?:Your turn:|What is your answer?|Please answer:)\s*(.*?)\n.*?(?:✅\s*Correct!|✅\s*Feedback:|Great answer!|Good job!)\s*(.*?)(?=\n\n|Flashcard|\nLet's move on|\nNext question|\n$)/gs;
    const interactiveMatches = [...content.matchAll(interactivePattern)];
    
    if (interactiveMatches.length > 0) {
      interactiveMatches.forEach((match, index) => {
        const [, question, studentAnswer, feedback] = match;
        // Extract a meaningful title from the question
        const questionWords = question.trim().split(' ');
        let title = questionWords.length > 0 ? questionWords.slice(0, 6).join(' ') : `Question ${index + 1}`;
        if (questionWords.length > 6) title += '...';
        
        flashcards.push({
          title,
          front: question.trim(),
          back: feedback.trim()
        });
      });
    }
    
    // Pattern for interactive quiz format with "Flashcard #X:" structure
    const interactiveQuizPattern = /Flashcard\s*#?\d+:\s*\n\n(.*?)\n\n(?:Take a moment|Think about|Type your answer).*?\n\n.*?\n\n(?:Feedback:|You're on the right track|Great answer!|Good job!)\s*(.*?)\n\n(?:Correct Answer:|The correct answer is:)\s*(.*?)(?=\n\n|Would you like to try|Let's move on|Next question|$)/gs;
    const interactiveQuizMatches = [...content.matchAll(interactiveQuizPattern)];
    
    if (interactiveQuizMatches.length > 0) {
      interactiveQuizMatches.forEach((match, index) => {
        const [, question, feedback, correctAnswer] = match;
        // Extract a meaningful title from the question
        const questionWords = question.trim().split(' ');
        let title = questionWords.length > 0 ? questionWords.slice(0, 6).join(' ') : `Question ${index + 1}`;
        if (questionWords.length > 6) title += '...';
        
        flashcards.push({
          title,
          front: question.trim(),
          back: `${feedback.trim()}\n\nCorrect Answer: ${correctAnswer.trim()}`
        });
      });
    }
    
    // Pattern for the actual interactive format being used with 4 capture groups
    const actualInteractivePattern = /Flashcard\s*#\d+:\s*\n\n(.*?)\n\n(?:Think about|Take a moment).*?\n\n.*?\n\n(?:You're absolutely right|Great job!|Good answer!|Excellent!)\s*(.*?)\n\n(?:Feedback:|Your answer)\s*(.*?)\n\n(?:Correct Answer:|The correct answer is:)\s*(.*?)(?=\n\n|Would you like to go on|Next question|$)/gs;
    const actualInteractiveMatches = [...content.matchAll(actualInteractivePattern)];
    
    if (actualInteractiveMatches.length > 0) {
      actualInteractiveMatches.forEach((match, index) => {
        const [, question, positiveFeedback, detailedFeedback, correctAnswer] = match;
        // Extract a meaningful title from the question
        const questionWords = question.trim().split(' ');
        let title = questionWords.length > 0 ? questionWords.slice(0, 6).join(' ') : `Question ${index + 1}`;
        if (questionWords.length > 6) title += '...';
        
        flashcards.push({
          title,
          front: question.trim(),
          back: `${positiveFeedback.trim()}\n\n${detailedFeedback.trim()}\n\nCorrect Answer: ${correctAnswer.trim()}`
        });
      });
    }
    
    return flashcards;
  };

  // Function to offer flashcard save
  const offerFlashcardSave = (content: string) => {
    const flashcardData = detectFlashcardContent(content);
    const multipleFlashcards = detectMultipleFlashcards(content);
    
    if (multipleFlashcards.length > 1) {
      // Handle multiple flashcards
      const structuredContent = generateStructuredFlashcardContent(multipleFlashcards);
      const multiCardMsg: ChatMessage = {
        role: 'assistant',
        content: structuredContent
      };
      
      setMessages(prev => [...prev, multiCardMsg]);
    } else if (flashcardData) {
      setFlashcardToSave(flashcardData);
      setFlashcardSaveTitle(flashcardData.topic);
      setFlashcardSaveFront(flashcardData.front);
      setFlashcardSaveBack(flashcardData.back);
      setShowFlashcardSave(true);
      
      // Add informational message about the save feature with structured format
      const infoMsg: ChatMessage = {
        role: 'assistant',
        content: `💾 **Flashcard Detected!**\n\nI noticed you just reviewed a flashcard. Here's the content in a structured format that you can copy and paste into your study tools:\n\n**Title:** ${flashcardData.topic}\n**Front:** ${flashcardData.front.length > 200 ? flashcardData.front.substring(0, 200) + '...' : flashcardData.front}\n**Back:** ${flashcardData.back.length > 200 ? flashcardData.back.substring(0, 200) + '...' : flashcardData.back}\n\n💡 **Tip:** You can copy these details and paste them into the Flashcards section in your study tools sidebar. You can review them anytime and set reminders for when you should review them!`
      };
      
      setMessages(prev => [...prev, infoMsg]);
    }
    
    // Check for flashcard review session explanations
    const flashcardSessionPatterns = [
      /Flashcard Review Session Explained/i,
      /Flashcard Review Explained/i,
      /how do flashcard sessions work/i,
      /flashcard sessions are a fantastic way/i,
      /🌟 Flashcard Review Explained/i,
      /💡 Flashcard Review Explained/i
    ];
    
    const isFlashcardSessionExplanation = flashcardSessionPatterns.some(pattern => pattern.test(content));
    
    // Only add the session format message if the original content doesn't already include format information
    const alreadyHasFormatInfo = content.includes('Flashcard Session Format') || 
                                content.includes('💾 Flashcard Session Format') ||
                                content.includes('structured format') ||
                                content.includes('Title: [Topic Name]') ||
                                content.includes('Front: [Question/Term]') ||
                                content.includes('Back: [Answer/Definition]') ||
                                content.includes('💾 Ready to start?') ||
                                content.includes('Ready to start? Just let me know what topic you\'d like to focus on!') ||
                                content.includes('_____') ||
                                content.includes('💾 **Flashcard Session Format**') ||
                                content.includes('When we do flashcard sessions, I\'ll provide the content in this structured format:') ||
                                content.includes('You can then copy and paste these details into the Flashcards section');
    
    if (isFlashcardSessionExplanation && !alreadyHasFormatInfo) {
      const sessionInfoMsg: ChatMessage = {
        role: 'assistant',
        content: `💾 **Flashcard Session Format**\n\nWhen we do flashcard sessions, I'll provide the content in this structured format:\n\n**Title:** [Topic Name]\n**Front:** [Question/Term]\n**Back:** [Answer/Definition]\n\nYou can then copy and paste these details into the Flashcards section in your study tools sidebar. You can review them anytime and set reminders for when you should review them!\n\n💡 **Ready to start?** Just let me know what topic you'd like to focus on!`
      };
      
      setMessages(prev => [...prev, sessionInfoMsg]);
    }
    
    // Also check if user is asking to save flashcards
    const saveRequestPatterns = [
      /can i save it\?/i,
      /save this/i,
      /save the flashcard/i,
      /save these flashcards/i,
      /save to flashcards/i
    ];
    
    const isSaveRequest = saveRequestPatterns.some(pattern => pattern.test(content));
    if (isSaveRequest && !flashcardData && !isFlashcardSessionExplanation && multipleFlashcards.length === 0) {
      // If user is asking to save but we didn't detect flashcard content, offer help
      const helpMsg: ChatMessage = {
        role: 'assistant',
        content: `💾 **Save Flashcards**\n\nI can help you save flashcards to your study tools! When I present flashcards in our chat, I'll automatically provide them in a structured format:\n\n**Title:** [Topic Name]\n**Front:** [Question/Term]\n**Back:** [Answer/Definition]\n\nYou can then copy and paste these details into the Flashcards section in your study tools sidebar. You can review them anytime and set reminders for when you should review them!\n\n💡 **Tip:** You can also manually create flashcards in the Flashcards section of the sidebar anytime.`
      };
      
      setMessages(prev => [...prev, helpMsg]);
    }
  };

  const handleSaveSession = () => {
    if (onSaveSession) {
      onSaveSession();
    } else {
      // Fallback to internal handler if no prop provided
      // Check if there's an actual conversation (more than just welcome message)
      const userMessages = messages.filter(m => m.role === 'user');
      
      if (userMessages.length === 0) {
        showError('Nothing to Save', 'Start a conversation first before saving!', 4000);
        return;
      }
      
      // Save current session and create new one
      const saveSession = async () => {
        try {
          const newSession = await ChatSessionService.archiveAndCreateNewSession(athro.id, messages);
          setCurrentSession(newSession);
          
          // Clear messages and add full welcome message with options
          const athroPersonality = ATHRO_PERSONALITIES[athro.id];
          const subject = athroPersonality?.subject || athro.subject || 'General';
          
          let welcomeContent = '';
          
          // Special welcome message for AthroLanguages
          if (athro.id === 'athro-languages') {
            welcomeContent = `Hi${userPreferredName ? ` ${userPreferredName}` : ''}! **${athro.name}** here to help! 🎓\n\nI'm your ${subject} tutor and I'm excited to work with you!\n\n🌍 **First, let's choose your target language:**\n\n**[French]** Français\n**[German]** Deutsch\n**[Spanish]** Español\n**[Italian]** Italiano\n**[Polish]** Polski\n**[Greek]** Ελληνικά\n**[Turkish]** Türkçe\n**[Ukrainian]** Українська\n**[Mandarin Chinese]** 中文\n**[Arabic]** العربية\n\nClick on the language you're studying, and I'll customize everything for you!`;
          } else {
            // Standard welcome message for other athros
            welcomeContent = `Hi${userPreferredName ? ` ${userPreferredName}` : ''}! **${athro.name}** here to help! 🎓\n\nI'm your ${subject} tutor and I'm excited to work with you. Here are some options to get started:\n\n**[1] 📁 Upload Resources** - Share homework, questions, or study materials\n**[2] 💬 Discuss Something** - Ask about topics, concepts, or problems\n**[3] 🧠 Test Your Knowledge** - Practice with quizzes and exercises\n**[4] 🌟 Something Else** - Study planning, tips, or other help\n\nClick any option above to get started, or just type your question below!`;
          }
          
          const welcomeMessage: ChatMessage = {
            role: 'assistant',
            content: welcomeContent
          };
          setMessages([welcomeMessage]);
          
          // Show success notification instead of alert
          showSuccess('Session Saved', 'Starting fresh with a new conversation', 3000);
        } catch (error) {
          console.error('Error saving session:', error);
          showError('Save Failed', 'Could not save session. Please try again.', 5000);
        }
      };
      saveSession();
    }
  };

  const handleDeleteSession = () => {
    if (onDeleteSession) {
      onDeleteSession();
    } else {
      // Enhanced delete functionality that works for any session state
      // No confirmation needed - delete should be immediate and reversible via backup
      const deleteSession = async () => {
        try {
          const newSession = await ChatSessionService.deleteAndCreateNewSession(athro.id);
          setCurrentSession(newSession);
          
          // Clear all messages and state
          setMessages([]);
          setUsedResources([]);
          setInputValue('');
          
          // Clear any streaming states
          setIsTyping({});
          setIsStreaming({});
          setStreamingContent({});
          
          // Create fresh welcome message
          const athroPersonality = ATHRO_PERSONALITIES[athro.id];
          const subject = athroPersonality?.subject || athro.subject || 'General';
          
          let welcomeContent = '';
          
          // Special welcome message for AthroLanguages
          if (athro.id === 'athro-languages') {
            welcomeContent = `Hi${userPreferredName ? ` ${userPreferredName}` : ''}! **${athro.name}** here to help! 🎓\n\nI'm your ${subject} tutor and I'm excited to work with you!\n\n🌍 **First, let's choose your target language:**\n\n**[French]** Français\n**[German]** Deutsch\n**[Spanish]** Español\n**[Italian]** Italiano\n**[Polish]** Polski\n**[Greek]** Ελληνικά\n**[Turkish]** Türkçe\n**[Ukrainian]** Українська\n**[Mandarin Chinese]** 中文\n**[Arabic]** العربية\n\nClick on the language you're studying, and I'll customize everything for you!`;
          } else if (athro.id === 'athro-welsh') {
            // Special welcome message for AthroCymraeg with Welsh greeting and language options
            welcomeContent = `Shwmae! Sut hoffech chi gyfathrebu?\n\nHow would you like to communicate?\n\n**[Saesneg yn unig - English only]** - All responses in English\n**[Cymraeg yn unig - Welsh only]** - All responses in Welsh\n**[Ochor yn ochor - Side by Side]** - Dual columns with English and Welsh together\n\nChoose your preferred conversation style!`;
          } else {
            // Standard welcome message for other athros
            welcomeContent = `Hi${userPreferredName ? ` ${userPreferredName}` : ''}! **${athro.name}** here to help! 🎓\n\nI'm your ${subject} tutor and I'm excited to work with you. Here are some options to get started:\n\n**[1] 📁 Upload Resources** - Share homework, questions, or study materials\n**[2] 💬 Discuss Something** - Ask about topics, concepts, or problems\n**[3] 🧠 Test Your Knowledge** - Practice with quizzes and exercises\n**[4] 🌟 Something Else** - Study planning, tips, or other help\n\nClick any option above to get started, or just type your question below!`;
          }
          
          const welcomeMessage: ChatMessage = {
            role: 'assistant',
            content: welcomeContent
          };
          
          setMessages([welcomeMessage]);
          
          // Clear study tools in the sidebar
          window.dispatchEvent(new CustomEvent('clearStudyTools'));
          
          // Scroll to top of messages
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
          
          // Show success notification instead of alert
          showSuccess('Chat Deleted', 'Session cleared and restarted fresh', 3000);
        } catch (error) {
          console.error('Error deleting session:', error);
          // Show error notification instead of alert
          showError('Delete Failed', 'Could not delete session. Please try again.', 5000);
        }
      };
      deleteSession();
    }
  };

  const handleViewHistory = () => {
    console.log('[ChatInterface] handleViewHistory called, onViewHistory prop:', !!onViewHistory);
    if (onViewHistory) {
      console.log('[ChatInterface] Calling prop onViewHistory');
      onViewHistory();
    } else {
      // Fallback to internal handler if no prop provided
      console.log('[ChatInterface] No prop onViewHistory, using internal setIsHistoryOpen');
      setIsHistoryOpen(true);
    }
  };



  // Memoize the session action handlers to prevent infinite loops
  const handleSaveSessionCallback = useCallback(() => {
    handleSaveSession();
  }, []);

  const handleDeleteSessionCallback = useCallback(() => {
    handleDeleteSession();
  }, []);

  const handleViewHistoryCallback = useCallback(() => {
    handleViewHistory();
  }, []);

  // Handle session actions from WorkPage
  useEffect(() => {
    if (sessionAction && onSessionActionComplete) {
      switch (sessionAction) {
        case 'save':
          handleSaveSessionCallback();
          break;
        case 'delete':
          handleDeleteSessionCallback();
          break;
        case 'history':
          handleViewHistoryCallback();
          break;
      }
      onSessionActionComplete();
    }
  }, [sessionAction, onSessionActionComplete]); // Removed callback functions since they have empty dependencies

  // Event handlers
  const handleSessionCreated = useCallback((e: CustomEvent) => {
    console.log('[ChatInterface] Session created event received:', e.detail);
    if (e.detail?.athroId === athroRef.current.id) {
      console.log('[ChatInterface] Session created for this athro, clearing current session');
      setCurrentSession(null);
      setMessages([]);
      
      // Re-initialize session
      sessionInitialized.current.delete(athroRef.current.id);
    }
  }, []); // Stable with ref usage
  
  const handleSessionDeleted = useCallback(() => {
    console.log('[ChatInterface] Session deleted event received');
    // Clear current session if it's deleted
    setCurrentSession(null);
    setMessages([]);
    
    // Re-initialize session
    sessionInitialized.current.delete(athroRef.current.id);
  }, []); // Stable
  
  const handleLoadSessionTools = useCallback((e: CustomEvent) => {
    console.log('[ChatInterface] Load session tools event received:', e.detail);
    if (e.detail?.athroId === athroRef.current.id) {
      console.log('[ChatInterface] Loading session tools for this athro');
      // Handle loading session tools
    }
  }, []); // Stable with ref usage
  
  const handleLoadSessionContent = useCallback(async (e: any) => {
    console.log('[ChatInterface] Load session content event received:', e.detail);
    if (e.detail?.sessionId && e.detail?.sessionData && e.detail?.athroId === athroRef.current.id) {
      console.log('[ChatInterface] Loading session content with full restore');
      
      const { sessionData, sessionId } = e.detail;
      
      try {
        // 1. Restore ALL original messages exactly as they were
        console.log(`[ChatInterface] Restoring ${sessionData.messages?.length || 0} messages`);
        if (sessionData.messages && Array.isArray(sessionData.messages)) {
          setMessages(sessionData.messages);
          messagesRef.current = sessionData.messages;
        }
        
        // 2. Set the current session to the loaded session
        const restoredSession = {
          id: sessionId,
          athroId: athroRef.current.id,
          messages: sessionData.messages || [],
          createdAt: sessionData.createdAt || Date.now(),
          updatedAt: Date.now(),
          isActive: true
        };
        setCurrentSession(restoredSession);
        currentSessionRef.current = restoredSession;
        
        // 3. Notify sidebar to load ALL associated study tools and resources
        console.log('[ChatInterface] Notifying sidebar to load session tools and resources');
        
        // Clear existing tools first
        window.dispatchEvent(new CustomEvent('clearStudyTools'));
        
        // Load session-specific tools and resources
        window.dispatchEvent(new CustomEvent('loadSessionTools', {
          detail: {
            sessionId,
            athroId: athroRef.current.id,
            resources: sessionData.resources || [],
            mindMaps: sessionData.mindMaps || [],
            notes: sessionData.notes || [],
            flashcards: sessionData.flashcards || []
          }
        }));
        
        // 4. Update the ChatSessionService to reflect the loaded session
        await ChatSessionService.saveActiveSession(athroRef.current.id, sessionData.messages || []);
        
        console.log('[ChatInterface] Session content fully restored:', {
          sessionId,
          messageCount: sessionData.messages?.length || 0,
          resourceCount: sessionData.resources?.length || 0,
          mindMapCount: sessionData.mindMaps?.length || 0,
          noteCount: sessionData.notes?.length || 0,
          flashcardCount: sessionData.flashcards?.length || 0
        });
        
        // 5. Scroll to bottom to show the conversation
        setTimeout(() => {
          scrollToLastAIResponse();
        }, 100);
        
      } catch (error) {
        console.error('[ChatInterface] Error loading session content:', error);
      }
    }
  }, []); // Stable with ref usage
  
  const handleRequestChatMessages = useCallback(() => {
    console.log('[ChatInterface] Chat messages requested, sending current messages');
    window.dispatchEvent(new CustomEvent('returnChatMessages', {
      detail: {
        athroId: athroRef.current.id,
        messages: messagesRef.current,
        sessionId: currentSessionRef.current?.id
      }
    }));
  }, []); // Stable with ref usage
  
  const handleSessionSaved = useCallback(() => {
    console.log('[ChatInterface] Session saved event received');
    // Session was saved, might want to refresh UI
  }, []);
  
  const handleClearSpecificAthroSession = useCallback((e: any) => {
    console.log('[ChatInterface] Clear specific athro session:', e.detail);
    if (e.detail?.athroId === athroRef.current.id) {
      console.log('[ChatInterface] Clearing session for this athro');
      setCurrentSession(null);
      sessionInitialized.current.delete(athroRef.current.id);
      
      // CRITICAL FIX: Immediately create new welcome message after clearing
      const currentAthro = athroRef.current;
      const athroPersonality = ATHRO_PERSONALITIES[currentAthro.id];
      const subject = athroPersonality?.subject || currentAthro.subject || 'General';
      
      let welcomeContent = '';
      
      // Special welcome message for AthroLanguages
      if (currentAthro.id === 'athro-languages') {
        welcomeContent = `Hi${userPreferredName ? ` ${userPreferredName}` : ''}! **${currentAthro.name}** here to help! 🎓\n\nI'm your ${subject} tutor and I'm excited to work with you!\n\n🌍 **First, let's choose your target language:**\n\n**[French]** Français\n**[German]** Deutsch\n**[Spanish]** Español\n**[Italian]** Italiano\n**[Polish]** Polski\n**[Greek]** Ελληνικά\n**[Turkish]** Türkçe\n**[Ukrainian]** Українська\n**[Mandarin Chinese]** 中文\n**[Arabic]** العربية\n\nClick on the language you're studying, and I'll customize everything for you!`;
      } else if (currentAthro.id === 'athro-welsh') {
        // Special welcome message for AthroCymraeg with Welsh greeting and language options
        welcomeContent = `Shwmae! Sut hoffech chi gyfathrebu?\n\nHow would you like to communicate?\n\n**[Saesneg yn unig - English only]** - All responses in English\n**[Cymraeg yn unig - Welsh only]** - All responses in Welsh\n**[Ochor yn ochor - Side by Side]** - Dual columns with English and Welsh together\n\nChoose your preferred conversation style!`;
      } else {
        // Standard welcome message for other athros
        welcomeContent = `Hi${userPreferredName ? ` ${userPreferredName}` : ''}! **${currentAthro.name}** here to help! 🎓\n\nI'm your ${subject} tutor and I'm excited to work with you. Here are some options to get started:\n\n**[1] 📁 Upload Resources** - Share homework, questions, or study materials\n**[2] 💬 Discuss Something** - Ask about topics, concepts, or problems\n**[3] 🧠 Test Your Knowledge** - Practice with quizzes and exercises\n**[4] 🌟 Something Else** - Study planning, tips, or other help\n\nClick any option above to get started, or just type your question below!`;
      }
      
      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: welcomeContent
      };
      
      const newMessages = [welcomeMessage];
      setMessages(newMessages);
      
      // Create and save new session
      ChatSessionService.saveActiveSession(currentAthro.id, newMessages).then(newSession => {
        setCurrentSession(newSession);
        console.log('[ChatInterface] Created new session after clear:', newSession.id);
      }).catch(error => {
        console.error('[ChatInterface] Error creating session after clear:', error);
      });
    }
  }, [userPreferredName]); // Stable with ref usage

  useEffect(() => {
    window.addEventListener('sessionCreated', handleSessionCreated as EventListener);
    window.addEventListener('sessionDeleted', handleSessionDeleted);
    window.addEventListener('loadSessionTools', handleLoadSessionTools as EventListener);
    window.addEventListener('loadSessionContent', handleLoadSessionContent as unknown as EventListener);
    window.addEventListener('requestChatMessages', handleRequestChatMessages);
    window.addEventListener('sessionSaved', handleSessionSaved);
    window.addEventListener('clearSpecificAthroSession', handleClearSpecificAthroSession);

    return () => {
      window.removeEventListener('sessionCreated', handleSessionCreated as EventListener);
      window.removeEventListener('sessionDeleted', handleSessionDeleted);
      window.removeEventListener('loadSessionTools', handleLoadSessionTools as EventListener);
      window.removeEventListener('loadSessionContent', handleLoadSessionContent as unknown as EventListener);
      window.removeEventListener('requestChatMessages', handleRequestChatMessages);
      window.removeEventListener('sessionSaved', handleSessionSaved);
      window.removeEventListener('clearSpecificAthroSession', handleClearSpecificAthroSession);
    };
  }, []); // CRITICAL FIX: Empty dependency array to prevent infinite loops

  // Update refs whenever state changes
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    currentSessionRef.current = currentSession;
  }, [currentSession]);

  // Update athro ref when athro changes to prevent infinite loops
  useEffect(() => {
    athroRef.current = athro;
  }, [athro]);

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          
          .chat-ul, .chat-ol {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
          }
          
          .chat-li {
            margin: 0.25rem 0;
            line-height: 1.5;
          }
          
          .chat-strong {
            font-weight: 600;
            color: #4fc38a;
          }
          
          .chat-em {
            font-style: italic;
            color: #e4c97e;
          }
          
          .chat-h1, .chat-h2, .chat-h3 {
            margin: 1rem 0 0.5rem 0;
            color: #4fc38a;
            font-weight: 600;
          }
          
          .chat-h1 {
            font-size: 1.4rem;
            border-bottom: 2px solid #4fc38a;
            padding-bottom: 0.25rem;
          }
          
          .chat-h2 {
            font-size: 1.2rem;
            border-bottom: 1px solid rgba(79, 195, 138, 0.3);
            padding-bottom: 0.2rem;
          }
          
          .chat-h3 {
            font-size: 1.1rem;
          }
          
          .chat-blockquote {
            border-left: 3px solid #4fc38a;
            margin: 0.5rem 0;
            padding: 0.5rem 1rem;
            background: rgba(79, 195, 138, 0.1);
            border-radius: 0.25rem;
          }
          
          .chat-code-block {
            background: rgba(22, 34, 28, 0.8);
            border: 1px solid #4fc38a;
            border-radius: 0.5rem;
            margin: 0.5rem 0;
            overflow: hidden;
          }
          
          .chat-code-header {
            background: #4fc38a;
            color: #17221c;
            padding: 0.25rem 0.5rem;
            font-size: 0.8rem;
            font-weight: bold;
          }
          
          .chat-code-block pre {
            margin: 0;
            padding: 0.5rem;
            overflow-x: auto;
          }
          
          .chat-code-block code {
            color: #e4c97e;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9rem;
          }
          
          .chat-inline-code {
            background: rgba(79, 195, 138, 0.2);
            border: 1px solid rgba(79, 195, 138, 0.3);
            border-radius: 0.25rem;
            padding: 0.1rem 0.3rem;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9rem;
            color: #4fc38a;
          }
          
          .bilingual-option:hover {
            background: rgba(79, 195, 138, 0.3) !important;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(79, 195, 138, 0.3);
          }
          
          .bilingual-option:active {
            transform: translateY(0);
            background: rgba(79, 195, 138, 0.4) !important;
          }
        `}
      </style>
      
      {/* Chat Area - Fixed height, scrollable content */}
      <div style={{
        flex: 1,
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 0 /* Important: allows flex item to shrink */
      }}>
        {/* Main Chat Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          height: '100%',
          marginRight: '10px' /* Reduced margin for better spacing */
        }}>
          {/* Messages container - Scrollable */}
          <div
            ref={messagesContainerRef}
            className="messages-container"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxSizing: 'border-box',
              minHeight: 0 /* Important: allows flex item to shrink */
            }}
          >
            {messages.map((message, index) => {
              const messageKey = `${index}-${message.role}`;
              // REMOVED: Translation-related variables that were causing infinite loops
              
              // Check if this is the last assistant message being streamed
              const isLastAssistantMessage = message.role === 'assistant' && index === messages.length - 1;
              const hasStreamingContent = isLastAssistantMessage && streamingContent[athro.id];
              
              // Use streaming content if available, otherwise use message content
              const displayContent = hasStreamingContent ? streamingContent[athro.id] : message.content;
              
              // Check if this is a welcome message with options
              const isWelcomeMessage = index === 0 && message.role === 'assistant' && 
                ((displayContent.includes('[1]') && displayContent.includes('[2]') && 
                  displayContent.includes('[3]') && displayContent.includes('[4]')) ||
                 (displayContent.includes('[French]') && displayContent.includes('[German]') && 
                  displayContent.includes('[Spanish]')) ||
                 (displayContent.includes('**[Saesneg yn unig') && displayContent.includes('**[Cymraeg yn unig')));
              
              // Check if this is a bilingual dual-column message (should NOT extract cards)
              const isBilingualMessage = message.role === 'assistant' && 
                ((displayContent.includes('| **English** |') && displayContent.includes('|---|---|')) ||
                 (displayContent.includes('| **Welsh** |') && displayContent.includes('|---|---|')) ||
                 (displayContent.includes('| **French** |') && displayContent.includes('|---|---|')) ||
                 (displayContent.includes('| **German** |') && displayContent.includes('|---|---|')) ||
                 (displayContent.includes('| **Spanish** |') && displayContent.includes('|---|---|')) ||
                 (displayContent.includes('| **Italian** |') && displayContent.includes('|---|---|')) ||
                 (displayContent.includes('| **Polish** |') && displayContent.includes('|---|---|')) ||
                 (displayContent.includes('| **Greek** |') && displayContent.includes('|---|---|')) ||
                 (displayContent.includes('| **Turkish** |') && displayContent.includes('|---|---|')) ||
                 (displayContent.includes('| **Ukrainian** |') && displayContent.includes('|---|---|')) ||
                 (displayContent.includes('| **Mandarin Chinese** |') && displayContent.includes('|---|---|')) ||
                 (displayContent.includes('| **Arabic** |') && displayContent.includes('|---|---|')) ||
                 // Also detect by the presence of dual column table structure with multiple rows
                 (displayContent.includes('|') && displayContent.includes('|---|---|') && displayContent.split('|').length > 10) ||
                 // Additional checks for bilingual content patterns - Welsh
                 (displayContent.includes('Dysgu geiriau a ymadroddion newydd') && displayContent.includes('Learn new words and phrases')) ||
                 (displayContent.includes('Nawr gadewch i ni ddechrau dysgu') && displayContent.includes('Now let\'s start learning')) ||
                 // Additional checks for bilingual content patterns - French
                 (displayContent.includes('Apprendre de nouveaux mots et phrases') && displayContent.includes('Learn new words and phrases')) ||
                 (displayContent.includes('Maintenant, commençons à apprendre !') && displayContent.includes('Now let\'s start learning')) ||
                 // Additional checks for bilingual content patterns - German
                 (displayContent.includes('Neue Wörter und Phrasen lernen') && displayContent.includes('Learn new words and phrases')) ||
                 (displayContent.includes('Lassen Sie uns jetzt mit dem Lernen beginnen!') && displayContent.includes('Now let\'s start learning')) ||
                 // Additional checks for bilingual content patterns - Spanish
                 (displayContent.includes('Aprender nuevas palabras y frases') && displayContent.includes('Learn new words and phrases')) ||
                 (displayContent.includes('¡Ahora empezamos a aprender!') && displayContent.includes('Now let\'s start learning')) ||
                 // Additional checks for bilingual content patterns - Italian
                 (displayContent.includes('Imparare nuove parole e frasi') && displayContent.includes('Learn new words and phrases')) ||
                 (displayContent.includes('Ora iniziamo ad imparare!') && displayContent.includes('Now let\'s start learning')) ||
                 // Additional checks for bilingual content patterns - Polish
                 (displayContent.includes('Uczyć się nowych słów i fraz') && displayContent.includes('Learn new words and phrases')) ||
                 (displayContent.includes('Teraz zaczynamy się uczyć!') && displayContent.includes('Now let\'s start learning')) ||
                 // Additional checks for bilingual content patterns - Greek
                 (displayContent.includes('Μάθετε νέες λέξεις και φράσεις') && displayContent.includes('Learn new words and phrases')) ||
                 (displayContent.includes('Τώρα ας αρχίσουμε να μαθαίνουμε!') && displayContent.includes('Now let\'s start learning')) ||
                 // Additional checks for bilingual content patterns - Turkish
                 (displayContent.includes('Yeni kelimeler ve ifadeler öğrenin') && displayContent.includes('Learn new words and phrases')) ||
                 (displayContent.includes('Şimdi öğrenmeye başlayalım!') && displayContent.includes('Now let\'s start learning')) ||
                 // Additional checks for bilingual content patterns - Ukrainian
                 (displayContent.includes('Вивчайте нові слова та фрази') && displayContent.includes('Learn new words and phrases')) ||
                 (displayContent.includes('Тепер давайте почнемо вчитися!') && displayContent.includes('Now let\'s start learning')) ||
                 // Additional checks for bilingual content patterns - Mandarin Chinese
                 (displayContent.includes('学习新单词和短语') && displayContent.includes('Learn new words and phrases')) ||
                 (displayContent.includes('现在让我们开始学习！') && displayContent.includes('Now let\'s start learning')) ||
                 // Additional checks for bilingual content patterns - Arabic
                 (displayContent.includes('تعلم كلمات وعبارات جديدة') && displayContent.includes('Learn new words and phrases')) ||
                 (displayContent.includes('الآن دعونا نبدأ التعلم!') && displayContent.includes('Now let\'s start learning')));
              
              // Debug bilingual detection
              if (message.role === 'assistant' && displayContent.includes('Vocabulary Practice')) {
                console.log('🔍 BILINGUAL DEBUG - Card content detected:', {
                  isBilingualMessage,
                  hasEnglishHeader: displayContent.includes('| **English** |'),
                  hasTableSeparator: displayContent.includes('|---|---|'),
                  hasWelshContent: displayContent.includes('Dysgu geiriau a ymadroddion newydd'),
                  hasFrenchContent: displayContent.includes('Apprendre de nouveaux mots et phrases'),
                  hasGermanContent: displayContent.includes('Neue Wörter und Phrasen lernen'),
                  hasSpanishContent: displayContent.includes('Aprender nuevas palabras y frases'),
                  contentStart: displayContent.substring(0, 200) + '...'
                });
              }
              
              // Check if this is a response message with clickable options (but NOT bilingual)
              const hasClickableOptions = message.role === 'assistant' && !isBilingualMessage &&
                (displayContent.includes('[Upload PDF]') || 
                 displayContent.includes('[Explain a Concept]') || 
                 displayContent.includes('[Create Quiz]') || 
                 displayContent.includes('[Study Plan]') ||
                 displayContent.includes('[Vocabulary Practice]') ||
                 displayContent.includes('[Ymarfer Geirfa]') ||
                 displayContent.includes('[Help Gramadeg]') ||
                 displayContent.includes('[Ymarfer Sgwrs]') ||
                 displayContent.includes('[Dealltwriaeth Ddarllen]') ||
                 displayContent.includes('[Sgiliau Ysgrifennu]') ||
                 displayContent.includes('[Mewnwelediad Diwylliannol]') ||
                 displayContent.includes('[Pratique du Vocabulaire]') ||
                 displayContent.includes('[Aide Grammaticale]') ||
                 displayContent.includes('[Pratique de Conversation]') ||
                 displayContent.includes('[Compréhension de Lecture]') ||
                 displayContent.includes('[Compétences d\'Écriture]') ||
                 displayContent.includes('[Aperçus Culturels]') ||
                 displayContent.includes('[Vokabelpraxis]') ||
                 displayContent.includes('[Grammatikhilfe]') ||
                 displayContent.includes('[Konversationspraxis]') ||
                 displayContent.includes('[Leseverständnis]') ||
                 displayContent.includes('[Schreibfähigkeiten]') ||
                 displayContent.includes('[Kulturelle Einblicke]') ||
                 displayContent.includes('[Práctica de Vocabulario]') ||
                 displayContent.includes('[Ayuda Gramatical]') ||
                 displayContent.includes('[Práctica de Conversación]') ||
                 displayContent.includes('[Comprensión Lectora]') ||
                 displayContent.includes('[Habilidades de Escritura]') ||
                 displayContent.includes('[Perspectivas Culturales]') ||
                 // French options
                 displayContent.includes('[Pratique du Vocabulaire]') ||
                 displayContent.includes('[Aide Grammaticale]') ||
                 displayContent.includes('[Pratique de Conversation]') ||
                 displayContent.includes('[Compréhension de Lecture]') ||
                 displayContent.includes('[Compétences d\'Écriture]') ||
                 displayContent.includes('[Aperçus Culturels]') ||
                 // German options
                 displayContent.includes('[Vokabelpraxis]') ||
                 displayContent.includes('[Grammatikhilfe]') ||
                 displayContent.includes('[Konversationspraxis]') ||
                 displayContent.includes('[Leseverständnis]') ||
                 displayContent.includes('[Schreibfähigkeiten]') ||
                 displayContent.includes('[Kulturelle Einblicke]') ||
                 // Italian options
                 displayContent.includes('[Pratica del Vocabolario]') ||
                 displayContent.includes('[Aiuto Grammaticale]') ||
                 displayContent.includes('[Pratica di Conversazione]') ||
                 displayContent.includes('[Comprensione della Lettura]') ||
                 displayContent.includes('[Abilità di Scrittura]') ||
                 displayContent.includes('[Approfondimenti Culturali]') ||
                 // Polish options
                 displayContent.includes('[Praktyka Słownictwa]') ||
                 displayContent.includes('[Pomoc Gramatyczna]') ||
                 displayContent.includes('[Praktyka Konwersacji]') ||
                 displayContent.includes('[Rozumienie Czytania]') ||
                 displayContent.includes('[Umiejętności Pisania]') ||
                 displayContent.includes('[Wgląd Kulturowy]') ||
                 // Greek options
                 displayContent.includes('[Εξάσκηση Λεξιλογίου]') ||
                 displayContent.includes('[Βοήθεια Γραμματικής]') ||
                 displayContent.includes('[Εξάσκηση Συνομιλίας]') ||
                 displayContent.includes('[Κατανόηση Ανάγνωσης]') ||
                 displayContent.includes('[Δεξιότητες Συγγραφής]') ||
                 displayContent.includes('[Πολιτιστικές Απόψεις]') ||
                 // Turkish options
                 displayContent.includes('[Kelime Pratiği]') ||
                 displayContent.includes('[Dilbilgisi Yardımı]') ||
                 displayContent.includes('[Konuşma Pratiği]') ||
                 displayContent.includes('[Okuma Anlayışı]') ||
                 displayContent.includes('[Yazma Becerileri]') ||
                 displayContent.includes('[Kültürel İçgörüler]') ||
                 // Ukrainian options
                 displayContent.includes('[Практика Лексики]') ||
                 displayContent.includes('[Допомога з Граматики]') ||
                 displayContent.includes('[Практика Розмови]') ||
                 displayContent.includes('[Розуміння Читання]') ||
                 displayContent.includes('[Навички Письма]') ||
                 displayContent.includes('[Культурні Прозріння]') ||
                 // Mandarin Chinese options
                 displayContent.includes('[词汇练习]') ||
                 displayContent.includes('[语法帮助]') ||
                 displayContent.includes('[对话练习]') ||
                 displayContent.includes('[阅读理解]') ||
                 displayContent.includes('[写作技能]') ||
                 displayContent.includes('[文化见解]') ||
                 // Arabic options
                 displayContent.includes('[ممارسة المفردات]') ||
                 displayContent.includes('[مساعدة النحو]') ||
                 displayContent.includes('[ممارسة المحادثة]') ||
                 displayContent.includes('[فهم القراءة]') ||
                 displayContent.includes('[مهارات الكتابة]') ||
                 displayContent.includes('[نظرات ثقافية]') ||
                 displayContent.includes('[English Only]') ||
                 displayContent.includes('[French Only]') ||
                 displayContent.includes('[German Only]') ||
                 displayContent.includes('[Spanish Only]') ||
                 displayContent.includes('[Italian Only]') ||
                 displayContent.includes('[Polish Only]') ||
                 displayContent.includes('[Greek Only]') ||
                 displayContent.includes('[Turkish Only]') ||
                 displayContent.includes('[Ukrainian Only]') ||
                 displayContent.includes('[Mandarin Chinese Only]') ||
                 displayContent.includes('[Arabic Only]') ||
                 displayContent.includes('[Side by Side]'));
              
              return (
                <div
                  key={index}
                  style={{
                    alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: message.role === 'user' ? '70%' : '90%', /* Wider messages for assistant */
                    padding: '1rem',
                    background: message.role === 'user' ? '#e4c97e' : 'rgba(79, 195, 138, 0.15)',
                    color: message.role === 'user' ? '#17221c' : '#e4c97e',
                    borderRadius: '1rem',
                    margin: '0.5rem 0',
                    // REMOVED: direction: isRTL conditional styling
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: message.role === 'assistant' ? '2px solid rgba(79, 195, 138, 0.3)' : 'none'
                  }}
                >
                  {/* Add streaming indicator for actively streaming messages */}
                  {hasStreamingContent && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.5rem',
                      fontSize: '0.8rem',
                      color: '#4fc38a',
                      opacity: 0.8
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#4fc38a',
                        animation: 'pulse 1s ease-in-out infinite'
                      }} />
                      Streaming response...
                    </div>
                  )}
                  
                  {isWelcomeMessage ? (
                    <div style={{ lineHeight: '1.6' }}>
                      {/* Check if this is language selection for athro-languages */}
                      {(() => {
                        console.log('🚀 RENDER DEBUG ALL CONTENT:', displayContent.substring(0, 100) + '...');
                        console.log('🚀 Contains Shwmae?', displayContent.includes('Shwmae'));
                        console.log('🚀 Contains French?', displayContent.includes('[French]'));
                        console.log('🚀 Contains German?', displayContent.includes('[German]'));
                        console.log('🚀 Contains **[Saesneg?', displayContent.includes('**[Saesneg yn unig'));
                        
                        if (displayContent.includes('Shwmae') || displayContent.includes('AthroCymraeg')) {
                          console.log('🏴󠁧󠁢󠁷󠁬󠁳󠁿 WELSH DEBUG:', displayContent);
                          console.log('🏴󠁧󠁢󠁷󠁬󠁳󠁿 Contains **[Saesneg:', displayContent.includes('**[Saesneg yn unig'));
                          console.log('🏴󠁧󠁢󠁷󠁬󠁳󠁿 Contains **[Cymraeg:', displayContent.includes('**[Cymraeg yn unig'));
                        }
                        return displayContent.includes('[French]') && displayContent.includes('[German]');
                      })() ? (
                        <div>
                          {/* Render welcome message text without language options */}
                          <div
                            dangerouslySetInnerHTML={{ 
                              __html: renderMessage(displayContent.replace(/\*\*\[French\].*?\*\*.*?\n\*\*\[German\].*?\*\*.*?\n\*\*\[Spanish\].*?\*\*.*?\n\*\*\[Italian\].*?\*\*.*?\n\*\*\[Polish\].*?\*\*.*?\n\*\*\[Greek\].*?\*\*.*?\n\*\*\[Turkish\].*?\*\*.*?\n\*\*\[Ukrainian\].*?\*\*.*?\n\*\*\[Mandarin Chinese\].*?\*\*.*?\n\*\*\[Arabic\].*?\*\*.*?\n\nClick on the language you're studying, and I'll customize everything for you!/s, ''))
                            }}
                          />
                          
                          {/* Render language selection cards */}
                          <div style={{ marginTop: '1rem' }}>
                            <div className="welcome-options-grid">
                              {[
                                { key: 'French', text: 'French', native: 'Français' },
                                { key: 'German', text: 'German', native: 'Deutsch' },
                                { key: 'Spanish', text: 'Spanish', native: 'Español' },
                                { key: 'Italian', text: 'Italian', native: 'Italiano' },
                                { key: 'Polish', text: 'Polish', native: 'Polski' },
                                { key: 'Greek', text: 'Greek', native: 'Ελληνικά' },
                                { key: 'Turkish', text: 'Turkish', native: 'Türkçe' },
                                { key: 'Ukrainian', text: 'Ukrainian', native: 'Українська' },
                                { key: 'Mandarin Chinese', text: 'Mandarin Chinese', native: '中文' },
                                { key: 'Arabic', text: 'Arabic', native: 'العربية' }
                              ].map((language) => (
                                <button
                                  key={language.key}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleWelcomeOptionClick(language.key, index);
                                  }}
                                  className="welcome-option-button"
                                  disabled={isTyping[athro.id] || false}
                                >
                                  <div className="welcome-option-title">
                                    {language.text}
                                  </div>
                                  <div className="welcome-option-desc">
                                    {language.native}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : displayContent.includes('**[Saesneg yn unig') && displayContent.includes('**[Cymraeg yn unig') ? (
                        <div>
                          {/* Render Welsh welcome message text without language options */}
                          <div
                            dangerouslySetInnerHTML={{ 
                              __html: renderMessage(displayContent.replace(/\*\*\[Saesneg yn unig.*?\].*?\n\*\*\[Cymraeg yn unig.*?\].*?\n\*\*\[Ochor yn ochor.*?\].*?\n\nChoose your preferred conversation style!/s, ''))
                            }}
                          />
                          
                          {/* Render Welsh language communication options cards */}
                          <div style={{ marginTop: '1rem' }}>
                            <div className="welcome-options-grid">
                              {[
                                { key: 'Saesneg yn unig - English only', text: 'Saesneg yn unig', desc: 'English only - All responses in English' },
                                { key: 'Cymraeg yn unig - Welsh only', text: 'Cymraeg yn unig', desc: 'Welsh only - All responses in Welsh' },
                                { key: 'Ochor yn ochor - Side by Side', text: 'Ochor yn ochor', desc: 'Side by Side - Dual columns with English and Welsh together' }
                              ].map((option) => (
                                <button
                                  key={option.key}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleWelcomeOptionClick(option.key, index);
                                  }}
                                  className="welcome-option-button"
                                  disabled={isTyping[athro.id] || false}
                                >
                                  <div className="welcome-option-title">
                                    {option.text}
                                  </div>
                                  <div className="welcome-option-desc">
                                    {option.desc}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {/* Render standard welcome message text without options */}
                          <div
                            dangerouslySetInnerHTML={{ 
                              __html: renderMessage(displayContent.replace(/\*\*\[1\].*?\*\*.*?\n\*\*\[2\].*?\*\*.*?\n\*\*\[3\].*?\*\*.*?\n\*\*\[4\].*?\*\*.*?\n\nClick any option above to get started, or just type your question below!/s, ''))
                            }}
                          />
                          
                          {/* Render standard interactive options */}
                          <div style={{ marginTop: '1rem' }}>
                            <div className="welcome-options-grid">
                              {[
                                { key: 'upload', text: '📁 Upload Resources', desc: 'Share homework, questions, or study materials' },
                                { key: 'discuss', text: '💬 Discuss Something', desc: 'Ask about topics, concepts, or problems' },
                                { key: 'test', text: '🧠 Test Your Knowledge', desc: 'Practice with quizzes and exercises' },
                                { key: 'other', text: '🌟 Something Else', desc: 'Study planning, tips, or other help' }
                              ].map((option) => (
                                <button
                                  key={option.key}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleWelcomeOptionClick(option.key, index);
                                  }}
                                  className="welcome-option-button"
                                  disabled={isTyping[athro.id] || false}
                                >
                                  <div className="welcome-option-title">
                                    {option.text}
                                  </div>
                                  <div className="welcome-option-desc">
                                    {option.desc}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : hasClickableOptions ? (
                    <div style={{ lineHeight: '1.6' }}>
                      {/* Render response message text without options */}
                      <div
                        dangerouslySetInnerHTML={{ 
                          __html: renderMessage(
                            displayContent
                              // Remove Quick Actions sections
                              .replace(/\*\*Quick Actions:\*\*[\s\S]*?• \[.*?\][\s\S]*?• \[.*?\][\s\S]*?• \[.*?\][\s\S]*?• \[.*?\][\s\S]*?/g, '')
                              // Remove individual bracketed options that are rendered as buttons
                              .replace(/\*\*\[([^\]]+)\]\*\*[^\n]*/g, '')  // Remove **[Option]** - description
                              .replace(/\[([^\]]+)\]/g, '')  // Remove remaining [Option] text
                              // Clean up any extra line breaks or spacing
                              .replace(/\n{3,}/g, '\n\n')
                              .trim()
                          )
                        }}
                      />
                      
                      {/* Render clickable options from response */}
                      <div style={{ marginTop: '1rem' }}>
                        <div className="welcome-options-grid">
                          {extractClickableOptions(displayContent).map((option, optionIndex) => (
                            <button
                              key={optionIndex}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleResponseOptionClick(option, index);
                              }}
                              className="welcome-option-button"
                              disabled={isTyping[athro.id] || false}
                            >
                              <div className="welcome-option-title">
                                {option}
                              </div>
                              <div className="welcome-option-desc">
                                Click to get help with this
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : isBilingualMessage ? (
                    // Special handling for bilingual messages with clickable options in tables
                    <div
                      dangerouslySetInnerHTML={{ 
                        __html: renderMessage(displayContent).replace(
                          /\[([^\]]+)\]/g, 
                          '<span class="bilingual-option" data-option="$1" data-index="' + index + '" style="background: rgba(79, 195, 138, 0.2); color: #4fc38a; padding: 4px 8px; border-radius: 6px; cursor: pointer; border: 1px solid #4fc38a; display: inline-block; margin: 2px; transition: all 0.2s ease; font-weight: 500;">$1</span>'
                        )
                      }}
                      style={{ 
                        lineHeight: '1.6',
                        // Add cursor for streaming effect
                        ...(hasStreamingContent && {
                          position: 'relative'
                        })
                      }}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.classList.contains('bilingual-option')) {
                          const option = target.getAttribute('data-option');
                          const msgIndex = target.getAttribute('data-index');
                          if (option && msgIndex) {
                            handleResponseOptionClick(option, parseInt(msgIndex));
                          }
                        }
                      }}
                    />
                  ) : (
                  <div
                    dangerouslySetInnerHTML={{ __html: renderMessage(displayContent) }}
                    style={{ 
                      lineHeight: '1.6',
                      // Add cursor for streaming effect
                      ...(hasStreamingContent && {
                        position: 'relative'
                      })
                    }}
                  />
                  )}
                  
                  {/* Add "Copy" button for assistant messages */}
                  {message.role === 'assistant' && displayContent.trim() && !hasStreamingContent && (
                    <div style={{
                      marginTop: '0.75rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid rgba(79, 195, 138, 0.2)',
                      display: 'flex',
                      gap: '0.5rem',
                      justifyContent: 'flex-end'
                    }}>
                      <button
                        onClick={(e) => {
                          // Copy to clipboard
                          navigator.clipboard.writeText(displayContent).then(() => {
                            // Show success feedback
                            const button = e.target as HTMLButtonElement;
                            const originalHTML = button.innerHTML;
                            button.innerHTML = '✅';
                            button.style.background = '#4fc38a';
                            button.style.color = 'white';
                            
                            setTimeout(() => {
                              button.innerHTML = originalHTML;
                              button.style.background = 'transparent';
                              button.style.color = '#4fc38a';
                            }, 2000);
                          }).catch(() => {
                            alert('Failed to copy to clipboard');
                          });
                        }}
                        style={{
                          padding: '0.4rem',
                          background: 'transparent',
                          border: '1px solid rgba(79, 195, 138, 0.5)',
                          borderRadius: '0.375rem',
                          color: '#4fc38a',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          width: '32px',
                          height: '32px'
                        }}
                        onMouseEnter={(e) => {
                          const btn = e.target as HTMLButtonElement;
                          btn.style.background = 'rgba(79, 195, 138, 0.1)';
                          btn.style.borderColor = '#4fc38a';
                        }}
                        onMouseLeave={(e) => {
                          const btn = e.target as HTMLButtonElement;
                          if (!btn.innerHTML?.includes('✅')) {
                            btn.style.background = 'transparent';
                            btn.style.borderColor = 'rgba(79, 195, 138, 0.5)';
                          }
                        }}
                        title="Copy message"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                        </svg>
                      </button>
                    </div>
                  )}
                  
                  {/* Add typing cursor for streaming messages */}
                  {hasStreamingContent && (
                    <span style={{
                      display: 'inline-block',
                      width: '2px',
                      height: '1.2em',
                      background: '#4fc38a',
                      marginLeft: '2px',
                      animation: 'blink 1s step-end infinite'
                    }} />
                  )}
                  
                  {/* REMOVED: Translation toggle button that was causing infinite loops */}
                </div>
              );
            })}
            {isTyping[athro.id] && !isStreaming[athro.id] && (
              <div style={{
                alignSelf: 'flex-start',
                color: '#e4c97e',
                fontSize: '0.9rem',
                padding: '0.5rem 1rem',
                background: 'rgba(22, 34, 28, 0.8)',
                borderRadius: '0.5rem'
              }}>
                {athro.name} is typing...
              </div>
            )}
            {isStreaming[athro.id] && !streamingContent[athro.id] && (
              <div style={{
                alignSelf: 'flex-start',
                color: '#4fc38a',
                fontSize: '0.9rem',
                padding: '0.5rem 1rem',
                background: 'rgba(79, 195, 138, 0.1)',
                borderRadius: '0.5rem',
                border: '1px solid #4fc38a',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#4fc38a',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }} />
                {athro.name} is thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Side panel with study tools */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '320px',
          height: '100%',
          background: 'rgba(22, 34, 28, 0.9)',
          borderLeft: '2px solid #4fc38a',
          zIndex: 10,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}>
          <SidePanel
            athroId={athro.id}
            subject={athro.subject}
            sessionId={currentSessionId}
            onSelectResource={handleSelectResource}
            onInjectText={(text) => setInputValue(text)}
            onSendMessage={(message) => {
              // Add the language request directly to the chat as a user message
              const userMessage: ChatMessage = { role: 'user', content: message };
              const updatedMessages = [...messages, userMessage];
              setMessages(updatedMessages);

              // Start typing indicator
              setIsTyping(prev => ({
                ...prev,
                [athro.id]: true
              }));

              // Process the message directly without going through input
              const processLanguageRequest = async () => {
                try {
                  if (!chatService.current) return;

                  // Create abort controller for this request
                  const abortController = new AbortController();
                  setCurrentAbortController(abortController);

                  // Send to OpenAI API with streaming
                  console.log('Processing language request via ChatService with streaming');
                  const context = `athroId: ${athro.id}`;
                  
                  // Add placeholder assistant message for streaming
                  const placeholderMessage: ChatMessage = { role: 'assistant' as const, content: '' };
                  const messagesWithPlaceholder = [...updatedMessages, placeholderMessage];
                  setMessages(messagesWithPlaceholder);
                  setIsStreaming(prev => ({
                    ...prev,
                    [athro.id]: true
                  }));
                  setStreamingContent(prev => ({
                    ...prev,
                    [athro.id]: ''
                  }));
                  
                  // Use streaming API with abort controller
                  const streamingResponse = await chatService.current.sendMessageStream(
                    updatedMessages, 
                    context,
                    (chunk: string) => {
                      setStreamingContent(prev => ({
                        ...prev,
                        [athro.id]: chunk
                      }));
                      // Update the placeholder message with streaming content
                      setMessages(prev => {
                        const newMessages = [...prev];
                        if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
                          newMessages[newMessages.length - 1] = { 
                            role: 'assistant' as const, 
                            content: chunk 
                          };
                        }
                        return newMessages;
                      });
                      
                      // Auto-scroll to follow the streaming text
                      setTimeout(() => {
                        if (messagesContainerRef.current) {
                          messagesContainerRef.current.scrollTo({
                            top: messagesContainerRef.current.scrollHeight,
                            behavior: 'smooth'
                          });
                        }
                      }, 10); // Small delay to ensure DOM update
                    },
                    abortController
                  );
                  
                  console.log('Language request streaming completed');
                  
                  if (streamingResponse.error && streamingResponse.error !== 'Request was aborted') {
                    throw new Error(streamingResponse.error);
                  }
                  
                  // Finalize the message only if not aborted
                  if (streamingResponse.content && streamingResponse.isComplete) {
                    const response: ChatMessage = {
                      role: 'assistant' as const,
                      content: streamingResponse.content
                    };
                    
                    const finalMessages = [...updatedMessages, response];
                    setMessages(finalMessages);
                    
                    // Check if the response contains flashcard content and offer to save
                    offerFlashcardSave(streamingResponse.content);
                    
                    // Broadcast this message to other services
                    n8nEventService.publishEvent(EventNames.CHAT_MESSAGE_RECEIVED, {
                      athroId: athro.id,
                      message: response,
                      timestamp: new Date().toISOString()
                    });
                  }
                  
                } catch (error: any) {
                  console.error('Error processing language request:', error);
                  
                  // Don't show error if it was intentionally aborted
                  if (error.name !== 'AbortError') {
                    const errorMessage: ChatMessage = { 
                      role: 'assistant', 
                      content: `I'm sorry, I encountered an error processing your language request. Please try again.` 
                    };
                    setMessages([...updatedMessages, errorMessage]);
                  }
                } finally {
                  setIsTyping(prev => ({
                    ...prev,
                    [athro.id]: false
                  }));
                  setIsStreaming(prev => ({
                    ...prev,
                    [athro.id]: false
                  }));
                  setStreamingContent(prev => ({
                    ...prev,
                    [athro.id]: ''
                  }));
                  setCurrentAbortController(null);
                }
              };

              // Process the language request
              processLanguageRequest();
            }}
            onSaveSession={handleSaveSession}
            onDeleteSession={handleDeleteSession}
            onViewHistory={handleViewHistory}
            isCreatingSession={isCreatingSession}
          />
        </div>
      </div>

      {/* Input area at the bottom - Fixed height */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '1rem',
          borderTop: '1px solid #4fc38a',
          background: 'rgba(22, 34, 28, 0.8)',
          boxSizing: 'border-box',
          minHeight: '80px', /* Minimum height for 2 lines */
          marginRight: '320px', /* Leave space for sidebar */
          flexShrink: 0, /* Prevent shrinking */
          alignItems: 'flex-end' /* Align button to bottom when textarea expands */
        }}
      >
        <textarea
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            // Auto-resize up to 4 lines
            const textarea = e.target;
            textarea.style.height = 'auto';
            const maxHeight = 4 * 1.4 * 16 + 24; // 4 lines * lineHeight * fontSize + padding
            const newHeight = Math.min(textarea.scrollHeight, maxHeight);
            textarea.style.height = newHeight + 'px';
          }}
          placeholder={`Ask ${athro.name} anything...`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: 'rgba(22, 34, 28, 0.7)',
            border: '1px solid #4fc38a',
            borderRadius: '0.5rem',
            color: '#e4c97e',
            fontSize: '1rem',
            resize: 'none',
            minHeight: '48px', /* Minimum 2 lines */
            maxHeight: '113.6px', /* Maximum 4 lines (4 * 1.4 * 16 + 24 padding) */
            overflowY: 'auto',
            lineHeight: '1.4'
          }}
        />
        
        <button
          type={isStreaming[athro.id] || isTyping[athro.id] ? "button" : "submit"}
          onClick={isStreaming[athro.id] || isTyping[athro.id] ? handleStop : undefined}
          style={{
            padding: '0.75rem 1.5rem',
            background: isStreaming[athro.id] || isTyping[athro.id] ? '#e74c3c' : '#4fc38a',
            border: 'none',
            borderRadius: '0.5rem',
            color: '#17221c',
            fontWeight: 'bold',
            cursor: 'pointer',
            minHeight: '48px', /* Match textarea minimum height */
            alignSelf: 'flex-end', /* Stay at bottom when textarea expands */
            transition: 'background-color 0.2s ease'
          }}
        >
          {isStreaming[athro.id] || isTyping[athro.id] ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: '0.5rem', display: 'inline-block' }}>
                <rect x="6" y="4" width="4" height="16" fill="currentColor" />
                <rect x="14" y="4" width="4" height="16" fill="currentColor" />
              </svg>
              Stop
            </>
          ) : (
            'Send'
          )}
        </button>
      </form>



      {/* Study History Modal */}
      <StudyHistoryModal 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        athroId={athro.id}
        onLoadStudy={handleLoadStudy}
      />

      {/* Flashcard Save Modal */}
      {showFlashcardSave && flashcardToSave && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1a1a',
            border: '2px solid #e4c97e',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ color: '#e4c97e', margin: '0 0 1.5rem 0', textAlign: 'center' }}>
              💾 Save Flashcard
            </h2>
            
            <p style={{ color: '#ccc', marginBottom: '1.5rem', textAlign: 'center' }}>
              Would you like to save this flashcard to your study tools? You can edit the content below:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: '#e4c97e', marginBottom: '0.5rem' }}>
                  Topic:
                </label>
                <input
                  type="text"
                  value={flashcardSaveTitle}
                  onChange={(e) => setFlashcardSaveTitle(e.target.value)}
                  placeholder="Enter topic (e.g., Drama Terminology)"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(228, 201, 126, 0.5)',
                    borderRadius: '0.5rem',
                    color: 'white'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#e4c97e', marginBottom: '0.5rem' }}>
                  Front (Question):
                </label>
                <textarea
                  value={flashcardSaveFront}
                  onChange={(e) => setFlashcardSaveFront(e.target.value)}
                  placeholder="Enter the question or term"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(228, 201, 126, 0.5)',
                    borderRadius: '0.5rem',
                    color: 'white',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#e4c97e', marginBottom: '0.5rem' }}>
                  Back (Answer):
                </label>
                <textarea
                  value={flashcardSaveBack}
                  onChange={(e) => setFlashcardSaveBack(e.target.value)}
                  placeholder="Enter the answer or explanation"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(228, 201, 126, 0.5)',
                    borderRadius: '0.5rem',
                    color: 'white',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '1.5rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setShowFlashcardSave(false);
                    setFlashcardToSave(null);
                    setFlashcardSaveTitle('');
                    setFlashcardSaveFront('');
                    setFlashcardSaveBack('');
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'transparent',
                    border: '1px solid #4fc38a',
                    borderRadius: '0.5rem',
                    color: '#4fc38a',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleFlashcardSave}
                  disabled={!flashcardSaveFront.trim() || !flashcardSaveBack.trim()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: flashcardSaveFront.trim() && flashcardSaveBack.trim() ? '#4fc38a' : '#666',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: '#17221c',
                    fontWeight: 'bold',
                    cursor: flashcardSaveFront.trim() && flashcardSaveBack.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Save Flashcard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
};

export default ChatInterface;