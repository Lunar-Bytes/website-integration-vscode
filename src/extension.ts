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

    constructor(private readonly _extensionUri: vscode.Uri, private readonly _context: vscode.ExtensionContext) {}

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };
        this.updateHtml();

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'startProxy': this.handleStartProxy(); break;
                case 'stopProxy': this.handleStopProxy(); break;
                case 'saveSettings':
                    this._context.globalState.update('webSettings', data.value).then(() => this.updateHtml());
                    break;
            }
        });
    }

    private handleStartProxy() {
        if (this._proxyProcess) return;
        const serverPath = path.join(this._context.extensionPath, 'server.js');
        this._proxyProcess = exec(`node "${serverPath}"`);
        setTimeout(() => this.updateHtml(), 600); 
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
        const settings = this._context.globalState.get('webSettings', { btnColor: '#28a745', darkMode: true });
        const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
        const proxyStatus = this._proxyProcess ? "🟢 Proxy Online" : "🔴 Proxy Offline";

        this._view.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    :root {
                        --accent: ${settings.btnColor};
                        --bg: ${settings.darkMode ? '#0f0f0f' : '#f5f5f5'};
                        --glass: rgba(30, 30, 30, 0.75);
                        --text: ${settings.darkMode ? '#eee' : '#111'};
                    }
                    body { margin: 0; padding: 0; font-family: sans-serif; background: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
                    
                    /* Liquid Glass Styling */
                    .blob-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; }
                    .blob { position: absolute; width: 600px; height: 600px; background: radial-gradient(circle, var(--accent) 0%, transparent 70%); filter: blur(90px); opacity: 0.25; animation: drift 22s infinite alternate; }
                    @keyframes drift { from { transform: translate(-25%, -25%); } to { transform: translate(55%, 55%); } }

                    .tab-strip { display: flex; background: rgba(0,0,0,0.25); padding: 5px 10px 0; gap: 4px; border-bottom: 1px solid rgba(255,255,255,0.1); }
                    .tab { padding: 6px 14px; font-size: 11px; cursor: pointer; background: rgba(255,255,255,0.05); border-radius: 6px 6px 0 0; opacity: 0.6; transition: 0.2s; border: 1px solid transparent; }
                    .tab.active { background: var(--glass); opacity: 1; border-top: 2px solid var(--accent); font-weight: bold; border-left: 1px solid rgba(255,255,255,0.1); border-right: 1px solid rgba(255,255,255,0.1); }
                    
                    .nav { display: flex; align-items: center; gap: 8px; padding: 10px; margin: 10px; background: var(--glass); backdrop-filter: blur(25px); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
                    input { flex-grow: 1; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 8px; border-radius: 6px; outline: none; }
                    
                    #settings-menu { display: none; position: absolute; top: 110px; left: 10px; right: 10px; padding: 20px; z-index: 100; background: var(--glass); backdrop-filter: blur(45px); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
                    
                    .frame-container { flex-grow: 1; position: relative; margin: 0 10px 10px; background: #fff; border-radius: 10px; overflow: hidden; }
                    iframe { position: absolute; width: 100%; height: 100%; border: none; display: none; }
                    iframe.active { display: block; }
                    
                    button { color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; background: var(--accent); font-weight: bold; transition: 0.2s; }
                    button:hover { filter: brightness(1.2); transform: translateY(-1px); }
                </style>
            </head>
            <body>
                <div class="blob-bg"><div class="blob"></div></div>
                <div class="tab-strip" id="tab-strip"></div>
                <div class="nav">
                    <div onclick="toggleSettings()" style="cursor:pointer; font-size: 1.3em;">⚙️</div>
                    <input type="text" id="url-bar" placeholder="URL or Project Path..." onkeydown="if(event.key==='Enter') navigate()">
                    <button onclick="navigate()">Go</button>
                    <button onclick="goLive()" style="background:#ff9800">Live</button>
                </div>

                <div id="settings-menu">
                    <div style="margin-bottom:15px; font-size: 14px;">Server: <b>${proxyStatus}</b></div>
                    <button onclick="vscode.postMessage({type:'${this._proxyProcess ? 'stopProxy' : 'startProxy'}'})" 
                            style="width:100%; margin-bottom:12px; background: ${this._proxyProcess ? '#cc3300' : 'var(--accent)'}">
                        ${this._proxyProcess ? 'Close Proxy' : 'Open Proxy'}
                    </button>
                    <button onclick="toggleSettings()" style="width:100%; background:#444">Back</button>
                </div>

                <div class="frame-container" id="frame-container">
                    <div id="empty" style="display:flex; align-items:center; justify-content:center; height:100%; color:#888; font-style:italic;">Liquid Glass Ready</div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const wsPath = ${JSON.stringify(workspaceFolder)};
                    let activeTabIndex = 0;
                    let tabs = [{ title: 'Home', url: '', loaded: false }];

                    function renderTabs() {
                        const strip = document.getElementById('tab-strip');
                        strip.innerHTML = tabs.map((t, i) => \`
                            <div class="tab \${i === activeTabIndex ? 'active' : ''}" onclick="switchTab(\${i})">\${t.title}</div>
                        \`).join('') + '<div onclick="addTab()" style="cursor:pointer; padding:5px; color:var(--accent); font-weight:bold;">+</div>';
                    }

                    function switchTab(i) {
                        activeTabIndex = i;
                        document.querySelectorAll('iframe').forEach(f => f.className = '');
                        const frame = document.getElementById('f-' + i);
                        if(frame) frame.className = 'active';
                        document.getElementById('empty').style.display = tabs[i].loaded ? 'none' : 'flex';
                        document.getElementById('url-bar').value = tabs[i].url;
                        renderTabs();
                    }

                    function addTab() { tabs.push({ title: 'New Tab', url: '', loaded: false }); switchTab(tabs.length - 1); }

                    function navigate(override) {
                        const val = (override || document.getElementById('url-bar').value).trim();
                        if(!val) return;
                        
                        let target = val;
                        if (!val.startsWith('http') && !val.includes('localhost')) target = 'https://' + val;

                        tabs[activeTabIndex].url = val;
                        tabs[activeTabIndex].loaded = true;
                        tabs[activeTabIndex].title = target.includes('live-host') ? '📁 Local' : '🌐 Web';

                        let frame = document.getElementById('f-' + activeTabIndex);
                        if(!frame) {
                            frame = document.createElement('iframe');
                            frame.id = 'f-' + activeTabIndex;
                            document.getElementById('frame-container').appendChild(frame);
                        }
                        frame.className = 'active';
                        document.getElementById('empty').style.display = 'none';

                        // Proxy logic
                        const isLocal = target.includes('localhost');
                        frame.src = isLocal ? target : "http://localhost:3000/proxy?url=" + encodeURIComponent(target);
                        renderTabs();
                    }

                    function goLive() {
                        if(!wsPath) return alert("Please open a folder first!");
                        // Request the root directory
                        navigate("http://localhost:3000/live-host/?dir=" + encodeURIComponent(wsPath));
                    }

                    function toggleSettings() {
                        const s = document.getElementById('settings-menu');
                        s.style.display = (s.style.display === 'block') ? 'none' : 'block';
                    }
                    renderTabs();
                </script>
            </body>
            </html>
        `;
    }
}