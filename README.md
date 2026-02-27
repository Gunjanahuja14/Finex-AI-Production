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
- **AI Advisor**: Ask questions about your spending, savings, budget limits, and financial health
- **Budget Awareness**: Coach knows your per-category budgets and tells you how close you are to limits in real time
- **RAG Context**: Coach uses your local transaction data to provide personalized advice
- **Streaming Responses**: Real-time token streaming for smooth UX
- **Zero Cloud**: All inference happens on your device using Gemma 2B Instruct (Q4_K_M)

### 2. Expense Tracking
- **Manual Logging**: Log expenses across 8 categories — Food, Transport, Entertainment, Health, Shopping, Utilities, Education, Other
- **Savings Tracking**: Dedicated Savings category treated as wealth accumulation, not an expense
- **Voice Input**: Use speech-to-text to log expenses hands-free via Whisper Tiny English
- **Local Storage**: All transactions saved in browser's localStorage with full add/edit/delete support
- **Sample Data**: Pre-seeded realistic 6-month dataset to explore the app immediately

### 3. Financial Health Dashboard
- **Wellness Score**: 0–100 risk score based on savings rate and budget adherence
- **Financial Health Label**: Excellent / Good / Needs Work / Critical based on real spending patterns
- **Spending Trends**: Track if spending is increasing, stable, or decreasing
- **Category Breakdown**: Visual charts showing top spending categories
- **Daily Tips**: AI-generated bite-sized financial advice

### 4. Budget Management
- **Per-Category Budgets**: Set monthly spending limits for all 8 expense categories
- **Live Progress Bars**: See how much of each budget is consumed at a glance
- **Overspending Alerts**: Automatic warnings when any category crosses 70% of its limit
- **Edit & Reset**: Modify budgets anytime from the Insights tab — saved locally on your device
- **Coach Integration**: Ask the AI coach "what is my budget?" or "how much left for food?" for instant budget status

### 5. Bill & Subscription Tracker
- **Recurring Detection**: Automatically detects recurring bills and subscriptions
- **Confidence Scores**: Shows how confident the system is about each pattern
- **Visual Calendar**: See predicted bills on a monthly calendar
- **Cash Flow Planning**: Avoid surprises with predicted upcoming expenses

### 6. Insights & Analytics
- **6-Month Spending Trend**: Line chart comparing your monthly expenses over time
- **Weekend vs Weekday Analysis**: Detects if you overspend on weekends
- **AI Recommendations**: Personalized action cards (high / medium / low impact) derived from your real data
- **Savings Overview**: Track savings rate, month-over-month growth, and progress toward 20% goal
- **Anomaly Detection**: Flags transactions that are 200%+ above your normal category average

### 7. Voice Interface
- **Voice Input (STT)**: Speak your questions to the AI coach using Whisper Tiny English via sherpa-onnx
- **Voice Output (TTS)**: Hear coach responses read aloud using Piper TTS
- **Voice Activity Detection**: Silero VAD v5 automatically detects when you start and stop speaking

---

## 💬 Usage

### Logging an Expense

Add transactions manually from the **Expenses** tab across categories:
- Food (Swiggy, Zomato, groceries)
- Transport (Uber, Metro, Rapido)
- Entertainment (Netflix, Spotify, movies)
- Health, Shopping, Utilities, Education, Other
- Savings (SIP, FD, RD — tracked separately as wealth)

### Asking the Financial Coach

Try questions like:
- "What's my total spending this month?"
- "Which category do I spend the most in?"
- "How much did I spend on food?"
- "What is my budget for transport?"
- "What is my budget?" *(shows all categories at once)*
- "How much can I save this month?"
- "Can I afford a ₹5000 purchase?"
- "Give me 3 tips to reduce my spending"
- "Am I overspending compared to last month?"
- "How much did I spend on entertainment?"
- "What are my upcoming bills?"

The coach uses your last 30 days of data and your saved budgets to provide personalized advice.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Vite |
| LLM | Gemma 2B Instruct Q4_K_M (on-device via WebAssembly + WebGPU) |
| Speech-to-Text (STT) | Whisper Tiny English via sherpa-onnx |
| Text-to-Speech (TTS) | Piper TTS |
| Voice Activity Detection (VAD) | Silero VAD v5 |
| Local Database | localStorage (SimpleDB) |
| AI Engine | RunAnywhere Web SDK |

