# S7 minimal cloud pass — PASS for bounded visual/technical proof

Three world-fixed cloud clumps replace the two flat sunrise-only ellipsoids. Nine low-detail lobes share one12×8 sphere geometry and one material. Night opacity0.10,cool#506579; sunrise opacity0.24,warmed#f0c5ae. No cloud drift,shadows,new lights,textures or dependencies. Only S7 opt-in environment code changes; all story/character/caption/counter/camera logic remains untouched.

[Native before/after comparison](comparison.png) · [Single native motion proof](motion.mp4).

Three matched genuine720×1280 frames35/1392/1600,phone-reduced on board. Before recreates the existing S7 two ellipsoids with their exact original geometry/color/placement/opacity; after uses three clumps. Actual pixel changes occupy sky bounds35:[288,203,452,271],1392:[422,0,695,64],1600:[337,193,433,270]. Clouds deliberately remain faint; close-up roof/framing can clip their extent. Characters remain the focus. Raw native originals stay ignored under renders/s7-clouds.

Exactly one2-second720×1280/30fps motion render,global1320–1379:60frames,4 protected reverse pixel hashes match. H.264/yuv420p,complete decode/continuousPTS/native browser playback pass. Existing motion encoder omitted SAR; normalized codec/container aspect metadata to1:1/9:16 by stream-copy,without re-render or image re-encode. Playback receipt records verification. npm test passes existing F1/F2/P1/P2A/story/overlay/speech source checks.

Measured motion command wall46.172s,peak summed sampled RSS738.93MiB,CPU80.77s. Process sampling0.2s/shared pages counted per process; stills,initial placement adjustment,tests and playback were unprofiled. Model tokens unavailable; no total cost claim.

No other S7 staging changes; default S6 untouched. Work branches from lookdev/names100-ground-sky-audit and PR targets that branch,not an unrelated hair/look-development branch. No publishing/full render. Stop for review.

Reproduce stills: node scripts/s7-cloud-proof.js. Motion: node scripts/s7-motion-proof.js (once); ffmpeg metadata normalization used -c copy -bsf:v h264_metadata=sample_aspect_ratio=1/1 -aspect9:16. No audio added.
