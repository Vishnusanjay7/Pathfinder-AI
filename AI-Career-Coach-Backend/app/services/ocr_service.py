import os
import logging
from pathlib import Path
from pdf2image import convert_from_path
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter

POPPLER_PATH = os.getenv("POPPLER_PATH", r"C:\poppler\Library\bin")
TESSERACT_PATH = os.getenv("TESSERACT_PATH", r"C:\Program Files\Tesseract-OCR\tesseract.exe")

if Path(TESSERACT_PATH).exists():
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

def is_tesseract_available() -> bool:
    """Check if Tesseract binary is available on system path or configured location."""
    try:
        if Path(TESSERACT_PATH).exists():
            return True
        # Try running pytesseract version check
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False

def preprocess_image_for_ocr(image: Image.Image) -> Image.Image:
    """
    Apply conservative image preprocessing for scanned resumes:
    Grayscale -> Contrast Boost -> Sharpening.
    Avoids aggressive binarization that degrades faint fonts.
    """
    try:
        # Grayscale
        gray = image.convert("L")
        # Enhance Contrast
        enhancer = ImageEnhance.Contrast(gray)
        enhanced = enhancer.enhance(1.5)
        # Subtle Sharpening
        sharpened = enhanced.filter(ImageFilter.SHARPEN)
        return sharpened
    except Exception as e:
        logging.warning("OCR Preprocessing error: %s", e)
        return image

def extract_text_with_ocr(pdf_path: str) -> str:
    """
    Extract text from scanned PDF pages using Tesseract OCR with per-page preprocessing.
    """
    if not is_tesseract_available():
        logging.error("Tesseract OCR binary not found at %s", TESSERACT_PATH)
        return ""

    options = {"poppler_path": POPPLER_PATH} if Path(POPPLER_PATH).exists() else {}

    try:
        images = convert_from_path(pdf_path, dpi=200, **options)
    except Exception as err:
        logging.warning("pdf2image conversion error: %s", err)
        return ""

    extracted_pages = []
    for idx, page_img in enumerate(images):
        try:
            processed_img = preprocess_image_for_ocr(page_img)
            # PSM 6: Assume a single uniform block of text
            text = pytesseract.image_to_string(processed_img, lang="eng", config="--psm 6")
            if text.strip():
                extracted_pages.append(text.strip())
        except Exception as e:
            logging.warning("OCR error on page %d: %s", idx + 1, e)

    return "\n\n".join(extracted_pages)
