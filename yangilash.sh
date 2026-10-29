#!/bin/sh
# Har o'zgarishdan keyin ishga tushiring: versiyani yangilaydi, shunda saytga qayta kirganlar yangi versiyani darhol ko'radi.
V=$(date -u +%Y%m%d%H%M%S)
sed -i "s/const APP_VERSION = \"[0-9]*\"/const APP_VERSION = \"$V\"/" index.html
printf '{"v":"%s"}\n' "$V" > version.json
echo "Versiya: $V"
