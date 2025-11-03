/**
 * BubblePopUI.js
 * UI integration for Bubble Pop game
 */

class BubblePopUI {
    constructor(app, bubblePopExercise) {
        this.app = app;
        this.exercise = bubblePopExercise;
        this.canvas = null;
        this.isInstructionsShown = false;
        this.lastSettings = null; // Store last used settings for retry
    }
    
    /**
     * Initialize UI elements
     */
    initialize() {
        // Get canvas element
        this.canvas = document.getElementById('bpCanvas');
        
        if (!this.canvas) {
            console.error('Bubble Pop canvas not found');
            return false;
        }
        
        // Setup event listeners for UI controls
        this.setupUIListeners();
        
        // Setup exercise event listeners
        this.setupExerciseListeners();
        
        return true;
    }
    
    /**
     * Setup UI event listeners
     */
    setupUIListeners() {
        // Back button
        const backBtn = document.getElementById('bpBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.handleBack();
            });
        }
        
        // Start button
        const startBtn = document.getElementById('bpStartBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.startGame();
            });
        }
        
        // Pause button (during game)
        const pauseBtn = document.getElementById('bpPauseBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.pauseGame();
            });
        }
        
        // Instructions button
        const instructionsBtn = document.getElementById('bpInstructionsBtn');
        if (instructionsBtn) {
            instructionsBtn.addEventListener('click', () => {
                this.toggleInstructions();
            });
        }
        
        // Instructions overlay close
        const closeInstructions = document.getElementById('bpCloseInstructions');
        if (closeInstructions) {
            closeInstructions.addEventListener('click', () => {
                this.hideInstructions();
            });
        }
        
        // Pause chat send button
        const pauseChatSend = document.getElementById('bpPauseChatSend');
        if (pauseChatSend) {
            pauseChatSend.addEventListener('click', () => {
                this.sendPauseChatMessage();
            });
        }
        
        // Pause chat input (Enter key)
        const pauseChatInput = document.getElementById('bpPauseChatInput');
        if (pauseChatInput) {
            pauseChatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendPauseChatMessage();
                }
            });
        }
        
        // Play button (in pause overlay)
        const playBtn = document.getElementById('bpPlayBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.resumeGame();
            });
        }
    }
    
    /**
     * Setup exercise event listeners
     */
    setupExerciseListeners() {
        // Score updates
        this.exercise.on('scoreUpdate', (data) => {
            this.updateScoreDisplay(data);
        });
        
        // Time updates
        this.exercise.on('timeUpdate', (data) => {
            this.updateTimeDisplay(data);
        });
        
        // State changes
        this.exercise.on('stateChange', (data) => {
            this.handleStateChange(data);
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
                    const agentBubble = document.getElementById('bpPauseAgentMessage');
                    if (agentBubble) {
                        agentBubble.textContent = message.message;
                    }
                }
            });
        }
    }
    
    /**
     * Show the bubble pop screen
     * Settings are now passed from ActivityManager via trigger()
     * Exercise is already initialized by ActivityManager, so we just display it
     */
    async show() {
        this.app.showScreen('bubblePopScreen');
        
        // Ensure canvas is available (needed for canvas-based activities)
        if (!this.canvas) {
            this.canvas = document.getElementById('bpCanvas');
            if (!this.canvas) {
                console.error('[BubblePop] Canvas element not found!');
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
        
        // Otherwise: Use settings from ActivityManager (already set by app.js)
        // Get settings from ActivityManager's currentSettings
        const settings = this.app.activityManager.currentSettings || {
            duration: 60,
            difficulty: 'easy',
            spellingErrorRate: 30
        };
        
        console.log('[BubblePop] Using ActivityManager settings:', settings);
        
        // Store settings for the game
        this.lastSettings = settings;
        
        // Set the values in the UI (for consistency)
        const durationEl = document.getElementById('bpDuration');
        const difficultyEl = document.getElementById('bpDifficulty');
        const errorRateEl = document.getElementById('bpErrorRate');
        
        if (durationEl) durationEl.value = settings.duration;
        if (difficultyEl) difficultyEl.value = settings.difficulty;
        if (errorRateEl) errorRateEl.value = settings.spellingErrorRate || settings.spelling_error_rate || 30;
        
        // Start directly with ActivityManager settings
        await this.startGame();
    }
    
    /**
     * Show settings panel
     */
    showSettingsPanel() {
        const settingsPanel = document.getElementById('bpSettingsPanel');
        const gamePanel = document.getElementById('bpGamePanel');
        
        if (settingsPanel) settingsPanel.style.display = 'block';
        if (gamePanel) gamePanel.style.display = 'none';
        
        // Restore last settings if available
        if (this.lastSettings) {
            this.restoreSettingsToUI(this.lastSettings);
        }
        
        // Show instructions by default
        this.showInstructions();
    }
    
    /**
     * Show game panel
     */
    showGamePanel() {
        const settingsPanel = document.getElementById('bpSettingsPanel');
        const gamePanel = document.getElementById('bpGamePanel');
        
        if (settingsPanel) settingsPanel.style.display = 'none';
        if (gamePanel) gamePanel.style.display = 'block';
    }
    
    /**
     * Start the game
     */
    async startGame() {
        console.log('[BubblePop][UI] 🎮 startGame() called');
        
        // Get settings from UI or use last settings if available
        const settings = this.lastSettings || this.getSettingsFromUI();
        
        // Store settings for retry
        this.lastSettings = settings;
        
        // Hide instructions
        this.hideInstructions();
        
        // Show game panel
        this.showGamePanel();
        
        // Initialize the exercise with canvas and settings
        await this.exercise.initializeGame(this.canvas, settings);
        console.log('[BubblePop][UI] Exercise initialized - state:', this.exercise.state);
        
        // Initialize pause chat avatar
        this.initializePauseChatAvatar();
        
        // Send activity_start event to backend to create activity agent
        this.sendActivityStart(settings);
        
        // Show pause overlay immediately (game starts paused)
        const pauseOverlay = document.getElementById('bpPauseOverlay');
        if (pauseOverlay) {
            pauseOverlay.style.display = 'flex';
            // Update button text to "Play" for initial state
            const playBtn = document.getElementById('bpPlayBtn');
            if (playBtn) playBtn.textContent = 'Play';
            console.log('[BubblePop][UI] ✅ Pause overlay shown - waiting for user to click Play');
        }
        
        // DON'T start the exercise yet - wait for user to click "Play"
        // this.exercise.start(); // REMOVED - will be called from resume button
        console.log('[BubblePop][UI] ✅ startGame() complete - game in INITIALIZED state, NOT started');
    }
    
    /**
     * Send activity_start event to backend
     */
    sendActivityStart(settings) {
        if (this.app.wsClient && this.app.wsClient.isConnected()) {
            this.app.wsClient.send({
                type: 'activity_start',
                activity: 'bubble_pop',
                difficulty: settings.difficulty
            });
            console.log('[BubblePop] Sent activity_start event');
        }
    }
    
    /**
     * Initialize pause chat avatar
     */
    initializePauseChatAvatar() {
        const avatarEl = document.getElementById('bpPauseAvatar');
        if (avatarEl && this.app.curriculum) {
            // Get activity number for bubble pop (activity 4)
            const activityNum = 4;
            const theme = this.app.curriculum.theme || 'pirate';
            const avatarPath = `agent_avatars/activity/${activityNum.toString().padStart(2, '0')}_${theme}.svg`;
            avatarEl.src = avatarPath;
        }
    }
    
    /**
     * Send pause chat message
     */
    sendPauseChatMessage() {
        const input = document.getElementById('bpPauseChatInput');
        const agentBubble = document.getElementById('bpPauseAgentMessage');
        const studentBubble = document.getElementById('bpPauseStudentMessage');
        
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
     * Get settings from UI controls
     */
    getSettingsFromUI() {
        const duration = parseInt(document.getElementById('bpDuration')?.value || 60);
        const difficulty = document.getElementById('bpDifficulty')?.value || 'easy';
        const spellingErrorRate = parseInt(document.getElementById('bpErrorRate')?.value || 30);
        
        return {
            duration,
            difficulty,
            spellingErrorRate
        };
    }
    
    /**
     * Restore settings to UI controls
     */
    restoreSettingsToUI(settings) {
        const durationEl = document.getElementById('bpDuration');
        const difficultyEl = document.getElementById('bpDifficulty');
        const errorRateEl = document.getElementById('bpErrorRate');
        const errorRateValueEl = document.getElementById('bpErrorRateValue');
        
        if (durationEl) durationEl.value = settings.duration;
        if (difficultyEl) difficultyEl.value = settings.difficulty;
        if (errorRateEl) errorRateEl.value = settings.spellingErrorRate;
        if (errorRateValueEl) errorRateValueEl.textContent = settings.spellingErrorRate + '%';
    }
    
    /**
     * Pause the game
     */
    pauseGame() {
        console.log('[BubblePop][UI] ⏸️  pauseGame() called - current state:', this.exercise.state);
        if (this.exercise.state === 'active') {
            this.exercise.pause();
            console.log('[BubblePop][UI] ✅ Pause requested');
        } else {
            console.log('[BubblePop][UI] ⚠️  Cannot pause - game not active');
        }
    }
    
    /**
     * Resume the game
     */
    resumeGame() {
        console.log('[BubblePop][UI] ▶️  resumeGame() called - current state:', this.exercise.state);
        
        // Handle different states
        if (this.exercise.state === 'initialized' || this.exercise.state === 'ready') {
            // Game hasn't started yet - start it for the first time
            console.log('[BubblePop][UI] Starting game for first time...');
            this.exercise.start();
            // Update button text for future pauses
            const playBtn = document.getElementById('bpPlayBtn');
            if (playBtn) playBtn.textContent = 'Resume';
            console.log('[BubblePop][UI] ✅ Game started');
        } else if (this.exercise.state === 'paused') {
            // Resume from pause
            console.log('[BubblePop][UI] Resuming paused game...');
            this.exercise.resume();
            console.log('[BubblePop][UI] ✅ Game resumed');
        } else if (this.exercise.state === 'active') {
            // Already active - this shouldn't happen but handle it gracefully
            console.log('[BubblePop][UI] ⚠️  Game already active, hiding overlay');
            const pauseOverlay = document.getElementById('bpPauseOverlay');
            if (pauseOverlay) pauseOverlay.style.display = 'none';
        } else {
            console.log('[BubblePop][UI] ⚠️  Unexpected state:', this.exercise.state);
        }
    }
    
    
    /**
     * Handle back button
     */
    handleBack() {
        if (this.exercise.state === 'active' || this.exercise.state === 'paused') {
            if (confirm('Are you sure you want to quit the game?')) {
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
     * Toggle instructions display
     */
    toggleInstructions() {
        if (this.isInstructionsShown) {
            this.hideInstructions();
        } else {
            this.showInstructions();
        }
    }
    
    /**
     * Show instructions
     */
    showInstructions() {
        const overlay = document.getElementById('bpInstructionsOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            this.isInstructionsShown = true;
        }
    }
    
    /**
     * Hide instructions
     */
    hideInstructions() {
        const overlay = document.getElementById('bpInstructionsOverlay');
        if (overlay) {
            overlay.style.display = 'none';
            this.isInstructionsShown = false;
        }
    }
    
    /**
     * Update score display
     */
    updateScoreDisplay(data) {
        const rightEl = document.getElementById('bpScoreRight');
        const wrongEl = document.getElementById('bpScoreWrong');
        const missedEl = document.getElementById('bpScoreMissed');
        
        if (rightEl) rightEl.textContent = data.right;
        if (wrongEl) wrongEl.textContent = data.wrong;
        if (missedEl) missedEl.textContent = data.missed;
    }
    
    /**
     * Update time display
     */
    updateTimeDisplay(data) {
        const timeEl = document.getElementById('bpTimeRemaining');
        if (timeEl) {
            const minutes = Math.floor(data.remaining / 60);
            const seconds = data.remaining % 60;
            timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    /**
     * Handle state changes
     */
    handleStateChange(data) {
        console.log('[BubblePop][UI] 🔄 State change:', data.oldState, '→', data.newState);
        
        const pauseOverlay = document.getElementById('bpPauseOverlay');
        
        if (data.newState === 'paused') {
            // Show pause overlay
            console.log('[BubblePop][UI] Showing pause overlay');
            if (pauseOverlay) pauseOverlay.style.display = 'flex';
        } else if (data.newState === 'active') {
            // Hide pause overlay when game becomes active (from any state)
            console.log('[BubblePop][UI] Hiding pause overlay - game is ACTIVE');
            if (pauseOverlay) pauseOverlay.style.display = 'none';
        }
    }
    
    /**
     * Handle exercise completion
     */
    handleComplete(results) {
        console.log('[BubblePop][UI] 🏁 handleComplete() called');
        
        // Get settings for database save
        const settings = this.lastSettings || this.getSettingsFromUI();
        
        // Send detailed results to tutor agent (NOT activity agent)
        this.sendResultsToTutor(results, settings);
        
        // Show "Game Over!" message on canvas
        this.showGameOverMessage();
        
        // Keep pause overlay visible for student to chat with tutor
        const pauseOverlay = document.getElementById('bpPauseOverlay');
        if (pauseOverlay) {
            pauseOverlay.style.display = 'flex';
            
            // IMPORTANT: Remove ALL existing event listeners from Play button
            const playBtn = document.getElementById('bpPlayBtn');
            if (playBtn) {
                // Clone the button to remove all event listeners
                const newPlayBtn = playBtn.cloneNode(true);
                playBtn.parentNode.replaceChild(newPlayBtn, playBtn);
                
                // Now add the single new event listener
                newPlayBtn.textContent = 'Back to Menu';
                newPlayBtn.addEventListener('click', () => {
                    console.log('[BubblePop][UI] Back to Menu clicked - saving results to database');
                    
                    // CRITICAL: Save results to database (like other activities do)
                    // This triggers backend save, unlock checks, and progression
                    this.app.showResults('bubble_pop', results);
                });
            }
        }
        
        console.log('[BubblePop][UI] ✅ handleComplete() finished');
    }
    
    /**
     * Send results to tutor agent
     */
    sendResultsToTutor(results, settings) {
        if (this.app.wsClient && this.app.wsClient.isConnected()) {
            this.app.wsClient.send({
                type: 'activity_complete_summary',
                activity: 'bubble_pop',
                results: {
                    score: results.gameScore.right,
                    wrong: results.gameScore.wrong,
                    missed: results.gameScore.missed,
                    total: results.bubbleCount,
                    difficulty: settings.difficulty,
                    timeSpent: results.timeSpent,
                    percentage: results.percentage
                }
            });
            console.log('[BubblePop] Sent results to tutor agent');
        }
    }
    
    /**
     * Show "Game Over!" message on canvas
     */
    showGameOverMessage() {
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;
        
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // "Game Over!" text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Game Over!', this.canvas.width / 2, this.canvas.height / 2);
        
        // Score summary
        const results = this.exercise.getResults();
        ctx.font = '24px Arial';
        ctx.fillText(
            `Score: ${results.gameScore.right}/${results.bubbleCount}`,
            this.canvas.width / 2,
            this.canvas.height / 2 + 50
        );
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
        document.getElementById('finalScore').textContent = results.gameScore.right;
        document.getElementById('finalTotal').textContent = results.bubbleCount;
        document.getElementById('percentage').textContent = `${results.percentage}%`;
        document.getElementById('resultsMessage').textContent = results.message;
        
        // Create summary for bubble pop
        const summaryList = document.getElementById('resultsSummary');
        summaryList.innerHTML = `
            <li class="result-item">
                <strong>Correct:</strong> ${results.gameScore.right} bubbles
            </li>
            <li class="result-item">
                <strong>Wrong:</strong> ${results.gameScore.wrong} bubbles
            </li>
            <li class="result-item">
                <strong>Missed:</strong> ${results.gameScore.missed} bubbles
            </li>
            <li class="result-item">
                <strong>Total Bubbles:</strong> ${results.bubbleCount}
            </li>
            <li class="result-item">
                <strong>Time Played:</strong> ${results.timeSpent} seconds
            </li>
            <li class="result-item">
                <strong>Accuracy:</strong> ${results.percentage}%
            </li>
        `;
        
        // Store current exercise type for retry
        this.app.currentExerciseType = 'bubble_pop';
        
        // Show results screen
        this.app.showScreen('resultsScreen');
    }
    
    /**
     * Reset displays
     */
    resetDisplays() {
        // Reset scores
        const rightEl = document.getElementById('bpScoreRight');
        const wrongEl = document.getElementById('bpScoreWrong');
        const missedEl = document.getElementById('bpScoreMissed');
        
        if (rightEl) rightEl.textContent = '0';
        if (wrongEl) wrongEl.textContent = '0';
        if (missedEl) missedEl.textContent = '0';
        
        // Reset time
        const timeEl = document.getElementById('bpTimeRemaining');
        if (timeEl) timeEl.textContent = '1:00';
        
        // Reset settings to defaults
        const durationEl = document.getElementById('bpDuration');
        const difficultyEl = document.getElementById('bpDifficulty');
        const errorRateEl = document.getElementById('bpErrorRate');
        
        if (durationEl) durationEl.value = '60';
        if (difficultyEl) difficultyEl.value = 'easy';
        if (errorRateEl) errorRateEl.value = '30';
        
        // Update range displays
        this.updateRangeDisplays();
    }
    
    /**
     * Update range slider displays
     */
    updateRangeDisplays() {
        const errorRateValue = document.getElementById('bpErrorRateValue');
        const errorRateSlider = document.getElementById('bpErrorRate');
        
        if (errorRateValue && errorRateSlider) {
            errorRateValue.textContent = errorRateSlider.value + '%';
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BubblePopUI;
}
