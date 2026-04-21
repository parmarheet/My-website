from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import os


class AppHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "application/javascript",
        ".json": "application/json",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description="Serve the Luma Atelier storefront locally.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    os.chdir(root)

    server = ThreadingHTTPServer((args.host, args.port), AppHandler)
    print(f"Serving Luma Atelier at http://{args.host}:{args.port}")
    try:
      server.serve_forever()
    except KeyboardInterrupt:
      print("\nStopping server.")
    finally:
      server.server_close()


if __name__ == "__main__":
    main()
