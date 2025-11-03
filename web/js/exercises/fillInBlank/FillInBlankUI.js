/**
 * @fileoverview UI wrapper for Fill in the Blank exercise
 * @module FillInBlankUI
 * @requires FillInBlankExercise
 */

/**
 * UI handler for Fill in the Blank exercise
 * @class FillInBlankUI
 */
class FillInBlankUI {
    /**
     * Creates an instance of FillInBlankUI
     * @param {App} app - Main application instance
     * @param {FillInBlankExercise} exercise - Exercise instance
     */
    constructor(app, exercise) {
        this.app = app;
        this.exercise = exercise;
        this.draggedWord = null;
        
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
        document.getElementById('fibBackBtn')?.addEventListener('click', () => {
            this.app.showScreen('selectionScreen');
            this.app.updateExerciseCards();
        });
        
        document.getElementById('fibStartBtn')?.addEventListener('click', () => {
            this.startExercise();
        });
        
        // Exercise panel
        document.getElementById('fibCheckBtn')?.addEventListener('click', () => {
            this.checkAnswers();
        });
    }
    
    /**
     * Show the exercise screen
     * Settings are now passed from ActivityManager via trigger()
     * Exercise is already initialized by ActivityManager, so we just display it
     */
    async show() {
        this.app.showScreen('fillInBlankScreen');
        
        // Check for manual override (dev mode)
        const urlParams = new URLSearchParams(window.location.search);
        const forceSettings = urlParams.has('showSettings');
        
        // Only show settings if explicitly requested (dev mode or manual override)
        if (this.app.isDevMode || forceSettings) {
            document.getElementById('fibSettingsPanel').style.display = 'block';
            document.getElementById('fibExercisePanel').style.display = 'none';
            return;
        }
        
        // Otherwise: Exercise is already initialized by ActivityManager
        // Get settings from ActivityManager's currentSettings
        const settings = this.app.activityManager.currentSettings || {
            difficulty: 'easy',
            numQuestions: 10
        };
        
        console.log('[FillInBlank] Using ActivityManager settings:', settings);
        
        // Set the values in the UI (for consistency)
        document.getElementById('fibDifficulty').value = settings.difficulty;
        document.getElementById('fibNumQuestions').value = settings.numQuestions || settings.num_questions || 10;
        
        // Prepare exercise panel
        document.getElementById('fibSettingsPanel').style.display = 'none';
        document.getElementById('fibExercisePanel').style.display = 'block';
        
        // Show exercise chat panel
        this.showExerciseChat();
        
        // Start activity chat widget with correct difficulty
        if (this.app.activityChatWidget) {
            this.app.activityChatWidget.startActivity('fill_in_the_blank', settings.difficulty);
        }
        
        // Display questions directly (exercise already initialized by ActivityManager)
        this.displayQuestions();
    }
    
    /**
     * Start the exercise
     * @private
     */
    startExercise() {
        const numQuestions = parseInt(document.getElementById('fibNumQuestions').value);
        const difficulty = document.getElementById('fibDifficulty').value;

        this.exercise.initialize(numQuestions, difficulty);

        document.getElementById('fibSettingsPanel').style.display = 'none';
        document.getElementById('fibExercisePanel').style.display = 'block';

        // CRITICAL: Update ActivityManager's currentSettings so it knows the actual difficulty
        // This ensures the correct difficulty is recorded when the activity ends
        if (this.app.activityManager) {
            this.app.activityManager.currentSettings = {
                numQuestions: numQuestions,
                difficulty: difficulty
            };
            console.log('[FillInBlank] Updated ActivityManager settings:', this.app.activityManager.currentSettings);
        }

        // Start activity chat widget
        if (this.app.activityChatWidget) {
            this.app.activityChatWidget.startActivity('fill_in_the_blank', difficulty);
        }

        this.displayQuestions();
    }
    
