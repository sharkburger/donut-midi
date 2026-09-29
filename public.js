 'use strict';
if(publicWebsite){
  const notice=document.createElement('section');notice.className='panel';notice.setAttribute('aria-label','公开版说明');
  notice.innerHTML='<strong>Donut MIDI · 公开体验版</strong><p>点击「开启声音与演奏」，用鼠标在甜甜圈上停留选音。支持八键、钢琴／吉他／合成器、个人音频和持续伴奏。建议使用电脑体验。</p><p>上传的音乐仅在当前浏览器中处理，刷新后需重新选择。眼球合成演示与模拟瞳孔不是真人数据；状态声部来自自述或创作映射，不是经过验证的认知分类。</p><p>真实 Neon 眼动目前请使用本地完整版；公开网页的一键连接器尚未提供。<a href="https://github.com/sharkburger/donut-song/tree/aoi-cognitive-voices" target="_blank" rel="noopener">项目与本地使用说明 ↗</a></p>';
  document.querySelector('.intro').after(notice);
  $('source').querySelector('option[value="live"]').disabled=true;
  $('connectEyes').disabled=true;$('connectEyes').textContent='真实眼动 · 需本地连接器';
  $('connect').disabled=true;
  $('startDuet').textContent='▶ 鼠标旋律 + 循环伴奏';
  $('eyeStatus').textContent='公开体验：可开启合成眼球演示，非真人数据';
}
