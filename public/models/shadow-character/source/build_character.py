#!/usr/bin/env python3
"""Parametric, reference-proportioned graphite character. Requires numpy, scipy, Pillow.
Run from any directory: python build_character.py. Coordinates are glTF Y-up, +Z forward.
The original cover is a modelling reference only and is not embedded in any texture.
"""
from pathlib import Path
import json, math, struct, io, copy, zipfile
import numpy as np
from scipy.interpolate import PchipInterpolator
from scipy.ndimage import gaussian_filter
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1]
SRC = OUT / 'source'
PRE = OUT / 'previews'
SRC.mkdir(exist_ok=True, parents=True); PRE.mkdir(exist_ok=True)
S=.0084
rng=np.random.default_rng(417)
def P(px,py,z=0): return np.array([(px-91.5)*S,(480-py)*S,z],dtype=float)
def unit(v): return v/max(np.linalg.norm(v),1e-12)

# A lightweight deformation skeleton. All bind rotations are identity. Bone axes
# are represented by the segment between named joints rather than assumed local +Y.
bones=[]
def bone(name,parent,pos):
    bones.append(dict(name=name,parent=parent,pos=np.array(pos,dtype=float)))
    return len(bones)-1
B={}
def Bn(n,p,pnt): B[n]=bone(n,B.get(p),pnt)
Bn('Hips',None,P(80,234))
Bn('Spine','Hips',P(79,209))
Bn('Chest','Spine',P(77,164))
Bn('Neck','Chest',P(77,132))
Bn('Head','Neck',P(77,118))
Bn('Shoulder.R','Chest',P(66,143))
Bn('UpperArm.R','Shoulder.R',P(63,148))
Bn('Forearm.R','UpperArm.R',P(49,216,.018))
Bn('Hand.R','Forearm.R',P(37,291,.030))
Bn('Shoulder.L','Chest',P(87,144))
Bn('UpperArm.L','Shoulder.L',P(90,150))
Bn('Forearm.L','UpperArm.L',P(114,213,.024))
Bn('Hand.L','Forearm.L',P(141,278,.040))
Bn('Thigh.R','Hips',P(76,240))
Bn('Shin.R','Thigh.R',P(69,352,-.010))
Bn('Foot.R','Shin.R',P(71,462,0))
Bn('Toe.R','Foot.R',P(47,472,.065))
Bn('Thigh.L','Hips',P(84,240))
Bn('Shin.L','Thigh.L',P(100,351,.016))
Bn('Foot.L','Shin.L',P(114,463,.015))
Bn('Toe.L','Foot.L',P(139,471,.08))

parts=[]
def smoothweights(y,stops):
    stops=sorted(stops,key=lambda s:s[0]); d={}
    if y<=stops[0][0]: return {B[stops[0][1]]:1.}
    if y>=stops[-1][0]: return {B[stops[-1][1]]:1.}
    for (ya,a),(yb,b) in zip(stops[:-1],stops[1:]):
        if ya<=y<=yb:
            t=(y-ya)/(yb-ya); t=t*t*(3-2*t)
            d[B[a]]=d.get(B[a],0)+1-t; d[B[b]]=d.get(B[b],0)+t
            return d

