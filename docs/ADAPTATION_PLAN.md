# 📋 SyncEngine Intention Search - Implementation Plan

## Overview
Adapt the WebAuthn TODO demo app structure to build a P2P intention search system with semantic vector search, voice input, and golden-ratio card layouts.

---

## Phase 1: Core Structure Analysis

### Source: WebAuthn TODO Demo
```
webauthn-todo-demo/
├── src/
│   ├── lib/
│   │   ├── WebAuthnTodo.svelte      # Main component (CRUD UI)
│   │   ├── database.js               # OrbitDB operations
│   │   ├── libp2p.js                 # P2P network setup
│   │   ├── verification.js           # Identity verification
│   │   ├── theme.js                  # Carbon theme (optional)
│   │   ├── index.js                  # Exports
│   │   └── components/
│   │       └── IdentityVerificationBadge.svelte
│   ├── routes/
│   │   ├── +page.svelte              # Entry page
│   │   ├── +layout.svelte            # Layout wrapper
│   │   └── +layout.js                # CSR config
│   └── app.html                      # HTML template
├── static/                           # Static assets
├── package.json
├── vite.config.js
├── svelte.config.js
└── jsconfig.json
```

### Target: SyncEngine Intention Search
```
syncengine-intention-search/
├── src/
│   ├── lib/
│   │   ├── IntentionSearch.svelte      # Main UI (4 screens)
│   │   ├── intention-search-engine.js  # Vector search
│   │   ├── database.js                 # OrbitDB for intentions
│   │   ├── libp2p.js                   # P2P setup (reuse)
│   │   ├── verification.js             # Identity verification (reuse)
│   │   ├── voice.js                    # Voice recognition (NEW)
│   │   └── components/
│   │       ├── IntentionCard.svelte        # Golden-ratio cards
│   │       ├── CreateIntentionForm.svelte  # Create modal
│   │       ├── IntentionDetail.svelte      # Fullscreen view
│   │       └── VoiceButton.svelte          # Voice input
│   ├── routes/
│   │   ├── +page.svelte
│   │   ├── +layout.svelte
│   │   └── +layout.js
│   └── app.html
├── static/
├── package.json (modified dependencies)
├── vite.config.js (add Transformers.js config)
└── svelte.config.js
```

---

## Phase 2: File-by-File Mapping

### ✅ Files to Copy As-Is
| Source | Destination | Purpose |
|--------|-------------|---------|
| `src/lib/libp2p.js` | `src/lib/libp2p.js` | P2P network setup |
| `src/lib/verification.js` | `src/lib/verification.js` | Identity verification |
| `src/routes/+layout.js` | `src/routes/+layout.js` | CSR configuration |
| `svelte.config.js` | `svelte.config.js` | SvelteKit config |
| `jsconfig.json` | `jsconfig.json` | TypeScript config |
| `eslint.config.js` | `eslint.config.js` | Linting config |
| `.prettierrc` | `.prettierrc` | Code formatting |
| `.prettierignore` | `.prettierignore` | Format ignores |
| `.gitignore` | `.gitignore` | Git ignores |
| `.npmrc` | `.npmrc` | NPM config |

### 🔧 Files to Adapt (Major Changes)
| Source | Destination | Changes Needed |
|--------|-------------|----------------|
| `src/lib/database.js` | `src/lib/database.js` | - Change from KeyValue to Documents DB<br>- Replace TODO CRUD with Intention CRUD<br>- Add embedding field support<br>- Add geo-location queries |
| `src/lib/WebAuthnTodo.svelte` | `src/lib/IntentionSearch.svelte` | - Complete UI overhaul (4 screens)<br>- Add search input & voice button<br>- Implement golden-ratio cards<br>- Add create intention form<br>- Add detail view modal |
| `package.json` | `package.json` | - Add: `@xenova/transformers`<br>- Keep: OrbitDB, Helia, libp2p<br>- Remove: carbon-components-svelte (optional) |
| `vite.config.js` | `vite.config.js` | - Add Transformers.js WASM support<br>- Configure top-level await |

