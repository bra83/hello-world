#!/usr/bin/env python3
"""R584: mobile Night City atlas token legibility without changing world placement."""
from pathlib import Path
import sys

OLD = "const p=this.getPosition(),x=p.x*this.manifest.sourceWidth,y=p.y*this.manifest.sourceHeight,worldSize=52/this.scale;"
NEW = ("const p=this.getPosition(),x=p.x*this.manifest.sourceWidth,y=p.y*this.manifest.sourceHeight,"
       "fitScale=Math.min(this.vp.clientWidth/this.manifest.sourceWidth,this.vp.clientHeight/this.manifest.sourceHeight),"
       "zoomRatio=this.scale/Math.max(fitScale,0.000001),"
       "screenSize=clamp(84-14*Math.log2(Math.max(0.1,zoomRatio)),64,104),worldSize=screenSize/this.scale;")

def apply(root):
    root = Path(root).resolve()
    atlas = root / "app/src/main/assets/web/app/atlas.js"
    text = atlas.read_text(encoding="utf-8")
    if text.count(OLD) != 1:
        raise RuntimeError(f"Expected exactly one canonical atlas token render anchor; found {text.count(OLD)}")
    text = text.replace(OLD, NEW)
    atlas.write_text(text, encoding="utf-8")

    gradle = root / "app/build.gradle.kts"
    config = gradle.read_text(encoding="utf-8")
    if 'versionCode = 4183' not in config or 'versionName = "4.1.83"' not in config:
        raise RuntimeError("Wrong base version: need patched 4.1.83 before applying R584")
    config = config.replace("versionCode = 4183", "versionCode = 4184")
    config = config.replace('versionName = "4.1.83"', 'versionName = "4.1.84"')
    gradle.write_text(config, encoding="utf-8")

    index = root / "app/src/main/assets/web/app/index.html"
    html = index.read_text(encoding="utf-8")
    if "build=4183" not in html:
        raise RuntimeError("Missing R583 web cache-buster")
    index.write_text(html.replace("build=4183", "build=4184"), encoding="utf-8")
    print("R584_ATLAS_TOKEN_PASS: 84px nominal; 64-104px screen clamp; world position unchanged; 4.1.84/4184")

if __name__ == "__main__":
    apply(sys.argv[1])
