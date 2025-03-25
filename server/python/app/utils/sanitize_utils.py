"""Utilities for input sanitization across the application."""

import re
import html
from typing import Optional, Dict, Any, List


def sanitize_input(text: Optional[str]) -> Optional[str]:
    """Sanitize user input to prevent injection attacks

    Args:
        text: The text to sanitize

    Returns:
        Sanitized text or None if input was None
    """
    if text is None:
        return None

    # Remove any potentially dangerous characters
    # Allow only alphanumeric, spaces, and basic punctuation
    sanitized = re.sub(r'[^\w\s.,\-\'"]', "", text)

    # Also escape HTML to prevent XSS
    sanitized = html.escape(sanitized)

    return sanitized


def sanitize_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize all string values in a dictionary

    Args:
        data: Dictionary with values to sanitize

    Returns:
        Dictionary with sanitized string values
    """
    sanitized_data = {}
    for key, value in data.items():
        if isinstance(value, str):
            sanitized_data[key] = sanitize_input(value)
        else:
            sanitized_data[key] = value
    return sanitized_data
