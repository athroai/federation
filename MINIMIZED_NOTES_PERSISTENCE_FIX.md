# Minimized Notes Persistence Fix

## Problem
The minimized full notes editor card in the sidebar was disappearing when users navigated away from the notes section, switched between study tools, or changed tabs. The note editor would only persist while actively in the notes view, but should persist across all navigation until explicitly saved or deleted.

## Root Cause
The `NotesModule` component was being **completely unmounted and remounted** when:
1. Users switched between `activeTab` (`tools` vs `resources`)
2. Users switched between `activeStudyTool` (`flashcards`, `notes`, `mindmap`, etc.)

When React unmounts a component, all its internal state (including `isEditorMinimized`) is lost, causing the minimized notes card to disappear.

## Solution
Implemented a **global state management system** for minimized notes that persists at a higher level than individual components:

### 1. MinimizedNotesManager Class (Enhanced with localStorage)
```typescript
class MinimizedNotesManager {
  private static instance: MinimizedNotesManager;
  private listeners: Set<(key: string, state: MinimizedNoteState | null) => void> = new Set();
  private readonly STORAGE_PREFIX = 'athro_minimized_notes_';

  // Singleton pattern for global state
  static getInstance(): MinimizedNotesManager;
  
  // localStorage-based persistence methods
  setMinimizedNote(athroId: string, sessionId: string | null, note: StudyNote | null): void {
    // Stores in localStorage with error handling
    localStorage.setItem(this.getStorageKey(key), JSON.stringify(state));
  }
  
  clearMinimizedNote(athroId: string, sessionId: string | null): void {
    // Removes from localStorage with error handling
    localStorage.removeItem(this.getStorageKey(key));
  }
  
  getMinimizedNote(athroId: string, sessionId: string | null): MinimizedNoteState | null {
    // Retrieves from localStorage with JSON parsing and error handling
    return JSON.parse(localStorage.getItem(this.getStorageKey(key)));
  }
  
  // Observer pattern for reactive updates
  subscribe(callback: (key: string, state: MinimizedNoteState | null) => void): () => void;
}
```

### 2. SidePanel Integration
- Added persistent minimized notes state management in `SidePanel.tsx`
- Passes the `MinimizedNotesManager` instance to `NotesModule` component
- No redundant display at SidePanel level - delegation to NotesModule for proper handling

### 3. NotesModule Updates
- Updated `NotesModule` to accept `minimizedNotesManager` prop
- Replaced local `isEditorMinimized` state with persistent manager state
- Updated all minimize/restore operations to use the persistent manager

### 4. Persistent Display
The minimized notes card is displayed by the `NotesModule` itself, ensuring:
- Proper state synchronization with the global manager
- Correct restoration behavior 
- No duplicate displays when switching navigation contexts
- Single source of truth for minimized note rendering

## Key Features

### ✅ **Cross-Navigation Persistence**
- Minimized notes persist when switching between:
  - Study tools (flashcards ↔ notes ↔ mindmaps)
  - Main tabs (tools ↔ resources)
  - Different screens/components
  - Browser tabs or window focus changes

### ✅ **User-Controlled Lifecycle**
- Notes only disappear when user explicitly:
  - Saves the note (completed work)
  - Deletes the note (discarded work)
  - Closes the editor (cancelled work)
- No accidental data loss from navigation

### ✅ **Per-Session Isolation**
- Each Athro + session combination has independent minimized notes
- Multiple sessions can have different minimized notes simultaneously
- Session changes properly manage their respective minimized states

### ✅ **Visual Prominence**
- Minimized note card appears at the top of the sidebar
- Distinctive styling with green borders and hover effects
- Clear messaging about persistence and navigation
- One-click restoration to full editor

### ✅ **Backward Compatibility**
- Graceful fallback to local state when manager is not available
- Existing functionality preserved for non-managed scenarios
- No breaking changes to existing note workflows

## Technical Implementation

### State Management
```typescript
// Global singleton manager
const notesManager = MinimizedNotesManager.getInstance();

// Reactive state in SidePanel
const [minimizedNoteState, setMinimizedNoteState] = useState<MinimizedNoteState | null>(null);

// Subscription to changes
useEffect(() => {
  const unsubscribe = notesManager.subscribe((changedKey, state) => {
    if (changedKey === `${athroId}_${sessionId || 'no-session'}`) {
      setMinimizedNoteState(state);
    }
  });
  return unsubscribe;
}, [athroId, sessionId]);
```

### Key-Based Storage
- Uses `${athroId}_${sessionId}` as unique key
- Handles null/undefined sessions gracefully
- Automatic cleanup on session changes

### Observer Pattern
- Reactive updates across all components
- Efficient subscription management
- Automatic cleanup on component unmount

## Testing Instructions

1. **Open athro-workspace-2** at `http://localhost:5175`
2. **Start a note**: Navigate to Study Tools → Notes → FullNote → New Note
3. **Create content**: Add title and content to the note editor
4. **Minimize**: Click "Switch To Chat" to minimize the editor
5. **Navigate extensively**: 
   - Switch to Resources tab
   - Switch to different study tools (Flashcards, Mind Maps)
   - Navigate to different sections
   - Switch browser tabs
6. **Verify persistence**: Minimized note card should remain visible in sidebar
7. **Restore**: Click the minimized note card to restore the full editor
8. **Verify content**: Original title and content should be preserved
9. **Save/Delete**: Only explicit save/delete actions should remove the card

## Files Modified

- `apps/athro-workspace-2/src/components/SidePanel/SidePanel.tsx`
  - Added `MinimizedNotesManager` class
  - Added persistent state management
  - Added prominent minimized notes display
  - Updated `NotesModule` prop passing

- `apps/athro-workspace-2/src/components/SidePanel/Notes/NotesModule.tsx`
  - Added `minimizedNotesManager` prop
  - Replaced local state with persistent manager
  - Updated all minimize/restore operations
  - Added proper cleanup on mode switches

## Benefits

1. **Zero Data Loss**: Notes persist across all navigation scenarios
2. **Improved UX**: Users can freely navigate while maintaining note context
3. **Clear Affordances**: Visual indicators show when notes are minimized
4. **Reliable State**: Global state management prevents component unmounting issues
5. **Performance**: Efficient singleton pattern and reactive updates

## Final Solution - Enhanced Global Persistence

### Complete Implementation:
1. **Global State Manager**: `MinimizedNotesManager` singleton provides persistent storage across all navigation
2. **Global Sidebar Display**: Persistent minimized notes card in SidePanel that:
   - Always visible in sidebar when a note is minimized
   - Survives page refresh, tab switching, and all navigation
   - Only disappears on explicit save/delete by user
   - Shows subject and content preview with green highlighting
3. **Automatic Navigation**: Clicking the persistent card:
   - Switches to Tools tab automatically
   - Opens Notes section
   - Restores full editor with preserved content
4. **Enhanced UX**: Clear visual design with hover effects, close button, and intuitive messaging

### Final Result:
✅ **True Persistence**: Minimized notes remain visible in sidebar across ALL navigation scenarios  
✅ **UI Restoration**: One-click restoration to continue editing
✅ **Content Safety**: Zero data loss with persistent state management
✅ **Visual Clarity**: Prominent green card with clear affordances and hover feedback
✅ **localStorage Integration**: Enhanced persistence survives page refresh and browser restart

## Future Enhancements

- Multiple simultaneous minimized notes per session
- Auto-save integration with minimized state
- Restoration of cursor position and editor state
- Minimized notes preview with content snippets
- Drag-and-drop reordering of minimized notes 