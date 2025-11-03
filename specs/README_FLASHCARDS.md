# Flashcard Asset Generation System

## Overview
This system generates educational flashcard assets for the pirate-themed reading lesson (r003.1). It creates 97 total assets including illustrated vocabulary cards, word cards, letter/phonics cards, and a card back design.

## Quick Start

### 1. Install Dependencies
```bash
pip install -r flashcard_requirements.txt
```

### 2. Set Up Environment
Ensure your `.env` file contains your OpenAI API key:
```
OPENAI_API_KEY=your_key_here
```

### 3. Generate Assets
```bash
python generate_flashcard_assets.py
```

The script will:
- Generate 32 illustrated image cards using OpenAI's gpt-image-1 model
- Create 32 word cards programmatically as SVG files
- Create letter/phonics cards for all starting sounds
- Generate a pirate-themed card back design
- Save progress after each successful generation
- Create a manifest.json file listing all assets
- Validate that all expected files were created

## Output Structure

```
web/game_assets/flashcards/
├── images/              # 32 PNG files (AI-generated illustrations)
│   ├── pirate_image.png
│   ├── parrot_image.png
│   └── ...
├── words/               # 32 SVG files (text cards)
│   ├── pirate_word.svg
│   ├── parrot_word.svg
│   └── ...
├── letters/             # Letter/blend cards (SVG)
│   ├── p_letter.svg
│   ├── sh_letter.svg
│   └── ...
├── card_back.svg        # Universal card back design
├── manifest.json        # Asset inventory
└── progress.json        # Generation progress tracker
```

## Vocabulary List

### Lesson Words (24)
pirate, parrot, ship, shape, grog, key, door, chest, monkey, money, mother, honey, mast, mate, captain, cat, rat, sea, shore, deck, dock, biscuit, basket, island

### Supplementary Words (8)
shop, mask, dog, frog, father, bat, cap, rock

## Features

### Progress Tracking
- Saves progress after each successful generation
- Can resume if interrupted
- Skips already-generated assets

### Error Handling
- Automatic retry (up to 3 attempts) for failed API calls
- Detailed logging to `flashcard_generation.log`
- Exponential backoff for rate limiting

### Validation
- Checks that all expected files exist
- Reports missing assets
- Creates comprehensive manifest

### Cost Optimization
- Only generates images that don't already exist
- Rate limiting to avoid API throttling
- Estimated cost: ~$1.32 for all 32 images

## Card Specifications

### Image Cards
- **Size**: 512x512px (generated at 1024x1024, saved as PNG)
- **Style**: Children's book illustration, cartoonish
- **Theme**: Pirate-themed for lesson vocabulary, generic for supplementary words
- **Format**: PNG

### Word Cards
- **Size**: 512x512px
- **Background**: Light blue (#F0F8FF)
- **Font**: Comic Sans MS, 72pt
- **Format**: SVG

### Letter Cards
- **Size**: 512x512px
- **Background**: Light yellow (#FFFEF0)
- **Font**: Comic Sans MS, 96-120pt
- **Content**: Starting letter or letter blend (p, sh, ch, gr, etc.)
- **Format**: SVG

### Card Back
- **Size**: 512x512px
- **Design**: Friendly skull and crossbones on navy background
- **Border**: Gold (#F39C12)
- **Format**: SVG

## Usage in Games

These assets are designed for:
- **Memory/Matching Games**: Match images to words, words to letters
- **Flashcard Practice**: Vocabulary review with hints
- **Phonics Exercises**: Letter sound recognition
- **Spelling Games**: Visual word recognition

## Troubleshooting

### API Key Issues
If you see "OPENAI_API_KEY not found":
1. Check that `.env` file exists in the project root
2. Verify the API key is correctly formatted
3. Ensure python-dotenv is installed

### Generation Failures
If image generation fails:
1. Check the log file: `flashcard_generation.log`
2. Verify your OpenAI account has credits
3. Check for rate limiting issues
4. The script will automatically retry failed generations

### Missing Assets
If validation reports missing assets:
1. Check the progress.json file to see what was generated
2. Re-run the script - it will only generate missing assets
3. Check the log file for specific error messages

## Customization

### Adding New Words
Edit `generate_flashcard_assets.py`:
1. Add words to `SUPPLEMENTARY_WORDS` list
2. Add letter mapping to `LETTER_MAPPING` dict
3. Optionally add custom prompt in `generate_image_prompt()`

### Changing Card Styles
Edit the SVG templates in:
- `create_word_card_svg()` - for word card styling
- `create_letter_card_svg()` - for letter card styling
- `create_card_back_svg()` - for card back design

### Adjusting Image Prompts
Modify the `descriptions` dictionary in `generate_image_prompt()` to customize how each word is illustrated.

## Performance

- **Image Generation**: ~5-10 seconds per image
- **Total Time**: ~3-5 minutes for all 32 images
- **Word/Letter Cards**: Instant (programmatic generation)
- **Total Assets**: 97 files

## Cost Estimate

- **OpenAI API**: ~$0.04 per image × 32 images = ~$1.28
- **Storage**: ~5-10 MB total for all assets

## Documentation

For detailed specifications, see:
- `FLASHCARD_ASSET_SPECS.md` - Complete technical specifications
- `flashcard_generation.log` - Generation logs
- `manifest.json` - Asset inventory

## Support

For issues or questions:
1. Check the log file for error details
2. Review the specifications document
3. Verify all dependencies are installed
4. Ensure API key is valid and has credits