def loft(name,controls,rings=24,sides=16,style='length',weight='Hips',fuzz=.008,shape=None):
    """Controls: [(world xyz, lateral radius, depth radius)]. Unique continuous UV chart."""
    C=np.array([c[0] for c in controls]); R=np.array([c[1:] for c in controls])
    lengths=np.linalg.norm(np.diff(C,axis=0),axis=1); ts=np.r_[0,np.cumsum(lengths)]
    t=np.linspace(0,ts[-1],rings)
    cf=PchipInterpolator(ts,C,axis=0); rf=PchipInterpolator(ts,R,axis=0)
    cs=cf(t); rs=rf(t); tang=cf.derivative()(t)
    meridian=np.r_[0,np.cumsum(np.sqrt(np.sum(np.diff(cs,axis=0)**2,axis=1)+np.mean(np.diff(rs,axis=0)**2,axis=1)))]
    pos=[];uv=[];faces=[];js=[];ws=[]
    phase=rng.uniform(0,6.28)
    def append(v,u,vv,w):
        pos.append(v);uv.append([u,vv]);
        if isinstance(w,str): ww={B[w]:1.}
        else: ww=w(v)
        items=sorted(ww.items(),key=lambda x:-x[1])[:4]; total=sum(x[1] for x in items)
        js.append([x[0] for x in items]+[0]*(4-len(items)))
        ws.append([x[1]/total for x in items]+[0.]*(4-len(items)))
    for k,(c,rr,tan) in enumerate(zip(cs,rs,tang)):
        tangent=unit(tan); lateral=unit(np.cross(tangent,np.array([0,0,1.])))
        depth=unit(np.cross(lateral,tangent))
        for j in range(sides+1):
            a=-math.pi/2+2*math.pi*j/sides
            # Broad, low-amplitude contour drift; deliberately avoids jagged vertices.
            rvar=1+fuzz*(.65*math.sin(3*a+phase+k*.24)+.35*math.sin(5*a-phase+k*.37))
            v=c+lateral*(math.cos(a)*rr[0]*rvar)+depth*(math.sin(a)*rr[1]*rvar)
            if shape: v=shape(v,c,a,t[k]/ts[-1])
            append(v,j/sides,meridian[k]/meridian[-1],weight)
    for k in range(rings-1):
        for j in range(sides):
            a=k*(sides+1)+j;b=a+1;c=a+sides+1;d=c+1
            faces += [[a,b,d],[a,d,c]]
    # Both ends closed; duplicated UV seam vertices are intentional.
    for k in [0,rings-1]:
        cen=len(pos);append(cs[k],.5,float(k>0),weight)
        for j in range(sides):
            a=k*(sides+1)+j;b=a+1
            faces.append([cen,b,a] if k==0 else [cen,a,b])
    pos=np.array(pos);faces=np.array(faces,dtype=np.uint32)
    # Verify radial face winding and reverse the whole component if necessary.
    f=faces[0]; n=np.cross(pos[f[1]]-pos[f[0]],pos[f[2]]-pos[f[0]])
    if np.dot(n,np.mean(pos[f],axis=0)-(cs[0]+cs[1])/2)<0: faces=faces[:,::-1]
    normals=np.zeros_like(pos)
    for f in faces:
        n=np.cross(pos[f[1]]-pos[f[0]],pos[f[2]]-pos[f[0]])
        normals[f]+=n
    for k in range(rings):
        a=k*(sides+1);b=a+sides; normals[a]=normals[b]=normals[a]+normals[b]
    normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-12)
    circ=float(np.max(2*math.pi*np.sqrt(np.mean(rs**2,axis=1))))
    parts.append(dict(name=name,pos=pos,normals=normals,uv=np.array(uv),faces=faces,
                      joints=np.array(js,dtype=np.uint16),weights=np.array(ws,dtype=np.float32),
                      length=float(meridian[-1]),circ=circ,style=style,rings=rings,sides=sides))

def ctrl(rows): return [(P(x,y,z),rx*S,rz*S) for x,y,z,rx,rz in rows]
def bodyweights(v):
    return smoothweights(v[1],[(P(0,240)[1],'Hips'),(P(0,213)[1],'Spine'),(P(0,165)[1],'Chest'),(P(0,136)[1],'Chest')])
# Silhouette reads as a narrow, slightly asymmetric coat, with no seam/button detail.
loft('Torso',ctrl([(79,244,0,3.8,5.0),(79.5,235,0,7.6,7.4),(79.5,220,0,7.8,7.1),
 (80,195,0,7.1,7.7),(78.5,169,0,7.7,9.0),(77,149,0,11.1,8.3),
 (76.5,140,0,9.0,7.0),(77,134,0,4.6,5.3)]),rings=32,sides=24,style='cross',weight=bodyweights,fuzz=.015)
