# Learning Module Documentation

This directory contains comprehensive documentation for the Learning Module project, organized by category for easy navigation.

## 📁 Directory Structure

```
docs/
├── README.md                    # This file - documentation index
├── IMPLEMENTATION_SUMMARY.md    # Overall implementation summary
├── architecture/                # System architecture and design
├── features/                    # Feature documentation
├── archive/                     # Historical documentation
│   ├── fixes/                  # Bug fix documentation
│   └── implementations/        # Implementation details
└── specs/                      # Specifications and requirements
```

## 🏗️ Architecture Documentation

Core system architecture and design patterns:

- **[Activity Manager Architecture](architecture/ACTIVITY_MANAGER_ARCHITECTURE.md)** - Core activity management system design
- **[Activity Manager Test Plan](architecture/ACTIVITY_MANAGER_TEST_PLAN.md)** - Testing strategy for activity manager
- **[State Sync Strategy](architecture/STATE_SYNC_STRATEGY.md)** - Frontend-backend state synchronization

## ✨ Feature Documentation

Current feature implementations and guides:

- **[Agent Guided Exercises](features/AGENT_GUIDED_EXERCISES.md)** - AI agent integration with exercises
- **[Agent Tone and UI Improvements](features/AGENT_TONE_AND_UI_IMPROVEMENTS.md)** - Agent personality and interface
- **[Avatar Chat Interface](features/AVATAR_CHAT_INTERFACE.md)** - Avatar-based chat system
- **[Avatar Interface Status](features/AVATAR_INTERFACE_IMPLEMENTATION_STATUS.md)** - Implementation progress
- **[Bayesian Proficiency System](features/BAYESIAN_PROFICIENCY_WITH_OPTIONAL_ACTIVITIES.md)** - Adaptive learning algorithm
- **[Bayesian Setup Guide](features/BAYESIAN_SETUP_GUIDE.md)** - Configuration and setup
- **[Proficiency-Based Progression](features/PROFICIENCY_BASED_PROGRESSION.md)** - Adaptive difficulty system

## 📋 Specifications

Project specifications and requirements:

- **[Flashcard Asset Specs](../specs/FLASHCARD_ASSET_SPECS.md)** - Flashcard design specifications
- **[Flashcard README](../specs/README_FLASHCARDS.md)** - Flashcard implementation guide

## 📚 Archive

Historical documentation for reference:

### Bug Fixes
- Adaptive Difficulty Fix
- Bayesian Proficiency Fix
- Bayesian Unlock Fix
- Data Persistence Fix
- Progression Unlock Fix

### Implementation Details
- Activity Chat Implementation
- Adaptive Difficulty Simulation
- Adaptive Progression Implementation
- Bayesian Proficiency Implementation
- Hard Mode Unlock Implementation
- Token Management Implementation

## 🚀 Quick Start

1. **New to the project?** Start with [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
2. **Understanding the architecture?** See [architecture/](architecture/)
3. **Implementing a feature?** Check [features/](features/)
4. **Troubleshooting?** Look in [archive/fixes/](archive/fixes/)

## 📝 Documentation Standards

When adding new documentation:

1. Place architecture docs in `architecture/`
2. Place feature docs in `features/`
3. Move completed implementation docs to `archive/implementations/`
4. Move resolved bug fixes to `archive/fixes/`
5. Update this README with links to new documents

## 🔗 Related Documentation

- **[Main Project README](../readme.md)** - Project overview and setup
- **[Backend README](../../prompting_human_agent/backend/README.md)** - Backend API documentation
- **[Backend Integration](../../prompting_human_agent/BACKEND_INTEGRATION_COMPLETE.md)** - Integration guide

---

*Last Updated: November 2, 2025*
