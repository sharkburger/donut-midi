'use strict';
const samplePanel=document.createElement('section');samplePanel.className='panel';
samplePanel.innerHTML='<h2>Eight donuts · your sounds</h2><p>Load music, effects or recordings for each region. MP3 / WAV / OGG support depends on the browser. Trim clips to 1–8 s for responsive playing.</p><p>Files are decoded in this browser, not uploaded to a server. Reload them after refreshing. Different regions can overlap; retriggering a region fades its old clip and restarts it. Pause stops all audio.</p>';
ZONES.forEach(z=>{
 const row=document.createElement('div');row.className='sample-row';
 const title=document.createElement('strong');title.textContent=`${z.id+1} · ${z.name}`;
 const label=document.createElement('label');label.style.display='block';label.textContent='Choose audio file ';const input=document.createElement('input');input.type='file';input.accept='audio/*';input.setAttribute('aria-label',z.name+' audio');label.append(input);
 const info=document.createElement('p');info.className='sample-name';info.textContent='Default synth · adjust pitch in Sound controls';info.setAttribute('role','status');
 const preview=document.createElement('button');preview.textContent='Preview';preview.onclick=async()=>{if(!audioEnabled)await toggleAudio();else await instrument.start();instrument.playZone(z.id);};
 const clear=document.createElement('button');clear.textContent='Reset sound';
 input.onchange=async()=>{const file=input.files[0];if(!file)return;info.textContent='Decoding…';try{if(await instrument.loadSample(z.id,file)){const clip=instrument.samples.get(z.id);info.textContent=`${clip.name} · ${clip.buffer.duration.toFixed(1)} s`;log('sample_loaded',{zone:z.id,name:clip.name,duration:clip.buffer.duration});}}catch(e){info.textContent='Could not load: '+e.message+(instrument.samples.has(z.id)?'; previous sound retained':'; using the default sound');}finally{input.value='';}};
 clear.onclick=()=>{instrument.clearSample(z.id);for(const v of instrument.voices)if(v.zone===z.id)instrument.release(v);info.textContent='Default synth · adjust pitch in Sound controls';};
 row.append(title,label,info,preview,clear);samplePanel.append(row);
});
document.querySelector('aside').prepend(samplePanel);