loft('Neck',ctrl([(77,140,0,4.1,4.7),(76,131,0,3.5,4.2),(77,120,0,4.2,4.7)]),rings=10,sides=16,weight='Neck',fuzz=.012)
# Small featureless head. Profile only: a low forehead, nose projection, chin and back of skull.
# The head looks to the reference's right, while shoulders face +Z.
face_dir=unit(np.array([1.,0,.20]))
def headshape(v,c,a,t):
    radial=unit(np.array([v[0]-c[0],0,v[2]-c[2]]))
    front=max(0.,np.dot(radial,face_dir))
    yy=v[1]
    nose=.052*math.exp(-((yy-P(0,105)[1])/.023)**2)*front**14
    chin=.012*math.exp(-((yy-P(0,115)[1])/.023)**2)*front**7
    return v+face_dir*(nose+chin)
loft('Head',ctrl([(77,123,0,2.0,3.0),(75.8,120,0,5,5),(76,115,0,7.3,6.5),
 (77.1,106,0,8.6,7.6),(78,98,0,8.5,7.8),(77.5,93,0,6.4,6.3),(77.5,92,0,1.5,2.0)]),
 rings=26,sides=32,style='cross',weight='Head',fuzz=.018,shape=headshape)
# Slightly waved brim and crooked, tall crown. Hat stays rigid with head.
def brimshape(v,c,a,t):
    v[1]+=.0040*math.sin(2*a+.4)+.0018*math.sin(3*a+1.2)
    return v
loft('HatBrim',ctrl([(77.8,93,0,3.0,3),(77.8,92.6,0,14.8,11.6),(77.8,90.5,0,16.0,12.5),
 (77.8,89.2,0,14.5,11.9),(77.8,89.0,0,4,4)]),rings=8,sides=40,style='cross',weight='Head',fuzz=.015,shape=brimshape)
loft('HatCrown',ctrl([(78,91,0,8.2,7.1),(77.2,86,0,7.1,7.0),(77.3,72,-.002,6.7,6.9),
 (76.3,56,-.004,8.0,7.6),(77.4,52,-.002,7.5,7.2),(77.4,51.3,-.002,6.5,6.2)]),
 rings=22,sides=28,style='cross',weight='Head',fuzz=.023)
# Crown lid is shallow-domed, with a proper filled surface.
loft('HatTop',ctrl([(77.4,52.1,-.002,6.7,6.5),(77.6,50.7,-.002,5.7,5.5),(77.6,50.1,-.002,.2,.2)]),
 rings=5,sides=28,style='cross',weight='Head',fuzz=.01)

# Long continuous limbs, with extra rings near knees/elbows for deformation.
def limbweights(side,kind,v):
    if kind=='leg':
        return smoothweights(v[1],[(P(0,464)[1],'Foot.'+side),(P(0,448)[1],'Shin.'+side),(P(0,367)[1],'Shin.'+side),
         (P(0,335)[1],'Thigh.'+side),(P(0,246)[1],'Thigh.'+side),(P(0,234)[1],'Hips')])
    return smoothweights(v[1],[(P(0,290 if side=='R' else 278)[1],'Hand.'+side),
       (P(0,278 if side=='R' else 266)[1],'Forearm.'+side),(P(0,228)[1],'Forearm.'+side),
       (P(0,201)[1],'UpperArm.'+side),(P(0,154)[1],'UpperArm.'+side),(P(0,139)[1],'Chest')])
loft('Leg.R',ctrl([(71,466,0,2.7,3.8),(70,452,-.001,2.7,3.8),(65.5,415,-.006,2.8,3.8),
 (66.4,395,-.008,2.9,3.9),(68.1,370,-.011,2.5,3.4),(69,351,-.010,2.7,3.6),
 (70.2,329,-.008,2.8,3.7),(72,291,-.004,2.9,3.9),(75.7,251,0,3.2,4.2),(76,238,0,3.9,4.7)]),
 rings=48,sides=14,weight=lambda v:limbweights('R','leg',v),fuzz=.016)
loft('Leg.L',ctrl([(114,465,.015,3.0,4.1),(112.5,448,.015,3.1,4.0),(108,416,.013,3.0,4.1),
 (104.1,389,.014,2.9,3.9),(102.1,372,.016,2.5,3.5),(100,351,.016,2.5,3.5),
 (97.8,329,.013,2.8,3.8),(92.9,288,.009,3.1,4.0),(85.7,251,.002,3.2,4.2),(83,238,0,3.5,4.6)]),
 rings=48,sides=14,weight=lambda v:limbweights('L','leg',v),fuzz=.017)
