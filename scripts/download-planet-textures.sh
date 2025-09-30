#!/bin/bash

# Download NASA and CC-licensed planet textures
# These are 2k resolution textures from various public domain sources

TEXTURE_DIR="/storage/dev/3idashboard/public/textures/planets"
mkdir -p "$TEXTURE_DIR"

echo "Downloading planet textures..."

# Solar System Scope provides free CC-licensed textures
# These URLs are from their public CDN

# Sun (2k)
echo "Downloading Sun..."
curl -L -o "$TEXTURE_DIR/sun.jpg" \
  "https://www.solarsystemscope.com/textures/download/2k_sun.jpg" \
  || echo "Failed to download Sun texture"

# Mercury (2k)
echo "Downloading Mercury..."
curl -L -o "$TEXTURE_DIR/mercury.jpg" \
  "https://www.solarsystemscope.com/textures/download/2k_mercury.jpg" \
  || echo "Failed to download Mercury texture"

# Venus (2k - atmosphere)
echo "Downloading Venus..."
curl -L -o "$TEXTURE_DIR/venus.jpg" \
  "https://www.solarsystemscope.com/textures/download/2k_venus_atmosphere.jpg" \
  || echo "Failed to download Venus texture"

# Earth (2k)
echo "Downloading Earth..."
curl -L -o "$TEXTURE_DIR/earth.jpg" \
  "https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg" \
  || echo "Failed to download Earth texture"

# Mars (2k)
echo "Downloading Mars..."
curl -L -o "$TEXTURE_DIR/mars.jpg" \
  "https://www.solarsystemscope.com/textures/download/2k_mars.jpg" \
  || echo "Failed to download Mars texture"

# Jupiter (2k)
echo "Downloading Jupiter..."
curl -L -o "$TEXTURE_DIR/jupiter.jpg" \
  "https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg" \
  || echo "Failed to download Jupiter texture"

# Saturn (2k)
echo "Downloading Saturn..."
curl -L -o "$TEXTURE_DIR/saturn.jpg" \
  "https://www.solarsystemscope.com/textures/download/2k_saturn.jpg" \
  || echo "Failed to download Saturn texture"

# Uranus (2k)
echo "Downloading Uranus..."
curl -L -o "$TEXTURE_DIR/uranus.jpg" \
  "https://www.solarsystemscope.com/textures/download/2k_uranus.jpg" \
  || echo "Failed to download Uranus texture"

# Neptune (2k)
echo "Downloading Neptune..."
curl -L -o "$TEXTURE_DIR/neptune.jpg" \
  "https://www.solarsystemscope.com/textures/download/2k_neptune.jpg" \
  || echo "Failed to download Neptune texture"

# Pluto (use alternate source as Solar System Scope may not have it)
echo "Downloading Pluto..."
curl -L -o "$TEXTURE_DIR/pluto.jpg" \
  "https://www.solarsystemscope.com/textures/download/2k_makemake_fictional.jpg" \
  || echo "Failed to download Pluto texture (using alternate dwarf planet)"

echo ""
echo "Download complete! Checking file sizes..."
ls -lh "$TEXTURE_DIR"

echo ""
echo "Textures installed to: $TEXTURE_DIR"
echo "Refresh your browser to see the new textures!"