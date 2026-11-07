function mobileSetup(){
  document.querySelector('#source option[value=live]')?.remove();
  document.querySelector('#source option[value=simulate]').textContent='Touch performance · simulated input';
  document.getElementById('sourceBadge').textContent='● Touch performance';
  document.querySelector('#simControls .help').textContent='Hold a donut for about half a second. The pupil slider is synthetic; no eyes are tracked.';
  document.getElementById('scoreMode').textContent='Touch · hold to play';
  document.getElementById('canvasHost').setAttribute('aria-label','Eight donuts. Hold a finger over a donut to play.');
  document.querySelector('label.file-button').hidden=true;
  for(const id of ['connectEyes','evidenceSetup','pairConnect','pairDisconnect','openWorkshop','studyQuick','studyOpen','studyList','studyExportAll','studyRetry','researchStart','researchExport','studioDemo','enableMidi']){
    const button=document.getElementById(id);if(button){button.hidden=true;button.disabled=true;}
  }
  if(typeof connectorPanel!=='undefined')connectorPanel.hidden=true;
  if(typeof studyPanel!=='undefined')studyPanel.hidden=true;
  if(typeof researchPanel!=='undefined')researchPanel.hidden=true;
  document.getElementById('enableMidi')?.closest('details')?.remove();
  document.getElementById('source').addEventListener('change',()=>{if(document.getElementById('source').value==='simulate')document.getElementById('sourceBadge').textContent='● Touch performance';});
  const notice=document.createElement('p');notice.textContent='iOS touch/replay beta · no live Neon, participant database, MIDI output or Workshop Editor. Use Import recording above to replay JSON.';
  notice.style.cssText='padding:10px 16px;margin:0;background:#f0eadf;font:13px system-ui';document.querySelector('header').after(notice);
  const link=document.createElement('a');link.href='vendor/p5-LICENSE.txt';link.textContent='p5.js license';link.style.marginLeft='10px';notice.append(link);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mobileSetup,{once:true});else mobileSetup();