loft('Arm.R',ctrl([(37,293,.03,2.1,2.8),(38,282,.03,2.7,3.0),(40.5,265,.027,2.8,3.0),
 (44.2,241,.022,2.8,3.1),(49,216,.018,2.3,2.8),(52,199,.013,2.5,3.0),
 (57.9,172,.005,3.0,3.5),(62.9,154,0,3.6,4.3),(67,147,0,3.7,4.5),(71.1,140,0,1.2,2.3)]),
 rings=34,sides=14,weight=lambda v:limbweights('R','arm',v),fuzz=.02)
loft('Arm.L',ctrl([(142,280,.040,2.0,2.7),(138.5,270,.038,2.5,3),
 (132,252,.034,2.5,3),(122.8,232,.029,2.4,3),(114,213,.024,2.2,2.8),
 (107,193,.016,2.4,3),(98.5,172,.008,2.8,3.3),(89.5,153,0,3.8,4.2),(84.9,145,0,3.6,4.4),(81.6,139,0,1.1,2.2)]),
 rings=34,sides=14,weight=lambda v:limbweights('L','arm',v),fuzz=.019)

# Palms and readable fingers. Five digits per hand; only palms are deform joints.
loft('Palm.R',ctrl([(34,308,.036,2.8,2.1),(34.7,304,.035,3.8,2.3),
 (35.8,298,.032,3.9,2.6),(37,290,.03,2.2,2.5)]),rings=12,sides=16,weight='Hand.R',fuzz=.02)
loft('Palm.L',ctrl([(148,293,.045,3.7,2.2),(146.4,287,.043,4.0,2.5),
 (143,282,.041,3.6,2.6),(141,276,.04,2.1,2.5)]),rings=12,sides=16,weight='Hand.L',fuzz=.02)
fingersR=[[(31.3,304),(30.1,312),(29.9,322)],[(33.4,306),(33.4,314),(34.0,322)],
 [(35.6,305.8),(37.2,313),(38.7,320)],[(38,304),(41,310),(43.1,315)],
 [(33.8,296),(29,301),(24.8,300)]]
fingersL=[[(144,291),(144,299),(145.5,305)],[(147,291),(148,300),(150.3,306)],
 [(149.8,291),(152.1,297),(155.2,302)],[(151,289.5),(156,292),(160,293)],
 [(144.3,282.5),(151,284.5),(158.2,284.0)]]
for side,fing,z in [('R',fingersR,.036),('L',fingersL,.045)]:
    for i,points in enumerate(fing):
        # Start fingertip, end inside palm. Small flattening in depth evokes ink fingers.
        a,b,c=points[::-1]
        cc=[(P(*a,z+.003),.30*S,.40*S),(P(a[0]*.90+b[0]*.1,a[1]*.9+b[1]*.1,z+.003),.83*S,1.0*S),
         (P(*b,z),1.05*S,1.15*S),(P(*c,z),1.15*S,1.25*S)]
        loft('Finger.'+side+'.'+str(i+1),cc,rings=9,sides=10,weight='Hand.'+side,fuzz=.01)

