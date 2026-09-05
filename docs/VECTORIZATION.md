# Image Vectorization Feature

## Überblick

Die Bildevektorisierung konvertiert PNG/JPEG-Bilder in Stickpfade unter Verwendung von **Centerline Tracing** (inspiriert von Incrediplotter). Diese Funktion ist vollständig in JavaScript implementiert und benötigt keine externen Bibliotheken.

## Features

### ✨ Hauptfunktionen

- **Centerline Tracing**: Zhang-Suen Skeletonisierungsalgorithmus für präzise Linienextraktion
- **Professional Preprocessing**: CLAHE, Canny Edge Detection, Unsharp Masking
- **Morphological Operations**: Noise removal, gap filling, dilation/erosion
- **Bezier Curve Fitting**: Potrace-style smooth curve generation
- **Smart Filtering**: Median-Filter zur Rauschunterdrückung
- **Line Smoothing**: Chaikin's Corner Cutting Algorithmus für glatte Kurven
- **Node Reduction**: Ramer-Douglas-Peucker Vereinfachung zur Reduzierung von Punkten
- **Auto-Fit to Canvas**: Automatische Skalierung und Zentrierung
- **Live Preview**: Sofortige Vorschau der Vektorisierung mit allen Einstellungen
- **Browser-kompatibel**: Pure JavaScript, keine externen Dependencies

## Verwendung

### 1. Bild Importieren

1. Klicken Sie auf den **Import**-Button in der Toolbar
2. Wählen Sie ein Bild (PNG, JPG, etc.) aus oder ziehen Sie es per Drag & Drop
3. Wählen Sie **"Vectorize"** im Dialog (oder "Background" für Hintergrundbild)

### 2. Einstellungen Anpassen

Der Vektorisierungsdialog bietet folgende Einstellungen:

#### **Auto-Fit to Canvas** ⭐
- **Standard**: Aktiviert (Empfohlen!)
- **Beschreibung**: Skaliert und zentriert das Design automatisch, um die Canvas optimal auszunutzen
- **Tipp**: Für beste Ergebnisse aktiviert lassen

#### **Detection Mode** 
- **Standard (Threshold)**: Klassische Schwellenwert-Binarisierung
- **Adaptive Threshold**: Passt sich an lokale Helligkeitsunterschiede an
- **Edge Detection (Sobel)**: Schnelle Kantenerkennung mit Sobel-Operator
- **Canny Edge Detection (Professional)** 🆕: Industry-standard Kantenerkennung mit Hysterese
- **Tipp**: Canny für beste Qualität bei kontrastarmen Bildern

#### **Auto-Calculate Threshold**
- **Standard**: Aktiviert
- **Beschreibung**: Verwendet Otsu's Methode zur automatischen Schwellenwertberechnung
- **Tipp**: Für beste Ergebnisse aktiviert lassen

#### **Enhance Contrast First**
- **Standard**: Aktiviert
- **Beschreibung**: Verbessert den Kontrast vor der Vektorisierung
- **Tipp**: Immer aktiviert lassen für bessere Erkennungsqualität

#### **Use Professional CLAHE** 🆕
- **Standard**: Deaktiviert
- **Beschreibung**: Contrast Limited Adaptive Histogram Equalization - professionelle Kontrastverbesserung
- **Tipp**: **Aktivieren für Bilder mit niedrigem Kontrast** (z.B. orange auf weiß)
- **CLAHE Clip Limit**: 1-5 (Standard: 2.0) - höher = mehr Kontrastverstärkung
- **CLAHE Tile Size**: 4-16 (Standard: 8) - kleiner = mehr lokale Anpassung

#### **Canny Thresholds** (Bei Canny Mode) 🆕
- **Low Threshold**: 10-150 (Standard: 50) - niedrigere Werte erkennen mehr Kanten
- **High Threshold**: 50-300 (Standard: 150) - sollte 2-3x Low Threshold sein
- **Tipp**: Für feine Details: Low=30, High=90; Für starke Kanten: Low=70, High=200

