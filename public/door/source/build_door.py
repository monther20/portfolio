#!/usr/bin/env python3
"""Deterministic reference-baked low-poly door. Requires Python 3, NumPy, Pillow.
Run: python source/build_door.py --reference path/to/reference.png
The reference image is sampled into a UV atlas; no generated replacement artwork.
"""
from pathlib import Path
import argparse, json, math, struct, io
from collections import Counter, defaultdict
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
W,H,T=1.04,2.05,0.13
LEFT=0.033
FRONT=0.043
BACK=FRONT-T
ATLAS=1024
FR=(8,8,496,1000)
BR=(520,8,352,684)
ED=(904,8,104,1000)
ME=(528,720,112,264)
PL=(664,720,64,224)
KN=(760,720,112,112)

def rectify(im,quad,w,h):
    a=[];b=[]
    for (x,y),(u,v) in zip([(0,0),(w,0),(w,h),(0,h)],quad):
        a.extend([[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]])
        b.extend([u,v])
    return im.transform((w,h),Image.Transform.PERSPECTIVE,np.linalg.solve(a,b),Image.Resampling.BICUBIC)

def atlas_bake(path):
    im=Image.open(path).convert('RGB')
    if im.size!=(1448,1086):
        im=im.resize((1448,1086),Image.Resampling.LANCZOS)
    front=rectify(im,[(129,32),(454,128),(455,922),(130,985)],496,1000)
    # Reconstruct the surface hidden by protruding hardware from adjacent samples
    # on that same original wooden stile and orange panel. Hardware is real geometry.
    # Sample the complete unobscured orange surface once, avoiding patch seams.
    orange=front.crop((282,399,402,630)).resize((156,231),Image.Resampling.BICUBIC)
    front.paste(orange,(282,399))
    # Behind the mounting plate, reuse a clean segment of the same outer stile.
    front.paste(front.crop((446,700,496,838)),(446,444))
    front.paste(front.crop((438,571,448,627)).resize((10,138),Image.Resampling.BICUBIC),(438,444))
    back=rectify(im,[(549,574),(740,574),(740,944),(549,944)],352,684)
    # The drawn back repeats hinges on the left; remove that illustration occlusion.
    for yy,hh in [(74,151),(520,107)]:
        back.paste(back.crop((2,260,9,260+hh)).resize((12,hh),Image.Resampling.BICUBIC),(0,yy))
    edge=rectify(im,[(90,250),(126,251),(127,721),(90,718)],104,1000)
    metal=im.crop((83,139,105,230)).resize((112,264),Image.Resampling.BICUBIC)
    # Match the drawing's dark charcoal finish across the curved barrel and straps.
    metal=metal.point(lambda c:round(c*.72))
    plate=im.crop((434,539,454,580)).resize((64,224),Image.Resampling.BICUBIC)
    knob=im.crop((443,514,469,548)).resize((112,112),Image.Resampling.BICUBIC)
    out=Image.new('RGB',(ATLAS,ATLAS),(63,47,34))
    for box,patch in [(FR,front),(BR,back),(ED,edge),(ME,metal),(PL,plate),(KN,knob)]:
        x,y,w,h=box
        # 6-pixel gutter, edge dilated, never transparent.
        pad=6
        out.paste(patch.resize((w,h)),(x,y))
        out.paste(patch.crop((0,0,1,h)).resize((pad,h)),(x-pad,y))
        out.paste(patch.crop((w-1,0,w,h)).resize((pad,h)),(x+w,y))
        out.paste(patch.crop((0,0,w,1)).resize((w,pad)),(x,y-pad))
        out.paste(patch.crop((0,h-1,w,h)).resize((w,pad)),(x,y+h))
        for xx,yy,sx,sy in [(x-pad,y-pad,0,0),(x+w,y-pad,w-1,0),(x-pad,y+h,0,h-1),(x+w,y+h,w-1,h-1)]:
            out.paste(patch.getpixel((sx,sy)),(xx,yy,xx+pad,yy+pad))
    (ROOT/'textures').mkdir(exist_ok=True)
    out.save(ROOT/'textures/door-pencil-atlas.png',optimize=True)
    out.save(ROOT/'textures/door-pencil-atlas.jpg',quality=92,subsampling=0,optimize=True)
    return out

