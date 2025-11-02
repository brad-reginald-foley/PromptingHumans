/**
 * @fileoverview UI wrapper for Spelling exercise
 * @module SpellingUI
 * @requires SpellingExercise
 */

/**
 * UI handler for Spelling exercise
 * @class SpellingUI
 */
class SpellingUI {
    /**
     * Creates an instance of SpellingUI
     * @param {App} app - Main application instance
     * @param {SpellingExercise} exercise - Exercise instance
     */
    constructor(app, exercise) {
        this.app = app;
        this.exercise = exercise;
        
        // Bind WebSocket message handler
        this.handleWebSocketMessage = this.handleWebSocketMessage.bind(this);
        
        this.setupEventListeners();
        this.setupWebSocketListener();
    }
    
    /**
     * Setup UI event listeners
     * @private
     */
    setupEventListeners() {
        // Settings panel
        document.getElementById('spBackBtn')?.addEventListener('click', () => {
            this.app.showScreen('selectionScreen');
            this.app.updateExerciseCards();
        });
        
        document.getElementById('spStartBtn')?.addEventListener('click', () => {
            this.startExercise();
        });
        
        // Exercise panel
        document.getElementById('spSubmitBtn')?.addEventListener('click', () => {
            this.submitAnswer();
        });
        
        document.getElementById('spNextBtn')?.addEventListener('click', () => {
            this.nextQuestion();
        });
        
        // Input field enter key handler
        const spAnswerInput = document.getElementById('spAnswerInput');
        spAnswerInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const submitBtn = document.getElementById('spSubmitBtn');
                const nextBtn = document.getElementById('spNextBtn');
                
                if (!submitBtn.disabled) {
                    this.submitAnswer();
                } else if (nextBtn.style.display !== 'none') {
                    this.nextQuestion();
                }
            }
        });
    }
    
    /**
     * Show the exercise screen
     */
    async show() {
        this.app.showScreen('spellingScreen');
        
        // Default: Hide settings, prepare exercise panel
        document.getElementById('spSettingsPanel').style.display = 'none';
        document.getElementById('spExercisePanel').style.display = 'block';
        
        // Show loading state
        const questionText = document.getElementById('spQuestionText');
        questionText.textContent = 'Loading activity...';
        const input = document.getElementById('spAnswerInput');
        input.disabled = true;
        document.getElementById('spSubmitBtn').disabled = true;
        
        // Check for manual override
        const urlParams = new URLSearchParams(window.location.search);
        const forceSettings = urlParams.has('showSettings');
        
        // Only show settings if explicitly requested (dev mode or manual override)
        if (this.app.isDevMode || forceSettings) {
            document.getElementById('spSettingsPanel').style.display = 'block';
            document.getElementById('spExercisePanel').style.display = 'none';
            return;
        }
        
        // Otherwise: get backend recommendations and start
        const sessionManager = this.app.sessionManager;
        
        if (sessionManager && sessionManager.isBackendConnected()) {
            try {
                const recommendations = await sessionManager.startActivity('spelling');
                console.log('[Spelling] Backend recommendations:', recommendations);
                
                // Use backend-recommended settings
                const difficulty = recommendations.recommended_tuning?.difficulty || 'easy';
                const numQuestions = recommendations.recommended_tuning?.num_questions || 10;
                
                // Set the values in the UI (for consistency)
                document.getElementById('spDifficulty').value = difficulty;
                document.getElementById('spNumQuestions').value = numQuestions;
                
                // Show exercise chat panel
                this.showExerciseChat();
                
                // Start directly
                this.startExercise();
                return;
            } catch (error) {
                console.error('[Spelling] Failed to get backend recommendations:', error);
                // Fall through to show settings panel
            }
        }
        
        // Fallback: Show settings panel (backend unavailable or error)
        console.log('[Spelling] Showing settings panel (backend unavailable)');
        document.getElementById('spSettingsPanel').style.display = 'block';
        document.getElementById('spExercisePanel').style.display = 'none';
    }
    
    /**
     * Start the exercise
     * @private
     */
    startExercise() {
        const numQuestions = parseInt(document.getElementById('spNumQuestions').value);
        const difficulty = document.getElementById('spDifficulty').value;

        this.exercise.initialize(numQuestions, difficulty);

        document.getElementById('spSettingsPanel').style.display = 'none';
        document.getElementById('spExercisePanel').style.display = 'block';

        // Start activity chat widget
        if (this.app.activityChatWidget) {
            this.app.activityChatWidget.startActivity('spelling', difficulty);
        }

        this.displayQuestion();
    }
    
    /**
     * Display current question
     * @private
     */
    displayQuestion() {
        const question = this.exercise.getCurrentQuestion();
        if (!question) return;

        this.updateProgress();

        // Display the definition with capitalized first letter
        const capitalizedDefinition = this.capitalizeFirst(question.definition);
        document.getElementById('spQuestionText').innerHTML = `${capitalizedDefinition}: _______`;

        // Clear and focus the input
        const input = document.getElementById('spAnswerInput');
        input.value = '';
        input.classList.remove('correct', 'incorrect');
        input.disabled = false;
        input.focus();

        // Reset buttons and feedback
        document.getElementById('spSubmitBtn').disabled = false;
        document.getElementById('spNextBtn').style.display = 'none';
        document.getElementById('spFeedback').style.display = 'none';
        document.getElementById('spFeedback').className = 'feedback';
        document.getElementById('spInputFeedback').textContent = '';
    }
    
    /**
     * Submit answer
     * @private
     */
    submitAnswer() {
        const input = document.getElementById('spAnswerInput');
        const answer = input.value.trim();
        
        if (!answer) return;

        const isCorrect = this.exercise.submitAnswer(answer);
        const difficulty = this.exercise.difficulty;
        const behavior = SpellingExercise.DIFFICULTY_BEHAVIORS[difficulty];
        const question = this.exercise.getCurrentQuestion();
        
        this.showFeedback(isCorrect);
        
        // Send activity event based on difficulty
        if (!isCorrect && behavior && this.app.activityChatWidget) {
            if (behavior.feedbackTiming === 'immediate') {
                // Easy mode: immediate feedback
                this.app.activityChatWidget.sendActivityEvent('wrong_answer', {
                    question: question.definition,
                    userAnswer: answer,
                    correctAnswer: question.word,
                    difficulty: difficulty,
                    behavior: 'immediate_hint'
                });
            } else if (behavior.feedbackTiming === 'per_question') {
                // Medium mode: one hint
                this.app.activityChatWidget.sendActivityEvent('wrong_answer', {
                    question: question.definition,
                    userAnswer: answer,
                    correctAnswer: question.word,
                    difficulty: difficulty,
                    behavior: 'single_hint'
                });
            }
            // Hard mode: no immediate feedback (end_only)
        } else if (isCorrect && behavior && behavior.confirmCorrections && this.app.activityChatWidget) {
            // Confirm correct answers in easy/medium modes
            this.app.activityChatWidget.sendActivityEvent('correct_answer', {
                question: question.definition,
                answer: answer,
                difficulty: difficulty
            });
        }
        
        // Disable input and submit button
        input.disabled = true;
        document.getElementById('spSubmitBtn').disabled = true;
        
        // Show visual feedback on input
        input.classList.add(isCorrect ? 'correct' : 'incorrect');
        
        if (this.exercise.isComplete()) {
            setTimeout(() => {
                this.showResults();
            }, 2000);
        } else {
            document.getElementById('spNextBtn').style.display = 'inline-block';
        }
        
        document.getElementById('spScore').textContent = this.exercise.score;
    }
    
    /**
     * Show feedback for answer
     * @private
     * @param {boolean} isCorrect - Whether answer was correct
     */
    showFeedback(isCorrect) {
        const feedbackDiv = document.getElementById('spFeedback');
        const question = this.exercise.getCurrentQuestion();

        if (isCorrect) {
            feedbackDiv.className = 'feedback correct';
            feedbackDiv.innerHTML = '✓ Correct! Well spelled!';
        } else {
            feedbackDiv.className = 'feedback incorrect';
            feedbackDiv.innerHTML = `✗ Incorrect. The correct spelling is: <strong>${question.word}</strong>`;
        }

        feedbackDiv.style.display = 'block';
    }
    
    /**
     * Move to next question
     * @private
     */
    nextQuestion() {
        this.exercise.nextQuestion();
        this.displayQuestion();
    }
    
    /**
     * Update progress display
     * @private
     */
    updateProgress() {
        const progress = this.exercise.getProgress();
        
        document.getElementById('spCurrentQuestion').textContent = progress.current;
        document.getElementById('spTotalQuestions').textContent = progress.total;
        document.getElementById('spScore').textContent = progress.score;
        
        const progressFill = document.getElementById('spProgressFill');
        progressFill.style.width = `${progress.percentage}%`;
    }
    
    /**
     * Show results screen
     * @private
     */
    showResults() {
        const results = this.exercise.getResults();
        
        // Hide exercise chat
        this.hideExerciseChat();
        
        // End activity chat session
        if (this.app.activityChatWidget) {
            this.app.activityChatWidget.endActivity();
        }
        
        // Send activity_end event to backend
        if (this.app.wsClient && this.app.wsClient.isConnected()) {
            this.app.wsClient.send({
                type: 'activity_end',
                score: results.score,
                total: results.total
            });
            console.log('[BREADCRUMB][SP] Sent activity_end event');
        }
        
        this.app.showResults('spelling', results);
    }
    
    /**
     * Setup WebSocket message listener
     * @private
     */
    setupWebSocketListener() {
        if (this.app.wsClient) {
            this.app.wsClient.addMessageHandler(this.handleWebSocketMessage);
            console.log('[BREADCRUMB][SP] WebSocket listener added');
        }
    }
    
    /**
     * Handle incoming WebSocket messages
     * @private
     * @param {Object} message - WebSocket message
     */
    handleWebSocketMessage(message) {
        console.log('[BREADCRUMB][SP] WebSocket message received:', message.type);
        
        // Only handle activity-related messages
        if (message.type === 'activity_chat' && message.sender === 'agent') {
            console.log('[BREADCRUMB][SP] Displaying LLM response in embedded chat');
            this.sendChatMessage(message.message, 'agent');
        } else if (message.type === 'activity_hint') {
            console.log('[BREADCRUMB][SP] Displaying hint in embedded chat');
            this.sendChatMessage(`💡 ${message.hint}`, 'agent');
        } else if (message.type === 'activity_feedback') {
            console.log('[BREADCRUMB][SP] Displaying feedback in embedded chat');
            this.sendChatMessage(message.feedback, 'agent');
        }
    }
    
    /**
     * Show exercise chat panel
     * @private
     */
    showExerciseChat() {
        const chatPanel = document.getElementById('spChatPanel');
        if (chatPanel) {
            chatPanel.style.display = 'flex';
            document.body.classList.add('exercise-active');
        }
        
        // Set random activity helper avatar
        const avatarImg = document.getElementById('spAvatar');
        if (avatarImg) {
            const avatarNum = Math.floor(Math.random() * 10) + 1;
            const avatarNumStr = avatarNum.toString().padStart(2, '0');
            avatarImg.src = `agent_avatars/activity/${avatarNumStr}_pirate.svg`;
        }
        
        // Setup chat controls
        const sendBtn = document.getElementById('spChatSend');
        const input = document.getElementById('spChatInput');
        
        if (sendBtn) {
            sendBtn.onclick = () => this.sendUserMessage();
        }
        
        if (input) {
            input.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    this.sendUserMessage();
                }
            };
        }
    }
    
    /**
     * Hide exercise chat panel
     * @private
     */
    hideExerciseChat() {
        const chatPanel = document.getElementById('spChatPanel');
        if (chatPanel) {
            chatPanel.style.display = 'none';
            document.body.classList.remove('exercise-active');
        }
    }
    
    /**
     * Send a message to the exercise chat
     * @private
     * @param {string} message - Message text
     * @param {string} sender - 'agent' or 'student'
     */
    sendChatMessage(message, sender = 'agent') {
        if (sender === 'agent') {
            // Update agent bubble with latest message
            const agentBubble = document.getElementById('spAgentMessage');
            if (agentBubble) {
                agentBubble.textContent = message;
            }
        } else {
            // Update student bubble with latest message and show it
            const studentBubble = document.getElementById('spStudentMessage');
            if (studentBubble) {
                studentBubble.textContent = message;
                studentBubble.style.display = 'block';
            }
        }
    }
    
    /**
     * Send user message from input
     * @private
     */
    sendUserMessage() {
        console.log('[BREADCRUMB][SP] sendUserMessage() called');
        const input = document.getElementById('spChatInput');
        if (!input) {
            console.log('[BREADCRUMB][SP] ERROR: Input element not found');
            return;
        }
        
        const message = input.value.trim();
        console.log('[BREADCRUMB][SP] Message:', message);
        if (!message) {
            console.log('[BREADCRUMB][SP] Empty message, returning');
            return;
        }
        
        console.log('[BREADCRUMB][SP] Adding message to chat UI');
        this.sendChatMessage(message, 'student');
        input.value = '';
        
        // Send to backend via WebSocket if available
        if (this.app.wsClient && this.app.wsClient.isConnected()) {
            console.log('[BREADCRUMB][SP] Sending to backend via WebSocket');
            this.app.wsClient.sendActivityChat(message);
        } else {
            console.log('[BREADCRUMB][SP] ERROR: WebSocket not connected');
        }
    }
    
    /**
     * Send activity event to backend
     * @private
     * @param {string} event - Event type (e.g., 'wrong_answer', 'correct_answer')
     * @param {Object} context - Event context data
     */
    sendActivityEvent(event, context) {
        if (this.app.wsClient && this.app.wsClient.isConnected()) {
            this.app.wsClient.sendActivityEvent(event, context);
        }
    }
    
    /**
     * Capitalize first letter of string
     * @private
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpellingUI;
}
