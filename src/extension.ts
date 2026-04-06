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
        if (this._proxyProcess) return;
        const serverPath = path.join(this._context.extensionPath, 'server.js');
        this._proxyProcess = exec(`node "${serverPath}"`, (error) => {
            if (error && !error.killed) {
                this._proxyProcess = undefined;
                this.updateHtml();
            }
        });
        vscode.window.showInformationMessage("🚀 Liquid Glass Proxy Started");
        this.updateHtml();
    }

    private handleStopProxy() {
        if (this._proxyProcess) {
            this._proxyProcess.kill();
            this._proxyProcess = undefined;
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
                <style>
                    :root {
                        --accent: ${settings.btnColor};
                        --bg: ${settings.darkMode ? '#0f0f0f' : '#f5f5f5'};
                        --glass: ${settings.darkMode ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.6)'};
                        --text: ${settings.darkMode ? '#eee' : '#111'};
                    }
                    body { margin: 0; padding: 0; font-family: sans-serif; background: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; }
                    
                    .blob-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; display: ${settings.liquidGlass ? 'block' : 'none'}; }
                    .blob { position: absolute; width: 500px; height: 500px; background: radial-gradient(circle, var(--accent) 0%, transparent 75%); filter: blur(80px); opacity: 0.35; animation: drift 25s infinite alternate; }
                    @keyframes drift { from { transform: translate(-30%, -30%); } to { transform: translate(70%, 70%); } }

                    .tab-strip { display: flex; background: rgba(0,0,0,0.2); padding: 5px 10px 0; gap: 5px; border-bottom: 1px solid rgba(255,255,255,0.1); }
                    .tab { padding: 5px 12px; font-size: 11px; cursor: pointer; background: rgba(255,255,255,0.05); border-radius: 5px 5px 0 0; border: 1px solid rgba(255,255,255,0.1); border-bottom: none; opacity: 0.7; }
                    .tab.active { background: var(--glass); opacity: 1; font-weight: bold; border-top: 2px solid var(--accent); }
                    .add-tab { padding: 5px 10px; cursor: pointer; color: var(--accent); font-weight: bold; }

                    .glass { background: var(--glass); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; }
                    .nav { display: flex; align-items: center; gap: 10px; padding: 10px; margin: 10px; flex-shrink: 0; }
                    input[type="text"] { flex-grow: 1; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 8px; border-radius: 6px; }
                    
                    #settings-menu { display: none; position: absolute; top: 100px; left: 10px; right: 10px; padding: 20px; z-index: 100; box-shadow: 0 15px 35px rgba(0,0,0,0.4); }
                    
                    .frame-container { flex-grow: 1; position: relative; margin: 0 10px 10px; }
                    iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 10px; background: white; display: none; }
                    iframe.active { display: block; }
                    
                    button { color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; background: var(--accent); }
                </style>
            </head>
            <body>
                <div class="blob-bg"><div class="blob"></div></div>
                
                <div class="tab-strip" id="tab-strip"></div>

                <div class="nav glass">
                    <div onclick="toggleSettings()" style="cursor:pointer">⚙️</div>
                    <input type="text" id="url-bar" placeholder="Enter URL...">
                    <button onclick="navigate()">Go</button>
                </div>

                <div id="settings-menu" class="glass">
                    <small>Proxy Status: <b>${proxyStatus}</b></small>${proxyBtn}
                    <div style="margin-top:10px">
                        <label><input type="checkbox" id="check-dark" ${settings.darkMode ? 'checked' : ''}> Dark Mode</label><br>
                        <label><input type="checkbox" id="check-glass" ${settings.liquidGlass ? 'checked' : ''}> Liquid Glass</label><br>
                        Proxy URL: <input type="text" id="input-proxy" value="${settings.proxy}" style="width:90%"><br>
                        Dev Port: <input type="number" id="input-dev-port" value="${settings.devPort}" style="width:90%"><br>
                        Accent: <input type="color" id="input-color" value="${settings.btnColor}"><br>
                        <button onclick="saveAllSettings()" style="width:100%; margin-top:10px;">Apply</button>
                    </div>
                </div>

                <div class="frame-container" id="frame-container"></div>

                <script>
                    const vscode = acquireVsCodeApi();
                    let activeTabIndex = 0;
                    let tabs = [{ id: 0, title: 'Home', url: 'about:blank' }];

                    function renderTabs() {
                        const strip = document.getElementById('tab-strip');
                        strip.innerHTML = tabs.map((t, i) => \`
                            <div class="tab \${i === activeTabIndex ? 'active' : ''}" onclick="switchTab(\${i})">
                                \${t.title}
                            </div>
                        \`).join('') + '<div class="add-tab" onclick="addTab()">+</div>';
                    }

                    function switchTab(index) {
                        activeTabIndex = index;
                        document.querySelectorAll('iframe').forEach((f, i) => {
                            f.className = (i === index) ? 'active' : '';
                        });
                        document.getElementById('url-bar').value = tabs[index].url === 'about:blank' ? '' : tabs[index].url;
                        renderTabs();
                    }

                    function addTab() {
                        const newId = tabs.length;
                        tabs.push({ id: newId, title: 'New Tab', url: 'about:blank' });
                        const f = document.createElement('iframe');
                        f.id = 'frame-' + newId;
                        f.src = 'about:blank';
                        document.getElementById('frame-container').appendChild(f);
                        switchTab(newId);
                    }

                    function navigate() {
                        const input = document.getElementById('url-bar').value.trim();
                        if(!input) return;
                        
                        let targetUrl = input;
                        if (!isNaN(input)) targetUrl = 'http://localhost:' + input;
                        else if (!input.startsWith('http')) targetUrl = 'https://' + input;

                        tabs[activeTabIndex].url = targetUrl;
                        tabs[activeTabIndex].title = targetUrl.split('//')[1]?.split('/')[0] || 'Page';
                        
                        const currentFrame = document.querySelector('iframe.active');
                        currentFrame.src = targetUrl;
                        
                        // Proxy detection logic
                        setTimeout(() => {
                            try { if(currentFrame.contentWindow.location.href === "about:blank") throw "err"; } 
                            catch(e) {
                                if (!targetUrl.includes('localhost')) {
                                    currentFrame.src = "${settings.proxy}/proxy?url=" + encodeURIComponent(targetUrl);
                                }
                            }
                        }, 1000);
                        renderTabs();
                    }

                    function toggleSettings() {
                        const m = document.getElementById('settings-menu');
                        m.style.display = (m.style.display === 'block') ? 'none' : 'block';
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

                    // Initialize first tab frame
                    const firstFrame = document.createElement('iframe');
                    firstFrame.className = 'active';
                    firstFrame.src = 'about:blank';
                    document.getElementById('frame-container').appendChild(firstFrame);
                    renderTabs();
                </script>
            </body>
            </html>
        `;
    }
}