# Long, soft pointed shoes, splayed like the reference. Soles are planar at Y=0.
# Loft centerline follows toe-to-heel; radial 'lateral' is vertical for a horizontal sweep.
def shoe(name,rows,weight):
    # Need a custom longitudinal section so height and width are independent.
    C=np.array([P(x,480-y,z) for x,y,z,w,h in rows]); W=np.array([w*S for x,y,z,w,h in rows]); H=np.array([h*S for x,y,z,w,h in rows])
    ts=np.r_[0,np.cumsum(np.linalg.norm(np.diff(C,axis=0),axis=1))]
    cf=PchipInterpolator(ts,C,axis=0); wf=PchipInterpolator(ts,W); hf=PchipInterpolator(ts,H)
    n=22; m=20; verts=[];uv=[];f=[]
    for k,t in enumerate(np.linspace(0,ts[-1],n)):
        c=cf(t);w=wf(t);h=hf(t);tangent=unit(cf.derivative()(t)); across=unit(np.array([-tangent[2],0,tangent[0]]))
        for j in range(m+1):
            a=-math.pi/2+2*math.pi*j/m
            # Flattened shoe sole, high instep and tapering elongated toe.
            v=c+across*(w*math.cos(a)); v[1]=max(0.,c[1]+h*math.sin(a))
            verts.append(v);uv.append([j/m,k/(n-1)])
    for k in range(n-1):
        for j in range(m):
            a=k*(m+1)+j;b=a+1;c=a+m+1;d=c+1;f += [[a,b,d],[a,d,c]]
    for k in [0,n-1]:
        idx=len(verts);verts.append(cf(0 if k==0 else ts[-1]));uv.append([.5,float(k>0)])
        for j in range(m):
            a=k*(m+1)+j;f.append([idx,a+1,a] if k==0 else [idx,a,a+1])
    verts=np.array(verts);f=np.array(f,dtype=np.uint32)
    vol=np.sum(np.einsum('ij,ij->i',verts[f[:,0]],np.cross(verts[f[:,1]],verts[f[:,2]])))/6
    if vol<0:f=f[:,::-1]
    no=np.zeros_like(verts)
    for ff in f:no[ff]+=np.cross(verts[ff[1]]-verts[ff[0]],verts[ff[2]]-verts[ff[0]])
    for k in range(n):
        a=k*(m+1);b=a+m;no[a]=no[b]=no[a]+no[b]
    no/=np.maximum(np.linalg.norm(no,axis=1)[:,None],1e-12)
    parts.append(dict(name=name,pos=verts,normals=no,uv=np.array(uv),faces=f,
      joints=np.tile([B[weight],0,0,0],(len(verts),1)).astype(np.uint16),
      weights=np.tile([1.,0,0,0],(len(verts),1)).astype(np.float32),
      length=float(ts[-1]),circ=float(2*math.pi*np.sqrt((max(W)**2+max(H)**2)/2)),style='length',rings=n,sides=m))
shoe('Shoe.R',[(33,1.5,.050,.3,.8),(38,3.1,.054,2.9,2.7),(48,5.5,.048,4.0,4.9),
 (62,8,.016,4.3,6.4),(70,11,0,4.3,9.0),(73,10,-.018,.8,6.5)],'Foot.R')
shoe('Shoe.L',[(149,6,.080,.3,.8),(145,7.0,.082,2.7,2.7),(136,8,.074,4.0,4.2),
 (123,9,.039,4.3,6.5),(115,11,.016,4.5,10.0),(111,9,-.004,.8,6.0)],'Foot.L')
# Ensure both soles really touch the ground (reference's right shoe is visually higher).
for p in parts:
    if p['name']=='Shoe.L':p['pos'][:,1]-=p['pos'][:,1].min()

# Depth offsets are applied identically to bind geometry and joint centers.
# They are invisible in the reference front view, but prevent the two sides from
# collapsing into a single line in strict lateral views.
def depth_delta(part,y):
    if part.startswith(('Arm.R','Palm.R','Finger.R')):
        return .09*max(0.,min(1.,(P(0,145)[1]-y)/(P(0,145)[1]-P(0,295)[1])))
    if part.startswith(('Arm.L','Palm.L','Finger.L')):
        return -.13*max(0.,min(1.,(P(0,145)[1]-y)/(P(0,145)[1]-P(0,281)[1])))
    if part in ['Leg.R','Shoe.R']:
        return -.057*max(0.,min(1.,(P(0,241)[1]-y)/(P(0,241)[1]-P(0,465)[1])))
    if part in ['Leg.L','Shoe.L']:
        return .047*max(0.,min(1.,(P(0,241)[1]-y)/(P(0,241)[1]-P(0,465)[1])))
    return 0.
for part in parts:
    part['pos'][:,2]+=np.array([depth_delta(part['name'],v[1]) for v in part['pos']])
    # Recompute normals after the mild, smooth depth shift.
    no=np.zeros_like(part['pos'])
    for ff in part['faces']:
        no[ff]+=np.cross(part['pos'][ff[1]]-part['pos'][ff[0]],part['pos'][ff[2]]-part['pos'][ff[0]])
    for k in range(part['rings']):
        a=k*(part['sides']+1);b=a+part['sides'];no[a]=no[b]=no[a]+no[b]
    no/=np.maximum(np.linalg.norm(no,axis=1)[:,None],1e-12);part['normals']=no
