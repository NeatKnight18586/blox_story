from pathlib import Path
import subprocess,json,time
root=Path(__file__).resolve().parent.parent;out=root/'evidence/dice-town-p4b5';start=time.monotonic()
def hashes(path):
 text=subprocess.check_output(['ffmpeg','-v','error','-threads','2','-i',str(root/path),'-map','0:v:0','-pix_fmt','yuv420p','-f','framemd5','-'],text=True)
 return [line.split(',')[-1].strip()for line in text.splitlines()if line and not line.startswith('#')]
a=hashes('evidence/dice-town-p4b4/working-edit.mp4');b=hashes('evidence/dice-town-p4b5/working-edit.mp4');assert len(a)==len(b)==3513
indices=[f for a,b in [(0,66),(169,337),(793,886),(990,1099),(1220,3513)]for f in range(a,b)];errors=[f for f in indices if a[f]!=b[f]];assert not errors,errors
(out/'unchanged-verification.json').write_text(json.dumps({'status':'PASS','unchangedDecodedFrames':len(indices),'allPixelMd5Identical':True,'ranges':[[0,66],[169,337],[793,886],[990,1099],[1220,3513]],'method':'All YUV420 decoded frame MD5s compared with committed P4B4 movie in unchanged ranges, excluding the nine repaired slots.','wallSeconds':time.monotonic()-start},indent=2));print('PASS2729 unchanged decoded frames bit-identical')
