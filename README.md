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
*(Note: The first load takes 10–30 seconds to download and cache the AI models into your browser's storage.)*

---

## ✨ Features

### 1. Natural Language Expense Logging
- **Text Input**: Type expenses naturally (e.g., "Spent ₹450 on groceries at DMart")
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
"Spent ₹250 on lunch at Haldiram's"
"Chai this morning cost ₹30"
"₹1,500 electricity bill from BSES"
"Bought groceries at DMart for ₹800"
"Paid ₹499 for Swiggy One subscription"
```

**Voice Mode:**
1. Tap **Start Recording**
2. Speak naturally: *"I spent four hundred fifty rupees on groceries at DMart"*
3. AI will parse and save automatically

### Asking the Financial Coach

Try questions like:
- "Can I afford a ₹50,000 laptop?"
- "How can I reduce my spending this month?"
- "What are my biggest expenses?"
- "Am I spending too much on food delivery?"
- "How much should I save from my ₹50,000 salary?"
- "How much did I spend on Zomato and Swiggy this month?"
- "Am I on track with my monthly budget?"

The coach uses your last 30 days of data to provide personalized advice.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Vite |
| LLM | SmolLM2 360M (on-device) |
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
│   ├── db.ts               # SQLite operations
│   └── aiService.ts        # LLM integration
├── components/             # React UI components
│   ├── DashboardTab.tsx    # Health score & insights
│   ├── ExpenseTab.tsx      # Expense logger
│   ├── CoachTab.tsx        # AI chat interface
│   ├── BillsTab.tsx        # Recurring bills calendar
│   └── ModelDownloader.tsx # Download progress UI
├── styles/
│   └── index.css
├── sdk.ts                  # SDK initialization
└── App.tsx                 # Main app component
```

---

## 🤖 Model Configuration

Quantized models optimized for on-device inference:

| Model | Size |
|-------|------|
| SmolLM2 360M (LLM) | ~400 MB |
| **Total** | **~400 MB** |

> Models are downloaded once and cached in the browser's Origin Private File System (OPFS). After the first download, the app works completely offline.

---

## 🖥 Browser Requirements

- **Recommended**: Chrome 120+ or Edge 120+
- WebAssembly support
- SharedArrayBuffer (requires Cross-Origin Isolation headers)
- OPFS (for persistent model cache)
- 4GB+ RAM recommended

### Performance Tips
1. Use Chrome/Edge for best performance
2. First-time model download takes ~2–5 minutes (one-time only)
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
- [GitHub](https://github.com/RunanywhereAI/runanywhere-sdks)

---

## 🙏 Acknowledgments

Built with [RunAnywhere Web SDK](https://runanywhere.ai) — bringing AI to the edge, one browser at a time.

---

## License

MIT