---

## 🤖 Model Configuration

Quantized models optimized for on-device browser inference:

| Model | Purpose | Size |
|-------|---------|------|
| Gemma 2B Instruct Q4_K_M | Financial coaching LLM | ~1.5 GB |
| Whisper Tiny English (sherpa-onnx) | Voice-to-text input | ~40 MB |
| Piper TTS | Text-to-speech output | ~60 MB |
| Silero VAD v5 | Voice activity detection | ~2 MB |
| **Total** | | **~1.6 GB** |

> All models are downloaded once and cached in the browser's Origin Private File System (OPFS). After the first download, the app works completely offline.

---

## 🔒 Privacy Guarantee

- **100% Local Processing** — All AI inference happens in your browser
- **No External APIs** — Zero network calls for model inference
- **Local Database** — Transactions stored in browser's localStorage
- **0 KB Sent to Cloud** — Verified in the app header at all times
- **No Tracking** — No analytics, no telemetry, no data collection

---

## 📁 Project Structure

```
src/
├── models/                 # TypeScript types & data models
│   └── Transaction.ts
├── services/               # Core business logic
│   ├── db.ts               # localStorage DB with sample data seeding
│   ├── ai.ts               # LLM integration + budget-aware finance engine
│   ├── financeEngine.ts    # Deterministic accounting layer
│   ├── llama-wasm.ts       # Gemma 2B WebAssembly bridge
│   └── voice.ts            # STT / TTS / VAD orchestration
├── components/             # React UI components
│   ├── DashboardTab.tsx    # Health score & overview
│   ├── ExpenseTab.tsx      # Expense logger & transaction list
│   ├── CoachTab.tsx        # AI chat interface with voice I/O
│   ├── BillsTab.tsx        # Recurring bills & subscription tracker
│   ├── InsightsTab.tsx     # Analytics, budget management & AI recommendations
│   └── ModelDownloader.tsx # Download progress UI
├── sdk.ts                  # RunAnywhere SDK initialization
└── App.tsx                 # Main app component
```

---

## 🖥 Browser Requirements

- **Recommended**: Chrome 120+ or Edge 120+
- WebAssembly + WebGPU support
- SharedArrayBuffer (requires Cross-Origin Isolation headers)
- OPFS (for persistent model cache)
- 2GB+ RAM recommended (4GB+ for best performance with Gemma 2B)

### Performance Tips
1. Use Chrome or Edge for best performance
2. First-time model download takes ~3–5 minutes (one-time only)
3. After first download, app works fully offline
4. Clearing browser cache will require re-downloading the models

---

## 🔧 Troubleshooting

### Model Not Downloading
1. Make sure you're using Chrome or Edge (not Firefox/Safari)
2. Open DevTools → Application → Storage → Clear OPFS data
3. Reload and try downloading again

### Slow Performance
1. Close other tabs to free up memory
2. Enable hardware acceleration in browser settings
3. Ensure WebGPU is enabled: navigate to `chrome://flags/#enable-unsafe-webgpu`

### Voice Input Not Working
1. Grant microphone permissions when prompted
2. Ensure you're on HTTPS or localhost
3. Check that Whisper model has finished downloading

### AI Not Responding
1. Make sure the model shows **"MODEL READY"** before asking questions
2. Refresh the page and wait for model to load from cache

---

## 🗺 Future Enhancements

- [ ] Upgrade to Llama 3.2 1B with full WebGPU acceleration for higher accuracy
- [ ] UPI integration for automatic transaction import
- [ ] Budget planning & goal tracking with milestone notifications
- [ ] Multi-currency support (INR, USD, EUR)
- [ ] Export data (CSV, PDF reports)
- [ ] Shared expenses with family/roommates
- [ ] Bank statement parser (read-only, local)
- [ ] Voice-controlled UI navigation in Hindi & English
- [ ] Recurring bill auto-categorization using on-device NLP

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