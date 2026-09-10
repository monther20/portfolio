"""Deterministic, low-poly reconstruction of the supplied lantern drawing.
Requires Python 3, numpy and Pillow. Builds a self-contained glTF 2.0 GLB.
Y is up; +Z faces away from the wall. Dimensions are estimated, in metres.
"""
from pathlib import Path
import math, json, struct, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parents[1]
RNG = random.Random(731)
SIZE = 1024
# Eight-pixel gutters; every face uses a deliberately stacked, reusable island.
TILES = {
    'plate': (8, 8, 320, 496),
    'roof': (336, 8, 672, 264),
    'glass': (688, 8, 1016, 496),
    'band': (336, 280, 672, 352),
    'post': (336, 368, 424, 752),
    'lower': (440, 368, 672, 536),
    'tube': (440, 552, 672, 680),
    'core': (688, 512, 856, 832),
    'dark': (872, 512, 1016, 640),
    'cap': (440, 696, 672, 1008),
    'plain': (8, 512, 320, 1008),
}

def bez(p0,p1,p2,p3,n=7):
    out=[]
    for t in np.linspace(0,1,n+1)[1:]:
        p=(1-t)**3*np.array(p0)+3*(1-t)**2*t*np.array(p1)+3*(1-t)*t*t*np.array(p2)+t**3*np.array(p3)
        out.append(tuple(p))
    return out

# Ornamental outline, normalized left to right / top to bottom.
PLATE=[(.5,0)]
PLATE+=bez((.5,0),(.64,0),(.75,.07),(.775,.155),10)
PLATE += [(.895,.155),(.895,.202)]
PLATE+=bez((.895,.202),(.895,.262),(.945,.292),(1,.30),5)
PLATE += [(1,.892)]
PLATE+=bez((1,.892),(.921,.89),(.862,.934),(.852,1),5)
PLATE += [(.148,1)]
PLATE+=bez((.148,1),(.138,.934),(.079,.89),(0,.892),5)
PLATE += [(0,.30)]
PLATE+=bez((0,.30),(.055,.292),(.105,.262),(.105,.202),5)
PLATE += [(.105,.155),(.225,.155)]
PLATE+=bez((.225,.155),(.25,.07),(.36,0),(.5,0),10)
PLATE=PLATE[:-1]

def pencil(draw, points, shade=48, width=1.2, passes=3, alpha=255):
    # Resample the stroke itself: moving only its endpoints still makes rulers.
    # These fixed-seed marks live in the atlas, so they never shimmer in motion.
    contour=passes>1
    for k in range(passes):
        phase=RNG.uniform(0,math.tau)
        wavelength=RNG.uniform(30,85)
        amplitude=(1.6 if k==0 else 2.8) if contour else .75
        offset=RNG.uniform(-1.5,1.5) if k else RNG.uniform(-.4,.4)
        bias=RNG.uniform(-12,16)+(k*14 if contour else 0)
        distance=0.;previous=None;wander=0.
        for a,b in zip(points,points[1:]):
            dx=b[0]-a[0];dy=b[1]-a[1];length=math.hypot(dx,dy)
            if length<1e-6:continue
            nx,ny=-dy/length,dx/length
            steps=max(2,math.ceil(length/3.5))
            for j in range(steps+1):
                t=j/steps;s=distance+t*length
                wander=.82*wander+RNG.uniform(-.24,.24)
                wobble=offset+amplitude*(.72*math.sin(s*math.tau/wavelength+phase)+.28*math.sin(s*.19+phase*1.7))+wander
                p=(a[0]+t*dx+nx*wobble,a[1]+t*dy+ny*wobble)
                pressure=.83+.30*math.sin(s*.064+phase)+.16*math.sin(s*.23-phase)
                penwidth=max(1,round((width+(.7 if k==0 else 0))*pressure*(1 if k==0 else .65)))
                graphite=int(max(12,min(225,shade+bias+27*(1-pressure)+RNG.uniform(-9,9))))
                # Short lifts, uneven pressure, and broken retracing are all baked.
                lift=RNG.random() < (.022 if k==0 else .09)
                if previous is not None and not lift:
                    draw.line([previous,p],fill=(graphite,graphite,graphite,alpha),width=penwidth)
                previous=p
            distance+=length

