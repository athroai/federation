// Test file to verify document processing functionality
import DocumentProcessingService from './DocumentProcessingService';

// Mock resource for testing
const mockDocxResource = {
  id: 'test-docx',
  athroId: 'test-athro',
  subject: 'Test Subject',
  topic: 'Test Topic',
  resourceType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  resourcePath: 'test-user-id/test-athro-id/test-document.docx',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

// Test function to verify document processing
export const testDocumentProcessing = async () => {
  console.log('🧪 Testing DocumentProcessingService...');
  
  // Create a test resource object similar to what ChatInterface creates
  const testResource = {
    id: 'test-doc-123',
    athroId: 'athro-drama',
    subject: 'Drama',
    topic: 'User uploaded document',
    resourceType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    resourcePath: 'test-user-id/athro-drama/counselling-contract.docx', // Example path
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  try {
    console.log('🧪 Test Resource Object:', JSON.stringify(testResource, null, 2));
    
    const result = await new DocumentProcessingService().processDocument(testResource);
    
    console.log('🧪 Test Result:', {
      hasActualContent: result.isActualContent,
      contentLength: result.content.length,
      contentPreview: result.content.substring(0, 200)
    });
    
    return result;
  } catch (error) {
    console.error('🧪 Test Failed:', error);
    throw error;
  }
};

// Add to window for easy browser console testing
if (typeof window !== 'undefined') {
  window.testDocProcessing = testDocumentProcessing;
}

// Export the test function
export default testDocumentProcessing; 