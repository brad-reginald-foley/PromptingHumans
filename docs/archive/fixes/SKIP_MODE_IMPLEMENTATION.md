# Skip Mode Implementation

## Overview

"Skip" mode is a special difficulty level for optional/bonus activities designed for high-mastery students. When an activity is unlocked at "skip" difficulty, it:

1. **Counts as already completed** - No need to actually play it
2. **Automatically unlocks the next activity** - Progression continues seamlessly
3. **Uses hard mode difficulty** - If played, it's challenging

## Purpose

Skip mode allows the adaptive system to:
- Provide optional enrichment activities for advanced students
- Skip activities that students have already mastered
- Maintain engagement by not forcing repetition of mastered content
- Ensure smooth progression through the curriculum

## Implementation

### Frontend (Bubble Pop)

**File**: `web/js/exercises/bubblePop/BubblePopExercise.js`

Added 'skip' to all difficulty-related logic:

#### 1. Scoring Logic
```javascript
case 'hard':
case 'skip':
    // Hard/Skip mode: Q for correct, R for misspelled
    // Must match word type with key pressed
    isCorrectAction = (markedAsCorrect === isCorrectSpelling);
    break;
```

#### 2. Missed Tracking
```javascript
case 'hard':
case 'skip':
    // In hard/skip mode, all unclicked words count as missed
    this.gameScore.missed++;
    break;
```

#### 3. Speed Calculations
```javascript
case 'hard':
case 'skip':
    baseSpeed = 0.7;  // 70% of original speed (fastest)
    tortuosity = 0.6; // Higher vertical movement
    spawnRate = 1200; // Even faster spawning (every 1.2 seconds)
    break;
```

#### 4. Default Fallback
```javascript
default:
    // Unknown difficulty - treat as hard mode
    console.warn(`[BubblePop] Unknown difficulty "${this.difficultyMode}", treating as hard mode`);
    isCorrectAction = (markedAsCorrect === isCorrectSpelling);
    break;
```

### Backend (Database Operations)

**File**: `../prompting_human_agent/backend/src/database/operations.py`

#### 1. Hard Difficulty Check
```python
@staticmethod
def _is_hard_difficulty(activity: str, difficulty: str) -> bool:
    """Helper to check if difficulty is 'hard' for unlock purposes.
    'skip' difficulty is treated as hard mode for auto-completion."""
    if activity == 'multiple_choice':
        return difficulty == '5' or difficulty.lower() == 'skip'
    elif activity == 'fill_in_the_blank':
        return difficulty.lower() in ['hard', 'skip']
    else:
        return difficulty.lower() in ['hard', 'skip']
```

#### 2. Difficulty Ranking
```python
@staticmethod
def _get_difficulty_rank(activity: str, difficulty: str) -> int:
    """Helper to get numeric rank of difficulty for comparison.
    'skip' is treated as rank 3 (same as hard) for auto-completion."""
    if activity == 'multiple_choice':
        if difficulty.lower() == 'skip':
            return 5  # Treat skip as highest difficulty
        return int(difficulty) if difficulty.isdigit() else 3
    else:
        difficulty_map = {'easy': 1, 'moderate': 2, 'medium': 2, 'hard': 3, 'skip': 3}
        return difficulty_map.get(difficulty.lower(), 1)
```

## How It Works

### When Activity is Unlocked at Skip

1. **Backend sends difficulty="skip"** in activity recommendations
2. **Frontend handles skip mode**:
   - Bubble Pop treats it as hard mode difficulty
   - Both Q and R keys work
   - Fast speed, high challenge
3. **On completion** (or even without playing):
   - `update_activity_mastery()` is called with difficulty="skip"
   - `_is_hard_difficulty()` returns `True` for skip
   - `completed_hard_mode` flag is set to `True`
   - Next activity is automatically unlocked

### Progression Logic

The progression service (`progression.py`) checks:

```python
for i, activity in enumerate(ACTIVITY_SEQUENCE[:-1]):
    mastery = DatabaseOperations.get_activity_mastery(student_id, module_id, activity)
    
    if mastery and mastery.completed_hard_mode:
        # Unlock next activity
        next_activity = ACTIVITY_SEQUENCE[i + 1]
        unlocked.append(next_activity)
```

Since skip mode sets `completed_hard_mode = True`, the next activity unlocks immediately.

## Benefits

✅ **Respects student mastery** - Advanced students don't waste time on mastered content
✅ **Maintains challenge** - If played, skip mode is as hard as hard mode
✅ **Smooth progression** - No artificial barriers for high-performing students
✅ **Flexible system** - Can be used for any activity type
✅ **Clear semantics** - "skip" clearly indicates optional/bonus status

## Testing

To test skip mode:

1. **Backend**: Set an activity's difficulty to "skip" in recommendations
2. **Frontend**: 
   - Refresh page
   - Start the activity
   - Verify it behaves like hard mode
   - Check console logs show `mode=skip`
3. **Progression**:
   - Complete (or just start) the skip activity
   - Verify next activity unlocks immediately
   - Check database: `completed_hard_mode` should be `True`

## Future Enhancements

Potential improvements:

1. **Skip confirmation UI** - Show a message: "This activity is optional - you can skip it!"
2. **Skip button** - Add explicit "Skip Activity" button in UI
3. **Skip analytics** - Track which activities are most commonly skipped
4. **Adaptive skip** - Automatically suggest skip for activities where student shows high proficiency

## Files Modified

### Frontend
- `web/js/exercises/bubblePop/BubblePopExercise.js`
  - Added 'skip' to scoring logic
  - Added 'skip' to missed tracking
  - Added 'skip' to speed calculations
  - Added default fallback for unknown difficulties

### Backend
- `../prompting_human_agent/backend/src/database/operations.py`
  - Updated `_is_hard_difficulty()` to recognize 'skip'
  - Updated `_get_difficulty_rank()` to rank 'skip' as hard
  - Auto-completion logic now works for skip mode

## Related Documentation

- `BUBBLE_POP_FIXES.md` - Original Bubble Pop scoring fixes
- `HARD_MODE_UNLOCK_IMPLEMENTATION.md` - Hard mode unlock system
- `BAYESIAN_PROFICIENCY_WITH_OPTIONAL_ACTIVITIES.md` - Adaptive difficulty system
