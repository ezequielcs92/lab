"""Inventory originals and estimate a WebP pilot in memory; never modify images."""
from pathlib import Path
from collections import defaultdict
from io import BytesIO
import json
from PIL import Image, ImageOps

root = Path('public/clubes/galeria')
files = sorted(p for p in root.rglob('*') if p.is_file())
groups = defaultdict(lambda: {'files':0,'bytes':0})
for file in files:
    groups[file.suffix.lower()]['files'] += 1
    groups[file.suffix.lower()]['bytes'] += file.stat().st_size
samples=[]
for file in sorted(files,key=lambda p:p.stat().st_size,reverse=True)[:10]:
    try:
        with Image.open(file) as image:
            image=ImageOps.exif_transpose(image)
            before=image.size
            image.thumbnail((1920,1920))
            if image.mode not in ('RGB','RGBA'): image=image.convert('RGB')
            output=BytesIO(); image.save(output,format='WEBP',quality=82,method=6)
            samples.append({'file':str(file.relative_to(root)),'originalBytes':file.stat().st_size,'originalDimensions':before,'webpBytes':len(output.getvalue()),'dimensions':image.size})
    except Exception as error:
        samples.append({'file':str(file.relative_to(root)),'error':str(error)})
inventory={'files':len(files),'bytes':sum(p.stat().st_size for p in files),'formats':dict(groups),'pilot':samples,'originalsModified':False,'pilotSelection':'10 largest originals; not representative of entire gallery'}
Path('GALERIA_INVENTARIO.json').write_text(json.dumps(inventory,indent=2),encoding='utf-8')
print(json.dumps(inventory,indent=2))
