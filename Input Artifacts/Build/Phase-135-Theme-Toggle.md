# Phase 135: Cross-Module - Dark/Light Theme Toggle

## Objective
Implement dark and light theme toggle for the entire Helix Foundry application, with system preference detection and persistent user preference storage.

## Prerequisites
- Phase 001: App Shell & Layout (main app structure)
- Phase 116: User Settings & Preferences (settings management)
- Tailwind CSS theme configuration
- React context or state management for theme

## Context
User preferences vary: some prefer light mode for daytime work, others prefer dark mode for eye comfort or low-light environments. Modern applications support both themes with user control and system preference detection.

## Detailed Requirements

### Theme System
- **Light Theme:** Bright backgrounds, dark text (default)
- **Dark Theme:** Dark backgrounds, light text
- **System:** Follow device/OS preference (prefers-color-scheme)
- User can override system preference

### Theme Colors (CSS Variables)
```css
:root {
  /* Light Theme */
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --border: #e5e7eb;
  --accent: #3b82f6;
  /* ... other colors */
}

[data-theme="dark"] {
  /* Dark Theme */
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --bg-tertiary: #374151;
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
  --text-tertiary: #9ca3af;
  --border: #4b5563;
  --accent: #60a5fa;
  /* ... other colors */
}
```

### Theme Storage
- **Local Storage:** persist user preference
- **Key:** `helix-foundry-theme` with values: 'light' | 'dark' | 'system'
- **Database:** store in user_preferences table under themes.preference
- Load on app init and apply immediately

### User Settings UI
- **Location:** Settings > Appearance
- **Theme Selector:**
  - Three radio buttons with visual previews:
    - Light (with light preview box)
    - Dark (with dark preview box)
    - System (with system icon)
  - Currently selected theme highlighted
  - Preview boxes show actual colors

- **Additional Options:**
  - Accent color picker (preset colors or custom)
  - Font size selector (small, normal, large)
  - Sidebar collapse default (expanded/collapsed)

- **Save:** Auto-save on selection (no manual save button)

### App Shell Implementation
```tsx
// Root layout component
export default function RootLayout() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Load theme from storage or system preference
    const saved = localStorage.getItem('helix-foundry-theme') || 'system';
    setTheme(saved);

    // Apply theme class/data-attribute
    if (saved === 'system') {
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', systemPreference);
    } else {
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  return (
    <html data-theme={theme}>
      <body>{children}</body>
    </html>
  );
}
```

### Theme Hook
```tsx
function useTheme() {
  const [theme, setTheme] = useState('light');

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('helix-foundry-theme', newTheme);

    if (newTheme === 'system') {
      const systemPref = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', systemPref);
    } else {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  return { theme, setTheme: handleThemeChange };
}
```

### System Preference Detection
- Use media query: `window.matchMedia('(prefers-color-scheme: dark)')`
- Listen for changes: `addEventListener('change', handler)`
- Update theme automatically if user preference is 'system'

### Component Styling
- All components use CSS variables
- No hardcoded colors (except brand colors)
- Example:
  ```tsx
  <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)]">
    ...
  </div>
  ```
- Or use Tailwind with CSS variable support

### Tailwind Configuration
```js
// tailwind.config.js
module.exports = {
  theme: {
    colors: {
      bg: {
        primary: 'var(--bg-primary)',
        secondary: 'var(--bg-secondary)',
        tertiary: 'var(--bg-tertiary)',
      },
      text: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
      },
      // ... map other colors
    },
  },
};
```

### Components Requiring Theme Updates
- All pages: background, text colors
- Cards/sections: backgrounds, borders
- Buttons: background, hover states
- Inputs: background, text, border
- Modals: background, text
- Charts: colors, axes, labels
- Code blocks: syntax highlighting per theme
- Alerts/toasts: colors based on severity

### Accent Color Customization (Optional)
- Preset accent colors: blue, green, purple, orange, red
- User can select from presets
- Applied to buttons, links, focus states
- CSS variable: `--accent-primary`, `--accent-secondary`

### Database Schema
```sql
ALTER TABLE user_preferences ADD COLUMN theme_preference TEXT
  CHECK (theme_preference IN ('light', 'dark', 'system')) DEFAULT 'system';

ALTER TABLE user_preferences ADD COLUMN accent_color TEXT DEFAULT 'blue';

ALTER TABLE user_preferences ADD COLUMN font_size TEXT
  CHECK (font_size IN ('small', 'normal', 'large')) DEFAULT 'normal';
```

