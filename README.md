# Stella Sora Potential Tracker 🌌

A progressive web application (PWA) designed to track characters, manage potential builds, and calculate stat summaries for the rogue-like game *Stella Sora*.

![App Preview](https://placehold.co/800x400/121212/ffffff?text=App+Preview+Placeholder)

*(Replace this link with a real screenshot of your app once deployed)*

## ✨ Features

- **Progressive Web App (PWA):** Installable on Android, iOS, and Desktop. Works offline.
- **Run Management:** Create multiple runs, name them, and save them automatically to your browser's LocalStorage.
- **Smart Potential Picker:**
  - Distinct Main vs. Support character logic.
  - Dynamic level caps (starts at 5/6, increases cap when a skill hits Max Level).
  - Real-time "Total Cost" and "Slot Capacity" counters.
- **Visual Rarity System:**
  - **Common:** Grey border.
  - **Rare:** Pink tint.
  - **Super Rare:** Animated pulsing glow.
- **Team Stats Calculator:** Aggregates bonuses (e.g., "Total ATK +45%") across all 3 characters.
- **Search & Filter:** Instantly filter potentials by name or description.
- **Import/Export:** Backup your runs as `.json` files or share them with friends.

## 🚀 Quick Start

### Option 1: Run Locally
1. Clone or download this repository.
2. Ensure you have the three core files in the same folder:
   - `index.html`
   - `manifest.json`
   - `sw.js`
3. Open the folder in VS Code and use the **Live Server** extension to launch `index.html` (Service Workers require a server environment, they won't work if you just double-click the file).

### Option 2: Deploy to Web (Recommended)
You can host this for free on **GitHub Pages** or **Netlify**.

1. Upload the files to a GitHub repository.
2. Go to **Settings** > **Pages**.
3. Select the `main` branch and click **Save**.
4. Your app is now live at `https://yourusername.github.io/repo-name`.

## 🎨 Asset Configuration

The app is built to load assets dynamically from an external URL to keep the file size small.

### 1. Host Your Images
Upload your game screenshots to a folder on GitHub, Imgur, or a hosting service.

### 2. File Naming Convention
Ensure your files are named exactly like this so the code can find them:

- **Character Faces:** `{charId}_face.png`
  - *Example:* `c1_face.png`, `c2_face.png`
- **Potentials:** `{charId}_{type}_{number}.png`
  - *Example:* `c1_main_1.png` (Chitose Main Skill 1)
  - *Example:* `c3_support_19.png` (Nazuna Support Skill 19)

### 3. Connect to App
Open `index.html` and find the config section at the top of the script:

```javascript
// ** CONFIG YOUR IMAGES HERE **
const ASSET_BASE_URL = "https://your-storage-service.com/stella-sora/assets/";
```

## 📱 How to Install (PWA)

### Android (Chrome)
1. Open the website.
2. Tap the **Three Dots (⋮)** menu.
3. Tap **"Install App"**.

### iOS (Safari)
1. Open the website.
2. Tap the **Share** button (Square with arrow).
3. Tap **"Add to Home Screen"**.

## 📂 Project Structure

```text
/
├── index.html       # The complete application logic (HTML/CSS/JS)
├── manifest.json    # Metadata for installing the app (Name, Icons)
├── sw.js            # Service Worker for offline capabilities
└── README.md        # Documentation
```

## 🛠️ Customization

### Adding New Characters
Look for the `baseCharacters` array in `index.html`:

```javascript
const baseCharacters = [
    { id: "c1", name: "Chitose", element: "Aqua" },
    // Add new character below
    { id: "c5", name: "New Char", element: "Light" }
];
```

### Changing Max Level / Caps
Modify the constants at the top of the script:

```javascript
const MAX_LEVEL = 6;
const BASE_CAP_MAIN = 6;
const BASE_CAP_SUPP = 5;
```

## 📄 License

This project is open-source. Feel free to modify and distribute it for your gaming community.