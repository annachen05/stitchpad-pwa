# Vectorization & Stitching Separation

## Übersicht

Die Vektorisierung und das Sticken sind jetzt **getrennt**, sodass Benutzer volle Kontrolle über beide Prozesse haben.

## Neuer Workflow

```
┌──────────────┐
│    Import    │  Import Image
│    Dialog    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Vectorize   │  Choose "Vectorize"
│    Dialog    │  - Adjust edge detection
└──────┬───────┘  - Optimize path settings
       │          - Preview paths
       │          - Click " Save Vectorization"
       ▼
┌──────────────┐
│   Stitch     │  Configure how paths become stitches
│  Settings    │  - Stitch Type (Running, Satin, Fill)
│    Dialog    │  - Stitch Length
└──────┬───────┘  - Scale
       │          - Path Optimization
       │          - Click "✅ Apply to Canvas"
       ▼
┌──────────────┐
│   Canvas     │  Stitches rendered on canvas
│   Applied    │  Ready for export
└──────────────┘
```

## Vorteile

### 1. Flexibilität
- **Vektorisierung perfektionieren** ohne Stitches zu generieren
- **Verschiedene Sticheinstellungen testen** mit denselben Pfaden
- **Keine Neuberechnung** der Vektorisierung bei Stichänderungen

### 2. Kontrolle
- Benutzer sehen **genau was erkannt wurde** (Pfade)
- Benutzer sehen **genau wie es gestickt wird** (Stitches)
- Klar getrennte Einstellungen für jeden Schritt

### 3. Workflow-Effizienz
- **Vektorisierte Pfade werden gespeichert** → können wiederverwendet werden
- **Sticheinstellungen sind sofort anpassbar** → kein erneutes Vektorisieren
- **"Configure Stitching" Button** → zurück zu den Einstellungen

## Komponenten

### 1. VectorizeDialog.vue
**Zweck**: Bilderkennung und Pfad-Extraktion

**Änderungen**:
- Button geändert: "Apply to Canvas" → " Save Vectorization"
- Neue Funktion: `saveVectorization()` 
  - Speichert Pfade im Store (nicht als Stitches!)
  - Emittiert `vectorization-complete` Event
- Event enthält jetzt: `{ pathCount, metadata }`

**Output**: Rohe vektorisierte Pfade im Store

### 2. StitchSettingsDialog.vue (NEU!)
**Zweck**: Stichkonfiguration und Anwendung

**Features**:
- **Stitch Type**: Running (aktiv), Satin (coming soon), Fill (coming soon)
- **Stitch Length**: 2-5mm slider
- **Scale**: 50-200% slider
- **Path Optimization**: Toggle für jump stitch reduction
- **Statistics Preview**: Zeigt geschätzte Stiche
- **Apply Button**: Konvertiert Pfade → Stitches und wendet auf Canvas an

**Input**: `drawingStore.vectorizedPaths`
**Output**: Stitches auf Canvas

### 3. ImportDialog.vue
**Zweck**: Workflow-Koordination

**Änderungen**:
- Importiert `StitchSettingsDialog`
- State: `showStitchSettingsDialog`, `vectorizationPathCount`
- `handleVectorizationComplete()`: Öffnet Stitch Dialog statt zu schließen
- Neuer Button: "🧵 Configure Stitching" (wenn Pfade existieren)
- Funktion: `openStitchSettings()` für Rückkehr

**Flow-Management**: Vectorize → Stitch Settings → Canvas

### 4. drawing.js Store
**Zweck**: State Management

**Neue State**:
```javascript
vectorizedPaths: null,          // Array von Pfaden
vectorizationMetadata: null,    // Bounds, settings, etc.
```

**Neue Actions**:
```javascript
setVectorizedPaths(paths, metadata)      // Speichert Pfade
clearVectorizedPaths()                   // Löscht Pfade
applyVectorizedPathsAsStitches(settings) // Konvertiert → Stitches
```

## Benutzer-Workflow

### Erstmaliger Import
1. **Import Dialog öffnen** → "Import" Button
2. **Bild wählen** → Drag & Drop oder File Browser
3. **"Vectorize" wählen** → Im Choice Dialog
4. **Vektorisierung konfigurieren**:
   - Edge Detection Mode wählen
   - Threshold anpassen
   - Preview prüfen
   - " Save Vectorization" klicken
5. **Stiche konfigurieren** (Dialog öffnet automatisch):
   - Stitch Type: Running
   - Stitch Length: 3mm
   - Scale: 100%
   - Path Optimization: ON
   - "✅ Apply to Canvas" klicken
6. **Fertig!** Stitches auf Canvas

### Sticheinstellungen ändern (ohne Neu-Vektorisierung)
1. **Import Dialog öffnen**
2. **"🧵 Configure Stitching" klicken**
3. **Einstellungen ändern**:
   - Z.B. Stitch Length: 2mm
   - Scale: 120%
4. **"✅ Apply to Canvas" klicken**
5. **Sofort aktualisiert!** Keine Neuberechnung der Pfade

### Neu-Vektorisierung mit anderen Settings
1. **Import Dialog öffnen**
2. **"🔄 Re-vectorize Last Image" klicken**
3. **Settings ändern** (z.B. anderer Edge Detection Mode)
4. **" Save Vectorization" klicken**
5. **Stich-Dialog öffnet automatisch**
6. **Apply to Canvas**

## Technische Details

### Datenfluss

