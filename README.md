# Dynamic Web Sidebar

A modern, glassmorphism-inspired web renderer for VS Code. Access documentation, search engines, or your own test sites directly from your activity bar.

## Features
- **Glassmorphism UI:** Sleek, liquid-glass design with animated gradient backgrounds.
- **Hybrid Rendering:** Automatically switches between direct rendering and proxy-bypass for sites like Google or GitHub.
- **Smart Navigation:** Simply type a URL and hit Enter.
- **Error Handling:** Custom dark-mode error screens for non-existent websites.

## How to Use
1. Click the **Web Browser** icon in the Activity Bar on the left.
2. Enter any URL (e.g., `google.com` or `wikipedia.org`) in the navigation bar.
3. Press **Enter** or click **Go**.

## Installation
If you are running this locally:
1. Clone the repo.
2. Run `npm install`.
3. Press `F5` to launch the Extension Development Host.

## Requirements
- VS Code v1.80.0+
- `axios` (for proxy rendering)

## Cautions
Some websites, like google.com and youtube.com don't allow themself to be in a iframe, and for some unknown reason local proxy rendering does not load them. The other website i found this on is github.com.

---
*Created with ❤️ by Lunar-Bytes, with help by google gemini*