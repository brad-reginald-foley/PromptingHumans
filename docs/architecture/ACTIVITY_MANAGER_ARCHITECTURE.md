# ActivityManager Architecture

## Overview
The ActivityManager provides a centralized, class-based system for managing all learning activities in the application. It eliminates code duplication and provides a consistent lifecycle for all activities.

## Architecture

### Core Components

#### 1. ActivityManager (`web/js/core/ActivityManager.js`)
Central hub that manages all activities through a unified lifecycle:
- **Registration**: Activities register themselves with metadata
- **Trigger**: Initialize and prepare activity with settings
- **Build**: Create UI elements and load content  
- **Start**: Begin the activity
- **Shutdown**: Clean up, save results, and notify backend

#### 2. Activity Configuration
Each activity defines a configuration object that describes:
- Identity (id, name)
- Classes (exerciseClass, uiClass)
- Settings (defaultSettings)
- Dependencies (required App services)
- Lifecycle hooks (onTrigger, onBuild, onStart, onShutdown)

#### 3. Activity Registration Files
Each activity has a `register.js` file that:
- Defines the activity configuration
- Implements lifecycle hooks
- Auto-registers when loaded

## Lifecycle Flow

```
User Selects Activity
        ↓
    TRIGGER
    - Validate dependencies
    - Merge settings with defaults
    - Create exercise + UI instances
    - Initialize exercise
    - Call onTrigger hook
        ↓
     BUILD
    - Show appropriate screen
    - Call UI.show()
    - Call onBuild hook
        ↓
     START
    - Start exercise
    - Notify backend
    - Call onStart hook
        ↓
   [Activity Runs]
        ↓
    SHUTDOWN
    - Get results
    - End exercise
    - Save to ScoreManager
    - Save to backend
    - Send WebSocket message
    - Call onShutdown hook
    - Clear current activity
```

## Activity Configuration Template

```javascript
const ActivityConfig = {
    // Identity
    id: 'activity_type',
    name: 'Activity Name',
    
    // Classes
    exerciseClass: ActivityExercise,
    uiClass: ActivityUI,
    
    // Settings
    defaultSettings: {
        numQuestions: 10,
        difficulty: 'medium'
    },
    
    // UI
    screens: ['activityScreen'],
    
    // Dependencies
    dependencies: ['curriculumManager', 'scoreManager'],
    
    // Lifecycle Hooks (all optional)
    onTrigger: async (manager, settings) => {
        // Custom initialization
    },
    
    onBuild: async (manager) => {
        // Custom UI setup
    },
    
    onStart: async (manager) => {
        // Custom start logic
    },
    
    onShutdown: async (manager, results) => {
        // Custom cleanup
        // Return to main screen
        manager.app.showScreen('selectionScreen');
        manager.app.updateExerciseCards();
    }
};
```

## Migration Guide

### For Remaining Activities

Create registration files for each activity following this pattern:

#### 1. Fill in the Blank (`web/js/exercises/fillInBlank/register.js`)
```javascript
const FillInBlankActivityConfig = {
    id: 'fill_in_the_blank',
    name: 'Fill in the Blank',
    exerciseClass: FillInBlankExercise,
    uiClass: FillInBlankUI,
    defaultSettings: {
        numQuestions: 10,
        difficulty: 'easy'
    },
    screens: ['fillInBlankScreen'],
    dependencies: ['curriculumManager', 'scoreManager'],
    onShutdown: async (manager, results) => {
        if (manager.app.showNextActivityRecommendation) {
            await manager.app.showNextActivityRecommendation('fill_in_the_blank');
        }
        manager.app.showScreen('selectionScreen');
        manager.app.updateExerciseCards();
    }
};
```

#### 2. Spelling (`web/js/exercises/spelling/register.js`)
```javascript
const SpellingActivityConfig = {
    id: 'spelling',
    name: 'Spelling',
    exerciseClass: SpellingExercise,
    uiClass: SpellingUI,
    defaultSettings: {
        numQuestions: 10,
        difficulty: 'easy'
    },
    screens: ['spellingScreen'],
    dependencies: ['curriculumManager', 'scoreManager'],
    onShutdown: async (manager, results) => {
        if (manager.app.showNextActivityRecommendation) {
            await manager.app.showNextActivityRecommendation('spelling');
        }
        manager.app.showScreen('selectionScreen');
        manager.app.updateExerciseCards();
    }
};
```

#### 3. Bubble Pop (`web/js/exercises/bubblePop/register.js`)
```javascript
const BubblePopActivityConfig = {
    id: 'bubble_pop',
    name: 'Bubble Pop',
    exerciseClass: BubblePopExercise,
    uiClass: BubblePopUI,
    defaultSettings: {
        duration: 120,
        difficulty: 'easy',
        errorRate: 30
    },
    screens: ['bubblePopScreen'],
    dependencies: ['curriculumManager', 'scoreManager'],
    onBuild: async (manager) => {
        // Initialize the game UI
        const { ui } = manager.getInstances('bubble_pop');
        if (ui && typeof ui.initialize === 'function') {
            ui.initialize();
        }
    },
    onShutdown: async (manager, results) => {
        if (manager.app.showNextActivityRecommendation) {
            await manager.app.showNextActivityRecommendation('bubble_pop');
        }
        manager.app.showScreen('selectionScreen');
        manager.app.updateExerciseCards();
    }
};
```

