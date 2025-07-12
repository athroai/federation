import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import DocumentProcessingService from '../services/DocumentProcessingService';

interface DocumentViewerProps {
  document: {
    id: string;
    name: string;
    fileType: string;
    storagePath: string;
    athroId: string;
    createdAt: string;
  };
  onClose: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [processedContent, setProcessedContent] = useState<string>('');

  useEffect(() => {
    loadDocument();
  }, [document]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the public URL for the document
      const { data } = supabase.storage
        .from('playlist-documents')
        .getPublicUrl(document.storagePath);

      if (data.publicUrl) {
        setDocumentUrl(data.publicUrl);

        // For text files, try to process the content
        if (document.fileType === 'text/plain' || 
            document.fileType.includes('document') || 
            document.fileType.includes('pdf')) {
          
          try {
            // Create a resource-compatible object for processing
            const resourceForProcessing = {
              id: document.id,
              athroId: document.athroId,
              subject: 'Document',
              topic: 'User uploaded document',
              resourceType: document.fileType,
              resourcePath: document.storagePath,
              createdAt: document.createdAt,
              updatedAt: document.createdAt
            };
            
            const result = await new DocumentProcessingService().processDocument(resourceForProcessing);
            setProcessedContent(result.content);
          } catch (processError) {
            console.warn('Could not process document content:', processError);
          }
        }
      }
    } catch (err) {
      console.error('Error loading document:', err);
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const isPDF = document.fileType === 'application/pdf';
  const isImage = document.fileType.startsWith('image/');
  const isText = document.fileType === 'text/plain';
  const isOfficeDoc = document.fileType.includes('document') || 
                     document.fileType.includes('presentation') || 
                     document.fileType.includes('msword') || 
                     document.fileType.includes('powerpoint');

  const getFileIcon = () => {
    if (isPDF) return '📄';
    if (isImage) return '🖼️';
    if (isText) return '📝';
    if (isOfficeDoc) {
      if (document.fileType.includes('presentation') || document.fileType.includes('powerpoint')) return '📊';
      return '📄';
    }
    return '📁';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: '#1c2a1e',
        borderRadius: '1rem',
        border: '2px solid #4fc38a',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 2rem',
          borderBottom: '1px solid rgba(79, 195, 138, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(79, 195, 138, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{getFileIcon()}</span>
            <div>
              <h3 style={{ 
                color: '#e4c97e', 
                margin: 0, 
                fontSize: '1.2rem',
                fontWeight: '600'
              }}>
                {document.name}
              </h3>
              <p style={{ 
                color: '#b5cbb2', 
                margin: 0, 
                fontSize: '0.9rem',
                opacity: 0.8
              }}>
                {document.fileType}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#e4c97e',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '0.25rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(228, 201, 126, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          minHeight: '400px',
          minWidth: '600px'
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '400px',
              color: '#4fc38a'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div>Loading document...</div>
              </div>
            </div>
          ) : error ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '400px',
              color: '#e85a6a'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div>Error: {error}</div>
                <div style={{ marginTop: '1rem' }}>
                  <button
                    onClick={loadDocument}
                    style={{
                      backgroundColor: '#4fc38a',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.25rem',
                      cursor: 'pointer'
                    }}
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ height: '100%' }}>
              {isPDF && documentUrl && (
                <iframe
                  src={documentUrl + '#toolbar=1&navpanes=1&scrollbar=1'}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                  title={document.name}
                />
              )}
              
              {isImage && documentUrl && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  padding: '2rem'
                }}>
                  <img
                    src={documentUrl}
                    alt={document.name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              )}
              
              {(isText || processedContent) && (
                <div style={{
                  padding: '2rem',
                  color: '#b5cbb2',
                  lineHeight: '1.6',
                  fontFamily: 'monospace',
                  backgroundColor: '#16221a',
                  height: '100%',
                  overflow: 'auto'
                }}>
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                    fontFamily: 'inherit'
                  }}>
                    {processedContent || 'Content could not be extracted for preview.'}
                  </pre>
                </div>
              )}
              
              {isOfficeDoc && !processedContent && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  padding: '2rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                    {getFileIcon()}
                  </div>
                  <h3 style={{ color: '#e4c97e', marginBottom: '1rem' }}>
                    {document.name}
                  </h3>
                  <p style={{ color: '#b5cbb2', marginBottom: '2rem' }}>
                    This document type cannot be previewed directly in the browser.
                  </p>
                  <a
                    href={documentUrl || '#'}
                    download={document.name}
                    style={{
                      backgroundColor: '#4fc38a',
                      color: 'white',
                      textDecoration: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.5rem',
                      fontWeight: '600'
                    }}
                  >
                    Download Document
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer; 