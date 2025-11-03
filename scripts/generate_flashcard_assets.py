#!/usr/bin/env python3
"""
Flashcard Asset Generator
Generates image, word, and letter cards for vocabulary flashcards.
Uses OpenAI API for image generation and programmatic SVG for text cards.
"""

import os
import json
import base64
import time
import logging
import subprocess
import shutil
from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime
from openai import OpenAI
from dotenv import load_dotenv
from PIL import Image

# Load environment variables
load_dotenv()


class FatalAPIError(Exception):
    """Raised when an unrecoverable API error occurs that won't resolve with retries."""
    pass

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('flashcard_generation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration
LESSON_DATA_PATH = "web/data/r003.1.json"
OUTPUT_BASE_PATH = "web/game_assets/flashcards"
IMAGE_SIZE = "1024x1024"  # OpenAI size, will be resized
CARD_SIZE = 512
CORNER_RADIUS = 16
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds

# Vocabulary lists
LESSON_WORDS = [
    "mast", "mate", "pirate"
]

#"pirate", "parrot", "ship", "shape", "grog", "key", "door", "chest", "monkey",
#"money", "mother", "honey", "mast", "mate", "captain", "cat",
#    "rat", "sea", "shore", "deck", "dock", "biscuit", "basket", "island"

SUPPLEMENTARY_WORDS = [
    "shop", "mask", "dog", "frog", "father", "bat", "cap", "rock"
]

ALL_WORDS = LESSON_WORDS + SUPPLEMENTARY_WORDS

# Letter/blend mapping
LETTER_MAPPING = {
    "pirate": "p", "parrot": "p", "ship": "sh", "shape": "sh",
    "grog": "gr", "key": "k", "door": "d", "chest": "ch",
    "monkey": "m", "money": "m", "mother": "m", "honey": "h",
    "mast": "m", "mate": "m", "captain": "c", "cat": "c",
    "rat": "r", "sea": "s", "shore": "sh", "deck": "d",
    "dock": "d", "biscuit": "b", "basket": "b", "island": "i",
    "shop": "sh", "mask": "m", "dog": "d", "frog": "fr",
    "father": "f", "bat": "b", "cap": "c", "rock": "r"
}

# Pirate-themed words (explicit theme)
PIRATE_THEMED = {
    "pirate", "parrot", "ship", "grog", "chest", "mast", 
    "mate", "captain", "deck", "dock", "biscuit", "basket"
}

# Words with subtle pirate hints
SUBTLE_PIRATE = {
    "key", "door", "cat", "rat", "monkey", "sea", "shore", "island"
}


class FlashcardGenerator:
    """Generates flashcard assets using OpenAI API and SVG templates."""
    
    def __init__(self):
        """Initialize the generator with OpenAI client."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        
        self.client = OpenAI(api_key=api_key)
        self.setup_directories()
        self.progress = self.load_progress()
    
    @staticmethod
    def is_fatal_error(error: Exception) -> bool:
        """
        Check if an error is fatal (won't resolve with retries).
        
        Fatal errors include:
        - Billing hard limits reached
        - Organization verification required
        - Other 403 errors that indicate account/permission issues
        """
        error_str = str(error).lower()
        fatal_patterns = [
            'billing_hard_limit_reached',
            'billing_limit_user_error',
            'must be verified',
            'organization must be verified',
            'insufficient_quota'
        ]
        return any(pattern in error_str for pattern in fatal_patterns)
        
    def setup_directories(self):
        """Create output directory structure."""
        paths = [
            Path(OUTPUT_BASE_PATH) / "images",
            Path(OUTPUT_BASE_PATH) / "words",
            Path(OUTPUT_BASE_PATH) / "letters"
        ]
        for path in paths:
            path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Created directory structure at {OUTPUT_BASE_PATH}")
    
    def load_progress(self) -> Dict:
        """Load generation progress from file."""
        progress_file = Path(OUTPUT_BASE_PATH) / "progress.json"
        if progress_file.exists():
            with open(progress_file, 'r') as f:
                return json.load(f)
        return {"images": [], "words": [], "letters": [], "card_back": False, "images_svg": []}
    
    def save_progress(self):
        """Save generation progress to file."""
        progress_file = Path(OUTPUT_BASE_PATH) / "progress.json"
        with open(progress_file, 'w') as f:
            json.dump(self.progress, f, indent=2)
    
    def generate_image_prompt(self, word: str) -> str:
        """Generate AI prompt for a specific word."""
        base_prompt = (
            "Simple image, in a cute cartoonish style, bright colors,"
            "centered composition, no borders, no background"
            "white background, clear and simple: " \
            "**Size:** 300x300px (square)** " \
            "**Format:** PNG with transparency** " \
            "**Resolution:** 72 DPI (web optimized), " \
            "size:** < 100KB per image** " \
            "**Background:** Transparent"
        )
        
        # Specific descriptions for each word
        descriptions = {
            "pirate": "friendly young female pirate character with a striped ragged shirt",
            "parrot": "colorful tropical parrot with bright red, blue, and yellow feathers, friendly expression",
            "ship": "wooden pirate ship with three masts, white sails, Jolly Roger flag, side view",
            "shape": "collection of basic geometric shapes - circle, square, triangle in bright colors",
            "grog": "wooden mug with frothy beverage, simple and kid-friendly",
            "key": "ornate old-fashioned brass key with decorative handle",
            "door": "wooden door with round porthole window, ship cabin style",
            "chest": "wooden treasure chest with metal bands, slightly open showing gold coins",
            "monkey": "brown monkey with long tail, sitting pose, slight pirate theme bandana",
            "money": "pile of gold coins and colorful paper bills",
            "mother": "a pirate's mother. A friendly adult woman with warm smile, old fashioned clothing from pirate era",
            "honey": "glass honey jar with honey dipper, bee illustration on label",
            "mast": "image of a wooden ship, side view, with an arrow pointing to the main mast",
            "mate": "pirate crew member with beard, red bandana with a prominent 1 on it, and a vest",
            "captain": "pirate captain with large hat, coat with gold buttons, confident pose",
            "cat": "friendly orange tabby cat sitting, cute expression",
            "rat": "gray cartoon rat with long tail, whiskers, curious expression",
            "sea": "ocean waves with white foam, blue water, sunny sky",
            "shore": "sandy beach with gentle waves, palm tree in background",
            "deck": "image of a wooden ship lookign downd and from the side, arrow point to deck",
            "dock": "wooden pier with mooring posts, extending into water",
            "biscuit": "round hard tack biscuit, dry and simple",
            "basket": "woven wicker basket with handle",
            "island": "small tropical island with palm tree, hints of blue sea around the island shore",
            "shop": "colorful ye olde time store front with awning and display window",
            "mask": "simple costume mask with eye holes, festive colors",
            "dog": "friendly golden retriever dog sitting, happy expression, wagging tail",
            "frog": "green cartoon frog, big eyes",
            "father": "friendly adult man with warm smile, casual clothing",
            "bat": "cute cartoon bat with wings spread, friendly face, not scary",
            "cap": "baseball cap with curved brim, bright color",
            "rock": "large gray boulder with texture, simple shape"
        }
        
        #print(base_prompt + descriptions.get(word, f"{word} in simple, clear style"))
        return base_prompt + descriptions.get(word, f"{word} in simple, clear style")
    
    def generate_image_card(self, word: str) -> bool:
        """Generate an image card using OpenAI API."""
        if word in self.progress["images"]:
            logger.info(f"Skipping {word} - already generated")
            return True
        
        prompt = self.generate_image_prompt(word)
        output_path = Path(OUTPUT_BASE_PATH) / "images" / f"{word}_image.png"
        
        for attempt in range(MAX_RETRIES):
            try:
                logger.info(f"Generating image for '{word}' (attempt {attempt + 1}/{MAX_RETRIES})")
                
                result = self.client.images.generate(
                    model="gpt-image-1",
                    prompt=prompt,
                    size=IMAGE_SIZE,
                    quality="medium",
                    n=1,
                    #response_format="b64_json"
                )
                
                # Get base64 image data
                b64_data = result.data[0].b64_json
                image_data = base64.b64decode(b64_data)
                
                # Save PNG file
                with open(output_path, "wb") as f:
                    f.write(image_data)
                
                logger.info(f"Successfully generated image for '{word}'")
                self.progress["images"].append(word)
                self.save_progress()
                
                # Rate limiting
                time.sleep(1)
                return True
                
            except Exception as e:
                logger.error(f"Error generating image for '{word}' (attempt {attempt + 1}): {e}")
                
                # Check if this is a fatal error that won't resolve with retries
                if self.is_fatal_error(e):
                    logger.error("=" * 60)
                    logger.error("FATAL ERROR DETECTED - Cannot continue")
                    logger.error("=" * 60)
                    logger.error(f"Error type: {type(e).__name__}")
                    logger.error(f"Error message: {str(e)}")
                    logger.error("\nThis error indicates an account or permission issue that")
                    logger.error("won't resolve with retries. Please fix the issue and re-run.")
                    logger.error("\nCommon solutions:")
                    logger.error("  - Add credits to your OpenAI account")
                    logger.error("  - Verify your organization at:")
                    logger.error("    https://platform.openai.com/settings/organization/general")
                    logger.error("  - Check your API key permissions")
                    logger.error("=" * 60)
                    
                    # Save progress before exiting
                    self.save_progress()
                    
                    # Raise fatal error to stop execution
                    raise FatalAPIError(f"Fatal API error encountered: {str(e)}")
                
                # For non-fatal errors, continue with retry logic
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY * (attempt + 1))
                else:
                    logger.error(f"Failed to generate image for '{word}' after {MAX_RETRIES} attempts")
                    return False
        
        return False
    
    def create_word_card_svg(self, word: str) -> bool:
        """Create a word card as SVG."""
        if word in self.progress["words"]:
            logger.info(f"Skipping word card for {word} - already generated")
            return True
        
        output_path = Path(OUTPUT_BASE_PATH) / "words" / f"{word}_word.svg"
        
        svg_content = f'''<svg width="{CARD_SIZE}" height="{CARD_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{CARD_SIZE}" height="{CARD_SIZE}" rx="{CORNER_RADIUS}" fill="#F0F8FF"/>
  <rect x="10" y="10" width="{CARD_SIZE - 20}" height="{CARD_SIZE - 20}" rx="{CORNER_RADIUS}" 
        fill="none" stroke="#4A90E2" stroke-width="2"/>
  <text x="{CARD_SIZE // 2}" y="{CARD_SIZE // 2 + 24}" 
        font-family="Comic Sans MS, cursive, sans-serif" 
        font-size="72" fill="#2C3E50" text-anchor="middle" 
        font-weight="bold">{word}</text>
</svg>'''
        
        try:
            with open(output_path, 'w') as f:
                f.write(svg_content)
            logger.info(f"Created word card for '{word}'")
            self.progress["words"].append(word)
            self.save_progress()
            return True
        except Exception as e:
            logger.error(f"Error creating word card for '{word}': {e}")
            return False
    
    def create_letter_card_svg(self, word: str) -> bool:
        """Create a letter/blend card as SVG."""
        if word in self.progress["letters"]:
            logger.info(f"Skipping letter card for {word} - already generated")
            return True
        
        letter = LETTER_MAPPING.get(word, word[0])
        font_size = 96 if len(letter) > 1 else 120
        output_path = Path(OUTPUT_BASE_PATH) / "letters" / f"{letter}_letter.svg"
        
        svg_content = f'''<svg width="{CARD_SIZE}" height="{CARD_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{CARD_SIZE}" height="{CARD_SIZE}" rx="{CORNER_RADIUS}" fill="#FFFEF0"/>
  <rect x="10" y="10" width="{CARD_SIZE - 20}" height="{CARD_SIZE - 20}" rx="{CORNER_RADIUS}" 
        fill="none" stroke="#9B59B6" stroke-width="2"/>
  <text x="{CARD_SIZE // 2}" y="{CARD_SIZE // 2 + 36}" 
        font-family="Comic Sans MS, cursive, sans-serif" 
        font-size="{font_size}" fill="#5B2C6F" text-anchor="middle" 
        font-weight="bold">{letter}</text>
</svg>'''
        
        try:
            with open(output_path, 'w') as f:
                f.write(svg_content)
            logger.info(f"Created letter card '{letter}' for word '{word}'")
            self.progress["letters"].append(word)
            self.save_progress()
            return True
        except Exception as e:
            logger.error(f"Error creating letter card for '{word}': {e}")
            return False
    
    def create_card_back_svg(self) -> bool:
        """Create the card back design as SVG."""
        if self.progress["card_back"]:
            logger.info("Skipping card back - already generated")
            return True
        
        output_path = Path(OUTPUT_BASE_PATH) / "card_back.svg"
        
        # Simple skull and crossbones SVG
        svg_content = f'''<svg width="{CARD_SIZE}" height="{CARD_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{CARD_SIZE}" height="{CARD_SIZE}" rx="{CORNER_RADIUS}" fill="#2C3E50"/>
  <rect x="10" y="10" width="{CARD_SIZE - 20}" height="{CARD_SIZE - 20}" rx="{CORNER_RADIUS}" 
        fill="none" stroke="#F39C12" stroke-width="4"/>
  
  <!-- Skull -->
  <ellipse cx="256" cy="220" rx="60" ry="70" fill="white"/>
  <circle cx="236" cy="210" r="12" fill="#2C3E50"/>
  <circle cx="276" cy="210" r="12" fill="#2C3E50"/>
  <path d="M 256 240 L 246 250 L 256 250 L 266 250 Z" fill="#2C3E50"/>
  
  <!-- Crossbones -->
  <rect x="180" y="300" width="152" height="20" rx="10" fill="white" transform="rotate(-30 256 310)"/>
  <rect x="180" y="300" width="152" height="20" rx="10" fill="white" transform="rotate(30 256 310)"/>
  <circle cx="190" cy="290" r="15" fill="white"/>
  <circle cx="322" cy="290" r="15" fill="white"/>
  <circle cx="190" cy="330" r="15" fill="white"/>
  <circle cx="322" cy="330" r="15" fill="white"/>
</svg>'''
        
        try:
            with open(output_path, 'w') as f:
                f.write(svg_content)
            logger.info("Created card back design")
            self.progress["card_back"] = True
            self.save_progress()
            return True
        except Exception as e:
            logger.error(f"Error creating card back: {e}")
            return False
    
    def preprocess_image_for_tracing(self, word: str, threshold: int = 240) -> bool:
        """
        Preprocess PNG image for better potrace conversion.
        Converts to grayscale and applies threshold for clean black/white image.
        
        Args:
            word: The vocabulary word
            threshold: Pixel value threshold (0-255). Pixels above this become white.
        
        Returns:
            True if preprocessing succeeded, False otherwise
        """
        png_path = Path(OUTPUT_BASE_PATH) / "images" / f"{word}_image.png"
        temp_path = Path(OUTPUT_BASE_PATH) / "images" / f"{word}_temp.pnm"
        
        if not png_path.exists():
            logger.error(f"PNG file not found for '{word}'")
            return False
        
        try:
            # Open image and convert to grayscale
            img = Image.open(png_path).convert('L')
            
            # Apply threshold to create black and white image
            img = img.point(lambda x: 255 if x > threshold else 0, mode='1')
            
            # Save temporary preprocessed image as PNM (format potrace understands)
            img.save(temp_path)
            logger.info(f"Preprocessed image for '{word}' (threshold={threshold})")
            return True
            
        except Exception as e:
            logger.error(f"Error preprocessing image for '{word}': {e}")
            return False
    
    def convert_png_to_svg(self, word: str, use_preprocessing: bool = True) -> bool:
        """
        Convert PNG image to SVG using potrace.
        
        Args:
            word: The vocabulary word
            use_preprocessing: Whether to preprocess the image first
        
        Returns:
            True if conversion succeeded, False otherwise
        """
        if word in self.progress.get("images_svg", []):
            logger.info(f"Skipping SVG conversion for {word} - already converted")
            return True
        
        # Check if potrace is available
        if not shutil.which("potrace"):
            logger.error("potrace not found. Install with: brew install potrace")
            return False
        
        png_path = Path(OUTPUT_BASE_PATH) / "images" / f"{word}_image.png"
        temp_path = Path(OUTPUT_BASE_PATH) / "images" / f"{word}_temp.pnm"
        svg_path = Path(OUTPUT_BASE_PATH) / "images" / f"{word}_image.svg"
        
        if not png_path.exists():
            logger.error(f"PNG file not found for '{word}'")
            return False
        
        try:
            # Preprocess if requested
            input_file = png_path
            if use_preprocessing:
                if self.preprocess_image_for_tracing(word):
                    input_file = temp_path
                else:
                    logger.warning(f"Preprocessing failed for '{word}', using original PNG")
            
            # Run potrace to convert to SVG
            # --svg: Output SVG format
            # --alphamax 1.0: Corner threshold (lower = more detail, higher = smoother)
            # --opttolerance 0.2: Optimization tolerance
            # --turdsize 2: Suppress speckles of this size
            cmd = [
                "potrace",
                "--svg",
                "--alphamax", "1.0",
                "--opttolerance", "0.2",
                "--turdsize", "2",
                "--output", str(svg_path),
                str(input_file)
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                logger.info(f"Successfully converted '{word}' to SVG")
                
                # Clean up temporary file
                if temp_path.exists():
                    temp_path.unlink()
                
                # Update progress
                if "images_svg" not in self.progress:
                    self.progress["images_svg"] = []
                self.progress["images_svg"].append(word)
                self.save_progress()
                
                return True
            else:
                logger.error(f"potrace failed for '{word}': {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error(f"potrace timed out for '{word}'")
            return False
        except Exception as e:
            logger.error(f"Error converting '{word}' to SVG: {e}")
            return False
        finally:
            # Clean up temporary file if it exists
            if temp_path.exists():
                temp_path.unlink()
    
    def convert_all_to_svg(self, use_preprocessing: bool = True) -> Tuple[int, int]:
        """
        Convert all existing PNG images to SVG.
        
        Args:
            use_preprocessing: Whether to preprocess images before conversion
        
        Returns:
            Tuple of (successful_conversions, failed_conversions)
        """
        logger.info("=" * 60)
        logger.info("Starting PNG to SVG Conversion")
        logger.info("=" * 60)
        
        images_dir = Path(OUTPUT_BASE_PATH) / "images"
        png_files = list(images_dir.glob("*_image.png"))
        
        if not png_files:
            logger.warning("No PNG images found to convert")
            return 0, 0
        
        logger.info(f"Found {len(png_files)} PNG images to convert")
        
        successful = 0
        failed = 0
        
        for i, png_file in enumerate(png_files, 1):
            word = png_file.stem.replace("_image", "")
            logger.info(f"Converting {i}/{len(png_files)}: {word}")
            
            if self.convert_png_to_svg(word, use_preprocessing):
                successful += 1
            else:
                failed += 1
        
        logger.info("\n" + "=" * 60)
        logger.info("Conversion Complete!")
        logger.info("=" * 60)
        logger.info(f"Successful: {successful}/{len(png_files)}")
        logger.info(f"Failed: {failed}/{len(png_files)}")
        logger.info("=" * 60)
        
        return successful, failed
    
    def create_manifest(self) -> Dict:
        """Create a manifest of all generated assets."""
        manifest = {
            "generated_at": datetime.now().isoformat(),
            "total_assets": 97,
            "vocabulary_count": len(ALL_WORDS),
            "assets": {
                "images": [],
                "words": [],
                "letters": [],
                "card_back": None
            },
            "statistics": {
                "images_generated": 0,
                "words_generated": 0,
                "letters_generated": 0,
                "card_back_generated": False
            }
        }
        
        # Check for image files
        images_dir = Path(OUTPUT_BASE_PATH) / "images"
        for word in ALL_WORDS:
            png_path = images_dir / f"{word}_image.png"
            if png_path.exists():
                manifest["assets"]["images"].append(str(png_path))
                manifest["statistics"]["images_generated"] += 1
        
        # Check for word cards
        words_dir = Path(OUTPUT_BASE_PATH) / "words"
        for word in ALL_WORDS:
            svg_path = words_dir / f"{word}_word.svg"
            if svg_path.exists():
                manifest["assets"]["words"].append(str(svg_path))
                manifest["statistics"]["words_generated"] += 1
        
        # Check for letter cards
        letters_dir = Path(OUTPUT_BASE_PATH) / "letters"
        unique_letters = set(LETTER_MAPPING.values())
        for letter in unique_letters:
            svg_path = letters_dir / f"{letter}_letter.svg"
            if svg_path.exists():
                manifest["assets"]["letters"].append(str(svg_path))
                manifest["statistics"]["letters_generated"] += 1
        
        # Check for card back
        card_back_path = Path(OUTPUT_BASE_PATH) / "card_back.svg"
        if card_back_path.exists():
            manifest["assets"]["card_back"] = str(card_back_path)
            manifest["statistics"]["card_back_generated"] = True
        
        return manifest
    
    def validate_assets(self) -> Tuple[bool, List[str]]:
        """Validate that all expected assets exist."""
        missing = []
        
        # Check images
        images_dir = Path(OUTPUT_BASE_PATH) / "images"
        for word in ALL_WORDS:
            if not (images_dir / f"{word}_image.png").exists():
                missing.append(f"Image: {word}_image.png")
        
        # Check word cards
        words_dir = Path(OUTPUT_BASE_PATH) / "words"
        for word in ALL_WORDS:
            if not (words_dir / f"{word}_word.svg").exists():
                missing.append(f"Word card: {word}_word.svg")
        
        # Check letter cards
        letters_dir = Path(OUTPUT_BASE_PATH) / "letters"
        unique_letters = set(LETTER_MAPPING.values())
        for letter in unique_letters:
            if not (letters_dir / f"{letter}_letter.svg").exists():
                missing.append(f"Letter card: {letter}_letter.svg")
        
        # Check card back
        if not (Path(OUTPUT_BASE_PATH) / "card_back.svg").exists():
            missing.append("Card back: card_back.svg")
        
        return len(missing) == 0, missing
    
    def generate_all(self):
        """Generate all flashcard assets."""
        logger.info("=" * 60)
        logger.info("Starting Flashcard Asset Generation")
        logger.info("=" * 60)
        
        start_time = time.time()
        
        try:
            # Generate image cards
            logger.info(f"\n[1/4] Generating {len(ALL_WORDS)} image cards...")
            for i, word in enumerate(ALL_WORDS, 1):
                logger.info(f"Progress: {i}/{len(ALL_WORDS)}")
                self.generate_image_card(word)
            
            # Generate word cards
            logger.info(f"\n[2/4] Generating {len(ALL_WORDS)} word cards...")
            for word in ALL_WORDS:
                self.create_word_card_svg(word)
            
            # Generate letter cards
            unique_letters = set(LETTER_MAPPING.values())
            logger.info(f"\n[3/4] Generating {len(unique_letters)} letter cards...")
            for word in ALL_WORDS:
                self.create_letter_card_svg(word)
            
            # Generate card back
            logger.info("\n[4/4] Generating card back...")
            self.create_card_back_svg()
            
        except FatalAPIError:
            # Fatal error already logged in generate_image_card
            logger.info("\nGeneration stopped due to fatal error.")
            logger.info("Progress has been saved. Fix the issue and re-run the script.")
            return
        
        # Create manifest
        logger.info("\nCreating manifest...")
        manifest = self.create_manifest()
        manifest_path = Path(OUTPUT_BASE_PATH) / "manifest.json"
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        logger.info(f"Manifest saved to {manifest_path}")
        
        # Validate
        logger.info("\nValidating assets...")
        is_valid, missing = self.validate_assets()
        
        elapsed_time = time.time() - start_time
        
        logger.info("\n" + "=" * 60)
        logger.info("Generation Complete!")
        logger.info("=" * 60)
        logger.info(f"Time elapsed: {elapsed_time:.2f} seconds")
        logger.info(f"Images generated: {manifest['statistics']['images_generated']}/{len(ALL_WORDS)}")
        logger.info(f"Word cards generated: {manifest['statistics']['words_generated']}/{len(ALL_WORDS)}")
        logger.info(f"Letter cards generated: {manifest['statistics']['letters_generated']}/{len(unique_letters)}")
        logger.info(f"Card back generated: {manifest['statistics']['card_back_generated']}")
        
        if is_valid:
            logger.info("\n✓ All assets generated successfully!")
        else:
            logger.warning(f"\n⚠ Missing {len(missing)} assets:")
            for item in missing:
                logger.warning(f"  - {item}")
        
        logger.info(f"\nAssets saved to: {OUTPUT_BASE_PATH}")
        logger.info("=" * 60)


def main():
    """Main entry point."""
    try:
        generator = FlashcardGenerator()
        generator.generate_all()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        return 1
    return 0


if __name__ == "__main__":
    exit(main())
