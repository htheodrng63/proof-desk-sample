// This model contains fictional sample data only. It has no service integration.
export const STORE_KEY = 'proof-desk-sample-v1';
export const OFFER = 'Planned offer: US$29 every 30 days; up to 100 new proof orders per rolling 30-day window; 500 MB cumulative storage/shop; 10 MiB/file; 100 revisions/job. Prelaunch, not available to install or buy here.';
export function artwork(kind, tone = 'fern') {
  const color = tone === 'ink' ? '#28323a' : '#376048';
  return kind === 'sticker'
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect x="8" y="8" width="224" height="224" rx="112" fill="#fffdf6" stroke="#d6cdbb" stroke-width="2"/><path d="M120 137V58m0 55c-28 0-42-15-40-34 23 0 38 13 40 34m0-17c27-1 42-17 38-35-24 1-35 17-38 35m0-16c-18-1-27-12-26-25 16 0 25 10 26 25" fill="${color}" stroke="${color}" stroke-width="3"/><text x="120" y="169" text-anchor="middle" font-family="Georgia,serif" font-size="25" fill="${color}">FERN STUDIO</text><text x="120" y="191" text-anchor="middle" font-family="sans-serif" font-size="8" letter-spacing="3" fill="${color}">MADE WITH CARE</text><text x="120" y="215" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#756b5b">SAMPLE ARTWORK</text></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 140"><rect x="5" y="5" width="310" height="130" rx="8" fill="#fffdf6" stroke="#d6cdbb" stroke-width="2"/><path d="M46 91V41m0 35c-17-1-25-11-24-23 16 0 23 11 24 23m0-13c16-1 24-10 22-23-15 1-21 10-22 23" fill="${color}" stroke="${color}" stroke-width="2"/><text x="182" y="56" text-anchor="middle" font-family="Georgia,serif" font-size="24" fill="${color}">The Fern Studio</text><text x="182" y="82" text-anchor="middle" font-family="sans-serif" font-size="10" letter-spacing="2" fill="${color}">A LITTLE SOMETHING GOOD</text><text x="160" y="119" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#756b5b">SAMPLE ARTWORK</text></svg>`;
}
const clone = value => JSON.parse(JSON.stringify(value));
export function initialState() {
  return {version:1, selected:'label', role:'shop', released:null, interest:'Not decided', feedback:'', items:[
    {id:'sticker',title:'Botanical stickers',revision:1,specs:{quantity:500,width:50,height:50,finish:'Matte',material:'White vinyl',tone:'fern'},status:'approved',note:'',history:[]},
    {id:'label',title:'Packaging labels',revision:1,specs:{quantity:100,width:80,height:30,finish:'Gloss',material:'White vinyl',tone:'fern'},status:'changes',note:'Please change the finish to matte. Keep the size and artwork the same.',history:[]}
  ]};
}
export function saveRevision(state, id, specs) {
  const next = clone(state), item = next.items.find(value => value.id === id);
  if (!item) throw new Error('Choose a sample item.');
  if (item.revision >= 100) throw new Error('The sample has reached 100 revisions. Reset it to start again.');
  for (const key of ['quantity','width','height']) {
    if (!Number.isInteger(specs[key]) || specs[key] < 1 || specs[key] > (key === 'quantity' ? 10000 : 1000)) throw new Error('Enter a whole-number quantity from 1–10,000 and dimensions from 1–1,000 mm.');
  }
  if (!['Matte','Gloss'].includes(specs.finish) || !['White vinyl','Paper'].includes(specs.material) || !['fern','ink'].includes(specs.tone)) throw new Error('Choose one of the sample specifications.');
  if (JSON.stringify(item.specs) === JSON.stringify(specs)) throw new Error('Change a specification or artwork color before saving a new revision.');
  item.history.push({revision:item.revision,specs:clone(item.specs),status:item.status,note:item.note});
  item.revision += 1; item.specs = clone(specs); item.status = 'review'; item.note = ''; next.released = null;
  return next;
}
export function decide(state, id, revision, decision, note = '') {
  const next = clone(state), item = next.items.find(value => value.id === id);
  if (!item || item.revision !== revision || item.status !== 'review') throw new Error('This revision no longer accepts a decision. Open the current sample proof.');
  if (!['approved','changes'].includes(decision)) throw new Error('Choose a review decision.');
  if (decision === 'changes' && !note.trim()) throw new Error('Describe the change you want first.');
  if (note.length > 500) throw new Error('Keep the change request under 500 characters.');
  item.status = decision; item.note = decision === 'changes' ? note.trim() : ''; next.released = null;
  return next;
}
export const canRelease = state => state.items.length === 2 && state.items.every(item => item.status === 'approved');
export function release(state) {
  if (!canRelease(state)) throw new Error('Both current revisions need approval before release.');
  const next = clone(state);
  next.released = next.items.map(item => ({id:item.id,revision:item.revision,specs:clone(item.specs)}));
  return next;
}
export function packet(state) {
  if (!canRelease(state) || !state.released || JSON.stringify(state.released) !== JSON.stringify(state.items.map(item => ({id:item.id,revision:item.revision,specs:item.specs})))) throw new Error('Release the currently approved sample revisions first.');
  return {kind:'SAMPLE — NOT FOR PRODUCTION',order:'#1001 — fictional Fern Studio',warning:'Simulated approval and release only. No real customer approval, Shopify order, email, payment, or production authority. A downloaded sample is a snapshot; later edits invalidate this release in the sample.',items:state.items.map(item => ({item:item.title,revision:item.revision,specifications:clone(item.specs),approval:'Simulated customer approved this exact revision',artwork:{filename:`SAMPLE-${item.id}-v${item.revision}.svg`,content:artwork(item.id,item.specs.tone)}}))};
}
export function restore(raw) {
  try {
    const saved = JSON.parse(raw), initial = initialState();
    if (saved.version !== 1 || !['shop','customer'].includes(saved.role) || !['sticker','label'].includes(saved.selected) || !Array.isArray(saved.items) || saved.items.length !== 2) return null;
    for (let index = 0; index < 2; index++) {
      const item = saved.items[index], seed = initial.items[index];
      if (item.id !== seed.id || item.title !== seed.title || !Number.isInteger(item.revision) || item.revision < 1 || item.revision > 100 || !['approved','changes','review'].includes(item.status) || typeof item.note !== 'string' || item.note.length > 500 || !Array.isArray(item.history) || item.history.length !== item.revision - 1) return null;
      const validSpecs = specs => specs && ['quantity','width','height'].every(key => Number.isInteger(specs[key]) && specs[key] >= 1 && specs[key] <= (key === 'quantity' ? 10000 : 1000)) && ['Matte','Gloss'].includes(specs.finish) && ['White vinyl','Paper'].includes(specs.material) && ['fern','ink'].includes(specs.tone);
      if (!validSpecs(item.specs) || !item.history.every((entry,i) => entry.revision === i+1 && validSpecs(entry.specs) && ['approved','changes','review'].includes(entry.status) && typeof entry.note === 'string' && entry.note.length <= 500)) return null;
    }
    if (typeof saved.feedback !== 'string' || saved.feedback.length > 1500 || !['Not decided','Interested in discussing a paid pilot when ready','Useful, but the offer does not fit','My current process works better'].includes(saved.interest)) return null;
    if (saved.released) packet(saved);
    return saved;
  } catch { return null; }
}
