import StudyService from './StudyService';
import SupabaseStudyService from './SupabaseStudyService';
import { Flashcard, MindMap, StudyNote } from '../types/study';
import { Resource } from '../types/resources';

/**
 * Service to provide awareness of available study materials
 * Following the service layer pattern preference
 */
class StudyAwarenessService {
  /**
   * Get a summary of all available study materials for an Athro
   * @param athroId The ID of the Athro to get materials for
   * @returns A formatted string with metadata about available study materials
   */
  async getStudyMaterialsSummary(athroId: string): Promise<string> {
    try {
      // Gather metadata about all study materials
      const [flashcards, notes, mindMaps, resources] = await Promise.all([
        StudyService.getFlashcards(athroId),
        StudyService.getNotes(athroId),
        SupabaseStudyService.getMindMaps(athroId),
        StudyService.getResources(athroId)
      ]);

      // Generate summaries for each type
      const parts: string[] = [];
      
      // Summary of mind maps (most important based on current issue)
      if (mindMaps.length > 0) {
        parts.push(`Mind Maps (${mindMaps.length}): ${this.formatMindMapNames(mindMaps)}`);
      }
      
      // Summary of notes
      if (notes.length > 0) {
        parts.push(`Study Notes (${notes.length}): ${this.formatNoteTopics(notes)}`);
      }
      
      // Summary of flashcards
      if (flashcards.length > 0) {
        parts.push(`Flashcards (${flashcards.length}): ${this.formatFlashcardSubjects(flashcards)}`);
      }
      
      // Summary of resources
      if (resources.length > 0) {
        parts.push(`Resources/Documents (${resources.length}): ${this.formatResourceNames(resources)}`);
      }

      // Combine all summaries
      if (parts.length === 0) {
        return "There are currently no study materials available in the sidebar.";
      }
      
      return `AVAILABLE STUDY MATERIALS:\n${parts.join('\n')}`;
    } catch (error) {
      console.error('Error generating study materials summary:', error);
      return "Error retrieving study materials information.";
    }
  }

  /**
   * Format mind map names into a readable string
   */
  private formatMindMapNames(mindMaps: MindMap[]): string {
    if (mindMaps.length === 0) return "";
    
    return mindMaps.map(map => `"${map.topic}"`).join(", ");
  }

  /**
   * Format note topics into a readable string
   */
  private formatNoteTopics(notes: StudyNote[]): string {
    if (notes.length === 0) return "";
    
    const topics = new Set(notes.map(note => note.topic));
    return Array.from(topics).map(topic => `"${topic}"`).join(", ");
  }

  /**
   * Format flashcard subjects into a readable string
   */
  private formatFlashcardSubjects(flashcards: Flashcard[]): string {
    if (flashcards.length === 0) return "";
    
    const subjects = new Set(flashcards.map(card => card.subject));
    return Array.from(subjects).map(subject => `"${subject}"`).join(", ");
  }

  /**
   * Format resource names into a readable string
   */
  private formatResourceNames(resources: Resource[]): string {
    if (resources.length === 0) return "";
    
    return resources.map(resource => `"${resource.name}"`).join(", ");
  }
}

export default new StudyAwarenessService();
