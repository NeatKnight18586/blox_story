// scripts/v2/sets4-index.js — writes parts/sets4/anchors.json: the anchor names (and the lightsCascade practicals) of every
// set module, for scripts/v2/beats.py (which never loads JS).   node scripts/v2/sets4-index.js
import {writeFileSync} from 'node:fs';
import * as H from '../../parts/sets4/toyhouse.js';
import * as S from '../../parts/sets4/toyhouse_street.js';
import * as A from '../../parts/sets4/toyhouse_all.js';
const idx = {toyhouse: {module: 'parts/sets4/toyhouse.js', anchors: Object.keys(H.ANCHORS), practicals: H.PRACTICALS, zones: H.ZONES}, toyhouse_street: {module: 'parts/sets4/toyhouse_street.js', anchors: Object.keys(S.ANCHORS), practicals: []}, toyhouse_all: {module: 'parts/sets4/toyhouse_all.js', anchors: Object.keys(A.ANCHORS), practicals: H.PRACTICALS, zones: H.ZONES}};
writeFileSync('parts/sets4/anchors.json', JSON.stringify(idx, null, 1)); console.log(JSON.stringify({toyhouse: idx.toyhouse.anchors, street: idx.toyhouse_street.anchors, practicals: H.PRACTICALS.length}));
