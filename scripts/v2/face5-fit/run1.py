import sys; sys.path.insert(0,sys.argv[1])
from fit import *
import pickle
def doit(i):
    name=NAMES[i]
    sub,(ox,oy,cx,cy)=cell_img(i); mask=sub>.5
    lab,n=ndi.label(mask,structure=np.ones((3,3))); edt=ndi.distance_transform_edt(mask)
    comps=[]
    for k in range(1,n+1):
        m=lab==k
        if m.sum()<40: continue
        ys,xs=np.nonzero(m); x0,x1,y0,y1=xs.min()-3,xs.max()+4,ys.min()-3,ys.max()+4
        tgt=sub[y0:y1,x0:x1]*(lab[y0:y1,x0:x1]==k)   # only this component's soft ink
        # dilate soft ink slightly: pixels at edge of comp
        tgt=np.where(ndi.binary_dilation(m[y0:y1,x0:x1],iterations=1),sub[y0:y1,x0:x1],0)
        holes=ndi.label(~ndi.binary_fill_holes(m[y0:y1,x0:x1])==False)[1] if False else 0
        filled=ndi.binary_fill_holes(m[y0:y1,x0:x1]); nh=ndi.label(filled&~m[y0:y1,x0:x1])[1]
        sk=skeletonize(m[y0:y1,x0:x1]); path=order_skel(sk)
        w0=2*np.median(edt[y0:y1,x0:x1][sk]) if sk.any() else 8
        cands=[]
        if nh==0 and path is not None:
            a,b=path[0],path[-1]
            cands.append(('seg',[*a,*b,w0]))
            r0=edt[y0:y1,x0:x1][int(a[1]),int(a[0])] if True else w0/2; r1=edt[y0:y1,x0:x1][int(b[1]),int(b[0])]
            cands.append(('taper',[*a,max(r0,2),*b,max(r1,2)]))
            if len(path)>6:
                q=fit_cubic_init(path); cands.append(('curve',[*q.ravel(),w0]))
                pl=rdp(path,2.0)
                if 3<=len(pl)<=7: cands.append(('poly%d'%len(pl),[*pl.ravel(),w0]))
        if nh>=1:
            bx0,bx1,by0,by1=xs.min(),xs.max()+1,ys.min(),ys.max()+1; ccx,ccy=(bx0+bx1)/2-x0,(by0+by1)/2-y0
            cands.append(('ring',[ccx,ccy,(bx1-bx0)/2-w0/2,(by1-by0)/2-w0/2,w0]))
            cands.append(('dshape',[ccx,by0-y0+w0/2,(bx1-bx0)/2-w0/2,(by1-by0)-w0,w0]))
        best=None
        for kind,p0 in cands:
            try: p,s=optimize(kind,p0,tgt)
            except Exception as e: print('ERR',name,kind,e); continue
            comps.append(None) if False else None
            if best is None or s>best[2]+ (0.012 if best[0] in('seg','taper') or True else 0): 
                # prefer earlier (simpler) unless clearly better
                if best is None or s>best[2]+0.01: best=(kind,p,s)
        bb=(xs.min()-cx,xs.max()+1-cx,-(ys.max()+1-cy),-(ys.min()-cy))
        comps.append(dict(cell=name,kind=best[0] if best else None,p=(best[1]+np.array([x0,y0]*((len(best[1]))//2)+([0]*(len(best[1])%2)))) if False else None,iou=best[2] if best else 0,bbox=[round(v/CW,3) for v in bb],nholes=nh,x0=x0,y0=y0,params=best[1].tolist() if best else None,w0=w0))
    print(name,[ (c['kind'],round(c['iou'],3)) for c in comps],flush=True)
    return name,comps
if __name__=='__main__':
    from multiprocessing import Pool
    with Pool(4) as pool: out=pool.map(doit,range(48),chunksize=1)
    pickle.dump(dict(out),open(sys.argv[1]+'/res1.pkl','wb'))
