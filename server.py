#!/usr/bin/env python3
"""Serve the viewer locally for development."""

from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlsplit


VIEWER_ROOT = Path(__file__).resolve().parent


class ViewerHandler(SimpleHTTPRequestHandler):
    """Serve only files contained in this repository."""

    def translate_path(self, path: str) -> str:
        request_path = unquote(urlsplit(path).path)
        parts = [part for part in request_path.split("/") if part not in ("", ".", "..")]
        return str(VIEWER_ROOT.joinpath(*parts))


def main() -> None:
    server = ThreadingHTTPServer(
        ("127.0.0.1", 8080),
        ViewerHandler,
    )
    print("3D Turntable: http://127.0.0.1:8080/")
    server.serve_forever()


if __name__ == "__main__":
    main()
