# Agent Replacement Glitch - Investigation Plan

**Date:** November 2, 2025  
**Status:** Pre-existing issue identified during Bubble Pop testing  
**Priority:** Medium

## Issue Description

Multiple `/api/activity/start` requests are being made simultaneously when activities are initialized, causing the activity agent to be created, destroyed, and recreated multiple times in rapid succession.

### Observed Behavior

From backend logs:
```
POST /api/activity/start from ports: 51529, 51517, 51523, 51531
🧹 Activity agent destroyed
✅ Activity agent created: multiple_choice (3)
```

This happens with multiple activities (not just Bubble Pop), indicating it's a pre-existing system-wide issue.

## Investigation Todo List

### Phase 1: Analysis
- [ ] Review `SessionManager.startActivity()` to see how many times it calls the backend
- [ ] Check if multiple components are calling `startActivity()` simultaneously
- [ ] Review WebSocket initialization to see if duplicate connections are created
- [ ] Check browser console for duplicate network requests to `/api/activity/start`
- [ ] Verify if this happens only on first load or on every activity start
- [ ] Check if React strict mode double-rendering is causing the issue
- [ ] Review activity initialization flow in `ActivityManager`

### Phase 2: Root Cause Identification
- [ ] Identify the source of multiple `/api/activity/start` requests
- [ ] Determine if it's a React strict mode double-render issue
- [ ] Check if it's related to page refresh/hot reload in development
- [ ] Verify the request origin ports to trace back to specific code
- [ ] Check if multiple UI components are independently calling activity start
- [ ] Review if backend recommendations call triggers duplicate requests

### Phase 3: Fix Implementation

#### Option A: Frontend Deduplication
- [ ] Add request deduplication logic in `SessionManager`
- [ ] Implement a flag to prevent multiple simultaneous calls:
  ```javascript
  this.activityStartInProgress = false;
  
  async startActivity(activityType) {
      if (this.activityStartInProgress) {
          console.log('Activity start already in progress, skipping');
          return this.lastActivityStartPromise;
      }
      this.activityStartInProgress = true;
      this.lastActivityStartPromise = this._doStartActivity(activityType);
      try {
          return await this.lastActivityStartPromise;
      } finally {
          this.activityStartInProgress = false;
      }
  }
  ```

#### Option B: Backend Idempotency
- [ ] Add idempotency check in backend `/api/activity/start` endpoint
- [ ] Track recent activity start requests by session + activity type
- [ ] Return cached response if duplicate request within short time window
- [ ] Implement request ID system to identify duplicates

#### Option C: Agent Lifecycle Guard
- [ ] Implement activity agent lifecycle guard to prevent rapid destroy/create
- [ ] Add cooldown period before allowing agent destruction
- [ ] Queue agent creation requests and deduplicate
- [ ] Add logging to track agent creation/destruction events

### Phase 4: Testing & Verification
- [ ] Test with new student registration
- [ ] Test activity switching between different exercises
- [ ] Verify no duplicate agents created
- [ ] Check that agent context is maintained correctly
- [ ] Test in both dev and production mode
- [ ] Verify fix doesn't break existing functionality
- [ ] Test with multiple activities in sequence
- [ ] Test with rapid activity switching

## Technical Details

### Files to Review
1. **Frontend:**
   - `web/js/integration/SessionManager.js` - Activity start logic
   - `web/js/core/ActivityManager.js` - Activity initialization
   - `web/js/app.js` - Main app initialization
   - Exercise UI files (e.g., `BubblePopUI.js`, `SpellingUI.js`)

2. **Backend:**
   - `backend/src/api/routes.py` - `/api/activity/start` endpoint
   - `backend/src/agents/agent_manager.py` - Agent lifecycle management
   - `backend/src/api/websocket.py` - WebSocket message handling

### Potential Root Causes

1. **Multiple Component Calls:** Different UI components calling `startActivity()` independently
2. **React Strict Mode:** Double-rendering in development causing duplicate calls
3. **Race Condition:** Async operations completing out of order
4. **WebSocket + HTTP:** Both WebSocket and HTTP endpoints being called
5. **Backend Recommendations:** Getting recommendations triggers additional start call

## Impact Assessment

### Current Impact
- **Severity:** Low to Medium
- **User Experience:** Brief visual glitch as agent context switches
- **Functionality:** No data loss, final agent works correctly
- **Performance:** Minimal - extra API calls but no significant delay

### Risks of Not Fixing
- Unnecessary API calls and token usage
- Potential for race conditions in agent context
- Confusing logs during debugging
- Could mask other issues

## Recommended Approach

1. **Start with frontend deduplication** (Option A) - Simplest and most direct
2. **Add backend idempotency** (Option B) - Defense in depth
3. **Monitor and verify** - Ensure fix works across all activities
4. **Document findings** - Update this file with root cause and solution

## Notes

- Issue was discovered during Bubble Pop agent chat implementation
- Affects multiple activities, not specific to Bubble Pop
- Pre-existing issue, not introduced by recent changes
- Agent replacement is harmless but indicates inefficiency

## Related Files

- `docs/archive/fixes/BUBBLE_POP_FIXES.md` - Bubble Pop agent chat implementation
- `docs/features/AGENT_GUIDED_EXERCISES.md` - Agent system overview