for b in bones:
    n=b['name'];side=n[-1:]
    if '.' not in n:continue
    cat='Arm.'+side if n.startswith(('Shoulder','UpperArm','Forearm','Hand')) else 'Leg.'+side
    b['pos'][2]+=depth_delta(cat,b['pos'][1])

# Exact ground-level root centered between the left and right ankle pivots.
stance_center=(bones[B['Foot.R']]['pos']+bones[B['Foot.L']]['pos'])/2
stance_center[1]=0
for part in parts:part['pos']-=stance_center
for b in bones:b['pos']-=stance_center

# Unique rectilinear atlas charts; coherent grain density over every component.
SIZE=1024; PAD=5
def pack(density):
    rectangles=[]
    for i,p in enumerate(parts):
        rectangles.append((i,max(12,round(p['circ']*density)),max(12,round(p['length']*density))))
    # Shelf packing, tallest first.
    rectangles.sort(key=lambda r:-r[2]);x=PAD;y=PAD;row=0;result={}
    for i,w,h in rectangles:
        if x+w+PAD>SIZE:x=PAD;y+=row+PAD*2;row=0
        if y+h+PAD>SIZE:return None
        result[i]=(x,y,w,h);x+=w+PAD*2;row=max(row,h)
    return result
for density in range(550,150,-1):
    charts=pack(density)
    if charts:break

