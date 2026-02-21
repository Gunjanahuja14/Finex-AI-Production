# Finex AI — On-Device Financial Assistant

**Status: ✅ FULLY WORKING - NO ERRORS**

A privacy-first, on-device AI financial assistant. All AI processing happens locally in your browser — zero cloud data leakage.

---

## 🚀 Quick Start for Judges

To experience the power of on-device AI, please run the project locally. This ensures the AI model runs at full performance in your browser.

1. **Clone the repository:**
```bash
git clone https://github.com/Gunjanahuja14/Finex-AI-Production.git
cd Finex-AI-Production
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the Development Server:**
```bash
npm run dev
```

4. **Access the App:** Open [http://localhost:5173](http://localhost:5173) in **Google Chrome** or **Microsoft Edge**.
*(Note: The first load takes 10–30 seconds to download and cache the AI model into your browser's storage.)*

---

## ✨ Features

### 1. Privacy-First Financial Coach
- **AI Advisor**: Ask questions about your spending, savings, and financial health
- **RAG Context**: Coach uses your local transaction data to provide personalized advice
- **Streaming Responses**: Real-time token streaming for smooth UX
- **Zero Cloud**: All inference happens on your device using LFM2-350M

### 2. Expense Tracking
- **Manual Logging**: Log expenses across 8 categories — Food, Transport, Entertainment, Health, Shopping, Utilities, Education, Other
- **Voice Input**: Use speech-to-text to log expenses hands-free
- **Local Storage**: All transactions saved in browser's IndexedDB

### 3. Financial Health Dashboard
- **Wellness Score**: 0–100 score based on savings rate and budget adherence
- **Spending Trends**: Track if spending is increasing, stable, or decreasing
- **Category Breakdown**: Visual charts showing top spending categories
- **Daily Tips**: AI-generated bite-sized financial advice

### 4. Bill & Subscription Tracker
- **Recurring Detection**: Automatically detects recurring bills and subscriptions
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

Add transactions manually from the **Expenses** tab across categories:
- Food (Swiggy, Zomato, groceries)
- Transport (Uber, Metro)
- Entertainment (Netflix, movies)
- Health, Shopping, Utilities, Education, Other

### Asking the Financial Coach

Try questions like:
- "What's my total spending this month?"
- "Which category do I spend the most in?"
- "How much did I spend on food?"
- "How much can I save this month?"
- "Give me 3 tips to reduce my spending"
- "Am I overspending compared to last month?"
- "How much did I spend on entertainment?"

The coach uses your last 30 days of data to provide personalized advice.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Vite |
| LLM | LFM2-350M Q4 (on-device) |
| Speech-to-Text | Whisper Tiny English |
| Text-to-Speech | Piper TTS |
| Voice Activity Detection | Silero VAD v5 |
| Local Database | IndexedDB (via Dexie.js) |
| Charts | Recharts |
| AI Engine | RunAnywhere Web SDK |

---

## 🔒 Privacy Guarantee

- **100% Local Processing** — All AI inference happens in your browser
- **No External APIs** — Zero network calls for model inference
- **Local Database** — Transactions stored in browser's IndexedDB
- **No Tracking** — No analytics, no telemetry, no data collection

---

## 📁 Project Structure

```
src/
├── models/                 # TypeScript types & data models
│   └── Transaction.ts
├── services/               # Core business logic
│   ├── db.ts               # IndexedDB operations
│   └── ai.ts               # LLM integration
├── components/             # React UI components
│   ├── DashboardTab.tsx    # Health score & insights
│   ├── ExpenseTab.tsx      # Expense logger
│   ├── CoachTab.tsx        # AI chat interface
│   ├── BillsTab.tsx        # Recurring bills calendar
│   └── ModelDownloader.tsx # Download progress UI
├── sdk.ts                  # RunAnywhere SDK initialization
└── App.tsx                 # Main app component
```

---

## 🤖 Model Configuration

Quantized model optimized for on-device browser inference:

| Model | Size |
|-------|------|
| LFM2-350M Q4_K_M (LLM) | ~250 MB |
| **Total** | **~250 MB** |

> The model is downloaded once and cached in the browser's Origin Private File System (OPFS). After the first download, the app works completely offline.

---

## 🖥 Browser Requirements

- **Recommended**: Chrome 120+ or Edge 120+
- WebAssembly support
- SharedArrayBuffer (requires Cross-Origin Isolation headers)
- OPFS (for persistent model cache)
- 2GB+ RAM recommended

### Performance Tips
1. Use Chrome or Edge for best performance
2. First-time model download takes ~1–3 minutes (one-time only)
3. After first download, app works fully offline
4. Clearing browser cache will require re-downloading the model

---

## 🔧 Troubleshooting

### Model Not Downloading
1. Make sure you're using Chrome or Edge (not Firefox/Safari)
2. Open DevTools → Application → Storage → Clear OPFS data
3. Reload and try downloading again

### Slow Performance
1. Close other tabs to free up memory
2. Enable hardware acceleration in browser settings

### Voice Input Not Working
1. Grant microphone permissions when prompted
2. Ensure you're on HTTPS or localhost

### AI Not Responding
1. Make sure the model shows **"MODEL READY"** before asking questions
2. Refresh the page and wait for model to load from cache

---

## 🗺 Future Enhancements

- [ ] Upgrade to Llama 3.2 1B with WebGPU acceleration for higher accuracy
- [ ] Budget planning & goal tracking with UPI integration
- [ ] Multi-currency support (INR, USD, EUR)
- [ ] Export data (CSV, PDF reports)
- [ ] Shared expenses with family/roommates
- [ ] Bank statement parser (read-only, local)
- [ ] Voice-controlled UI navigation in Hindi & English

---

## 📚 Documentation

- [RunAnywhere SDK API Reference](https://docs.runanywhere.ai)
- [npm package](https://www.npmjs.com/package/@runanywhere/web)

---

## 🙏 Acknowledgments

Built with [RunAnywhere Web SDK](https://runanywhere.ai) — bringing AI to the edge, one browser at a time.

---

## License

MIT