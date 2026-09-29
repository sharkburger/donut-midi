'use strict';
if(publicWebsite){
  const notice=document.createElement('section');notice.className='panel';notice.setAttribute('aria-label','Public edition');
  notice.innerHTML='<strong>Donut MIDI · Public edition</strong><p>Click Enable sound &amp; play, then hold the pointer over a donut to play a note. Eight keys, piano / guitar / synth, personal audio clips and continuous accompaniment. Best experienced on a computer.</p><p>Your audio files stay in this browser; load them again after refreshing. Synthetic eye demos and simulated pupils are not human data. State voices use self-report or creative mappings, not a validated cognitive classifier.</p><p>For live gaze, download and start the local Neon connector below, then pair this page. A local fallback is included for browsers that block public-to-local access. <a href="https://github.com/sharkburger/donut-midi/tree/aoi-cognitive-voices" target="_blank" rel="noopener">Project &amp; local setup ↗</a></p>';
  document.querySelector('.intro').after(notice);
  $('connectEyes').textContent='Connect local Neon';
  $('wsUrl').closest('label').hidden=true;
  $('connect').textContent='Connect local Neon';
  $('connectionInfo').textContent='Start the connector and enter its pairing code in Connect your Neon.';
  $('startDuet').textContent='▶ Start melody + accompaniment';
  $('eyeStatus').textContent='Public edition: start the synthetic eye demo to preview; not real eye data';
}
