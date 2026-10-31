# Tik Tik Bomb — Stitch Design System

## 1. Product and visual direction

Design a clean, quick-to-read multiplayer party game for phones first. It should feel friendly and lightly tense: pale blue space, white surfaces, soft player colors, and one coral bomb. Keep the interface sparse enough that the bomb holder and available action are obvious at a glance. Use an airy but compact game layout, with generous touch targets and no decorative chrome.

Priorities: mobile-first; minimal copy; high legibility; immediate state recognition; accessible touch controls. The core play area should fit a 360px-wide viewport without horizontal scrolling. Scale the board up on laptop screens while preserving the same hierarchy and calm palette.

## 2. Color palette and roles

- **Sky Canvas** `#EAF4FF` — page background.
- **Cloud Panel** `#FFFFFF` — panels, fields, scoreboard surface.
- **Soft Sky Action** `#7FB8F5` — primary buttons and selected controls.
- **Navy Ink** `#16324F` — all text, outlines, and the bomb fuse.
- **Soft Blue Border** `#C9DFF5` — panel and input borders.
- **Coral Bomb** `#FFB8A8` — bomb, brief explosion flash.
- **Pale Pink** `#F8DDE5`, **Mint** `#D8F1E4`, **Light Yellow** `#FFF0BF`, **Lavender** `#E7E0F7`, **Peach** `#F9DFCC`, **Light Aqua** `#D7F0F1`, **Light Green** `#DDECCB`, **Light Orange** `#F8E0C7` — player chips, assigned consistently by player order.
- **Out Gray** `#D7DEE7` — eliminated player chips and disabled controls; retain readable navy labels.

Pastels are functional identity colors, not extra accents. Keep text navy on every pastel and verify sufficient contrast. No gradients, shadows with color glow, dark mode, or extra palette colors.

## 3. Typography

- Use one native system sans-serif stack everywhere: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Use weight and size for hierarchy; do not introduce a display or monospace font.
- Game title: 28–32px, bold. Room code and winner: 28–36px, bold. Player names: 15–18px, semibold. Scores and round marker: 13–15px, medium. Buttons: 16px, semibold.
- Keep all permitted text short: game name, nicknames, room code, scores, round marker, and button labels. Do not add helper copy, instructions, status sentences, tooltips, or marketing text.
- Use tabular numerals for scores if supported by the system font.

## 4. Components

### Buttons and fields

- Buttons have a minimum 48px height, 16–22px horizontal padding, fully rounded corners, and a clear navy label. Primary actions use Soft Sky Action; secondary actions use white fill with a Soft Blue Border.
- Press feedback is a subtle 1px downward translate or slight darkening. Disabled controls remain visibly inactive and are not mistaken for available actions.
- Inputs are white, at least 48px high, softly bordered, rounded, and use navy text. Placeholder text is limited to the field's purpose (nickname or room code).
- The copy control is a text button labeled `Copy`; do not add an icon.
- Keep comfortable separation between controls. Avoid tiny inline controls on phones.

### Panels, chips, and scoreboard

- Panels use white fill, a 1px soft-blue border, and a 16–20px radius. Avoid heavy shadows and unnecessary nested cards.
- Player chips are large rounded buttons with a pastel fill and navy text. The current bomb holder gets a thicker 3px navy outline. Eliminated players use Out Gray and cannot be selected.
- In the game board, place names around a central CSS bomb on larger screens. On narrow phones use a balanced two-column grid with the bomb centered in its own clear zone and adjacent to the holder's name; never force an impractical circular arrangement.
- Place each player's score alongside their name without shrinking the tap target. Only a live player other than the holder can be selected when the local player holds the bomb.
- Score tables use compact rows, visible row separation, readable 14px minimum text, and fixed alignment for scores. Fit all 8 rows within a 360px-wide screen; do not use horizontal scrolling.

### CSS bomb

- Draw the bomb in CSS only: a simple Coral Bomb circle with a short Navy Ink line above it as the fuse. No emoji, image, icon, texture, sparks, or gradients.
- Use a gentle scale pulse while active. The pulse may speed up as elapsed time increases, but its timing must be cosmetic and must never encode or reveal the hidden fuse or show a countdown.
- On explosion, shake the bomb briefly and flash the screen with Coral Bomb at low opacity, then show the holder's name prominently with `Out` or the penalty value. Keep effects short and readable.

## 5. Screens and states

Use a smooth fade between screen states. Keep the round label `1/3` small in a top corner on round-based prototype screens.

1. **Home:** game name; nickname input; `Room banao` button; room-code input; `Join` button. Stack controls on phones.
2. **Lobby:** prominent room code and `Copy`; pastel chips for joined players; host settings for starting points and explosion penalty; `Start` for host only, enabled at 3 players and disabled at 8. Keep host settings compact and grouped. The lobby is locked after game start.
3. **Game:** round marker; player grid/circle; scores; the image bomb stays beside the holder's avatar, never in the center; holder outline; `Random` visible only to the holder. Passing animates the bomb image from the holder to the selected live player. If the local player holds the bomb, other alive players are tappable and a thin 5-second pass window bar drains at the top. Do not show fuse time. If another player holds it, names are display-only.
4. **Explosion:** quick red-coral screen flash, expanding burst rays and shockwave around the bomb, plus a brief bomb shake; holder name large with `Out` (or `-5` where penalty is shown). No explanatory sentence.
5. **Round end:** winner name large, compact standings, host-only `Next`.
6. **Final scoreboard:** winner name large; ranked names and total points in a readable 8-row table; host-only `Play again`.

