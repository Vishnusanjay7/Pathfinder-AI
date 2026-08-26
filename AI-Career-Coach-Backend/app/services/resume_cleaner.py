import re
import unicodedata

def clean_resume_text(raw_text: str) -> str:
    """
    Clean extracted raw text preserving structure, contact details, dates, URLs,
    and skills while removing OCR noise, redundant whitespaces, and broken lines.
    """
    if not raw_text:
        return ""

    # 1. Unicode Normalization (NFKC to resolve standard glyph variants)
    text = unicodedata.normalize("NFKC", raw_text)

    # 2. Convert common bullet point Unicode symbols to standard dash
    bullet_chars = r"[\u2022\u2023\u25b6\u25c0\u25e6\u25a0\u25a1\u25cf\u25cb\u25fe\u25fd\u2013\u2014\*]"
    text = re.sub(bullet_chars, "- ", text)

    # 3. Replace multiple horizontal whitespaces with single space
    text = re.sub(r"[ \t]+", " ", text)

    # 4. Handle hyphenated line breaks (e.g. "develop-\nment" -> "development" only if non-capital after hyphen)
    text = re.sub(r"([a-z]+)-\s*\n\s*([a-z]+)", r"\1\2", text)

    # 5. Collapse excessive line breaks (more than 2 consecutive newlines)
    text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)

    # 6. Remove page footers / header patterns (e.g., "Page 1 of 2", "Page 2")
    text = re.sub(r"(?i)page\s+\d+\s+(?:of|/)\s+\d+", "", text)
    text = re.sub(r"(?i)page\s+\d+", "", text)

    # 7. Clean leading/trailing whitespaces per line
    lines = [line.strip() for line in text.split("\n")]
    cleaned_text = "\n".join(lines).strip()

    return cleaned_text
