import os
import logging
from typing import Dict, Any
import pdfplumber

from app.services.ocr_service import extract_text_with_ocr, is_tesseract_available
from app.services.resume_cleaner import clean_resume_text

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

def validate_pdf_file(pdf_path: str) -> None:
    """
    Validate PDF extension, file size <= 10MB, non-empty, valid %PDF header,
    not corrupted, and not password-protected/encrypted.
    Raises ValueError with user-friendly error detail if invalid.
    """
    if not os.path.exists(pdf_path):
        raise ValueError("File does not exist.")

    file_size = os.path.getsize(pdf_path)
    if file_size == 0:
        raise ValueError("The uploaded PDF contains no content.")

    if file_size > MAX_FILE_SIZE_BYTES:
        raise ValueError("File size exceeds maximum limit of 10MB.")

    # Validate Magic Header (%PDF)
    with open(pdf_path, "rb") as f:
        header = f.read(5)
        if not header.startswith(b"%PDF"):
            raise ValueError("Please upload a valid PDF document.")

    # Check readability & password encryption using pdfplumber
    try:
        with pdfplumber.open(pdf_path) as pdf:
            if getattr(pdf, "is_encrypted", False):
                raise ValueError("The PDF is password protected.")
            if len(pdf.pages) == 0:
                raise ValueError("The PDF document has no pages.")
    except ValueError:
        raise
    except Exception as err:
        logging.warning("PDF open error: %s", err)
        raise ValueError("The uploaded PDF appears to be corrupted or invalid.")

def evaluate_extraction_quality(text: str, detected_sections_count: int = 0) -> Dict[str, Any]:
    """
    Observable quality evaluation: High, Medium, Low based on text length,
    word count, contact info detection, and garbage character ratio.
    """
    words = text.split()
    word_count = len(words)
    char_count = len(text)

    if char_count == 0:
        return {
            "quality": "low",
            "quality_detail": "No readable text found.",
            "word_count": 0
        }

    # Garbage character check: proportion of non-alphanumeric/non-punctuation characters
    printable_chars = sum(1 for c in text if c.isalnum() or c in " .,;:!?@()-/\"'\n\t")
    garbage_ratio = 1.0 - (printable_chars / max(char_count, 1))

    has_email = "@" in text
    has_phone = any(c.isdigit() for c in text)

    if word_count > 120 and garbage_ratio < 0.15 and (has_email or has_phone):
        quality = "high"
        detail = f"High quality extraction ({word_count} words extracted with clear formatting)."
    elif word_count >= 40 and garbage_ratio < 0.30:
        quality = "medium"
        detail = f"Medium quality extraction ({word_count} words extracted. Some sections may require review)."
    else:
        quality = "low"
        detail = "Low extraction quality. Some resume information may not have been extracted correctly."

    return {
        "quality": quality,
        "quality_detail": detail,
        "word_count": word_count,
        "garbage_ratio": round(garbage_ratio, 3)
    }

def extract_text_from_pdf(pdf_path: str) -> Dict[str, Any]:
    """
    Hybrid extraction pipeline:
    1. Validates PDF file
    2. Uses pdfplumber page-by-page preserving format
    3. Evaluates text extraction quality
    4. Falls back to Tesseract OCR if quality is low / empty
    5. Cleans text
    Returns dict with raw_text, cleaned_text, extraction_method, quality, quality_detail.
    """
    validate_pdf_file(pdf_path)

    raw_text = ""
    method = "pdfplumber"

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text(layout=False) or ""
                if page_text.strip():
                    raw_text += page_text + "\n"
    except Exception as err:
        logging.warning("pdfplumber extraction failed: %s", err)

    quality_eval = evaluate_extraction_quality(raw_text)

    # Fallback to Tesseract OCR if text extraction quality is low or empty
    if quality_eval["quality"] == "low" or len(raw_text.strip()) < 50:
        if is_tesseract_available():
            logging.info("pdfplumber text quality low/empty. Attempting Tesseract OCR fallback.")
            ocr_text = extract_text_with_ocr(pdf_path)
            if len(ocr_text.strip()) > len(raw_text.strip()):
                raw_text = ocr_text
                method = "ocr_tesseract"
                quality_eval = evaluate_extraction_quality(raw_text)
        else:
            logging.warning("Tesseract OCR is not available for low quality PDF fallback.")

    cleaned_text = clean_resume_text(raw_text)

    return {
        "raw_text": raw_text,
        "text": cleaned_text,
        "extraction_method": method,
        "extraction_quality": quality_eval["quality"],
        "extraction_quality_detail": quality_eval["quality_detail"]
    }
