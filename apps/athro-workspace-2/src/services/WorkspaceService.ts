import { BroadcastChannel } from 'broadcast-channel';

/**
 * Event types for confidence level updates
 */
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ConfidenceUpdateEvent {
  athroId: string;
  level: ConfidenceLevel;
  source: string;
  timestamp: string;
}

/**
 * WorkspaceService - Handles sharing and synchronizing confidence levels across applications
 * 
 * This service uses BroadcastChannel API to enable communication between different applications
 * without direct dependencies, following our architecture principles:
 * - Each service owns and protects its domain
 * - Shared state is synchronized, not copied
 * - Events connect the system without hard dependencies
 */
class WorkspaceService {
  private confidenceChannel: BroadcastChannel<ConfidenceUpdateEvent>;
  private confidenceLevels: Record<string, ConfidenceLevel> = {};
  private listeners: Map<string, (levels: Record<string, ConfidenceLevel>) => void> = new Map();

  constructor() {
    this.confidenceChannel = new BroadcastChannel('athro-confidence-updates');
    
    // Listen for confidence level updates from other applications
    this.confidenceChannel.onmessage = (event: ConfidenceUpdateEvent) => {
      this.updateConfidenceLevel(event.athroId, event.level);
      console.log(`Received confidence update for ${event.athroId}: ${event.level} from ${event.source}`);
    };
    
    // Initialize confidence levels from localStorage
    this.loadConfidenceLevels();
  }

  /**
   * Load saved confidence levels from localStorage
   */
  private loadConfidenceLevels() {
    try {
      const saved = localStorage.getItem('athroConfidenceLevels');
      if (saved) {
        this.confidenceLevels = JSON.parse(saved);
        console.log('Loaded confidence levels:', this.confidenceLevels);
        
        // Notify listeners immediately with loaded values
        this.notifyListeners();
      }
    } catch (err) {
      console.error('Error loading confidence levels:', err);
    }
  }

  /**
   * Save confidence levels to localStorage
   */
  private saveConfidenceLevels() {
    try {
      localStorage.setItem('athroConfidenceLevels', JSON.stringify(this.confidenceLevels));
    } catch (err) {
      console.error('Error saving confidence levels:', err);
    }
  }

  /**
   * Update a confidence level and notify listeners
   */
  updateConfidenceLevel(athroId: string, level: ConfidenceLevel) {
    this.confidenceLevels[athroId] = level;
    this.saveConfidenceLevels();
    this.notifyListeners();
  }

  /**
   * Broadcast a confidence level update to all applications
   */
  broadcastConfidenceUpdate(athroId: string, level: ConfidenceLevel) {
    const update: ConfidenceUpdateEvent = {
      athroId,
      level,
      source: 'workspace',
      timestamp: new Date().toISOString()
    };
    
    // Update locally
    this.updateConfidenceLevel(athroId, level);
    
    // Broadcast to other applications
    this.confidenceChannel.postMessage(update);
  }

  /**
   * Get all confidence levels
   */
  getConfidenceLevels(): Record<string, ConfidenceLevel> {
    return { ...this.confidenceLevels };
  }

  /**
   * Get confidence level for a specific Athro
   */
  getConfidenceLevel(athroId: string): ConfidenceLevel | undefined {
    return this.confidenceLevels[athroId];
  }

  /**
   * Subscribe to confidence level changes
   */
  subscribeToConfidenceUpdates(id: string, callback: (levels: Record<string, ConfidenceLevel>) => void) {
    this.listeners.set(id, callback);
    return id;
  }

  /**
   * Unsubscribe from confidence level changes
   */
  unsubscribeFromConfidenceUpdates(id: string) {
    this.listeners.delete(id);
  }

  /**
   * Notify all listeners of confidence level changes
   */
  private notifyListeners() {
    const levels = this.getConfidenceLevels();
    this.listeners.forEach(callback => callback(levels));
  }
}

// Export a singleton instance
const workspaceService = new WorkspaceService();
export default workspaceService;