def graphite(w,h,style,seed):
    rr=np.random.default_rng(seed);scale=3
    ww=w*scale;hh=h*scale
    # Base graphite deposit and fine paper tooth. No baked light / directional value gradient.
    base=rr.normal(38,1.6,(hh,ww))
    tooth=rr.random((hh,ww))
    base+=np.where(tooth>.988,rr.uniform(6,15,(hh,ww)),0)
    im=Image.fromarray(np.uint8(np.clip(base,0,255)),'L')
    d=ImageDraw.Draw(im)
    # Overlapping graphite strokes; long strokes follow UV V, i.e. each form's length.
    count=int(w*h/7)
    for k in range(count):
        x=float(rr.uniform(-10,ww+10)); y=float(rr.uniform(-20,hh+20))
        length=float(rr.uniform(7,37)*scale)
        angle=float(rr.normal(0,.09))
        if style=='cross' and k%3!=0:angle=float(rr.choice([-.62,.63])+rr.normal(0,.09))
        dx=math.sin(angle)*length;dy=math.cos(angle)*length
        pts=[(x,y),(x+dx*.34+rr.uniform(-.8,.8),y+dy*.34),(x+dx*.70+rr.uniform(-.8,.8),y+dy*.7),(x+dx,y+dy)]
        val=int(rr.choice([12,16,21,27,31,36,44,53],p=[.07,.11,.16,.17,.17,.14,.10,.08]))
        d.line(pts,fill=val,width=int(rr.choice([1,2,3],p=[.37,.49,.14])))
    # Pressure-light broken strokes remain graphite-gray, never white scratches.
    for k in range(max(1,int(w*h/95))):
        x=float(rr.uniform(0,ww));y=float(rr.uniform(0,hh));length=rr.uniform(3,15)*scale
        d.line([(x,y),(x+rr.normal(0,1.1)*scale,y+length)],fill=int(rr.uniform(53,85)),width=1)
    # A few tiny paper pinholes, deliberately much rarer than pencil marks.
    for k in range(max(1,int(w*h/650))):
        x=int(rr.integers(0,ww)); y=int(rr.integers(0,hh))
        d.line([(x,y),(x+1,y+rr.integers(1,4))],fill=int(rr.uniform(92,140)),width=1)
    im=im.resize((w,h),Image.Resampling.LANCZOS)
    ar=np.asarray(im).copy()
    # Wrap chart seam: equal opposite texel columns plus soft transitions.
    avg=(ar[:,0].astype(float)+ar[:,-1])/2
    for j in range(min(3,w//4)):
        a=(3-j)/3
        ar[:,j]=ar[:,j]*(1-a)+avg*a;ar[:,-1-j]=ar[:,-1-j]*(1-a)+avg*a
    return Image.merge('RGB',(Image.fromarray(ar),Image.fromarray(ar),Image.fromarray(ar)))

atlas=Image.new('RGB',(SIZE,SIZE),(28,28,28))
for i,p in enumerate(parts):
    x,y,w,h=charts[i];tex=graphite(w,h,p['style'],1500+i)
    atlas.paste(tex,(x,y))
    # Five-pixel dilated margins protect mipmapped UV seams.
    atlas.paste(tex.crop((0,0,1,h)).resize((PAD,h)),(x-PAD,y))
    atlas.paste(tex.crop((w-1,0,w,h)).resize((PAD,h)),(x+w,y))
    atlas.paste(tex.crop((0,0,w,1)).resize((w,PAD)),(x,y-PAD))
    atlas.paste(tex.crop((0,h-1,w,h)).resize((w,PAD)),(x,y+h))
    # glTF texture origin is upper-left. Body roots map downward within their own chart.
    p['uv'][:,0]=(x+.5+p['uv'][:,0]*(w-1))/SIZE
    p['uv'][:,1]=(y+.5+(1-p['uv'][:,1])*(h-1))/SIZE
    p['chart']=[x,y,w,h]
atlas.save(SRC/'graphite-atlas.png',optimize=True)

# Aggregate shells into one skinned mesh primitive and one material/draw call.
V=[];N=[];UV=[];J=[];W=[];F=[];ranges=[];offset=0
for p in parts:
    V.append(p['pos']);N.append(p['normals']);UV.append(p['uv']);J.append(p['joints']);W.append(p['weights']);F.append(p['faces']+offset)
    ranges.append(dict(name=p['name'],vertexStart=offset,vertexCount=len(p['pos']),triangleCount=len(p['faces']),atlasChart=p['chart']))
    offset+=len(p['pos'])
V=np.concatenate(V).astype('<f4');N=np.concatenate(N).astype('<f4');UV=np.concatenate(UV).astype('<f4')
J=np.concatenate(J).astype('<u2');W=np.concatenate(W).astype('<f4');F=np.concatenate(F).astype('<u2')
# Normals are unit and normals in all components point outwards.
raw=bytearray();views=[];access=[]
def bytesview(b,target=None):
    while len(raw)%4:raw.extend(b'\0')
    idx=len(views);v={'buffer':0,'byteOffset':len(raw),'byteLength':len(b)}
    if target:v['target']=target
    views.append(v);raw.extend(b);return idx

def acc(arr,typ,ct,target=None,bounds=False):
    arr=np.ascontiguousarray(arr);vw=bytesview(arr.tobytes(),target)
    a={'bufferView':vw,'componentType':ct,'count':len(arr),'type':typ}
    if bounds:a.update(min=arr.min(axis=0).tolist(),max=arr.max(axis=0).tolist())
    access.append(a);return len(access)-1
pa=acc(V,'VEC3',5126,34962,True);na=acc(N,'VEC3',5126,34962);ua=acc(UV,'VEC2',5126,34962)
ja=acc(J,'VEC4',5123,34962);wa=acc(W,'VEC4',5126,34962);fa=acc(F.reshape(-1),'SCALAR',5123,34963)
ibms=[]
for b in bones:
    m=np.eye(4,dtype='<f4');m[:3,3]=-b['pos'];ibms.append(m.T.reshape(16))
ia=acc(np.array(ibms,dtype='<f4'),'MAT4',5126)
nodes=[{'name':'ShadowCharacter_ROOT','children':[1,2],
 'extras':{'units':'meters','up':'+Y','forward':'+Z','groundY':0,'reference':'User-supplied Daddy-Long-Legs silhouette',
 'design':'Graphite shadow; asymmetric proportions intentionally preserved'}}]
nodes.append({'name':'ShadowCharacter_Mesh','mesh':0,'skin':0})
for i,b in enumerate(bones):
    parent=b['parent'];t=b['pos']-(bones[parent]['pos'] if parent is not None else np.zeros(3))
    n={'name':b['name'],'translation':t.tolist()}
    children=[j+2 for j,bb in enumerate(bones) if bb['parent']==i]
    if children:n['children']=children
    nodes.append(n)
# Idle: upper body only. Hips, legs and feet have no tracks and remain planted.
# Rigid parent transforms and model-space UVs prevent texture swimming.
times=np.linspace(0,8,65,dtype='<f4');ta=acc(times,'SCALAR',5126,bounds=True)
samplers=[];channels=[]
for name,axis,amp,phase in [('Chest',[0,0,1],.010,0),('Neck',[0,0,1],-.007,0),
 ('Head',[0,1,0],.012,.4),('UpperArm.R',[0,0,1],-.005,.2),('UpperArm.L',[0,0,1],.004,.2)]:
    axis=np.array(axis,dtype=float);ang=amp*(np.sin(2*np.pi*times/8+phase)-math.sin(phase))
    q=np.c_[np.sin(ang/2)[:,None]*axis,np.cos(ang/2)].astype('<f4')
    qa=acc(q,'VEC4',5126);channels.append({'sampler':len(samplers),'target':{'node':B[name]+2,'path':'rotation'}})
    samplers.append({'input':ta,'output':qa,'interpolation':'LINEAR'})
imagebytes=(SRC/'graphite-atlas.png').read_bytes();iv=bytesview(imagebytes)
gltf={'asset':{'version':'2.0','generator':'Codex parametric graphite character 1.0'},
 'scene':0,'scenes':[{'name':'ShadowCharacter','nodes':[0]}],'nodes':nodes,
 'meshes':[{'name':'GraphiteShadow','primitives':[{'attributes':{'POSITION':pa,'NORMAL':na,'TEXCOORD_0':ua,'JOINTS_0':ja,'WEIGHTS_0':wa},'indices':fa,'material':0}],
 'extras':{'components':ranges}}],
 'skins':[{'name':'ShadowHumanoid','inverseBindMatrices':ia,'skeleton':2,'joints':list(range(2,len(bones)+2))}],
 'materials':[{'name':'Graphite_Unlit','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':1},
               'extensions':{'KHR_materials_unlit':{}},'alphaMode':'OPAQUE','doubleSided':False}],
 'textures':[{'sampler':0,'source':0}],
 'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}],
 'images':[{'name':'GraphiteAtlas_1024','bufferView':iv,'mimeType':'image/png'}],
 'animations':[{'name':'Idle','samplers':samplers,'channels':channels}],
 'extensionsUsed':['KHR_materials_unlit'],'extensionsRequired':['KHR_materials_unlit'],
 'accessors':access,'bufferViews':views,'buffers':[{'byteLength':len(raw)}]}

def writeglb(path,doc,data):
    j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
    b=bytes(data);b+=b'\0'*((-len(b))%4)
    path.write_bytes(struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(b))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(b),0x004e4942)+b)
