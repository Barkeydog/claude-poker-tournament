# Minimalist Professional Poker Room UI Design

**Date:** 2025-10-31
**Status:** Approved for Implementation
**Branch:** `feature/professional-ui` (to be created)

## Overview

Transform the current pixel-art poker UI into a minimalist professional poker room design with network accessibility and responsive scaling. Maintain all existing functionality (real-time updates, commentary, tournament) while delivering a clean, professional aesthetic that works on any screen size.

## Goals

1. **Professional Aesthetic**: Dark green felt table, clean typography, subtle depth effects
2. **Network Accessible**: Bind to 0.0.0.0 so anyone on LAN can spectate
3. **Responsive Scaling**: Fluid layouts that prevent cutoffs on all screen sizes
4. **Zero Framework Bloat**: Modern CSS + Vanilla JS (no build step)

## Visual Design

### Color Palette

```css
--felt-dark: #0f4a33;      /* Primary table color */
--felt-light: #1a6d49;     /* Lighter felt accent */
--wood-trim: #4a2c1f;      /* Table edge/frame */
--gold-accent: #d4af37;    /* Pot, highlights */
--text-light: #f5f5f5;     /* Primary text */
--text-dim: #a0a0a0;       /* Secondary text */
--background: #1a1a1a;     /* Page background */
```

### Typography

- **Font Family**: Inter or Roboto (web-safe sans-serif fallback)
- **Base Size**: `clamp(14px, 1.5vw, 18px)`
- **Headers**: `clamp(24px, 3vw, 32px)`
- **Card Text**: `clamp(12px, 1.2vw, 16px)`

### Table Design

- Oval poker table with radial gradient felt texture
- Inner shadow for recessed depth effect
- 5 player positions arranged at 72° intervals around perimeter
- Center area: community cards (5 slots) + pot display
- Dealer button indicator rotates with position
- Active player highlighted with subtle gold glow

## Layout Structure

### Desktop (>1200px)

```
┌─────────────────────────────────────────────┐
│  Header: Hand #3 | Phase: Flop | Start Btn  │
├────────────────────────┬────────────────────┤
│                        │                    │
│    Poker Table         │   Live Commentary  │
│    (70% width)         │   (30% width)      │
│                        │                    │
│  • 5 player slots      │   Scrollable feed  │
│  • Community cards     │   Auto-scroll      │
│  • Pot display         │   Word wrap        │
│                        │                    │
└────────────────────────┴────────────────────┘
```

### Tablet (768-1200px)

```
┌─────────────────────────────────────┐
│           Header                    │
├─────────────────────────────────────┤
│         Poker Table                 │
│         (full width)                │
│                                     │
├─────────────────────────────────────┤
│      Live Commentary                │
│      (full width, 300px height)     │
└─────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────┐
│     Header       │
├──────────────────┤
│   Poker Table    │
│   (compact)      │
├──────────────────┤
│   Commentary     │
│   (250px height) │
└──────────────────┘
```

## Component Details

### Player Slot

**Layout:**
```
┌────────────────┐
│  PlayerName    │ ← Name + Status Badge
│  💰 1,000      │ ← Chip count
│  [A♠] [K♥]    │ ← 2 cards (or back)
└────────────────┘
```

**Positioning:**
- Calculate using polar coordinates: `angle = playerIndex * 72°`
- Convert to cartesian: `x = 50% + cos(angle) * radius`
- Use CSS absolute positioning with calc()

**States:**
- Active: gold border glow animation
- Folded: reduced opacity (0.6)
- Eliminated: grayed out + strikethrough name

### Community Cards

**Layout:**
```
┌─────────────────────────────┐
│         POT: 💰 500         │
│  [A♠] [K♥] [Q♦] [J♣] [10♠] │
└─────────────────────────────┘
```

**Card Design:**
- White rounded rectangle (border-radius: 8px)
- Rank + suit clearly rendered (e.g., "A♠")
- Empty slots: dashed border with "?"
- Shadow: `0 4px 8px rgba(0,0,0,0.3)`

### Commentary Feed

**Features:**
- Auto-scroll to bottom on new messages
- Word wrap to prevent horizontal overflow
- Alternating row background for readability
- Player name in bold, colored by action type
- Timestamps (optional, can add later)

**Message Format:**
```
Alice: raises 60
"Pocket eights looking pretty! Let's see who's got the guts..."
```

## Responsive Scaling

### CSS Variables Strategy

