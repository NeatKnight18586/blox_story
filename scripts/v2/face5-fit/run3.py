import sys; sys.path.insert(0,sys.argv[1])
from run2 import *
res=pickle.load(open(sys.argv[1]+'/res2.pkl','rb'))
O3={}
def add3(cell,idxs,kinds): 
    for i in idxs: O3[(cell,i)]=kinds
add3('sleep',[0,1,2],['poly4']); add3('dots',[0,1,2],['seg'])
add3('angry',[0,1],['tbar'])
add3('love',[0,1],['heart2'])
add3('shock',[4],['dome']); add3('xd_shout',[2],['dome']); add3('xd_laugh',[4],['dshape']); add3('laugh_xd',[4],['dshape'])
for cell in ['grin','beam','beam2','beam3','xd_grin','happy','love','kiss']: pass
def inits3(kind,c,cxs):
    bx0,bx1,by0,by1=c['bb']; w=c['w']; h=by1-by0; ww=bx1-bx0; mx=(bx0+bx1)/2; my=(by0+by1)/2; r=w/2; left=cxs<0
    if kind=='poly4': return [[bx0+r,by0+r,bx1-r,by0+r,bx0+r,by1-r,bx1-r,by1-r,w]]
    if kind=='seg': return [[mx,my,mx+.2,my,ww]]
    if kind=='tbar':
        if left: return [[bx0+6,by0+6,bx1-8,by0+h*.38,12,bx1-14,by0+h*.42,bx1-14,by1-9,19]]
        return [[bx1-6,by0+6,bx0+8,by0+h*.38,12,bx0+14,by0+h*.42,bx0+14,by1-9,19]]
    if kind=='heart2': rr=ww*.26; return [[mx,by0+rr,ww*.25,rr,by1]]
    if kind=='dome': return [[mx,by1-w/2,ww/2-w/2,ww/2-w/2,w,max(0,h-ww/2-w)]]
    if kind=='dshape': return [[mx,by0+w/2,ww/2-w/2,ww/2-w/2,w,max(0,h-ww/2-w)]]
if __name__=='__main__':
    for (cell,k),kinds in sorted(O3.items()):
        i=NAMES.index(cell); C=comps_of(i); c=C[k]; bb=res[cell][k]['bbox']; cxs=(bb[0]+bb[1])/2; c['w']=res[cell][k]['w0']
        best=None
        for kind in kinds:
            for p0 in inits3(kind,c,cxs):
                try: p,s=optimize(kind,p0,c['tgt'],iters=2,maxiter=2000)
                except Exception as e: print('ERR',cell,k,kind,e); continue
                if best is None or s>best[2]: best=(kind,p,s)
        old=res[cell][k]; print('%-12s %d old %-7s %.3f -> %-9s %.3f'%(cell,k,old['kind'],old['iou'],best[0],best[2]),flush=True)
        if best[2]>old['iou'] or old['kind'] is None: res[cell][k].update(kind=best[0],params=list(map(float,best[1])),iou=float(best[2]))
    pickle.dump(res,open(sys.argv[1]+'/res3.pkl','wb'))
