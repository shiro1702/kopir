#!/usr/bin/env python3
"""Print a local PDF without API — smoke test for printer setup."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agent.config import load_config
from agent.printer import PrintError, print_pdf


def main() -> None:
    parser = argparse.ArgumentParser(description="Test PDF printing")
    parser.add_argument("pdf", help="Path to PDF file")
    args = parser.parse_args()

    config = load_config()
    try:
        print_pdf(args.pdf, config)
        print("Print job submitted successfully")
    except PrintError as exc:
        print(f"Print failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
