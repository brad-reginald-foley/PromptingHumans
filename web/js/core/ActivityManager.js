/**
 * @fileoverview Central manager for all learning activities
 * Provides unified lifecycle management and registration system
 * @module ActivityManager
 */

/**
 * ActivityManager - Central hub for activity lifecycle management
 * 
 * Manages the complete lifecycle of learning activities:
 * - Registration: Activities register themselves with metadata
 * - Trigger: Initialize and prepare activity with settings
 * - Build: Create UI elements and load content
 * - Start: Begin the activity
 * - Shutdown: Clean up, save results, and notify backend
 * 
 * @class ActivityManager
 * @example
 * const manager = new ActivityManager(app);
 * manager.register(multipleChoiceConfig);
 * manager.trigger('multiple_choice', { difficulty: 4 });
 * manager.start('multiple_choice');
 */
class ActivityManager {
    /**
     * Creates an instance of ActivityManager
     * @param {App} app - Main application instance
     */
    constructor(app) {
        this.app = app;
        
        // Registry of all activities
        this.activities = new Map();
        
        // Current activity state
        this.currentActivity = null;
        this.currentActivityType = null;
        this.currentSettings = null;
        
        // Activity instances (exercise + UI)
        this.instances = new Map();
        
        // Event listeners
        this.eventListeners = {
            'trigger': [],
            'build': [],
            'start': [],
            'shutdown': [],
            'error': []
        };
        
        console.log('[ActivityManager] Initialized');
    }
    
    /**
     * Register an activity with the manager
     * @param {Object} config - Activity configuration
     * @param {string} config.id - Unique activity identifier
     * @param {string} config.name - Display name
     * @param {Class} config.exerciseClass - Exercise class constructor
     * @param {Class} config.uiClass - UI class constructor
     * @param {Object} config.defaultSettings - Default settings
     * @param {Array<string>} config.screens - Screen IDs used by activity
     * @param {Array<string>} config.dependencies - Required dependencies
     * @param {Function} [config.onTrigger] - Trigger lifecycle hook
     * @param {Function} [config.onBuild] - Build lifecycle hook
     * @param {Function} [config.onStart] - Start lifecycle hook
     * @param {Function} [config.onShutdown] - Shutdown lifecycle hook
     * @returns {ActivityManager} Returns this for chaining
     */
    register(config) {
        // Validate config
        if (!config.id) {
            throw new Error('Activity config must have an id');
        }
        if (!config.exerciseClass || !config.uiClass) {
            throw new Error(`Activity ${config.id} must have exerciseClass and uiClass`);
        }
        
        // Check for duplicate registration
        if (this.activities.has(config.id)) {
            console.warn(`[ActivityManager] Activity ${config.id} already registered, overwriting`);
        }
        
        // Store config
        this.activities.set(config.id, config);
        
        console.log(`[ActivityManager] Registered activity: ${config.id}`);
        return this;
    }
    
    /**
     * Trigger an activity - initialize and prepare
     * @param {string} activityType - Activity type identifier
     * @param {Object} [settings={}] - Activity settings
     * @returns {Promise<void>}
     * @fires ActivityManager#trigger
     */
    async trigger(activityType, settings = {}) {
        console.log(`[ActivityManager] Triggering ${activityType}`, settings);
        
        // Get activity config
        const config = this.activities.get(activityType);
        if (!config) {
            throw new Error(`Activity ${activityType} not registered`);
        }
        
        // Check dependencies
        this._checkDependencies(config);
        
        // Merge with default settings
        const finalSettings = { ...config.defaultSettings, ...settings };
        
        // Store current activity state
        this.currentActivityType = activityType;
        this.currentActivity = config;
        this.currentSettings = finalSettings;
        
        // Create instances if they don't exist
        if (!this.instances.has(activityType)) {
            this._createInstances(activityType, config);
        }
        
        // Get instances
        const { exercise, ui } = this.instances.get(activityType);
        
        // Initialize exercise with settings
        exercise.initialize(finalSettings);
        
        // Call custom trigger hook if provided
        if (config.onTrigger) {
            await config.onTrigger(this, finalSettings);
        }
        
        // Emit trigger event
        this.emit('trigger', { activityType, settings: finalSettings });
        
        console.log(`[ActivityManager] ${activityType} triggered successfully`);
    }
    
