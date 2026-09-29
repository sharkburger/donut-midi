'use strict';
if(publicWebsite){
  const notice=document.createElement('section');notice.className='panel';notice.setAttribute('aria-label','Public edition');
  notice.innerHTML='<strong>Donut MIDI · Public edition</strong><p>Click Enable sound &amp; play, then hold the pointer over a donut to play a note. Eight keys, piano / guitar / synth, personal audio clips and continuous accompaniment. Best experienced on a computer.</p><p>Your audio files stay in this browser; load them again after refreshing. Synthetic eye demos and simulated pupils are not human data. State voices use self-report or creative mappings, not a validated cognitive classifier.</p><p>Live Neon currently requires the local version. A connector for the public website is in development. <a href="https://github.com/sharkburger/donut-song/tree/aoi-cognitive-voices" target="_blank" rel="noopener">Project &amp; local setup ↗</a></p>';
  document.querySelector('.intro').after(notice);
  $('source').querySelector('option[value="live"]').disabled=true;
  $('connectEyes').disabled=true;$('connectEyes').textContent='Live gaze · local connector required';
  $('connect').disabled=true;
  $('startDuet').textContent='▶ Mouse melody + accompaniment';
  $('eyeStatus').textContent='Public edition: start the synthetic eye demo to preview; not real eye data';
}
