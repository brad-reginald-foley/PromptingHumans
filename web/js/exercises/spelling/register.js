/**
 * @fileoverview Spelling activity registration
 * Registers the Spelling activity with the ActivityManager
 * @module SpellingRegistration
 */

/**
 * Spelling Activity Configuration
 * Defines how the activity integrates with the ActivityManager
 */
const SpellingActivityConfig = {
    // Unique identifier
    id: 'spelling',
    
    // Display name
    name: 'Spelling',
    
    // Exercise and UI classes
    exerciseClass: SpellingExercise,
    uiClass: SpellingUI,
    
    // Default settings
    defaultSettings: {
        numQuestions: 10,
        difficulty: 'easy'
    },
    
    // Screens used by this activity
    screens: ['spellingScreen'],
    
    // Required dependencies from App
    dependencies: ['curriculumManager', 'scoreManager'],
    
    // Lifecycle hooks (optional)
    
    /**
     * Called when activity is triggered
     * @param {ActivityManager} manager - Activity manager instance
     * @param {Object} settings - Final merged settings
     */
    onTrigger: async (manager, settings) => {
        console.log('[Spelling] Activity triggered with settings:', settings);
    },
    
    /**
     * Called when activity UI is built
     * @param {ActivityManager} manager - Activity manager instance
     */
    onBuild: async (manager) => {
        console.log('[Spelling] Activity UI built');
    },
    
    /**
     * Called when activity starts
     * @param {ActivityManager} manager - Activity manager instance
     */
    onStart: async (manager) => {
        console.log('[Spelling] Activity started');
    },
    
    /**
     * Called when activity shuts down
     * @param {ActivityManager} manager - Activity manager instance
     * @param {Object} results - Activity results
     */
    onShutdown: async (manager, results) => {
        console.log('[Spelling] Activity shutdown with results:', results);
        
        // Get next activity recommendation
        if (manager.app.showNextActivityRecommendation) {
            await manager.app.showNextActivityRecommendation('spelling');
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
        window.activityManager.register(SpellingActivityConfig);
        console.log('[Spelling] Activity registered');
    } else {
        console.error('[Spelling] ActivityManager not found!');
    }
});

// Export for manual registration if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpellingActivityConfig;
}
