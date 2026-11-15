# MockupForge 3D Studio

**MockupForge 3D Studio** is a production-ready, browser-based graphic
design studio for creating **Apple App Store** and **Google Play Store**
promotional screenshots, panoramic storyboards, and 1024×500 Featured
Graphics.

Powered by a custom **Three.js WebGL 3D hardware engine** and a high-DPI
HTML5 2D compositor, every smartphone mockup is a true 3D model with
realistic anodized metal or 3D matte clay materials, chamfered titanium
rims, physical side buttons, camera plateaus, and perspective X/Y/Z
rotation.

------------------------------------------------------------------------

## Key Features

### Realistic 3D Device Mockups (Three.js WebGL)

-   **Apple Flagships:** iPhone 17 Pro Max, iPhone 17 Pro, iPhone 17,
    iPhone 16 Pro Max, iPhone 16 Pro, iPhone 16.
-   **Android Flagships:** Samsung Galaxy S26 Ultra, Galaxy S26+, Galaxy
    S26, Google Pixel 10 Pro XL, Pixel 10 Pro, Pixel 10.
-   **True 3D Geometry:** Circular corner arcs, chamfered
    titanium/aluminum rails, obsidian glass bezels, Dynamic Island /
    punch-hole optical lenses, and rear camera modules.
-   **Dual Material Modes:** Switch any phone between **Anodized Metal**
    (Natural, Black, White, Desert Titanium, etc.) and **3D Matte Clay**
    (Chalk, Warm Sand, Terracotta, Cobalt, Sage Mint, Rose, Lavender).
-   **Full 3D Camera Control:** Adjust Pitch (X), Yaw (Y), Roll (Z),
    scale, field-of-view (FOV), screen glare, and 3D floor contact
    shadows directly on the canvas.

### 230+ Layouts & 28 Curated Template Packs

-   **10 Continuous Panorama Flow Packs (50 Connected Slides):**
    Mathematically continuous multi-slide backgrounds (*Aurora Ribbon*,
    *3D Clay Horizon*, *Architectural Archway*, *Kinetic Diagonal
    Track*, *Blueprint Timeline*, *Midnight Cyber Neon*, *Rose Quartz 3D
    Clay*, *Golden Hour Arch*, *Electric Cobalt Velocity*, *Nordic
    Minimalist Blueprint*) that connect seamlessly across slide
    boundaries.
-   **4 Dedicated 3D Clay Studio Packs:** Tactile 3D cyclorama backdrops
    with floating volumetric clay spheres and matte clay devices.
-   **14 Category Packs (140+ Layouts):** Minimalist Light, Warm
    Alabaster, Nordic Frost, Premium Dark, Obsidian & Gold, Carbon &
    Crimson, Modern Gradients, Futuristic Tech, Floating 3D,
    Multi-Device Overlapping, Split-Screen Bleed, Bold Typography, Soft
    Pastel, and Professional Productivity.
-   **12 Google Play Featured Graphic Templates (1024×500):** Dedicated
    landscape banner studio with one-click style syncing from your
    active screenshot storyboard.

### Smart Screenshot Placement & Full Layer Editor

-   **Zero-Distortion Screen Mapping:** Drag-and-drop or batch-upload
    PNG/JPG/WebP screenshots with automatic aspect-ratio preservation
    (`cover` / `contain`).
-   **Add & Remove Unlimited Layers:** Insert additional headlines, pill
    tags, body copy, custom uploaded images/logos, 3D clay spheres, KPI
    callout cards, or extra 3D phones onto any layout.
-   **Complete Backdrop & Typography Studio:** Customize solid colors,
    linear/radial/mesh gradients, 3D clay backdrops, architectural
    patterns, font families, weights, gradients, and shadows.

### Multi-Device Batch Generator & High-Res ZIP Export

-   **Store-Ready Output Presets:**
    -   Apple iOS 6.9" (`1320 × 2868`)
    -   Apple iOS 6.5" (`1284 × 2778`)
    -   Google Play Store 9:16 (`1080 × 1920`)
    -   Universal Ultra HD (`1440 × 2560`)
    -   Google Play Featured Graphic (`1024 × 500`)
-   **Intelligent Layout Adaptation:** Automatically adapts compositions
    across different store aspect ratios and device families without
    stretching.
-   **1-Click ZIP Bundle Export:** Download individual high-resolution
    PNG/JPEG/WebP files or export all slides and device variations
    together in a structured `.zip` archive.

------------------------------------------------------------------------

## Tech Stack

-   **Frontend Framework:** React 19 + TypeScript
-   **3D Rendering Engine:** Three.js (WebGL PBR materials, procedural
    studio environment lighting, rounded-box extruded geometry)
-   **Styling:** Tailwind CSS v4
-   **Icons:** Lucide React
-   **Build Tool:** Vite

------------------------------------------------------------------------

## Installation & Running Locally

### Prerequisites

Make sure you have **Node.js** (v18 or v20+ recommended) and **npm**
installed on your machine.

-   Download Node.js from [nodejs.org](https://nodejs.org/).
-   Verify the installation in your terminal:

``` bash
node -v
npm -v
```

### Step-by-Step Setup

1.  **Clone the repository (or extract the downloaded ZIP file):**

    ``` bash
    git clone https://github.com/your-username/mockupforge-3d-studio.git
    cd mockupforge-3d-studio
    ```

2.  **Install dependencies:**

    This downloads Vite, React, Three.js, and Tailwind CSS into
    `node_modules`.

    ``` bash
    npm install
    ```

3.  **Start the local development server:**

    ``` bash
    npm run dev
    ```

4.  **Open the application in your browser:**

    Navigate to <http://localhost:3000>.

------------------------------------------------------------------------

## Building for Production

To create an optimized production build inside the `dist/` folder:

``` bash
npm run build
```

To preview the production build locally:

``` bash
npm run preview
```

------------------------------------------------------------------------

## Keyboard Shortcuts

  -----------------------------------------------------------------------
  Shortcut                            Action
  ----------------------------------- -----------------------------------
  `Ctrl / Cmd + Z`                    Undo last action

  `Ctrl / Cmd + Y` or                 Redo action
  `Ctrl + Shift + Z`                  

  `Ctrl / Cmd + D`                    Duplicate selected layer

  `Ctrl / Cmd + C` / `Ctrl / Cmd + V` Copy / Paste selected layer

  `Delete` / `Backspace`              Remove selected layer

  `Arrow Keys` (`Shift + Arrow`)      Nudge selected layer by `3px`
                                      (`15px`)
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## License

This project is licensed under the **Apache License 2.0**. See the [LICENSE](LICENSE) file for the full license text.