#### 4. Fluent Reading (`web/js/exercises/fluentReading/register.js`)
```javascript
const FluentReadingActivityConfig = {
    id: 'fluent_reading',
    name: 'Fluent Reading',
    exerciseClass: FluentReadingExercise,
    uiClass: FluentReadingUI,
    defaultSettings: {
        speed: 150,
        difficulty: 'moderate'
    },
    screens: ['fluentReadingScreen'],
    dependencies: ['curriculumManager', 'scoreManager'],
    onBuild: async (manager) => {
        // Initialize the reading UI
        const { ui } = manager.getInstances('fluent_reading');
        if (ui && typeof ui.initialize === 'function') {
            ui.initialize();
        }
    },
    onShutdown: async (manager, results) => {
        if (manager.app.showNextActivityRecommendation) {
            await manager.app.showNextActivityRecommendation('fluent_reading');
        }
        manager.app.showScreen('selectionScreen');
        manager.app.updateExerciseCards();
    }
};
```

### App Class Changes

#### Before (Manual Instantiation):
```javascript
constructor() {
    // ... other setup ...
    
    // Manual instantiation for each activity
    this.multipleChoiceExercise = new MultipleChoiceExercise(this.curriculumManager, this);
    this.multipleChoiceUI = new MultipleChoiceUI(this, this.multipleChoiceExercise);
    
    this.fillInBlankExercise = new FillInBlankExercise(this.curriculumManager);
    this.fillInBlankUI = new FillInBlankUI(this, this.fillInBlankExercise);
    
    // ... repeated for all 5 activities ...
}

selectExercise(exerciseType) {
    if (exerciseType === 'multiple_choice') {
        this.multipleChoiceUI.show();
    } else if (exerciseType === 'fill_in_the_blank') {
        this.fillInBlankUI.show();
    }
    // ... repeated for all activities ...
}
```

#### After (ActivityManager):
```javascript
constructor() {
    // ... other setup ...
    
    // Single ActivityManager instance
    this.activityManager = new ActivityManager(this);
    
    // Activities register themselves when their scripts load
    // No manual instantiation needed!
}

async selectExercise(exerciseType) {
    // Unified interface for all activities
    await this.activityManager.trigger(exerciseType);
    await this.activityManager.build();
    await this.activityManager.start();
}
```

### HTML Changes

Add ActivityManager and registration scripts to `index.html`:

```html
<!-- Core Framework -->
<script src="web/js/core/ExerciseFramework.js"></script>
<script src="web/js/core/ActivityManager.js"></script>

<!-- Activity Implementations -->
<script src="web/js/exercises/multipleChoice/MultipleChoiceExercise.js"></script>
<script src="web/js/exercises/multipleChoice/MultipleChoiceUI.js"></script>
<script src="web/js/exercises/multipleChoice/register.js"></script>

<!-- Repeat for other activities -->
```

## Benefits

### 1. Reduced Code Duplication
- **Before**: ~200 lines of repetitive instantiation and routing in App
- **After**: Single ActivityManager handles all activities uniformly

### 2. Easy Extension
- **Before**: Add activity → modify App constructor → modify selectExercise → modify showResults
- **After**: Add activity → create registration file → done!

### 3. Consistent Patterns
- All activities follow same lifecycle
- Predictable behavior
- Easier debugging

### 4. Better Testing
- Activities can be tested in isolation
- Mock ActivityManager for unit tests
- Clear separation of concerns

### 5. Maintainability
- Changes to lifecycle affect all activities uniformly
- No scattered logic across App class
- Self-documenting through configuration

## Usage Examples

### Basic Usage
```javascript
// Trigger with default settings
await activityManager.trigger('multiple_choice');
await activityManager.start();

// Trigger with custom settings
await activityManager.trigger('multiple_choice', { 
    difficulty: '5',
    numQuestions: 15 
});
await activityManager.start();
```

### With Lifecycle Hooks
```javascript
// Listen to lifecycle events
activityManager.on('start', (data) => {
    console.log(`Activity ${data.activityType} started`);
});

activityManager.on('shutdown', (data) => {
    console.log(`Activity completed with score: ${data.results.score}`);
});
```

### Getting Activity Info
```javascript
// Get current activity
const current = activityManager.getCurrentActivity();

// Get all registered activities
const all = activityManager.getAllActivities();

// Get specific activity config
const config = activityManager.getActivity('multiple_choice');

// Get activity instances
const { exercise, ui } = activityManager.getInstances('multiple_choice');
```

## Implementation Status

- [x] ActivityManager core class created
- [x] Multiple Choice registration created
- [ ] Fill in the Blank registration
- [ ] Spelling registration  
- [ ] Bubble Pop registration
- [ ] Fluent Reading registration
- [ ] App class refactored to use ActivityManager
- [ ] HTML updated with new script includes
- [ ] Testing completed

## Next Steps

1. Create registration files for remaining 4 activities
2. Update App class to use ActivityManager
3. Update index.html to include new scripts
4. Test each activity works correctly
5. Remove old manual instantiation code
6. Update any documentation

## Notes

- Activities are lazy-loaded (instances created on first use)
- ActivityManager handles all backend integration
- Lifecycle hooks are optional - use only what you need
- Configuration is declarative and self-documenting
