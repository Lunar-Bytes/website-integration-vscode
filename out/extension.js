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
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = __importStar(require("vscode"));
function activate(context) {
    // This ID must match package.json exactly: website-integration.sidebarView
    const provider = new WebsiteViewProvider(context.extensionUri, context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('website-integration.sidebarView', provider, {
        webviewOptions: { retainContextWhenHidden: true }
    }));
}
class WebsiteViewProvider {
    constructor(_extensionUri, _context) {
        this._extensionUri = _extensionUri;
        this._context = _context;
    }
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        this.updateHtml();
        webviewView.webview.onDidReceiveMessage(data => {
            if (data.type === 'saveSettings') {
                this._context.globalState.update('webSettings', data.value).then(() => {
                    this.updateHtml();
                    vscode.window.showInformationMessage('Liquid Glass Settings Applied!');
                });
            }
        });
    }
    updateHtml() {
        if (!this._view)
            return;
        const settings = this._context.globalState.get('webSettings', {
            proxy: '',
            darkMode: true,
            liquidGlass: true,
            btnColor: '#28a745'
        });
        this._view.webview.html = this._getHtmlForWebview(settings);
    }
    _getHtmlForWebview(settings) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src *; img-src *; style-src 'unsafe-inline' *; script-src 'unsafe-inline' *; connect-src *;">
                <style>
                    :root {
                        --accent: ${settings.btnColor};
                        --bg: ${settings.darkMode ? '#0f0f0f' : '#f5f5f5'};
                        --glass: ${settings.darkMode ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.6)'};
                        --text: ${settings.darkMode ? '#eee' : '#111'};
                    }
                    body { margin: 0; padding: 0; font-family: -apple-system, sans-serif; background: var(--bg); color: var(--text); height: 100vh; overflow: hidden; }
                    
                    .blob-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; display: ${settings.liquidGlass ? 'block' : 'none'}; }
                    .blob { position: absolute; width: 400px; height: 400px; background: radial-gradient(circle, var(--accent) 0%, transparent 70%); filter: blur(60px); opacity: 0.3; animation: drift 20s infinite alternate; }
                    @keyframes drift { from { transform: translate(-20%, -20%); } to { transform: translate(60%, 60%); } }

                    .glass { background: var(--glass); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; }
                    .nav { display: flex; align-items: center; gap: 8px; padding: 8px; margin: 8px; }
                    .cog { cursor: pointer; font-size: 18px; transition: 0.3s; }
                    .cog:hover { transform: rotate(90deg); }

                    input[type="text"] { flex-grow: 1; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 6px; border-radius: 4px; outline: none; }
                    button { background: var(--accent); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; }
                    
                    #settings { display: none; position: absolute; top: 55px; left: 8px; right: 8px; padding: 15px; z-index: 100; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                    iframe { width: calc(100% - 16px); height: calc(100vh - 110px); margin: 0 8px; border: none; border-radius: 8px; background: white; }
                    .footer { position: fixed; bottom: 5px; left: 12px; font-size: 10px; opacity: 0.8; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="blob-bg"><div class="blob"></div></div>
                <div class="nav glass">
                    <div class="cog" onclick="toggleSettings()">⚙️</div>
                    <input type="text" id="url" placeholder="Enter URL...">
                    <button onclick="go()">Go</button>
                </div>

                <div id="settings" class="glass">
                    <h3 style="margin:0 0 10px 0">Settings</h3>
                    <label><input type="checkbox" id="dark" ${settings.darkMode ? 'checked' : ''}> Dark Mode</label><br>
                    <label><input type="checkbox" id="liquid" ${settings.liquidGlass ? 'checked' : ''}> Liquid Glass</label><br><br>
                    <label>Proxy Server URL:</label><br>
                    <input type="text" id="proxy" value="${settings.proxy}" placeholder="http://localhost:3000" style="width:90%"><br><br>
                    <label>Button Color:</label>
                    <input type="color" id="color" value="${settings.btnColor}"><br><br>
                    <button onclick="save()" style="width:100%">Save & Apply</button>
                </div>

                <iframe id="view" src="about:blank"></iframe>
                <div class="footer" id="status">Ready</div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const frame = document.getElementById('view');
                    const status = document.getElementById('status');
                    const proxyUrl = "${settings.proxy}";

                    function toggleSettings() {
                        const s = document.getElementById('settings');
                        s.style.display = s.style.display === 'block' ? 'none' : 'block';
                    }

                    function save() {
                        vscode.postMessage({
                            type: 'saveSettings',
                            value: {
                                darkMode: document.getElementById('dark').checked,
                                liquidGlass: document.getElementById('liquid').checked,
                                proxy: document.getElementById('proxy').value,
                                btnColor: document.getElementById('color').value
                            }
                        });
                    }

                    function go() {
                        let val = document.getElementById('url').value;
                        if(!val) return;
                        if(!val.startsWith('http')) val = 'https://' + val;
                        
                        status.innerText = "Connecting...";
                        frame.src = val;

                        setTimeout(() => {
                            try {
                                if(frame.contentWindow.location.href === "about:blank") throw "err";
                            } catch(e) {
                                if(proxyUrl) {
                                    status.innerText = "Rendering thru proxy server";
                                    frame.src = \`\${proxyUrl}/proxy?url=\${encodeURIComponent(val)}\`;
                                } else {
                                    status.innerText = "No proxy enabled. Unable to render site";
                                    frame.srcdoc = "<div style='background:#111; color:white; height:100%; display:flex; align-items:center; justify-content:center; font-family:sans-serif;'>Blocked. Please enable proxy server.</div>";
                                }
                            }
                        }, 2000);
                    }

                    frame.onload = () => {
                        if(status.innerText === "Connecting...") status.innerText = "Direct connection successful";
                    };
                </script>
            </body>
            </html>
        `;
    }
}
//# sourceMappingURL=extension.js.map