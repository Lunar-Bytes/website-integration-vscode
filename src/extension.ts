import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // This ID MUST match your package.json: "website-integration.sidebarView"
    const provider = new WebsiteViewProvider(context.extensionUri, context);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('website-integration.sidebarView', provider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );
}

class WebsiteViewProvider implements vscode.WebviewViewProvider {
    public _view?: vscode.WebviewView;

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
            if (data.type === 'saveSettings') {
                this._context.globalState.update('webSettings', data.value).then(() => {
                    this.updateHtml(); // Push new settings to UI immediately
                    vscode.window.showInformationMessage('Liquid Glass: Settings Saved');
                });
            }
        });
    }

    private updateHtml() {
        if (!this._view) return;
        
        const settings = this._context.globalState.get('webSettings', {
            proxy: '',
            darkMode: true,
            liquidGlass: true,
            btnColor: '#28a745',
            devPort: '5500'
        });

        this._view.webview.html = this._getHtmlForWebview(settings);
    }

    private _getHtmlForWebview(settings: any) {
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
                    
                    /* --- Liquid Glass Background --- */
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

                    /* --- UI Components --- */
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
                        background: var(--accent); color: white; border: none; 
                        padding: 8px 16px; border-radius: 6px; 
                        cursor: pointer; font-weight: bold; transition: opacity 0.2s;
                    }
                    button:hover { opacity: 0.9; }
                    
                    /* --- Settings Overlay --- */
                    #settings-menu { 
                        display: none; position: absolute; top: 65px; left: 10px; right: 10px; 
                        padding: 20px; z-index: 100; box-shadow: 0 15px 35px rgba(0,0,0,0.4); 
                    }
                    .setting-item { margin-bottom: 12px; }
                    
                    /* --- Browser View --- */
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
                        <label><input type="checkbox" id="check-dark" ${settings.darkMode ? 'checked' : ''}> Dark Mode</label>
                    </div>
                    <div class="setting-item">
                        <label><input type="checkbox" id="check-glass" ${settings.liquidGlass ? 'checked' : ''}> Liquid Glass Background</label>
                    </div>
                    <div class="setting-item">
                        <label>Proxy Server URL:</label><br>
                        <input type="text" id="input-proxy" value="${settings.proxy}" placeholder="http://localhost:3000" style="width:95%">
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
                        
                        // Smart Port Handling: If input is just a number (like 5500)
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

                        // Detection Logic for Security Blocks
                        setTimeout(() => {
                            try {
                                // If this access fails, the site is blocking us or cross-origin
                                if(frame.contentWindow.location.href === "about:blank") throw "blocked";
                            } catch(e) {
                                if (isLocal) {
                                    status.innerText = "Local Server - Direct Connection";
                                } else if (proxyUrl) {
                                    status.innerText = "Rendering thru proxy server";
                                    // Route through your Node.js proxy
                                    frame.src = \`\${proxyUrl}/proxy?url=\${encodeURIComponent(targetUrl)}\`;
                                } else {
                                    status.innerText = "No proxy enabled. Unable to render site";
                                    frame.srcdoc = \`
                                        <body style="background:#111; color:white; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; text-align:center; margin:0;">
                                            <div>
                                                <h2 style="color:var(--accent)">Site Blocked</h2>
                                                <p>This site refuses to be in an iframe.<br>Enable your proxy server in settings.</p>
                                            </div>
                                        </body>\`;
                                }
                            }
                        }, 2000);
                    }

                    frame.onload = () => {
                        if(status.innerText === "Connecting...") {
                            status.innerText = "Direct connection successful";
                        }
                    };
                </script>
            </body>
            </html>
        `;
    }
}