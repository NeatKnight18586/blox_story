import numpy as np, json, sys
from PIL import Image
from scipy import ndimage as ndi
from scipy.optimize import minimize
from skimage.morphology import skeletonize
from skimage.draw import polygon as skpoly
from skimage.measure import approximate_polygon, find_contours

im=Image.open('docs/season1/refs/faces-v5/sheet.png'); bg=Image.new('RGBA',im.size,(255,255,255,255)); bg.alpha_composite(im)
G=np.array(bg.convert('L')).astype(float)
W,H=im.size; CW=W/8; CH=H/6   # 181
INSET=6
NAMES="smile grin happy sparkle content wink_soft wink_shine laugh_xd o_small shock dot_o gasp stare stare_o ring_eyes beam side_eye side_eye_frown confused flat_brows blank worried worried2 sweat_frown beam2 xd_grin xd_laugh beam3 blush_smile love starry calm frown cry bored_o sleep unimpressed angry xd_shout xd_wince kiss xd_squint meh flat_meh tongue sweat_smile shades dots".split()
def cell_img(i):
    r,c=divmod(i,8); x0=int(round(c*CW)); y0=int(round(r*CH))
    sub=(255-G[y0+INSET:int(round((r+1)*CH))-INSET, x0+INSET:int(round((c+1)*CW))-INSET])/255.0   # soft ink
    return sub, (x0+INSET, y0+INSET, (c+.5)*CW-x0-INSET, (r+.5)*CH-y0-INSET)   # origin offset, cell centre in sub coords
def seg_dist(P,pts):
    # P (N,2); pts (M,2) polyline; min distance
    a=pts[:-1]; b=pts[1:]; ab=b-a; L2=(ab**2).sum(1)+1e-12
    t=np.clip(((P[:,None,:]-a[None])*ab[None]).sum(2)/L2[None],0,1)
    d=P[:,None,:]-(a[None]+t[...,None]*ab[None]); return np.sqrt((d**2).sum(2)).min(1)
def cover_stroke(shape,pts,w,P=None):
    if P is None:
        yy,xx=np.mgrid[0:shape[0],0:shape[1]]; P=np.stack([xx.ravel()+.5,yy.ravel()+.5],1); sh=shape
    else: sh=None
    d=seg_dist(P,np.asarray(pts,float)); c=np.clip(w/2-d+.5,0,1)
    return c.reshape(shape) if sh else c
def cover_fill(shape,poly,ss=2):
    m=np.zeros((shape[0]*ss,shape[1]*ss)); p=np.asarray(poly,float)*ss
    rr,cc=skpoly(p[:,1],p[:,0],m.shape); m[rr,cc]=1
    return m.reshape(shape[0],ss,shape[1],ss).mean((1,3))
def bez(p,n=24):
    p=np.asarray(p,float).reshape(4,2); t=np.linspace(0,1,n)[:,None]; u=1-t
    return u**3*p[0]+3*u*u*t*p[1]+3*u*t*t*p[2]+t**3*p[3]
def iou(a,b):
    return np.minimum(a,b).sum()/max(1e-9,np.maximum(a,b).sum())
def ellipse_pts(cx,cy,rx,ry,n=48):
    t=np.linspace(0,2*np.pi,n,endpoint=False); return np.stack([cx+rx*np.cos(t),cy+ry*np.sin(t)],1)
def hull_two_circles(p0,r0,p1,r1,n=24):
    # tapered capsule polygon
    p0=np.asarray(p0);p1=np.asarray(p1); d=p1-p0; L=np.hypot(*d)+1e-9; ang=np.arctan2(d[1],d[0]); s=np.arcsin(np.clip((r0-r1)/L,-1,1))
    a=np.linspace(ang+np.pi/2+s,ang-np.pi/2-s,n)       # around p1 side: from left tangent to right tangent (outside)
    pts1=[p1+r1*np.array([np.cos(x),np.sin(x)]) for x in np.linspace(ang+np.pi/2-s*0-s, ang-np.pi/2+s, n)]
    pts0=[p0+r0*np.array([np.cos(x),np.sin(x)]) for x in np.linspace(ang-np.pi/2+s+0, ang-3*np.pi/2-s,n)]
    return np.array(pts1+pts0)
def drop_pts(tip,cc,r,n=24):
    tip=np.asarray(tip,float); cc=np.asarray(cc,float); d=tip-cc; L=np.hypot(*d); ang=np.arctan2(d[1],d[0]); a=np.arccos(np.clip(r/max(L,r+1e-6),-1,1))
    arc=[cc+r*np.array([np.cos(x),np.sin(x)]) for x in np.linspace(ang+a,ang-a+2*np.pi,n*2)]
    return np.array([tip]+arc+[tip])
