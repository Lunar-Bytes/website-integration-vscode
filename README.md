# 🌊 Liquid Glass Web Browser

A high-performance, glassmorphism-inspired web renderer for VS Code. Bypass `X-Frame-Options` restrictions and preview your local projects, games, or documentation without ever leaving your editor.

---

## ✨ Features

* **Liquid Glass UI:** Modern sleek design with animated, interactive gradient backgrounds.
* **Proxy Bypass Engine:** Integrated Node.js proxy to render "un-iframeable" sites like **GitHub, Google, and Wikipedia**.
* **Base-URL Injection:** Automatically repairs broken images and styles when routing through the proxy.
* **Developer Mode:** Quick-launch local servers (Live Server, Vite, etc.) by just typing the port number (e.g., `5500`).
* **Customization:** Change your accent colors and toggle Dark Mode/Liquid Glass effects on the fly.
* **Persistence:** Keeps your game or site running even when you switch sidebar tabs.

---

## 🚀 Installation & Setup

### 1. The Extension
1. Clone the repository.
2. Run `npm install`.
3. Press `F5` to launch the **Extension Development Host**.

### 2. The Proxy Server (Required for GitHub/Google)
To bypass security headers, you must run the included proxy server:
1. Navigate to your server folder: `cd proxy-server-extension`.
2. Install dependencies: `npm install express axios`.
3. Start the server: `node server.js`.
4. In the extension settings (⚙️), set **Proxy URL** to `http://localhost:3000`.

---

## 🛠 How to Use

1.  **Activity Bar:** Click the 🌊 icon in the VS Code Activity Bar.
2.  **Navigate:** Enter a URL (e.g., `github.com`) and hit **Go**.
3.  **Local Dev:** Type a port number (e.g., `3000` or `5500`) to instantly preview your local projects.
4.  **Settings:** Click the ⚙️ icon to change the theme, accent color, or update your proxy address.

---

## 📦 Requirements

* **VS Code:** v1.80.0+
* **Node.js:** v18+ (for the proxy server)
* **Dependencies:** `express`, `axios`

---

## ⚠️ Notes on Security

This extension uses a proxy to strip `X-Frame-Options` and `Content-Security-Policy` headers. While this is perfect for development and browsing documentation, always be cautious when entering sensitive login information on external sites through a proxy.

---

> *Built with ❤️ by **Lunar-Bytes** | Co-piloted by **Gemini 3 Flash***