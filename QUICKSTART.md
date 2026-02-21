# Quick Start - Zenith AI Finance

## TL;DR - Run the App

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## What to Expect

### First Time Setup (2-5 minutes)
1. App loads with "Initializing..." screen
2. SDK initializes (this logs to console)
3. You'll see the Dashboard (empty at first)

### Using the App

1. **Log Your First Expense**
   - Click "💳 Log Expense" tab
   - Type: "Spent $25 on lunch at Chipotle"
   - Click "Log Expense"
   - AI will parse it automatically

2. **Download the LLM Model (First Time Only)**
   - When you log an expense, you'll see a banner: "Download LLM"
   - Click it to download the 250MB model
   - This happens once, then cached forever

3. **Ask the Coach**
   - Click "💬 Coach" tab  
   - Type: "How much did I spend?"
   - Coach uses your local data to answer

4. **View Dashboard**
   - Click "📊 Dashboard"
   - See your health score and insights

## Common Issues & Fixes

### "both async and sync fetching of the wasm failed"

**Cause**: WASM files not loading properly OR browser compatibility issue

**Fix**:
```bash
# 1. Hard refresh
Ctrl+Shift+R (or Cmd+Shift+R on Mac)

# 2. Clear everything and restart
# Close dev server (Ctrl+C)
rm -rf node_modules dist
npm install
npm run dev

# 3. Check browser
# Use Chrome 113+ or Edge 113+ (NOT Firefox/Safari)
# Enable hardware acceleration in chrome://settings
```

### "Cannot read image.png" or Vision errors

**Already Fixed**: VLM model removed from catalog. If you still see this:
1. Clear browser cache completely
2. Hard reload the page

### Models Not Downloading

**Fix**:
1. Open DevTools (F12) → Network tab
2. Look for failed HuggingFace requests
3. Check your internet connection
4. Try again in 5 minutes (HF rate limits)

### Blank Screen / No UI

**Fix**:
1. Check browser console (F12) for errors
2. Look for Cross-Origin-Isolation errors
3. Restart dev server: `npm run dev`

### Database Not Saving Data

**Fix**:
1. Don't use Incognito mode
2. Grant storage permissions when prompted
3. Check: chrome://settings/content/all → localhost

## Debugging Tips

### Enable Verbose Logging

Open browser console (F12) and look for:
```
[App] Starting initialization...
[DatabaseService] ...
[SDK] LlamaCPP backend registered
[SDK] ONNX backend registered
```

If you see errors here, that's where the problem is.

### Check Model Status

In console, type:
```javascript
RunAnywhere.getModelStatus('lfm2-350m-q4_k_m')
```

Should return: `'ready'` or `'not-downloaded'` or `'downloading'`

### Force CPU Mode

The app automatically uses CPU mode if WebGPU isn't available. The warnings about "racommons-llamacpp-webgpu" files are **normal** and **expected**.

## Performance

- **First load**: 30-60 seconds (SDK initialization)
- **Model download**: 2-5 minutes (one-time, ~250MB)
- **Expense logging**: 1-3 seconds (LLM parsing)
- **Coach responses**: 3-10 seconds (streaming)

## Browser Requirements

✅ **Supported**:
- Chrome 113+
- Edge 113+
- Brave 1.50+

❌ **Not Supported**:
- Firefox (no SharedArrayBuffer support)
- Safari (WASM issues)
- Mobile browsers (limited WASM support)

## Still Having Issues?

1. **Check the console** (F12) for specific error messages
2. **Clear everything**: Cache, cookies, storage
3. **Try a different browser** (Chrome/Edge recommended)
4. **Check GitHub Issues** for similar problems
5. **File a bug** with console output + browser version

## Success Checklist

- [ ] Dev server running on http://localhost:5173
- [ ] Page loads without errors
- [ ] Dashboard shows (even if empty)
- [ ] Can switch between tabs
- [ ] Can type in expense input
- [ ] LLM model download banner appears
- [ ] No red errors in console

If all checkboxes pass, you're ready to go!