### Performance Considerations
- Theme detection should not block initial render
- Use non-blocking storage read
- Avoid theme flash (set theme in <head> script before render)
- Memoize theme context to prevent unnecessary re-renders

### Testing All Components
- Light theme: verify all text legible, contrast sufficient
- Dark theme: verify all text legible, no glare
- Charts: verify labels, legends visible in both themes
- Code blocks: verify syntax highlighting readable
- Images/illustrations: work in both themes

## File Structure
```
/app/hooks/useTheme.ts
/app/context/ThemeContext.tsx
/app/components/Settings/Appearance.tsx
/app/styles/themes.css
/app/styles/variables.css
/app/lib/supabase/migrations/add-theme-preferences.sql
/app/components/RootLayout.tsx (updated)
```

## Acceptance Criteria
- [ ] Light theme fully styled and functional
- [ ] Dark theme fully styled and functional
- [ ] System preference detected correctly
- [ ] Theme preference persisted in local storage
- [ ] Theme preference persisted in database
- [ ] Settings > Appearance page displays three theme options
- [ ] Radio button selections update theme immediately
- [ ] System theme follows device preference
- [ ] Device preference change detected (media query listener)
- [ ] All pages work in both themes
- [ ] All components styled with CSS variables
- [ ] No hardcoded colors in components
- [ ] Text contrast meets WCAG AA (both themes)
- [ ] Charts visible and readable in both themes
- [ ] Code syntax highlighting works in both themes
- [ ] Accent color customization works
- [ ] Font size selector works
- [ ] Theme persists across sessions
- [ ] Theme loads immediately on page load (no flash)
- [ ] All form inputs themed correctly
- [ ] All modals and popovers themed correctly
- [ ] Dark theme doesn't cause eye strain

## Testing Instructions
1. Open application
2. Verify default theme is "System"
3. Navigate to Settings > Appearance
4. Verify Light, Dark, and System radio buttons present
5. **Test Light Theme:**
   - Select "Light"
   - Verify entire app switches to light theme
   - Background is white/light
   - Text is dark
   - All elements visible and readable
   - Refresh page
   - Verify light theme persists
6. **Test Dark Theme:**
   - Select "Dark"
   - Verify entire app switches to dark theme
   - Background is dark
   - Text is light
   - All elements visible and readable
   - Refresh page
   - Verify dark theme persists
7. **Test System Theme:**
   - Select "System"
   - If OS is in light mode: app should show light
   - If OS is in dark mode: app should show dark
   - Change OS theme
   - Verify app theme updates automatically
8. **Test All Pages in Both Themes:**
   - Go through each module (Hall, Pattern Shop, Control Room, Assembly Floor, Insights Lab)
   - Verify all text readable in both themes
   - Verify no contrast issues
9. **Test Components:**
   - Buttons: styled correctly in both themes
   - Cards: background and border correct
   - Modals: visible and readable
   - Forms: inputs styled correctly
   - Charts: visible and readable
   - Code blocks: syntax highlighting correct
   - Links: color accessible in both themes
10. **Test Local Storage:**
    - Select dark theme
    - Open DevTools > Application > Local Storage
    - Verify `helix-foundry-theme = 'dark'`
    - Clear local storage
    - Refresh page
    - Verify theme reverts to system (or default)
11. **Test Database Persistence:**
    - Select dark theme
    - Query database: SELECT theme_preference FROM user_preferences
    - Verify it's saved
12. **Test Theme Flash:**
    - Hard refresh page (Cmd+Shift+R or Ctrl+Shift+R)
    - Verify theme loads immediately
    - No white flash if in dark mode
13. **Test Accent Colors:**
    - In Settings > Appearance, try different accent colors
    - Verify buttons and links update
    - Verify text maintains contrast in both themes
14. **Test Font Sizes:**
    - Try small, normal, large
    - Verify readability at each size
    - Verify responsive layout adapts

## Color Palette (Suggested)
```
Light Theme:
- Primary BG: #ffffff
- Secondary BG: #f9fafb
- Text Primary: #111827
- Text Secondary: #6b7280
- Border: #e5e7eb
- Accent: #3b82f6

Dark Theme:
- Primary BG: #111827
- Secondary BG: #1f2937
- Text Primary: #f9fafb
- Text Secondary: #d1d5db
- Border: #4b5563
- Accent: #60a5fa
```
