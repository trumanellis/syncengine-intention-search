# SyncEngine Intention Search

P2P intention search system with WebAuthn authentication, OrbitDB synchronization, and semantic vector search.

## Features

- ✅ **WebAuthn Authentication** - Biometric security (Face ID, Touch ID, Windows Hello)
- ✅ **OrbitDB P2P Database** - Decentralized data storage with automatic sync
- ✅ **Semantic Vector Search** - AI-powered search using Transformers.js
- ✅ **Voice Input** - Web Speech API integration
- ✅ **Golden Ratio Cards** - Dynamic sizing based on relevance score
- ✅ **4-Screen Navigation** - Search → Results → List → Detail
- ✅ **SyncEngine Design System** - Cyan/Gold/Sage/Cream color palette

## Quick Start

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
syncengine-intention-search/
├── src/
│   ├── lib/
│   │   ├── IntentionSearch.svelte      # Main component (4 screens)
│   │   ├── intention-search-engine.js  # Vector search engine
│   │   ├── database.js                 # OrbitDB operations
│   │   ├── libp2p.js                   # P2P network setup
│   │   ├── verification.js             # Identity verification
│   │   ├── voice.js                    # Voice recognition
│   │   ├── mock-data.js                # Example intentions
│   │   └── components/
│   │       ├── IntentionCard.svelte
│   │       ├── VoiceButton.svelte
│   │       ├── CreateIntentionForm.svelte
│   │       └── IntentionDetail.svelte
│   ├── routes/
│   │   ├── +page.svelte
│   │   ├── +layout.svelte
│   │   └── +layout.js
│   ├── app.css                         # Design system
│   └── app.html
├── docs/
│   ├── ADAPTATION_PLAN.md              # Migration plan
│   ├── ORBITDB_INTEGRATION.md          # P2P setup guide
│   ├── PRACTICAL_INTENTIONS_GUIDE.md   # Data model
│   └── IMPLEMENTATION_SUMMARY.md       # Feature overview
├── package.json
├── vite.config.js
└── svelte.config.js
```

## Usage Flow

### 1. Authentication
- Create WebAuthn credential (first time)
- Authenticate with biometrics
- OrbitDB database opens automatically

### 2. Search
- Enter search query: "help moving", "teaching skills", etc.
- OR use voice input button 🎙️
- ML model generates semantic matches

### 3. Browse Results
- Cards sized by relevance (golden ratio)
- Larger cards = better match
- Click card for full details

### 4. Create Intentions
- Click "Create New" button
- Fill in title, description, location
- Add tags and category
- Intention syncs across P2P network

## Key Technologies

- **SvelteKit** - Web framework
- **OrbitDB** - P2P database
- **Helia/IPFS** - Content addressing
- **libp2p** - P2P networking
- **Transformers.js** - Browser-native ML (all-MiniLM-L6-v2)
- **WebAuthn** - Biometric authentication

## Design System

### Colors
- **Cyan** `#00FFD1` - Interactive elements
- **Gold** `#D4AF37` - Titles and value
- **Sage** `#84A98C` - Labels and context
- **Cream** `#F7F3E9` - Body text
- **BG** `#0a0e0f` - Background

### Typography
- **Font**: Exo (Google Fonts)
- **Sizes**: Responsive clamp() values
- **No glows, no shadows** - Flat design

### Components
- **Golden Ratio**: φ = 1.618 for card dimensions
- **Smooth transitions**: 0.3s ease
- **Accessible**: WCAG AAA compliant

## Browser Support

| Feature | Chrome | Safari | Edge | Firefox |
|---------|--------|--------|------|---------|
| WebAuthn | ✅ | ✅ | ✅ | ✅ |
| Voice Input | ✅ | ✅ | ✅ | ❌ |
| Transformers.js | ✅ | ✅ | ✅ | ✅ |
| OrbitDB | ✅ | ✅ | ✅ | ✅ |

## Performance

- **Search**: <200ms for 100 intentions
- **ML Model Load**: 3-5s (cached after first load)
- **Scroll**: 60fps with 50+ cards
- **P2P Sync**: Real-time across browser tabs

## Development

### Run Tests
```bash
npm run test
```

### Lint & Format
```bash
npm run lint
npm run format
```

### Type Check
```bash
npm run check
```

## Documentation

See the `docs/` folder for detailed guides:

- **ADAPTATION_PLAN.md** - Complete migration plan from TODO app
- **ORBITDB_INTEGRATION.md** - P2P database setup
- **PRACTICAL_INTENTIONS_GUIDE.md** - Data model and examples
- **IMPLEMENTATION_SUMMARY.md** - Feature overview

## Troubleshooting

### WebAuthn Not Working
- Ensure you're using HTTPS or localhost
- Check browser console for errors
- Try creating a new credential

### P2P Not Syncing
- Check that OrbitDB database opened successfully
- Look for libp2p connection logs
- Ensure both peers are on same network

### Search Not Finding Results
- Wait for ML model to load (check status bar)
- Ensure intentions have embeddings
- Try broader search terms

### Voice Input Not Working
- Only supported in Chrome, Safari, Edge
- Check microphone permissions
- Must be HTTPS or localhost

## Contributing

1. Follow the design system strictly
2. No glows, no shadows, flat design only
3. Use golden ratio for card dimensions
4. Test on multiple browsers
5. Keep performance targets

## License

MIT

## Acknowledgments

- Based on OrbitDB WebAuthn TODO demo
- Transformers.js by Hugging Face
- SyncEngine design system
- Protocol Labs (IPFS, libp2p)
