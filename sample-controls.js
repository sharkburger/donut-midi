'use strict';
const samplePanel=document.createElement('section');samplePanel.className='panel';
samplePanel.innerHTML='<h2>八个甜甜圈 · 自选声音</h2><p>每个区域可以加载自己的音乐、音效或录音。MP3 / WAV / OGG 等格式取决于浏览器支持；建议先剪成 1–8 秒。</p><p>文件仅在此浏览器解码，不上传服务器。刷新后需重新选择。不同区域可以叠奏，同一区域再次触发会淡出旧片段、从头播放；暂停可停止全部声音。</p>';
ZONES.forEach(z=>{
 const row=document.createElement('div');row.className='sample-row';
 const title=document.createElement('strong');title.textContent=`${z.id+1} · ${z.name}`;
 const label=document.createElement('label');label.style.display='block';label.textContent='上传 / 选择音乐 ';const input=document.createElement('input');input.type='file';input.accept='audio/*';input.setAttribute('aria-label',z.name+'音乐');label.append(input);
 const info=document.createElement('p');info.className='sample-name';info.textContent='默认合成音 · 音高在创作台调整';info.setAttribute('role','status');
 const preview=document.createElement('button');preview.textContent='试听';preview.onclick=async()=>{if(!audioEnabled)await toggleAudio();else await instrument.start();instrument.playZone(z.id);};
 const clear=document.createElement('button');clear.textContent='恢复默认音';
 input.onchange=async()=>{const file=input.files[0];if(!file)return;info.textContent='正在解码…';try{if(await instrument.loadSample(z.id,file)){const clip=instrument.samples.get(z.id);info.textContent=`${clip.name} · ${clip.buffer.duration.toFixed(1)} 秒`;log('sample_loaded',{zone:z.id,name:clip.name,duration:clip.buffer.duration});}}catch(e){info.textContent='加载失败：'+e.message+(instrument.samples.has(z.id)?'；仍保留之前的声音':'；继续使用默认音');}finally{input.value='';}};
 clear.onclick=()=>{instrument.clearSample(z.id);for(const v of instrument.voices)if(v.zone===z.id)instrument.release(v);info.textContent='默认合成音 · 音高在创作台调整';};
 row.append(title,label,info,preview,clear);samplePanel.append(row);
});
document.querySelector('aside').prepend(samplePanel);