def texture():
    atlas=Image.new('RGBA',(SIZE,SIZE),(236,236,233,255))
    for name, box in TILES.items():
        x0,y0,x1,y1=box; w=x1-x0; h=y1-y0
        gray={'dark':68,'core':236}.get(name,246)
        a=255
        tile=Image.new('RGBA',(w,h),(gray,gray,gray,a)); d=ImageDraw.Draw(tile)
        # Paper grain is intentionally sparse enough for PNG compression.
        for j in range(w*h//55):
            x=RNG.randrange(w); y=RNG.randrange(h)
            val=gray-RNG.randrange(2,22)
            d.point((x,y),fill=(val,val,val,255))
        if name=='plate':
            outline=[(u*(w-12)+6,v*(h-12)+6) for u,v in PLATE]
            for inset,shade in [(0,28),(.038,55),(.053,130)]:
                pts=[(w/2+(x-w/2)*(1-inset*2),h/2+(y-h/2)*(1-inset*.8)) for x,y in outline]
                pencil(d,pts+[pts[0]],shade,1.5,3)
            # Screw heads and socket ornamentation are baked, not tiny polygons.
            for cx,cy,r in [(w*.211,h*.36,w*.060),(w*.789,h*.36,w*.060),(w*.18,h*.89,w*.017),(w*.82,h*.89,w*.017)]:
                for rr in [r,r*.64]:
                    pts=[(cx+rr*math.cos(t),cy+rr*math.sin(t)) for t in np.linspace(0,math.tau,35)]
                    pencil(d,pts,31,1.35,3)
                pencil(d,[(cx-r*.36,cy-r*.36),(cx+r*.36,cy+r*.36)],45,1,2)
                pencil(d,[(cx+r*.36,cy-r*.36),(cx-r*.36,cy+r*.36)],45,1,2)
            for xx in [w*.475,w*.50,w*.52]:
                pencil(d,[(xx,18),(xx+RNG.uniform(-3,3),h-17)],189,.5,1)
            for i in range(55):
                x=RNG.choice([RNG.uniform(11,40),RNG.uniform(w-40,w-11)])
                y=RNG.uniform(h*.33,h*.86)
                pencil(d,[(x,y),(x+5,y-17)],130,.5,1)
            for i in range(100):
                x=RNG.uniform(28,w-28);y=RNG.uniform(30,h-25)
                pencil(d,[(x,y),(x+RNG.uniform(-2,2),min(h-12,y+RNG.uniform(4,24)))],RNG.randint(145,218),.4,1)
        elif name=='glass':
            # Alpha stores graphite separately from the very thin glass wash.
            arr=np.zeros((h,w,4),dtype=np.uint8)
            yy,xx=np.mgrid[0:h,0:w]; u=xx/(w-1);v=yy/(h-1)
            centre=np.exp(-((u-.5)/.38)**2-((v-.58)/.42)**2)
            arr[:,:,:3]=239
            arr[:,:,3]=(36+54*centre).astype(np.uint8)
            tile=Image.fromarray(arr);d=ImageDraw.Draw(tile)
            for pos in [4,9,w-5,w-10]:
                pencil(d,[(pos,4),(pos+RNG.uniform(-1,1),h-5)],45,1.1,3,230)
            for pos in [4,h-5]:
                pencil(d,[(4,pos),(w-5,pos)],53,1.2,3,230)
            # Lightly sketched reflection streaks and diagonal edge hatching.
            for i in range(52):
                x=RNG.choice([RNG.uniform(13,45),RNG.uniform(w-43,w-13),RNG.uniform(w*.38,w*.50)])
                y=RNG.uniform(18,h-40)
                pencil(d,[(x,y),(x+RNG.uniform(-3,2),y+RNG.uniform(5,42))],RNG.randint(90,175),.55,1,140)
            for i in range(24):
                y=RNG.uniform(h*.72,h-12);x=RNG.uniform(11,44)
                pencil(d,[(x,y),(x+16,y-21)],112,.5,1,150)
        elif name=='core':
            # Baked soft bright centre with graphite perimeter.
            arr=np.zeros((h,w,4),np.uint8);yy,xx=np.mgrid[0:h,0:w]
            val=150+100*np.maximum(0,np.sin(np.pi*xx/(w-1)))**.55
            arr[:,:,:3]=val[:,:,None];arr[:,:,3]=255
            tile=Image.fromarray(arr);d=ImageDraw.Draw(tile)
            for x in [3,w-4]: pencil(d,[(x,0),(x,h)],85,.8,2)
            for i in range(13):
                x=RNG.uniform(9,w-9);y=RNG.uniform(h*.8,h)
                pencil(d,[(x,y),(x+5,y-12)],140,.5,1)
        else:
            edge_width=5.0 if name in ['roof','lower','plain','cap'] else 7.0
            for off, shade, width in [(0,24,edge_width),(5,40,1.8),(9,100,.8)]:
                pencil(d,[(off,off),(w-off-1,off),(w-off-1,h-off-1),(off,h-off-1),(off,off)],shade,width,3)
            if name in ['roof','lower','cap','plain']:
                for i in range(int(w*.45)):
                    x=RNG.uniform(10,w-10); y=RNG.uniform(12,h-12)
                    ed=min(x,w-x)/(w*.5)
                    if RNG.random()>.52 and ed>.3: continue
                    length=RNG.uniform(4,26)
                    pencil(d,[(x,y),(x+RNG.uniform(-3,3),min(h-9,y+length))],RNG.randint(100,204),.5,1)
                for side in [0,1]:
                    y=RNG.uniform(8,16)
                    while y<h-10:
                        x=RNG.uniform(6,15) if side==0 else w-RNG.uniform(25,39)
                        pencil(d,[(x,y+RNG.uniform(5,14)),(x+RNG.uniform(10,29),y-RNG.uniform(3,13))],RNG.randint(55,135),RNG.uniform(.6,1.4),2)
                        if RNG.random()<.6:
                            pencil(d,[(x+RNG.uniform(-2,3),y-4),(x+RNG.uniform(13,23),y+RNG.uniform(7,15))],RNG.randint(104,170),.5,1)
                        y+=RNG.uniform(5,13)
                # Visible faint construction lines in the large roof planes.
                if name=='roof':
                    for xx in [w*.47,w*.52]: pencil(d,[(xx,11),(xx+2,h-12)],186,.5,1)
                    for i in range(28):
                        x=RNG.uniform(10,w-10);y=RNG.uniform(h-34,h-9)
                        pencil(d,[(x,y),(x+9,y-9)],100,.5,1)
            else:
                along_x = name in ['band','tube','dark']
                for j in range(35):
                    x=RNG.uniform(8,w-9);y=RNG.uniform(8,h-9)
                    end=(min(w-8,x+RNG.uniform(4,35)),y+RNG.uniform(-1,1)) if along_x else (x+RNG.uniform(-1,1),min(h-8,y+RNG.uniform(7,43)))
                    pencil(d,[(x,y),end],RNG.randint(87,190),.5,1)
                y=RNG.uniform(9,16)
                while y<h-10:
                    pencil(d,[(RNG.uniform(5,10),y+RNG.uniform(3,8)),(min(RNG.uniform(17,27),w-8),y-RNG.uniform(2,7))],RNG.randint(75,135),.5,1)
                    y+=RNG.uniform(5,12)
        atlas.paste(tile,(x0,y0))
        # Extruded gutters avoid atlas seams under linear filtering/mips.
        for g in range(1,5):
            atlas.paste(tile.crop((0,0,w,1)),(x0,y0-g))
            atlas.paste(tile.crop((0,h-1,w,h)),(x0,y1+g-1))
            atlas.paste(tile.crop((0,0,1,h)),(x0-g,y0))
            atlas.paste(tile.crop((w-1,0,w,h)),(x1+g-1,y0))
    # A custom palette preserves the glass alpha ramp; generic octree palettes
    # collapse it into visible concentric bands. Quantize graphite, never alpha.
    arr=np.asarray(atlas).copy()
    gray=np.minimum(255,np.rint(arr[:,:,0]/8)*8).astype(np.uint8)
    arr[:,:,:3]=gray[:,:,None]
    colors,inverse=np.unique(arr.reshape(-1,4),axis=0,return_inverse=True)
    if len(colors)<=256:
        pal=Image.fromarray(inverse.reshape(SIZE,SIZE).astype(np.uint8),'P')
        pal.putpalette(colors[:,:3].flatten().tolist()+[0]*(768-len(colors)*3))
        pal.info['transparency']=bytes(colors[:,3].tolist())
        atlas=pal
    else:
        atlas=Image.fromarray(arr)
    atlas.save(OUT/'pencil-atlas.png',optimize=True)

def uv(tile,p):
    x0,y0,x1,y1=TILES[tile]
    return [(x0+.5+p[0]*(x1-x0-1))/SIZE,(y0+.5+p[1]*(y1-y0-1))/SIZE]

def norm(a):
    a=np.array(a,dtype=float);l=np.linalg.norm(a)
    return a/l if l>1e-12 else np.array([0.,1.,0.])

class Mesh:
    def __init__(self,name,mat=0,pivot=(0,0,0)):
        self.name=name; self.mat=mat;self.pivot=np.array(pivot)
        self.p=[];self.n=[];self.uv=[];self.col=[];self.idx=[]
    def face(self,points,tile='plain',uvs=None,shade=1., normals=None):
        points=np.asarray(points)
        n=norm(np.cross(points[1]-points[0],points[2]-points[0]))
        if np.linalg.norm(np.cross(points[1]-points[0],points[2]-points[0]))<1e-12:return
        # Baked gentle facet tone, with paper whites maintained in all viewers.
        tone=shade
        if self.mat==0:
            light=norm([-.5,.8,1.])
            k=float(np.dot(n,light))
            tone*=1 if k>.3 else (.89 if k>-.35 else .77)
        if uvs is None: uvs=[(0,1),(1,1),(1,0),(0,0)][:len(points)]
        start=len(self.p)
        for i,p in enumerate(points):
            self.p.append(list(p-self.pivot));self.n.append(list(n if normals is None else normals[i]))
            self.uv.append(uv(tile,uvs[i]));self.col.append([tone,tone,tone,1.])
        for i in range(1,len(points)-1):self.idx.extend([start,start+i,start+i+1])
    def indexed(self,points,indices,tile='plain',uvs=None,normal=(0,0,1),shade=1.):
        start=len(self.p)
        for i,p in enumerate(points):
            self.p.append(list(np.array(p)-self.pivot));self.n.append(list(normal))
            self.uv.append(uv(tile,uvs[i]));self.col.append([shade]*3+[1.])
        self.idx += [i+start for i in indices]
    def clean(self):
        # Weld only identical full attribute tuples; keep authored UV/normal seams.
        mapping={};arrays=[[],[],[],[]];idx=[]
        for old in self.idx:
            attributes=[self.p,self.uv,self.col] if self.mat==0 else [self.p,self.n,self.uv,self.col]
            val=tuple(round(x,7) for ar in attributes for x in ar[old])
            if val not in mapping:
                mapping[val]=len(mapping)
                for out,ar in zip(arrays,[self.p,self.n,self.uv,self.col]):out.append(ar[old])
            idx.append(mapping[val])
        self.p,self.n,self.uv,self.col=arrays;self.idx=idx

def tri_polygon(poly):
    # Ear clipping works for the scalloped, nonconvex plate silhouette.
    p=np.array(poly); ids=list(range(len(p)));out=[]
    signed=sum(p[i,0]*p[(i+1)%len(p),1]-p[(i+1)%len(p),0]*p[i,1] for i in range(len(p)))
    if signed<0:ids.reverse()
    def cross(a,b,c):
        u=b-a;v=c-a
        return u[0]*v[1]-u[1]*v[0]
    while len(ids)>3:
        found=False
        for j,b in enumerate(ids):
            a=ids[j-1];c=ids[(j+1)%len(ids)]
            if cross(p[a],p[b],p[c])<1e-10:continue
            inside=False
            for k in ids:
                if k in [a,b,c]:continue
                if all(x>=-1e-10 for x in [cross(p[a],p[b],p[k]),cross(p[b],p[c],p[k]),cross(p[c],p[a],p[k])]):inside=True;break
            if inside:continue
            out += [a,b,c];ids.pop(j);found=True;break
        if not found:raise ValueError('Plate triangulation failed')
    return out+ids

PHASE=math.pi/8
def ring(r,y,n=8):return [np.array([r*math.sin(PHASE+i*math.tau/n),y,r*math.cos(PHASE+i*math.tau/n)]) for i in range(n)]

def profile(mesh,levels,tile='band',n=8,center=(0,0,0),cap_bottom=False,cap_top=False):
    center=np.array(center);rings=[np.array(ring(r,y,n))+center for y,r in levels]
    for j in range(len(rings)-1):
        for i in range(n):
            nxt=(i+1)%n
            mesh.face([rings[j][i],rings[j][nxt],rings[j+1][nxt],rings[j+1][i]],tile)
    if cap_bottom:
        points=list(rings[0][::-1]);mesh.face(points,'dark',[(.5+.49*math.sin(i*math.tau/n),.5+.49*math.cos(i*math.tau/n)) for i in range(n)])
    if cap_top:
        points=list(rings[-1]);mesh.face(points,'cap',[(.5+.49*math.sin(i*math.tau/n),.5+.49*math.cos(i*math.tau/n)) for i in range(n)])

def beam(mesh,a,b,width,depth=None,tile='post'):
    a=np.array(a);b=np.array(b);axis=norm(b-a)
    u=norm(np.cross(axis,[0,0,1] if abs(axis[2])<.9 else [1,0,0]))*width/2
    v=norm(np.cross(axis,u))*(depth or width)/2
    corners=[u+v,-u+v,-u-v,u-v]
    for i in range(4):
        j=(i+1)%4
        mesh.face([a+corners[i],a+corners[j],b+corners[j],b+corners[i]],tile,shade=.27 if i in [1,3] else 1.)
    # End faces only for detached bars; beam ends usually meet rails.

def tube(mesh,path,radius=.006,sides=8,closed=False,tile='tube'):
    path=np.array(path);cnt=len(path);rings=[]
    # Parallel-transport a stable cross-section frame.
    prev_u=None
    for i,p in enumerate(path):
        if closed:t=norm(path[(i+1)%cnt]-path[(i-1)%cnt])
        elif i==0:t=norm(path[1]-path[0])
        elif i==cnt-1:t=norm(path[-1]-path[-2])
        else:t=norm(path[i+1]-path[i-1])
        if prev_u is None:
            u=norm(np.cross(t,[0,0,1] if abs(t[2])<.9 else [1,0,0]))
        else:u=norm(prev_u-t*np.dot(prev_u,t))
        v=norm(np.cross(t,u));prev_u=u
        rings.append([p+radius*(math.cos(k*math.tau/sides)*u+math.sin(k*math.tau/sides)*v) for k in range(sides)])
    for i in range(cnt if closed else cnt-1):
        j=(i+1)%cnt
        for k in range(sides):
            m=(k+1)%sides
            # Single strip island per tube side, avoiding a seam per segment.
            va=i/(cnt if closed else cnt-1);vb=(i+1)/(cnt if closed else cnt-1)
            graphite = (.24 if k in [0,sides//2-1,sides//2,sides-1] else 1.) if sides>=6 else (.35 if k in [0,2] else 1.)
            mesh.face([rings[i][k],rings[i][m],rings[j][m],rings[j][k]],tile,[(va,0),(va,1),(vb,1),(vb,0)],shade=graphite)

def ellipse(mesh,center,rx,ry,plane='xy',radius=.0055,n=20,sides=8):
    c=np.array(center);path=[]
    for t in np.linspace(0,math.tau,n,endpoint=False):
        p=[rx*math.cos(t),ry*math.sin(t),0] if plane=='xy' else [0,ry*math.sin(t),rx*math.cos(t)]
        path.append(c+p)
    tube(mesh,path,radius,sides,True)

def sphere(mesh,center,radius,sy=1,n=12,m=8,tile='cap'):
    c=np.array(center)
    def pt(t,p):return c+radius*np.array([math.sin(t)*math.sin(p),sy*math.cos(t),math.sin(t)*math.cos(p)])
    for j in range(m):
        for i in range(n):
            ts=[j*math.pi/m,(j+1)*math.pi/m];ps=[i*math.tau/n,(i+1)*math.tau/n]
            points=[pt(ts[1],ps[0]),pt(ts[1],ps[1]),pt(ts[0],ps[1]),pt(ts[0],ps[0])]
            uvs=[(i/n,(j+1)/m),((i+1)/n,(j+1)/m),((i+1)/n,j/m),(i/n,j/m)]
            if j==0: points=points[:3];uvs=uvs[:3]
            if j==m-1:points=[points[0],points[2],points[3]];uvs=[uvs[0],uvs[2],uvs[3]]
            mesh.face(points,tile,uvs)

def build():
    texture()
    plate=Mesh('Wall_Mounting_Plate',pivot=(0,.82,-.237))
    pts=[((u-.5)*.265,1.04-v*.398) for u,v in PLATE]
    idx=tri_polygon(pts)
    for z,front in [(-.230,True),(-.247,False)]:
        ids=idx if front else sum(([idx[i],idx[i+2],idx[i+1]] for i in range(0,len(idx),3)),[])
        plate.indexed([(x,y,z) for x,y in pts],ids,'plate',PLATE,(0,0,1 if front else -1),1 if front else .88)
    for i,(x,y) in enumerate(pts):
        xx,yy=pts[(i+1)%len(pts)]
        plate.face([(x,y,-.230),(xx,yy,-.230),(xx,yy,-.247),(x,y,-.247)],'band',shade=.8)

    hang=Mesh('Chain_and_Hanging_Hardware',pivot=(0,.925,-.230))
    # Raised oval escutcheon against the ornamental wall plate.
    ellipse(hang,(0,.936,-.224),.024,.042,radius=.005,n=24)
    ellipse(hang,(0,.936,-.222),.012,.023,radius=.0035,n=20,sides=6)
    # Short cylindrical mounting boss along Z, then a lightly bent suspension arm.
    tube(hang,[(0,.937,-.230),(0,.937,-.201)],.014,12,False)
    arm=[(0,.937,-.200),(0,.937,-.174),(0,.936,-.125),(0,.936,-.055),(0,.932,-.024),(0,.922,-.009)]
    tube(hang,arm,.009,8)
    # Curled terminal hook; open at bottom, passing through first chain link.
    path=[(0,.905+.021*math.cos(t),.001+.018*math.sin(t)) for t in np.linspace(-.8,4.15,16)]
    tube(hang,path,.0055,8)
    # Alternating links retain their open holes at low polygon cost.
    ellipse(hang,(0,.885,0),.013,.027,'xy',.005,20,8)
    ellipse(hang,(0,.844,0),.013,.027,'yz',.005,20,8)
    ellipse(hang,(0,.803,0),.013,.027,'xy',.005,20,8)
    ellipse(hang,(0,.750,0),.041,.039,'xy',.0065,24,8)

    roof=Mesh('Faceted_Roof',pivot=(0,.547,0))
    profile(roof,[(.538,.192),(.546,.202),(.557,.198)],'band')
    profile(roof,[(.557,.195),(.668,.072)],'roof')
    profile(roof,[(.665,.075),(.681,.074),(.688,.058),(.699,.058),(.706,.049)],'band',cap_top=True)
    # Under-eave sheet, annular to avoid buried interior faces.
    profile(roof,[(.538,.160),(.538,.192)],'dark')

    frame=Mesh('Main_Lantern_Frame',pivot=(0,.195,0))
    profile(frame,[(.193,.134),(.204,.135)],'band')
    profile(frame,[(.531,.159),(.541,.162)],'band')
    def rad(y):return .130+(y-.204)/(.531-.204)*.029
    for i in range(8):
        theta=PHASE+i*math.tau/8
        beam(frame,(.130*math.sin(theta),.202,.130*math.cos(theta)),(.160*math.sin(theta),.538,.160*math.cos(theta)),.010,.009)
    # Tracery: one real arch and horizontal springing rail for every facet.
    yspring=.467
    profile(frame,[(yspring-.004,rad(yspring)),(yspring+.004,rad(yspring))],'band')
    for i in range(8):
        th=PHASE+(i+.5)*math.tau/8
        normal=np.array([math.sin(th),0,math.cos(th)]);tangent=np.array([math.cos(th),0,-math.sin(th)])
        width=2*rad(yspring)*math.sin(math.pi/8)-.012
        path=[]
        for t in np.linspace(0,math.pi,11):
            y=yspring+.055*math.sin(t)
            path.append(normal*(rad(y)*math.cos(math.pi/8)) + tangent*(width/2*math.cos(t))+[0,y,0])
        tube(frame,path,.0032,4,False,'post')

    glass=Mesh('Glass_Panels',1,pivot=(0,.365,0))
    for i in range(8):
        theta=PHASE+i*math.tau/8;nexttheta=theta+math.tau/8
        p0=[.129*math.sin(theta),.207,.129*math.cos(theta)]
        p1=[.129*math.sin(nexttheta),.207,.129*math.cos(nexttheta)]
        p2=[.158*math.sin(nexttheta),.532,.158*math.cos(nexttheta)]
        p3=[.158*math.sin(theta),.532,.158*math.cos(theta)]
        glass.face([p0,p1,p2,p3],'glass')

    lower=Mesh('Lower_Housing',pivot=(0,.195,0))
    profile(lower,[(.175,.138),(.184,.151),(.193,.148),(.203,.132)],'band')
    profile(lower,[(.102,.070),(.116,.084),(.153,.101),(.174,.126)],'lower')
    profile(lower,[(.093,.061),(.101,.073),(.111,.078)],'band')
    profile(lower,[(.076,.039),(.084,.052),(.092,.059)],'band')
    profile(lower,[(.068,.027),(.077,.038)],'band',cap_bottom=True)
    # Floor visible through glass. No enclosed faces between connected bands.
    profile(lower,[(.193,.128),(.196,.128)],'dark',cap_top=True)

    finial=Mesh('Bottom_Spherical_Finial',pivot=(0,.063,0))
    profile(finial,[(.059,.019),(.069,.022)],'band')
    sphere(finial,(0,.043,0),.023,1.05,16,10,'cap')

    # Neutral dark socket and a simple elongated opal emitter inside the lantern.
    profile(lower,[(.196,.022),(.217,.022),(.226,.013)],'dark',n=12)
    emitter=Mesh('Interior_Emissive_Light',2,pivot=(0,.276,0))
    sphere(emitter,(0,.276,0),.020,2.50,12,10,'core')

    meshes=[plate,hang,roof,frame,glass,lower,finial,emitter]
    for m in meshes:m.clean()
    write_glb(meshes)

def write_glb(meshes):
    doc={'asset':{'version':'2.0','generator':'Pencil Lantern procedural reconstruction 1.0','copyright':'Created for Monther Aloufi from the supplied reference'},
         'scene':0,'scenes':[{'name':'Pencil_Lantern','nodes':[0]}],
         'nodes':[{'name':'Vintage_Pencil_Lantern','children':list(range(1,len(meshes)+1)),
                   'extras':{'units':'metres','referenceScale':'estimated; no dimensions supplied',
                   'frontAxis':'+Z','upAxis':'+Y','lightDefault':'off','wallSurfaceZ':-.247}}],
         'meshes':[],'accessors':[],'bufferViews':[],
         'extensionsUsed':['KHR_materials_unlit'],
         'materials':[
           {'name':'Pencil_Paper','extensions':{'KHR_materials_unlit':{}},
            'pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':1},
            'extras':{'appearance':'Baked graphite contours and hatching; unlit with gentle baked facet shading'}},
           {'name':'Glass_Sketch','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'baseColorFactor':[.65,.65,.65,1], 'metallicFactor':0,'roughnessFactor':1},
            'alphaMode':'BLEND','doubleSided':False,'emissiveFactor':[0,0,0],'emissiveTexture':{'index':0},
            'extras':{'role':'Independent transparent glass with retained graphite alpha and emissive map','onEmissiveSRGB':'#ffae50','onIntensity':1.35,'offIntensity':0,'recommendedDepthWrite':False}},
           {'name':'Interior_Emission','alphaMode':'BLEND','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'baseColorFactor':[.08,.08,.08,0], 'metallicFactor':0,'roughnessFactor':1},
            'emissiveFactor':[0,0,0],'emissiveTexture':{'index':0},
            'extras':{'role':'Independent light source; off by default','onEmissiveSRGB':'#ffd59c','onIntensity':3.0,'offIntensity':0,'onOpacity':1,'offOpacity':0}}
         ],
         'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}],
         'textures':[{'source':0,'sampler':0}], 'images':[], 'buffers':[]}
    binary=bytearray()
    def addview(data,target=None):
        while len(binary)%4:binary.append(0)
        v={'buffer':0,'byteOffset':len(binary),'byteLength':len(data)}
        if target:v['target']=target
        binary.extend(data);doc['bufferViews'].append(v);return len(doc['bufferViews'])-1
    def accessor(vals,kind,component,dtype,normalized=False):
        ar=np.array(vals,dtype=dtype)
        view=addview(ar.tobytes(),34963 if kind=='SCALAR' else 34962)
        acc={'bufferView':view,'componentType':component,'count':len(ar),'type':kind}
        if normalized:acc['normalized']=True
        if kind=='VEC3':acc.update(min=ar.min(axis=0).astype(float).tolist(),max=ar.max(axis=0).astype(float).tolist())
        doc['accessors'].append(acc);return len(doc['accessors'])-1
    stats=[]
    for m in meshes:
        attrs={'POSITION':accessor(m.p,'VEC3',5126,'<f4'),
               'TEXCOORD_0':accessor(np.rint(np.array(m.uv)*65535),'VEC2',5123,'<u2',True),
               'COLOR_0':accessor(np.rint(np.array(m.col)*255),'VEC4',5121,'u1',True)}
        # Normals are unnecessary for unlit paper; retain them for glass/emitter.
        if m.mat!=0:attrs['NORMAL']=accessor(m.n,'VEC3',5126,'<f4')
        indices=accessor(m.idx,'SCALAR',5123,'<u2')
        doc['meshes'].append({'name':m.name,'primitives':[{'attributes':attrs,'indices':indices,'material':m.mat}]})
        doc['nodes'].append({'name':m.name,'mesh':len(doc['meshes'])-1,'translation':m.pivot.tolist(),
                             'extras':{'logicalObject':m.name,'triangleCount':len(m.idx)//3}})
        stats.append({'object':m.name,'vertices':len(m.p),'triangles':len(m.idx)//3})
    png=(OUT/'pencil-atlas.png').read_bytes()
    doc['images']=[{'name':'Pencil_Atlas_1024','bufferView':addview(png),'mimeType':'image/png'}]
    doc['buffers']=[{'byteLength':len(binary)}]
    meta=json.dumps(doc,separators=(',',':')).encode()
    meta+=b' '*((-len(meta))%4);binary+=b'\0'*((-len(binary))%4)
    glb=struct.pack('<III',0x46546c67,2,12+8+len(meta)+8+len(binary))+struct.pack('<II',len(meta),0x4e4f534a)+meta+struct.pack('<II',len(binary),0x004e4942)+binary
    (OUT/'vintage-pencil-lantern.glb').write_bytes(glb)
    allpos=np.concatenate([np.array(m.p)+m.pivot for m in meshes])
    statsdoc={'objects':stats,'vertices':sum(s['vertices'] for s in stats),'triangles':sum(s['triangles'] for s in stats),'materials':3,'meshes':len(meshes),'texture':{'count':1,'width':SIZE,'height':SIZE,'format':'palette PNG with alpha','bytes':len(png)},'glbBytes':len(glb),'boundsMin':allpos.min(axis=0).tolist(),'boundsMax':allpos.max(axis=0).tolist()}
    (OUT/'model-statistics.json').write_text(json.dumps(statsdoc,indent=2))
    print(json.dumps(statsdoc,indent=2))

if __name__=='__main__':build()
