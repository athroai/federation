import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { Athro } from '../types/athro';
import { ChatService, ChatMessage } from '../services/openai';
import { ATHRO_PERSONALITIES } from '../data/athroPersonalities';
import SidePanel from './SidePanel/SidePanel';
import StudyService from '../services/StudyService';
import SupabaseStudyService from '../services/SupabaseStudyService';
import { StudyHistory } from '../types/history';
import { Resource } from '../types/resources';
import StudyHistoryModal from './StudyHistory/StudyHistoryModal';
import DocumentProcessingService from '../services/DocumentProcessingService';
import { formatCurrentDate } from '../utils/dateUtils';
import SaveStudyModal from './StudyHistory/SaveStudyModal';

interface ChatInterfaceProps {
  athro: Athro;
}

const SimpleChatInterface: React.FC<ChatInterfaceProps> = ({ athro }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});
  const [usedResources, setUsedResources] = useState<string[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [studyHistories, setStudyHistories] = useState<StudyHistory[]>([]);
  const [saveStudyModalOpen, setSaveStudyModalOpen] = useState(false);
  const chatService = useRef<ChatService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [resources, setResources] = useState<Resource[]>([]);

  useEffect(() => {
    // Initialize chat service for this Athro
    chatService.current = new ChatService(ATHRO_PERSONALITIES[athro.id] || {
      subject: athro.subject,
      examBoard: 'General',
      level: 'GCSE',
      teachingStyle: 'Interactive and supportive',
      specialCapabilities: ['math', 'science', 'literature', 'study-materials']
    });
    
    // Load existing chat history or create new one
    if (chatHistories[athro.id]) {
      setMessages(chatHistories[athro.id]);
    } else {
      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: `Hi! I'm ${athro.name}, your ${athro.subject} tutor. I'm here to help you learn and excel in your studies. How can I help you today?`
      };
      setMessages([welcomeMessage]);
    }
    
    // Load resources for this Athro
    loadResources();
    
    // Load study histories
    loadStudyHistories();
    
    // Return cleanup function
    return () => {
      console.log('Chat interface unmounted');
    };
  }, [athro.id]);
  
  // Load resources for the current Athro
  const loadResources = async () => {
    try {
      const athroResources = await StudyService.getResources(athro.id);
      console.log('Loaded resources for Athro:', athroResources);
      setResources(athroResources);
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };
  
  // Load study histories
  const loadStudyHistories = async () => {
    try {
      const histories = await StudyService.getStudyHistory(athro.id);
      console.log('Loaded study histories:', histories);
      // Convert StudyHistorySummary[] to StudyHistory[] for state compatibility
      const fullHistories = await Promise.all(histories.map(async summary => {
        const fullHistory = await StudyService.getStudyHistoryById(summary.id);
        return fullHistory || {
          id: summary.id,
          athroId: athro.id,
          subject: athro.subject,
          messages: [],
          resources: [],
          createdAt: summary.createdAt,
          title: summary.title
        };
      }));
      setStudyHistories(fullHistories.filter(h => h !== null) as StudyHistory[]);
    } catch (error) {
      console.error('Error loading study histories:', error);
    }
  };
  
  // Handle file upload
  const handleFileUpload = async (file: File) => {
    console.log('Uploading file:', file);
    
    try {
      // First save the resource using StudyService
      const resource = await StudyService.saveResource(file, '', [], athro.id);
      
      // Now process the document with the proper Resource object
              const processedResult = await new DocumentProcessingService().processDocument(resource);
      
      // Reload resources
      loadResources();
      
      // Notify the user
      const systemMessage: ChatMessage = {
        role: 'assistant',
        content: `I've processed your document "${file.name}". You can now refer to it in our conversation or access it from the Resources tab.`
      };
      setMessages([...messages, systemMessage]);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `I had trouble processing your document. Please try again or use a different file format.`
      };
      setMessages([...messages, errorMessage]);
    }
  };
  
  // Handle resource selection
  const handleSelectResource = (resourceId: string) => {
    console.log('Selected resource:', resourceId);
    
    // Find the resource
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;
    
    // Add to used resources
    setUsedResources([...usedResources, resourceId]);
    
    // Let the user know we're using this resource
    const systemMessage: ChatMessage = {
      role: 'assistant',
      content: `I'm now using "${resource.name}" as reference material for our conversation. You can ask me questions about it!`
    };
    setMessages([...messages, systemMessage]);
  };
  
  // Handle saving the study session (now only saves when user explicitly presses "Save Study")
  const handleSaveStudy = async (customTitle?: string) => {
    try {
      if (messages.length <= 1) {
        console.log('No messages to save');
        return;
      }
      
      // Create a new study history entry
      const title = customTitle || `Study Session with ${athro.name} - ${formatCurrentDate()}`;
      
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
      
      // Notify user
      const systemMessage: ChatMessage = {
        role: 'assistant',
        content: `✅ Study session "${title}" has been saved successfully! You can access it later from the history section.`
      };
      setMessages([...messages, systemMessage]);
      
    } catch (error) {
      console.error('Error saving study:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const handleSaveStudyClick = () => {
    if (messages.length <= 1) {
      alert('No messages to save. Start a conversation first.');
      return;
    }
    setSaveStudyModalOpen(true);
  };
  
  // Handle loading a study session
  const handleLoadStudy = (history: StudyHistory) => {
    console.log('Loading study history:', history);
    
    // Set messages from history
    setMessages(history.messages);
    
    // Set used resources (these are already resource IDs)
    setUsedResources(history.resources);
    
    // Close history modal
    setIsHistoryOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !chatService.current) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping({ ...isTyping, [athro.id]: true });

    try {
      const response = await chatService.current.sendMessage([...messages, userMessage]);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error while processing your message. Please check your API key configuration and try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping({ ...isTyping, [athro.id]: false });
    }
  };

  // Render messages with simple formatting
  const renderMessage = (content: string) => {
    return content.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        <br />
      </React.Fragment>
    ));
  };

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Main chat container */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        marginRight: '320px', // Make space for sidebar
        overflow: 'hidden'
      }}>
        {/* Messages container */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxSizing: 'border-box'
        }}>
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              padding: '1rem',
              background: message.role === 'user' ? '#e4c97e' : 'rgba(22, 34, 28, 0.8)',
              color: message.role === 'user' ? '#17221c' : '#e4c97e',
              borderRadius: '1rem',
              margin: '0.5rem 0'
            }}
          >
            <div>
              {renderMessage(message.content)}
            </div>
          </div>
        ))}
        {isTyping[athro.id] && (
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '1rem',
          borderTop: '1px solid #4fc38a',
          background: 'rgba(22, 34, 28, 0.8)',
          boxSizing: 'border-box'
        }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={`Ask ${athro.name} anything...`}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: 'rgba(22, 34, 28, 0.7)',
            border: '1px solid #4fc38a',
            borderRadius: '0.5rem',
            color: '#e4c97e',
            fontSize: '1rem'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.75rem 1.5rem',
            background: '#4fc38a',
            border: 'none',
            borderRadius: '0.5rem',
            color: '#17221c',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Send
        </button>
      </form>
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
          onUploadResource={handleFileUpload}
          onSelectResource={handleSelectResource}
          onSaveStudy={handleSaveStudyClick}
          onViewHistory={() => setIsHistoryOpen(true)}
        />
      </div>
      
      {/* Study History Modal */}
      <StudyHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        athroId={athro.id}
        onLoadStudy={async (historyId: string) => {
          try {
            const history = await StudyService.getStudyHistoryById(historyId);
            if (history) {
              handleLoadStudy(history);
            }
          } catch (error) {
            console.error('Error loading study history:', error);
          }
        }}
      />
      
      {/* Save Study Modal */}
      <SaveStudyModal
        isOpen={saveStudyModalOpen}
        onClose={() => setSaveStudyModalOpen(false)}
        onSave={handleSaveStudy}
        athroName={athro.name}
      />
    </div>
  );
};

export default SimpleChatInterface;
