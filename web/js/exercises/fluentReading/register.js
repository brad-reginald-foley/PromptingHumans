/**
 * @fileoverview Fluent Reading activity registration
 * Registers the Fluent Reading activity with the ActivityManager
 * @module FluentReadingRegistration
 */

/**
 * Fluent Reading Activity Configuration
 * Defines how the activity integrates with the ActivityManager
 */
const FluentReadingActivityConfig = {
    // Unique identifier
    id: 'fluent_reading',
    
    // Display name
    name: 'Fluent Reading',
    
    // Exercise and UI classes
    exerciseClass: FluentReadingExercise,
    uiClass: FluentReadingUI,
    
    // Default settings
    defaultSettings: {
        speed: 150,
        difficulty: 'medium'
    },
    
    // Screens used by this activity
    screens: ['fluentReadingScreen'],
    
    // Required dependencies from App
    dependencies: ['curriculumManager', 'scoreManager'],
    
    // Lifecycle hooks (optional)
    
    /**
     * Called when activity is triggered
     * @param {ActivityManager} manager - Activity manager instance
     * @param {Object} settings - Final merged settings
     */
    onTrigger: async (manager, settings) => {
        console.log('[FluentReading] Activity triggered with settings:', settings);
    },
    
    /**
     * Called when activity UI is built
     * @param {ActivityManager} manager - Activity manager instance
     */
    onBuild: async (manager) => {
        console.log('[FluentReading] Activity UI built');
        
        // Initialize the reading UI
        const { ui } = manager.getInstances('fluent_reading');
        if (ui && typeof ui.initialize === 'function') {
            ui.initialize();
        }
    },
    
    /**
     * Called when activity starts
     * @param {ActivityManager} manager - Activity manager instance
     */
    onStart: async (manager) => {
        console.log('[FluentReading] Activity started');
    },
    
    /**
     * Called when activity shuts down
     * @param {ActivityManager} manager - Activity manager instance
     * @param {Object} results - Activity results
     */
    onShutdown: async (manager, results) => {
        console.log('[FluentReading] Activity shutdown with results:', results);
        
        // Get next activity recommendation
        if (manager.app.showNextActivityRecommendation) {
            await manager.app.showNextActivityRecommendation('fluent_reading');
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
        window.activityManager.register(FluentReadingActivityConfig);
        console.log('[FluentReading] Activity registered');
    } else {
        console.error('[FluentReading] ActivityManager not found!');
    }
});

// Export for manual registration if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FluentReadingActivityConfig;
}
