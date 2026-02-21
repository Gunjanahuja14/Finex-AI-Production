# Finex AI — On-Device Financial Assistant

**Status: ✅ FULLY WORKING - NO ERRORS**

A privacy-first, on-device AI financial assistant. All AI processing (LLM, STT, TTS, VAD) happens locally in your browser — zero cloud data leakage.

---

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — App loads in 5–10 seconds, no errors!

---

## ✨ Features

### 1. Natural Language Expense Logging
- **Text Input**: Type expenses naturally (e.g., "Spent $45 on groceries at Whole Foods")
- **Voice Input**: Use speech-to-text to log expenses hands-free
- **AI Parsing**: On-device LLM extracts amount, category, vendor, and item automatically
- **Local Storage**: All transactions saved in browser's local SQLite database

### 2. Privacy-First Financial Coach
- **AI Advisor**: Ask questions about your spending, savings, and financial health
- **RAG Context**: Coach uses your local transaction data to provide personalized advice
- **Streaming Responses**: Real-time token streaming for smooth UX
- **Zero Cloud**: All inference happens on your device

### 3. Financial Health Dashboard
- **Wellness Score**: 0–100 score based on savings rate and budget adherence
- **Spending Trends**: Track if spending is increasing, stable, or decreasing
- **Category Breakdown**: Visual charts showing top spending categories
- **Daily Tips**: AI-generated bite-sized financial advice

### 4. Bill Prediction Calendar
- **Pattern Detection**: AI analyzes transactions to detect recurring bills
- **Confidence Scores**: Shows how confident the system is about each pattern
- **Visual Calendar**: See predicted bills on a monthly calendar
- **Cash Flow Planning**: Avoid surprises with predicted upcoming expenses

### 5. Anomaly & Fraud Detection
- **Baseline Analysis**: Establishes normal spending per category
- **Real-time Alerts**: Warns when transactions exceed 200% of baseline
- **Severity Levels**: Low, medium, and high severity indicators

---

## 💬 Usage

### Logging an Expense

**Text Mode:**
```
"Spent $25.50 on lunch at Chipotle"
"Coffee this morning cost $4.50"
"$150 electric bill from PG&E"
```

**Voice Mode:**
1. Tap **Start Recording**
2. Speak naturally: *"I spent forty five dollars on groceries at Safeway"*
3. AI will parse and save automatically

### Asking the Financial Coach

Try questions like:
- "Can I afford a $500 laptop?"
- "How can I reduce my spending?"
- "What are my biggest expenses?"
- "Am I spending too much on food?"
- "How much should I save each month?"

The coach uses your last 30 days of data to provide personalized advice.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Vite |
| LLM | LFM2 350M (on-device) |
| Speech-to-Text | Whisper Tiny English |
| Text-to-Speech | Piper TTS |
| Voice Activity Detection | Silero VAD v5 |
| Local Database | SQL.js (SQLite in browser) |
| Charts | Recharts |
| Date Utilities | date-fns |
| AI Engine | RunAnywhere Web SDK |

---

## 🔒 Privacy Guarantee

- **100% Local Processing** — All AI inference happens in your browser
- **No External APIs** — Zero network calls for model inference
- **Local Database** — Transactions stored in browser's IndexedDB/localStorage
- **No Tracking** — No analytics, no telemetry, no data collection

---

## 📁 Project Structure

```
src/
├── models/                 # TypeScript types & data models
│   └── Transaction.ts
├── services/               # Core business logic
│   ├── DatabaseService.ts  # SQLite operations
│   └── AIService.ts        # LLM/STT/TTS integration
├── components/             # React UI components
│   ├── DashboardTab.tsx    # Health score & insights
│   ├── ExpenseTab.tsx      # Expense logger
│   ├── CoachTab.tsx        # AI chat interface
│   ├── BillsTab.tsx        # Recurring bills calendar
│   └── ModelBanner.tsx     # Download progress UI
├── hooks/                  # React hooks
│   └── useModelLoader.ts
├── workers/
│   └── vlm-worker.ts
├── styles/
│   └── index.css
├── runanywhere.ts          # SDK initialization
└── App.tsx                 # Main app component
```

---

## 🤖 Model Configuration

Quantized models optimized for on-device inference:

| Model | Size |
|-------|------|
| LFM2-350M-Q4_K_M (LLM) | ~250 MB |
| Whisper Tiny English (STT) | ~105 MB |
| Piper TTS Lessac Medium (TTS) | ~65 MB |
| Silero VAD v5 | ~5 MB |
| **Total** | **~425 MB** |

> Models are downloaded once and cached in the browser's Origin Private File System (OPFS).

---

## 🚀 Deployment

### Vercel
```bash
npm run build
npx vercel --prod
```
The included `vercel.json` sets the required Cross-Origin-Isolation headers.

### Netlify
Add a `_headers` file:
```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: credentialless
```

### Any Static Host
Serve the `dist/` folder with these HTTP headers on all responses:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

---

## 🖥 Browser Requirements

- Chrome 96+ or Edge 96+ (recommended: 120+)
- WebAssembly support
- SharedArrayBuffer (requires Cross-Origin Isolation headers)
- OPFS (for persistent model cache)
- 4GB+ RAM recommended for smooth operation

### Performance Tips
1. Use Chrome/Edge for **WebGPU acceleration** (10x faster inference)
2. Falls back to WASM if WebGPU is unavailable
3. First-time model download takes ~5 minutes (one-time only)
4. Clearing browser cache will delete stored transaction data

---

## 🔧 Troubleshooting

### Models Not Downloading
1. Open DevTools → Application → Storage
2. Clear OPFS (Origin Private File System) data
3. Reload and re-download models

### Slow Performance
1. Use Chrome 113+ or Edge 113+ for WebGPU support
2. Enable hardware acceleration in browser settings
3. Close other tabs to free up memory

### Voice Input Not Working
1. Grant microphone permissions when prompted
2. Ensure VAD + STT models are fully downloaded
3. Test microphone in browser settings

### Database Not Persisting
1. Use normal browsing mode (not incognito)
2. Check browser storage permissions
3. Free up browser storage space

### AI Giving Incorrect Calculations
The LFM2 350M model is not reliable for arithmetic. Always compute totals in your backend/code and pass the result to the model — never let the LLM calculate sums itself.

---

## 🗺 Future Enhancements

- [ ] Budget planning & goal tracking
- [ ] Multi-currency support
- [ ] Export data (CSV, PDF reports)
- [ ] Shared expenses with family/roommates
- [ ] Bank account integration (read-only, local parsing)
- [ ] Voice-controlled UI navigation

---

## 📚 Documentation

- [RunAnywhere SDK API Reference](https://docs.runanywhere.ai)
- [npm package](https://www.npmjs.com/package/@runanywhere/web)
- [GitHub](https://github.com/RunanywhereAI/runanywhere-sdks)

---

## 🙏 Acknowledgments

Built with [RunAnywhere Web SDK](https://runanywhere.ai) — bringing AI to the edge, one browser at a time.

---

## License

MIT
