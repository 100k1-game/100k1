"""HTTPS-туннель для iPhone (Cloudflare Quick Tunnel)."""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
import threading
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parent
BIN_DIR = ROOT / "bin"

TUNNEL_URL: str | None = None
_TUNNEL_LOCK = threading.Lock()
_TUNNEL_PROC: subprocess.Popen | None = None

URL_PATTERN = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com")


def get_tunnel_url() -> str | None:
    with _TUNNEL_LOCK:
        return TUNNEL_URL


def _cloudflared_path() -> Path | str | None:
    name = "cloudflared.exe" if sys.platform == "win32" else "cloudflared"
    local = BIN_DIR / name
    if local.exists():
        return local
    return shutil.which("cloudflared")


def _download_cloudflared() -> Path | None:
    BIN_DIR.mkdir(exist_ok=True)
    name = "cloudflared.exe" if sys.platform == "win32" else "cloudflared"
    dest = BIN_DIR / name

    if sys.platform == "win32":
        url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    elif sys.platform == "darwin":
        url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64"
    else:
        url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"

    try:
        print("  Скачиваю cloudflared для iPhone...")
        urllib.request.urlretrieve(url, dest)
        if sys.platform != "win32":
            dest.chmod(0o755)
        return dest
    except OSError as exc:
        print(f"  cloudflared не скачан: {exc}")
        return None


def _run_tunnel(port: int) -> None:
    global TUNNEL_URL, _TUNNEL_PROC

    cloudflared = _cloudflared_path() or _download_cloudflared()
    if not cloudflared:
        print("  iPhone: установите cloudflared или проверьте интернет")
        return

    try:
        _TUNNEL_PROC = subprocess.Popen(
            [str(cloudflared), "tunnel", "--url", f"http://127.0.0.1:{port}"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
    except OSError as exc:
        print(f"  Туннель не запущен: {exc}")
        return

    assert _TUNNEL_PROC.stdout is not None
    for line in _TUNNEL_PROC.stdout:
        match = URL_PATTERN.search(line)
        if match:
            with _TUNNEL_LOCK:
                TUNNEL_URL = match.group(0).rstrip("/")
            print(f"  iPhone QR (HTTPS): {TUNNEL_URL}")
            return


def start_tunnel(port: int) -> None:
    if os.environ.get("DISABLE_TUNNEL") == "1":
        return
    if os.environ.get("PUBLIC_URL") or os.environ.get("RENDER_EXTERNAL_URL"):
        return

    threading.Thread(target=_run_tunnel, args=(port,), daemon=True).start()