Keep controls and meaning consistent between screens. Never communicate availability using color alone; use interaction state and outline weight as well.

## 6. Prototype behavior and build logic

For Stitch's review prototype, use believable fake players and scores, and make every screen reachable with working controls. `Room banao` opens a sample lobby; `Join` opens the same lobby with a sample join; `Copy` copies the visible room code; `Start` enters play; selecting a valid name or `Random` moves the bomb; an `Explode` prototype action or a short simulated fuse enters Explosion; `Next` advances the round; `Play again` returns to a fresh lobby/game state. Provide a small unobtrusive prototype-only way to trigger states if needed, but do not add extra explanatory text to the player-facing screens.

The supplied gameplay brief is the authority for production behavior: Node.js + Express + `ws`, plain HTML/CSS/vanilla JavaScript, server-authoritative state, in-memory rooms, hidden server fuse, server-clock timing, reconnect session tokens, and WebSocket broadcasts. Clients send actions; they never decide fuse duration, scoring, holder validity, or winner. Each client state omits the hidden fuse. The design prototype may simulate round transitions for visual review; production gameplay in the implementation brief is continuous elimination without rounds, ending when one player remains or the host ends the game. Keep the design components reusable if the production team later aligns these flows.

The avatar picker offers 16 distinct Avataaars SVG character presets, including girl and boy looks with varied hair, skin tones, accessories, and clothing. Render avatars from the locally installed `avataaars` npm package; never fetch avatar images from an external service. Show each player's chosen avatar with their name chip.

Production constraints that affect interface states:

- Room capacity is 3–8; nicknames are unique per room; host can configure starting points (default 20) and penalty (default 5).
- Passes are allowed only from the current holder to another active player. `Random` selects another active player. The fuse continues through passes and is never shown.
- On explosion, the holder loses the configured penalty; players at zero or below become spectators. The server resumes play after the explosion transition with a new holder and hidden fuse.
- Host can adjust a player's points with `+1`, `+5`, and `-1`, end the game, and restart. Host handoff and reconnect/disconnect handling must be reflected in the live state.
- Keep spectator, disconnected, disabled, explosion, and final-score states legible using the same visual tokens.

## 7. Layout and responsive rules

- Start at 360px wide. Use a single-column flow for home and lobby; use a two-column player grid on narrow game screens. Avoid fixed widths that exceed the viewport.
- On larger screens, center a restrained game column (maximum width about 760px); use a wider board only when it helps the player layout. Keep settings and scores grouped with their related screen.
- Use 16px minimum page gutters on mobile, 20–24px panel padding, and 12–16px gaps between controls. Preserve at least 8px between adjacent touch targets.
- Keep every actionable target at least 44px wide and 48px high. Respect safe areas on phones. Avoid viewport-height assumptions that cause mobile browser jumps.
- Ensure long nicknames wrap or truncate within their chip without pushing scores off-screen. Do not allow horizontal page overflow at 360px.

## 8. Motion and accessibility

- Animate the bomb gently while held, move it with a short toss when passed, and use one brief red-coral burst, shockwave, flash, and shake on explosion. Keep screen changes on a smooth opacity fade.
- Respect `prefers-reduced-motion`: replace the pulse with a static bomb and remove shake/flash while keeping state transitions immediate and clear.
- Animate only `transform` and `opacity`; avoid perpetual animation on controls, staggered list entrances, spring choreography, shimmer, parallax, or scrolling effects.
- Use semantic buttons and inputs, visible keyboard focus in navy, logical tab order, and accessible names from visible labels. Disabled and non-interactive player names must not appear focusable.
- Never depend on animation or pastel color alone to indicate bomb ownership, elimination, or action availability.

## 9. Explicit anti-patterns

- No decorative illustrations, emoji avatars, icons, external fonts, sound, gradients, or neon effects. Player Avataaars SVGs and the supplied bomb image are the only image assets.
- No countdown timer, fuse number, fuse bar, or any visual that reveals the actual hidden fuse. The 5-second pass window is a separate interaction bar and must not resemble or be confused with the fuse.
- No text beyond game name, player names, room code, scores, round marker, and concise button labels. Avoid hints, tutorials, helper sentences, tooltips, and marketing copy.
- No horizontal scrolling, tiny tap targets, decorative cards, excessive shadows, mixed font families, or inconsistent pastel assignments.
- Do not make inactive players look tappable; do not allow a holder to pass to themselves or an eliminated player.
- Do not introduce extra animation beyond the bomb pulse and pass toss, explosion burst/shockwave/flash/shake, and screen fade.
