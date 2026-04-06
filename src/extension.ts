import * as vscode from 'vscode';
import { exec, ChildProcess } from 'child_process';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const provider = new WebsiteViewProvider(context.extensionUri, context);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('website-integration.sidebarView', provider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );
}

class WebsiteViewProvider implements vscode.WebviewViewProvider {
    public _view?: vscode.WebviewView;
    private _proxyProcess?: ChildProcess;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {}

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = { 
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        this.updateHtml();

        // Handle messages from the Webview UI
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'saveSettings':
                    this._context.globalState.update('webSettings', data.value).then(() => {
                        this.updateHtml();
                        vscode.window.showInformationMessage('Liquid Glass: Settings Saved');
                    });
                    break;
                
                case 'startProxy':
                    this.handleStartProxy();
                    break;

                case 'stopProxy':
                    this.handleStopProxy();
                    break;
            }
        });
    }

    private handleStartProxy() {
        if (this._proxyProcess) {
            vscode.window.showWarningMessage("Proxy server is already running.");
            return;
        }

        // Logic to find your server.js
        // It assumes server.js is in your root folder or a 'server' subfolder
        const serverPath = path.join(this._context.extensionPath, 'server.js');
        
        this._proxyProcess = exec(`node "${serverPath}"`, (error) => {
            if (error && !error.killed) {
                vscode.window.showErrorMessage(`Proxy Error: ${error.message}`);
                this._proxyProcess = undefined;
                this.updateHtml();
            }
        });

        vscode.window.showInformationMessage("🚀 Liquid Glass Proxy Started at http://localhost:3000");
        this.updateHtml();
    }

    private handleStopProxy() {
        if (this._proxyProcess) {
            this._proxyProcess.kill();
            this._proxyProcess = undefined;
            vscode.window.showInformationMessage("🛑 Proxy Server Stopped.");
            this.updateHtml();
        }
    }

    private updateHtml() {
        if (!this._view) return;
        
        const settings = this._context.globalState.get('webSettings', {
            proxy: 'http://localhost:3000',
            darkMode: true,
            liquidGlass: true,
            btnColor: '#28a745',
            devPort: '5500'
        });

        this._view.webview.html = this._getHtmlForWebview(settings);
    }

    private _getHtmlForWebview(settings: any) {
        const proxyStatus = this._proxyProcess ? "🟢 Running" : "🔴 Stopped";
        const proxyBtn = this._proxyProcess 
            ? `<button onclick="stopProxy()" style="background:#cc3300; width:100%">Stop Proxy Server</button>`
            : `<button onclick="startProxy()" style="background:#444; width:100%">Start Proxy Server</button>`;

        return `
            <!DOCTYPE html>
            <html lang="en">
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
                    body { 
                        margin: 0; padding: 0; 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; 
                        background: var(--bg); color: var(--text); 
                        height: 100vh; overflow: hidden; 
                    }
                    
                    .blob-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; display: ${settings.liquidGlass ? 'block' : 'none'}; }
                    .blob { 
                        position: absolute; width: 500px; height: 500px; 
                        background: radial-gradient(circle, var(--accent) 0%, transparent 75%); 
                        filter: blur(80px); opacity: 0.35; 
                        animation: drift 25s infinite alternate ease-in-out; 
                    }
                    @keyframes drift { 
                        from { transform: translate(-30%, -30%) rotate(0deg); } 
                        to { transform: translate(70%, 70%) rotate(180deg); } 
                    }

                    .glass { 
                        background: var(--glass); 
                        backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); 
                        border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; 
                    }
                    .nav { display: flex; align-items: center; gap: 10px; padding: 10px; margin: 10px; }
                    .cog { cursor: pointer; font-size: 20px; transition: transform 0.4s ease; user-select: none; }
                    .cog:hover { transform: rotate(90deg); }

                    input[type="text"], input[type="number"] { 
                        flex-grow: 1; background: rgba(0,0,0,0.25); 
                        border: 1px solid rgba(255,255,255,0.2); 
                        color: white; padding: 8px; border-radius: 6px; outline: none; 
                    }
                    button { 
                        color: white; border: none; 
                        padding: 8px 16px; border-radius: 6px; 
                        cursor: pointer; font-weight: bold; transition: opacity 0.2s;
                        background: var(--accent);
                    }
                    button:hover { opacity: 0.9; }
                    
                    #settings-menu { 
                        display: none; position: absolute; top: 65px; left: 10px; right: 10px; 
                        padding: 20px; z-index: 100; box-shadow: 0 15px 35px rgba(0,0,0,0.4); 
                    }
                    .setting-item { margin-bottom: 12px; }
                    
                    iframe { 
                        width: calc(100% - 20px); height: calc(100vh - 130px); 
                        margin: 0 10px; border: none; border-radius: 10px; 
                        background: white; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    }
                    .footer { position: fixed; bottom: 8px; left: 15px; font-size: 11px; font-weight: 600; opacity: 0.9; }
                </style>
            </head>
            <body>
                <div class="blob-bg"><div class="blob"></div></div>
                
                <div class="nav glass">
                    <div class="cog" onclick="toggleSettings()">⚙️</div>
                    <input type="text" id="url-bar" placeholder="Enter URL or port (e.g. 5500)">
                    <button onclick="navigate()">Go</button>
                </div>

                <div id="settings-menu" class="glass">
                    <h3 style="margin-top:0">Settings</h3>
                    <div class="setting-item">
                        <small>Proxy Status: <b>${proxyStatus}</b></small><br>
                        ${proxyBtn}
                    </div>
                    <hr style="opacity:0.2">
                    <div class="setting-item">
                        <label><input type="checkbox" id="check-dark" ${settings.darkMode ? 'checked' : ''}> Dark Mode</label>
                    </div>
                    <div class="setting-item">
                        <label><input type="checkbox" id="check-glass" ${settings.liquidGlass ? 'checked' : ''}> Liquid Glass Background</label>
                    </div>
                    <div class="setting-item">
                        <label>Proxy URL:</label><br>
                        <input type="text" id="input-proxy" value="${settings.proxy}" style="width:95%">
                    </div>
                    <div class="setting-item">
                        <label>Default Dev Port:</label><br>
                        <input type="number" id="input-dev-port" value="${settings.devPort}" style="width:95%">
                    </div>
                    <div class="setting-item">
                        <label>Accent Color:</label><br>
                        <input type="color" id="input-color" value="${settings.btnColor}">
                    </div>
                    <button onclick="saveAllSettings()" style="width:100%; margin-top:10px;">Apply & Save</button>
                </div>

                <iframe id="browser-frame" src="about:blank"></iframe>
                <div class="footer" id="status-text">Ready</div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const frame = document.getElementById('browser-frame');
                    const status = document.getElementById('status-text');
                    const proxyUrl = "${settings.proxy}";

                    function toggleSettings() {
                        const menu = document.getElementById('settings-menu');
                        menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
                    }

                    function startProxy() { vscode.postMessage({ type: 'startProxy' }); }
                    function stopProxy() { vscode.postMessage({ type: 'stopProxy' }); }

                    function saveAllSettings() {
                        vscode.postMessage({
                            type: 'saveSettings',
                            value: {
                                darkMode: document.getElementById('check-dark').checked,
                                liquidGlass: document.getElementById('check-glass').checked,
                                proxy: document.getElementById('input-proxy').value,
                                btnColor: document.getElementById('input-color').value,
                                devPort: document.getElementById('input-dev-port').value
                            }
                        });
                    }

                    function navigate() {
                        let input = document.getElementById('url-bar').value.trim();
                        if(!input) return;
                        let targetUrl = input;
                        
                        if (!isNaN(input)) {
                            targetUrl = 'http://localhost:' + input;
                        } else if (input.startsWith(':')) {
                            targetUrl = 'http://localhost' + input;
                        } else if (!input.startsWith('http')) {
                            targetUrl = 'https://' + input;
                        }
                        
                        status.innerText = "Connecting...";
                        frame.src = targetUrl;

                        const isLocal = targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1');

                        setTimeout(() => {
                            try {
                                if(frame.contentWindow.location.href === "about:blank") throw "blocked";
                            } catch(e) {
                                if (isLocal) {
                                    status.innerText = "Local Server Detected";
                                } else if (proxyUrl) {
                                    status.innerText = "Proxying: " + targetUrl;
                                    frame.src = \`\${proxyUrl}/proxy?url=\${encodeURIComponent(targetUrl)}\`;
                                }
                            }
                        }, 2000);
                    }
                </script>
            </body>
            </html>
        `;
    }
}