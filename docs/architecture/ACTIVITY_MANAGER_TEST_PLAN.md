# ActivityManager Testing Plan

## Overview
This document outlines the testing plan for the ActivityManager refactoring to ensure all activities work correctly with the new centralized lifecycle management system.

## Test Environment
- **Browser**: Open `web/index.html` in a modern browser
- **Console**: Open browser DevTools Console to monitor logs
- **Expected Logs**: Look for registration and lifecycle messages

## Initial Load Tests

### 1. Page Load
**Expected Behavior**:
- Page loads without JavaScript errors
- Console shows: "Registered Activities: [array of 5 activity IDs]"
- All 5 activities should be listed: `multiple_choice`, `fill_in_the_blank`, `spelling`, `bubble_pop`, `fluent_reading`

**Console Messages to Look For**:
```
Dev Mode Status: false (or true if ?dev in URL)
Registered Activities: ["multiple_choice", "fill_in_the_blank", "spelling", "bubble_pop", "fluent_reading"]
[MultipleChoice] Activity registered
[FillInBlank] Activity registered
[Spelling] Activity registered
[BubblePop] Activity registered
[FluentReading] Activity registered
```

### 2. Registration Screen
**Expected Behavior**:
- Registration screen displays
- Can enter username
- "Start Learning" button enables when username entered

## Activity Lifecycle Tests

For each activity, test the complete lifecycle:

### Multiple Choice
1. **Trigger Phase**:
   - Click Multiple Choice icon
   - Console: `[MultipleChoice] Activity triggered with settings: {...}`
   - Settings panel should display

2. **Build Phase**:
   - Click "Start Exercise"
   - Console: `[MultipleChoice] Activity UI built`
   - Exercise screen should display with questions

3. **Start Phase**:
   - Console: `[MultipleChoice] Activity started`
   - Backend notification sent (if connected)

4. **Shutdown Phase**:
   - Complete the exercise
   - Console: `[MultipleChoice] Activity shutdown with results: {...}`
   - Should return to selection screen
   - Scores should be saved

### Fill in the Blank
1. **Trigger**: Click icon → Settings panel displays
2. **Build**: Start exercise → Word bank and blanks display
3. **Start**: Exercise begins
4. **Shutdown**: Complete → Return to menu with saved scores

### Spelling
1. **Trigger**: Click icon → Settings panel displays
2. **Build**: Start exercise → Input field displays
3. **Start**: Exercise begins
4. **Shutdown**: Complete → Return to menu with saved scores

### Bubble Pop
1. **Trigger**: Click icon → Settings panel displays
2. **Build**: Start game → Canvas initializes
   - Console: `[BubblePop] Activity UI built`
   - UI initialization called
3. **Start**: Game begins with bubbles
4. **Shutdown**: Complete → Return to menu with saved scores

### Fluent Reading
1. **Trigger**: Click icon → Settings panel displays
2. **Build**: Start reading → Canvas initializes
   - Console: `[FluentReading] Activity UI built`
   - UI initialization called
3. **Start**: Text streaming begins
4. **Shutdown**: Complete → Return to menu with saved scores

## Error Handling Tests

### 1. Missing Dependencies
**Test**: Manually break a dependency in console
```javascript
app.curriculumManager = null;
app.selectExercise('multiple_choice');
```
**Expected**: Error message about missing dependencies

### 2. Invalid Activity Type
**Test**: Try to trigger non-existent activity
```javascript
app.activityManager.trigger('invalid_activity');
```
**Expected**: Error thrown or graceful handling

### 3. Activity Already Running
**Test**: Try to start another activity while one is running
**Expected**: Current activity should be shut down first

## Integration Tests

### 1. Backend Integration
**Test**: Complete an activity with backend connected
**Expected**:
- Activity start notification sent via WebSocket
- Results saved to database via REST API
- Next activity recommendation received

### 2. Score Persistence
**Test**: Complete activities and refresh page
**Expected**:
- Scores persist in localStorage
- Activity unlock status maintained
- Best scores displayed on cards