def heart_pts(cx,cy,sx,sy,n=80):
    t=np.linspace(0,2*np.pi,n,endpoint=False); x=16*np.sin(t)**3; y=13*np.cos(t)-5*np.cos(2*t)-2*np.cos(3*t)-np.cos(4*t)
    return np.stack([cx+x/17*sx, cy-(y+5)/18*sy],1)    # y down: top of heart at cy - sy*..., approximate bbox centre cy
def star_pts(cx,cy,rx,ry,k,n=14):
    tips=[(cx,cy-ry),(cx+rx,cy),(cx,cy+ry),(cx-rx,cy)]; out=[]
    for i in range(4):
        a=np.array(tips[i]); b=np.array(tips[(i+1)%4]); c=np.array([cx,cy])+ (np.array([ (a[0]+b[0])/2-cx,(a[1]+b[1])/2-cy])*k)
        t=np.linspace(0,1,n,endpoint=False)[:,None]; out.append((1-t)**2*a+2*(1-t)*t*c+t*t*b)
    return np.vstack(out)

def order_skel(sk):
    ys,xs=np.nonzero(sk); pts={(x,y) for x,y in zip(xs,ys)}
    def nb(p): return [(p[0]+dx,p[1]+dy) for dx in(-1,0,1) for dy in(-1,0,1) if (dx or dy) and (p[0]+dx,p[1]+dy) in pts]
    ends=[p for p in pts if len(nb(p))==1]
    if not ends: return None
    path=[ends[0]]; seen={ends[0]}
    while True:
        nxt=[q for q in nb(path[-1]) if q not in seen]
        if not nxt: break
        nxt.sort(key=lambda q:abs(q[0]-path[-1][0])+abs(q[1]-path[-1][1]))
        path.append(nxt[0]); seen.add(nxt[0])
    return np.array(path,float)+.5
def rdp(p,tol):
    if len(p)<3: return p
    a,b=p[0],p[-1]; ab=b-a; L=np.hypot(*ab)+1e-9
    d=np.abs(ab[0]*(p[:,1]-a[1])-ab[1]*(p[:,0]-a[0]))/L; i=d.argmax()
    if d[i]>tol: l=rdp(p[:i+1],tol); r=rdp(p[i:],tol); return np.vstack([l[:-1],r])
    return np.array([a,b])