# UVs in glTF convention: v=0 is top of image.
def uvbox(box,u,v):
    x,y,w,h=box
    return ((x+.5+u*(w-1))/ATLAS,(y+.5+v*(h-1))/ATLAS)

class Mesh:
    def __init__(self):
        self.verts=[];self.polys=[];self.uvs=[];self.groups=[];self.vmap={};self.current='DoorLeaf'
    def vert(self,p):
        key=tuple(round(float(x),8) for x in p)
        if key not in self.vmap:self.vmap[key]=len(self.verts);self.verts.append(key)
        return self.vmap[key]
    def face(self,pts,uvs):
        inds=[self.vert(p) for p in pts]
        assert len(set(inds))==len(inds), (self.current,pts)
        self.polys.append(inds);self.uvs.append(uvs);self.groups.append(self.current)
    def idxface(self,idx,uvs):
        self.face([self.verts[i] for i in idx],uvs)
M=Mesh()
xs=[0,.11,.47,.56,.90,1]
ys=[0,.055,.323,.367,.612,.650,.946,1]

def xy(i,j):
    x=xs[i]; y=ys[j]
    # A millimetric, repeatable handmade variation shared by front and back.
    dx=0.0014*math.sin(j*1.79+i*.63) if 0<i<5 else 0.0005*math.sin(j*1.23)
    dy=0.0011*math.sin(i*1.33+j*.77) if 0<j<7 else 0
    return (LEFT+x*W+dx, y*H+dy)

def baseuv(x,y,back=False):
    u=(x-LEFT)/W;v=1-y/H
    if back:
        # Back sheet has its own slightly different framing. Piecewise registration
        # keeps all twelve physical recess edges on the original drawn borders.
        bu=np.interp(u,xs,[0,.108,.477,.555,.911,1])
        bv=np.interp(v,list(reversed([1-a for a in ys])),[0,.052,.340,.386,.630,.684,.947,1])
        return uvbox(BR,1-bu,bv)
    return uvbox(FR,u,v)

def surface(back=False):
    z=BACK if back else FRONT
    grid={}
    for j in range(8):
        for i in range(6):
            x,y=xy(i,j)
            if i==0:x+=.003
            if i==5:x-=.003
            if j==0:y+=.003
            if j==7:y-=.003
            grid[i,j]=(x,y,z)
    for j in range(7):
        for i in range(5):
            p=[grid[i,j],grid[i+1,j],grid[i+1,j+1],grid[i,j+1]]
            if i in [1,3] and j in [1,3,5]:
                cx=sum(v[0] for v in p)/4;cy=sum(v[1] for v in p)/4
                # Two simple loops: raised pencil-edged lip, then inset panel.
                lip=[(a+(.006 if a<cx else -.006),b+(.006 if b<cy else -.006),z+(-.005 if back else .005)) for a,b,c in p]
                inset=[(a+(.020 if a<cx else -.020),b+(.020 if b<cy else -.020),z+(.030 if back else -.030)) for a,b,c in p]
                for a,b in [(p,lip),(lip,inset)]:
                    for k in range(4):
                        q=[a[k],a[(k+1)%4],b[(k+1)%4],b[k]]
                        if back:q.reverse()
                        M.face(q,[baseuv(v[0],v[1],back) for v in q])
                center=(cx,cy,z+(.031 if back else -.031))
                for k in range(4):
                    q=[inset[k],inset[(k+1)%4],center]
                    if back:q.reverse()
                    M.face(q,[baseuv(v[0],v[1],back) for v in q])
            else:
                if back:p.reverse()
                M.face(p,[baseuv(v[0],v[1],back) for v in p])
    return grid

