declare module '@athro/shared-services' {
  export interface AthroSelection {
    athroId: string;
    selected: boolean;
    timestamp: string;
  }

  export type SelectionMode = 'single' | 'multi';

  export const athroSelectionService: {
    // Methods for managing selections
    getSelections: (appId: string) => AthroSelection[];
    toggleSelection: (appId: string, athroId: string) => boolean;
    selectMultiple: (appId: string, athroIds: string[]) => void;
    clearSelections: (appId: string) => void;
    
    // Configuration methods
    setSelectionMode: (mode: SelectionMode) => void;
    getSelectionMode: () => SelectionMode;
  };

  // Event bus related exports
  export const eventBus: {
    subscribe: <T>(eventName: string, callback: (event: { payload: T }) => void) => string;
    unsubscribe: (subscriptionId: string) => void;
    publish: <T>(eventName: string, payload: T) => void;
  };

  export const EVENTS: {
    SELECTION_UPDATED: string;
    SELECTION_REMOVED: string;
    SELECTION_CLEARED: string;
  };
}
