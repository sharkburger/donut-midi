/* Measurement bookkeeping, not a cognitive classifier. */
(function(root){
 class StudyRecorder{
  constructor(meta,now){this.meta=meta;this.start=now;this.samples=[];this.events=[];this.blocks=[];this.sampleN=0;this.eventN=0;this.run=0;this.block=null;this.game=null;this.lastIndex=-1;this.closed=false;this.pupilCount=0;this.pupilSum=0;this.pupilMin=Infinity;this.pupilMax=-Infinity;}
  event(type,data,now){if(!this.closed)this.events.push({n:this.eventN++,t_ms:Math.round(now-this.start),type,...data});}
  observeGame(g,now,audioNow){
   if(g!==this.game){if(this.block&&!this.block.completed)this.block.end_reason='changed_or_ended';this.block=null;this.game=g;this.lastIndex=-1;
    if(g){this.run++;for(const b of g.blocks)this.blocks.push({block_id:`${this.run}:${b.index}`,run:this.run,index:b.index,song:g.score.title,automatic_preview:g.automatic,style:g.score.style||'uploaded_melody',route_mode:g.routeMode||'practice',target_zone:b.zone+1,bpm:g.bpm,beats:b.beats,dwell_required_ms:g.dwellMs,early_ready:false,completed:false});this.event('game_started',{run:this.run,song:g.score.title,route:g.blocks.map(b=>b.zone+1),automatic:g.automatic},now);}
   }
   if(!g)return;
   if(g.index!==this.lastIndex||g.done){if(this.block&&g.completed>this.block.index){this.block.completed=true;this.block.ended_ms=Math.round(now-this.start);}
    this.block=g.done?null:this.blocks.find(b=>b.run===this.run&&b.index===g.index);if(this.block)this.block.available_ms=Math.round(now-this.start);this.lastIndex=g.index;}
   if(this.block&&g.phase==='playing'&&this.block.play_started_ms===undefined){this.block.play_started_ms=Math.round(now-this.start-(audioNow-g.playStart));this.block.acquisition_wall_ms=Math.max(0,this.block.play_started_ms-this.block.available_ms);this.event('block_playing',{block_id:this.block.block_id,target_zone:this.block.target_zone},now);}
   if(g.queued){const next=this.blocks.find(b=>b.run===this.run&&b.index===g.index+1);if(next&&!next.early_ready){next.early_ready=true;this.event('next_ready',{block_id:next.block_id},now);}}
  }
  sample(input,now){if(this.closed)return;const s=input.sample||{},fresh=!!input.fresh,live=input.source==='live',valid=live&&fresh&&s.worn&&[s.pupilLeft,s.pupilRight].every(v=>Number.isFinite(v)&&v>0&&v<30),located=!!(fresh&&s.worn&&s.surfaceValid&&Number.isFinite(s.x)&&Number.isFinite(s.y));
   if(valid){const mean=(s.pupilLeft+s.pupilRight)/2;this.pupilCount++;this.pupilSum+=mean;this.pupilMin=Math.min(this.pupilMin,mean);this.pupilMax=Math.max(this.pupilMax,mean);}
   const ref=valid&&Number.isFinite(input.reference)&&input.reference>0?input.reference:null;
   this.samples.push({n:this.sampleN++,t_ms:Math.round(now-this.start),source:input.source,block_id:this.block?.block_id||null,device_timestamp:fresh?(s.deviceTimestamp??null):null,fresh,worn:fresh?!!s.worn:false,surface_valid:located,x:located?s.x:null,y:located?s.y:null,aoi_zone:located&&input.zone>=0?input.zone+1:null,pupil_left_mm:valid?s.pupilLeft:null,pupil_right_mm:valid?s.pupilRight:null,pupil_valid:!!valid,reference_mm:ref,pupil_change_pct:ref?(((s.pupilLeft+s.pupilRight)/2)/ref-1)*100:null,game_phase:input.phase||null});
  }
  snapshot(now,report=null,reason=null){return {duration_ms:Math.round(now-this.start),blocks:this.blocks.map(b=>({...b})),planned_blocks:this.blocks.length,report,end_reason:reason};}
 }
 const api={StudyRecorder};if(typeof module!=='undefined')module.exports=api;else root.DonutStudy=api;
})(globalThis);