### 3. Activity Unlocking
**Test**: Complete activities in sequence
**Expected**:
- Next activity unlocks after completing previous
- Lock icons update correctly
- Score bubbles display percentages

## Console Verification

### Success Indicators
Look for these console messages during testing:

```
✓ [ActivityManager] Registered activity: multiple_choice
✓ [ActivityManager] Registered activity: fill_in_the_blank
✓ [ActivityManager] Registered activity: spelling
✓ [ActivityManager] Registered activity: bubble_pop
✓ [ActivityManager] Registered activity: fluent_reading

✓ [ActivityManager] Triggering activity: multiple_choice
✓ [MultipleChoice] Activity triggered with settings: {...}
✓ [ActivityManager] Building activity: multiple_choice
✓ [MultipleChoice] Activity UI built
✓ [ActivityManager] Starting activity: multiple_choice
✓ [MultipleChoice] Activity started

✓ [ActivityManager] Shutting down activity: multiple_choice
✓ [MultipleChoice] Activity shutdown with results: {...}
✓ [ActivityManager] Activity shutdown complete
```

### Error Indicators
Watch for these error patterns:

```
✗ Uncaught TypeError: Cannot read property 'X' of undefined
✗ [ActivityManager] Error: Missing required dependency
✗ [ActivityManager] Error: Activity not found
✗ ReferenceError: X is not defined
```

## Regression Tests

### 1. Old Functionality Still Works
- Dev mode toggle
- Score tracking
- Exercise settings
- Chat functionality
- Avatar display

### 2. Backward Compatibility
- Old exercise instances still accessible (for transition period)
- `app.multipleChoiceUI` still exists (deprecated but functional)
- `app.showResults()` still works

## Performance Tests

### 1. Load Time
**Test**: Measure page load time
**Expected**: No significant increase from before refactoring

### 2. Memory Usage
**Test**: Monitor memory in DevTools
**Expected**: No memory leaks when switching between activities

### 3. Activity Switching
**Test**: Rapidly switch between activities
**Expected**: Smooth transitions, no errors

## Manual Testing Checklist

- [ ] Page loads without errors
- [ ] All 5 activities register successfully
- [ ] Can complete Multiple Choice exercise
- [ ] Can complete Fill in the Blank exercise
- [ ] Can complete Spelling exercise
- [ ] Can complete Bubble Pop game
- [ ] Can complete Fluent Reading exercise
- [ ] Scores save correctly
- [ ] Activities unlock in sequence
- [ ] Backend integration works (if available)
- [ ] No console errors during normal use
- [ ] Dev mode works correctly
- [ ] Activity switching is smooth

## Known Issues to Watch For

1. **Timing Issues**: Activities may try to register before ActivityManager is ready
   - **Solution**: Ensure ActivityManager script loads before registration scripts

2. **Duplicate Registrations**: Activities might register multiple times
   - **Solution**: Check for existing registration before adding

3. **Cleanup Issues**: Previous activity state might leak into next activity
   - **Solution**: Ensure shutdown properly clears all state

4. **UI State**: UI elements from previous activity might remain visible
   - **Solution**: Verify screen switching logic in shutdown hooks

## Success Criteria

The refactoring is successful if:
1. ✅ All 5 activities work exactly as before
2. ✅ No new console errors appear
3. ✅ Scores save and persist correctly
4. ✅ Activity unlocking works as expected
5. ✅ Backend integration remains functional
6. ✅ Performance is not degraded
7. ✅ Code is more maintainable (subjective but evident)

## Rollback Plan

If critical issues are found:
1. Revert `web/js/app.js` to previous version
2. Remove ActivityManager script from `web/index.html`
3. Remove all `register.js` files
4. Test that old functionality is restored

## Next Steps After Testing

1. Monitor for any edge cases in production use
2. Gather feedback on maintainability improvements
3. Consider adding automated tests
4. Document any discovered issues
5. Plan for removing deprecated code paths
