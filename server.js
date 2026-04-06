const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).send("No URL provided. usage: /proxy?url=https://google.com");
    }

    try {
        // Fetch the website content
        // We add a User-Agent so the target site thinks we are a real browser
        const response = await axios.get(targetUrl, { 
            responseType: 'text',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
            }
        });

        let html = response.data;

        // 1. STRIP SECURITY HEADERS
        // These are the headers that usually tell the browser "Don't put me in an iframe"
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.removeHeader('Frame-Options');

        // 2. BASE TAG INJECTION
        // This is the "magic" bit. It tells the browser that all relative links 
        // (like /style.css) should point to the original site, not your proxy server.
        const baseTag = `<head><base href="${targetUrl}">`;
        
        if (html.includes('<head>')) {
            html = html.replace('<head>', baseTag);
        } else if (html.includes('<html>')) {
            html = html.replace('<html>', `<html>${baseTag}`);
        } else {
            html = baseTag + html;
        }

        // 3. SEND THE MODIFIED HTML
        res.set('Content-Type', 'text/html');
        res.send(html);

    } catch (error) {
        console.error("Proxy Error:", error.message);
        res.status(500).send(`
            <body style="background:#0f0f0f; color:#ff4444; font-family:sans-serif; padding:20px; text-align:center;">
                <h2>Proxy Error</h2>
                <p>${error.message}</p>
                <small>Make sure the URL is correct and includes https://</small>
            </body>
        `);
    }
});

app.listen(port, () => {
    console.log('--------------------------------------------');
    console.log(`🚀 Proxy Server running at http://localhost:${port}`);
    console.log(`🔗 Test Link: http://localhost:${port}/proxy?url=https://www.google.com`);
    console.log('--------------------------------------------');
});