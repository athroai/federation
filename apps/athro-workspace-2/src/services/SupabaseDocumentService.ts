import { supabase } from './supabaseClient';

export interface DocumentMetadata {
  id: string;
  name: string;
  file_type: string;
  size: number;
  url: string;
  text?: string;
  page_count?: number;
  created_at: string;
  updated_at: string;
}

export class SupabaseDocumentService {
  async uploadDocument(file: File): Promise<DocumentMetadata> {
    console.log('Starting document upload for file:', file.name);
    
    // First, check authentication status
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error(`Session error: ${sessionError.message}`);
    }
    
    if (!session) {
      console.error('No active session found');
      throw new Error('No active session. Please sign in to upload documents.');
    }
    
    console.log('Session found for user:', session.user.email);
    console.log('User ID from session:', session.user.id);
    console.log('User ID type:', typeof session.user.id);
    console.log('User ID length:', session.user.id?.length);

    // The user is authenticated, so we can trust the user ID from the session
    const userId = session.user.id;
    console.log('✅ User authenticated with ID:', userId);

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const storagePath = `documents/${filename}`;

    console.log('Uploading file to storage path:', storagePath);

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, file);
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log('File uploaded successfully to storage');

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    console.log('Public URL generated:', publicUrl);

    // Extract text from the document
    const extractedText = await this.extractTextFromFile(file);
    console.log('Text extracted, length:', extractedText.length);

    console.log('Using user ID for document insert:', userId);
    console.log('User ID validation - is string:', typeof userId === 'string');
    console.log('User ID validation - is not empty:', userId && userId.length > 0);
    console.log('User ID validation - looks like UUID:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId));

    // Save metadata to database - UPDATED to match actual schema
    const documentData = {
      user_id: userId,
      name: file.name,
      file_type: file.type,
      size: file.size,
      url: publicUrl,
      text: extractedText,
      page_count: 1,
    };
    
    console.log('Inserting document data:', documentData);
    console.log('Document data user_id type:', typeof documentData.user_id);
    console.log('Document data user_id value:', documentData.user_id);

    const { data: metadata, error: metadataError } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single();
      
    if (metadataError) {
      console.error('Database insert error:', metadataError);
      console.error('Error details:', metadataError.details);
      console.error('Error hint:', metadataError.hint);
      console.error('Error code:', metadataError.code);
      
      // Additional debugging for foreign key constraint errors
      if (metadataError.code === '23503') {
        console.error('🔴 FOREIGN KEY CONSTRAINT ERROR DETECTED');
        console.error('This means the user_id does not exist in the referenced table');
        console.error('User ID that failed:', userId);
        console.error('Please verify this user exists in auth.users table');
        
        // Try to get more information about the constraint
        console.error('Error details:', metadataError.details);
        console.error('Error hint:', metadataError.hint);
      }
      
      throw new Error(`Metadata save failed: ${metadataError.message}`);
    }
    
    console.log('✅ Document metadata saved successfully:', metadata);
    return metadata;
  }

  async extractTextFromFile(file: File): Promise<string> {
    console.log('🔍 Starting text extraction for file:', file.name);
    console.log('File type:', file.type);
    console.log('File size:', file.size);
    console.log('File extension:', file.name.split('.').pop());
    
    try {
      if (file.type === 'application/pdf') {
        console.log('📄 Processing PDF file');
        return `PDF content from ${file.name} - PDF extraction not yet implemented`;
      } else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        console.log('📝 Processing Word document');
        console.log('Attempting to import mammoth...');
        
        try {
          // Check if file is actually a .docx file by looking at the first few bytes
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // .docx files start with PK (ZIP file signature)
          const isDocx = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B;
          console.log('File starts with PK (ZIP signature):', isDocx);
          
          if (!isDocx && file.name.endsWith('.docx')) {
            console.warn('⚠️ File has .docx extension but doesn\'t have ZIP signature');
          }
          
          console.log('✅ ArrayBuffer created, size:', arrayBuffer.byteLength);
          
          // Try dynamic import with error handling
          let mammoth;
          try {
            mammoth = await import('mammoth');
            console.log('✅ Mammoth imported successfully');
            
            // Test if mammoth has the expected methods
            if (typeof mammoth.extractRawText !== 'function') {
              throw new Error('Mammoth extractRawText method not found');
            }
            console.log('✅ Mammoth extractRawText method available');
            
          } catch (importError: any) {
            console.error('❌ Failed to import mammoth:', importError);
            throw new Error(`Failed to load mammoth library: ${importError.message}`);
          }
          
          console.log('Extracting text with mammoth...');
          const result = await mammoth.extractRawText({ arrayBuffer });
          console.log('✅ Text extraction successful');
          console.log('Extracted text length:', result.value.length);
          console.log('First 100 characters:', result.value.substring(0, 100));
          
          if (!result.value || result.value.trim().length === 0) {
            console.warn('⚠️ Extracted text is empty or whitespace only');
            return `Document "${file.name}" appears to be empty or contains no readable text.`;
          }
          
          return result.value;
        } catch (mammothError: any) {
          console.error('❌ Mammoth extraction failed:', mammothError);
          console.error('Error details:', {
            name: mammothError.name,
            message: mammothError.message,
            stack: mammothError.stack
          });
          
          // Try fallback method for .docx files
          if (file.name.endsWith('.docx')) {
            console.log('🔄 Trying fallback method for .docx...');
            try {
              // Try using a different approach
              const text = await this.extractTextFromDocxFallback(file);
              console.log('✅ Fallback extraction successful');
              return text;
            } catch (fallbackError: any) {
              console.error('❌ Fallback extraction also failed:', fallbackError);
              return `Error extracting text from ${file.name}: ${mammothError.message}. Fallback also failed: ${fallbackError.message}`;
            }
          }
          
          return `Error extracting text from ${file.name}: ${mammothError.message}`;
        }
      } else if (file.type === 'text/plain') {
        console.log('📄 Processing plain text file');
        return await this.readTextFile(file);
      } else {
        console.log('📄 Processing unknown file type, trying as text');
        return await this.readTextFile(file);
      }
    } catch (error: any) {
      console.error('❌ General text extraction error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      return `Error extracting text from ${file.name}: ${error.message}`;
    }
  }

  async extractTextFromDocxFallback(file: File): Promise<string> {
    // Fallback method for .docx files
    console.log('🔄 Using fallback method for .docx extraction');
    
    try {
      // Try using FileReader to read as text first
      const text = await this.readTextFile(file);
      if (text && text.length > 0) {
        console.log('✅ Fallback text reading successful');
        return text;
      }
      
      // If that fails, try reading as binary and look for text content
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Look for XML content in the .docx (which is essentially a ZIP file)
      // This is a simplified approach - in a real implementation you'd want a proper .docx parser
      const decoder = new TextDecoder('utf-8');
      const binaryString = decoder.decode(uint8Array);
      
      // Look for common text patterns
      const textMatches = binaryString.match(/[a-zA-Z0-9\s.,!?;:'"()-]{20,}/g);
      if (textMatches && textMatches.length > 0) {
        console.log('✅ Found text content in binary data');
        return textMatches.join(' ').substring(0, 1000); // Limit to first 1000 chars
      }
      
      throw new Error('No readable text content found in document');
    } catch (fallbackError: any) {
      console.error('❌ Fallback extraction failed:', fallbackError);
      throw fallbackError;
    }
  }

  async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve(text);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  async getDocument(id: string): Promise<DocumentMetadata | null> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(`Failed to fetch document: ${error.message}`);
    return data;
  }

  // Helper method to check authentication status
  async checkAuthStatus(): Promise<{ isAuthenticated: boolean; user: any; error?: string }> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        return { isAuthenticated: false, user: null, error: error.message };
      }
      if (!session) {
        return { isAuthenticated: false, user: null };
      }
      return { isAuthenticated: true, user: session.user };
    } catch (err: any) {
      return { isAuthenticated: false, user: null, error: err.message };
    }
  }
}