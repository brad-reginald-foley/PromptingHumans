# Fill in the Blank Difficulty Mismatch Fix

**Date:** November 2, 2025  
**Status:** Fixed  
**Priority:** Critical

## Issue Description

Students were playing Fill in the Blank at one difficulty level (e.g., "easy") but the system was recording it as a different difficulty level (e.g., "hard"). This caused:

1. **Wrong progression tracking** - Easy mode completion was recorded as hard mode completion
2. **Premature unlocking** - Next activities unlocked incorrectly
3. **Agent context confusion** - Agent received wrong difficulty context
4. **Incorrect word bank** - Easy mode showed 10-word bank (correct) but was recorded as hard mode

## Root Cause Analysis

### The Flow

1. **Backend recommends** `difficulty: "easy"` ✓
2. **FillInBlankUI** receives it and generates easy mode questions (10-word bank) ✓
3. **FillInBlankUI** calls `app.activityChatWidget.startActivity('fill_in_the_blank', 'easy')` ✓
4. **app.js** correctly logs and sends `difficulty: 'easy'` via WebSocket ✓
5. **BUT** when activity ends, **ActivityManager** sends `difficulty: this.currentSettings?.difficulty` ❌
6. **Problem:** `this.currentSettings` is `undefined` because FillInBlankUI bypasses ActivityManager!

### Why currentSettings Was Undefined

- **ActivityManager.trigger()** is called from `app.js` line 687 WITHOUT any settings parameter
- This means `currentSettings` gets set to default settings merged with empty object
- **BUT** FillInBlankUI then directly initializes the exercise with backend-recommended settings
- ActivityManager never knows about these settings!
- When activity ends, ActivityManager sends `undefined` difficulty to backend
- Backend defaults to student's highest mastery level (which was "hard")

## The Fix

### Solution

Update `FillInBlankUI.startExercise()` to explicitly set `ActivityManager.currentSettings` with the actual difficulty being used.

### Code Changes

**File:** `web/js/exercises/fillInBlank/FillInBlankUI.js`

**Location:** `startExercise()` method

**Change:**
```javascript
// CRITICAL: Update ActivityManager's currentSettings so it knows the actual difficulty
// This ensures the correct difficulty is recorded when the activity ends
if (this.app.activityManager) {
    this.app.activityManager.currentSettings = {
        numQuestions: numQuestions,
        difficulty: difficulty
    };
    console.log('[FillInBlank] Updated ActivityManager settings:', this.app.activityManager.currentSettings);
}
```

### Why This Works

1. FillInBlankUI gets backend-recommended difficulty ("easy")
2. FillInBlankUI updates ActivityManager.currentSettings with this difficulty
3. When activity ends, ActivityManager sends the correct difficulty to backend
4. Backend records the correct difficulty
5. Agent receives correct context
6. Progression tracking works correctly

## Testing

### Test Case 1: New Student - Easy Mode
1. Start as new student
2. Begin Fill in the Blank activity
3. Backend should recommend "easy"
4. Play the activity (10-word bank)
5. Complete the activity
6. **Expected:** Backend records "easy" difficulty
7. **Expected:** Next activity does NOT unlock (need to beat hard mode first)

### Test Case 2: Returning Student - Backend Recommendation
1. Student who previously beat easy mode
2. Backend recommends "medium" or "hard"
3. Play the activity
4. **Expected:** Backend records the recommended difficulty
5. **Expected:** Agent context matches actual difficulty played

### Verification

Check console logs for:
```
[FillInBlank] Backend recommendations: { difficulty: "easy", ... }
[FillInBlank] Updated ActivityManager settings: { difficulty: "easy", numQuestions: 10 }
[ACTIVITY] Starting fill_in_the_blank at easy difficulty
```

Check backend logs for:
```
[PROGRESSION] - difficulty: easy
[PROGRESSION] - completed_hard_mode: False
```

## Related Issues

### Agent Context Issue
The agent was receiving wrong difficulty context because the backend was told the student was playing "hard" mode when they were actually playing "easy" mode. This fix resolves that issue automatically.

### Word Bank Issue
The word bank was correct for the difficulty being played (easy = 10 words), but the mismatch occurred only in the recording/tracking phase.

## Impact

### Before Fix
- Students could unlock next activities by completing easy mode
- Progression tracking was incorrect
- Agent provided inappropriate difficulty-level feedback

### After Fix
- Correct difficulty is recorded
- Progression works as designed
- Agent context matches actual gameplay
- Students must complete appropriate difficulty to unlock next activities

## Files Modified

1. `web/js/exercises/fillInBlank/FillInBlankUI.js` - Added ActivityManager.currentSettings update
2. `web/js/exercises/fluentReading/FluentReadingUI.js` - Added ActivityManager.currentSettings update

## Other Activities Checked

**Spelling, BubblePop, and MultipleChoice** - These activities do NOT have this issue because:
- They are properly integrated with ActivityManager
- They don't bypass ActivityManager by directly calling activityChatWidget.startActivity
- ActivityManager.trigger() properly sets currentSettings for them
- When they end, ActivityManager has the correct difficulty to send to backend

**Only FillInBlank and FluentReading had this issue** because they:
1. Get backend recommendations in their show() method
2. Directly initialize their exercises with those settings
3. Call activityChatWidget.startActivity (which is fine)
4. BUT never update ActivityManager.currentSettings
5. So when activity ends, ActivityManager sends undefined difficulty

## Notes

- All activities are triggered through `activityManager.trigger(exerciseType)` in app.js line 687
- FillInBlank and FluentReading were the only ones that bypassed ActivityManager's settings management
- Long-term solution: Refactor to have ActivityManager handle backend recommendations centrally

## Related Documentation

- `docs/archive/fixes/FILL_IN_BLANK_FIXES.md` - Previous Fill in the Blank fixes
- `docs/architecture/ACTIVITY_MANAGER_ARCHITECTURE.md` - ActivityManager design
- `docs/features/PROFICIENCY_BASED_PROGRESSION.md` - Progression system overview
