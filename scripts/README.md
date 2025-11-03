# Utility Scripts

This directory contains utility scripts for the Learning Module project.

## Available Scripts

### generate_flashcard_assets.py

Generates flashcard assets (images, letters, and words) using DALL-E 3 and converts them to SVG format.

**Requirements:**
- Python 3.x
- Dependencies listed in `flashcard_requirements.txt`

**Installation:**
```bash
pip install -r flashcard_requirements.txt
```

**Usage:**
```bash
python generate_flashcard_assets.py
```

**What it does:**
1. Generates 32 flashcard images using DALL-E 3
2. Converts PNG images to SVG format using potrace
3. Creates letter and word SVG assets
4. Organizes all assets in `web/game_assets/flashcards/`

**Output Structure:**
```
web/game_assets/flashcards/
├── images/          # PNG and SVG word images
├── letters/         # SVG letter graphics
├── words/           # SVG word text
├── card_back.png    # Card back design
└── card_back.svg    # Card back SVG
```

**Environment Variables:**
- `OPENAI_API_KEY` - Required for DALL-E 3 image generation

**Notes:**
- Requires `potrace` to be installed on your system
- Images are generated with a pirate theme for consistency
- SVG conversion uses threshold-based preprocessing for clean vectors

---

*For more information about the flashcard system, see [specs/README_FLASHCARDS.md](../specs/README_FLASHCARDS.md)*
