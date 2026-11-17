import sys; sys.path.insert(0,sys.argv[1])
from fit import *
import pickle
res=pickle.load(open(sys.argv[1]+'/res1.pkl','rb'))
def comps_of(i):
    sub,(ox,oy,cx,cy)=cell_img(i); mask=sub>.5; lab,n=ndi.label(mask,structure=np.ones((3,3))); out=[]
    for k in range(1,n+1):
        m=lab==k
        if m.sum()<40: continue
        ys,xs=np.nonzero(m); x0,x1,y0,y1=xs.min()-3,xs.max()+4,ys.min()-3,ys.max()+4
        mm=m[y0:y1,x0:x1]; tgt=np.where(ndi.binary_dilation(mm,iterations=1),sub[y0:y1,x0:x1],0)
        filled=ndi.binary_fill_holes(mm); hl,nh=ndi.label(filled&~mm)
        edt=ndi.distance_transform_edt(mm)
        out.append(dict(m=mm,tgt=tgt,x0=x0,y0=y0,nh=nh,hl=hl,edt=edt,bb=(xs.min()-x0,xs.max()+1-x0,ys.min()-y0,ys.max()+1-y0)))
    return out
def inits(kind,c,cxs):
    bx0,bx1,by0,by1=c['bb']; w=c['w']; h=by1-by0; ww=bx1-bx0; mx=(bx0+bx1)/2; my=(by0+by1)/2; left=cxs<0
    if kind=='poly3': 
        r=w/2; return [[bx0+r,by0+r,bx1-r,my,bx0+r,by1-r,w]] if left else [[bx1-r,by0+r,bx0+r,my,bx1-r,by1-r,w]]
    if kind=='taper': 
        r=w/2; a=[[bx0+r,by0+r,r,bx1-r,by1-r,r*.6],[bx0+r,by1-r,r,bx1-r,by0+r,r*.6],[bx1-r,by0+r,r,bx0+r,by1-r,r*.6],[bx1-r,by1-r,r,bx0+r,by0+r,r*.6],
           [bx0+r,by0+r,r*.6,bx1-r,by1-r,r],[bx0+r,by1-r,r*.6,bx1-r,by0+r,r]]; return a
    if kind=='quad': 
        return [[bx0,by0,bx1,by0,bx1,by1,bx0,by1],[bx0,by1,bx0,by0,bx1,by0,bx1,by1]]
    if kind=='tbar':
        bw=11; nw=17; return [[bx0+bw/2,by0+bw/2,bx1-bw/2,by0+bw/2,bw,mx,by0+bw/2,mx,by1-nw/2,nw]]
    if kind=='discholes':
        base=[mx,my,ww/2,h/2]
        for k in range(1,c['hl'].max()+1):
            ys,xs=np.nonzero(c['hl']==k); base+= [xs.min(),ys.min(),xs.max()+1,ys.max()+1]
        return [base]
    if kind=='heart': return [[mx,my,ww,h*1.0]]
    if kind=='star': return [[mx,my,ww/2-w/2,h/2-w/2,.15,w]]
    if kind=='dome': return [[mx,by1-w/2,ww/2-w/2,h-w,w]]
    if kind=='dshape': return [[mx,by0+w/2,ww/2-w/2,h-w,w]]
    if kind=='dropline': r=ww/2-w/2; return [[mx,by0+w/2,mx,by1-w/2-r,r,w]]
    if kind=='dropfill': r=ww/2; return [[mx,by0,mx,by1-r,r]]
    if kind=='disc': return [[mx,my,ww/2,h/2]]
    if kind=='dot': return [[mx,my,mx+.01,my,ww]]
    if kind=='z': r=w/2; return [[bx0+r,by0+r,bx1-r,by0+r,bx0+r,by1-r,bx1-r,by1-r,w]]
    if kind=='curve2':
        r=w/2; return [[bx0+r,by0+r,bx1,by0,bx1,my-2,mx,my, mx,my,bx1,my+2,bx1,by1,bx0+r,by1-r,w]]
    raise Exception(kind)
# overrides: (cell,idx) -> kinds
O={}
def add(cell,idxs,kinds):
    for i in idxs: O[(cell,i)]=kinds
for cell in ['laugh_xd','xd_grin','xd_laugh','xd_shout','xd_squint','xd_wince']:
    add(cell,[0,1],['poly3'])
add('laugh_xd',[2,3,5,6],['quad','taper']); add('xd_laugh',[2,3,5,6],['quad','taper']); add('wink_shine',[0,1],['quad','taper']); add('stare_o',[0,1,2,4],['quad','taper']); add('shock',[0,1],['quad','taper'])
add('sparkle',[0,1],['discholes']); add('love',[0,1],['heart']); add('starry',[0,1],['star'])
add('shock',[4],['dome']); add('xd_shout',[2],['dome']); add('xd_laugh',[4],['dshape']); add('laugh_xd',[4],['dshape'])
add('sweat_frown',[0],['dropline','dropfill']); add('cry',[2,3],['dropline']); add('sweat_smile',[0],['dropline'])
add('kiss',[2],['curve2']); add('sleep',[0,1,2],['z'])
add('angry',[0,1],['taper']); add('dots',[0,1,2],['dot'])
for cell in ['flat_brows','unimpressed','flat_meh','side_eye','side_eye_frown']: add(cell,[0,1] if cell not in('side_eye','side_eye_frown') else [2],['tbar'])
if __name__=='__main__':
    names=NAMES
    for (cell,k),kinds in sorted(O.items()):
        i=names.index(cell); C=comps_of(i); c=C[k]; cx_cu=res[cell][k]['bbox']; cxs=(cx_cu[0]+cx_cu[1])/2
        c['w']=res[cell][k]['w0']
        best=None
        for kind in kinds:
            for p0 in inits(kind,c,cxs):
                try: p,s=optimize(kind,p0,c['tgt'],iters=2,maxiter=1500)
                except Exception as e: print('ERR',cell,k,kind,e); continue
                if best is None or s>best[2]: best=(kind,p,s)
        old=res[cell][k]
        print('%-12s %d old %-7s %.3f -> %-9s %.3f'%(cell,k,old['kind'],old['iou'],best[0],best[2]),flush=True)
        if best[2]>old['iou'] or old['kind'] is None: res[cell][k].update(kind=best[0],params=list(map(float,best[1])),iou=float(best[2]))
    pickle.dump(res,open(sys.argv[1]+'/res2.pkl','wb'))
