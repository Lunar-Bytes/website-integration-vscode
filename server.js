const express = require('express');
const axios = require('axios');
const { URL } = require('url');
const app = express();
const PORT = 3000;

// Helper to fix relative URLs in HTML/CSS
const rewriteUrls = (html, targetBase) => {
    const proxyBase = `http://localhost:${PORT}/proxy?url=`;
    
    return html
        // 1. Fix absolute paths (e.g., /style.css)
        .replace(/(href|src)="\/([^"\/][^"]*)"/g, `$1="${proxyBase}${targetBase}/$2"`)
        // 2. Fix relative paths (e.g., ./img.png)
        .replace(/(href|src)="(?!http|https|mailto|#)([^"]+)"/g, (match, p1, p2) => {
            if (p2.startsWith('/')) return match; 
            return `${p1}="${proxyBase}${targetBase}/${p2}"`;
        })
        // 3. Fix background-image: url('/...')
        .replace(/url\(['"]?\/([^'"]+)['"]?\)/g, `url("${proxyBase}${targetBase}/$1")`);
};

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl || targetUrl === 'about:blank') {
        return res.status(400).send('Enter a valid URL to begin.');
    }

    try {
        const parsedUrl = new URL(targetUrl);
        const origin = `${parsedUrl.protocol}//${parsedUrl.host}`;

        const response = await axios.get(targetUrl, {
            responseType: 'text',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': origin
            },
            timeout: 15000
        });

        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        
        res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval'; frame-ancestors *;");
        res.setHeader('X-Frame-Options', 'ALLOWALL');
        res.setHeader('Access-Control-Allow-Origin', '*');

        let cleanedHtml = rewriteUrls(response.data, origin);

        const frameBusterPatch = `
            <script>
                (function() {
                    try {
                        window.onbeforeunload = null;
                        window.top = window.self;
                        window.parent = window.self;
                        document.addEventListener('click', e => {
                            const link = e.target.closest('a');
                            if (link && link.href && !link.href.includes('localhost:${PORT}')) {
                                e.preventDefault();
                                window.location.href = 'http://localhost:${PORT}/proxy?url=' + encodeURIComponent(link.href);
                            }
                        }, true);
                    } catch (e) {}
                })();
            </script>
        `;
        
        if (cleanedHtml.includes('<head>')) {
            cleanedHtml = cleanedHtml.replace('<head>', '<head>' + frameBusterPatch);
        } else {
            cleanedHtml = frameBusterPatch + cleanedHtml;
        }

        res.send(cleanedHtml);

    } catch (error) {
        console.error('Proxy Error:', error.message);
        // Using standard strings here to avoid the "Invalid Character" backtick bug
        const errorHtml = '<body style="font-family:sans-serif; background:#0f0f0f; color:#ff6b6b; padding:40px; text-align:center;">' +
            '<div style="border: 1px solid #ff6b6b; padding: 20px; border-radius: 10px; display: inline-block;">' +
            '<h2>🌊 Connection Interrupted</h2>' +
            '<p style="color: #ccc;">' + error.message + '</p>' +
            '<p style="font-size: 12px; color: #666;">Try checking the URL or restarting the proxy server.</p>' +
            '</div>' +
            '</body>';
        res.status(500).send(errorHtml);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Liquid Glass Proxy Engine running at http://localhost:${PORT}`);
});