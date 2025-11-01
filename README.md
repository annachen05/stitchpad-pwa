# stitchpad-pwa
Based on the work of Michael Aschauer (Stitchpad).
I am a rookie, please send help.
Also this is a work in progress.

Here the (somewhat) functioning Website: https://stitchpad-pwa.netlify.app/

## ✨ New Feature: Image Vectorization

Stitchpad PWA now includes advanced **image vectorization** using centerline tracing algorithms (inspired by [Incrediplotter](https://github.com/jiink/incrediplotter))!

### Quick Start

1. Click the **Import** button in the toolbar
2. Select or drag & drop a PNG/JPEG image
3. Choose **"Vectorize"** to convert the image to embroidery stitches
4. Adjust settings in real-time with live preview:
   - **Detection Mode**: Choose between Standard, Adaptive Threshold, or Edge Detection
   - **Auto-Threshold**: Automatic optimal threshold calculation (Otsu's method)
   - **Contrast Enhancement**: Improve visibility of low-contrast images
   - **Threshold**: Control black/white conversion (manual mode)
   - **Median Filter**: Reduce noise
   - **Centerline Tracing**: Extract line skeletons
   - **Simplification**: Reduce number of points
   - **Smoothing**: Create smooth curves
   - **Output Scale**: Adjust final size
5. Click **"Apply to Canvas"** to add to your design

### Features

- ✅ **Multiple Detection Modes** - Standard, Adaptive Threshold, Edge Detection
- ✅ **Auto-Threshold** - Otsu's method for optimal threshold calculation
- ✅ **Contrast Enhancement** - Histogram equalization for low-contrast images
- ✅ **Centerline Tracing** - Zhang-Suen skeletonization algorithm
- ✅ **Smart Filtering** - Median filter for noise reduction
- ✅ **Line Smoothing** - Chaikin's corner cutting algorithm
- ✅ **Node Reduction** - Ramer-Douglas-Peucker simplification
- ✅ **Live Preview** - See results instantly
- ✅ **Browser-native** - Pure JavaScript, no external dependencies

### Works Great With

- ✅ **High-contrast images** (black & white line art)
- ✅ **Low-contrast images** (light colored drawings on white)
- ✅ **Hand-drawn sketches**
- ✅ **Scanned artwork**
- ✅ **Digital illustrations**

📖 **[Full Documentation](docs/VECTORIZATION.md)**

---

stitchpad-pwa
57d9ec8c10173ad31f14e8077d1c4dc49e57d69c
