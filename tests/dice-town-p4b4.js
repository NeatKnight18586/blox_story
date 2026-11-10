import assert from'node:assert/strict';import{sample,counts}from'../production/dice-town-p4b4/motion.js';
assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),90);
for(const shot of Object.keys(counts))for(let f=0;f<15;f++){const s=sample(shot,f);assert.deepEqual(sample(shot,f),s);assert(s.s>=0&&s.s<=1);assert.equal(s.bookCover,-2);assert(s.head.every(Number.isFinite));if(f)assert(s.s>=sample(shot,f-1).s);}
for(const shot of ['D19','D23','D38'])assert.throws(()=>sample(shot,0));for(const f of[-1,15,.5,NaN])assert.throws(()=>sample('D17',f));console.log('PASS90 explicit bounded source samples; stable open-book angle; unauthorized shots and invalid frames rejected');