writeglb(OUT/'shadow-character.glb',gltf,raw)
# Standard editable glTF source with separate PNG and BIN; no proprietary dependencies.
source=copy.deepcopy(gltf);source['buffers'][0]['uri']='shadow-character.bin'
source['images']=[{'name':'GraphiteAtlas_1024','uri':'graphite-atlas.png'}]
source['bufferViews']=source['bufferViews'][:-1]
source['buffers'][0]['byteLength']=views[iv]['byteOffset']
(SRC/'shadow-character.bin').write_bytes(raw[:views[iv]['byteOffset']])
(SRC/'shadow-character.gltf').write_text(json.dumps(source,indent=2))
(SRC/'component-map.json').write_text(json.dumps(ranges,indent=2))
meta={'triangles':len(F),'vertices':len(V),'components':len(parts),'joints':len(bones),'materials':1,
 'meshPrimitives':1,'atlasResolution':[SIZE,SIZE],'atlasTexelsPerMeter':density,
 'boundsMin':V.min(axis=0).tolist(),'boundsMax':V.max(axis=0).tolist(),
 'dimensions':(V.max(axis=0)-V.min(axis=0)).tolist(),'glbBytes':(OUT/'shadow-character.glb').stat().st_size}
(OUT/'metrics.json').write_text(json.dumps(meta,indent=2));print(json.dumps(meta,indent=2))
