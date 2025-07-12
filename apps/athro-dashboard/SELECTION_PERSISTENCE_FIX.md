# Selection Persistence Fix

## Problem
Manual athro selections were not persisting after page reload. User would select athros in the settings panel, but after refreshing the page, they would see 2 random athros instead of their manual selections.

## Root Cause
The dashboard had **two separate selection systems** that weren't synchronized:

1. **Settings Panel** (`handleAthroSelect`) → saves to **Supabase** via `userPreferencesService.setSelectedAthros()`
2. **AthroSelectionService** → saves to **localStorage** via `athroSelectionService.toggleSelection()`

When you clicked athros in settings, it only saved to Supabase. When the page reloaded, `loadUserPreferences()` loaded from Supabase but also tried to sync with the shared service, causing conflicts.

## Solution
**Two-way synchronization** between both systems:

### 1. When Selecting Athros (`handleAthroSelect`)
Now updates BOTH systems:
```typescript
// Save to Supabase
userPreferencesService.setSelectedAthros(newSelected.map(a => a.id));

// ALSO update the shared service to keep both systems in sync
const currentlySelectedInService = athroSelectionService.isSelected('athro-dashboard', athro.id);
const shouldBeSelected = !isSelected;

if (currentlySelectedInService !== shouldBeSelected) {
  athroSelectionService.toggleSelection('athro-dashboard', athro.id);
}
```

### 2. When Loading Preferences (`loadUserPreferences`)
Now syncs shared service to match Supabase:
```typescript
// Sync selected athros TO shared service
selectedAthroIds.forEach(athroId => {
  if (!athroSelectionService.isSelected('athro-dashboard', athroId)) {
    athroSelectionService.toggleSelection('athro-dashboard', athroId);
  }
});

// Sync non-selected athros FROM shared service  
const allServiceSelections = athroSelectionService.getSelections('athro-dashboard');
allServiceSelections.forEach(selection => {
  if (selection.selected && !selectedAthroIds.includes(selection.athroId)) {
    athroSelectionService.toggleSelection('athro-dashboard', selection.athroId);
  }
});
```

## Testing
1. Select athros in the settings panel
2. Refresh the page
3. Your selections should persist correctly
4. Check browser console for sync logs (🔧 🔄 📊 ✅ emojis)

## Technical Details
- **userPreferencesService** saves to Supabase `user_preferences` table with key `selected_athros`
- **athroSelectionService** saves to localStorage with key `athro-selection-{userId}-athro-dashboard`
- Both systems now stay in sync through bidirectional updates 