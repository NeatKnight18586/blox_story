import sys; sys.path.insert(0,sys.argv[1])
from run2 import *
from fit import _dpoly
res=pickle.load(open(sys.argv[1]+'/res3.pkl','rb'))
# --- tongue (comp 2 of 'tongue'): arc + D + crease
i=NAMES.index('tongue'); C=comps_of(i); c=C[2]; bx0,bx1,by0,by1=c['bb']; w=res['tongue'][2]['w0']
print('tongue bb',c['bb'],'w',w)
arc=[bx0+w/2,by0+w/2,bx0+w*2,by0+w*2.2,bx1-w*2,by0+w*2.2,bx1-w/2,by0+w/2]
mx=(bx0+bx1)/2
p0=[7,8,25,24,60,24,80,8, 52,17,17.5,36, 52,22,52,38, w]
# narrow: the D is the tongue, much narrower than the arc
best=None
for dx in (0,):
    p,s=optimize('tongue',p0,c['tgt'],iters=3,maxiter=4000)
    print('tongue',s)
    if best is None or s>best[1]: best=(p,s)
res['tongue'][2].update(kind='tongue',params=list(map(float,best[0])),iou=float(best[1]))
# --- shades: bar + 2 lenses (filled D) minus stripe holes
i=NAMES.index('shades'); C=comps_of(i); c=C[0]; tgt=c['tgt']; hl=c['hl']; nh=c['nh']
holes=[]
for k in range(1,nh+1):
    m=(hl==k).astype(float); cs=find_contours(np.pad(m,1),.5); cc=max(cs,key=len)-1; ap=approximate_polygon(cc,1.2); holes.append(ap[:-1][:,::-1])   # (x,y)
print('hole polys',[len(h) for h in holes])
hole_mask=np.zeros(tgt.shape)
for h in holes: hole_mask=np.maximum(hole_mask,cover_fill(tgt.shape,h))
def mk_sh(p,shape,P=None):
    bar=cover_stroke(shape,[p[0:2],p[2:4]],p[4],P)
    def lens(cx,yt,rx,ry):
        poly=_dpoly(cx,yt,rx,ry,0); return cover_fill(shape,poly)
    full=np.maximum(np.maximum(cover_fill(shape,np.array([[0,0]])) if False else 0,0),0)
    return bar, lens(*p[5:9]), lens(*p[9:13])
def f(p):
    bar,l1,l2=mk_sh(p,tgt.shape); 
    if bar.ndim==1: bar=bar.reshape(tgt.shape)
    m=np.maximum(np.maximum(bar,l1),l2); m=m*(1-hole_mask)
    return 1-np.minimum(m,tgt).sum()/np.maximum(m,tgt).sum()
bx0,bx1,by0,by1=c['bb']; ww=bx1-bx0
p0=np.array([bx0+8,by0+8,bx1-8,by0+8,16, bx0+ww*.27,by0+4,ww*.22,36, bx0+ww*.73,by0+4,ww*.22,36],float)
r=minimize(f,p0,method='Powell',options={'xtol':.1,'ftol':1e-5,'maxiter':3000}); r=minimize(f,r.x,method='Powell',options={'xtol':.05,'ftol':1e-6,'maxiter':3000})
print('shades iou',1-r.fun)
res['shades'][0].update(kind='shades',params=list(map(float,r.x)),iou=float(1-r.fun),holes=[h.tolist() for h in holes])
pickle.dump(res,open(sys.argv[1]+'/res4.pkl','wb'))
