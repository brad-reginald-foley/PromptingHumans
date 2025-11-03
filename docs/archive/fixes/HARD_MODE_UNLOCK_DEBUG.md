# Hard Mode Unlock Issue - Debug Investigation

## Issue Report
User completed the first activity at hard level, but the next activity is not unlocking.

## Investigation Summary

### System Architecture
The unlock system works through multiple layers:

1. **Frontend (ScoreManager)**: Stores unlock state in localStorage
2. **Frontend (SessionManager)**: Syncs unlock state with backend
3. **Backend (ActivityMastery table)**: Tracks completion of hard mode with 80%+ score
4. **Backend (ProgressionService)**: Determines which activities should be unlocked
5. **Backend (routes.py)**: Returns newly unlocked activities to frontend

### Unlock Logic Flow

When a student completes an activity:

1. **Activity ends** → `app.js` calls `ActivityManager.shutdown()`
2. **Results saved** → `SessionManager.endActivity()` is called
3. **Backend receives results** → `routes.py` `/activity/end` endpoint
4. **Mastery updated** → `DatabaseOperations.update_activity_mastery()` sets `completed_hard_mode = True` if:
   - Difficulty is "hard" (or "5" for multiple choice)
   - Score is 80% or higher
5. **Unlocks checked** → `ProgressionService.get_next_activity()` calls `_get_unlocked_activities()`
6. **Progress retrieved** → `DatabaseOperations.get_student_progress()` checks `ActivityMastery` table
7. **Newly unlocked activities** → Compared before/after to find what was just unlocked
8. **Response sent** → `unlocked_activities` array returned to frontend
9. **Frontend updates** → `SessionManager` calls `scoreManager.setExerciseUnlocked()` for each

### Hard Mode Requirements

For an activity to unlock the next one:
- **Multiple Choice**: Difficulty "5" with 80%+ score
- **Fill in the Blank**: Difficulty "hard" with 80%+ score  
- **Spelling**: Difficulty "hard" with 80%+ score
- **Bubble Pop**: Difficulty "hard" with 80%+ score
- **Fluent Reading**: Difficulty "hard" with 80%+ score

### Debug Logging Added

Added comprehensive logging in `routes.py` at the `/activity/end` endpoint:

```python
print(f"\n[ROUTES] ===== CHECKING FOR UNLOCKS =====")
print(f"[ROUTES] Student: {session.student_id}")
print(f"[ROUTES] Activity: {request.activity_type}")
print(f"[ROUTES] Score: {percentage:.1f}%")
print(f"[ROUTES] Difficulty: {request.tuning_settings.get('difficulty')}")
print(f"[ROUTES] Unlocked before: {unlocked_before}")
# ... processing ...
print(f"[ROUTES] Unlocked after: {unlocked_after}")
print(f"[ROUTES] Newly unlocked: {newly_unlocked}")
print(f"[ROUTES] ===== END UNLOCK CHECK =====\n")
```

This logging will help identify:
1. What difficulty level was actually used
2. What score percentage was achieved
3. Which activities were unlocked before the attempt
4. Which activities are unlocked after the attempt
5. Which activities were newly unlocked

### Existing Debug Logging

The system already has debug logging in:
- `progression.py` - `_get_unlocked_activities()` method
- `operations.py` - `get_activity_mastery()` method

### Next Steps for User

1. **Complete an activity at hard difficulty with 80%+ score**
2. **Check the backend console logs** for the debug output
3. **Look for the `[ROUTES]` and `[PROGRESSION]` log sections**
4. **Verify**:
   - The difficulty is correctly identified as "hard" (or "5")
   - The score percentage is 80% or higher
   - The `ActivityMastery` record shows `completed_hard_mode = True`
   - The next activity appears in the "Unlocked after" set
   - The next activity appears in the "Newly unlocked" list

### Common Issues to Check

1. **Difficulty mismatch**: Ensure the activity is actually being played at hard difficulty
2. **Score threshold**: Verify the score is 80% or higher
3. **Backend connection**: Confirm the backend is running and connected
4. **Database state**: Check if `ActivityMastery` table has the correct record
5. **Frontend sync**: Verify `SessionManager` is receiving and applying the unlock response

### Testing the Fix

To test if unlocks are working:

```bash
# 1. Start the backend
cd ../prompting_human_agent/backend
python -m uvicorn src.main:app --reload

# 2. Open the frontend
cd ../../learning_module
open web/index.html

# 3. Complete an activity at hard difficulty with 80%+ score
# 4. Check backend console for debug logs
# 5. Verify next activity is unlocked in the UI
```

### Files Modified

- `../prompting_human_agent/backend/src/api/routes.py` - Added debug logging

### Related Documentation

- `docs/archive/fixes/UNLOCK_BUG_FIX.md` - Previous unlock bug fix
- `docs/archive/implementations/HARD_MODE_UNLOCK_IMPLEMENTATION.md` - Original implementation
- `docs/features/PROFICIENCY_BASED_PROGRESSION.md` - Proficiency system overview