```css
:root {
  /* Base sizing */
  --table-size: clamp(400px, 70vmin, 800px);
  --card-width: clamp(40px, 6vw, 80px);
  --card-height: calc(var(--card-width) * 1.4);
  --player-slot-width: clamp(120px, 15vw, 180px);

  /* Spacing */
  --gap-small: clamp(4px, 0.5vw, 8px);
  --gap-medium: clamp(8px, 1vw, 16px);
  --gap-large: clamp(16px, 2vw, 32px);

  /* Typography */
  --font-xs: clamp(10px, 1vw, 12px);
  --font-sm: clamp(12px, 1.2vw, 14px);
  --font-base: clamp(14px, 1.5vw, 18px);
  --font-lg: clamp(18px, 2vw, 24px);
  --font-xl: clamp(24px, 3vw, 32px);
}
```

### Container Queries (if supported)

Use `@container` queries on `.poker-table` to adjust internal layout based on available space, not just viewport size.

### Fallback Strategy

If container queries unsupported:
- Use `@media` queries with standard breakpoints
- Test on Chrome, Firefox, Safari
- Graceful degradation to fixed layouts

## Network Accessibility

### Server Binding Change

**Before:**
```javascript
server.listen(PORT, () => { ... });
```

**After:**
```javascript
const os = require('os');

function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const networkIP = getNetworkIP();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🃏 Local:   http://localhost:${PORT}`);
  console.log(`🌐 Network: http://${networkIP}:${PORT}`);
  console.log(`👀 Open either URL to watch the game`);
});
```

### Socket.io Compatibility

Current code already handles VSCode proxy paths. Network clients will connect directly without proxy, using the same detection logic.

## Animation & Polish

### Transitions

```css
/* Card dealing */
.card {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.card.dealt {
  transform: translateY(0);
  opacity: 1;
}

/* Active player glow */
@keyframes glow {
  0%, 100% { box-shadow: 0 0 10px var(--gold-accent); }
  50% { box-shadow: 0 0 20px var(--gold-accent); }
}

.player-slot.active {
  animation: glow 2s infinite;
}

/* Pot update pulse */
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.pot-amount.updated {
  animation: pulse 0.3s ease;
}
```

### Micro-interactions

- Hover states on player slots (subtle highlight)
- Start button: scale on hover, press effect on click
- Commentary items: fade-in when added
- Phase changes: brief flash of header background

## Implementation Notes

### Files to Modify

1. **server/public/index.html**
   - Update structure for CSS Grid layout
   - Add proper semantic HTML
   - Include Inter/Roboto font from Google Fonts

2. **server/public/styles.css**
   - Complete rewrite with CSS variables
   - Implement responsive grid
   - Add all animations and transitions

3. **server/public/app.js**
   - Keep existing Socket.io logic
   - Add CSS class toggles for animations
   - Ensure commentary auto-scroll works

4. **server/server.js**
   - Change `server.listen()` to bind to 0.0.0.0
   - Add network IP detection and logging
   - No other changes needed

### Testing Checklist

- [ ] Desktop Chrome (1920x1080)
- [ ] Desktop Firefox (1920x1080)
- [ ] Tablet (iPad Pro 1024x768)
- [ ] Mobile (iPhone 390x844)
- [ ] Network access from another device
- [ ] Socket.io reconnection after server restart
- [ ] VSCode proxy still works for local dev
- [ ] All animations smooth (60fps)
- [ ] No horizontal scroll on any screen size
- [ ] Text readable at all sizes

## Migration Strategy

1. Create new branch `feature/professional-ui`
2. Commit design doc
3. Create backup of current UI files
4. Implement changes incrementally:
   - Network binding first (easy to test)
   - HTML structure update
   - CSS rewrite (use CSS variables from start)
   - Polish animations last
5. Test on multiple devices before merging
6. Create PR with screenshots/video

## Success Criteria

✅ Professional poker aesthetic (dark green felt, clean fonts)
✅ Accessible via network IP from any LAN device
✅ Responsive: works on desktop/tablet/mobile
✅ No cutoffs: all elements scale properly
✅ Zero dependencies added
✅ All existing features still work
✅ Smooth animations without performance issues

## Future Enhancements (Out of Scope)

- User-selectable themes
- Hand history replay
- Player statistics dashboard
- Mobile-specific portrait layout
- Dark mode toggle
- Sound effects

---

**Approved by:** User
**Ready for Implementation:** Yes