front=surface();back=surface(True)
# CCW viewed from +Z.
border=[(i,0) for i in range(6)]+[(5,j) for j in range(1,8)]+[(i,7) for i in range(4,-1,-1)]+[(0,j) for j in range(6,0,-1)]
for k,ij in enumerate(border):
    nxt=border[(k+1)%len(border)]
    a=front[ij];b=front[nxt]; aa=back[ij];bb=back[nxt]
    xa,ya=xy(*ij);xb,yb=xy(*nxt)
    ofa=(xa,ya,FRONT-.004);ofb=(xb,yb,FRONT-.004)
    oba=(xa,ya,BACK+.004);obb=(xb,yb,BACK+.004)
    q=[a,ofa,ofb,b]
    M.face(q,[baseuv(p[0],p[1]) for p in q])
    q=[aa,bb,obb,oba]
    M.face(q,[baseuv(p[0],p[1],True) for p in q])
    q=[ofa,oba,obb,ofb]
    if abs(xa-xb)<abs(ya-yb):
        uv=[uvbox(ED,0,1-ya/H),uvbox(ED,1,1-ya/H),uvbox(ED,1,1-yb/H),uvbox(ED,0,1-yb/H)]
    else:
        uv=[uvbox(ED,0,(xa-LEFT)/W),uvbox(ED,1,(xa-LEFT)/W),uvbox(ED,1,(xb-LEFT)/W),uvbox(ED,0,(xb-LEFT)/W)]
    M.face(q,uv)

