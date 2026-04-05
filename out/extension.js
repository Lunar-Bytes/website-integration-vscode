"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = require("vscode");
function activate(context) {
    const provider = new WebsiteViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('website-integration.sidebarView', provider));
}
class WebsiteViewProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, _context, _token) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        // Start with a default site or a blank page
        const defaultUrl = 'https://www.google.com/search?q=Gemini+AI';
        webviewView.webview.html = this._getHtmlForWebview(defaultUrl);
    }
    _getHtmlForWebview(url) {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    body, html { margin: 0; padding: 0; height: 100%; width: 100%; display: flex; flex-direction: column; overflow: hidden; background: #252526; }
                    .nav-bar { display: flex; padding: 5px; background: #333; gap: 5px; border-bottom: 1px solid #444; }
                    input { flex: 1; background: #3c3c3c; color: white; border: 1px solid #555; padding: 4px 8px; border-radius: 3px; outline: none; }
                    button { background: #0e639c; color: white; border: none; padding: 4px 10px; cursor: pointer; border-radius: 3px; }
                    button:hover { background: #1177bb; }
                    .iframe-container { flex: 1; width: 100%; border: none; }
                    iframe { width: 100%; height: 100%; border: none; background: white; }
                </style>
            </head>
            <body>
                <div class="nav-bar">
                    <input type="text" id="urlInput" placeholder="Enter URL (https://...)" value="${url}" />
                    <button id="goBtn">Go</button>
                </div>
                <div class="iframe-container">
                    <iframe id="browserFrame" src="${url}"></iframe>
                </div>

                <script>
                    const btn = document.getElementById('goBtn');
                    const input = document.getElementById('urlInput');
                    const frame = document.getElementById('browserFrame');

                    function loadUrl() {
                        let newUrl = input.value.trim();
                        if (!newUrl.startsWith('http')) {
                            newUrl = 'https://' + newUrl;
                            input.value = newUrl;
                        }
                        frame.src = newUrl;
                    }

                    btn.addEventListener('click', loadUrl);
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') loadUrl();
                    });
                </script>
            </body>
            </html>`;
    }
}
//# sourceMappingURL=extension.js.map