#### **Use Unsharp Masking** 🆕
- **Standard**: Deaktiviert
- **Beschreibung**: Schärft Kanten vor der Erkennung
- **Sharpening Amount**: 0.5-3 (Standard: 1.5)
- **Tipp**: Aktivieren für leicht unscharfe oder verwaschene Bilder

#### **Use Morphological Operations** 🆕
- **Standard**: Deaktiviert
- **Beschreibung**: Morphologische Bildverarbeitung zur Rauschentfernung und Formverbesserung
- **Operation Types**:
  - **Opening (Remove Noise)**: Entfernt kleine Störungen (empfohlen für verrauschte Bilder)
  - **Closing (Fill Gaps)**: Füllt kleine Lücken in Linien
  - **Dilate (Thicken)**: Verdickt Linien
  - **Erode (Thin)**: Verdünnt Linien
- **Iterations**: 1-5 (Standard: 1) - mehr Iterationen = stärkerer Effekt

#### **Threshold (Schwellenwert)**
- **Bereich**: 0-255
- **Standard**: 128
- **Beschreibung**: Bestimmt, welche Pixel als schwarz/weiß betrachtet werden (nur bei manueller Einstellung)
- **Tipp**: Niedrigere Werte für dunkle Bilder, höhere für helle Bilder

#### **Adaptive Block Size** (Bei Adaptive Mode)
- **Bereich**: 5-51 (ungerade Zahlen)
- **Standard**: 15
- **Beschreibung**: Größe des lokalen Bereichs für adaptive Schwellenwertberechnung
- **Tipp**: Kleinere Werte für feinere Details, größere für glattere Ergebnisse

#### **Edge Detection Sensitivity** (Bei Edge Mode)
- **Bereich**: 10-100
- **Standard**: 30
- **Beschreibung**: Empfindlichkeit der Kantenerkennung
- **Tipp**: Niedrigere Werte erkennen mehr Kanten, höhere nur starke Kanten

#### **Median Filter Size**
- **Bereich**: 0-9 (ungerade Zahlen)
- **Standard**: 3
- **Beschreibung**: Reduziert Rauschen vor der Vektorisierung
- **Tipp**: 3-5 für normale Bilder, 0 für saubere Lineart

#### **Apply Centerline Tracing**
- **Standard**: Aktiviert
- **Beschreibung**: Wendet Skeletonisierung an, um Linien auf ihre Mittellinie zu reduzieren
- **Tipp**: Aktivieren für dickere Linien, deaktivieren für bereits dünne Linien

#### **Use Bezier Curve Fitting** 🆕
- **Standard**: Deaktiviert
- **Beschreibung**: Erzeugt glatte Bezier-Kurven (wie Potrace/Adobe Illustrator)
- **Curve Fitting Error Tolerance**: 0.5-5 (Standard: 1.0) - niedriger = genauer aber mehr Punkte
- **Tipp**: Aktivieren für professionell aussehende, glatte Kurven (Alternative zu Simplification + Smoothing)

#### **Simplification Tolerance** (Wenn Bezier deaktiviert)
- **Bereich**: 0.5-10
- **Standard**: 2.0
- **Beschreibung**: Bestimmt, wie viele Punkte entfernt werden (höher = weniger Punkte)
- **Tipp**: 2-3 für detaillierte Designs, 5-8 für vereinfachte Formen

#### **Smoothing Iterations** (Wenn Bezier deaktiviert)
- **Bereich**: 0-5
- **Standard**: 2
- **Beschreibung**: Anzahl der Glättungsdurchläufe
- **Tipp**: 1-2 für leichte Glättung, 3-4 für sehr glatte Kurven

#### **Output Scale**
- **Bereich**: 0.5x-3x
- **Standard**: 1.0x
- **Beschreibung**: Zusätzlicher Skalierungsfaktor (wird nach Auto-Fit angewandt)
- **Tipp**: Bei aktiviertem Auto-Fit meist nicht notwendig

#### **Max Processing Size** ⚠️
- **Bereich**: 500-2000px
- **Standard**: 1000px
- **Beschreibung**: Maximale Bildgröße für Verarbeitung (verhindert Browser-Einfrieren)
- **Tipp**: Höhere Werte = bessere Qualität aber langsamere Verarbeitung

