#!/usr/bin/env python3
"""Emit distributable static files to dist/ (same as build)."""
import os
import subprocess
import sys

_ROOT = os.path.dirname(os.path.abspath(__file__))


def main() -> int:
    os.chdir(_ROOT)
    return subprocess.call(["npm", "run", "build"], shell=sys.platform == "win32")

if __name__ == "__main__":
    raise SystemExit(main())
