#!/usr/bin/env python3
"""Preview production build (requires dist/ from build.py)."""
import os
import subprocess
import sys

_ROOT = os.path.dirname(os.path.abspath(__file__))


def main() -> int:
    os.chdir(_ROOT)
    return subprocess.call(["npm", "run", "preview", "--", "--host", "127.0.0.1", "--port", "4173"], shell=sys.platform == "win32")

if __name__ == "__main__":
    raise SystemExit(main())
