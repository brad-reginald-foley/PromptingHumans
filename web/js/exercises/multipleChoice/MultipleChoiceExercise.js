/**
 * @fileoverview Multiple Choice exercise implementation using ExerciseFramework
 * @module MultipleChoiceExercise
 * @requires ExerciseFramework
 * @requires CurriculumManager
 */

/**
 * Multiple Choice exercise for vocabulary matching
 * @class MultipleChoiceExercise
 * @extends ExerciseFramework
 */
class MultipleChoiceExercise extends ExerciseFramework {
    /**
     * Difficulty behavior configurations
     * Defines how the activity helper chat should behave at each difficulty level
     */
    static DIFFICULTY_BEHAVIORS = {
        '3': {  // Easy (3 choices)
            feedbackTiming: 'immediate',      // Feedback after each answer
            hintsPerMistake: 'unlimited',     // Unlimited hints
            confirmCorrections: true,         // Confirm when student fixes mistake
            description: 'Easy - Immediate feedback with unlimited hints'
        },
        '4': {  // Medium (4 choices)
            feedbackTiming: 'per_question',   // One hint per question
            hintsPerMistake: 1,               // One hint per mistake
            confirmCorrections: true,         // Confirm corrections
            description: 'Medium - One hint per mistake'
        },
        '5': {  // Hard (5 choices)
            feedbackTiming: 'end_only',       // Feedback only at end
            hintsPerMistake: 0,               // No hints during exercise
            confirmCorrections: false,        // No confirmation
            description: 'Hard - Feedback only at end'
        }
    };

    /**
     * Creates an instance of MultipleChoiceExercise
     * @param {CurriculumManager} curriculumManager - Manager for curriculum data
     * @param {App} app - Main application instance (for accessing ScoreManager)
     */
    constructor(curriculumManager, app = null) {
        super(curriculumManager, 'multiple_choice');
        
        this.app = app;
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.selectedAnswer = null;
    }
    
    /**
     * Get default settings for multiple choice
     * @returns {Object} Default settings
     */
    getDefaultSettings() {
        return {
            numQuestions: 10,
            difficulty: 4,  // Number of choices (3=easy, 4=medium, 5=hard)
            timeLimit: null
        };
    }
    
    /**
     * Initialize the exercise with settings
     * @param {Object} settings - Exercise settings
     * @returns {MultipleChoiceExercise} Returns this for chaining
     */
    initialize(settings = {}) {
        super.initialize(settings);
        this.generateQuestions();
        return this;
    }
    
    /**
     * Check if this is the student's first time doing multiple choice
     * @private
     * @returns {boolean} True if first time, false otherwise
     */
    isFirstTimeExercise() {
        if (!this.app || !this.app.scoreManager) {
            return false;
        }
        
        // First check: Is this a returning student according to backend?
        const sessionInfo = this.app.sessionManager?.getSessionInfo();
        if (sessionInfo?.sessionData?.is_returning_student) {
            console.log('[MultipleChoice] Backend says returning student - not first time');
            return false;  // Backend confirms returning student = not first time
        }
        
        // Second check: Do we have any scores in ScoreManager?
        const scores = this.app.scoreManager.getExerciseScores('multiple_choice');
        const hasScores = scores && Object.keys(scores).length > 0;
        
        console.log('[MultipleChoice] First time check - has scores:', hasScores);
        return !hasScores;
    }
    