    /**
     * Build an activity - create UI and load content
     * @param {string} [activityType] - Activity type (uses current if not provided)
     * @returns {Promise<void>}
     * @fires ActivityManager#build
     */
    async build(activityType = null) {
        activityType = activityType || this.currentActivityType;
        
        if (!activityType) {
            throw new Error('No activity to build');
        }
        
        console.log(`[ActivityManager] Building ${activityType}`);
        
        const config = this.activities.get(activityType);
        const { ui } = this.instances.get(activityType);
        
        // Show appropriate screen(s)
        if (config.screens && config.screens.length > 0) {
            this.app.showScreen(config.screens[0]);
        }
        
        // Call UI show method if it exists
        if (ui && typeof ui.show === 'function') {
            ui.show();
        }
        
        // Call custom build hook if provided
        if (config.onBuild) {
            await config.onBuild(this);
        }
        
        // Emit build event
        this.emit('build', { activityType });
        
        console.log(`[ActivityManager] ${activityType} built successfully`);
    }
    
    /**
     * Start an activity - begin the activity
     * @param {string} [activityType] - Activity type (uses current if not provided)
     * @returns {Promise<void>}
     * @fires ActivityManager#start
     */
    async start(activityType = null) {
        activityType = activityType || this.currentActivityType;
        
        if (!activityType) {
            throw new Error('No activity to start');
        }
        
        console.log(`[ActivityManager] Starting ${activityType}`);
        
        const config = this.activities.get(activityType);
        const { exercise } = this.instances.get(activityType);
        
        // Start the exercise
        exercise.start();
        
        // Notify backend via SessionManager
        if (this.app.sessionManager) {
            try {
                await this.app.sessionManager.startActivity(
                    activityType,
                    this.currentSettings
                );
            } catch (error) {
                console.error('[ActivityManager] Failed to notify backend of activity start:', error);
                // Continue anyway - activity can run offline
            }
        }
        
        // Call custom start hook if provided
        if (config.onStart) {
            await config.onStart(this);
        }
        
        // Emit start event
        this.emit('start', { activityType });
        
        console.log(`[ActivityManager] ${activityType} started successfully`);
    }
    
    /**
     * Shutdown an activity - clean up and save results
     * @param {string} [activityType] - Activity type (uses current if not provided)
     * @param {Object} [results] - Activity results
     * @returns {Promise<void>}
     * @fires ActivityManager#shutdown
     */
    async shutdown(activityType = null, results = null) {
        activityType = activityType || this.currentActivityType;
        
        if (!activityType) {
            console.warn('[ActivityManager] No activity to shutdown');
            return;
        }
        
        console.log(`[ActivityManager] Shutting down ${activityType}`);
        
        const config = this.activities.get(activityType);
        const { exercise } = this.instances.get(activityType);
        
        // Get results if not provided
        if (!results && exercise) {
            results = exercise.getResults();
        }
        
        // End the exercise
        if (exercise && exercise.state !== 'completed') {
            exercise.end();
        }
        
        // Save results locally
        if (results && this.app.scoreManager) {
            const difficulty = this.currentSettings?.difficulty || config.defaultSettings?.difficulty;
            this.app.scoreManager.recordScore(
                activityType,
                difficulty,
                results.score,
                results.total
            );
        }
        
        // Save to backend
        if (this.app.sessionManager && results) {
            try {
                const tuningSettings = { 
                    difficulty: this.currentSettings?.difficulty || config.defaultSettings?.difficulty 
                };
                
                // Map results to backend format
                const backendResults = {
                    score: results.score,
                    total: results.total,
                    item_results: (results.answers || []).map(answer => ({
                        ...answer,
                        item: answer.correctAnswer || answer.word || answer.item,
                        correct: answer.isCorrect
                    }))
                };
                
                await this.app.sessionManager.endActivity(
                    activityType,
                    backendResults,
                    tuningSettings
                );
            } catch (error) {
                console.error('[ActivityManager] Failed to save results to backend:', error);
                // Continue anyway - local score is saved
            }
        }
        
        // Send results via WebSocket for LLM summary
        if (this.app.wsClient && this.app.wsClient.isConnected() && results) {
            this.app.wsClient.send({
                type: 'exercise_complete',
                exercise_type: activityType,
                difficulty: this.currentSettings?.difficulty,
                score: results.score,
                total: results.total,
                percentage: results.percentage,
                answers: results.answers
            });
        }
        
        // Call custom shutdown hook if provided
        if (config.onShutdown) {
            await config.onShutdown(this, results);
        }
        
        // Emit shutdown event
        this.emit('shutdown', { activityType, results });
        
        // Clear current activity
        this.currentActivity = null;
        this.currentActivityType = null;
        this.currentSettings = null;
        
        console.log(`[ActivityManager] ${activityType} shutdown complete`);
    }
    
