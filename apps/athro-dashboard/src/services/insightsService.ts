import { supabase } from './supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export interface StudySessionData {
  athro_id: string;
  athro_name: string;
  subject: string;
  duration_minutes: number;
  session_type: 'study' | 'quiz' | 'review';
}

export interface QuizResultData {
  subject: string;
  score: number;
  total_questions: number;
  confidence_before?: number;
  confidence_after?: number;
}

export interface ToolUsageData {
  tool_type: 'mind_map' | 'note' | 'flashcard' | 'resource';
  action: 'created' | 'updated' | 'deleted';
  metadata?: any;
  athro_id?: string;
}

export interface ConfidenceHistoryData {
  athro_id: string;
  subject: string;
  confidence_level: number;
}

export interface AthroStats {
  athroId: string;
  athroName: string;
  subject: string;
  chatCount: number;
  totalChatComments: number;
  averageChatComments: number;
  toolsSaved: number;
  resourcesUploaded: number;
  playlistsCreated: number;
  totalTimeSpent: number; // in minutes
  averageSessionTime: number;
  tokenUsage: number;
  totalScore: number; // combined score for ranking
  lastActivity: Date;
}

export interface AthroLeaderboardData {
  leaderboard: AthroStats[];
  totalAthros: number;
  userTotalStats: {
    totalChats: number;
    totalComments: number;
    totalToolsSaved: number;
    totalResources: number;
    totalPlaylists: number;
    totalTimeSpent: number;
    totalTokenUsage: number;
  };
}

export class InsightsService {
  private static instance: InsightsService;
  private user: any = null;

  static getInstance(): InsightsService {
    if (!InsightsService.instance) {
      InsightsService.instance = new InsightsService();
    }
    return InsightsService.instance;
  }

  setUser(user: any) {
    this.user = user;
  }

  private async ensureUser() {
    if (!this.user) {
      throw new Error('User not authenticated');
    }
    return this.user;
  }

  /**
   * Track a study session
   */
  async trackStudySession(data: StudySessionData): Promise<void> {
    try {
      const user = await this.ensureUser();
      
      const { error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          athro_id: data.athro_id,
          athro_name: data.athro_name,
          subject: data.subject,
          duration_minutes: data.duration_minutes,
          session_type: data.session_type
        });

      if (error) {
        console.error('Error tracking study session:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to track study session:', error);
      // Don't throw - we don't want to break the user experience if tracking fails
    }
  }

