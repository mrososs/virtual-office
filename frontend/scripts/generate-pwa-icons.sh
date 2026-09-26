#!/usr/bin/env bash
# Regenerates the PWA / favicon icons from the company logo (requires ffmpeg).
#   bash frontend/scripts/generate-pwa-icons.sh
# The logo is scaled uniformly (never stretched) and centered on the app's
# canvas color, because it is drawn for dark backgrounds (white shapes).
set -euo pipefail

cd "$(dirname "$0")/.."
LOGO=src/assets/branding/company-logo.png
OUT=public
BG=0x0a0c11   # --vo-canvas (rgb 10 12 17), also the manifest background/theme color

# icon <size> <logo width as fraction of size> <corner radius fraction> <file>
icon() {
  local size=$1 fraction=$2 radius=$3 file=$4
  local logo_w r
  logo_w=$(awk -v s="$size" -v f="$fraction" 'BEGIN { printf "%d", s * f }')
  r=$(awk -v s="$size" -v f="$radius" 'BEGIN { printf "%d", s * f }')
  local alpha="255"
  if [ "$r" -gt 0 ]; then
    alpha="if(gt(abs(X-W/2),W/2-${r})*gt(abs(Y-H/2),H/2-${r}),if(lte(hypot(abs(X-W/2)-(W/2-${r}),abs(Y-H/2)-(H/2-${r})),${r}),255,0),255)"
  fi
  ffmpeg -v error -y \
    -f lavfi -i "color=c=${BG}:s=${size}x${size}" -i "$LOGO" \
    -filter_complex "[1]scale=${logo_w}:-1:flags=lanczos[logo];[0][logo]overlay=(W-w)/2:(H-h)/2:format=auto,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${alpha}'" \
    -frames:v 1 "$OUT/$file"
}

icon 192 0.70 0.22 pwa-192x192.png
icon 512 0.70 0.22 pwa-512x512.png
# Maskable: full bleed, logo inside the central 80% safe zone.
icon 512 0.58 0    pwa-maskable-512x512.png
# iOS rounds the corners itself.
icon 180 0.70 0    apple-touch-icon-180x180.png
icon 48  0.84 0.18 favicon-48x48.png
icon 32  0.86 0.18 favicon-32x32.png
ffmpeg -v error -y -i "$OUT/favicon-48x48.png" "$OUT/favicon.ico"
rm "$OUT/favicon-48x48.png"
echo "Icons written to $OUT/"
