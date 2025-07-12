import { 
  TextractClient, 
  DetectDocumentTextCommand,
  AnalyzeDocumentCommand,
  FeatureType
} from "@aws-sdk/client-textract";
import { Resource } from '../types/resources';
import studyService from './StudyService';

/**
 * Service for processing documents using AWS Textract
 */
class TextractService {
  private client: TextractClient | null = null;
  private isInitialized = false;
  
  constructor() {
    try {
      // For Vite, we need to use import.meta.env instead of process.env
      const region = import.meta.env.VITE_AWS_REGION || 'eu-west-2';
      const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
      const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
      
      // Debug log for initialization (will be removed in production)
      console.log('Initializing TextractService with region:', region);
      console.log('Access key available:', !!accessKeyId);
      
      // Only initialize the client if we have credentials
      if (accessKeyId && secretAccessKey) {
        this.client = new TextractClient({ 
          region: region,
          credentials: {
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey
          }
        });
        this.isInitialized = true;
      } else {
        console.log('AWS credentials not available - Textract features will be disabled');
      }
    } catch (error) {
      console.error('Failed to initialize TextractService:', error);
    }
  }
  
  /**
   * Process PDF or image document using AWS Textract
   * @param resource The resource to process
   * @returns Extracted text content
   */
  async extractTextFromDocument(resource: Resource): Promise<string> {
    try {
      const fileName = resource.resourcePath ? resource.resourcePath.split('/').pop() || 'Unknown file' : 'Unknown file';
      console.log('🔍 TextractService: Starting document processing for:', fileName);
      console.log('🔍 TextractService: Resource type:', resource.resourceType);
      console.log('🔍 TextractService: Resource path:', resource.resourcePath);
      
      if (!this.isInitialized) {
        console.log('📄 TextractService not initialized - trying local PDF processing');
        return await this.processPDFLocally(resource);
      }

      console.log('🔍 Processing document with AWS Textract:', fileName);
      
      // Get document binary data
      console.log('🔍 Getting document bytes...');
      const documentBytes = await this.getDocumentBytes(resource);
      console.log('🔍 Document bytes obtained, size:', documentBytes.length);
      
      // Process with Textract
      console.log('🔍 Calling detectText...');
      const extractedText = await this.detectText(documentBytes);
      console.log('🔍 Textract detection completed, text length:', extractedText?.length || 0);
      
      return extractedText;
    } catch (error) {
      console.error('❌ Error extracting text using AWS Textract:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      
      // Handle specific AWS Textract errors
      if (error instanceof Error) {
        if (error.message.includes('UnsupportedDocumentException')) {
          console.log('📄 Document format not supported by Textract, trying local PDF processing');
          return await this.processPDFLocally(resource);
        } else if (error.message.includes('InvalidDocumentException')) {
          console.log('📄 Invalid document format, trying local PDF processing');
          return await this.processPDFLocally(resource);
        } else if (error.message.includes('DocumentTooLargeException')) {
          console.log('📄 Document too large for Textract, trying local PDF processing');
          return await this.processPDFLocally(resource);
        }
      }
      
      // Try local PDF processing as fallback
      console.log('📄 Trying local PDF processing as fallback');
      return await this.processPDFLocally(resource);
    }
  }
  
  /**
   * Process PDF locally using PDF.js when AWS Textract fails
   */
  private async processPDFLocally(resource: Resource): Promise<string> {
    try {
      const fileName = resource.resourcePath ? resource.resourcePath.split('/').pop() || 'Unknown file' : 'Unknown file';
      console.log('📄 Starting local PDF processing for:', fileName);
      
      // Get document binary data
      console.log('📄 Getting document bytes for local processing...');
      const documentBytes = await this.getDocumentBytes(resource);
      console.log('📄 Document bytes obtained for local processing, size:', documentBytes.length);
      
      // Validate PDF format
      if (documentBytes.length > 0) {
        const pdfHeader = new TextDecoder().decode(documentBytes.slice(0, 4));
        console.log('📄 PDF header check:', pdfHeader);
        if (pdfHeader !== '%PDF') {
          console.warn('⚠️ Document does not appear to be a valid PDF (missing %PDF header)');
          throw new Error('Invalid PDF format: missing PDF header');
        }
        console.log('✅ PDF header validation passed for local processing');
      }
      
      // Try to use PDF.js for local processing
      console.log('📄 Calling extractTextWithPDFJS...');
      const extractedText = await this.extractTextWithPDFJS(documentBytes);
      console.log('📄 PDF.js extraction completed, text length:', extractedText?.length || 0);
      console.log('📄 PDF.js extracted text preview:', extractedText?.substring(0, 200));
      
      if (extractedText && extractedText.trim().length > 0) {
        console.log('✅ Local PDF processing successful');
        console.log('📄 Raw extracted text (first 500 chars):', extractedText.substring(0, 500));
        return this.formatPDFContent(resource, extractedText);
      } else {
        console.error('❌ PDF.js returned empty text');
        console.error('❌ Raw extracted text value:', JSON.stringify(extractedText));
        throw new Error('No text extracted from PDF - document may be image-based or encrypted');
      }
    } catch (localError) {
      console.error('❌ Local PDF processing failed with error:', localError);
      console.error('❌ Error stack:', localError instanceof Error ? localError.stack : 'No stack available');
      
      // Return the actual error instead of generic fallback for debugging
      const errorDetails = localError instanceof Error ? localError.message : String(localError);
      throw new Error(`PDF processing failed: ${errorDetails}`);
    }
  }
  
  /**
   * Extract text using PDF.js library with enhanced 2-column detection
   */
  private async extractTextWithPDFJS(documentBytes: Uint8Array): Promise<string> {
    try {
      console.log('📄 Starting PDF.js text extraction...');
      
      // Dynamic import of PDF.js
      console.log('📄 Loading PDF.js library...');
      const pdfjsLib = await import('pdfjs-dist');
      console.log('📄 PDF.js library loaded, version:', pdfjsLib.version);
      
      // Set up PDF.js worker - use correct port for embedded workspace
      // IMPORTANT: Set worker source before any PDF operations to prevent fallback to wrong port
      const workerSrc = 'http://localhost:5175/pdf.worker.min.js';
      console.log('📄 Setting PDF.js worker source:', workerSrc);
      
      // Set worker source in multiple ways to ensure it works
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      
      // Also try setting it on the window object for legacy compatibility
      if (typeof window !== 'undefined') {
        (window as any).pdfjsWorkerSrc = workerSrc;
      }
      
      // Force clear any existing worker to ensure fresh initialization
      try {
        if ((pdfjsLib as any).PDFWorker && (pdfjsLib as any).PDFWorker.destroy) {
          (pdfjsLib as any).PDFWorker.destroy();
        }
      } catch (e) {
        console.log('📄 Note: Could not clear existing worker (this is usually fine)');
      }
      
      // Set worker source again after potential cleanup
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      
      // Verify the worker source was set correctly
      console.log('📄 Verified worker source:', pdfjsLib.GlobalWorkerOptions.workerSrc);
      
      // Small delay to ensure worker source setting takes effect
      await new Promise(resolve => setTimeout(resolve, 10));
      
      console.log('📄 Loading PDF with PDF.js...');
      console.log('📄 Document bytes size:', documentBytes.length);
      
      // Load the PDF document with debugging enabled
      const loadingTask = pdfjsLib.getDocument({ 
        data: documentBytes,
        // Add verbose logging for debugging
        verbosity: 1
      });
      
      console.log('📄 Loading task created, awaiting PDF...');
      const pdf = await loadingTask.promise;
      
      console.log('📄 PDF loaded successfully, pages:', pdf.numPages);
      
      let fullText = '';
      let is2Column = false;
      
      // Extract text from each page with enhanced column detection
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`📄 Processing page ${pageNum}/${pdf.numPages}`);
        
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        console.log(`📄 Page ${pageNum} has ${textContent.items.length} text items`);
        
        if (textContent.items.length === 0) {
          fullText += `\n--- Page ${pageNum} ---\n(No text content detected)\n`;
          continue;
        }
        
        // Sort text items by vertical position (top to bottom) then horizontal position (left to right)
        const sortedItems = textContent.items
          .filter((item: any) => 'transform' in item && 'str' in item) // Only include TextItem objects with transform data
          .sort((a: any, b: any) => {
            const yDiff = Math.abs(a.transform[5] - b.transform[5]);
            if (yDiff < 5) { // Same line, sort by x position
              return a.transform[4] - b.transform[4];
            }
            return b.transform[5] - a.transform[5]; // Sort by y position (top to bottom)
          });
        
        // Detect if this page has 2 columns by analyzing horizontal positions
        const pageWidth = page.getViewport({ scale: 1 }).width;
        const leftColumnItems: any[] = [];
        const rightColumnItems: any[] = [];
        const centerThreshold = pageWidth / 2;
        
        // Group items by column
        for (const item of sortedItems) {
          const x = (item as any).transform[4];
          if (x < centerThreshold) {
            leftColumnItems.push(item);
          } else {
            rightColumnItems.push(item);
          }
        }
        
        // Determine if this is a 2-column layout
        const hasLeftColumn = leftColumnItems.length > 0;
        const hasRightColumn = rightColumnItems.length > 0;
        const is2ColumnPage = hasLeftColumn && hasRightColumn && 
                              leftColumnItems.length > 3 && rightColumnItems.length > 3;
        
        if (is2ColumnPage) {
          is2Column = true;
          console.log(`📄 Page ${pageNum} detected as 2-column layout`);
          
          // Process as 2-column layout
          fullText += `\n--- Page ${pageNum} (2-Column Layout) ---\n`;
          
          // Sort each column by vertical position
          leftColumnItems.sort((a, b) => b.transform[5] - a.transform[5]);
          rightColumnItems.sort((a, b) => b.transform[5] - a.transform[5]);
          
          // Extract text from each column
          const leftColumnText = leftColumnItems.map(item => item.str).join(' ').trim();
          const rightColumnText = rightColumnItems.map(item => item.str).join(' ').trim();
          
          // Format as bilingual content
          fullText += `\n**LEFT COLUMN:**\n${leftColumnText}\n\n`;
          fullText += `**RIGHT COLUMN:**\n${rightColumnText}\n\n`;
          
          // Also provide side-by-side format if content looks like translations
          if (this.detectBilingualContent(leftColumnText, rightColumnText)) {
            fullText += `**BILINGUAL SIDE-BY-SIDE:**\n`;
            fullText += `| Left Column | Right Column |\n`;
            fullText += `|-------------|-------------|\n`;
            
            // Split into sentences and align
            const leftSentences = leftColumnText.split(/[.!?]+/).filter(s => s.trim().length > 0);
            const rightSentences = rightColumnText.split(/[.!?]+/).filter(s => s.trim().length > 0);
            
            const maxSentences = Math.max(leftSentences.length, rightSentences.length);
            for (let i = 0; i < maxSentences; i++) {
              const leftText = (leftSentences[i] || '').trim();
              const rightText = (rightSentences[i] || '').trim();
              if (leftText || rightText) {
                fullText += `| ${leftText} | ${rightText} |\n`;
              }
            }
            fullText += `\n`;
          }
        } else {
          // Process as single column
          const pageText = sortedItems.map((item: any) => item.str).join(' ');
          fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
          console.log(`📄 Page ${pageNum} text length:`, pageText.length);
        }
      }
      
      // Add metadata about document structure
      if (is2Column) {
        fullText = `**DOCUMENT STRUCTURE:** This document contains 2-column layout with bilingual content.\n\n${fullText}`;
      }
      
      const result = fullText.trim();
      console.log('✅ PDF.js text extraction completed, total text length:', result.length);
      console.log('✅ First 200 characters:', result.substring(0, 200));
      
      if (result.length === 0) {
        throw new Error('PDF.js extracted no text from the document');
      }
      
      return result;
    } catch (pdfjsError) {
      console.error('❌ PDF.js processing failed:', pdfjsError);
      console.error('❌ PDF.js error details:', pdfjsError instanceof Error ? pdfjsError.message : String(pdfjsError));
      
      // Check if this is a worker loading error - if so, try without worker
      const errorMessage = pdfjsError instanceof Error ? pdfjsError.message : String(pdfjsError);
      if (errorMessage.includes('Cannot load script') || errorMessage.includes('worker failed')) {
        console.log('🔄 Worker loading failed, retrying without worker...');
        return await this.extractTextWithPDFJSNoWorker(documentBytes);
      }
      
      // Provide more specific error information for other errors
      let finalErrorMessage = 'PDF.js processing failed: ';
      if (pdfjsError instanceof Error) {
        if (pdfjsError.message.includes('Invalid PDF')) {
          finalErrorMessage += 'The file is not a valid PDF format.';
        } else if (pdfjsError.message.includes('Password')) {
          finalErrorMessage += 'The PDF is password protected.';
        } else if (pdfjsError.message.includes('extracted no text')) {
          finalErrorMessage += 'The PDF contains no extractable text (may be image-based).';
        } else {
          finalErrorMessage += pdfjsError.message;
        }
      } else {
        finalErrorMessage += 'Unknown PDF.js error occurred.';
      }
      
      throw new Error(finalErrorMessage);
    }
  }
  
  /**
   * Extract text using PDF.js library without worker (fallback method)
   */
  private async extractTextWithPDFJSNoWorker(documentBytes: Uint8Array): Promise<string> {
    try {
      console.log('📄 Starting PDF.js text extraction WITHOUT worker...');
      
      // Dynamic import of PDF.js
      const pdfjsLib = await import('pdfjs-dist');
      console.log('📄 PDF.js library loaded for no-worker mode, version:', pdfjsLib.version);
      
      // Disable worker entirely for this extraction
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      console.log('📄 Worker disabled, running in main thread...');
      
      console.log('📄 Loading PDF with PDF.js (no worker)...');
      console.log('📄 Document bytes size:', documentBytes.length);
      
             // Load the PDF document without worker
       const loadingTask = pdfjsLib.getDocument({ 
         data: documentBytes,
         verbosity: 1
       });
      
      console.log('📄 Loading task created (no worker), awaiting PDF...');
      const pdf = await loadingTask.promise;
      
      console.log('📄 PDF loaded successfully (no worker), pages:', pdf.numPages);
      
      let fullText = '';
      
      // Extract text from each page (simplified version without 2-column detection for fallback)
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`📄 Processing page ${pageNum}/${pdf.numPages} (no worker)`);
        
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        console.log(`📄 Page ${pageNum} has ${textContent.items.length} text items (no worker)`);
        
        if (textContent.items.length === 0) {
          fullText += `\n--- Page ${pageNum} ---\n(No text content detected)\n`;
          continue;
        }
        
        // Simple text extraction without complex column detection
        const pageText = textContent.items
          .filter((item: any) => 'str' in item)
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
        console.log(`📄 Page ${pageNum} text length (no worker):`, pageText.length);
      }
      
      const result = fullText.trim();
      console.log('✅ PDF.js text extraction completed (no worker), total text length:', result.length);
      console.log('✅ First 200 characters (no worker):', result.substring(0, 200));
      
      if (result.length === 0) {
        throw new Error('PDF.js extracted no text from the document (no worker mode)');
      }
      
      return result;
    } catch (pdfjsError) {
      console.error('❌ PDF.js processing failed (no worker):', pdfjsError);
      console.error('❌ PDF.js error details (no worker):', pdfjsError instanceof Error ? pdfjsError.message : String(pdfjsError));
      
      let errorMessage = 'PDF.js processing failed (no worker): ';
      if (pdfjsError instanceof Error) {
        if (pdfjsError.message.includes('Invalid PDF')) {
          errorMessage += 'The file is not a valid PDF format.';
        } else if (pdfjsError.message.includes('Password')) {
          errorMessage += 'The PDF is password protected.';
        } else if (pdfjsError.message.includes('extracted no text')) {
          errorMessage += 'The PDF contains no extractable text (may be image-based).';
        } else {
          errorMessage += pdfjsError.message;
        }
      } else {
        errorMessage += 'Unknown PDF.js error occurred.';
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Detect if content appears to be bilingual (different languages in left/right columns)
   */
  private detectBilingualContent(leftText: string, rightText: string): boolean {
    // Simple heuristic: if text lengths are similar and content is different, likely bilingual
    const leftWords = leftText.split(/\s+/).length;
    const rightWords = rightText.split(/\s+/).length;
    
    // Check if word counts are reasonably similar (within 50% of each other)
    const wordRatio = Math.min(leftWords, rightWords) / Math.max(leftWords, rightWords);
    const hasSimilarLength = wordRatio > 0.5;
    
    // Check if content is actually different (not just duplicated)
    const similarity = this.calculateTextSimilarity(leftText, rightText);
    const isDifferentContent = similarity < 0.8; // Less than 80% similar
    
    return hasSimilarLength && isDifferentContent && leftWords > 10 && rightWords > 10;
  }
  
  /**
   * Calculate text similarity between two strings
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const allWords = new Set([...words1, ...words2]);
    const intersection = words1.filter(word => words2.includes(word));
    
    return intersection.length / allWords.size;
  }
  
  /**
   * Format PDF content for display
   */
  private formatPDFContent(resource: Resource, extractedText: string): string {
    const fileName = resource.resourcePath ? resource.resourcePath.split('/').pop() || 'Unknown file' : 'Unknown file';
    const wordCount = extractedText.split(/\s+/).length;
    const pageCount = (extractedText.match(/--- Page \d+ ---/g) || []).length || 1;
    
    let content = `PDF document: "${fileName}"`;
    
    if (resource.topic) {
      content += ` (${resource.topic})`;
    }
    
    content += `\n\nDocument overview: ${pageCount} page${pageCount !== 1 ? 's' : ''}, approximately ${wordCount} words.\n\n`;
    
    // For long documents, provide a summary instead of all content
    if (wordCount > 1000 || pageCount > 5) {
      // Extract the first few paragraphs (up to ~300 words)
      const firstParagraphs = extractedText.split('\n\n').slice(0, 3).join('\n\n');
      const truncatedIntro = firstParagraphs.split(/\s+/).slice(0, 300).join(' ');
      
      content += `Document begins with:\n\n${truncatedIntro}...\n\n`;
      content += `[Document continues for ${pageCount} pages. The full text has been extracted and can be referenced in conversations.]`;
    } else {
      // For shorter documents, include the full text
      content += `Full content:\n\n${extractedText}`;
    }
    
    return content;
  }
  
  /**
   * Convert resource content to byte array
   */
  private async getDocumentBytes(resource: Resource): Promise<Uint8Array> {
    const fileName = resource.resourcePath ? resource.resourcePath.split('/').pop() || 'Unknown file' : 'Unknown file';
    
    console.log('🔍 Processing content for resource:', fileName);
    console.log('🔍 Resource type:', resource.resourceType);
    console.log('🔍 Resource path:', resource.resourcePath);
    
    // Handle Supabase-stored documents
    if (resource.resourcePath) {
      console.log('📄 Document is stored in Supabase');
      
      // For Supabase documents, we need to fetch the actual file content
      console.log('📄 Fetching file from Supabase storage:', resource.resourcePath);
        try {
        // Import supabase client
        const { supabase } = await import('./supabaseClient');
        
        // ✅ CRITICAL FIX: Validate authentication before storage operations
        console.log('🔐 Checking authentication status...');
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.error('❌ Authentication error:', authError);
          throw new Error(`Authentication failed: ${authError.message}`);
        }
        if (!user) {
          console.error('❌ No authenticated user found');
          throw new Error('User not authenticated. Please sign in to access documents.');
        }
        console.log('✅ User authenticated:', user.email, 'ID:', user.id);
        
        // Try playlist-documents bucket first (most files from ChatInterface are here)
        let bucket = 'playlist-documents';
        console.log(`📄 Trying to fetch from bucket: ${bucket}`);
        console.log(`📄 Storage path: ${resource.resourcePath}`);
        
        // Get the file from Supabase storage
        let { data, error } = await supabase.storage
          .from(bucket)
          .download(resource.resourcePath);
        
        // If not found in playlist-documents, try resources bucket
        if (error || !data) {
          console.log('📄 Not found in playlist-documents, trying resources bucket...');
          bucket = 'resources';
          const fallbackResult = await supabase.storage
            .from(bucket)
            .download(resource.resourcePath);
          
          data = fallbackResult.data;
          error = fallbackResult.error;
        }
        
        if (error) {
          console.error('❌ Storage download error:', error);
          throw new Error(`Failed to download file from Supabase: ${error.message || JSON.stringify(error)}`);
        }
        
        if (!data) {
          throw new Error('No data received from Supabase storage');
          }
          
        const arrayBuffer = await data.arrayBuffer();
          console.log('✅ Successfully fetched file from Supabase storage, size:', arrayBuffer.byteLength);
          return new Uint8Array(arrayBuffer);
        } catch (fetchError) {
          console.error('❌ Error fetching file from Supabase storage:', fetchError);
          throw new Error(`Failed to fetch document from storage: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
        }
    }
    
    console.error('❌ No resource path found');
    throw new Error('No resource path available. PDF processing requires the original PDF file.');
  }
  
  /**
   * Use Textract to detect text in document with enhanced 2-column detection
   */
  private async detectText(documentBytes: Uint8Array): Promise<string> {
    if (!this.client) {
      throw new Error('Textract client not initialized');
    }
    
    // Validate PDF format before sending to Textract
    if (documentBytes.length > 0) {
      console.log('📄 Document size:', documentBytes.length, 'bytes');
      console.log('📄 First few bytes:', Array.from(documentBytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' '));
      
      // Check if it's a valid PDF (should start with %PDF)
      const pdfHeader = new TextDecoder().decode(documentBytes.slice(0, 4));
      if (pdfHeader !== '%PDF') {
        console.warn('⚠️ Document does not appear to be a valid PDF (missing %PDF header)');
        throw new Error('Invalid PDF format: missing PDF header');
      }
      
      console.log('✅ PDF header validation passed');
    }
    
    // Create the request parameters
    const params = {
      Document: { 
        Bytes: documentBytes
      }
    };
    
    console.log('📄 Sending document to AWS Textract...');
    
    // Start with basic text detection
    const command = new DetectDocumentTextCommand(params);
    const response = await this.client.send(command);
    
    console.log('✅ Textract response received');
    
    // Process and format the response with column detection
    let fullText = '';
    let currentPage = 1;
    let is2Column = false;
    
    if (response.Blocks) {
      console.log('📄 Processing', response.Blocks.length, 'blocks from Textract');
      
      // Group blocks by page
      const pageBlocks = new Map<number, any[]>();
      for (const block of response.Blocks) {
        if (block.BlockType === 'LINE' && block.Text && block.Geometry?.BoundingBox) {
          const page = block.Page || 1;
          if (!pageBlocks.has(page)) {
            pageBlocks.set(page, []);
          }
          pageBlocks.get(page)!.push(block);
        }
      }
      
      // Process each page
      for (const [pageNum, blocks] of pageBlocks.entries()) {
        console.log(`📄 Processing Textract page ${pageNum} with ${blocks.length} blocks`);
        
        // Sort blocks by vertical position (top to bottom) then horizontal position (left to right)
        const sortedBlocks = blocks.sort((a, b) => {
          const aTop = a.Geometry.BoundingBox.Top;
          const bTop = b.Geometry.BoundingBox.Top;
          const yDiff = Math.abs(aTop - bTop);
          
          if (yDiff < 0.01) { // Same line, sort by x position
            return a.Geometry.BoundingBox.Left - b.Geometry.BoundingBox.Left;
          }
          return aTop - bTop; // Sort by y position (top to bottom)
        });
        
        // Detect 2-column layout using Textract's precise geometry
        const leftColumnBlocks: any[] = [];
        const rightColumnBlocks: any[] = [];
        const centerThreshold = 0.5; // 50% of page width
        
        // Group blocks by column based on horizontal position
        for (const block of sortedBlocks) {
          const left = block.Geometry.BoundingBox.Left;
          const width = block.Geometry.BoundingBox.Width;
          const centerX = left + (width / 2);
          
          if (centerX < centerThreshold) {
            leftColumnBlocks.push(block);
          } else {
            rightColumnBlocks.push(block);
          }
        }
        
        // Determine if this is a 2-column layout
        const hasLeftColumn = leftColumnBlocks.length > 0;
        const hasRightColumn = rightColumnBlocks.length > 0;
        const is2ColumnPage = hasLeftColumn && hasRightColumn && 
                              leftColumnBlocks.length > 2 && rightColumnBlocks.length > 2;
        
        if (is2ColumnPage) {
          is2Column = true;
          console.log(`📄 Textract detected page ${pageNum} as 2-column layout`);
          
          // Process as 2-column layout
          fullText += `\n--- Page ${pageNum} (2-Column Layout) ---\n`;
          
          // Sort each column by vertical position
          leftColumnBlocks.sort((a, b) => a.Geometry.BoundingBox.Top - b.Geometry.BoundingBox.Top);
          rightColumnBlocks.sort((a, b) => a.Geometry.BoundingBox.Top - b.Geometry.BoundingBox.Top);
          
          // Extract text from each column
          const leftColumnText = leftColumnBlocks.map(block => block.Text).join(' ').trim();
          const rightColumnText = rightColumnBlocks.map(block => block.Text).join(' ').trim();
          
          // Format as bilingual content
          fullText += `\n**LEFT COLUMN:**\n${leftColumnText}\n\n`;
          fullText += `**RIGHT COLUMN:**\n${rightColumnText}\n\n`;
          
          // Also provide side-by-side format if content looks like translations
          if (this.detectBilingualContent(leftColumnText, rightColumnText)) {
            fullText += `**BILINGUAL SIDE-BY-SIDE:**\n`;
            fullText += `| Left Column | Right Column |\n`;
            fullText += `|-------------|-------------|\n`;
            
            // Split into sentences and align
            const leftSentences = leftColumnText.split(/[.!?]+/).filter(s => s.trim().length > 0);
            const rightSentences = rightColumnText.split(/[.!?]+/).filter(s => s.trim().length > 0);
            
            const maxSentences = Math.max(leftSentences.length, rightSentences.length);
            for (let i = 0; i < maxSentences; i++) {
              const leftText = (leftSentences[i] || '').trim();
              const rightText = (rightSentences[i] || '').trim();
              if (leftText || rightText) {
                fullText += `| ${leftText} | ${rightText} |\n`;
              }
            }
            fullText += `\n`;
          }
        } else {
          // Process as single column
          fullText += `\n--- Page ${pageNum} ---\n`;
          for (const block of sortedBlocks) {
            // Add extra newline for paragraph breaks (when there's a significant gap)
            const currentTop = block.Geometry.BoundingBox.Top;
            
            fullText += block.Text + '\n';
          }
        }
      }
      
      // Add metadata about document structure
      if (is2Column) {
        fullText = `**DOCUMENT STRUCTURE:** This document contains 2-column layout with bilingual content.\n\n${fullText}`;
      }
    }
    
    const result = fullText.trim() || 'No text was detected in the document.';
    console.log('📄 Textract extracted text length:', result.length, 'characters');
    return result;
  }
  
  /**
   * Advanced document analysis with form extraction
   * This method can be used if you want to extract tables and forms
   */
  async analyzeDocument(documentBytes: Uint8Array): Promise<string> {
    if (!this.client) {
      throw new Error('Textract client not initialized');
    }
    
    const params = {
      Document: { 
        Bytes: documentBytes
      },
      FeatureTypes: [FeatureType.TABLES, FeatureType.FORMS]
    };
    
    const command = new AnalyzeDocumentCommand(params);
    const response = await this.client.send(command);
    
    // Process the more complex response
    let fullText = 'Document Analysis Results:\n\n';
    
    if (response.Blocks) {
      // Process TABLES and other structured elements
      // This is a simplified implementation
      for (const block of response.Blocks) {
        if (block.BlockType === 'LINE' && block.Text) {
          fullText += block.Text + '\n';
        }
      }
    }
    
    return fullText.trim() || 'No structured data was detected in the document.';
  }
  
  /**
   * Create a fallback response when processing fails
   */
  private createFallbackResponse(resource: Resource, errorMessage: string): string {
    const fileName = resource.resourcePath ? resource.resourcePath.split('/').pop() || 'Unknown file' : 'Unknown file';
    let content = `Document: "${fileName}"\n`;
    content += `Type: ${resource.resourceType}\n`;
    
    // Add topic if available
    if (resource.topic) {
      content += `Topic: ${resource.topic}\n\n`;
    } else {
      content += '\n';
    }
    
    content += `${errorMessage}\n\n`;
    content += 'I can still help you with this document by:\n';
    content += '1. Discussing the general topics related to this document\n';
    content += '2. Creating study materials based on what you tell me about it\n';
    content += '3. Preparing quiz questions on the subject matter\n';
    content += '4. Organizing your study approach for this material\n\n';
    content += 'Please share what specific aspects of this document you would like me to help with.';
    
    return content;
  }
}

export default new TextractService();