```javascript
// 1. Vektorisierung
const paths = await VectorizeService.processImage(imageUrl, settings)
// paths = [[x,y], [x,y], ...] array of point arrays

// 2. Speichern im Store
drawingStore.setVectorizedPaths(paths, metadata)
// Store: vectorizedPaths = paths (RAW, nicht als Stitches!)

// 3. Stich-Konvertierung (später, separat)
drawingStore.applyVectorizedPathsAsStitches({
  stitchType: 'running',
  stitchLength: 3.0,
  scale: 1.0
})
// Store: shepherd.steps = [stitch objects]
```

### Pfad-Format
```javascript
// Vectorized Path (Point Array)
path = [
  [x1, y1],
  [x2, y2],
  [x3, y3],
  // ...
]

// Stitch (Line Segment)
stitch = {
  x1, y1,    // Start point
  x2, y2,    // End point
  penDown    // true = running stitch, false = jump
}
```

### Metadata
```javascript
metadata = {
  autoFit: boolean,
  outputScale: number,
  canvas: { width, height },
  bounds: { minX, minY, maxX, maxY, width, height },
  pathCount: number,
  settings: { ...vectorizeSettings }
}
```

## Zukünftige Erweiterungen

### Phase 2: Erweiterte Stichtypen
- [ ] **Satin Stitch**: Parallele Linien für breite Striche
- [ ] **Fill Stitch**: Füll-Algorithmus für Flächen
- [ ] **Underlay Stitches**: Stabilisierungsschicht
- [ ] **Pull Compensation**: Automatische Korrektur für Fabric Stretch

### Phase 3: Interaktive Bearbeitung
- [ ] **Path Editing**: Pfade vor Stich-Konvertierung bearbeiten
- [ ] **Path Grouping**: Pfade gruppieren für unterschiedliche Stichtypen
- [ ] **Color Assignment**: Farben zuweisen pro Path-Gruppe
- [ ] **Manual Path Order**: Drag & Drop Reihenfolge

### Phase 4: Preview Verbesserungen
- [ ] **Split Preview**: Pfade links, Stitches rechts
- [ ] **Overlay Mode**: Beide gleichzeitig sehen
- [ ] **3D Preview**: Realistische Stich-Darstellung
- [ ] **Animation**: Stich-Reihenfolge animiert

## Beispiel-Code

### Vektorisierte Pfade speichern
```javascript
// In VectorizeDialog.vue
async function saveVectorization() {
  const paths = currentPaths // [[x,y], [x,y], ...]
  const metadata = {
    bounds: VectorizeService.calculateBounds(paths),
    settings: { ...settings.value }
  }
  
  drawingStore.setVectorizedPaths(paths, metadata)
  emit('vectorization-complete', { pathCount: paths.length })
}
```

### Stitches anwenden
```javascript
// In StitchSettingsDialog.vue
function applyStitchSettings() {
  drawingStore.applyVectorizedPathsAsStitches({
    stitchType: settings.value.stitchType,
    stitchLength: settings.value.stitchLength,
    scale: settings.value.scale
  })
}
```

### Zurück zu Stich-Einstellungen
```javascript
// In ImportDialog.vue
function openStitchSettings() {
  if (drawingStore.vectorizedPaths) {
    showStitchSettingsDialog.value = true
  }
}
```

## Testing

### Testfälle
1. ✅ Vectorize → Save → Stitch Settings → Apply → Canvas zeigt Stitches
2. ✅ Vectorize → Save → Cancel → "Configure Stitching" Button erscheint
3. ✅ "Configure Stitching" → Settings ändern → Apply → Canvas aktualisiert
4. ✅ "Re-vectorize" → Andere Settings → Save → Stitch Dialog öffnet
5. ✅ Path Optimization Toggle funktioniert im Stitch Dialog

### Performance
- Vektorisierung: ~1-3 Sekunden (je nach Bild)
- Stich-Konvertierung: <100ms (instant)
- Re-Sticken ohne Vektorisierung: <100ms (instant)

## Vorher/Nachher

### Vorher (Gekoppelt)
```
Import → Vectorize → [AUTOMATISCH zu Stitches] → Canvas
```
❌ Keine Kontrolle über Stich-Einstellungen
❌ Neu-Vektorisierung nötig für Änderungen
❌ Keine Vorschau der Pfade allein

### Nachher (Getrennt)
```
Import → Vectorize → [PFADE SPEICHERN] → Stitch Config → Canvas
                     ↑                      ↓
                     └──────────────────────┘
                     (Wiederholbar ohne Neu-Vektorisierung)
```
✅ Volle Kontrolle über beide Schritte
✅ Stich-Einstellungen änderbar ohne Neu-Vektorisierung
✅ Klare Trennung: "Was erkannt?" vs "Wie gestickt?"

## Zusammenfassung

Die Trennung von Vektorisierung und Sticken gibt Benutzern:

1. **Klarheit**: Was wurde vom Bild erkannt? (Pfade)
2. **Kontrolle**: Wie soll es gestickt werden? (Stitch Settings)
3. **Flexibilität**: Verschiedene Einstellungen mit denselben Pfaden testen
4. **Effizienz**: Keine Neuberechnung bei Stich-Änderungen
5. **Erweiterbarkeit**: Basis für fortgeschrittene Features (Satin, Fill, etc.)

Die Implementierung ist **abwärtskompatibel** - bestehende Funktionalität bleibt erhalten, wird nur um mehr Optionen erweitert.
