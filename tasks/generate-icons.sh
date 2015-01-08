#!/bin/sh

if test ! -d "icons"; then
  echo "Run it in the base directory of the abc-chrome project."
  exit 1
fi

if ! which convert > /dev/null; then
  echo "Imagemagick is missing - 'convert' command hasnt been detected!"
  exit 1
fi

LOGO="assets/images/logo-icon.svg"
LOGO_DISABLED="assets/images/logo-icon-gray.svg"

convert -density 19 \
  -background transparent $LOGO +antialias "icons/abc-16.png"
convert -density 37 \
  -background transparent $LOGO +antialias "icons/abc-32.png"
convert -density 74 \
  -background transparent $LOGO +antialias "icons/abc-64.png"
convert -density 147 \
  -background transparent $LOGO +antialias "icons/abc-128.png"

convert -density 22 \
  -background transparent $LOGO +antialias "chrome/icons/abc-19.png"
convert -density 44 \
  -background transparent $LOGO +antialias "chrome/icons/abc-38.png"
convert -density 55 \
  -background transparent $LOGO +antialias "chrome/icons/abc-48.png"

convert -density 115 \
  -background transparent $LOGO +antialias "adblockplus/chrome/skin/abc-icon-big.png"
# convert -density 16 -background transparent $LOGO +antialias "adblockplus/chrome/skin/abc-status-16.png"
convert -density 19 -background transparent $LOGO +antialias "adblockplus/chrome/skin/abc-status-16-enabled.png"
convert -density 19 -background transparent $LOGO_DISABLED +antialias "adblockplus/chrome/skin/abc-status-16-disabled.png"
# convert -density 16 -background transparent $LOGO +antialias "adblockplus/chrome/skin/abc-status-32.png"
convert -density 37 -background transparent $LOGO +antialias "adblockplus/chrome/skin/abc-status-32-enabled.png"
convert -density 37 -background transparent $LOGO_DISABLED +antialias "adblockplus/chrome/skin/abc-status-32-disabled.png"
# convert -density 16 -background transparent $LOGO +antialias "adblockplus/chrome/skin/abc-status.png"
convert -density 28 -background transparent $LOGO +antialias "adblockplus/chrome/skin/abc-status-24-enabled.png"
convert -density 28 -background transparent $LOGO_DISABLED +antialias "adblockplus/chrome/skin/abc-status-24-disabled.png"

convert -density 32 \
  -background transparent $LOGO +antialias "safari/icons/abc-32.png"
