#!/bin/sh

if test ! -d "icons"; then
  echo "Run it in the base directory of the abc-chrome project."
  exit 1
fi

if ! which convert > /dev/null; then
  echo "Imagemagick is missing - 'convert' command hasnt been detected!"
  exit 1
fi

LOGO_RED="shared/images/logo-icon-red.svg"
LOGO_GRAY="shared/images/logo-icon-gray.svg"
LOGO_GREEN="shared/images/logo-icon-green.svg"
LOGO_YELLOW="shared/images/logo-icon-yellow.svg"

convert -density 57 \
  -background transparent $LOGO_RED +antialias "adblockcash/icon.png"
convert -density 76 \
  -background transparent $LOGO_RED +antialias "adblockcash/icon64.png"

convert -density 19 \
  -background transparent $LOGO_RED +antialias "icons/abc-16.png"
convert -density 38 \
  -background transparent $LOGO_RED +antialias "icons/abc-32.png"
convert -density 76 \
  -background transparent $LOGO_RED +antialias "icons/abc-64.png"
convert -density 152 \
  -background transparent $LOGO_RED +antialias "icons/abc-128.png"

convert -density 23 \
  -background transparent $LOGO_RED +antialias "chrome/icons/abc-19.png"
convert -density 46 \
  -background transparent $LOGO_RED +antialias "chrome/icons/abc-38.png"
convert -density 57 \
  -background transparent $LOGO_RED +antialias "chrome/icons/abc-48.png"

convert -density 115 \
  -background transparent $LOGO_RED +antialias "adblockcash/chrome/skin/abc-icon-big.png"
convert -density 19 -background transparent $LOGO_RED +antialias "adblockcash/chrome/skin/abc-status-16-red.png"
convert -density 19 -background transparent $LOGO_GRAY +antialias "adblockcash/chrome/skin/abc-status-16-gray.png"
convert -density 19 -background transparent $LOGO_GREEN +antialias "adblockcash/chrome/skin/abc-status-16-green.png"
convert -density 19 -background transparent $LOGO_YELLOW +antialias "adblockcash/chrome/skin/abc-status-16-yellow.png"
convert -density 37 -background transparent $LOGO_RED +antialias "adblockcash/chrome/skin/abc-status-32-red.png"
convert -density 37 -background transparent $LOGO_GRAY +antialias "adblockcash/chrome/skin/abc-status-32-gray.png"
convert -density 37 -background transparent $LOGO_GREEN +antialias "adblockcash/chrome/skin/abc-status-32-green.png"
convert -density 37 -background transparent $LOGO_YELLOW +antialias "adblockcash/chrome/skin/abc-status-32-yellow.png"
convert -density 28 -background transparent $LOGO_RED +antialias "adblockcash/chrome/skin/abc-status-24-red.png"
convert -density 28 -background transparent $LOGO_GRAY +antialias "adblockcash/chrome/skin/abc-status-24-gray.png"
convert -density 28 -background transparent $LOGO_GREEN +antialias "adblockcash/chrome/skin/abc-status-24-green.png"
convert -density 28 -background transparent $LOGO_YELLOW +antialias "adblockcash/chrome/skin/abc-status-24-yellow.png"

# convert -density 32 \
#   -background transparent $LOGO_RED +antialias "safari/icons/abc-32.png"