### 3. Preview & Apply

1. Die Vorschau aktualisiert sich automatisch bei Änderungen
2. Überprüfen Sie die Anzahl der Pfade und Punkte in der Statusleiste
3. Klicken Sie **"Apply to Canvas"**, um die vektorisierten Pfade zu übernehmen

## 🎯 Empfohlene Einstellungen für verschiedene Bildtypen

### Schwarze Linien auf weißem Hintergrund (z.B. "celli")
- Detection Mode: **Standard** oder **Adaptive**
- Auto-Calculate Threshold: **✓**
- Enhance Contrast: **✓**
- CLAHE: nicht notwendig
- Apply Centerline Tracing: **✓**
- Auto-Fit to Canvas: **✓**

### Niedriger Kontrast (z.B. Orange auf Weiß)
- Detection Mode: **Canny Edge Detection** 🆕
- Enhance Contrast: **✓**
- **Use Professional CLAHE: ✓** 🆕
- CLAHE Clip Limit: **2.5-3.0**
- Canny Low Threshold: **30-50**
- Canny High Threshold: **90-150**
- Use Morphological Operations: **✓ (Opening)**
- Iterations: **1-2**
- Use Bezier Curve Fitting: **✓** (für glattere Ergebnisse)
- Auto-Fit to Canvas: **✓**

### Verrauschte oder unscharfe Bilder
- Detection Mode: **Canny** oder **Adaptive**
- Enhance Contrast: **✓**
- Use CLAHE: **✓**
- **Use Unsharp Masking: ✓** 🆕
- Sharpening Amount: **1.5-2.0**
- **Use Morphological Operations: ✓ (Opening)** 🆕
- Median Filter Size: **5-7**
- Auto-Fit to Canvas: **✓**

### Feine Details / Komplexe Zeichnungen
- Detection Mode: **Canny Edge Detection**
- Canny Low Threshold: **20-30**
- Canny High Threshold: **60-90**
- Enhance Contrast: **✓**
- Use CLAHE: **✓**
- Apply Centerline Tracing: **✓**
- Simplification Tolerance: **1.0-2.0** (niedrig)
- Use Bezier Curve Fitting: optional
- Max Processing Size: **1500-2000px**
- Auto-Fit to Canvas: **✓**

## Technische Details

### Algorithmen

#### **1. Kontrastverstärkung (Histogram Equalization)**
```javascript
// Verbessert Kontrast für bessere Kantenerkennung
### Algorithmen

#### **Professional Preprocessing Pipeline** 🆕

#### **1. Unsharp Masking**
```javascript
// Schärft Kanten vor der Verarbeitung
unsharpMask(imageData, amount, radius)
```

#### **2. CLAHE (Contrast Limited Adaptive Histogram Equalization)** 🆕
```javascript
// Professionelle lokale Kontrastverbesserung mit Clipping
applyCLAHE(imageData, clipLimit, tileSize)
```

#### **3. Histogram Equalization**
```javascript
// Globale Kontrastverbesserung
enhanceContrast(imageData)
```

#### **Feature Detection Methods**

#### **4. Otsu's Auto-Threshold**
```javascript
// Berechnet optimalen Schwellenwert automatisch
calculateOtsuThreshold(imageData)
```

#### **5. Adaptive Thresholding**
```javascript
// Lokale Anpassung an Beleuchtungsunterschiede
adaptiveThreshold(imageData, blockSize, c)
```

#### **6. Sobel Edge Detection**
```javascript
// Schnelle Kantenerkennung basierend auf Gradienten
detectEdges(imageData, threshold)
```

#### **7. Canny Edge Detection** 🆕
```javascript
// Industry-standard Kantenerkennung mit 5 Stufen:
// - Gaussian Blur
// - Gradient Calculation
// - Non-Maximum Suppression
// - Hysteresis Thresholding
cannyEdgeDetection(imageData, lowThreshold, highThreshold)
```

#### **Morphological Operations** 🆕

#### **8. Dilation & Erosion**
```javascript
// Grundlegende morphologische Operationen
dilate(binary, width, height, iterations)
erode(binary, width, height, iterations)
```

#### **9. Morphological Opening & Closing**
```javascript
// Opening: Entfernt kleine Störungen (Erode + Dilate)
morphologicalOpening(binary, width, height, iterations)

