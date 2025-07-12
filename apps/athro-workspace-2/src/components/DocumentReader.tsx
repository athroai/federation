import React, { useState, useEffect } from 'react';
import StudyService from '../services/StudyService';
import DocumentProcessingService from '../services/DocumentProcessingService';
import { Resource } from '../types/resources';

/**
 * A component to specifically test document reading functionality
 */
const DocumentReader: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isDocumentReadable, setIsDocumentReadable] = useState<boolean>(false);
  const [documentMetadata, setDocumentMetadata] = useState<Record<string, any>>({});
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    loadDocumentResources();
  }, []);

  const loadDocumentResources = async () => {
    try {
      setStatus('Loading document resources...');
      const allResources = await StudyService.getResources();
      
      // Filter for document types
      const documentResources = allResources.filter(resource => {
        return resource.fileType.includes('document') || 
               resource.fileType.includes('pdf') ||
               resource.fileType.includes('text') ||
               (resource.metadata?.documentType && 
                resource.metadata.documentType.includes('Document'));
      });
      
      setResources(documentResources);
      setStatus(`Found ${documentResources.length} document resources`);
    } catch (error) {
      console.error('Error loading document resources:', error);
      setStatus('Error loading resources');
    }
  };

  const handleExtractText = async (resourceId: string) => {
    try {
      setStatus('Processing document...');
      setExtractedText('');
      setIsDocumentReadable(false);
      setDocumentMetadata({});
      
      const resource = await StudyService.getResourceById(resourceId);
      if (!resource) {
        setStatus('Resource not found');
        return;
      }
      
      setSelectedResource(resource);
      
      // Process the document using our specialized service
      const { content, isReadable, metadata } = await new DocumentProcessingService().processDocument(resource);
      
      setExtractedText(content);
      setIsDocumentReadable(isReadable);
      setDocumentMetadata(metadata);
      
      if (isReadable) {
        setStatus(`Successfully processed ${metadata.documentType || resource.fileType} document`);
      } else if (metadata.error) {
        setStatus(`Unable to fully process document: ${metadata.error}`);
      } else {
        setStatus(`Document detected (${resource.fileType}) - limited processing available`);
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#4fc38a' }}>Document Reader Test</h1>
      
      <div style={{ 
        padding: '0.75rem',
        borderRadius: '0.25rem',
        background: '#333',
        border: '1px solid #4fc38a',
        marginBottom: '1rem'
      }}>
        <h2 style={{ color: '#4fc38a', fontSize: '1rem', marginTop: 0 }}>Status:</h2>
        <div style={{ color: '#e4c97e' }}>{status}</div>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ color: '#4fc38a', fontSize: '1.2rem' }}>Document Resources</h2>
          
          <div style={{ 
            border: '1px solid #4fc38a', 
            borderRadius: '0.5rem',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {resources.length === 0 ? (
              <div style={{ padding: '1rem', color: '#b5cbb2', fontStyle: 'italic' }}>
                No document resources found
              </div>
            ) : (
              <div>
                {resources.map(resource => (
                  <div 
                    key={resource.id}
                    style={{
                      padding: '0.75rem',
                      borderBottom: '1px solid rgba(79, 195, 138, 0.3)',
                      cursor: 'pointer',
                      background: selectedResource?.id === resource.id 
                        ? 'rgba(79, 195, 138, 0.2)' 
                        : 'transparent'
                    }}
                  >
                    <div 
                      style={{ 
                        fontWeight: 'bold', 
                        color: '#4fc38a', 
                        marginBottom: '0.25rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%'
                      }}
                      title={resource.name} // Add tooltip on hover to show full name
                    >
                      {resource.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#b5cbb2', marginBottom: '0.5rem' }}>
                      Type: {resource.metadata?.documentType || resource.fileType}
                    </div>
                    <button
                      onClick={() => handleExtractText(resource.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: '#4fc38a',
                        border: 'none',
                        borderRadius: '0.25rem',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      Extract Text
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button
            onClick={loadDocumentResources}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid #4fc38a',
              borderRadius: '0.25rem',
              color: '#4fc38a',
              cursor: 'pointer'
            }}
          >
            Refresh Documents
          </button>
        </div>
        
        <div style={{ flex: 1 }}>
          <h2 style={{ color: '#4fc38a', fontSize: '1.2rem' }}>Extracted Text Content</h2>
          
          <div style={{ 
            border: '1px solid #4fc38a', 
            borderRadius: '0.5rem',
            padding: '1rem',
            minHeight: '300px',
            maxHeight: '500px',
            overflowY: 'auto',
            background: 'rgba(22, 34, 28, 0.8)',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {extractedText ? (
              <>
                <div style={{ marginBottom: '1rem' }}>{extractedText}</div>
                
                {/* Display document metadata */}
                {Object.keys(documentMetadata).length > 0 && (
                  <div style={{
                    marginTop: '1.5rem',
                    marginBottom: '1.5rem',
                    padding: '0.75rem',
                    background: 'rgba(79, 195, 138, 0.1)',
                    borderRadius: '0.25rem',
                    border: '1px solid rgba(79, 195, 138, 0.3)',
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#4fc38a' }}>
                      Document Information
                    </div>
                    {Object.entries(documentMetadata)
                      .filter(([key]) => key !== 'error')
                      .map(([key, value]) => (
                        <div key={key} style={{ display: 'flex', marginBottom: '0.25rem' }}>
                          <div style={{ width: '120px', color: '#b5cbb2' }}>
                            {key.charAt(0).toUpperCase() + key.slice(1)}:
                          </div>
                          <div style={{ color: 'white' }}>
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
                
                {/* Display PDF content in iframe if available */}
                {selectedResource?.fileType.includes('pdf') && selectedResource?.content && (
                  <div style={{ 
                    marginTop: '1rem', 
                    height: '400px', 
                    border: '1px solid rgba(79, 195, 138, 0.3)',
                    borderRadius: '0.25rem'
                  }}>
                    <iframe 
                      src={selectedResource.content + '#toolbar=1&navpanes=1'}
                      title={selectedResource.name}
                      width="100%"
                      height="100%"
                      style={{ border: 'none', borderRadius: '0.25rem' }}
                    />
                  </div>
                )}
                
                {/* Display info message if document isn't fully readable */}
                {!isDocumentReadable && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(228, 201, 126, 0.1)',
                    borderRadius: '0.25rem',
                    border: '1px solid rgba(228, 201, 126, 0.3)',
                    color: '#e4c97e'
                  }}>
                    <strong>Note:</strong> This type of document cannot be fully processed in the browser. 
                    For a complete analysis, you would need specialized processing for this file format.
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: '#b5cbb2', fontStyle: 'italic' }}>
                Select a document to extract text
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentReader;
