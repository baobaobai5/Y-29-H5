from PIL import Image
from pathlib import Path
import json
c=json.loads(Path('dist/catalog.json').read_text()); movies={}
for section in c['home_recommends']+c['sections']:
 for m in section['items']: movies.setdefault(m['id'],m)
for m in c.get('extraMovies',[]): movies.setdefault(m['id'],m)
rows=[]
for m in movies.values():
 p=Path('dist')/m['img'].lstrip('/')
 if not p.exists(): continue
 with Image.open(p) as im:
  pixels=list(im.convert('RGB').resize((8,8),Image.Resampling.BILINEAR).getdata())
 rows.append({'id':m['id'],'pixels':[v for pixel in pixels for v in pixel]})
Path('dist/image-search-index.json').write_text(json.dumps(rows,separators=(',',':')))
print(len(rows))