# Polygon triangulation for a concave, non-intersecting hinge section.
def earclip(poly):
    ids=list(range(len(poly)));out=[]
    def cross(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    if sum(poly[i][0]*poly[(i+1)%len(poly)][1]-poly[(i+1)%len(poly)][0]*poly[i][1] for i in ids)<0:ids.reverse()
    while len(ids)>3:
        found=False
        for k,b in enumerate(ids):
            a=ids[k-1];c=ids[(k+1)%len(ids)]
            if cross(poly[a],poly[b],poly[c])<1e-12:continue
            inside=False
            for d in ids:
                if d in (a,b,c):continue
                if all(v>=-1e-12 for v in [cross(poly[a],poly[b],poly[d]),cross(poly[b],poly[c],poly[d]),cross(poly[c],poly[a],poly[d])]):inside=True;break
            if inside:continue
            out.append((a,b,c));ids.pop(k);found=True;break
        if not found:raise ValueError('Cannot triangulate hinge polygon')
    out.append(tuple(ids));return out

for num,ycenter in enumerate([.355,1.735]):
    M.current=f'Hinge_{num+1}'
    r=.030
    # Cylinder and bent mounting strap are ONE watertight part. The strap clears
    # the leaf, landing on its front face. There are no intersecting barrel boxes.
    poly=[(r*math.cos(a),r*math.sin(a)) for a in np.linspace(math.pi/2,math.pi*2+math.pi/4,8)]
    poly.extend([(.033,.044),(.064,.044),(.064,.055),(.029,.055),(.006,.030)])
    # The previous circle samples proceed CCW; ensure consistent XZ orientation.
    if sum(poly[i][0]*poly[(i+1)%len(poly)][1]-poly[(i+1)%len(poly)][0]*poly[i][1] for i in range(len(poly)))<0:poly.reverse()
    lo=ycenter-.116;hi=ycenter+.116
    rings=[]
    for yy,scale in [(lo,.92),(lo+.004,1),(hi-.004,1),(hi,.92)]:
        rings.append([(x*scale if k<8 else x,yy,z*scale if k<8 else z) for k,(x,z) in enumerate(poly)])
    n=len(poly)
    for j in range(3):
        for k in range(n):
            q=[rings[j][k],rings[j+1][k],rings[j+1][(k+1)%n],rings[j][(k+1)%n]]
            # Coordinate mapping of barrel scribbles and the hardware strap.
            uv=[uvbox(ME,.15+.65*(k%8)/8,1-(q[0][1]-lo)/(hi-lo)),uvbox(ME,.15+.65*(k%8)/8,1-(q[1][1]-lo)/(hi-lo)),uvbox(ME,.15+.65*((k%8)+1)/8,1-(q[2][1]-lo)/(hi-lo)),uvbox(ME,.15+.65*((k%8)+1)/8,1-(q[3][1]-lo)/(hi-lo))]
            M.face(q,uv)
    for tri in earclip(poly):
        for ring,rev in [(rings[0],False),(rings[-1],True)]:
            q=[ring[i] for i in (tuple(reversed(tri)) if rev else tri)]
            M.face(q,[uvbox(ME,.40+.45*p[0]/.064,.20+.32*p[2]/.055) for p in q])

M.current='HandleAssembly'
# Closed rectangular mounting plate -> spindle -> asymmetrical short T grip.
# All rings have matching vertex counts, so this is one solid, editable component.
N=20
cx=LEFT+.962*W;cy=.492*H

def ray_rect(a,halfwidth,halfheight):
    return min(halfwidth/max(abs(math.cos(a)),1e-9),halfheight/max(abs(math.sin(a)),1e-9))

grip_outline=[(.040,0),(.0346,.020),(.020,.0346),(0,.040),(-.025,.031),(-.038,.024),(-.097,.024),(-.112,.017),(-.118,0),(-.112,-.017),(-.097,-.024),(-.038,-.024),(-.025,-.031),(0,-.040),(.020,-.0346),(.0346,-.020)]
angs=sorted([math.atan2(y,x)%(2*math.pi) for x,y in grip_outline]+[math.atan2(y,x)%(2*math.pi) for x,y in [(.041,.105),(-.041,.105),(-.041,-.105),(.041,-.105)]])
def grip_radius(a):
    ray=np.array([math.cos(a),math.sin(a)])
    hits=[]
    for i,p in enumerate(grip_outline):
        p=np.array(p);q=np.array(grip_outline[(i+1)%len(grip_outline)])
        mat=np.column_stack((ray,p-q))
        if abs(np.linalg.det(mat))<1e-12:continue
        r,t=np.linalg.solve(mat,p)
        if r>0 and -1e-9<=t<=1+1e-9:hits.append(r)
    return max(hits)
profiles=[
    (FRONT+.0005,lambda a:ray_rect(a,.041,.105)),
    (FRONT+.013,lambda a:ray_rect(a,.041,.105)),
    (FRONT+.013,lambda a:.018),
    (FRONT+.071,lambda a:.018),
    (FRONT+.071,grip_radius),
    (FRONT+.101,grip_radius),
    (FRONT+.108,lambda a:grip_radius(a)*.88),
]
rings=[]
for z,rad in profiles:
    rings.append([(cx+math.cos(a)*rad(a),cy+math.sin(a)*rad(a),z) for a in angs])
for j in range(len(rings)-1):
    for k in range(N):
        q=[rings[j][k],rings[j][(k+1)%N],rings[j+1][(k+1)%N],rings[j+1][k]]
        if j in [0,1]:
            uv=[uvbox(PL,np.clip((p[0]-cx)/.082+.5,0,1),np.clip(.5-(p[1]-cy)/.21,0,1)) for p in q]
        elif j in [4,5]:
            uv=[uvbox(ME,k/N,.3),uvbox(ME,(k+1)/N,.3),uvbox(ME,(k+1)/N,.7),uvbox(ME,k/N,.7)]
        else:
            uv=[uvbox(ME,k/N,.1),uvbox(ME,(k+1)/N,.1),uvbox(ME,(k+1)/N,.8),uvbox(ME,k/N,.8)]
        M.face(q,uv)
for ring,rev in [(rings[0],True),(rings[-1],False)]:
    center=(cx,cy,ring[0][2])
    for k in range(N):
        q=[ring[k],ring[(k+1)%N],center]
        if rev:q.reverse()
        # Round front reads as drawn charcoal metal, sampled from the actual knob.
        uv=[uvbox(KN,np.clip((p[0]-cx)/.080+.5,.04,.96),np.clip(.5-(p[1]-cy)/.080,.04,.96)) for p in q]
        M.face(q,uv)

# Fix face orientation component-wise by signed volume, preserving quads.
adj=defaultdict(list)
for fi,f in enumerate(M.polys):
    for i,a in enumerate(f):adj[tuple(sorted((a,f[(i+1)%len(f)])))].append(fi)
visited=set();components=[]
for start in range(len(M.polys)):
    if start in visited:continue
    todo=[start];visited.add(start);comp=[]
    while todo:
        fi=todo.pop();comp.append(fi);f=M.polys[fi]
        for i,a in enumerate(f):
            for nb in adj[tuple(sorted((a,f[(i+1)%len(f)])))]:
                if nb not in visited:visited.add(nb);todo.append(nb)
    components.append(comp)
# Propagate winding for every shared edge.
for comp in components:
    done={comp[0]};todo=[comp[0]]
    while todo:
        fi=todo.pop();f=M.polys[fi]
        for i,a in enumerate(f):
            b=f[(i+1)%len(f)]
            for nb in adj[tuple(sorted((a,b)))]:
                if nb in done:continue
                nf=M.polys[nb]
                if any(nf[k]==a and nf[(k+1)%len(nf)]==b for k in range(len(nf))):
                    M.polys[nb].reverse();M.uvs[nb].reverse()
                done.add(nb);todo.append(nb)
    vol=0
    for fi in comp:
        f=M.polys[fi];p=np.array([M.verts[i] for i in f])
        for j in range(1,len(f)-1):vol+=np.dot(p[0],np.cross(p[j],p[j+1]))/6
    if vol<0:
        for fi in comp:M.polys[fi].reverse();M.uvs[fi].reverse()


def export():
    raw=bytearray();views=[];accessors=[]
    def view(b,target=None):
        while len(raw)%4:raw.append(0)
        out={'buffer':0,'byteOffset':len(raw),'byteLength':len(b)}
        if target:out['target']=target
        views.append(out);raw.extend(b);return len(views)-1
    def acc(a,component,kind,target=None,bounds=False):
        a=np.asarray(a,dtype={5126:'<f4',5123:'<u2'}[component])
        o={'bufferView':view(a.tobytes(),target),'componentType':component,'count':len(a),'type':kind}
        if bounds:o['min']=np.min(a,axis=0).reshape(-1).tolist();o['max']=np.max(a,axis=0).reshape(-1).tolist()
        accessors.append(o);return len(accessors)-1
    positions=[];normals=[];uvs=[];indices=[];vmap={}
    for f,fuv in zip(M.polys,M.uvs):
        pts=[np.array(M.verts[i]) for i in f]
        no=np.cross(pts[1]-pts[0],pts[2]-pts[0]);no=no/np.linalg.norm(no)
        ids=[]
        for p,uv in zip(pts,fuv):
            key=tuple(np.round(np.r_[p,no,uv],7))
            if key not in vmap:
                vmap[key]=len(positions);positions.append(p.tolist());normals.append(no.tolist());uvs.append(uv)
            ids.append(vmap[key])
        for j in range(1,len(ids)-1):indices.extend([ids[0],ids[j],ids[j+1]])
    pa=acc(positions,5126,'VEC3',34962,True);na=acc(normals,5126,'VEC3',34962);ua=acc(uvs,5126,'VEC2',34962);ia=acc(np.array(indices),5123,'SCALAR',34963)
    times=np.linspace(0,1.2,25)
    tacc=acc(times,5126,'SCALAR',bounds=True)
    quats=[];closed=[]
    for t in times/1.2:
        t=t*t*(3-2*t);angle=math.pi/2*t
        quats.append([0,math.sin(angle/2),0,math.cos(angle/2)])
    qa=acc(quats,5126,'VEC4');qc=acc(list(reversed(quats)),5126,'VEC4')
    material={'name':'Reference_ColoredPencil_Matte','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':1},'doubleSided':False}
    # Unlit is intentional: retain the original illustration's baked pencil shading
    # regardless of portfolio lighting; geometry still produces parallax and occlusion.
    material['extensions']={'KHR_materials_unlit':{}}
    imageview=view((ROOT/'textures/door-pencil-atlas.jpg').read_bytes())
    doc={'asset':{'version':'2.0','generator':'Reference-baked fantasy door / build_door.py','extras':{'units':'metres','referenceOnly':True}},'scene':0,'scenes':[{'name':'FantasyDoor','nodes':[0]}],
         'nodes':[{'name':'DoorHinge','mesh':0,'extras':{'hinge_axis':'+Y','closed_front':'+Z','open_angle_degrees':90,'width_m':W,'height_m':H,'thickness_m':T}}],
         'meshes':[{'name':'FantasyDoor_Combined','primitives':[{'attributes':{'POSITION':pa,'NORMAL':na,'TEXCOORD_0':ua},'indices':ia,'material':0,'mode':4}]}],
         'materials':[material],'textures':[{'source':0,'sampler':0}],'images':[{'name':'ReferencePencilAtlas_1024','bufferView':imageview,'mimeType':'image/jpeg'}],
         'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}],
         'animations':[{'name':name,'samplers':[{'input':tacc,'output':out,'interpolation':'LINEAR'}],'channels':[{'sampler':0,'target':{'node':0,'path':'rotation'}}]} for name,out in [('Door_Open',qa),('Door_Close',qc)]],
         'accessors':accessors,'bufferViews':views,'buffers':[{'byteLength':len(raw)}],'extensionsUsed':['KHR_materials_unlit']}
    def save_glb(path,d,b):
        j=json.dumps(d,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
        b=bytes(b);b+=b'\x00'*((-len(b))%4)
        path.write_bytes(struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(b))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(b),0x004e4942)+b)
    save_glb(ROOT/'fantasy-door.glb',doc,raw)
    # Editable quads, per-face UVs, named hardware groups; glTF is the runtime mesh.
    obj=['# Y up, +Z front; 1 unit = 1 metre. Origin = real left hinge axis.','mtllib fantasy-door.mtl','o FantasyDoor']
    for p in M.verts:obj.append('v '+' '.join(f'{x:.8f}' for x in p))
    for fuv in M.uvs:
        for u,v in fuv:obj.append(f'vt {u:.8f} {1-v:.8f}')
    obj.append('usemtl ReferencePencil');ui=1;group=None
    for f,uv,g in zip(M.polys,M.uvs,M.groups):
        if g!=group:obj.append('g '+g);group=g
        obj.append('f '+' '.join(f'{vi+1}/{ui+j}' for j,vi in enumerate(f)));ui+=len(f)
    (ROOT/'source/fantasy-door.obj').write_text('\n'.join(obj)+'\n')
    (ROOT/'source/fantasy-door.mtl').write_text('newmtl ReferencePencil\nKa 1 1 1\nKd 1 1 1\nKs 0 0 0\nNs 0\nd 1\nillum 1\nmap_Kd ../textures/door-pencil-atlas.png\n')
    (ROOT/'source/mesh-source.json').write_text(json.dumps({'vertices':M.verts,'faces':M.polys,'face_uvs':M.uvs,'face_groups':M.groups,'uv_v_origin':'top','units':'metres','front':'+Z','up':'+Y','hinge_origin':[0,0,0]},separators=(',',':')))
    edgecounts=Counter()
    for f in M.polys:
        for k,a in enumerate(f):edgecounts[tuple(sorted((a,f[(k+1)%len(f)])))]+=1
    degenerate=0
    for f in M.polys:
        for j in range(1,len(f)-1):
            p=np.array([M.verts[i] for i in [f[0],f[j],f[j+1]]])
            if np.linalg.norm(np.cross(p[1]-p[0],p[2]-p[0]))<1e-10:degenerate+=1
    comp_report=[]
    for c in components:
        cs=set(v for fi in c for v in M.polys[fi]);es=set(tuple(sorted((f[k],f[(k+1)%len(f)]))) for fi in c for f in [M.polys[fi]] for k in range(len(f)))
        comp_report.append({'name':M.groups[c[0]],'vertices':len(cs),'faces':len(c),'euler_characteristic':len(cs)-len(es)+len(c)})
    report={'triangles':len(indices)//3,'gpu_vertices':len(positions),'editable_vertices':len(M.verts),'editable_faces':len(M.polys),'materials':1,'mesh_primitives':1,'draw_calls_per_color_pass':1,'atlas_dimensions':[1024,1024],'atlas_gpu_bytes_rgba8_with_mipmaps':5592405,'glb_bytes':(ROOT/'fantasy-door.glb').stat().st_size,'dimensions_metres':{'leaf_width':W,'leaf_height':H,'leaf_thickness':T},'boundary_edges':sum(n==1 for n in edgecounts.values()),'nonmanifold_edges':sum(n>2 for n in edgecounts.values()),'degenerate_triangles':degenerate,'components':comp_report,'animations':['Door_Open','Door_Close'],'duration_seconds':1.2,'rotation_axis':'+Y','rotation_degrees':90,'pivot':[0,0,0],'material_style':'KHR_materials_unlit reference artwork; roughness=1, metallic=0 fallback','reference_note':'No measured dimensions supplied. Proportions traced from the sheet. Back-view hinge placement resolved to the same physical axis as the front.'}
    (ROOT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
    assert report['boundary_edges']==0 and report['nonmanifold_edges']==0 and degenerate==0,report
    assert all(c['euler_characteristic']==2 for c in comp_report),comp_report
    assert report['triangles']<=1000,report['triangles']
    print(json.dumps(report,indent=2))

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--reference',type=Path);args=ap.parse_args()
    if args.reference:atlas_bake(args.reference)
    elif not (ROOT/'textures/door-pencil-atlas.jpg').exists():ap.error('Pass --reference on first build')
    export()
