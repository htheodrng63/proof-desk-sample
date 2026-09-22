import { STORE_KEY, OFFER, initialState, saveRevision, decide, release, packet, restore, canRelease, artwork } from './model.js';
const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const labels = {approved:'Approved',changes:'Changes requested',review:'Awaiting review'};
let state = initialState();
let storageAvailable = true;
try {
  const raw = sessionStorage.getItem(STORE_KEY);
  if (raw) { const saved = restore(raw); if (saved) state = saved; else sessionStorage.removeItem(STORE_KEY); }
} catch { storageAvailable = false; }
function updateFeedbackEmail() {
  const body = `Proof Desk sample feedback\n\nOffer reaction: ${state.interest}\n\n${state.feedback.trim() || '(Write your feedback here)'}\n\nFictional sample only. Interest is not an order or payment.`;
  $('email-feedback').href = 'mailto:vietnxtshopify@gmail.com?subject=Proof%20Desk%20sample%20feedback&body=' + encodeURIComponent(body);
}
function persist() {
  updateFeedbackEmail();
  try { sessionStorage.setItem(STORE_KEY,JSON.stringify(state)); } catch { storageAvailable = false; }
  $('storage-note').textContent = storageAvailable ? 'Your sample is saved for this tab’s session.' : 'Tab storage is unavailable. You can still try everything; refreshing will reset your sample.';
}
function announce(message) { $('announcement').textContent = message; }
function change(next,message,focusId) {
  state = next; persist(); render(); announce(message);
  if (focusId) $(focusId)?.focus();
}
function run(action) { try { action(); } catch(error) { announce(error.message); } }
function specs(item) {
  return `<dl class="specs"><div><dt>Quantity</dt><dd>${item.specs.quantity}</dd></div><div><dt>Size</dt><dd>${item.specs.width} × ${item.specs.height} mm</dd></div><div><dt>Material</dt><dd>${escape(item.specs.material)}</dd></div><div><dt>Finish</dt><dd>${escape(item.specs.finish)}</dd></div><div><dt>Artwork color</dt><dd>${item.specs.tone === 'fern' ? 'Fern green' : 'Ink blue'}</dd></div><div><dt>Revision</dt><dd>v${item.revision}</dd></div></dl>`;
}
function art(item) { return `<div class="art"><div role="img" aria-label="Fictional ${escape(item.title)} artwork, ${item.specs.tone === 'fern' ? 'fern green' : 'ink blue'}">${artwork(item.id,item.specs.tone)}</div><small>SAMPLE artwork · Illustration, not to scale.<br>Use the specifications for size and finish.</small></div>`; }
function options(values,current) { return values.map(([value,label]) => `<option value="${value}" ${value===current?'selected':''}>${label}</option>`).join(''); }
function readSpecs() { return {quantity:Number($('quantity').value),width:Number($('width').value),height:Number($('height').value),finish:$('finish').value,material:$('material').value,tone:$('tone').value}; }
function hasUnsavedSpecs() {
  if (!$('spec-form')) return false;
  const item = state.items.find(value => value.id === state.selected);
  if (JSON.stringify(item.specs) === JSON.stringify(readSpecs())) return false;
  announce('You have unsaved specifications. Save the new revision before continuing, or reset the sample to discard them.');
  return true;
}
function render() {
  $('item-list').innerHTML = state.items.map(item => `<button class="item-button" data-item="${item.id}" aria-pressed="${item.id === state.selected}"><strong>${item.title}</strong><small>${item.specs.quantity} units · ${item.specs.width} × ${item.specs.height} mm · v${item.revision}</small><span class="status ${state.released?'released':item.status}">${state.released?'Released':labels[item.status]}</span></button>`).join('');
  for (const button of document.querySelectorAll('[data-item]')) button.addEventListener('click',() => !hasUnsavedSpecs() && change({...state,selected:button.dataset.item},`${button.textContent.trim()}.`, 'detail-title'));
  const approved = state.items.filter(item => item.status === 'approved').length;
  $('order-state').textContent = state.released ? 'Both sample items released' : `${approved} of 2 current proofs approved`;
  $('release').disabled = !canRelease(state) || Boolean(state.released);
  $('release').textContent = state.released ? 'Sample order released' : 'Release both items';
  $('packet').hidden = !state.released;
  $('release-help').textContent = state.released ? 'Your sample packet includes both approved revisions, their specs, and the matching SVG artwork. This does not start production.' : canRelease(state) ? 'Both current revisions are approved. Release them together to create the sample packet.' : 'Both items need approval on their current revision. Changing either proof clears the order’s release.';
  $('shop-view').setAttribute('aria-pressed',String(state.role === 'shop'));
  $('customer-view').setAttribute('aria-pressed',String(state.role === 'customer'));
  const item = state.items.find(value => value.id === state.selected);
  const feedback = item.note ? `<div class="feedback-box"><strong>Sample customer’s request · v${item.revision}</strong>${escape(item.note)}</div>` : '';
  let body;
  if (state.role === 'shop') {
    body = `${feedback}<div class="proof-grid">${art(item)}<form id="spec-form"><div class="fields"><label class="wide" for="quantity">Quantity<input id="quantity" type="number" min="1" max="10000" step="1" required value="${item.specs.quantity}"></label><label for="width">Width (mm)<input id="width" type="number" min="1" max="1000" step="1" required value="${item.specs.width}"></label><label for="height">Height (mm)<input id="height" type="number" min="1" max="1000" step="1" required value="${item.specs.height}"></label><label for="finish">Finish<select id="finish">${options([['Matte','Matte'],['Gloss','Gloss']],item.specs.finish)}</select></label><label for="material">Material<select id="material">${options([['White vinyl','White vinyl'],['Paper','Paper']],item.specs.material)}</select></label><label class="wide" for="tone">Sample artwork color<select id="tone">${options([['fern','Fern green'],['ink','Ink blue']],item.specs.tone)}</select></label></div><p class="field-note">Saving creates v${item.revision+1} and requires a new customer decision. Previous approval and release cannot carry over.</p><div class="form-action"><button class="primary" type="submit">Save new revision</button></div></form></div><div class="form-action"><button class="secondary" id="preview">Preview as customer →</button></div>`;
  } else {
    body = `${feedback}<div class="proof-grid">${art(item)}<div>${specs(item)}<p class="field-note">You are playing the sample customer. No review link or email is sent.</p></div></div>`;
    if (item.status === 'review') body += `<form id="approve-form" class="decide"><label class="check"><input id="confirm" type="checkbox" required>I approve the sample artwork and specifications shown for v${item.revision}.</label><div class="form-action"><button class="primary" type="submit">Approve sample v${item.revision}</button></div></form><form id="change-form" class="change-form"><label for="change-note">Or, request a change to this revision</label><textarea id="change-note" rows="2" maxlength="500" required placeholder="For example: Please use ink blue for the artwork."></textarea><button class="secondary" type="submit">Request changes</button></form>`;
    else body += `<div class="receipt">${item.status === 'approved' ? `Sample approval recorded for v${item.revision}. A new revision will need a new decision.` : `Changes requested for v${item.revision}. Return to the shop workspace, revise the proof, then preview it again.`}</div><div class="form-action"><button class="secondary" id="back-to-shop">Back to shop workspace</button></div>`;
  }
  const history = item.history.length ? `<details class="history"><summary>Earlier revisions (${item.history.length}) · no longer valid for release</summary><ol>${item.history.map(entry => `<li>v${entry.revision} · ${escape(entry.specs.finish)} · ${entry.specs.width} × ${entry.specs.height} mm · ${labels[entry.status]}${entry.note ? ` — ${escape(entry.note)}` : ''}. Superseded.</li>`).join('')}</ol></details>` : '';
  $('item-detail').innerHTML = `<div class="detail-heading"><div><h2 id="detail-title" tabindex="-1">${item.title}</h2><p>${state.role === 'shop' ? 'Shop workspace' : 'Customer preview'} · Current revision v${item.revision}</p></div><span class="status ${item.status}">${labels[item.status]}</span></div>${body}${history}`;
  $('spec-form')?.addEventListener('submit',event => {event.preventDefault();run(() => {
    const current = {quantity:Number($('quantity').value),width:Number($('width').value),height:Number($('height').value),finish:$('finish').value,material:$('material').value,tone:$('tone').value};
    change(saveRevision(state,item.id,current),`Saved sample v${item.revision+1}. Preview it as the customer to approve or request changes. The earlier revision cannot be released.`, 'preview');
  });});
  $('preview')?.addEventListener('click',() => switchRole('customer'));
  $('back-to-shop')?.addEventListener('click',() => switchRole('shop'));
  $('approve-form')?.addEventListener('submit',event => {event.preventDefault();run(() => change(decide(state,item.id,item.revision,'approved'),`Sample v${item.revision} approved. ${state.items.filter(value=>value.id !== item.id && value.status !== 'approved').length ? 'The other item still needs approval.' : 'Both items are now approved; release the sample order below.'}`,'detail-title'));});
  $('change-form')?.addEventListener('submit',event => {event.preventDefault();run(() => change(decide(state,item.id,item.revision,'changes',$('change-note').value),'Sample change request recorded. Return to the shop workspace to create a revised proof.','back-to-shop'));});
}
function switchRole(role) { if (hasUnsavedSpecs()) return; change({...state,role},role === 'customer' ? 'Customer preview: inspect the current artwork and specifications.' : 'Shop workspace: revise the selected sample item.', 'detail-title'); }
function download(filename,content,type) {
  let url;
  try { url = URL.createObjectURL(new Blob([content],{type})); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),30000); }
  catch { if (url) URL.revokeObjectURL(url); throw new Error('The browser could not start the download. Try a browser that allows local file downloads.'); }
}
$('shop-view').addEventListener('click',() => switchRole('shop'));
$('customer-view').addEventListener('click',() => switchRole('customer'));
$('release').addEventListener('click',() => { if (hasUnsavedSpecs()) return; run(() => change(release(state),'Both current sample revisions released. The packet is ready to download.','packet')); });
$('packet').addEventListener('click',() => run(() => { if (hasUnsavedSpecs()) return; download('SAMPLE-proof-desk-order-1001.json',JSON.stringify(packet(state),null,2),'application/json'); announce('Sample packet download requested. It contains the released revisions, specifications, and SVG artwork; it is not a real production record.'); }));
$('reset').addEventListener('click',() => {
  try {sessionStorage.removeItem(STORE_KEY);} catch {storageAvailable = false;}
  state = initialState(); updateFeedbackEmail(); $('interest').value = state.interest; $('feedback').value = ''; render(); announce('Sample reset: stickers approved, packaging labels need a matte finish.'); $('shop-view').focus();
});
$('feedback').value = state.feedback;
$('interest').value = state.interest;
$('feedback').addEventListener('input',() => {state.feedback=$('feedback').value;persist();});
$('interest').addEventListener('change',() => {state.interest=$('interest').value;persist();});
$('feedback-form').addEventListener('submit',event => {event.preventDefault();run(() => {
  const content = ['PROOF DESK — SAMPLE WORKFLOW FEEDBACK','',OFFER,'',`Offer reaction: ${state.interest}`,'',`My feedback: ${state.feedback.trim() || '(No note added)'}`,'',`Sample result: ${state.released ? 'Both items released' : 'Not yet released'}`,...state.items.map(item=>`${item.title}: v${item.revision}, ${labels[item.status]}, ${item.specs.quantity} units, ${item.specs.width} × ${item.specs.height} mm, ${item.specs.material}, ${item.specs.finish}`),'','Fictional workflow only. This note was downloaded locally, not sent. Email it to vietnxtshopify@gmail.com or share it with the person who invited you if you choose. Interest is not an order or payment.'].join('\n');
  download('proof-desk-feedback.txt',content,'text/plain;charset=utf-8'); announce('Feedback note download requested. Nothing was sent; you can share the file yourself.');
});});
persist(); render();
const current = state.items.find(item => item.id === state.selected);
announce(state.released
  ? 'Both current sample revisions are released. Your sample packet is ready to download.'
  : canRelease(state)
    ? 'Both current sample revisions are approved. Release the sample order below.'
    : current.status === 'review'
      ? `${current.title} v${current.revision} is awaiting review. Preview it as the customer to make a decision.`
      : current.status === 'changes'
        ? `${current.title} v${current.revision}: ${current.note} Revise it in the shop workspace.`
        : `${current.title} v${current.revision} is approved. Check the other item before releasing the sample order.`);