### 🆕 New Files to Create
| File | Purpose |
|------|---------|
| `src/lib/intention-search-engine.js` | Vector search with Transformers.js (from refs/) |
| `src/lib/voice.js` | Web Speech API integration |
| `src/lib/components/IntentionCard.svelte` | Golden-ratio biocard component |
| `src/lib/components/CreateIntentionForm.svelte` | Form to create new intentions |
| `src/lib/components/IntentionDetail.svelte` | Fullscreen intention view |
| `src/lib/components/VoiceButton.svelte` | Voice input button |
| `src/lib/mock-data.js` | Practical intention examples (from refs/) |
| `src/app.css` | SyncEngine design system (Cyan/Gold/Sage/Cream) |

### ❌ Files to Exclude (Not Needed)
- `src/lib/theme.js` (Carbon Design theme - replaced by custom design)
- `src/lib/components/IdentityVerificationBadge.svelte` (TODO-specific)
- `static/*.svg` (Protocol Labs logos - replace with SyncEngine assets)

---

## Phase 3: Step-by-Step Implementation Plan

### Step 1: Setup Fresh Directory Structure ✅
### Step 2: Create Directory Structure ✅
### Step 3: Copy P2P Infrastructure (Reusable) ✅
### Step 4: Create Modified package.json 🔧
### Step 5: Modify vite.config.js for Transformers.js 🔧
### Step 6: Create intention-search-engine.js 🆕
### Step 7: Create Adapted database.js 🔧
### Step 8: Create Voice Recognition Module 🆕
### Step 9: Create Mock Data 🆕
### Step 10: Create Main IntentionSearch Component 🔧
### Step 11: Create Component Files 🆕
### Step 12: Create Design System CSS 🆕
### Step 13: Update Routes 🔧
### Step 14: Copy Documentation 📖
### Step 15: Install & Test ✅

---

## Phase 4: Key Differences Summary

| Aspect | TODO App | Intention App |
|--------|----------|---------------|
| **Database Type** | KeyValue | Documents (with indexing) |
| **Data Model** | Simple todos (text, completed) | Rich intentions (title, description, geo, embedding) |
| **UI Screens** | 1 (single list) | 4 (search, decision, list, detail) |
| **Search** | None (just list) | Semantic vector search |
| **Card Layout** | Uniform size | Golden-ratio sizing by relevance |
| **Input Methods** | Text only | Text + voice recognition |
| **Design System** | Carbon Design | Custom (Cyan/Gold/Sage) |
| **ML Model** | None | Transformers.js (23MB) |
| **Verification** | Badge per todo | Per intention (reuse logic) |

---

## Phase 5: Testing Checklist

### Functional Tests:
- [ ] WebAuthn credential creation
- [ ] OrbitDB database opens
- [ ] Create intention → appears in list
- [ ] Search returns results
- [ ] Cards sized by relevance score
- [ ] Voice input captures transcript
- [ ] Click card → detail view
- [ ] P2P sync between two browser tabs
- [ ] Identity verification badges display

### Performance Tests:
- [ ] Search completes in <200ms (100 intentions)
- [ ] 60fps scroll with 50+ cards
- [ ] ML model loads in <5s
- [ ] No memory leaks after 100 operations

### Browser Compatibility:
- [ ] Chrome (voice ✅)
- [ ] Safari (voice ✅)
- [ ] Edge (voice ✅)
- [ ] Firefox (voice ❌)

---

## Phase 6: Next Steps After MVP

1. **Advanced Features:**
   - Geo-filtering by radius
   - Tags and categories
   - Attention tracking (time spent per intention)
   - Token/gratitude system

2. **Mobile:**
   - Package with Capacitor
   - iOS/Android apps
   - Native voice recognition

3. **Scaling:**
   - Relay nodes for WebRTC
   - Storacha (IPFS pinning)
   - Multiple temples/communities

---

## Summary

This plan provides:
✅ **Clear file mapping** (copy, adapt, create new)
✅ **Step-by-step instructions** (15 steps)
✅ **Code examples** for key modifications
✅ **Testing checklist** to verify functionality
✅ **Design system** rules (colors, no glows)
✅ **Performance targets** (search <200ms, 60fps)

**Estimated implementation time:** 2-3 days for core MVP, 1-2 weeks for polish.
