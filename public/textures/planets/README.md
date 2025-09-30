# Planet Texture Maps

Download high-quality NASA texture maps and place them in this directory.

## Recommended Sources

### Solar System Scope Textures (Free, High Quality)
https://www.solarsystemscope.com/textures/

Download 2k resolution JPG textures:
- `sun.jpg` - 2k Sun surface
- `mercury.jpg` - 2k Mercury surface
- `venus.jpg` - 2k Venus atmosphere
- `earth.jpg` - 2k Earth (with clouds if available)
- `mars.jpg` - 2k Mars surface
- `jupiter.jpg` - 2k Jupiter atmosphere
- `saturn.jpg` - 2k Saturn atmosphere
- `uranus.jpg` - 2k Uranus atmosphere
- `neptune.jpg` - 2k Neptune atmosphere
- `pluto.jpg` - 2k Pluto surface (if available)

### Alternative: NASA SVS (Scientific Visualization Studio)
https://svs.gsfc.nasa.gov/

### File Naming Convention
All files should be lowercase and use `.jpg` format:
- sun.jpg
- mercury.jpg
- venus.jpg
- earth.jpg
- mars.jpg
- jupiter.jpg
- saturn.jpg
- uranus.jpg
- neptune.jpg
- pluto.jpg

## Recommended Specifications
- Format: JPG (smaller file size than PNG for solid textures)
- Resolution: 2k (2048x1024) - good balance of quality vs file size
- Total size: ~5-10MB for all planets

## Notes
- The visualization will fallback to solid colors if textures are not found
- Textures are loaded asynchronously and won't block the initial render
- Higher resolution (4k) textures will look better but load slower