def fit_cubic_init(path):
    n=len(path); idx=[0,n//3,2*n//3,n-1]; q=path[idx]
    # chord-length LS for control points
    d=np.r_[0,np.cumsum(np.hypot(*np.diff(path,axis=0).T))]; t=d/d[-1]; u=1-t
    B=np.stack([u**3,3*u*u*t,3*u*t*t,t**3],1); P0,P3=path[0],path[-1]
    A=B[:,1:3]; rhs=path-np.outer(B[:,0],P0)-np.outer(B[:,3],P3); sol,*_=np.linalg.lstsq(A,rhs,rcond=None)
    return np.vstack([P0,sol,P3])

def make(kind,p,shape,P=None):
    if kind=='seg': return cover_stroke(shape,[p[0:2],p[2:4]],p[4],P)
    if kind=='taper': return cover_fill(shape,hull_two_circles(p[0:2],max(.5,p[2]),p[3:5],max(.5,p[5])))
    if kind=='curve': return cover_stroke(shape,bez(p[:8]),p[8],P)
    if kind.startswith('poly'): k=(len(p)-1)//2; return cover_stroke(shape,np.array(p[:2*k]).reshape(k,2),p[-1],P)
    if kind=='ring': e=ellipse_pts(p[0],p[1],p[2],p[3]); return cover_stroke(shape,np.vstack([e,e[:1]]),p[4],P)
    if kind=='dshape':
        cx,yt,rx,ry,w=p; t=np.linspace(0,np.pi,30); bot=np.stack([cx+rx*np.cos(t),yt+ry*np.sin(t)],1)   # right → left through bottom (y down)
        poly=np.vstack([bot,bot[:1]]); return cover_stroke(shape,poly,w,P)
    if kind=='disc': return cover_fill(shape,ellipse_pts(*p[:4]))
    if kind=='dropfill': return cover_fill(shape,drop_pts(p[0:2],p[2:4],p[4]))
    if kind=='dropline': return cover_stroke(shape,drop_pts(p[0:2],p[2:4],p[4]),p[5],P)
    if kind=='heart': return cover_fill(shape,heart_pts(*p[:4]))
    if kind=='star': s=star_pts(p[0],p[1],p[2],p[3],p[4]); return cover_stroke(shape,np.vstack([s,s[:1]]),p[5],P)
    if kind=='tbar': return np.maximum(cover_stroke(shape,[p[0:2],p[2:4]],p[4],P),cover_stroke(shape,[p[5:7],p[7:9]],p[9],P))
    raise Exception(kind)

STROKES=('seg','curve','ring','dshape','dropline','star','tbar')
def isstroke(kind): return kind in STROKES or kind.startswith('poly')
def optimize(kind,p0,tgt,iters=1,maxiter=600):
    near=ndi.binary_dilation(tgt>.05,iterations=6); idx=np.flatnonzero(near.ravel()); yy,xx=np.divmod(idx,tgt.shape[1]); P=np.stack([xx+.5,yy+.5],1).astype(float); t=tgt.ravel()[idx]
    st=isstroke(kind)
    def f(p):
        try: c=make(kind,p,tgt.shape,P) if st else make(kind,p,tgt.shape).ravel()[idx]
        except Exception: return 1.0
        return 1-np.minimum(c,t).sum()/max(1e-9,np.maximum(c,t).sum())
    p=np.array(p0,float); best=f(p)
    for _ in range(iters):
        r=minimize(f,p,method='Powell',options={'xtol':.1,'ftol':1e-4,'maxiter':maxiter})
        if r.fun<best: p,best=r.x,r.fun
    return p,1-best

# ---- extra kinds for the second pass ----
_old_make=make
def make(kind,p,shape,P=None):
    if kind=='dome':   # flat bottom at yb, half-ellipse up
        cx,yb,rx,ry,w=p; t=np.linspace(0,np.pi,30); top=np.stack([cx+rx*np.cos(t),yb-ry*np.sin(t)],1); return cover_stroke(shape,np.vstack([top,top[:1]]),w,P)
    if kind=='quad': return cover_fill(shape,np.array(p[:8]).reshape(4,2))
    if kind=='curve2': return np.maximum(cover_stroke(shape,bez(p[:8]),p[16],P),cover_stroke(shape,bez(p[8:16]),p[16],P))
    if kind=='discholes':
        c=cover_fill(shape,ellipse_pts(*p[:4]))
        for k in range(4,len(p),4):
            x0,y0,x1,y1=p[k:k+4]; c=np.clip(c-cover_fill(shape,np.array([[x0,y0],[x1,y0],[x1,y1],[x0,y1]])),0,1)
        return c
    return _old_make(kind,p,shape,P)
STROKES=STROKES+('dome','curve2')
def isstroke(kind): return kind in STROKES or kind.startswith('poly')

# ---- third pass kinds ----
_make2=make
def _dpoly(cx,yt,rx,ry,s,up=False,n=30):
    t=np.linspace(0,np.pi,n)
    if not up:   # flat top at yt, y down
        arc=np.stack([cx+rx*np.cos(t),yt+s+ry*np.sin(t)],1); return np.vstack([[cx+rx,yt],arc,[cx-rx,yt]])
    arc=np.stack([cx+rx*np.cos(t),yt-s-ry*np.sin(t)],1); return np.vstack([[cx+rx,yt],arc,[cx-rx,yt]])   # yt = bottom here
def make(kind,p,shape,P=None):
    if kind in('dshape','dome') and len(p)==6:
        poly=_dpoly(p[0],p[1],p[2],p[3],max(0,p[5]),up=(kind=='dome')); return cover_stroke(shape,np.vstack([poly,poly[:1]]),p[4],P)
    if kind=='heart2':
        cx,cy,d,r,ty=p; tri=np.array([[cx-d-r*.72,cy+r*.7],[cx+d+r*.72,cy+r*.7],[cx,ty]]); return np.maximum(np.maximum(cover_fill(shape,ellipse_pts(cx-d,cy,r,r)),cover_fill(shape,ellipse_pts(cx+d,cy,r,r))),cover_fill(shape,tri))
    if kind=='tongue':
        c=p[:8]; cx,yt,rx,ry=p[8:12]; seg=p[12:16]; w=p[16]; poly=_dpoly(cx,yt,rx,ry,0); poly=np.vstack([poly,poly[:1]])
        return np.maximum(np.maximum(cover_stroke(shape,bez(c),w,P),cover_stroke(shape,poly,w,P)),cover_stroke(shape,[seg[0:2],seg[2:4]],w*.7,P))
    return _make2(kind,p,shape,P)
STROKES=STROKES+('heart2_no','tongue')
def isstroke(kind): return kind in STROKES or kind.startswith('poly')
