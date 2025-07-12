import React, { useState, useRef, useEffect } from 'react';
import { StudyNote } from '../../../types/study';
import SupabaseStudyService from '../../../services/SupabaseStudyService';

interface FullNotesEditorProps {
  athroId: string;
  subject: string;
  sessionId?: string | null;
  onClose: () => void;
  initialNote?: StudyNote | null;
  onMinimize?: () => void;
}

// Utility function to strip HTML tags and get clean text
const stripHtml = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

const FullNotesEditor: React.FC<FullNotesEditorProps> = ({
  athroId,
  subject,
  sessionId,
  onClose,
  initialNote,
  onMinimize
}) => {
  const [title, setTitle] = useState(initialNote?.topic || '');
  const [content, setContent] = useState(initialNote?.content || '');
  const [tags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentFont, setCurrentFont] = useState('Arial');
  const [currentFontSize, setCurrentFontSize] = useState('14');
  const editorRef = useRef<HTMLDivElement>(null);

  // Create a unique key for storing temporary content
  const tempStorageKey = `temp_note_${athroId}_${subject}_${sessionId || 'default'}_${initialNote?.id || 'new'}`;

  // Initialize content only once on mount - NEVER reinitialize unless explicitly cleared
  const contentInitialized = useRef(false);
  
  useEffect(() => {
    if (editorRef.current && !contentInitialized.current) {
      // Check for temporary saved content first
      const tempData = localStorage.getItem(tempStorageKey);
      if (tempData) {
        try {
          const { title: tempTitle, content: tempContent } = JSON.parse(tempData);
          setTitle(tempTitle);
          editorRef.current.innerHTML = tempContent;
          setContent(editorRef.current.innerText || '');
          console.log('✅ Restored temporary content from localStorage');
        } catch (error) {
          console.error('Error loading temporary content:', error);
          // Fall back to initial content
          if (initialNote?.content) {
            editorRef.current.innerHTML = initialNote.content.replace(/\n/g, '<br>');
          }
        }
      } else {
        // Set initial content properly
        if (initialNote?.content) {
          editorRef.current.innerHTML = initialNote.content.replace(/\n/g, '<br>');
          console.log('✅ Loaded initial note content');
        }
      }
      
      contentInitialized.current = true;
      editorRef.current.focus();
      
      // Set cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      if (editorRef.current.childNodes.length > 0) {
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, []); // EMPTY dependency array - initialize ONLY once
  
  // Separate effect to handle focus when switching back from chat
  useEffect(() => {
    if (editorRef.current && !isMinimized && contentInitialized.current) {
      editorRef.current.focus();
      console.log('✅ Focused editor when switching back from chat');
    }
  }, [isMinimized]); // Only focus when minimized state changes

  // Component unmount protection - save content before component is destroyed
  useEffect(() => {
    return () => {
      // Save content immediately when component unmounts
      if (editorRef.current && (title.trim() || editorRef.current.innerText.trim())) {
        const tempData = {
          title: title,
          content: editorRef.current.innerHTML
        };
        localStorage.setItem(tempStorageKey, JSON.stringify(tempData));
        console.log('🛡️ Protected content on unmount - saved to localStorage');
      }
    };
  }, [title, tempStorageKey]); // Save whenever title changes or on unmount

  // Listen for paste events from chat
  useEffect(() => {
    const handlePasteFromChat = (e: CustomEvent) => {
      if (e.detail?.content && editorRef.current) {
        const currentContent = editorRef.current.innerHTML;
        const newContent = currentContent ? `${currentContent}<br><br>=== From Chat ===<br>${e.detail.content.replace(/\n/g, '<br>')}<br>================<br>` : e.detail.content.replace(/\n/g, '<br>');
        editorRef.current.innerHTML = newContent;
        setContent(editorRef.current.innerText || '');
      }
    };

    window.addEventListener('pasteToNotes', handlePasteFromChat as EventListener);
    return () => {
      window.removeEventListener('pasteToNotes', handlePasteFromChat as EventListener);
    };
  }, []);

  // Handle paste events to strip formatting and paste as plain text
  const handleTitlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    // Get plain text from clipboard
    const plainText = e.clipboardData.getData('text/plain');
    
    // Get current selection
    const input = e.currentTarget;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    
    // Insert plain text at cursor position
    const newTitle = title.substring(0, start) + plainText + title.substring(end);
    setTitle(newTitle);
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      input.selectionStart = input.selectionEnd = start + plainText.length;
      input.focus();
    }, 0);
  };

  const handleContentPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // Get plain text from clipboard
    const plainText = e.clipboardData.getData('text/plain');
    
    // Get current selection and range
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Delete selected content
    range.deleteContents();
    
    // Create text node with plain text
    const textNode = document.createTextNode(plainText);
    range.insertNode(textNode);
    
    // Move cursor to end of inserted text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Update state with the new HTML content
    const editorElement = e.currentTarget;
    setContent(editorRef.current?.innerText || '');
  };

  const handleSave = async () => {
    if (!title.trim()) {
      return; // Silently return without alert
    }

    setIsLoading(true);
    try {
      const effectiveSessionId = (sessionId === 'pending-session' || !sessionId) ? 'temp-session' : sessionId;
      
      // Get the formatted HTML content with styles preserved
      const htmlContent = editorRef.current?.innerHTML || '';
      const plainTextContent = editorRef.current?.innerText || '';
      
      console.log('[FullNotesEditor] Saving note:', {
        isUpdate: !!initialNote,
        title,
        htmlContentLength: htmlContent.length,
        plainTextLength: plainTextContent.length,
        effectiveSessionId,
        athroId,
        subject
      });

      if (initialNote) {
        // Update existing note - save HTML content to preserve formatting
        const result = await SupabaseStudyService.updateNote(initialNote.id, {
          topic: title,
          content: htmlContent, // Save HTML to preserve formatting
        });
        console.log('[FullNotesEditor] Note updated successfully:', result);
      } else {
        // Create new note - save HTML content to preserve formatting
        const result = await SupabaseStudyService.createNote({
          athroId,
          subject,
          topic: title,
          content: htmlContent, // Save HTML to preserve formatting
          tags: tags, // Include tags array
          noteType: 'FULL', // FullNotesEditor creates FULL notes
          reviewStatus: 'NEEDS_REVIEW' as const
        }, effectiveSessionId!);
        console.log('[FullNotesEditor] Note created successfully:', result);
      }
      
      // Clear temporary content after successful save
      clearTempContent();
      
      // No alert notification - just close silently
      onClose();
    } catch (error) {
      console.error('Error saving note:', error);
      // Still no alert - just log the error
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadWord = async () => {
    try {
      // Create a proper Word document using HTML to Word conversion
      const htmlContent = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>90</w:Zoom>
      <w:DoNotPromptForConvert/>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      margin: 1in;
      size: 8.5in 11in;
    }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000000;
      margin: 0;
      padding: 0;
    }
    h1 {
      color: #2F5597;
      border-bottom: 2pt solid #2F5597;
      padding-bottom: 6pt;
      margin-bottom: 18pt;
      font-size: 18pt;
      font-weight: bold;
    }
    .meta {
      background: #F2F2F2;
      padding: 12pt;
      border-left: 4pt solid #2F5597;
      margin-bottom: 18pt;
      font-size: 10pt;
    }
    .content {
      margin: 18pt 0;
      font-size: 12pt;
      line-height: 1.6;
    }
    .tags {
      margin-top: 18pt;
      padding: 12pt;
      background: #F2F2F2;
      border: 1pt solid #CCCCCC;
    }
    .tag {
      background: #2F5597;
      color: white;
      padding: 2pt 8pt;
      margin-right: 4pt;
      border-radius: 2pt;
      font-size: 9pt;
    }
    .footer {
      margin-top: 36pt;
      padding-top: 12pt;
      border-top: 1pt solid #CCCCCC;
      font-size: 9pt;
      color: #666666;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    <strong>📚 Subject:</strong> ${subject}<br>
    <strong>📅 Date:</strong> ${new Date().toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}<br>
    <strong>🎓 Athro:</strong> ${athroId}<br>
    <strong>⚡ Study Session:</strong> ${sessionId || 'General Notes'}
  </div>
  <div class="content">
    ${editorRef.current?.innerHTML || ''}
  </div>
  ${tags.length > 0 ? `
  <div class="tags">
    <strong>🏷️ Tags:</strong><br><br>
    ${tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}
  </div>
  ` : ''}
  <div class="footer">
    Generated by Athro Study Tools on ${new Date().toLocaleString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}
  </div>
</body>
</html>`;

      // Use the proper MIME type for Word documents
      const blob = new Blob(['\ufeff', htmlContent], { 
        type: 'application/msword'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_notes.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading Word document:', error);
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerText || '');
      // Auto-save to temporary storage on every input
      saveTempContent();
      console.log('📝 Auto-saved content to temp storage');
    }
  };

  const saveTempContent = () => {
    if (editorRef.current) {
      const tempData = {
        title: title,
        content: editorRef.current.innerHTML
      };
      localStorage.setItem(tempStorageKey, JSON.stringify(tempData));
    }
  };

  const clearTempContent = () => {
    localStorage.removeItem(tempStorageKey);
  };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      setContent(editorRef.current.innerText || '');
    }
  };

  const handleFontChange = (fontFamily: string) => {
    setCurrentFont(fontFamily);
    formatText('fontName', fontFamily);
  };

  const handleFontSizeChange = (fontSize: string) => {
    setCurrentFontSize(fontSize);
    formatText('fontSize', fontSize);
  };

  const handleAlignment = (alignment: string) => {
    switch (alignment) {
      case 'left':
        formatText('justifyLeft');
        break;
      case 'center':
        formatText('justifyCenter');
        break;
      case 'right':
        formatText('justifyRight');
        break;
      case 'justify':
        formatText('justifyFull');
        break;
    }
  };

  const insertDateTime = () => {
    const now = new Date();
    const dateTime = now.toLocaleString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const dateElement = document.createElement('div');
        dateElement.innerHTML = `<br><br>=== ${dateTime} ===<br>`;
        range.insertNode(dateElement);
        range.setStartAfter(dateElement);
        range.setEndAfter(dateElement);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      setContent(editorRef.current.innerText || '');
    }
  };

  if (isMinimized) {
    return null; // Don't render anything when minimized - parent will handle the UI
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 30000,
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        border: '2px solid #4fc38a',
        borderRadius: '1rem',
        width: '95%',
        height: '95%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #4fc38a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          background: 'rgba(79, 195, 138, 0.1)'
        }}>
          <h4 style={{ color: '#e4c97e', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ✏ Full Notes Editor
            {initialNote && <span style={{ fontSize: '0.8rem', color: '#4fc38a' }}>(Editing)</span>}
          </h4>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => {
                // Save current content before switching to chat
                saveTempContent();
                if (onMinimize) {
                  onMinimize();
                }
                setIsMinimized(true);
              }}
              style={{
                background: 'transparent',
                border: '2px solid #4fc38a',
                borderRadius: '0.5rem',
                color: '#4fc38a',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#4fc38a';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#4fc38a';
              }}
              title="Minimize to access chat"
            >
              Switch To Chat
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '2px solid #4fc38a',
                borderRadius: '0.5rem',
                color: '#4fc38a',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#4fc38a';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#4fc38a';
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Enhanced Toolbar */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid rgba(79, 195, 138, 0.3)',
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          flexShrink: 0,
          background: 'rgba(0, 0, 0, 0.3)'
        }}>
          {/* Font Family Dropdown */}
          <select 
            value={currentFont} 
            onChange={(e) => handleFontChange(e.target.value)}
            style={{
              padding: '0.4rem',
              background: 'rgba(79, 195, 138, 0.1)',
              border: '1px solid #4fc38a',
              borderRadius: '0.25rem',
              color: '#4fc38a',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
            <option value="Courier New">Courier New</option>
            <option value="Calibri">Calibri</option>
            <option value="Cambria">Cambria</option>
          </select>

          {/* Font Size Dropdown */}
          <select 
            value={currentFontSize} 
            onChange={(e) => handleFontSizeChange(e.target.value)}
            style={{
              padding: '0.4rem',
              background: 'rgba(79, 195, 138, 0.1)',
              border: '1px solid #4fc38a',
              borderRadius: '0.25rem',
              color: '#4fc38a',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            <option value="1">8pt</option>
            <option value="2">10pt</option>
            <option value="3">12pt</option>
            <option value="4">14pt</option>
            <option value="5">18pt</option>
            <option value="6">24pt</option>
            <option value="7">36pt</option>
          </select>

          <div style={{ width: '1px', height: '20px', background: '#4fc38a', margin: '0 0.5rem' }} />

          {/* Text Formatting */}
          <button onClick={() => formatText('bold')} style={{
            padding: '0.5rem',
            background: 'rgba(79, 195, 138, 0.1)',
            border: '1px solid #4fc38a',
            borderRadius: '0.25rem',
            color: '#4fc38a',
            cursor: 'pointer',
            fontWeight: 'bold',
            minWidth: '32px'
          }}>B</button>
          
          <button onClick={() => formatText('italic')} style={{
            padding: '0.5rem',
            background: 'rgba(79, 195, 138, 0.1)',
            border: '1px solid #4fc38a',
            borderRadius: '0.25rem',
            color: '#4fc38a',
            cursor: 'pointer',
            fontStyle: 'italic',
            minWidth: '32px'
          }}>I</button>
          
          <button onClick={() => formatText('underline')} style={{
            padding: '0.5rem',
            background: 'rgba(79, 195, 138, 0.1)',
            border: '1px solid #4fc38a',
            borderRadius: '0.25rem',
            color: '#4fc38a',
            cursor: 'pointer',
            textDecoration: 'underline',
            minWidth: '32px'
          }}>U</button>

          <div style={{ width: '1px', height: '20px', background: '#4fc38a', margin: '0 0.5rem' }} />

          {/* Alignment Controls */}
          <button onClick={() => handleAlignment('left')} style={{
            padding: '0.5rem',
            background: 'rgba(79, 195, 138, 0.1)',
            border: '1px solid #4fc38a',
            borderRadius: '0.25rem',
            color: '#4fc38a',
            cursor: 'pointer',
            fontSize: '0.8rem',
            width: '32px',
            height: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: '2px'
          }} title="Align Left">
            <div style={{ width: '80%', height: '2px', background: '#4fc38a' }}></div>
            <div style={{ width: '60%', height: '2px', background: '#4fc38a' }}></div>
            <div style={{ width: '90%', height: '2px', background: '#4fc38a' }}></div>
          </button>

          <button onClick={() => handleAlignment('center')} style={{
            padding: '0.5rem',
            background: 'rgba(79, 195, 138, 0.1)',
            border: '1px solid #4fc38a',
            borderRadius: '0.25rem',
            color: '#4fc38a',
            cursor: 'pointer',
            fontSize: '0.8rem',
            width: '32px',
            height: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px'
          }} title="Center">
            <div style={{ width: '80%', height: '2px', background: '#4fc38a' }}></div>
            <div style={{ width: '60%', height: '2px', background: '#4fc38a' }}></div>
            <div style={{ width: '90%', height: '2px', background: '#4fc38a' }}></div>
          </button>

          <button onClick={() => handleAlignment('right')} style={{
            padding: '0.5rem',
            background: 'rgba(79, 195, 138, 0.1)',
            border: '1px solid #4fc38a',
            borderRadius: '0.25rem',
            color: '#4fc38a',
            cursor: 'pointer',
            fontSize: '0.8rem',
            width: '32px',
            height: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: '2px'
          }} title="Align Right">
            <div style={{ width: '80%', height: '2px', background: '#4fc38a' }}></div>
            <div style={{ width: '60%', height: '2px', background: '#4fc38a' }}></div>
            <div style={{ width: '90%', height: '2px', background: '#4fc38a' }}></div>
          </button>

          <button onClick={() => handleAlignment('justify')} style={{
            padding: '0.5rem',
            background: 'rgba(79, 195, 138, 0.1)',
            border: '1px solid #4fc38a',
            borderRadius: '0.25rem',
            color: '#4fc38a',
            cursor: 'pointer',
            fontSize: '0.8rem',
            width: '32px',
            height: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'center',
            gap: '2px'
          }} title="Justify">
            <div style={{ width: '100%', height: '2px', background: '#4fc38a' }}></div>
            <div style={{ width: '100%', height: '2px', background: '#4fc38a' }}></div>
            <div style={{ width: '100%', height: '2px', background: '#4fc38a' }}></div>
          </button>
          
          <div style={{ width: '1px', height: '20px', background: '#4fc38a', margin: '0 0.5rem' }} />
          
          {/* Lists */}
          <button onClick={() => formatText('insertUnorderedList')} style={{
            padding: '0.5rem',
            background: 'rgba(79, 195, 138, 0.1)',
            border: '1px solid #4fc38a',
            borderRadius: '0.25rem',
            color: '#4fc38a',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}>• List</button>
          
          <button onClick={() => formatText('insertOrderedList')} style={{
            padding: '0.5rem',
            background: 'rgba(79, 195, 138, 0.1)',
            border: '1px solid #4fc38a',
            borderRadius: '0.25rem',
            color: '#4fc38a',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}>1. List</button>

          <div style={{ width: '1px', height: '20px', background: '#4fc38a', margin: '0 0.5rem' }} />

          <button onClick={insertDateTime} style={{
            padding: '0.5rem',
            background: 'rgba(228, 201, 126, 0.1)',
            border: '1px solid #e4c97e',
            borderRadius: '0.25rem',
            color: '#e4c97e',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}>⏰ Date/Time</button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Title */}
          <div style={{ padding: '1rem 1.5rem 0' }}>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                // Save to temp storage when title changes
                setTimeout(saveTempContent, 100);
              }}
              placeholder="Enter note title..."
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '2px solid rgba(228, 201, 126, 0.5)',
                borderRadius: '0.5rem',
                color: '#e4c97e',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                outline: 'none',
                transition: 'border-color 0.2s',
                direction: 'ltr',
                textAlign: 'left'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#e4c97e';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(228, 201, 126, 0.5)';
              }}
              onPaste={handleTitlePaste}
            />
          </div>

          {/* Editor */}
          <div style={{
            flex: 1,
            padding: '1rem 1.5rem',
            overflow: 'auto'
          }}>
            <div
              ref={editorRef}
              contentEditable
              onInput={handleEditorInput}
              style={{
                minHeight: '300px',
                height: '100%',
                padding: '1.5rem',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '2px solid rgba(79, 195, 138, 0.5)',
                borderRadius: '0.75rem',
                color: 'white',
                fontSize: '1.1rem',
                lineHeight: '1.8',
                outline: 'none',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                direction: 'ltr',
                textAlign: 'left',
                unicodeBidi: 'normal',
                overflow: 'auto',
                boxSizing: 'border-box'
              }}
              suppressContentEditableWarning={true}
              onPaste={handleContentPaste}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #4fc38a',
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end',
          flexShrink: 0,
          background: 'rgba(79, 195, 138, 0.05)'
        }}>
          <button
            onClick={handleDownloadWord}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(228, 201, 126, 0.1)',
              border: '1px solid #e4c97e',
              borderRadius: '0.5rem',
              color: '#e4c97e',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 'bold'
            }}
          >
            📄 Download Word
          </button>
          
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: '1px solid #e77373',
              borderRadius: '0.5rem',
              color: '#e77373',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            disabled={isLoading || !title.trim()}
            style={{
              padding: '0.75rem 2rem',
              background: title.trim() && !isLoading ? 'linear-gradient(135deg, #4fc38a, #45b373)' : '#666',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'white',
              fontWeight: 'bold',
              cursor: title.trim() && !isLoading ? 'pointer' : 'not-allowed',
              boxShadow: title.trim() && !isLoading ? '0 4px 8px rgba(79, 195, 138, 0.3)' : 'none'
            }}
          >
            {isLoading ? '⏳ Saving...' : initialNote ? '✓ Update Note' : '✓ Save Note'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FullNotesEditor; 