#!/usr/bin/env python3
import os
import subprocess
import sys

_ROOT = os.path.dirname(os.path.abspath(__file__))


def main() -> int:
    os.chdir(_ROOT)
    return subprocess.call(["npm", "run", "test"], shell=sys.platform == "win32")

if __name__ == "__main__":
    raise SystemExit(main())