// Closing: Füllt kleine Lücken (Dilate + Erode)
morphologicalClosing(binary, width, height, iterations)
```

#### **Binary Image Processing**

#### **10. Binarisierung**
```javascript
// Konvertiert Farbbild in Schwarz/Weiß
imageToBinary(imageData, threshold, useAdaptive)
```

#### **11. Median Filter**
```javascript
// Reduziert Rauschen mit Median-Filterung
medianFilter(binary, width, height, kernelSize)
```

#### **Centerline Tracing**

#### **12. Zhang-Suen Skeletonisierung**
```javascript
// Reduziert Linien auf 1-Pixel-Breite
// Mit optimiertem Early Termination
skeletonize(binary, width, height, maxIterations)
```

#### **13. Centerline Tracing**
```javascript
// Verfolgt Skelett-Pixel zu zusammenhängenden Pfaden
traceCenterlines(skeleton, width, height)
```

#### **Path Optimization**

#### **14. Bezier Curve Fitting** 🆕
```javascript
// Erzeugt glatte Bezier-Kurven (Potrace-style)
fitBezierCurves(path, errorThreshold)
```

#### **15. Ramer-Douglas-Peucker Vereinfachung**
```javascript
// Reduziert Anzahl der Punkte bei Erhaltung der Form
simplifyPath(points, tolerance)
```

#### **16. Chaikin's Corner Cutting**
```javascript
// Glättet Pfade durch iteratives Corner Cutting
smoothPath(points, iterations)
```

### Dateistruktur

```
src/
├── components/
│   ├── VectorizeDialog.vue       # Hauptdialog mit allen Einstellungen
│   └── ImportDialog.vue          # Erweitert um Vektorisierungsoption
├── services/
│   └── vectorizeService.js       # Service-Layer mit Auto-Fit
├── utils/
│   └── vectorizeUtils.js         # 16+ Core-Algorithmen (1100+ Zeilen)
└── stores/
    └── drawing.js                # Erweitert um addVectorizedPaths()