    /**
     * Generate questions based on settings
     * @private
     */
    generateQuestions() {
        try {
            const vocabulary = this.getVocabulary();
            if (!vocabulary || vocabulary.length === 0) {
                throw new Error('No vocabulary available');
            }
            
            // First time: test all vocabulary for baseline assessment
            // Subsequent times: use requested number of questions
            const isFirstTime = this.isFirstTimeExercise();
            const numQuestions = isFirstTime 
                ? vocabulary.length  // All vocabulary words
                : Math.min(this.settings.numQuestions, vocabulary.length);
            
            console.log(`[MultipleChoice] First time: ${isFirstTime}, Questions: ${numQuestions}/${vocabulary.length}`);
            
            const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
            
            this.questions = [];
            for (let i = 0; i < numQuestions; i++) {
                const correctItem = shuffled[i];
                const distractors = this.getDistractors(correctItem, vocabulary, this.settings.difficulty - 1);
                const choices = [correctItem.word, ...distractors].sort(() => Math.random() - 0.5);
                
                this.questions.push({
                    definition: correctItem.definition,
                    correctAnswer: correctItem.word,
                    choices: choices,
                    userAnswer: null,
                    isCorrect: false
                });
            }
            
            this.totalQuestions = this.questions.length;
            this.currentQuestionIndex = 0;
        } catch (error) {
            this.emit('error', { message: 'Failed to generate questions', error });
            throw error;
        }
    }
    
    /**
     * Get distractor words for multiple choice
     * @private
     * @param {Object} correctItem - The correct vocabulary item
     * @param {Array} allVocabulary - All vocabulary items
     * @param {number} count - Number of distractors needed
     * @returns {Array} Array of distractor words
     */
    getDistractors(correctItem, allVocabulary, count) {
        const distractors = [];
        const available = allVocabulary.filter(item => item.word !== correctItem.word);
        const shuffled = available.sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
            distractors.push(shuffled[i].word);
        }
        
        return distractors;
    }
    
    /**
     * Get the current question
     * @returns {Object|null} Current question object or null if complete
     */
    getCurrentQuestion() {
        if (this.currentQuestionIndex >= this.questions.length) {
            return null;
        }
        return this.questions[this.currentQuestionIndex];
    }
    
    /**
     * Submit an answer for the current question
     * @param {string} answer - The selected answer
     * @returns {boolean} True if correct, false otherwise
     */
    submitAnswer(answer) {
        if (this.state !== 'active') {
            throw new Error('Exercise is not active');
        }
        
        const question = this.getCurrentQuestion();
        if (!question) {
            throw new Error('No current question');
        }
        
        question.userAnswer = answer;
        const isCorrect = this.validateAnswer(answer);
        question.isCorrect = isCorrect;
        
        if (isCorrect) {
            this.score++;
        }
        
        this.recordAnswer(answer, isCorrect);
        this.emit('scoreUpdate', { score: this.score, total: this.totalQuestions });
        
        return isCorrect;
    }
    
    /**
     * Validate an answer
     * @param {string} answer - The answer to validate
     * @returns {boolean} True if correct
     */
    validateAnswer(answer) {
        const question = this.getCurrentQuestion();
        return question && answer === question.correctAnswer;
    }
    
    /**
     * Record answer details
     * @param {string} answer - The submitted answer
     * @param {boolean} isCorrect - Whether the answer was correct
     */
    recordAnswer(answer, isCorrect) {
        const question = this.getCurrentQuestion();
        this.results.answers.push({
            questionNumber: this.currentQuestionIndex + 1,
            definition: question.definition,
            userAnswer: answer,
            correctAnswer: question.correctAnswer,
            isCorrect: isCorrect,
            timestamp: Date.now()
        });
    }
    
    /**
     * Move to the next question
     * @returns {boolean} True if there's a next question, false if complete
     */
    nextQuestion() {
        this.currentQuestionIndex++;
        this.currentQuestion = this.currentQuestionIndex;
        
        if (this.isComplete()) {
            this.end();
            return false;
        }
        
        this.emit('progressUpdate', this.getProgress());
        return true;
    }
    
    /**
     * Check if exercise is complete
     * @returns {boolean} True if all questions answered
     */
    isComplete() {
        return this.currentQuestionIndex >= this.questions.length;
    }
    
    /**
     * Reset the exercise
     */
    onReset() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.selectedAnswer = null;
    }
    
    /**
     * Get progress information
     * @returns {Object} Progress data
     */
    getProgress() {
        return {
            current: this.currentQuestionIndex + 1,
            total: this.totalQuestions,
            score: this.score,
            percentage: this.totalQuestions > 0 
                ? Math.round((this.currentQuestionIndex / this.totalQuestions) * 100) 
                : 0
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultipleChoiceExercise;
}
