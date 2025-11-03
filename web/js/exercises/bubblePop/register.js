/**
 * @fileoverview Bubble Pop activity registration
 * Registers the Bubble Pop activity with the ActivityManager
 * @module BubblePopRegistration
 */

/**
 * Bubble Pop Activity Configuration
 * Defines how the activity integrates with the ActivityManager
 */
const BubblePopActivityConfig = {
    // Unique identifier
    id: 'bubble_pop',
    
    // Display name
    name: 'Bubble Pop',
    
    // Exercise and UI classes
    exerciseClass: BubblePopExercise,
    uiClass: BubblePopUI,
    
    // Default settings
    defaultSettings: {
        duration: 120,
        difficulty: 'easy',
        errorRate: 30
    },
    
    // Screens used by this activity
    screens: ['bubblePopScreen'],
    
    // Required dependencies from App
    dependencies: ['curriculumManager', 'scoreManager'],
    
    // Lifecycle hooks (optional)
    
    /**
     * Called when activity is triggered
     * @param {ActivityManager} manager - Activity manager instance
     * @param {Object} settings - Final merged settings
     */
    onTrigger: async (manager, settings) => {
        console.log('[BubblePop] Activity triggered with settings:', settings);
    },
    
    /**
     * Called when activity UI is built
     * @param {ActivityManager} manager - Activity manager instance
     */
    onBuild: async (manager) => {
        console.log('[BubblePop] Activity UI built');
        
        // Initialize the game UI
        const { ui } = manager.getInstances('bubble_pop');
        if (ui && typeof ui.initialize === 'function') {
            ui.initialize();
        }
    },
    
    /**
     * Called when activity starts
     * @param {ActivityManager} manager - Activity manager instance
     */
    onStart: async (manager) => {
        console.log('[BubblePop] Activity started');
    },
    
    /**
     * Called when activity shuts down
     * @param {ActivityManager} manager - Activity manager instance
     * @param {Object} results - Activity results
     */
    onShutdown: async (manager, results) => {
        console.log('[BubblePop] Activity shutdown with results:', results);
        
        // Get next activity recommendation
        if (manager.app.showNextActivityRecommendation) {
            await manager.app.showNextActivityRecommendation('bubble_pop');
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
        window.activityManager.register(BubblePopActivityConfig);
        console.log('[BubblePop] Activity registered');
    } else {
        console.error('[BubblePop] ActivityManager not found!');
    }
});

// Export for manual registration if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BubblePopActivityConfig;
}
