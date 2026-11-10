from pathlib import Path
import subprocess,json,time
root=Path(__file__).resolve().parent.parent;out=root/'evidence/dice-town-p4b4';start=time.monotonic()
def hashes(path):
 text=subprocess.check_output(['ffmpeg','-v','error','-threads','2','-i',str(root/path),'-map','0:v:0','-pix_fmt','yuv420p','-f','framemd5','-'],text=True)
 return [line.split(',')[-1].strip()for line in text.splitlines()if line and not line.startswith('#')]
a=hashes('evidence/dice-town-p4b3/working-edit.mp4');b=hashes('evidence/dice-town-p4b4/working-edit.mp4');assert len(a)==len(b)==3513
indices=[f for a,b in [(0,1442),(1997,2129),(2224,3513)]for f in range(a,b)];errors=[f for f in indices if a[f]!=b[f]];assert not errors,errors
(out/'unchanged-verification.json').write_text(json.dumps({'status':'PASS','unchangedDecodedFrames':len(indices),'allPixelMd5Identical':True,'ranges':[[0,1442],[1997,2129],[2224,3513]],'method':'All YUV420 decoded frame MD5s compared with committed P4B3 movie in unchanged ranges, excluding the seven repaired slots.','wallSeconds':time.monotonic()-start},indent=2));print('PASS2863 unchanged decoded frames bit-identical')