```

## Best Practices

### Für beste Ergebnisse:

1. **Bildvorbereitung**:
   - Verwenden Sie kontrastreiche Bilder
   - Einfache Linienzeichnungen funktionieren am besten
   - Vermeiden Sie zu viele Details oder Texturen
   - Für kontrastarme Bilder: CLAHE aktivieren

2. **Auto-Fit to Canvas**:
   - Immer aktiviert lassen für optimale Canvas-Nutzung
   - Skaliert automatisch auf 90% der Canvas-Größe
   - Zentriert das Design automatisch
   - Output Scale nur für Feintuning verwenden

3. **Einstellungen für verschiedene Bildtypen**:
   
   **Hochkontrast Schwarz/Weiß (z.B. "Celli")**:
   - Detection Mode: Standard oder Adaptive
   - Auto-Calculate Threshold: Aktiviert
   - Enhance Contrast: Optional
   - CLAHE: Nicht notwendig
   - Auto-Fit: ✓
   
   **Niedriger Kontrast / Farbig (z.B. Orange auf Weiß)** 🆕:
   - Detection Mode: **Canny Edge Detection**
   - Enhance Contrast: Aktiviert
   - **Use CLAHE: ✓ (Clip Limit: 2.5-3.0)**
   - Canny Low: 30-50, High: 90-150
   - Use Morphological Operations: ✓ (Opening, 1-2 iterations)
   - Use Bezier Fitting: Optional für glattere Kurven
   - Auto-Fit: ✓
   
   **Handzeichnungen / Skizzen**:
   - Detection Mode: Canny oder Adaptive
   - Enhance Contrast: Aktiviert
   - Use CLAHE: Optional
   - Use Unsharp Mask: Optional für unscharfe Scans
   - Median Filter: 3-5
   - Auto-Fit: ✓
   
   **Verrauschte Bilder** 🆕:
   - Use Unsharp Mask: ✓ (wenn unscharf)
   - Use CLAHE: ✓
   - Use Morphological Operations: ✓ (Opening)
   - Median Filter: 5-7
   - Auto-Fit: ✓

4. **Einstellungen**:
   - Beginnen Sie mit Standardeinstellungen
   - Bei schlechten Ergebnissen: Wechseln Sie den Detection Mode
   - Bei niedrigem Kontrast: CLAHE aktivieren
   - Bei Rauschen: Morphological Opening verwenden
   - Erhöhen Sie Simplification für einfachere Designs
   - Verwenden Sie Smoothing sparsam (zu viel kann Details verlieren)

4. **Performance**:
   - Große Bilder können länger dauern
   - Erwägen Sie, Bilder vor dem Import zu verkleinern
   - Höhere Simplification-Werte verbessern die Performance

## Troubleshooting

### Problem: Linien werden nicht erkannt (niedriger Kontrast)
**Lösung**: 
- Aktivieren Sie "Enhance Contrast First"
- Wechseln Sie zu "Adaptive Threshold" oder "Edge Detection" Mode
- Bei Edge Detection: Reduzieren Sie Edge Sensitivity

### Problem: Zu viele kleine Pfade
**Lösung**: Erhöhen Sie Median Filter Size und Simplification Tolerance

### Problem: Verlorene Details
**Lösung**: Reduzieren Sie Simplification Tolerance und Smoothing Iterations

### Problem: Ungleichmäßige Linien
**Lösung**: Erhöhen Sie Smoothing Iterations

### Problem: Zu dicke oder dünne Linien (Standard Mode)
**Lösung**: 
- Deaktivieren Sie "Auto-Calculate Threshold"
- Passen Sie Threshold manuell an (niedriger = dicker, höher = dünner)

### Problem: Lücken in Linien
**Lösung**: 
- Bei Standard Mode: Reduzieren Sie Threshold
- Bei Adaptive Mode: Erhöhen Sie Block Size
- Bei Edge Mode: Reduzieren Sie Edge Sensitivity
- Reduzieren oder deaktivieren Sie Median Filter

## API Referenz

### VectorizeService

```javascript
import { VectorizeService } from '@/services/vectorizeService.js'

// Vektorisiere Bild mit erweiterten Optionen
const paths = await VectorizeService.processImage(imageDataUrl, {
  // Detection Mode
  useEdgeDetection: false,
  useAdaptiveThreshold: false,
  
  // Pre-processing
  enhanceContrastFirst: true,
  
  // Standard Threshold Options
  threshold: 128,
  autoThreshold: true, // Otsu's method
  
  // Adaptive Threshold Options
  adaptiveBlockSize: 15,
  
  // Edge Detection Options
  edgeThreshold: 30,
  
  // Post-processing
  medianFilterSize: 3,
  applySkeletonize: true,
  simplifyTolerance: 2.0,
  smoothIterations: 2
})

// Konvertiere Pfade zu Stichen
const stitches = VectorizeService.convertPathsToStitches(paths, scale)
```

### Drawing Store

```javascript
import { useDrawingStore } from '@/stores/drawing.js'

const drawingStore = useDrawingStore()

// Füge vektorisierte Pfade hinzu
drawingStore.addVectorizedPaths(paths, scale)
```

## Zukünftige Erweiterungen

Mögliche Verbesserungen:

- [ ] Mehrfarbige Vektorisierung
- [ ] Canny Edge Detection als weitere Option
- [ ] Batch-Processing für mehrere Bilder
- [ ] Export der Vektorisierungseinstellungen als Preset
- [ ] Konturbasierte Vektorisierung als Alternative
- [ ] Hough Transform für Linienerkennung

## Credits

- Inspiriert von [Incrediplotter](https://github.com/jiink/incrediplotter)
- Zhang-Suen Thinning Algorithm
- Otsu's Thresholding Method
- Adaptive Thresholding (Integral Image)
- Sobel Edge Detection
- Histogram Equalization
- Ramer-Douglas-Peucker Simplification
- Chaikin's Corner Cutting Algorithm