  /**
   * Track a quiz result
   */
  async trackQuizResult(data: QuizResultData): Promise<void> {
    try {
      const user = await this.ensureUser();
      
      const { error } = await supabase
        .from('quiz_results')
        .insert({
          user_id: user.id,
          subject: data.subject,
          score: data.score,
          total_questions: data.total_questions,
          confidence_before: data.confidence_before,
          confidence_after: data.confidence_after
        });

      if (error) {
        console.error('Error tracking quiz result:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to track quiz result:', error);
      // Don't throw - we don't want to break the user experience if tracking fails
    }
  }

  /**
   * Track tool usage
   */
  async trackToolUsage(data: ToolUsageData): Promise<void> {
    try {
      const user = await this.ensureUser();
      
      const { error } = await supabase
        .from('tool_usage')
        .insert({
          user_id: user.id,
          athro_id: data.athro_id,
          tool_type: data.tool_type,
          action: data.action,
          metadata: data.metadata
        });

      if (error) {
        console.error('Error tracking tool usage:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to track tool usage:', error);
      // Don't throw - we don't want to break the user experience if tracking fails
    }
  }

  /**
   * Track confidence level change
   */
  async trackConfidenceHistory(data: ConfidenceHistoryData): Promise<void> {
    try {
      const user = await this.ensureUser();
      
      const { error } = await supabase
        .from('confidence_history')
        .insert({
          user_id: user.id,
          athro_id: data.athro_id,
          subject: data.subject,
          confidence_level: data.confidence_level
        });

      if (error) {
        console.error('Error tracking confidence history:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to track confidence history:', error);
      // Don't throw - we don't want to break the user experience if tracking fails
    }
  }

  /**
   * Get study sessions for a user
   */
  async getStudySessions(limit: number = 50): Promise<any[]> {
    try {
      const user = await this.ensureUser();
      
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching study sessions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch study sessions:', error);
      return [];
    }
  }

  /**
   * Get quiz results for a user
   */
  async getQuizResults(limit: number = 50): Promise<any[]> {
    try {
      const user = await this.ensureUser();
      
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching quiz results:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch quiz results:', error);
      return [];
    }
  }

  /**
   * Get tool usage for a user
   */
  async getToolUsage(limit: number = 50): Promise<any[]> {
    try {
      const user = await this.ensureUser();
      
      const { data, error } = await supabase
        .from('tool_usage')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching tool usage:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch tool usage:', error);
      return [];
    }
  }

  /**
   * Get confidence history for a user
   */
  async getConfidenceHistory(limit: number = 50): Promise<any[]> {
    try {
      const user = await this.ensureUser();
      
      const { data, error } = await supabase
        .from('confidence_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching confidence history:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch confidence history:', error);
      return [];
    }
  }

  /**
   * Create sample data for demonstration purposes
   */
  async createSampleData(): Promise<void> {
    try {
      const user = await this.ensureUser();
      
      // Check if we already have data
      const [sessions, tools, quizzes] = await Promise.all([
        this.getStudySessions(1),
        this.getToolUsage(1),
        this.getQuizResults(1)
      ]);

      // Only create sample data if we don't have any existing data
      if (sessions.length === 0 && tools.length === 0 && quizzes.length === 0) {
        console.log('Creating sample insights data for demonstration...');
        
        // Create sample study sessions
        const sampleSessions = [
          { athro_id: 'athro-mathematics', athro_name: 'Mathematics Athro', subject: 'Mathematics', duration_minutes: 45, session_type: 'study' as const },
          { athro_id: 'athro-physics', athro_name: 'Physics Athro', subject: 'Physics', duration_minutes: 30, session_type: 'study' as const },
          { athro_id: 'athro-chemistry', athro_name: 'Chemistry Athro', subject: 'Chemistry', duration_minutes: 60, session_type: 'review' as const },
          { athro_id: 'athro-biology', athro_name: 'Biology Athro', subject: 'Biology', duration_minutes: 25, session_type: 'study' as const },
          { athro_id: 'athro-mathematics', athro_name: 'Mathematics Athro', subject: 'Mathematics', duration_minutes: 40, session_type: 'quiz' as const },
          { athro_id: 'athro-english', athro_name: 'English Athro', subject: 'English', duration_minutes: 35, session_type: 'study' as const },
          { athro_id: 'athro-history', athro_name: 'History Athro', subject: 'History', duration_minutes: 50, session_type: 'review' as const }
        ];

        // Create sample tool usage
        const sampleTools = [
          { tool_type: 'note' as const, action: 'created' as const, metadata: { title: 'Math Notes', content_length: 150 }, athro_id: 'athro-mathematics' },
          { tool_type: 'flashcard' as const, action: 'created' as const, metadata: { count: 10, subject: 'Physics' }, athro_id: 'athro-physics' },
          { tool_type: 'mind_map' as const, action: 'created' as const, metadata: { title: 'Chemistry Concepts', nodes: 8 }, athro_id: 'athro-chemistry' },
          { tool_type: 'resource' as const, action: 'created' as const, metadata: { file_type: 'pdf', size: 2048 }, athro_id: 'athro-biology' },
          { tool_type: 'note' as const, action: 'updated' as const, metadata: { title: 'Biology Notes', content_length: 200 }, athro_id: 'athro-biology' },
          { tool_type: 'flashcard' as const, action: 'created' as const, metadata: { count: 15, subject: 'English' }, athro_id: 'athro-english' },
          { tool_type: 'mind_map' as const, action: 'created' as const, metadata: { title: 'Historical Timeline', nodes: 12 }, athro_id: 'athro-history' }
        ];

        // Create sample quiz results
        const sampleQuizzes = [
          { subject: 'Mathematics', score: 8, total_questions: 10, confidence_before: 6, confidence_after: 8 },
          { subject: 'Physics', score: 7, total_questions: 10, confidence_before: 5, confidence_after: 7 },
          { subject: 'Chemistry', score: 9, total_questions: 10, confidence_before: 7, confidence_after: 9 },
          { subject: 'Biology', score: 6, total_questions: 10, confidence_before: 4, confidence_after: 6 },
          { subject: 'English', score: 9, total_questions: 10, confidence_before: 7, confidence_after: 9 },
          { subject: 'History', score: 8, total_questions: 10, confidence_before: 6, confidence_after: 8 }
        ];

        // Create sample confidence history
        const sampleConfidence = [
          { athro_id: 'athro-mathematics', subject: 'Mathematics', confidence_level: 6 },
          { athro_id: 'athro-physics', subject: 'Physics', confidence_level: 5 },
          { athro_id: 'athro-chemistry', subject: 'Chemistry', confidence_level: 7 },
          { athro_id: 'athro-biology', subject: 'Biology', confidence_level: 4 },
          { athro_id: 'athro-mathematics', subject: 'Mathematics', confidence_level: 8 },
          { athro_id: 'athro-physics', subject: 'Physics', confidence_level: 7 },
          { athro_id: 'athro-english', subject: 'English', confidence_level: 7 },
          { athro_id: 'athro-history', subject: 'History', confidence_level: 6 }
        ];

        // Insert all sample data with better error handling
        try {
          console.log('Inserting sample study sessions...');
          await Promise.all(sampleSessions.map(session => this.trackStudySession(session)));
          
          console.log('Inserting sample tool usage...');
          await Promise.all(sampleTools.map(tool => this.trackToolUsage(tool)));
          
          console.log('Inserting sample quiz results...');
          await Promise.all(sampleQuizzes.map(quiz => this.trackQuizResult(quiz)));
          
          console.log('Inserting sample confidence history...');
          await Promise.all(sampleConfidence.map(conf => this.trackConfidenceHistory(conf)));

          console.log('✅ Sample insights data created successfully!');
          
        } catch (insertError: any) {
          console.error('❌ Error inserting sample data:', insertError);
          
          // Check if it's a table not found error
          if (insertError?.message?.includes('relation') && insertError?.message?.includes('does not exist')) {
            console.error('📋 Missing database tables detected. Please run the insights tables migration:');
            console.error('   Apply the SQL file: create_insights_tables.sql');
            throw new Error('Missing database tables. Please apply the insights tables migration first.');
          }
          
          throw insertError;
        }
      } else {
        console.log('⚠️ Sample data already exists, skipping creation.');
      }
    } catch (error) {
      console.error('❌ Failed to create sample data:', error);
      throw error; // Re-throw to let the UI handle it
    }
  }

  /**
   * Get comprehensive athro statistics for leaderboard
   */
  async getAthroLeaderboardData(): Promise<AthroLeaderboardData> {
    try {
      const user = await this.ensureUser();
      
      // Get all study sessions, tool usage, and other data
      const [sessions, tools, chats, resources, playlists] = await Promise.all([
        this.getStudySessions(1000), // Get more data for better stats
        this.getToolUsage(1000),
        this.getChatSessions(), // We'll create this method
        this.getResourceUploads(), // We'll create this method  
        this.getPlaylists() // We'll create this method
      ]);

      // Group data by athro
      const athroStatsMap = new Map<string, Partial<AthroStats>>();

      // Process study sessions
      sessions.forEach(session => {
        const athroId = session.athro_id;
        if (!athroStatsMap.has(athroId)) {
          athroStatsMap.set(athroId, {
            athroId,
            athroName: session.athro_name,
            subject: session.subject,
            chatCount: 0,
            totalChatComments: 0,
            averageChatComments: 0,
            toolsSaved: 0,
            resourcesUploaded: 0,
            playlistsCreated: 0,
            totalTimeSpent: 0,
            averageSessionTime: 0,
            tokenUsage: 0,
            lastActivity: new Date(session.created_at)
          });
        }

        const stats = athroStatsMap.get(athroId)!;
        stats.totalTimeSpent = (stats.totalTimeSpent || 0) + session.duration_minutes;
        
        // Update last activity
        const sessionDate = new Date(session.created_at);
        if (!stats.lastActivity || sessionDate > stats.lastActivity) {
          stats.lastActivity = sessionDate;
        }
      });

      // Process tool usage
      tools.forEach(tool => {
        if (tool.athro_id) {
          const stats = athroStatsMap.get(tool.athro_id);
          if (stats) {
            stats.toolsSaved = (stats.toolsSaved || 0) + 1;
          }
        }
      });

      // Process chat data (mock for now - you can replace with real data)
      chats.forEach(chat => {
        if (chat.athro_id) {
          const stats = athroStatsMap.get(chat.athro_id);
          if (stats) {
            stats.chatCount = (stats.chatCount || 0) + 1;
            stats.totalChatComments = (stats.totalChatComments || 0) + (chat.comment_count || 0);
            stats.tokenUsage = (stats.tokenUsage || 0) + (chat.token_usage || 0);
          }
        }
      });

      // Process resources
      resources.forEach(resource => {
        if (resource.athro_id) {
          const stats = athroStatsMap.get(resource.athro_id);
          if (stats) {
            stats.resourcesUploaded = (stats.resourcesUploaded || 0) + 1;
          }
        }
      });

      // Process playlists
      playlists.forEach(playlist => {
        if (playlist.athro_id) {
          const stats = athroStatsMap.get(playlist.athro_id);
          if (stats) {
            stats.playlistsCreated = (stats.playlistsCreated || 0) + 1;
          }
        }
      });

      // Calculate derived stats and total scores
      const athroStats: AthroStats[] = Array.from(athroStatsMap.values()).map(stats => {
        const sessionCount = sessions.filter(s => s.athro_id === stats.athroId).length;
        stats.averageSessionTime = sessionCount > 0 ? (stats.totalTimeSpent || 0) / sessionCount : 0;
        stats.averageChatComments = (stats.chatCount || 0) > 0 ? (stats.totalChatComments || 0) / (stats.chatCount || 1) : 0;
        
        // Calculate total score for ranking (weighted combination of all metrics)
        stats.totalScore = 
          ((stats.chatCount || 0) * 10) +           // Chats worth 10 points each
          ((stats.totalChatComments || 0) * 2) +    // Comments worth 2 points each
          ((stats.toolsSaved || 0) * 5) +           // Tools worth 5 points each
          ((stats.resourcesUploaded || 0) * 8) +    // Resources worth 8 points each
          ((stats.playlistsCreated || 0) * 6) +     // Playlists worth 6 points each
          (Math.floor((stats.totalTimeSpent || 0) / 10)) + // 1 point per 10 minutes
          (Math.floor((stats.tokenUsage || 0) / 100));      // 1 point per 100 tokens

        return stats as AthroStats;
      });

      // Sort by total score descending
      athroStats.sort((a, b) => b.totalScore - a.totalScore);

      // Calculate user total stats
      const userTotalStats = {
        totalChats: athroStats.reduce((sum, s) => sum + s.chatCount, 0),
        totalComments: athroStats.reduce((sum, s) => sum + s.totalChatComments, 0),
        totalToolsSaved: athroStats.reduce((sum, s) => sum + s.toolsSaved, 0),
        totalResources: athroStats.reduce((sum, s) => sum + s.resourcesUploaded, 0),
        totalPlaylists: athroStats.reduce((sum, s) => sum + s.playlistsCreated, 0),
        totalTimeSpent: athroStats.reduce((sum, s) => sum + s.totalTimeSpent, 0),
        totalTokenUsage: athroStats.reduce((sum, s) => sum + s.tokenUsage, 0)
      };

      return {
        leaderboard: athroStats,
        totalAthros: athroStats.length,
        userTotalStats
      };

    } catch (error) {
      console.error('Failed to get athro leaderboard data:', error);
      return {
        leaderboard: [],
        totalAthros: 0,
        userTotalStats: {
          totalChats: 0,
          totalComments: 0,
          totalToolsSaved: 0,
          totalResources: 0,
          totalPlaylists: 0,
          totalTimeSpent: 0,
          totalTokenUsage: 0
        }
      };
    }
  }

  /**
   * Get chat sessions data (placeholder - implement based on your chat system)
   */
  async getChatSessions(): Promise<any[]> {
    try {
      const user = await this.ensureUser();
      
      // TODO: Replace with actual chat sessions query when available
      // For now, return mock data
      return [
        { id: '1', athro_id: 'math-athro', comment_count: 25, token_usage: 1500, created_at: new Date().toISOString() },
        { id: '2', athro_id: 'physics-athro', comment_count: 18, token_usage: 1200, created_at: new Date().toISOString() },
        { id: '3', athro_id: 'chemistry-athro', comment_count: 30, token_usage: 1800, created_at: new Date().toISOString() },
        { id: '4', athro_id: 'math-athro', comment_count: 22, token_usage: 1300, created_at: new Date().toISOString() },
        { id: '5', athro_id: 'biology-athro', comment_count: 15, token_usage: 900, created_at: new Date().toISOString() }
      ];
    } catch (error) {
      console.error('Failed to get chat sessions:', error);
      return [];
    }
  }

  /**
   * Get resource uploads data (placeholder)
   */
  async getResourceUploads(): Promise<any[]> {
    try {
      const user = await this.ensureUser();
      
      // TODO: Replace with actual resource uploads query when available
      return [
        { id: '1', athro_id: 'math-athro', file_type: 'pdf', created_at: new Date().toISOString() },
        { id: '2', athro_id: 'physics-athro', file_type: 'image', created_at: new Date().toISOString() },
        { id: '3', athro_id: 'chemistry-athro', file_type: 'pdf', created_at: new Date().toISOString() },
        { id: '4', athro_id: 'math-athro', file_type: 'video', created_at: new Date().toISOString() }
      ];
    } catch (error) {
      console.error('Failed to get resource uploads:', error);
      return [];
    }
  }

  /**
   * Get playlists data from the database
   */
  async getPlaylists(): Promise<any[]> {
    try {
      const user = await this.ensureUser();
      
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          id,
          athro_id,
          name,
          created_at,
          playlist_documents (
            id,
            name,
            file_type,
            storage_path,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to get playlists:', error);
        throw error;
      }

      // Transform the data to match the UI's expected format
      return (data || []).map(playlist => ({
        id: playlist.id,
        athro_id: playlist.athro_id,
        name: playlist.name,
        created_at: playlist.created_at,
        playlist_documents: (playlist.playlist_documents || []).map(doc => ({
          id: doc.id,
          title: doc.name,
          document_type: doc.file_type,
          document_url: doc.storage_path,
          created_at: doc.created_at
        }))
      }));
    } catch (error) {
      console.error('Failed to get playlists:', error);
      return [];
    }
  }
}

// Export singleton instance
export const insightsService = InsightsService.getInstance(); 