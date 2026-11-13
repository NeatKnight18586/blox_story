import subprocess,time,json,resource,os
start=time.monotonic();peak=0;cpu={}
with open('evidence/dice-town-p4b4/motion.log','w') as log:
 p=subprocess.Popen(['node','scripts/dice-town-p4b4-capture.js'],stdout=log,stderr=subprocess.STDOUT)
 while p.poll() is None:
  rows=[list(map(int,l.split())) for l in subprocess.check_output(['ps','-eo','pid=,ppid=,rss='],text=True).strip().splitlines()];ids={p.pid}
  changed=True
  while changed:
   changed=False
   for pid,parent,rss in rows:
    if parent in ids and pid not in ids:ids.add(pid);changed=True
  peak=max(peak,sum(rss for pid,parent,rss in rows if pid in ids))
  for pid in ids:
   try:
    s=open('/proc/'+str(pid)+'/stat').read().rsplit(')',1)[1].split();cpu[(pid,s[19])]=(int(s[11]),int(s[12]))
   except (OSError,IndexError):pass
  time.sleep(.2)
r=resource.getrusage(resource.RUSAGE_CHILDREN)
json.dump(dict(command=['node','scripts/dice-town-p4b4-capture.js'],exitCode=p.returncode,wallSeconds=time.monotonic()-start,sampledTreeRssMiB=peak/1024,sampledTreeCpuSeconds=sum(a+b for a,b in cpu.values())/os.sysconf("SC_CLK_TCK"),processCount=len(cpu),sampleIntervalSeconds=.2,method='Linux ps summed subtree RSS (shared pages counted per process), /proc cumulative CPU samples retained by PID/start-time at 100Hz; sampled lower bounds; final pass only, not all development activity'),open('evidence/dice-town-p4b4/motion-cost.json','w'),indent=2)
raise SystemExit(p.returncode)
