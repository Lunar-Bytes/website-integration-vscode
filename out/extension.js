"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
function activate(context) {
    const provider = new WebsiteViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('website-integration.sidebarView', provider));
}
class WebsiteViewProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview();
        webviewView.webview.onDidReceiveMessage(async (data) => {
            if (data.type === 'requestProxy') {
                try {
                    const response = await axios_1.default.get(data.url, {
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                        timeout: 5000
                    });
                    let html = response.data;
                    const urlObj = new URL(data.url);
                    const baseTag = `<base href="${urlObj.protocol}//${urlObj.host}${urlObj.pathname}">`;
                    if (html.includes('<head>')) {
                        html = html.replace('<head>', `<head>${baseTag}`);
                    }
                    webviewView.webview.postMessage({ type: 'renderProxy', html: html });
                }
                catch (err) {
                    // Send specific "Not Found" message back to UI
                    webviewView.webview.postMessage({ type: 'proxyError', url: data.url });
                }
            }
        });
    }
    _getHtmlForWebview() {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    :root {
                        --glass: rgba(255, 255, 255, 0.1);
                        --border: rgba(255, 255, 255, 0.2);
                        --bg-dark: #0f0f10;
                    }

                    body, html { 
                        margin: 0; padding: 0; height: 100%; width: 100%; 
                        font-family: 'Segoe UI', sans-serif;
                        background: var(--bg-dark);
                        overflow: hidden;
                        display: flex; flex-direction: column;
                    }

                    /* Animated Background Gradients */
                    .bg-blobs {
                        position: absolute; width: 100%; height: 100%;
                        z-index: -1; overflow: hidden; filter: blur(40px);
                    }
                    .blob {
                        position: absolute; width: 150px; height: 150px;
                        border-radius: 50%; opacity: 0.4;
                    }
                    .blob-1 { background: #0e639c; top: -20px; left: -20px; }
                    .blob-2 { background: #612570; bottom: 20px; right: -20px; }

                    /* Glassmorphism Container */
                    .app-container {
                        display: flex; flex-direction: column;
                        height: 100%; padding: 12px; box-sizing: border-box;
                        gap: 12px;
                    }

                    .nav-card {
                        background: var(--glass);
                        backdrop-filter: blur(10px);
                        border: 1px solid var(--border);
                        border-radius: 12px;
                        padding: 8px;
                        display: flex; gap: 8px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    }

                    input {
                        flex: 1; background: rgba(0,0,0,0.2);
                        border: 1px solid var(--border);
                        border-radius: 8px; color: white;
                        padding: 6px 12px; outline: none;
                    }

                    button {
                        background: #007acc; color: white;
                        border: none; border-radius: 8px;
                        padding: 0 16px; cursor: pointer;
                        font-weight: 600; transition: 0.2s;
                    }
                    button:hover { background: #005a9e; transform: translateY(-1px); }

                    .browser-card {
                        flex: 1; background: var(--glass);
                        backdrop-filter: blur(15px);
                        border: 1px solid var(--border);
                        border-radius: 16px; overflow: hidden;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                        position: relative;
                    }

                    iframe {
                        width: 100%; height: 100%; border: none;
                        background: white; border-radius: 0;
                    }

                    /* Custom Error Overlay */
                    #error-overlay {
                        position: absolute; top:0; left:0; width:100%; height:100%;
                        background: var(--bg-dark); color: white;
                        display: none; flex-direction: column;
                        align-items: center; justify-content: center;
                        text-align: center; padding: 20px; box-sizing: border-box;
                    }
                    #error-overlay h2 { color: #ff5555; margin-bottom: 8px; }
                </style>
            </head>
            <body>
                <div class="bg-blobs">
                    <div class="blob blob-1"></div>
                    <div class="blob blob-2"></div>
                </div>

                <div class="app-container">
                    <div class="nav-card">
                        <input type="text" id="urlInput" placeholder="Enter URL (e.g. google.com)" />
                        <button id="goBtn">Go</button>
                    </div>

                    <div class="browser-card">
                        <iframe id="browserFrame"></iframe>
                        <div id="error-overlay">
                            <h2>⚠️ Site Not Found</h2>
                            <p id="error-msg">We couldn't reach that address.</p>
                            <button onclick="document.getElementById('error-overlay').style.display='none'">Try Again</button>
                        </div>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const input = document.getElementById('urlInput');
                    const btn = document.getElementById('goBtn');
                    const frame = document.getElementById('browserFrame');
                    const errorOverlay = document.getElementById('error-overlay');
                    const errorMsg = document.getElementById('error-msg');

                    const proxyList = ['google.com', 'github.com', 'youtube.com', 'stackoverflow.com'];

                    function navigate() {
                        let url = input.value.trim();
                        if (!url) return;
                        if (!url.startsWith('http')) url = 'https://' + url;

                        errorOverlay.style.display = 'none';
                        const needsProxy = proxyList.some(d => url.includes(d));

                        if (needsProxy) {
                            vscode.postMessage({ type: 'requestProxy', url: url });
                        } else {
                            frame.src = url;
                        }
                    }

                    // ENTER KEY LOGIC
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') navigate();
                    });

                    btn.addEventListener('click', navigate);

                    window.addEventListener('message', e => {
                        if (e.data.type === 'renderProxy') {
                            frame.srcdoc = e.data.html;
                        } else if (e.data.type === 'proxyError') {
                            errorMsg.innerText = "The website '" + e.data.url + "' could not be reached or does not exist.";
                            errorOverlay.style.display = 'flex';
                        }
                    });
                </script>
            </body>
            </html>`;
    }
}
//# sourceMappingURL=extension.js.map