    /**
     * Display all questions
     * @private
     */
    displayQuestions() {
        const questions = this.exercise.getAllQuestions();
        const wordBank = this.exercise.getWordBank();

        // Display word bank
        const wordBankDiv = document.getElementById('wordBank');
        wordBankDiv.innerHTML = '';
        
        wordBank.forEach(word => {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-item';
            wordItem.textContent = word;
            wordItem.draggable = true;
            wordItem.dataset.word = word;
            
            this.setupDragHandlers(wordItem);
            
            wordBankDiv.appendChild(wordItem);
        });

        // Display questions
        const questionsDiv = document.getElementById('fibQuestions');
        questionsDiv.innerHTML = '';
        
        questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'fib-question';
            
            const questionText = document.createElement('div');
            questionText.className = 'fib-question-text';
            
            // Use the fitb field and replace {blank} with the actual blank space
            let fitbText = question.fitb || `A {blank} is `;
            // Capitalize the first letter of fitb
            const capitalizedFitb = this.capitalizeFirst(fitbText);
            const fitbWithBlank = capitalizedFitb.replace('{blank}', `<span class="blank-space" data-blank-id="${question.blankId}"></span>`);
            
            // Keep definition lowercase (as it comes from data)
            questionText.innerHTML = `${index + 1}. ${fitbWithBlank}${question.definition}`;
            
            questionDiv.appendChild(questionText);
            questionsDiv.appendChild(questionDiv);
            
            // Setup drop zone
            const blankSpace = questionText.querySelector('.blank-space');
            this.setupDropZone(blankSpace);
        });

        this.updateProgress();
    }
    
    /**
     * Setup drag handlers for word items
     * @private
     */
    setupDragHandlers(element) {
        element.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', element.dataset.word);
            element.classList.add('dragging');
        });

        element.addEventListener('dragend', (e) => {
            element.classList.remove('dragging');
        });
    }
    
    /**
     * Setup drop zone for blank spaces
     * @private
     */
    setupDropZone(blankSpace) {
        blankSpace.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            blankSpace.classList.add('drag-over');
        });

        blankSpace.addEventListener('dragleave', (e) => {
            blankSpace.classList.remove('drag-over');
        });

        blankSpace.addEventListener('drop', (e) => {
            e.preventDefault();
            blankSpace.classList.remove('drag-over');
            
            const word = e.dataTransfer.getData('text/plain');
            const blankId = blankSpace.dataset.blankId;
            
            // Place word in blank
            const previousWord = this.exercise.placeWord(blankId, word);
            
            // Update display
            blankSpace.textContent = word;
            blankSpace.classList.add('filled');
            
            // Remove word from word bank
            const wordItem = document.querySelector(`.word-item[data-word="${word}"]`);
            if (wordItem) {
                wordItem.remove();
            }
            
            // If there was a previous word, add it back to word bank
            if (previousWord) {
                this.addWordToBank(previousWord);
            }
            
            // In easy mode, send immediate feedback to agent
            if (this.exercise.difficulty === 'easy') {
                const question = this.exercise.questions.find(q => q.blankId === blankId);
                if (question) {
                    console.log(`[FillInBlank] Easy mode: Sending immediate feedback for "${word}" (correct: ${question.isCorrect})`);
                    
                    if (question.isCorrect) {
                        this.sendActivityEvent('correct_answer', {
                            question: question.definition,
                            correctAnswer: question.word,
                            userAnswer: word
                        });
                    } else {
                        this.sendActivityEvent('wrong_answer', {
                            question: question.definition,
                            correctAnswer: question.word,
                            userAnswer: word,
                            difficulty: 'easy'
                        });
                    }
                }
            }
            
            // Make blank clickable to remove word
            blankSpace.style.cursor = 'pointer';
            blankSpace.onclick = () => {
                const removedWord = this.exercise.removeWord(blankId);
                if (removedWord) {
                    blankSpace.textContent = '';
                    blankSpace.classList.remove('filled', 'correct', 'incorrect');
                    this.addWordToBank(removedWord);
                }
                this.updateProgress();
            };
            
            this.updateProgress();
        });
    }
    
    /**
     * Add word back to word bank
     * @private
     */
    addWordToBank(word) {
        const wordBankDiv = document.getElementById('wordBank');
        const wordItem = document.createElement('div');
        wordItem.className = 'word-item';
        wordItem.textContent = word;
        wordItem.draggable = true;
        wordItem.dataset.word = word;
        
        this.setupDragHandlers(wordItem);
        wordBankDiv.appendChild(wordItem);
    }
    
    /**
     * Update progress display
     * @private
     */
    updateProgress() {
        const progress = this.exercise.getProgress();
        
        document.getElementById('fibFilled').textContent = progress.filled;
        document.getElementById('fibTotal').textContent = progress.total;
        document.getElementById('fibProgress').textContent = progress.percentage;
        
        const progressFill = document.getElementById('fibProgressFill');
        progressFill.style.width = `${progress.percentage}%`;
        
        // Enable/disable check button
        document.getElementById('fibCheckBtn').disabled = !this.exercise.areAllBlanksFilled();
    }
    
    /**
     * Check all answers
     * @private
     */
    checkAnswers() {
        const result = this.exercise.checkAnswers();
        const difficulty = this.exercise.difficulty;
        const behavior = FillInBlankExercise.DIFFICULTY_BEHAVIORS[difficulty];
        
        // Show correct/incorrect for each blank
        const questions = this.exercise.getAllQuestions();
        questions.forEach((question, index) => {
            const blankSpace = document.querySelector(`[data-blank-id="${question.blankId}"]`);
            if (blankSpace) {
                blankSpace.classList.remove('correct', 'incorrect');
                blankSpace.classList.add(question.isCorrect ? 'correct' : 'incorrect');
                
                // Send activity event for wrong answers based on difficulty
                if (!question.isCorrect && behavior && this.app.activityChatWidget) {
                    if (behavior.feedbackTiming === 'immediate') {
                        // Easy mode: immediate feedback
                        this.app.activityChatWidget.sendActivityEvent('wrong_answer', {
                            question: question.definition,
                            userAnswer: question.userAnswer || '(blank)',
                            correctAnswer: question.word,
                            difficulty: difficulty,
                            behavior: 'immediate_hint',
                            questionNumber: index + 1
                        });
                    } else if (behavior.feedbackTiming === 'per_question') {
                        // Hard mode: one hint
                        this.app.activityChatWidget.sendActivityEvent('wrong_answer', {
                            question: question.definition,
                            userAnswer: question.userAnswer || '(blank)',
                            correctAnswer: question.word,
                            difficulty: difficulty,
                            behavior: 'single_hint',
                            questionNumber: index + 1
                        });
                    }
                    // Hard mode: no immediate feedback (end_only)
                }
            }
        });
        
        // Show results after a delay
        setTimeout(() => {
            this.showResults();
        }, 2000);
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
            console.log('[BREADCRUMB][FIB] Sent activity_end event');
        }
        
        this.app.showResults('fill_in_the_blank', results);
    }
    
    /**
     * Setup WebSocket message listener
     * @private
     */
    setupWebSocketListener() {
        if (this.app.wsClient) {
            this.app.wsClient.addMessageHandler(this.handleWebSocketMessage);
            console.log('[BREADCRUMB][FIB] WebSocket listener added');
        }
    }
    
    /**
     * Handle incoming WebSocket messages
     * @private
     * @param {Object} message - WebSocket message
     */
    handleWebSocketMessage(message) {
        console.log('[BREADCRUMB][FIB] WebSocket message received:', message.type);
        
        // Only handle activity-related messages
        if (message.type === 'activity_chat' && message.sender === 'agent') {
            console.log('[BREADCRUMB][FIB] Displaying LLM response in embedded chat');
            this.sendChatMessage(message.message, 'agent');
        } else if (message.type === 'activity_hint') {
            console.log('[BREADCRUMB][FIB] Displaying hint in embedded chat');
            this.sendChatMessage(`💡 ${message.hint}`, 'agent');
        } else if (message.type === 'activity_feedback') {
            console.log('[BREADCRUMB][FIB] Displaying feedback in embedded chat');
            this.sendChatMessage(message.feedback, 'agent');
        }
    }
    
    /**
     * Show exercise chat panel
     * @private
     */
    showExerciseChat() {
        const chatPanel = document.getElementById('fibChatPanel');
        if (chatPanel) {
            chatPanel.style.display = 'flex';
            document.body.classList.add('exercise-active');
        }
        
        // Set random activity helper avatar
        const avatarImg = document.getElementById('fibAvatar');
        if (avatarImg) {
            const avatarNum = Math.floor(Math.random() * 10) + 1;
            const avatarNumStr = avatarNum.toString().padStart(2, '0');
            avatarImg.src = `agent_avatars/activity/${avatarNumStr}_pirate.svg`;
        }
        
        // Setup chat controls
        const sendBtn = document.getElementById('fibChatSend');
        const input = document.getElementById('fibChatInput');
        
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
        const chatPanel = document.getElementById('fibChatPanel');
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
            const agentBubble = document.getElementById('fibAgentMessage');
            if (agentBubble) {
                agentBubble.textContent = message;
            }
        } else {
            // Update student bubble with latest message and show it
            const studentBubble = document.getElementById('fibStudentMessage');
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
        console.log('[BREADCRUMB][FIB] sendUserMessage() called');
        const input = document.getElementById('fibChatInput');
        if (!input) {
            console.log('[BREADCRUMB][FIB] ERROR: Input element not found');
            return;
        }
        
        const message = input.value.trim();
        console.log('[BREADCRUMB][FIB] Message:', message);
        if (!message) {
            console.log('[BREADCRUMB][FIB] Empty message, returning');
            return;
        }
        
        console.log('[BREADCRUMB][FIB] Adding message to chat UI');
        this.sendChatMessage(message, 'student');
        input.value = '';
        
        // Send to backend via WebSocket if available
        if (this.app.wsClient && this.app.wsClient.isConnected()) {
            console.log('[BREADCRUMB][FIB] Sending to backend via WebSocket');
            this.app.wsClient.sendActivityChat(message);
        } else {
            console.log('[BREADCRUMB][FIB] ERROR: WebSocket not connected');
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
    module.exports = FillInBlankUI;
}
