#!/usr/bin/env python3
"""Reopen the GLB, validate arrays / skin / topology, and render its actual triangles.
CPU orthographic rasterizer; outputs use only the embedded unlit texture, no art retouching.
"""
from pathlib import Path
import struct,json,io,math
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
raw=(ROOT/'shadow-character.glb').read_bytes()
magic,ver,length=struct.unpack_from('<III',raw)
assert magic==0x46546c67 and ver==2 and length==len(raw)
jlen,jtype=struct.unpack_from('<II',raw,12);assert jtype==0x4e4f534a
G=json.loads(raw[20:20+jlen]);bo=20+jlen;blen,btype=struct.unpack_from('<II',raw,bo);assert btype==0x004e4942
BIN=raw[bo+8:bo+8+blen]
D={5126:np.dtype('<f4'),5123:np.dtype('<u2'),5125:np.dtype('<u4')}
C={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def readacc(i):
    a=G['accessors'][i];v=G['bufferViews'][a['bufferView']];offset=v.get('byteOffset',0)+a.get('byteOffset',0)
    arr=np.frombuffer(BIN,dtype=D[a['componentType']],count=a['count']*C[a['type']],offset=offset).copy()
    return arr.reshape(a['count'],C[a['type']])
pr=G['meshes'][0]['primitives'][0];at=pr['attributes']
V=readacc(at['POSITION']);N=readacc(at['NORMAL']);UV=readacc(at['TEXCOORD_0'])
J=readacc(at['JOINTS_0']);W=readacc(at['WEIGHTS_0']);F=readacc(pr['indices']).reshape(-1,3)
im=G['images'][0];bv=G['bufferViews'][im['bufferView']]
tex=Image.open(io.BytesIO(BIN[bv['byteOffset']:bv['byteOffset']+bv['byteLength']])).convert('RGB')
T=np.asarray(tex).astype(np.float32)
assert len(V)==len(N)==len(UV)==len(J)==len(W)
assert np.all(np.isfinite(V)) and np.all(np.isfinite(N))
assert np.allclose(np.linalg.norm(N,axis=1),1,atol=1e-5)
assert np.allclose(W.sum(axis=1),1,atol=1e-6) and np.min(W)>=0
assert np.max(F)<len(V) and np.min(F)>=0
assert np.min(UV)>=0 and np.max(UV)<=1
assert np.max(J)<len(G['skins'][0]['joints'])
assert G['nodes'][0]['name']=='ShadowCharacter_ROOT'
assert G['materials'][0]['alphaMode']=='OPAQUE'
assert 'KHR_materials_unlit' in G['materials'][0]['extensions']
assert not G.get('cameras') and not G.get('extensions',{}).get('KHR_lights_punctual')
ibm=readacc(G['skins'][0]['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
parents={}
for i,n in enumerate(G['nodes']):
    for c in n.get('children',[]):parents[c]=i

def world_mats(time=None):
    rot={}
    if time is not None:
        for ch in G['animations'][0]['channels']:
            s=G['animations'][0]['samplers'][ch['sampler']]
            tt=readacc(s['input'])[:,0]; qq=readacc(s['output'])
            q=np.array([np.interp(time,tt,qq[:,j]) for j in range(4)]);q/=np.linalg.norm(q)
            x,y,z,w=q
            rot[ch['target']['node']]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],
             [2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],
             [2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
    mats=[]
    for i,n in enumerate(G['nodes']):
        m=np.eye(4);m[:3,3]=n.get('translation',[0,0,0]);m[:3,:3]=rot.get(i,np.eye(3))
        if i in parents:m=mats[parents[i]]@m
        mats.append(m)
    return mats
mats=world_mats();skin=np.array([mats[i] for i in G['skins'][0]['joints']])@ibm
assert np.allclose(skin,np.eye(4),atol=1e-6)
def posed(time):
    mats=world_mats(time); skin=np.array([mats[i] for i in G['skins'][0]['joints']])@ibm
    pp=np.c_[V,np.ones(len(V))]
    return sum((np.einsum('nij,nj->ni',skin[J[:,i]],pp)*W[:,i,None])[:,:3] for i in range(4))
footidx=np.where(V[:,1]<.12)[0]
maxfoot=max(float(np.abs(posed(t)[footidx]-V[footidx]).max()) for t in [0,1,2,3,4,5,6,7,8])
assert maxfoot<1e-6
assert np.max(np.abs(posed(0)-posed(8)))<1e-6
areas=np.linalg.norm(np.cross(V[F[:,1]]-V[F[:,0]],V[F[:,2]]-V[F[:,0]]),axis=1)/2
# Topology check after welding duplicate UV seams by spatial position.
_,idx=np.unique(np.round(V,6),axis=0,return_inverse=True)
FF=idx[F];edges=np.sort(np.concatenate([FF[:,[0,1]],FF[:,[1,2]],FF[:,[2,0]]]),axis=1)
_,counts=np.unique(edges,axis=0,return_counts=True)
# Each welded manifold edge must have opposite direction in its two adjacent faces.
e0=np.concatenate([FF[:,[0,1]],FF[:,[1,2]],FF[:,[2,0]]])
_,ei=np.unique(np.sort(e0,axis=1),axis=0,return_inverse=True)
edgesigns=np.bincount(ei,weights=np.where(e0[:,0]<e0[:,1],1.,-1.))
assert np.max(np.abs(edgesigns))==0
volumes=[]
for comp in G['meshes'][0]['extras']['components']:
    lo=comp['vertexStart'];hi=lo+comp['vertexCount'];ff=F[(F[:,0]>=lo)&(F[:,0]<hi)]
    volumes.append(float(np.sum(np.einsum('ij,ij->i',V[ff[:,0]],np.cross(V[ff[:,1]],V[ff[:,2]])))/6))
assert min(volumes)>0
report={'glbReopened':True,'outwardWindingAllShells':True,'consistentEdgeOrientation':True,'triangleCount':len(F),'vertexCount':len(V),'materialCount':len(G['materials']),
 'textureCount':len(G['textures']),'textureSize':list(tex.size),'jointCount':len(G['skins'][0]['joints']),
 'skinBindIdentity':True,'maxIdleFootDisplacementMeters':maxfoot,'idleLoopMatches':True,
 'degenerateTriangles':int(np.sum(areas<1e-12)),
 'weldedBoundaryEdges':int(np.sum(counts==1)),'weldedNonmanifoldEdges':int(np.sum(counts>2)),
 'boundsMin':V.min(axis=0).tolist(),'boundsMax':V.max(axis=0).tolist(),
 'animationNames':[a['name'] for a in G['animations']],
 'renderer':'CPU rasterization of reopened exported GLB; embedded unlit material, no lighting or optional shader',
 'validationScope':'Structural, numerical and CPU rendered inspection; not Khronos validator or a WebGL runtime test.'}
(ROOT/'validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2),flush=True)

def unit(v):return v/np.linalg.norm(v)

def render(name,az,el,center,height,w,h,ss=2,time=None):
    vv=V if time is None else posed(time)
    # Camera forward vector from subject to viewer.
    az=math.radians(az);el=math.radians(el)
    out=np.array([math.sin(az)*math.cos(el),math.sin(el),math.cos(az)*math.cos(el)])
    right=unit(np.cross([0,1,0],out));up=unit(np.cross(out,right))
    rel=vv-np.array(center);px=rel@right;py=rel@up;pz=rel@out
    ww=w*ss;hh=h*ss;scale=hh/height
    screen=np.c_[ww/2+px*scale,hh/2-py*scale,pz]
    col=np.zeros((hh,ww,3),np.float32)+np.array([244,242,237]);depth=np.full((hh,ww),-np.inf,dtype=np.float32)
    # Backface culling is disabled for inspection so winding errors cannot hide geometry.
    # Structural tests above check shell edge usage separately.
    for f in F:
        p=screen[f]; xmin=max(0,int(math.floor(p[:,0].min())));xmax=min(ww-1,int(math.ceil(p[:,0].max())))
        ymin=max(0,int(math.floor(p[:,1].min())));ymax=min(hh-1,int(math.ceil(p[:,1].max())))
        if xmin>xmax or ymin>ymax:continue
        denom=(p[1,1]-p[2,1])*(p[0,0]-p[2,0])+(p[2,0]-p[1,0])*(p[0,1]-p[2,1])
        if abs(denom)<1e-8:continue
        xx,yy=np.meshgrid(np.arange(xmin,xmax+1)+.5,np.arange(ymin,ymax+1)+.5)
        a=((p[1,1]-p[2,1])*(xx-p[2,0])+(p[2,0]-p[1,0])*(yy-p[2,1]))/denom
        b=((p[2,1]-p[0,1])*(xx-p[2,0])+(p[0,0]-p[2,0])*(yy-p[2,1]))/denom;c=1-a-b
        z=a*p[0,2]+b*p[1,2]+c*p[2,2]
        dep=depth[ymin:ymax+1,xmin:xmax+1]
        mask=(a>=-1e-6)&(b>=-1e-6)&(c>=-1e-6)&(z>dep)
        if not mask.any():continue
        aa=a[mask];bb=b[mask];cc=c[mask]
        uv=aa[:,None]*UV[f[0]]+bb[:,None]*UV[f[1]]+cc[:,None]*UV[f[2]]
        uv=uv*np.array([T.shape[1],T.shape[0]])-.5
        u=np.clip(uv[:,0],0,T.shape[1]-1.001);v=np.clip(uv[:,1],0,T.shape[0]-1.001)
        x0=np.floor(u).astype(int);y0=np.floor(v).astype(int);du=u-x0;dv=v-y0
        vals=T[y0,x0]*(1-du[:,None])*(1-dv[:,None])+T[y0,x0+1]*du[:,None]*(1-dv[:,None])+T[y0+1,x0]*(1-du[:,None])*dv[:,None]+T[y0+1,x0+1]*du[:,None]*dv[:,None]
        col[ymin:ymax+1,xmin:xmax+1][mask]=vals;dep[mask]=z[mask]
    im=Image.fromarray(np.uint8(np.clip(col,0,255)))
    if ss>1:im=im.resize((w,h),Image.Resampling.LANCZOS)
    path=ROOT/'previews'/name;im.save(path,optimize=True);print('Rendered',name,flush=True)
    return im
if __name__=='__main__':
    front=render('front.png',0,0,[0,1.79,0],3.96,840,1500)
    side=render('side.png',90,0,[0,1.79,0],3.96,840,1500)
    three=render('three-quarter.png',34,4,[0,1.79,0],3.96,840,1500)
    rear=render('rear.png',180,0,[0,1.79,0],3.96,840,1500)
    close=render('graphite-closeup.png',25,6,[-.12,2.99,0],1.42,1200,1400)
    # Presentation sheet contains unchanged render panels and typography only.
    font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
    sheet=Image.new('RGB',(1900,1380),(244,242,237));d=ImageDraw.Draw(sheet)
    d.text((65,42),'DADDY–LONG–LEGS',font=ImageFont.truetype(bold,36),fill=(30,30,30))
    d.text((65,96),'A graphite shadow  /  Actual exported GLB',font=ImageFont.truetype(font,20),fill=(98,94,88))
    for i,(im,title,sub) in enumerate([(front,'FRONT','Reference proportions'),(side,'SIDE','Complete depth'),(three,'THREE-QUARTER','Unlit graphite')]):
        im=im.resize((560,1000),Image.Resampling.LANCZOS);sheet.paste(im,(45+i*625,182))
        d.text((85+i*625,1205),title,font=ImageFont.truetype(bold,21),fill=(39,39,39))
        d.text((85+i*625,1241),sub,font=ImageFont.truetype(font,18),fill=(98,94,88))
    d.line((65,1310,1835,1310),fill=(210,207,200),width=1)
    d.text((65,1330),'One material · Embedded atlas · Humanoid rig · No custom shader',font=ImageFont.truetype(font,17),fill=(98,94,88))
    sheet.save(ROOT/'previews'/'shadow-character-preview.png',optimize=True)
