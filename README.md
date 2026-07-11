Securefy

> AI-powered browser extension that scans every website you visit and rates its risk level in real time.

[License](https://img.shields.io/badge/license-MIT-blue)
[Manifest](https://img.shields.io/badge/manifest-v3-green)
[Built with](https://img.shields.io/badge/built%20with-React%20%2B%20TypeScript-61dafb)

 Overview

Securefy automatically detects when you visit a website, analyzes it using AI, and instantly alerts you if the site shows signs of being dangerous — before you even realize it.

Features

| Category | What it detects |
|---|---|
| Phishing | Fake login pages, credential theft attempts |
| Malware | Sites likely to deliver malicious scripts or downloads |
| Impersonation | Sites pretending to be a legitimate brand |
| Fake News | Misinformation and manipulated content |
| Ponzi / Fraud | Fake investment and crypto schemes |

- Real-time scanning on every page visit
- Instant browser notifications for risky sites
- Detailed risk report with per-category breakdown
- Automatic dark/light theme
- AI powered by Groq (free tier)
- Rule-based fallback scanning — works even without an API key

---

 Screenshots

| Safe Site | Dangerous Site |
|---|---|
| ![safe](./screenshots/safe.png) | ![dangerous](./screenshots/dangerous.png) |

---

 Built With

- [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vitejs.dev) + [@crxjs/vite-plugin](https://crxjs.dev)
- [Groq AI](https://console.groq.com) — free, fast LLM inference
- Chrome Extension Manifest V3

---

 Installation

  Download the pre-built extension

1. Download [`url-guardian.zip`](./url-guardian.zip)
2. Extract the folder
3. Open `chrome://extensions` (or `edge://extensions`)
4. Enable Developer Mode (top right toggle)
5. Click **Load unpacked**
6. Select the extracted folder
7. Done 

---

##  Roadmap

- [ ] Publish to Chrome Web Store
- [ ] Add scan history log
- [ ] Add whitelist/blacklist custom rules
- [ ] Support Firefox

---

##  License

MIT © [Emmanuel Wisdom Nkwachukwu](https://github.com/wizzygrace247)


 Author

Built by [Emmanuel Wisdom Nkwachukwu](https://wizcrypt.netlify.com) — [GitHub](https://github.com/wizzygrace247) ·
