# Flashcard Asset Generation Specifications

## Overview
This document provides detailed specifications for generating flashcard assets for the pirate-themed reading lesson (r003.1). The assets will be used for educational games including memory matching, vocabulary practice, and phonics exercises.

## Asset Requirements

### Total Assets: 97 files
- **32 Image Cards** - Illustrated vocabulary words
- **32 Word Cards** - Text-only cards with vocabulary words
- **32 Letter Cards** - Starting letter/letter blend cards
- **1 Card Back** - Universal back design for all cards

## Technical Specifications

### Dimensions & Format
- **Size**: 512x512px (square)
- **Format**: SVG (converted from PNG for images)
- **Corner Radius**: 16px (rounded corners)
- **Background**: White or light colored for visibility

### File Naming Convention
```
Image cards: {word}_image.svg
Word cards: {word}_word.svg
Letter cards: {letter}_letter.svg (e.g., "p_letter.svg", "sh_letter.svg")
Card back: card_back.svg
```

### Folder Structure
```
web/game_assets/flashcards/
├── images/
│   ├── pirate_image.svg
│   ├── parrot_image.svg
│   └── ... (32 total)
├── words/
│   ├── pirate_word.svg
│   └── ... (32 total)
├── letters/
│   ├── p_letter.svg
│   ├── sh_letter.svg
│   └── ... (32 total)
└── card_back.svg
```

## Vocabulary List

### Lesson Vocabulary (24 words)
From r003.1.json with pirate theme context:
1. pirate
2. parrot
3. ship
4. shape
5. grog
6. key
7. door
8. chest
9. monkey
10. money
11. mother
12. honey
13. mast
14. mate
15. captain
16. cat
17. rat
18. sea
19. shore
20. deck
21. dock
22. biscuit
23. basket
24. island

### Supplementary Words (8 words)
Additional vocabulary for expanded practice:
25. shop
26. mask
27. dog
28. frog
29. father
30. bat (animal)
31. cap
32. rock

## Image Card Specifications

### Art Style
- **Style**: Children's book illustration
- **Tone**: Cartoonish, friendly, age-appropriate for 3rd grade
- **Colors**: Vibrant, clear, high contrast
- **Composition**: Centered subject, simple background
- **Detail Level**: Clear and recognizable, not overly complex

### Pirate Theme Application

#### Explicit Pirate Theme (Lesson Vocabulary)
These words should have clear pirate context:
- **pirate**: Friendly pirate with hat, eye patch, cheerful expression
- **parrot**: Colorful parrot, can be on pirate's shoulder or perch
- **ship**: Wooden pirate ship with masts, sails, Jolly Roger flag
- **grog**: Wooden mug or bottle with liquid (non-alcoholic appearance)
- **chest**: Treasure chest, wooden with metal bands, slightly open showing gold
- **mast**: Tall wooden ship mast with rigging
- **mate**: Pirate crew member with bandana
- **captain**: Pirate captain with distinctive hat, coat
- **deck**: Wooden ship deck with railing
- **dock**: Wooden pier with ship mooring posts
- **biscuit**: Hard tack style biscuit, round and dry-looking
- **basket**: Woven basket suitable for ship provisions

