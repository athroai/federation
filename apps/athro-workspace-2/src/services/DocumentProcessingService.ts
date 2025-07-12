import { Resource } from '../types/resources';
import mammoth from 'mammoth';
import TextractService from './TextractService';

/**
 * Service responsible for processing document files and extracting readable content
 */
class DocumentProcessingService {
  /**
   * Process a document for use by the AI
   * @param resource The resource to process
   * @returns Processed content and metadata
   */
  async processDocument(resource: Resource): Promise<{ content: string; isActualContent: boolean }> {
    try {
      const fileName = resource.resourcePath ? resource.resourcePath.split('/').pop() || 'Unknown file' : 'Unknown file';
      const fileExtension = fileName.toLowerCase().split('.').pop() || '';
      console.log('🚀 === DOCUMENT PROCESSING START ===');
      console.log('🔍 Processing document:', fileName);
      console.log('🔍 Resource type:', resource.resourceType);
      console.log('🔍 Resource path:', resource.resourcePath);
      console.log('🔍 File extension:', fileExtension);
      
      // Handle different file types with enhanced processing
      
      // ===== WORD DOCUMENTS (DOCX, DOC) =====
      if (this.isWordDocument(resource.resourceType, fileExtension)) {
        console.log('📝 Detected Word document:', fileName);
        return await this.processWordDocument(resource, fileName);
      }
      
      // ===== PDF FILES =====
      if (this.isPdfFile(resource.resourceType, fileExtension)) {
        console.log('📄 Detected PDF document:', fileName);
        return await this.processPdfFile(resource, fileName);
      }
      
      // ===== TEXT FILES =====
      if (this.isTextFile(resource.resourceType, fileExtension)) {
        console.log('📄 Detected text file:', fileName);
        return await this.processTextFile(resource, fileName);
      }
      
      // ===== FALLBACK FOR UNKNOWN TYPES =====
      console.log('❓ Unknown file type, attempting text extraction:', fileName);
      return await this.processUnknownFile(resource, fileName);
      
    } catch (error) {
      console.error('❌ === DOCUMENT PROCESSING FAILED ===');
      console.error('❌ Error processing document:', error);
      
      const fileName = resource.resourcePath ? resource.resourcePath.split('/').pop() || 'Unknown file' : 'Unknown file';
      return { 
        content: `Critical Error: Document processing failed for "${fileName}". Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        isActualContent: false 
      };
    }
  }

  // ===== FILE TYPE DETECTION METHODS =====
  
  private isWordDocument(resourceType: string, fileExtension: string): boolean {
    return ['docx', 'doc'].includes(fileExtension) ||
           !!(resourceType && (resourceType.includes('word') || 
                             resourceType.includes('document') || 
                             resourceType.includes('officedocument.wordprocessingml')));
  }
  
  private isPdfFile(resourceType: string, fileExtension: string): boolean {
    return fileExtension === 'pdf' || 
           !!(resourceType && resourceType.toLowerCase().includes('pdf'));
  }
  
  private isTextFile(resourceType: string, fileExtension: string): boolean {
    return ['txt', 'md', 'rtf', 'csv'].includes(fileExtension) ||
           !!(resourceType && resourceType.toLowerCase().startsWith('text/'));
  }

  // ===== FILE PROCESSING METHODS =====

  /**
   * Process Word documents (DOCX, DOC)
   */
  private async processWordDocument(resource: Resource, fileName: string): Promise<{ content: string; isActualContent: boolean }> {
    console.log('📝 === WORD DOCUMENT PROCESSING START ===');
    console.log('📝 Document details:', {
      fileName,
      resourceType: resource.resourceType,
      resourcePath: resource.resourcePath,
      topic: resource.topic,
      resourceId: resource.id
    });
    
    try {
      console.log('📝 Attempting to extract text from Word document...');
      const extractedText = await this.processDocxDocument(resource);
      console.log('📝 Text extraction result:', {
        hasText: !!extractedText,
        textLength: extractedText?.length || 0,
        textPreview: extractedText?.substring(0, 100) || 'No text'
      });
      
          if (extractedText && extractedText.trim().length > 0) {
        console.log('✅ Word document text extraction successful');
        return this.createFullContentResponse(extractedText, fileName, 'Word Document', resource);
      } else {
        console.log('❌ No text extracted from Word document');
        return { 
          content: this.createDocxProcessingFailureResponse(resource), 
          isActualContent: false 
        };
      }
    } catch (error) {
      console.error('❌ Error processing Word document:', error);
      return { 
        content: this.createDocxProcessingFailureResponse(resource), 
        isActualContent: false 
      };
    } finally {
      console.log('📝 === WORD DOCUMENT PROCESSING END ===');
    }
  }

  /**
   * Process .docx document using mammoth library
   */
  private async processDocxDocument(resource: Resource): Promise<string> {
    try {
      const fileName = resource.resourcePath ? resource.resourcePath.split('/').pop() || 'Unknown file' : 'Unknown file';
      console.log('📝 Starting mammoth.js processing for:', fileName);
      
      // Get document binary data
      const documentBytes = await this.getDocumentBytes(resource);
      console.log('📝 Document bytes retrieved, size:', documentBytes.length);
      
      // Convert Uint8Array to ArrayBuffer for browser compatibility
      const arrayBuffer = documentBytes.buffer.slice(
        documentBytes.byteOffset,
        documentBytes.byteOffset + documentBytes.byteLength
      );
      
      // Use mammoth to extract text (browser-compatible way)
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      if (result.value && result.value.trim().length > 0) {
        console.log('✅ Mammoth.js extracted text successfully');
        console.log('📝 Extracted text length:', result.value.length);
        console.log('📝 Text preview:', result.value.substring(0, 200));
        return result.value;
      } else {
        console.log('❌ Mammoth.js returned empty text');
        return '';
      }
    } catch (error) {
      console.error('❌ Error in mammoth.js processing:', error);
      throw error;
    }
  }
  
  /**
   * Get document bytes from Supabase storage
   */
  private async getDocumentBytes(resource: Resource): Promise<Uint8Array> {
    const fileName = resource.resourcePath ? resource.resourcePath.split('/').pop() || 'Unknown file' : 'Unknown file';
    
    console.log('📁 Getting document bytes for:', fileName);
    console.log('📁 Resource path:', resource.resourcePath);
    
      try {
        // Import supabase client
        const { supabase } = await import('./supabaseClient');
        
          // Try playlist-documents bucket first
      let bucket = 'playlist-documents';
      console.log(`📁 Trying bucket: ${bucket}`);
      
      let { data, error } = await supabase.storage
        .from(bucket)
        .download(resource.resourcePath);
      
      // If not found in playlist-documents, try resources bucket
      if (error || !data) {
        console.log('📁 Not found in playlist-documents, trying resources bucket...');
        bucket = 'resources';
        const fallbackResult = await supabase.storage
          .from(bucket)
          .download(resource.resourcePath);
        
        data = fallbackResult.data;
        error = fallbackResult.error;
        }
        
        if (error) {
          console.error('❌ Storage download error:', error);
        throw new Error(`Failed to download file from Supabase: ${error.message}`);
        }
        
        if (!data) {
        throw new Error('No data returned from Supabase storage');
      }
      
      console.log('✅ Document downloaded successfully from bucket:', bucket);
      
      // Convert blob to Uint8Array
      const arrayBuffer = await data.arrayBuffer();
      return new Uint8Array(arrayBuffer);
      
    } catch (error) {
      console.error('❌ Error getting document bytes:', error);
      throw error;
    }
  }

  /**
   * Process PDF files
   */
  private async processPdfFile(resource: Resource, fileName: string): Promise<{ content: string; isActualContent: boolean }> {
    console.log('📄 === PDF PROCESSING START ===');
    console.log('📄 Processing PDF file:', fileName);
    console.log('📄 Resource details:', {
      resourcePath: resource.resourcePath,
      resourceType: resource.resourceType,
      topic: resource.topic
    });
    
    try {
      // Try to extract text using TextractService
      console.log('📄 Calling TextractService.extractTextFromDocument...');
      const extractedText = await TextractService.extractTextFromDocument(resource);
      console.log('📄 TextractService response received');
      console.log('📄 Extracted text type:', typeof extractedText);
      console.log('📄 Extracted text length:', extractedText?.length || 0);
      console.log('📄 Extracted text preview:', extractedText?.substring(0, 200) || 'No text');
      
      if (extractedText && extractedText.trim().length > 0) {
        console.log('✅ PDF text extraction successful - creating full content response');
        const response = this.createFullContentResponse(extractedText, fileName, 'PDF Document', resource);
        console.log('✅ Full content response created, length:', response.content.length);
        console.log('📄 === PDF PROCESSING SUCCESS ===');
        return response;
      } else {
        console.log('❌ PDF text extraction returned empty content');
        console.log('❌ === PDF PROCESSING FAILED (EMPTY) ===');
        return { 
          content: this.createPdfProcessingFailureResponse(resource), 
          isActualContent: false 
        };
      }
    } catch (error) {
      console.error('❌ Error processing PDF:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack available');
      console.log('❌ === PDF PROCESSING FAILED (ERROR) ===');
      
      // For debugging, include the actual error in the response
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { 
        content: `PDF processing failed: ${errorMessage}\n\n` + this.createPdfProcessingFailureResponse(resource), 
        isActualContent: false 
      };
    }
  }

  /**
   * Process text files
   */
  private async processTextFile(resource: Resource, fileName: string): Promise<{ content: string; isActualContent: boolean }> {
    try {
      console.log('📄 Processing text file:', fileName);
      
      // Get the raw file content
      const documentBytes = await this.getDocumentBytes(resource);
      const textContent = new TextDecoder('utf-8').decode(documentBytes);
      
      if (textContent && textContent.trim().length > 0) {
        console.log('✅ Text file processing successful');
        return this.createFullContentResponse(textContent, fileName, 'Text File', resource);
      } else {
        throw new Error('Text file appears to be empty');
      }
    } catch (error) {
      console.error('❌ Error processing text file:', error);
      return { 
        content: `Text file: "${fileName}" (uploaded but could not read content)`, 
        isActualContent: false 
      };
    }
  }

  /**
   * Process unknown file types
   */
  private async processUnknownFile(resource: Resource, fileName: string): Promise<{ content: string; isActualContent: boolean }> {
    try {
      console.log('❓ Processing unknown file type:', fileName);
      
      // Try to extract text using TextractService
        const extractedText = await TextractService.extractTextFromDocument(resource);
        
      if (extractedText && extractedText.trim().length > 0) {
        console.log('✅ Unknown file text extraction successful');
        return this.createFullContentResponse(extractedText, fileName, 'Document', resource);
          } else {
        console.log('❌ Unknown file text extraction failed');
        return { 
          content: this.createGenericResponse(resource), 
          isActualContent: false 
        };
      }
    } catch (error) {
      console.error('❌ Error processing unknown file:', error);
      return { 
        content: this.createGenericResponse(resource), 
        isActualContent: false 
      };
    }
  }

  // ===== RESPONSE CREATION METHODS =====

  /**
   * Create full content response for successfully processed documents
   */
  private createFullContentResponse(extractedText: string, fileName: string, fileType: string, resource: Resource): { content: string; isActualContent: boolean } {
    console.log('📄 Creating full content response');
    
    let content = `${fileType}: "${fileName}"\n\n`;
    
    if (resource.topic) {
      content += `Topic: ${resource.topic}\n\n`;
    }
    
    const wordCount = extractedText.split(/\s+/).length;
    content += `Document overview: ${wordCount} words\n\n`;
    
    if (wordCount > 500) {
      // For long documents, show first portion and indicate full content is available
      const firstPortion = extractedText.split(/\s+/).slice(0, 200).join(' ');
      content += `Document begins with:\n\n${firstPortion}...\n\n`;
      content += `[Full document content has been extracted and is available for analysis. The complete text contains ${wordCount} words and can be referenced in our conversation.]`;
    } else {
      // For shorter documents, include full content
      content += `Full document content:\n\n${extractedText}`;
    }
    
    return { content, isActualContent: true };
  }

  /**
   * Create failure response for DOCX processing
   */
  private createDocxProcessingFailureResponse(resource: Resource): string {
    const fileName = resource.resourcePath ? resource.resourcePath.split('/').pop() || 'Unknown file' : 'Unknown file';
    
    let content = `Word Document: "${fileName}"\n\n`;
    
    if (resource.topic) {
      content += `Topic: ${resource.topic}\n\n`;
    }
    
    content += `This Word document has been uploaded but text extraction encountered an issue. I can still help you with:\n\n`;
    content += `• Discussing the document's topic or purpose\n`;
    content += `• Creating study materials based on what you tell me about it\n`;
    content += `• Preparing questions or summaries\n`;
    content += `• Organizing your approach to working with this document\n\n`;
    content += `Please describe what specific aspects of this document you'd like me to help with, or you can copy and paste text from the document for specific questions.`;
    
    return content;
  }

  /**
   * Create failure response for PDF processing
   */
  private createPdfProcessingFailureResponse(resource: Resource): string {
    const fileName = resource.resourcePath ? resource.resourcePath.split('/').pop() || 'Unknown file' : 'Unknown file';
    
    let content = `PDF Document: "${fileName}"\n\n`;
    
    if (resource.topic) {
      content += `Topic: ${resource.topic}\n\n`;
    }
    
    content += `This PDF document has been uploaded but text extraction encountered an issue. I can still help you with:\n\n`;
    content += `• Discussing the document's topic or purpose\n`;
    content += `• Creating study materials based on what you tell me about it\n`;
    content += `• Preparing questions or summaries\n`;
    content += `• Organizing your approach to working with this document\n\n`;
    content += `Please describe what specific aspects of this document you'd like me to help with, or you can copy and paste text from the document for specific questions.`;
    
    return content;
  }

  /**
   * Create generic response for unknown file types
   */
  private createGenericResponse(resource: Resource): string {
    const fileName = resource.resourcePath ? resource.resourcePath.split('/').pop() || 'Unknown file' : 'Unknown file';
    
    let content = `Document: "${fileName}"\n`;
    content += `Type: ${resource.resourceType || 'Unknown'}\n\n`;
    
    if (resource.topic) {
      content += `Topic: ${resource.topic}\n\n`;
    }
    
    content += `This document has been uploaded successfully. I can help you with:\n\n`;
    content += `• Discussing the general topics related to this document\n`;
    content += `• Creating study materials based on what you tell me about it\n`;
    content += `• Preparing quiz questions on the subject matter\n`;
    content += `• Organizing your study approach for this material\n\n`;
    content += `Please describe what specific aspects of this document you would like me to help with.`;
    
    return content;
  }
}

// Export the class directly
export default DocumentProcessingService; 