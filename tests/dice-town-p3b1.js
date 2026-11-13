import assert from'node:assert/strict';import{sample,coupledOutput}from'../production/dice-town-p3b1/motion.js';
for(const mode of['mechanism','handoff','disabled']){const n=mode==='handoff'?72:48;for(let f=0;f<n;f++){const s=sample(mode,f);assert(s.contactGap>=-1e-8);assert(s.pin.every(Number.isFinite));assert.deepEqual(s,sample(mode,f));if(mode==='mechanism')assert.equal(s.input,s.output);if(mode==='disabled')assert.equal(s.output,0);}}
for(let f=17;f<26;f++)assert(sample('handoff',f).pinTailClearance>0);
assert(sample('mechanism',23).phi<sample('mechanism',0).phi);assert(Math.abs(sample('mechanism',23).contactGap)<1e-8);assert(sample('disabled',23).input>.5);
for(let f=54;f<72;f++)assert.deepEqual(sample('handoff',f).pin,[.8,4.6,3]);
for(const f of[71,0,34,17,50,22])assert.deepEqual(sample('handoff',f),sample('handoff',f));assert.throws(()=>sample('handoff',72));console.log('PASS: coupled enabled drive, disabled output stays at rest under same input, analytic die-contact gap nonnegative, withdrawal clears sleeve before carry, stable receipt and explicit seeking');

const enabled=sample('mechanism',20);assert.equal(coupledOutput(enabled.input,enabled.pin),enabled.input);assert.equal(coupledOutput(enabled.input,[enabled.pin[0],enabled.pin[1],2.25]),0);