#### Subtle Pirate Theme (Generic Objects)
These should be recognizable objects with optional subtle pirate hints:
- **key**: Old-fashioned ornate key (could open treasure chest)
- **door**: Wooden door (could be ship cabin door)
- **cat**: Friendly cartoon cat (ship's cat)
- **rat**: Cartoon rat (ship's rat)
- **monkey**: Playful monkey (could be ship's pet)
- **sea**: Ocean waves, blue water
- **shore**: Beach with sand and water
- **island**: Small tropical island with palm tree

#### No Pirate Theme (Supplementary Words)
Standard children's book illustrations:
- **shape**: Geometric shapes (circle, square, triangle)
- **money**: Coins and bills
- **mother**: Friendly adult woman
- **honey**: Honey jar with bee
- **shop**: Store front
- **mask**: Simple face mask or costume mask
- **dog**: Friendly cartoon dog
- **frog**: Green cartoon frog
- **father**: Friendly adult man
- **bat**: Cartoon bat (animal) with wings
- **cap**: Baseball cap or similar hat
- **rock**: Stone or boulder

### AI Generation Prompts

#### Base Prompt Template
```
"Children's book illustration, cartoonish style, vibrant colors, 
age-appropriate for 3rd grade students, centered composition, 
white background, clear and simple: [SPECIFIC OBJECT DESCRIPTION]"
```

#### Example Prompts

**Pirate (explicit theme):**
```
"Children's book illustration, cartoonish style, vibrant colors, 
age-appropriate for 3rd grade students, centered composition, 
white background, clear and simple: friendly pirate character 
with tricorn hat, eye patch, striped shirt, cheerful smile, 
standing pose"
```

**Ship (explicit theme):**
```
"Children's book illustration, cartoonish style, vibrant colors, 
age-appropriate for 3rd grade students, centered composition, 
white background, clear and simple: wooden pirate ship with 
three masts, white sails, Jolly Roger flag, side view, 
floating on water"
```

**Cat (subtle theme):**
```
"Children's book illustration, cartoonish style, vibrant colors, 
age-appropriate for 3rd grade students, centered composition, 
white background, clear and simple: friendly orange tabby cat 
sitting, cute expression, simple design"
```

**Dog (no theme):**
```
"Children's book illustration, cartoonish style, vibrant colors, 
age-appropriate for 3rd grade students, centered composition, 
white background, clear and simple: friendly golden retriever dog 
sitting, happy expression, wagging tail"
```

## Word Card Specifications

### Design
- **Background**: Light blue or cream color (#F0F8FF or #FFFEF0)
- **Text**: Centered, large, clear font
- **Font**: Comic Sans MS or similar kid-friendly font
- **Font Size**: 72pt
- **Text Color**: Dark navy (#2C3E50) for high contrast
- **Border**: 2px solid border in complementary color
- **Corner Radius**: 16px (matching image cards)

### SVG Template Structure
```svg
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="16" fill="#F0F8FF"/>
  <rect x="10" y="10" width="492" height="492" rx="16" 
        fill="none" stroke="#4A90E2" stroke-width="2"/>
  <text x="256" y="280" font-family="Comic Sans MS, cursive" 
        font-size="72" fill="#2C3E50" text-anchor="middle" 
        font-weight="bold">{WORD}</text>
</svg>
```

## Letter Card Specifications

### Design
- **Background**: Light yellow or cream color (#FFFEF0)
- **Text**: Centered, very large, clear font
- **Font**: Comic Sans MS or similar kid-friendly font
- **Font Size**: 120pt for single letters, 96pt for blends
- **Text Color**: Dark purple (#5B2C6F) for high contrast
- **Border**: 2px solid border in complementary color
- **Corner Radius**: 16px (matching other cards)

### Letter/Blend Mapping
```
pirate → p
parrot → p
ship → sh
shape → sh
grog → gr
key → k
door → d
chest → ch
monkey → m
money → m
mother → m
honey → h
mast → m
mate → m
captain → c
cat → c
rat → r
sea → s
shore → sh
deck → d
dock → d
biscuit → b
basket → b
island → i
shop → sh
mask → m
dog → d
frog → fr
father → f
bat → b
cap → c
rock → r
```

### SVG Template Structure
```svg
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="16" fill="#FFFEF0"/>
  <rect x="10" y="10" width="492" height="492" rx="16" 
        fill="none" stroke="#9B59B6" stroke-width="2"/>
  <text x="256" y="300" font-family="Comic Sans MS, cursive" 
        font-size="120" fill="#5B2C6F" text-anchor="middle" 
        font-weight="bold">{LETTER}</text>
</svg>
```

## Card Back Specification

### Design
- **Theme**: Pirate skull and crossbones
- **Style**: Friendly, cartoonish (not scary)
- **Background**: Navy blue (#2C3E50)
- **Icon**: White skull and crossbones, centered
- **Border**: Gold/yellow border (#F39C12)
- **Corner Radius**: 16px

### AI Generation Prompt
```
"Children's book illustration, cartoonish style, friendly and 
age-appropriate for 3rd grade, centered composition: cute pirate 
skull and crossbones symbol on navy blue background, simple white 
skull with big eye sockets, crossed bones beneath, friendly 
expression, not scary, with gold border frame"
```

### Alternative SVG Template (if AI generation not suitable)
```svg
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="16" fill="#2C3E50"/>
  <rect x="10" y="10" width="492" height="492" rx="16" 
        fill="none" stroke="#F39C12" stroke-width="4"/>
  <!-- Skull and crossbones path data here -->
</svg>
```

## Generation Pipeline

### Process Flow
1. **Load vocabulary** from web/data/r003.1.json
2. **Generate image cards** using OpenAI API (32 images)
3. **Convert PNG to SVG** with rounded corners
4. **Generate word cards** programmatically (32 SVGs)
5. **Generate letter cards** programmatically (32 SVGs)
6. **Generate card back** using AI or SVG template
7. **Validate** all 97 files exist
8. **Create manifest** JSON file

### Quality Checks
- All images are 512x512px
- All SVGs have 16px corner radius
- Text is readable and properly sized
- Colors meet contrast requirements
- File naming is consistent
- All 97 files are present

### Error Handling
- Retry failed API calls (max 3 attempts)
- Log all errors with timestamps
- Save progress after each successful generation
- Resume capability if interrupted

## Cost Estimation

### OpenAI API Costs
- Model: gpt-image-1
- Size: 1024x1024 (will be resized to 512x512)
- Estimated cost: ~$0.04 per image
- Total images: 32 (image cards) + 1 (card back) = 33
- **Estimated total cost: ~$1.32**

### Generation Time
- ~5-10 seconds per image
- Total time: ~3-5 minutes for all images
- Word/letter cards: instant (programmatic)
- **Total pipeline time: ~5-10 minutes**

## Usage Notes

### For Developers
- Run `pip install openai pillow cairosvg` before generation
- Set `OPENAI_API_KEY` in .env file
- Execute `python generate_flashcard_assets.py`
- Check logs for any errors
- Validate output with manifest.json

### For Designers
- Review generated images for quality
- Ensure pirate theme is appropriate
- Check text readability on word/letter cards
- Verify card back design is kid-friendly

### For Educators
- Images should be clear and recognizable
- Vocabulary matches lesson content
- Letter sounds are accurate
- Cards are suitable for 3rd grade level

## Future Enhancements

### Potential Additions
- Multiple card back designs (themes)
- Animated SVG versions
- Different size variants (256x256, 1024x1024)
- Additional vocabulary sets
- Multilingual versions
- Audio pronunciation files

### Accessibility
- High contrast mode versions
- Larger text options
- Screen reader compatible metadata
- Color-blind friendly palettes
