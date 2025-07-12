import React, { useState } from 'react';

interface NoteFormProps {
  initialValues?: {
    topic: string;
    content: string;
    tags: string[];
  };
  onSubmit: (data: { 
    topic: string; 
    content: string; 
    tags: string[];
  }) => void;
  onCancel: () => void;
}

const NoteForm: React.FC<NoteFormProps> = ({
  initialValues = { topic: '', content: '', tags: [] },
  onSubmit,
  onCancel
}) => {
  const [topic, setTopic] = useState(initialValues?.topic || '');
  const [content, setContent] = useState(initialValues?.content || '');
  const [tags, setTags] = useState<string[]>(initialValues?.tags || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = { 
      topic, 
      content, 
      tags
    };

    onSubmit(formData);
  };

  // Handle paste events to strip formatting and paste as plain text
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    
    // Get plain text from clipboard
    const plainText = e.clipboardData.getData('text/plain');
    
    // Get current selection
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Insert plain text at cursor position
    const newContent = content.substring(0, start) + plainText + content.substring(end);
    setContent(newContent);
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + plainText.length;
      textarea.focus();
    }, 0);
  };

  const handleTopicPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    // Get plain text from clipboard
    const plainText = e.clipboardData.getData('text/plain');
    
    // Get current selection
    const input = e.currentTarget;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    
    // Insert plain text at cursor position
    const newTopic = topic.substring(0, start) + plainText + topic.substring(end);
    setTopic(newTopic);
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      input.selectionStart = input.selectionEnd = start + plainText.length;
      input.focus();
    }, 0);
  };

  return (
    <div style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <form 
        onSubmit={handleSubmit}
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1
        }}
      >
        <div style={{ marginBottom: '1rem' }}>
          <label 
            htmlFor="topic" 
            style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              color: 'white', 
              fontSize: '0.9rem' 
            }}
          >
            Title *
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onPaste={handleTopicPaste}
            placeholder="Enter note title..."
            required
            style={{
              width: '100%',
              padding: '0.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '0.3rem',
              color: 'white',
              fontSize: '1rem',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <label 
            htmlFor="content" 
            style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              color: 'white', 
              fontSize: '0.9rem' 
            }}
          >
            Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            placeholder="Enter your notes here..."
            style={{
              flex: 1,
              padding: '0.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '0.3rem',
              color: 'white',
              fontSize: '1rem',
              resize: 'none',
              fontFamily: 'inherit',
              lineHeight: '1.5'
            }}
          />
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '0.4rem 0.8rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '0.3rem',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: '0.4rem 0.8rem',
              background: '#4fc38a',
              border: 'none',
              borderRadius: '0.3rem',
              color: '#17221c',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.85rem'
            }}
          >
            {initialValues ? 'Update Note' : 'Create Note'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NoteForm;