    /**
     * Get current activity type
     * @returns {string|null} Current activity type or null
     */
    getCurrentActivity() {
        return this.currentActivityType;
    }
    
    /**
     * Check if an activity is currently active
     * @param {string} activityType - Activity type to check
     * @returns {boolean} True if active
     */
    isActive(activityType) {
        return this.currentActivityType === activityType;
    }
    
    /**
     * Get activity configuration
     * @param {string} activityType - Activity type
     * @returns {Object|null} Activity config or null
     */
    getActivity(activityType) {
        return this.activities.get(activityType) || null;
    }
    
    /**
     * Get all registered activities
     * @returns {Array<Object>} Array of activity configs
     */
    getAllActivities() {
        return Array.from(this.activities.values());
    }
    
    /**
     * Get activity instances (exercise + UI)
     * @param {string} activityType - Activity type
     * @returns {Object|null} { exercise, ui } or null
     */
    getInstances(activityType) {
        return this.instances.get(activityType) || null;
    }
    
    /**
     * Create exercise and UI instances for an activity
     * @private
     * @param {string} activityType - Activity type
     * @param {Object} config - Activity configuration
     */
    _createInstances(activityType, config) {
        console.log(`[ActivityManager] Creating instances for ${activityType}`);
        
        // Create exercise instance
        const exercise = new config.exerciseClass(
            this.app.curriculumManager,
            this.app
        );
        
        // Create UI instance
        const ui = new config.uiClass(
            this.app,
            exercise
        );
        
        // Store instances
        this.instances.set(activityType, { exercise, ui });
    }
    
    /**
     * Check if all dependencies are available
     * @private
     * @param {Object} config - Activity configuration
     * @throws {Error} If dependencies are missing
     */
    _checkDependencies(config) {
        if (!config.dependencies || config.dependencies.length === 0) {
            return;
        }
        
        for (const dep of config.dependencies) {
            if (!this.app[dep]) {
                throw new Error(`Activity ${config.id} requires ${dep} but it's not available`);
            }
        }
    }
    
    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {ActivityManager} Returns this for chaining
     */
    on(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        }
        return this;
    }
    
    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {ActivityManager} Returns this for chaining
     */
    off(event, callback) {
        if (this.eventListeners[event]) {
            const index = this.eventListeners[event].indexOf(callback);
            if (index > -1) {
                this.eventListeners[event].splice(index, 1);
            }
        }
        return this;
    }
    
    /**
     * Emit an event
     * @private
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[ActivityManager] Error in event listener for ${event}:`, error);
                    this.emit('error', { event, error });
                }
            });
        }
    }
    
    /**
     * Destroy the manager and clean up
     */
    destroy() {
        // Shutdown current activity if any
        if (this.currentActivityType) {
            this.shutdown();
        }
        
        // Destroy all instances
        for (const [activityType, { exercise, ui }] of this.instances) {
            if (exercise && typeof exercise.destroy === 'function') {
                exercise.destroy();
            }
            if (ui && typeof ui.destroy === 'function') {
                ui.destroy();
            }
        }
        
        // Clear all data
        this.activities.clear();
        this.instances.clear();
        this.eventListeners = {
            'trigger': [],
            'build': [],
            'start': [],
            'shutdown': [],
            'error': []
        };
        
        console.log('[ActivityManager] Destroyed');
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActivityManager;
}
