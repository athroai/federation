export interface Resource {
  id: string;
  athroId: string;
  subject: string;
  topic: string;
  resourceType: string; // The MIME type of the file e.g., 'application/pdf'
  resourcePath: string; // The path to the file in Supabase Storage
  folderPath?: string; // The organizational folder path in the new folder structure
  createdAt: string;
  updatedAt: string;
}
