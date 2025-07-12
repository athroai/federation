# 🧪 **Data Persistence Testing Plan**

## **Pre-Test Setup**

1. **Clear All Data** (Start Fresh):
```javascript
// Run in browser console to clear everything
const keysToClear = [
  'subjectConfidence', 'finalAthros', 'athroConfidence', 'athroPriorities',
  'calendarEvents', 'studentAvailability', 'selectedWeekType', 'isFullDay',
  'athro_workspace_selected_athros', 'athro_workspace_confidence_levels'
];
keysToClear.forEach(key => localStorage.removeItem(key));
console.log('✅ All localStorage cleared');
```

2. **Refresh all browser tabs**

## **Test Scenario 1: Anonymous User (No Sign-In)**

### **Expected Behavior**: Data should persist in localStorage

**Test Steps:**
1. ✅ Go to Onboarding app (`lovable-athro-ai-3`)
2. ✅ Select 3-4 Athros with confidence levels (High/Medium/Low)
3. ✅ Complete onboarding → should create `finalAthros` in localStorage
4. ✅ Verify data saved:
   ```javascript
   console.log('finalAthros:', localStorage.getItem('finalAthros'));
   console.log('subjectConfidence:', localStorage.getItem('subjectConfidence'));
   ```

5. ✅ **CRITICAL TEST**: Reload page
6. ✅ **VERIFY**: Athros and confidence levels still visible
7. ✅ Go to Dashboard app (`athro-dashboard`)
8. ✅ **VERIFY**: Selected Athros appear in dashboard
9. ✅ Go to Workspace app (`athro-workspace-2`) 
10. ✅ **VERIFY**: Athros appear in carousel with confidence levels

**Success Criteria:**
- ✅ No data loss on page reload
- ✅ Data appears across all apps
- ✅ Confidence levels correctly displayed

## **Test Scenario 2: User Sign-In (Migration Test)**

### **Expected Behavior**: Data migrates safely to Supabase

**Test Steps:**
1. ✅ Complete Test Scenario 1 first (have data in localStorage)
2. ✅ In Dashboard app, sign up/sign in with test account
3. ✅ **VERIFY**: No immediate data loss during sign-in
4. ✅ Check browser console for migration logs:
   ```
   Should see: "Starting data migration for user: [user-id]"
   Should see: "Data migration completed for user: [user-id]"
   ```
5. ✅ **CRITICAL TEST**: Reload page after sign-in
6. ✅ **VERIFY**: All data still visible (now from Supabase)
7. ✅ Open other apps - data should sync across apps

**Success Criteria:**
- ✅ Migration completes without errors
- ✅ Data persists after migration
- ✅ No data loss during sign-in process

## **Test Scenario 3: Calendar Events**

**Test Steps:**
1. ✅ In Calendar app, create 2-3 events
2. ✅ Verify events save to localStorage:
   ```javascript
   console.log('calendarEvents:', localStorage.getItem('calendarEvents'));
   ```
3. ✅ **CRITICAL TEST**: Reload page
4. ✅ **VERIFY**: Events still visible on calendar
5. ✅ For signed-in users: Check if events migrate to Supabase

## **Test Scenario 4: Cross-App Communication**

**Test Steps:**
1. ✅ Open Dashboard in one tab
2. ✅ Open Workspace in another tab  
3. ✅ In Dashboard: Change confidence level for an Athro
4. ✅ Switch to Workspace tab
5. ✅ **VERIFY**: Confidence level updates automatically

## **Test Scenario 5: Error Recovery**

**Test Steps:**
1. ✅ Simulate network error during migration
2. ✅ **VERIFY**: localStorage data preserved
3. ✅ **VERIFY**: App still functional
4. ✅ Restore network, reload page
5. ✅ **VERIFY**: Migration retries and succeeds

## **🚨 Critical Issues to Watch For**

### **FIXED Issues** (Should NOT occur):
- ❌ Data disappears on page reload
- ❌ Empty Athro carousels after refresh
- ❌ Lost confidence levels
- ❌ Migration clearing data before saving to Supabase

### **Expected Behavior**:
- ✅ Anonymous users: Everything in localStorage
- ✅ Signed-in users: Data in Supabase + localStorage fallback
- ✅ No data loss during migration
- ✅ Instant cross-app updates

## **Debug Commands**

**Check localStorage data:**
```javascript
// See all athro-related data
Object.keys(localStorage).filter(k => 
  k.includes('athro') || k.includes('final') || k.includes('subject')
).forEach(k => 
  console.log(`${k}:`, localStorage.getItem(k))
);
```

**Check Supabase data** (in browser console):
```javascript
// Check user preferences (signed-in users only)
supabase.from('user_preferences').select('*').then(console.log);
```

## **Launch Readiness Checklist**

- [ ] Test Scenario 1 passes ✅
- [ ] Test Scenario 2 passes ✅  
- [ ] Test Scenario 3 passes ✅
- [ ] Test Scenario 4 passes ✅
- [ ] Test Scenario 5 passes ✅
- [ ] No console errors during testing
- [ ] Data persists across browser sessions
- [ ] Mobile/tablet testing completed

## **If Tests Fail**

1. **Check browser console** for error messages
2. **Verify applied fixes** in these files:
   - `athro-dashboard/src/contexts/AuthContext.tsx`
   - `athro-dashboard/src/services/userPreferencesService.ts`
   - `lovable-athro-ai-3/src/utils/migration.ts`
   - `athro-dashboard/src/components/Dashboard/Dashboard.tsx`

3. **Contact support** with specific error messages and steps to reproduce

---

**🎯 Target: All tests pass = Ready for launch! 🚀** 