/**
 * @fileoverview Multiple Choice activity registration
 * Registers the Multiple Choice activity with the ActivityManager
 * @module MultipleChoiceRegistration
 */

/**
 * Multiple Choice Activity Configuration
 * Defines how the activity integrates with the ActivityManager
 */
const MultipleChoiceActivityConfig = {
    // Unique identifier
    id: 'multiple_choice',
    
    // Display name
    name: 'Multiple Choice',
    
    // Exercise and UI classes
    exerciseClass: MultipleChoiceExercise,
    uiClass: MultipleChoiceUI,
    
    // Default settings
    defaultSettings: {
        numQuestions: 10,
        difficulty: '4'  // Medium (4 choices)
    },
    
    // Screens used by this activity
    screens: ['multipleChoiceScreen'],
    
    // Required dependencies from App
    dependencies: ['curriculumManager', 'scoreManager'],
    
    // Lifecycle hooks (optional)
    
    /**
     * Called when activity is triggered
     * @param {ActivityManager} manager - Activity manager instance
     * @param {Object} settings - Final merged settings
     */
    onTrigger: async (manager, settings) => {
        console.log('[MultipleChoice] Activity triggered with settings:', settings);
        
        // Could add custom initialization logic here
        // For example, pre-loading resources, checking prerequisites, etc.
    },
    
    /**
     * Called when activity UI is built
     * @param {ActivityManager} manager - Activity manager instance
     */
    onBuild: async (manager) => {
        console.log('[MultipleChoice] Activity UI built');
        
        // Could add custom UI setup here
        // For example, animations, special layouts, etc.
    },
    
    /**
     * Called when activity starts
     * @param {ActivityManager} manager - Activity manager instance
     */
    onStart: async (manager) => {
        console.log('[MultipleChoice] Activity started');
        
        // Could add custom start logic here
        // For example, starting timers, enabling special features, etc.
    },
    
    /**
     * Called when activity shuts down
     * @param {ActivityManager} manager - Activity manager instance
     * @param {Object} results - Activity results
     */
    onShutdown: async (manager, results) => {
        console.log('[MultipleChoice] Activity shutdown with results:', results);
        
        // Could add custom cleanup here
        // For example, special analytics, achievements, etc.
        
        // Get next activity recommendation
        if (manager.app.showNextActivityRecommendation) {
            await manager.app.showNextActivityRecommendation('multiple_choice');
        }
        
        // Return to selection screen
        manager.app.showScreen('selectionScreen');
        manager.app.updateExerciseCards();
        
        // Display brief message while waiting for LLM
        if (manager.app.sendToFixedChat) {
            manager.app.sendToFixedChat('main', '📊 Analyzing your results...', 'agent');
        }
    }
};

/**
 * Register the activity when DOM is ready
 * This ensures the App and ActivityManager are fully initialized
 */
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window !== 'undefined' && window.activityManager) {
        window.activityManager.register(MultipleChoiceActivityConfig);
        console.log('[MultipleChoice] Activity registered');
    } else {
        console.error('[MultipleChoice] ActivityManager not found!');
    }
});

// Export for manual registration if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultipleChoiceActivityConfig;
}
