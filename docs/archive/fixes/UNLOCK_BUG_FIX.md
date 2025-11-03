# Exercise Unlock Bug Fix

**Date:** November 2, 2025  
**Issue:** Fill in the Blank exercise remains locked after completing Multiple Choice with perfect score  
**Status:** ✅ Fixed

## Problem Description

When a student completed the Multiple Choice exercise with a perfect score (5/5 at difficulty level 5), the backend correctly determined that Fill in the Blank should be unlocked. However, the frontend still showed Fill in the Blank as locked.

### Backend Behavior (Correct)
- ✅ Activity completed: multiple_choice (5) with 5/5 (100%)
- ✅ Backend called progression endpoint: `POST /api/progression/next`
- ✅ Response was 200 OK
- ✅ Backend determined Fill in the Blank should unlock

### Frontend Behavior (Buggy)
- ❌ Fill in the Blank remained locked in UI
- ❌ Clicking on Fill in the Blank showed: "This exercise is locked. Complete previous exercises to unlock it!"

## Root Cause

The bug was in `SessionManager.js` at line ~180:

```javascript
// BUGGY CODE
if (response.unlocked_activities && response.unlocked_activities.length > 0) {
    response.unlocked_activities.forEach(exercise => {
        this.scoreManager.toggleExerciseLock(exercise);  // ⚠️ BUG!
    });
}
```

**The Problem:** `toggleExerciseLock()` TOGGLES the lock state (switches locked ↔ unlocked). If an exercise was already unlocked, toggling it would LOCK it again. This created unpredictable behavior where exercises could become locked when they should be unlocked.

## Solution

### 1. Added `setExerciseUnlocked()` Method to ScoreManager

Created a new method that explicitly SETS the unlock status rather than toggling:

```javascript
/**
 * Set unlock status for an exercise
 * @param {string} exerciseType - The exercise type
 * @param {boolean} unlocked - Whether to unlock (true) or lock (false)
 */
setExerciseUnlocked(exerciseType, unlocked = true) {
    if (!this.userData || !this.userData.exercises[exerciseType]) {
        return false;
    }
    
    this.userData.exercises[exerciseType].unlocked = unlocked;
    this.saveUserData();
    return unlocked;
}
```

### 2. Updated SessionManager to Use setExerciseUnlocked

Changed the unlock logic to use the new SET method:

```javascript
// FIXED CODE
if (response.unlocked_activities && response.unlocked_activities.length > 0) {
    console.log('[SessionManager] Unlocking activities:', response.unlocked_activities);
    response.unlocked_activities.forEach(exercise => {
        this.scoreManager.setExerciseUnlocked(exercise, true);  // ✓ Fixed!
    });
}
```

### 3. Added UI Update After Unlock

Modified `app.js` to ensure the UI updates immediately after unlocking:

```javascript
const endActivityResponse = await this.sessionManager.endActivity(exerciseType, backendResults, tuningSettings);
console.log('[BREADCRUMB][RESULTS] Activity results saved to database');

// Update UI to reflect any newly unlocked activities
if (endActivityResponse.unlocked && endActivityResponse.unlocked.length > 0) {
    console.log('[BREADCRUMB][RESULTS] Activities unlocked:', endActivityResponse.unlocked);
    this.updateExerciseCards();  // ✓ Refresh UI
}
```

## Files Modified

1. **web/js/scoreManager.js**
   - Added `setExerciseUnlocked(exerciseType, unlocked)` method
   - Kept `toggleExerciseLock()` for dev mode compatibility

2. **web/js/integration/SessionManager.js**
   - Changed from `toggleExerciseLock()` to `setExerciseUnlocked(exercise, true)`
   - Added console logging for debugging

3. **web/js/app.js**
   - Added UI update call after receiving unlock response
   - Ensures exercise cards refresh immediately

## Testing

To verify the fix:

1. Start with a new user (or clear localStorage)
2. Complete Multiple Choice exercise with 80%+ score at difficulty level 5
3. Backend should unlock Fill in the Blank
4. Frontend should immediately show Fill in the Blank as unlocked
5. Clicking Fill in the Blank should start the exercise (not show locked message)

## Prevention

To prevent similar issues in the future:

1. **Use explicit SET operations** instead of TOGGLE when dealing with state from backend
2. **Always update UI** after state changes from backend responses
3. **Add logging** to track unlock operations for debugging
4. **Test unlock flow** after any changes to progression logic

## Update: Backend Persistence Issue (November 2, 2025)

After the initial frontend fix, a second issue was discovered: **unlocks were not being persisted to the database**.

### The Real Problem

The backend's `end_activity` endpoint was returning an empty list for `unlocked_activities` with a comment saying "Unlocks determined by ProgressionService". However, the ProgressionService's `unlock_exercise()` call only happened when `get_next_activity()` was called, which was AFTER the frontend needed the unlock information.

**Result:** Unlocks worked during an active session but were lost on page reload because they were never saved to the database.

### The Complete Fix

**Backend Fix (routes.py):**
Modified the `end_activity` endpoint to:
1. Get progress before the activity ends
2. Call `ProgressionService.get_next_activity()` which triggers `_get_unlocked_activities()` 
3. This calls `DatabaseOperations.unlock_exercise()` to persist unlocks
4. Get progress after to detect newly unlocked activities
5. Return the list of newly unlocked activities to the frontend

```python
# Get current progress to determine what was unlocked before
progress_before = DatabaseOperations.get_student_progress(session.student_id)
unlocked_before = set(act for act, data in progress_before.items() if data.get('unlocked', False))

# Call ProgressionService to check mastery and update unlocks in database
progression_result = ProgressionService.get_next_activity(
    session.student_id,
    session.module_id,
    request.activity_type
)

# Get updated progress to see what's now unlocked
progress_after = DatabaseOperations.get_student_progress(session.student_id)
unlocked_after = set(act for act, data in progress_after.items() if data.get('unlocked', False))

# Determine newly unlocked activities
newly_unlocked = list(unlocked_after - unlocked_before)
```

## Files Modified (Complete List)

### Frontend
1. **web/js/scoreManager.js**
   - Added `setExerciseUnlocked(exerciseType, unlocked)` method
   - Kept `toggleExerciseLock()` for dev mode compatibility

2. **web/js/integration/SessionManager.js**
   - Changed from `toggleExerciseLock()` to `setExerciseUnlocked(exercise, true)`
   - Added console logging for debugging

3. **web/js/app.js**
   - Added UI update call after receiving unlock response
   - Ensures exercise cards refresh immediately

### Backend
4. **../prompting_human_agent/backend/src/api/routes.py**
   - Modified `end_activity` endpoint to call ProgressionService
   - Added logic to detect and return newly unlocked activities
   - Ensures unlocks are persisted to database before returning response

## Testing

To verify the complete fix:

1. Start with a new user (or clear localStorage AND database)
2. Complete Multiple Choice exercise with 80%+ score at difficulty level 5
3. Backend should unlock Fill in the Blank AND save to database
4. Frontend should immediately show Fill in the Blank as unlocked
5. **Reload the page / log out and back in**
6. Fill in the Blank should STILL be unlocked (persisted in database)
7. Clicking Fill in the Blank should start the exercise

## Related Documentation

- [Proficiency Based Progression](../features/PROFICIENCY_BASED_PROGRESSION.md)
- [Bayesian Proficiency Implementation](../implementations/BAYESIAN_PROFICIENCY_IMPLEMENTATION.md)
- [Hard Mode Unlock Implementation](../implementations/HARD_MODE_UNLOCK_IMPLEMENTATION.md)
