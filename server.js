const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs'); 
const { URL } = require('url');
const app = express();
const PORT = 3000;

app.get('/live-host*', (req, res) => {
    const rootDir = req.query.dir;
    if (!rootDir) return res.status(400).send("No directory specified.");

    // Determine the physical path on the drive
    const relativePath = req.path.replace('/live-host', '') || '/';
    const absolutePath = path.join(rootDir, relativePath);

    if (!fs.existsSync(absolutePath)) {
        return res.status(404).send("File or Directory not found.");
    }

    const stats = fs.statSync(absolutePath);
    
    if (stats.isDirectory()) {
        const indexPath = path.join(absolutePath, 'index.html');
        
        // 1. If index.html exists, serve it
        if (fs.existsSync(indexPath)) {
            return res.sendFile(indexPath);
        } else {
            // 2. Otherwise, index all files (Like Live Server)
            const files = fs.readdirSync(absolutePath);
            let listHtml = `
                <html>
                <head>
                    <title>Index of ${relativePath}</title>
                    <style>
                        body { background: #0f0f0f; color: #eee; font-family: 'Segoe UI', sans-serif; padding: 40px; }
                        h2 { color: #28a745; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                        .file-list { list-style: none; padding: 0; }
                        .item { display: flex; align-items: center; padding: 10px; text-decoration: none; color: #ccc; border-bottom: 1px solid #222; transition: 0.2s; }
                        .item:hover { background: rgba(255,255,255,0.05); color: #fff; }
                        .icon { margin-right: 12px; font-size: 1.2em; }
                        .folder { color: #ff9800; font-weight: bold; }
                        .back { color: #888; margin-bottom: 20px; display: inline-block; text-decoration: none; }
                    </style>
                </head>
                <body>
                    <h2>Index of ${relativePath}</h2>
                    ${relativePath !== '/' ? `<a href="/live-host${path.dirname(relativePath)}?dir=${encodeURIComponent(rootDir)}" class="back">.. (Parent Directory)</a>` : ''}
                    <div class="file-list">
            `;

            files.forEach(file => {
                const isDir = fs.statSync(path.join(absolutePath, file)).isDirectory();
                // Ensure URLs are properly formatted for the webview to pick up
                const webPath = path.join('/live-host', relativePath, file).replace(/\\/g, '/');
                const link = `${webPath}?dir=${encodeURIComponent(rootDir)}`;
                
                listHtml += `
                    <a href="${link}" class="item ${isDir ? 'folder' : ''}">
                        <span class="icon">${isDir ? '📁' : '📄'}</span>
                        ${file}${isDir ? '/' : ''}
                    </a>`;
            });

            return res.send(listHtml + `</div></body></html>`);
        }
    }

    // 3. It's a file, just serve it
    res.sendFile(absolutePath);
});

// Helper for rewriting Proxy URLs
const rewriteUrls = (html, targetBase) => {
    const proxyBase = `http://localhost:${PORT}/proxy?url=`;
    return html
        .replace(/(href|src)="\/([^"\/][^"]*)"/g, `$1="${proxyBase}${targetBase}/$2"`)
        .replace(/(href|src)="(?!http|https|mailto|#)([^"]+)"/g, (match, p1, p2) => {
            if (p2.startsWith('/')) return match; 
            return `${p1}="${proxyBase}${targetBase}/${p2}"`;
        })
        .replace(/url\(['"]?\/([^'"]+)['"]?\)/g, `url("${proxyBase}${targetBase}/$1")`);
};

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl || targetUrl === 'about:blank') return res.status(400).send('URL missing');
    try {
        const parsedUrl = new URL(targetUrl);
        const origin = `${parsedUrl.protocol}//${parsedUrl.host}`;
        const response = await axios.get(targetUrl, {
            responseType: 'text',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval'; frame-ancestors *;");
        res.send(rewriteUrls(response.data, origin));
    } catch (e) { res.status(500).send(e.message); }
});

app.listen(PORT, () => console.log(`Liquid Engine running on ${PORT}`));