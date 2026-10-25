"""静态预览服务器：在 python -m http.server 的基础上关掉浏览器缓存。

python 自带的 http.server 只发 Last-Modified，浏览器会按"距上次修改时长的
10%"做启发式缓存，于是改完 JS 再刷新，模块图里还是旧的那份。开发时
这个坑很浪费时间，所以这里统一发 no-store。
"""

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):  # 少刷屏
        pass


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    directory = sys.argv[2] if len(sys.argv) > 2 else "."
    handler = partial(NoCacheHandler, directory=directory)
    with ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"serving {directory} on http://127.0.0.1:{port} (no-store)", flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
