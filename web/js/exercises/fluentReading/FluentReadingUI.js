/**
 * FluentReadingUI.js
 * UI integration for Fluent Reading exercise
 */

class FluentReadingUI {
    constructor(app, fluentReadingExercise) {
        this.app = app;
        this.exercise = fluentReadingExercise;
        this.canvas = null;
        this.lastSettings = null;
    }
    
    /**
     * Initialize UI elements
     */
    initialize() {
        // Get canvas element
        this.canvas = document.getElementById('frCanvas');
        
        if (!this.canvas) {
            console.error('Fluent Reading canvas not found');
            return false;
        }
        
        // Setup event listeners
        this.setupUIListeners();
        this.setupExerciseListeners();
        
        return true;
    }
    
    /**
     * Setup UI event listeners
     */
    setupUIListeners() {
        // Back button
        const backBtn = document.getElementById('frBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.handleBack());
        }
        
        // Start button
        const startBtn = document.getElementById('frStartBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startReading());
        }
        
        // Quit button
        const quitBtn = document.getElementById('frQuitBtn');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => this.quitReading());
        }
        
        // Speed slider
        const speedSlider = document.getElementById('frSpeed');
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                this.updateSpeedDisplay(e.target.value);
            });
        }
        
        // Pause chat send button
        const pauseChatSend = document.getElementById('frPauseChatSend');
        if (pauseChatSend) {
            pauseChatSend.addEventListener('click', () => {
                this.sendPauseChatMessage();
            });
        }
        
        // Pause chat input (Enter key)
        const pauseChatInput = document.getElementById('frPauseChatInput');
        if (pauseChatInput) {
            pauseChatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendPauseChatMessage();
                }
            });
        }
    }
    
    /**
     * Setup exercise event listeners
     */
    setupExerciseListeners() {
        // Time updates
        this.exercise.on('timeUpdate', (data) => {
            this.updateTimeDisplay(data);
        });
        
        // State changes
        this.exercise.on('stateChange', (data) => {
            this.handleStateChange(data);
        });
        
        // Pause/Resume
        this.exercise.on('pause', () => {
            this.handlePause();
        });
        
        this.exercise.on('resume', () => {
            this.handleResume();
        });
        
        // Exercise complete
        this.exercise.on('complete', (results) => {
            this.handleComplete(results);
        });
    }
    
    /**
     * Show the fluent reading screen
     * Settings are now passed from ActivityManager via trigger()
     * Exercise is already initialized by ActivityManager, so we just display it
     */
    async show() {
        this.app.showScreen('fluentReadingScreen');
        
        // Ensure canvas is available (needed for canvas-based activities)
        if (!this.canvas) {
            this.canvas = document.getElementById('frCanvas');
            if (!this.canvas) {
                console.error('[FluentReading] Canvas element not found!');
                return;
            }
        }
        
        // Check for manual override
        const urlParams = new URLSearchParams(window.location.search);
        const forceSettings = urlParams.has('showSettings');
        
        // Only show settings if explicitly requested (dev mode or manual override)
        if (this.app.isDevMode || forceSettings) {
            this.showSettingsPanel();
            this.resetDisplays();
            return;
        }
        
        // Otherwise: Use settings from ActivityManager
        // Get settings from ActivityManager's currentSettings
        const settings = this.app.activityManager.currentSettings || {
            speed: 150,
            difficulty: 'medium'
        };
        
        console.log('[FluentReading] Using ActivityManager settings:', settings);
        
        // Store settings
        this.lastSettings = settings;
        
        // Set the values in the UI (for consistency)
        const speedSlider = document.getElementById('frSpeed');
        const difficultySelect = document.getElementById('frDifficulty');
        
        if (speedSlider) {
            speedSlider.value = settings.speed;
            this.updateSpeedDisplay(settings.speed);
        }
        if (difficultySelect) {
            difficultySelect.value = settings.difficulty;
        }
        
        // Show game panel
        this.showGamePanel();
        
        // Initialize the exercise with canvas and settings
        await this.exercise.initializeGame(this.canvas, settings);
        
        // Initialize pause chat avatar
        this.initializePauseChatAvatar();
        
        // Start activity chat widget with correct difficulty
        if (this.app.activityChatWidget) {
            this.app.activityChatWidget.startActivity('fluent_reading', settings.difficulty);
        }
        
        // Start the exercise
        this.exercise.start();
    }
    
    /**
     * Show settings panel
     */
    showSettingsPanel() {
        const settingsPanel = document.getElementById('frSettingsPanel');
        const gamePanel = document.getElementById('frGamePanel');
        
        if (settingsPanel) settingsPanel.style.display = 'block';
        if (gamePanel) gamePanel.style.display = 'none';
        
        // Restore last settings if available
        if (this.lastSettings) {
            this.restoreSettingsToUI(this.lastSettings);
        } else {
            // Set default speed
            const speedSlider = document.getElementById('frSpeed');
            if (speedSlider) {
                speedSlider.value = 150;
                this.updateSpeedDisplay(150);
            }
        }
    }
    
    /**
     * Show game panel
     */
    showGamePanel() {
        const settingsPanel = document.getElementById('frSettingsPanel');
        const gamePanel = document.getElementById('frGamePanel');
        
        if (settingsPanel) settingsPanel.style.display = 'none';
        if (gamePanel) gamePanel.style.display = 'block';
    }
    
    /**
     * Update speed display
     */
    updateSpeedDisplay(speed) {
        const speedValue = document.getElementById('frSpeedValue');
        if (speedValue) {
            speedValue.textContent = `${speed} WPM`;
        }
        
        // Update estimated time
        this.updateEstimatedTime(speed);
    }
    
    /**
     * Update estimated time based on speed
     */
    updateEstimatedTime(speed) {
        const timeEstimate = document.getElementById('frTimeEstimate');
        if (!timeEstimate) return;
        
        // Get total words from narrative (approximate)
        const totalWords = 250; // This will be updated when exercise initializes
        const minutes = Math.ceil(totalWords / speed);
        const timerMinutes = minutes * 2; // Timer is 2x predicted time
        
        timeEstimate.textContent = `Estimated reading time: ${minutes} minute${minutes !== 1 ? 's' : ''} (Timer: ${timerMinutes} minutes)`;
    }
    
    /**
     * Start the reading exercise
     */
    async startReading() {
        // Get settings from UI
        const settings = this.getSettingsFromUI();
        this.lastSettings = settings;
        
        // Show game panel
        this.showGamePanel();
        
        // Initialize and start the exercise
        await this.exercise.initializeGame(this.canvas, settings);
        
        // Initialize pause chat avatar
        this.initializePauseChatAvatar();

        // CRITICAL: Update ActivityManager's currentSettings so it knows the actual difficulty
        // This ensures the correct difficulty is recorded when the activity ends
        if (this.app.activityManager) {
            this.app.activityManager.currentSettings = settings;
            console.log('[FluentReading] Updated ActivityManager settings:', this.app.activityManager.currentSettings);
        }

        // Start activity chat widget
        if (this.app.activityChatWidget) {
            this.app.activityChatWidget.startActivity('fluent_reading', settings.difficulty);
        }

        // Update time estimate with actual word count
        const totalWords = this.exercise.totalWords;
        const minutes = Math.ceil(totalWords / settings.speed);
        console.log(`Starting Fluent Reading: ${totalWords} words at ${settings.speed} WPM (~${minutes} minutes)`);
        
        this.exercise.start();
    }
    
    /**
     * Initialize pause chat avatar
     */
    initializePauseChatAvatar() {
        const avatarEl = document.getElementById('frPauseAvatar');
        if (avatarEl && this.app.curriculum) {
            // Get activity number for fluent reading (activity 5)
            const activityNum = 5;
            const theme = this.app.curriculum.theme || 'pirate';
            const avatarPath = `agent_avatars/activity/${activityNum.toString().padStart(2, '0')}_${theme}.svg`;
            avatarEl.src = avatarPath;
        }
    }
    
    /**
     * Send pause chat message
     */
    sendPauseChatMessage() {
        const input = document.getElementById('frPauseChatInput');
        const agentBubble = document.getElementById('frPauseAgentMessage');
        const studentBubble = document.getElementById('frPauseStudentMessage');
        
        if (!input || !agentBubble) return;
        
        const message = input.value.trim();
        if (!message) return;
        
        // Show student message
        if (studentBubble) {
            studentBubble.textContent = message;
            studentBubble.style.display = 'block';
        }
        
        // Clear input
        input.value = '';
        
        // Show loading state
        agentBubble.textContent = 'Thinking...';
        
        // Send to backend via WebSocket
        if (this.app.wsClient && this.app.wsClient.isConnected()) {
            this.app.wsClient.sendActivityChat(message);
        } else {
            // Fallback if WebSocket not connected
            agentBubble.textContent = "I'm here to help! What would you like to know?";
        }
    }
    
    /**
     * Setup exercise event listeners
     */
    setupExerciseListeners() {
        // Time updates
        this.exercise.on('timeUpdate', (data) => {
            this.updateTimeDisplay(data);
        });
        
        // State changes
        this.exercise.on('stateChange', (data) => {
            this.handleStateChange(data);
        });
        
        // Pause/Resume
        this.exercise.on('pause', () => {
            this.handlePause();
        });
        
        this.exercise.on('resume', () => {
            this.handleResume();
        });
        
        // Exercise complete
        this.exercise.on('complete', (results) => {
            this.handleComplete(results);
        });
        
        // Setup WebSocket listener for pause chat
        this.setupWebSocketListener();
    }
    
    /**
     * Setup WebSocket listener for pause chat responses
     */
    setupWebSocketListener() {
        if (this.app.wsClient) {
            this.app.wsClient.addMessageHandler((message) => {
                if (message.type === 'activity_chat' && message.sender === 'agent') {
                    const agentBubble = document.getElementById('frPauseAgentMessage');
                    if (agentBubble) {
                        agentBubble.textContent = message.message;
                    }
                }
            });
        }
    }
    
    /**
     * Quit the reading exercise
     */
    quitReading() {
        if (confirm('Are you sure you want to quit the reading exercise?')) {
            this.exercise.end();
            this.showSettingsPanel();
        }
    }
    
    /**
     * Handle back button
     */
    handleBack() {
        if (this.exercise.state === 'active' || this.exercise.state === 'paused') {
            if (confirm('Are you sure you want to quit the reading exercise?')) {
                this.exercise.end();
                this.app.showScreen('selectionScreen');
                this.app.updateExerciseCards();
            }
        } else {
            this.app.showScreen('selectionScreen');
            this.app.updateExerciseCards();
        }
    }
    
    /**
     * Update time display
     */
    updateTimeDisplay(data) {
        // Time is displayed in canvas header
    }
    
    /**
     * Handle state changes
     */
    handleStateChange(data) {
        console.log('State changed:', data);
    }
    
    /**
     * Handle pause
     */
    handlePause() {
        console.log('Reading paused');
        // Show pause overlay
        const pauseOverlay = document.getElementById('frPauseOverlay');
        if (pauseOverlay) pauseOverlay.style.display = 'flex';
    }
    
    /**
     * Handle resume
     */
    handleResume() {
        console.log('Reading resumed');
        // Hide pause overlay
        const pauseOverlay = document.getElementById('frPauseOverlay');
        if (pauseOverlay) pauseOverlay.style.display = 'none';
    }
    
    /**
     * Handle exercise completion
     */
    handleComplete(results) {
        // Record score
        const settings = this.lastSettings || this.getSettingsFromUI();
        
        // Use completion rate as the score
        this.app.scoreManager.recordScore(
            'fluent_reading',
            settings.speed, // Use speed as difficulty
            results.completionRate,
            100 // Out of 100%
        );
        
        // Send metacognitive prompts to activity chat
        if (this.app.activityChatWidget) {
            const behavior = FluentReadingExercise.DIFFICULTY_BEHAVIORS[settings.difficulty];
            if (behavior && behavior.metacognitivePrompts) {
                // Send completion event with prompts
                this.app.activityChatWidget.sendActivityEvent('activity_complete', {
                    activity: 'fluent_reading',
                    difficulty: settings.difficulty,
                    completionRate: results.completionRate,
                    wordsRead: results.wordsRead,
                    totalWords: results.totalWords,
                    prompts: behavior.prompts
                });
            }
        }
        
        // Show results
        this.showResults(results);
    }
    
    /**
     * Show results screen
     */
    showResults(results) {
        // End activity chat session
        if (this.app.activityChatWidget) {
            this.app.activityChatWidget.endActivity();
        }
        
        // Update results display
        document.getElementById('finalScore').textContent = results.completionRate || 0;
        document.getElementById('finalTotal').textContent = '100';
        
        const percentage = results.completionRate || 0;
        document.getElementById('percentage').textContent = `${percentage}%`;
        
        // Generate message
        let message = '';
        if (percentage >= 100) {
            message = 'Excellent! You completed the entire passage!';
        } else if (percentage >= 75) {
            message = 'Great job! You read most of the passage.';
        } else if (percentage >= 50) {
            message = 'Good effort! Keep practicing to improve your reading speed.';
        } else {
            message = 'Keep practicing! Reading fluency improves with time.';
        }
        document.getElementById('resultsMessage').textContent = message;
        
        // Create summary
        const summaryList = document.getElementById('resultsSummary');
        summaryList.innerHTML = `
            <li class="result-item">
                <strong>Words Read:</strong> ${results.wordsRead || 0}
            </li>
            <li class="result-item">
                <strong>Total Words:</strong> ${results.totalWords || 0}
            </li>
            <li class="result-item">
                <strong>Completion Rate:</strong> ${percentage}%
            </li>
            <li class="result-item">
                <strong>Average Speed:</strong> ${results.averageWPM || 0} WPM
            </li>
            <li class="result-item">
                <strong>Target Speed:</strong> ${this.lastSettings?.speed || 150} WPM
            </li>
        `;
        
        // Store exercise type for retry
        this.app.currentExerciseType = 'fluent_reading';
        
        // Show results screen
        this.app.showScreen('resultsScreen');
    }
    
    /**
     * Reset displays
     */
    resetDisplays() {
        // Reset speed to default if no last settings
        const speedSlider = document.getElementById('frSpeed');
        if (speedSlider && !this.lastSettings) {
            speedSlider.value = 150;
            this.updateSpeedDisplay(150);
        }
    }
    
    /**
     * Clean up
     */
    destroy() {
        if (this.exercise) {
            this.exercise.destroy();
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FluentReadingUI;
}
