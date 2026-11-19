# blox_story

Source for an original animated short-story series made with blocky toy-style characters.
A small browser renderer (Three.js) turns an episode file into frames; a build pipeline adds captions, sound and the final grade.

```
engine/        episode renderer, camera, timeline, looks
avatar-style/  characters: bodies, faces, hair, outfits
parts/         world building blocks and materials
cast/          recurring characters
stories/       one folder per episode (script, voice, episode spec)
scripts/v2/    render, checks and assembly tools
tests/         unit tests (npm test, npm run v2:test)
docs/          design notes; docs/archive holds older notes
```

Requirements: Node 22, Python 3, FFmpeg, Chrome.

## Copyright

Copyright © 2026 NeatKnight18586. All rights reserved.

This repository is public for viewing only. No licence is granted: you may not copy, modify, redistribute
or reuse any part of it (code, characters, faces, stories, scripts, voice recordings, images or video)
without written permission. Characters, faces, outfits and stories are original works; this project is not
affiliated with or endorsed by Roblox Corporation.
