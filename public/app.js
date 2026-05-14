/* Raia Photobooth - shared JS */
const RAIA = {
  state: {
    get type(){ return localStorage.getItem('raia.type') || 'strip' },
    set type(v){ localStorage.setItem('raia.type', v) },
    get frame(){ return localStorage.getItem('raia.frame') || 'frame-1' },
    set frame(v){ localStorage.setItem('raia.frame', v) },
    get shots(){ try{return JSON.parse(localStorage.getItem('raia.shots')||'[]')}catch{return []} },
    set shots(v){ localStorage.setItem('raia.shots', JSON.stringify(v)) },
    get final(){ return localStorage.getItem('raia.final') || '' },
    set final(v){ localStorage.setItem('raia.final', v) },
  },
  go(url){
    // instant navigation — no blocking transition
    location.href=url;
  },
  toast(msg){
    let t=document.querySelector('.toast');
    if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);}
    t.textContent=msg;t.classList.add('show');
    clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),1800);
  },
  loader(msg, progress){
    const ov=document.getElementById('loader');if(!ov) return;
    if(msg===false){ov.classList.remove('show');return;}
    document.getElementById('loaderMsg').textContent=msg||'Processing photo...';
    const bar=document.getElementById('loaderBar');
    if(typeof progress==='number'){bar.classList.add('show');bar.querySelector('i').style.width=Math.round(progress*100)+'%';}
    else{bar.classList.remove('show');}
    ov.classList.add('show');
  }
};

// Image cache: decode once, reuse across renders
const IMG_CACHE=new Map();
function loadImg(src){
  if(IMG_CACHE.has(src)) return Promise.resolve(IMG_CACHE.get(src));
  return new Promise((res,rej)=>{
    const i=new Image();i.onload=()=>{IMG_CACHE.set(src,i);res(i);};i.onerror=rej;i.src=src;
  });
}
// Create downsampled thumbnail (max edge 800px) for responsive editor preview
function makeThumb(src,maxEdge=800){
  return loadImg(src).then(img=>{
    const scale=Math.min(1,maxEdge/Math.max(img.width,img.height));
    if(scale>=1) return src;
    const c=document.createElement('canvas');
    c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',0.85);
  });
}


// frame palettes (dummy generated)
const FRAME_PALETTES=[
  ['#ffd9bf','#ffb6c8'],['#bfe2ff','#ffd9bf'],['#ffe7a8','#ffb6c8'],
  ['#c8f0d4','#bfe2ff'],['#e0c8ff','#ffb6c8'],['#fff5ec','#ffb6c8'],
  ['#ffb46b','#ff8fb1'],['#8ec8ff','#b48cff'],['#ffd86b','#ffb46b'],
  ['#ff8fb1','#b48cff'],['#a47551','#ffd9bf'],['#8ed18b','#bfe2ff'],
  ['#ff6b8a','#ffd9bf'],['#5b3a29','#ffd9bf'],['#bfe2ff','#c8f0d4'],
  ['#fcd5ce','#cdb4db'],['#f9c6c9','#a3c4f3'],['#fde2e4','#bee1e6'],
  ['#ffc8dd','#cdb4db'],['#ffafcc','#bde0fe']
];
const FRAME_NAMES=[
  'Peachy Strip','Sky Cream','Honey Pink','Mint Bloom','Lilac Heart','Vanilla Soft',
  'Sunset Pop','Galaxy','Mango','Berry','Cocoa','Forest','Bubblegum','Mocha',
  'Aurora','Pastel Dust','Cotton Candy','Fairy Mist','Princess','Baby Cloud'
];

function loadCustomFrames(){try{return JSON.parse(localStorage.getItem('raia_custom_frames')||'[]')}catch{return[]}}
function getCustomFrame(id){
  if(!id||!id.startsWith('custom-')) return null;
  const cid=id.slice(7);
  return loadCustomFrames().find(f=>f.id===cid)||null;
}

function buildFrames(type){
  const grid=document.getElementById('frameGrid');
  if(!grid) return;
  grid.innerHTML='';
  const customs=loadCustomFrames().filter(f=>f.category===type);
  customs.forEach(f=>{
    const card=document.createElement('div');
    card.className='frame-card';
    card.innerHTML=`
      <div class="frame-thumb ${type==='strip'?'strip':''}" style="background:#fff url('${f.src}') center/contain no-repeat;border:2px dashed #ff8fb1;">
        <span style="background:rgba(255,143,177,.85);padding:2px 8px;border-radius:6px;align-self:flex-start;color:#fff">CUSTOM</span>
      </div>
      <span class="name">${f.name}</span>`;
    card.onclick=()=>{RAIA.state.frame='custom-'+f.id;RAIA.state.shots=[];RAIA.go('camera.html');};
    grid.appendChild(card);
  });
  for(let i=0;i<20;i++){
    const id='frame-'+(i+1);
    const [a,b]=FRAME_PALETTES[i];
    const card=document.createElement('div');
    card.className='frame-card';
    card.innerHTML=`
      <div class="frame-thumb ${type==='strip'?'strip':''}"
        style="background:linear-gradient(135deg,${a},${b});">
        <span style="background:rgba(0,0,0,.25);padding:2px 8px;border-radius:6px;align-self:flex-start">#${i+1}</span>
      </div>
      <span class="name">${FRAME_NAMES[i]}</span>`;
    card.onclick=()=>{
      RAIA.state.frame=id;
      RAIA.state.shots=[];
      RAIA.go('camera.html');
    };
    grid.appendChild(card);
  }
}

function getFrameStyle(){
  const f=RAIA.state.frame||'frame-1';
  if(f.startsWith('custom-')) return ['#ffd9bf','#ffb6c8'];
  const idx=parseInt(f.split('-')[1])-1;
  return FRAME_PALETTES[idx]||FRAME_PALETTES[0];
}
function getFrameName(){
  const f=RAIA.state.frame||'frame-1';
  if(f.startsWith('custom-')){const c=getCustomFrame(f);return c?c.name:'Custom Frame';}
  const idx=parseInt(f.split('-')[1])-1;
  return FRAME_NAMES[idx]||'Raia Frame';
}

/* ========== CAMERA ========== */
async function initCamera(){
  const type=RAIA.state.type;
  const customF=getCustomFrame(RAIA.state.frame);
  const slotsCount = customF? customF.slots.length : 4;
  const stage=document.getElementById('frameStage');
  const stageWrap=document.getElementById('frameStageWrap');
  const [c1,c2]=getFrameStyle();

  let mirror=true;
  const video=document.getElementById('video');
  const camPanel=document.getElementById('camPanel');

  // build slots — different layout for custom vs default
  stage.innerHTML='';
  if(customF){
    // CUSTOM FRAME: overlay PNG, absolute-positioned slots from saved %
    stageWrap.style.background='transparent';
    stageWrap.style.padding='8px';
    stageWrap.style.borderRadius='18px';
    // load frame to get aspect ratio
    const fimg=new Image();
    fimg.onload=()=>{
      const ar=fimg.naturalWidth/fimg.naturalHeight;
      stage.className='frame-stage';
      stage.style.position='relative';
      stage.style.aspectRatio=ar;
      stage.style.width='auto';
      stage.style.height='100%';
      stage.style.maxHeight='100%';
      stage.style.maxWidth='100%';
      stage.style.display='block';
      stage.style.background='#fff';
      stage.style.padding='0';
      // slot divs
      customF.slots.forEach((sd,i)=>{
        const s=document.createElement('div');
        s.className='slot';
        s.dataset.idx=i;
        s.style.position='absolute';
        s.style.left=(sd.x*100)+'%';
        s.style.top=(sd.y*100)+'%';
        s.style.width=(sd.w*100)+'%';
        s.style.height=(sd.h*100)+'%';
        s.style.transform=`rotate(${sd.rot||0}deg)`;
        s.style.transformOrigin='center center';
        s.style.overflow='hidden';
        s.innerHTML='<button class="x" title="Remove" style="z-index:5">×</button>';
        s.querySelector('.x').onclick=(e)=>{
          e.stopPropagation();
          const shots=RAIA.state.shots;shots[i]=null;RAIA.state.shots=shots;renderSlots();
        };
        stage.appendChild(s);
      });
      // overlay PNG on top
      const ov=document.createElement('img');
      ov.src=customF.src;
      ov.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3';
      stage.appendChild(ov);
      renderSlots();
    };
    fimg.src=customF.src;
  } else {
    stageWrap.style.background=`linear-gradient(160deg,${c1},${c2})`;
    stageWrap.style.padding='14px';
    stageWrap.style.borderRadius='18px';
    stage.className='frame-stage '+(type==='strip'?'strip':'r4');
    for(let i=0;i<slotsCount;i++){
      const s=document.createElement('div');
      s.className='slot';
      s.dataset.idx=i;
      s.innerHTML='<button class="x" title="Remove">×</button>';
      s.querySelector('.x').onclick=(e)=>{
        e.stopPropagation();
        const shots=RAIA.state.shots;shots[i]=null;RAIA.state.shots=shots;renderSlots();
      };
      stage.appendChild(s);
    }
    const label=document.createElement('div');
    label.style.cssText='text-align:center;font-size:10px;color:#fff;background:rgba(0,0,0,.15);border-radius:6px;padding:4px;margin-top:4px;letter-spacing:2px;font-weight:700';
    label.textContent='RAIA PHOTOBOOTH ✿';
    stage.appendChild(label);
  }

  // restore existing shots
  function renderSlots(){
    const shots=RAIA.state.shots;
    const slots=stage.querySelectorAll('.slot');
    let activeIdx=-1;
    slots.forEach((sl,i)=>{
      sl.classList.remove('live','filled','no-mirror');
      const inner=sl.querySelector('img:not(.overlay),video');
      if(inner) inner.remove();
      if(shots[i]){
        const img=document.createElement('img');
        img.src=shots[i];
        img.style.cssText='width:100%;height:100%;object-fit:cover';
        sl.appendChild(img);
        sl.classList.add('filled');
      } else if(activeIdx===-1){
        activeIdx=i;
      }
    });
    if(activeIdx>=0){
      const sl=slots[activeIdx];
      const v=document.createElement('video');
      v.autoplay=true;v.playsInline=true;v.muted=true;
      v.srcObject=video.srcObject;
      v.style.cssText='width:100%;height:100%;object-fit:cover';
      sl.appendChild(v);
      sl.classList.add('live');
      if(!mirror) sl.classList.add('no-mirror');
    }
    document.getElementById('slotCounter').textContent=
      `${shots.filter(Boolean).length} / ${slotsCount} slot terisi`;
    return activeIdx;
  }

  // mirror toggle
  document.getElementById('mirrorBtn').onclick=()=>{
    mirror=!mirror;
    camPanel.classList.toggle('mirror', mirror);
    renderSlots();
    RAIA.toast('Mirror '+(mirror?'ON':'OFF'));
  };
  camPanel.classList.add('mirror');

  // start stream — lightweight preview, capture at max resolution
  let imageCapture=null, maxPhotoSize={width:1920,height:1080};
  try{
    const stream=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},
      audio:false
    });
    video.srcObject=stream;
    await video.play();
    renderSlots();
    // Setup HD capture via ImageCapture API
    const track=stream.getVideoTracks()[0];
    if('ImageCapture' in window){
      try{
        imageCapture=new ImageCapture(track);
        const caps=await imageCapture.getPhotoCapabilities();
        if(caps.imageWidth && caps.imageHeight){
          maxPhotoSize={width:caps.imageWidth.max||1920,height:caps.imageHeight.max||1080};
        }
      }catch(e){imageCapture=null;}
    }
    // fallback: try to get max from track settings
    if(!imageCapture){
      const settings=track.getSettings();
      const tcaps=track.getCapabilities?.();
      if(tcaps?.width?.max) maxPhotoSize={width:tcaps.width.max,height:tcaps.height.max};
      else maxPhotoSize={width:settings.width||1280,height:settings.height||720};
    }
  }catch(e){
    RAIA.toast('Tidak bisa akses kamera: '+e.message);
    console.error(e);
  }

  // capture
  const flash=document.getElementById('flash');
  const cd=document.getElementById('countdown');
  function beep(freq=880,dur=120){
    try{
      const ctx=new (window.AudioContext||window.webkitAudioContext)();
      const o=ctx.createOscillator();const g=ctx.createGain();
      o.frequency.value=freq;o.type='sine';
      g.gain.value=.15;o.connect(g);g.connect(ctx.destination);
      o.start();setTimeout(()=>{o.stop();ctx.close()},dur);
    }catch{}
  }
  function shutter(){
    try{
      const ctx=new (window.AudioContext||window.webkitAudioContext)();
      const o=ctx.createOscillator();const g=ctx.createGain();
      o.type='square';o.frequency.setValueAtTime(1200,ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(60,ctx.currentTime+.18);
      g.gain.setValueAtTime(.25,ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.2);
      o.connect(g);g.connect(ctx.destination);
      o.start();o.stop(ctx.currentTime+.2);setTimeout(()=>ctx.close(),300);
    }catch{}
  }

  async function captureHD(){
    // try ImageCapture.takePhoto for max hardware resolution
    if(imageCapture){
      try{
        const blob=await imageCapture.takePhoto();
        const bmp=await createImageBitmap(blob);
        const cnv=document.createElement('canvas');
        cnv.width=bmp.width;cnv.height=bmp.height;
        const cx=cnv.getContext('2d');
        cx.imageSmoothingEnabled=true;cx.imageSmoothingQuality='high';
        if(mirror){cx.translate(cnv.width,0);cx.scale(-1,1);}
        // DSLR-like polish: subtle contrast/saturation boost
        cx.filter='contrast(1.06) saturate(1.08) brightness(1.02)';
        cx.drawImage(bmp,0,0);
        cx.filter='none';
        return cnv.toDataURL('image/jpeg',0.95);
      }catch(e){console.warn('ImageCapture failed, fallback',e);}
    }
    // fallback: draw from video at max possible resolution
    const cnv=document.createElement('canvas');
    cnv.width=Math.max(video.videoWidth,maxPhotoSize.width);
    cnv.height=Math.max(video.videoHeight,maxPhotoSize.height);
    const cx=cnv.getContext('2d');
    cx.imageSmoothingEnabled=true;cx.imageSmoothingQuality='high';
    if(mirror){cx.translate(cnv.width,0);cx.scale(-1,1);}
    cx.filter='contrast(1.06) saturate(1.08) brightness(1.02)';
    cx.drawImage(video,0,0,cnv.width,cnv.height);
    cx.filter='none';
    return cnv.toDataURL('image/jpeg',0.95);
  }

  document.getElementById('takeBtn').onclick=async()=>{
    const shots=RAIA.state.shots;
    const slots=stage.querySelectorAll('.slot');
    let idx=-1;for(let i=0;i<slots.length;i++) if(!shots[i]){idx=i;break;}
    if(idx===-1){RAIA.toast('Semua slot sudah terisi');return;}

    document.getElementById('takeBtn').disabled=true;
    for(let n=5;n>=1;n--){
      cd.textContent=n;cd.classList.remove('active');void cd.offsetWidth;cd.classList.add('active');
      beep(n===1?1200:700,120);
      await new Promise(r=>setTimeout(r,900));
    }
    cd.classList.remove('active');
    flash.classList.remove('fire');void flash.offsetWidth;flash.classList.add('fire');
    shutter();

    RAIA.loader('Menyimpan foto HD...');
    const dataUrl=await captureHD();
    const ns=[...shots];ns[idx]=dataUrl;RAIA.state.shots=ns;
    IMG_CACHE.delete(dataUrl);
    renderSlots();
    RAIA.loader(false);
    document.getElementById('takeBtn').disabled=false;
    // Do NOT auto-advance — user must click Next
    if(ns.filter(Boolean).length>=slotsCount){
      RAIA.toast('Semua slot terisi ✿ klik Next untuk lanjut');
    }
  };

  document.getElementById('nextBtn').onclick=()=>{
    const shots=RAIA.state.shots.filter(Boolean);
    if(shots.length<slotsCount){RAIA.toast('Lengkapi semua slot dulu ✿');return;}
    RAIA.go('editor.html');
  };
  document.getElementById('backBtn').onclick=()=>RAIA.go('choose-frame.html');
}

/* ========== EDITOR / SAVE ========== */
const FILTERS={
  none:{name:'Original',css:''},
  warm:{name:'Warm Korean',css:'sepia(.25) saturate(1.2) hue-rotate(-10deg) brightness(1.05)'},
  vintage:{name:'Vintage Film',css:'sepia(.5) contrast(1.1) brightness(.95) saturate(.9)'},
  pink:{name:'Soft Pink',css:'saturate(1.3) hue-rotate(-15deg) brightness(1.08) contrast(.95)'},
  blue:{name:'Cool Blue',css:'saturate(1.1) hue-rotate(15deg) brightness(1.02)'},
  bw:{name:'B & W',css:'grayscale(1) contrast(1.1)'},
  retro:{name:'Retro Cam',css:'sepia(.3) saturate(1.4) contrast(1.1) hue-rotate(-5deg)'},
  dreamy:{name:'Dreamy',css:'brightness(1.1) saturate(1.2) blur(.4px) contrast(.95)'},
  sunset:{name:'Sunset',css:'sepia(.4) saturate(1.5) hue-rotate(-20deg) brightness(1.05)'},
  bright:{name:'Clean Bright',css:'brightness(1.15) saturate(1.1) contrast(1.05)'},
  moody:{name:'Moody Cafe',css:'sepia(.4) contrast(1.15) brightness(.9) saturate(.8)'}
};

const EDIT={filter:'none',brightness:100,contrast:100,saturate:100,stickers:[],history:[],redo:[]};

function pushHistory(){
  EDIT.history.push(JSON.stringify({f:EDIT.filter,b:EDIT.brightness,c:EDIT.contrast,s:EDIT.saturate,st:EDIT.stickers}));
  if(EDIT.history.length>30) EDIT.history.shift();
  EDIT.redo=[];
}

function drawFrame(canvas, opts){
  opts=opts||{};
  const maxW=opts.maxW||Infinity;
  const type=RAIA.state.type;
  const shots=RAIA.state.shots.filter(Boolean);
  const ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  const filterCss=`${FILTERS[EDIT.filter].css} brightness(${EDIT.brightness}%) contrast(${EDIT.contrast}%) saturate(${EDIT.saturate}%)`;

  // ===== CUSTOM FRAME PATH =====
  const customF=getCustomFrame(RAIA.state.frame);
  if(customF){
    return loadImg(customF.src).then(async frameImg=>{
      let W=frameImg.naturalWidth, H=frameImg.naturalHeight;
      const scale=Math.min(1, maxW/W);
      W=Math.round(W*scale); H=Math.round(H*scale);
      canvas.width=W;canvas.height=H;
      ctx.clearRect(0,0,W,H);
      ctx.filter=filterCss;
      // Draw photos sequentially with yields to keep UI responsive
      for(let i=0;i<customF.slots.length;i++){
        const s=customF.slots[i];
        if(!shots[i]) continue;
        const img=await loadImg(shots[i]);
        const dw=s.w*W, dh=s.h*H, dx=s.x*W, dy=s.y*H;
        const ar=img.width/img.height, sar=dw/dh;
        let sx,sy,sw,sh;
        if(ar>sar){sh=img.height;sw=sh*sar;sx=(img.width-sw)/2;sy=0;}
        else{sw=img.width;sh=sw/sar;sx=0;sy=(img.height-sh)/2;}
        ctx.save();
        ctx.translate(dx+dw/2,dy+dh/2);
        ctx.rotate(((s.rot||0)*Math.PI)/180);
        ctx.drawImage(img,sx,sy,sw,sh,-dw/2,-dh/2,dw,dh);
        ctx.restore();
        await new Promise(r=>setTimeout(r,0));
      }
      ctx.filter='none';
      ctx.drawImage(frameImg,0,0,W,H);
    });
  }

  // ===== DEFAULT FRAME PATH =====
  const [c1,c2]=getFrameStyle();
  let W,H,layout;
  if(type==='strip'){
    W=600;H=1500;layout=[];
    const slotW=520,slotH=300,startY=40,gap=20;
    for(let i=0;i<4;i++) layout.push({x:40,y:startY+i*(slotH+gap),w:slotW,h:slotH});
  } else {
    W=900;H=1200;layout=[];
    const sw=400,sh=400,gx=40,gy=40,startX=40,startY=40;
    for(let i=0;i<4;i++){
      const r=Math.floor(i/2),c=i%2;
      layout.push({x:startX+c*(sw+gx),y:startY+r*(sh+gy),w:sw,h:sh});
    }
  }
  canvas.width=W;canvas.height=H;
  const grd=ctx.createLinearGradient(0,0,W,H);
  grd.addColorStop(0,c1);grd.addColorStop(1,c2);
  ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(255,255,255,.35)';
  for(let i=0;i<60;i++){
    const x=Math.random()*W,y=Math.random()*H,r=Math.random()*4+1;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
  ctx.filter=filterCss;
  return Promise.all(layout.map((slot,i)=>{
    if(!shots[i]) return Promise.resolve();
    return loadImg(shots[i]).then(img=>{
      const ar=img.width/img.height, sar=slot.w/slot.h;
      let sx,sy,sw,sh;
      if(ar>sar){sh=img.height;sw=sh*sar;sx=(img.width-sw)/2;sy=0;}
      else{sw=img.width;sh=sw/sar;sx=0;sy=(img.height-sh)/2;}
      ctx.save();
      const r=12;
      ctx.beginPath();
      ctx.moveTo(slot.x+r,slot.y);
      ctx.arcTo(slot.x+slot.w,slot.y,slot.x+slot.w,slot.y+slot.h,r);
      ctx.arcTo(slot.x+slot.w,slot.y+slot.h,slot.x,slot.y+slot.h,r);
      ctx.arcTo(slot.x,slot.y+slot.h,slot.x,slot.y,r);
      ctx.arcTo(slot.x,slot.y,slot.x+slot.w,slot.y,r);
      ctx.closePath();ctx.clip();
      ctx.drawImage(img,sx,sy,sw,sh,slot.x,slot.y,slot.w,slot.h);
      ctx.restore();
    });
  })).then(()=>{
    ctx.filter='none';
    ctx.fillStyle='rgba(255,255,255,.85)';
    ctx.fillRect(40,H-80,W-80,50);
    ctx.fillStyle='#5b3a29';
    ctx.font='bold 22px Fredoka, sans-serif';
    ctx.textAlign='center';
    ctx.fillText('✿ RAIA PHOTOBOOTH ✿  '+new Date().toLocaleDateString(),W/2,H-48);
  });
}

function initEditor(){
  const canvas=document.getElementById('finalCanvas');
  const filterRow=document.getElementById('filterRow');
  Object.keys(FILTERS).forEach(k=>{
    const b=document.createElement('button');
    b.className='filter-btn'+(k==='none'?' active':'');
    b.dataset.k=k;
    const [c1,c2]=getFrameStyle();
    b.innerHTML=`<div class="swatch" style="background:linear-gradient(135deg,${c1},${c2});filter:${FILTERS[k].css}"></div>${FILTERS[k].name}`;
    b.onclick=()=>{
      pushHistory();EDIT.filter=k;
      filterRow.querySelectorAll('.filter-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      render();
    };
    filterRow.appendChild(b);
  });
  ['brightness','contrast','saturate'].forEach(k=>{
    const el=document.getElementById(k);
    el.oninput=()=>{EDIT[k]=+el.value;document.getElementById(k+'Val').textContent=el.value+'%';render();};
    el.onchange=()=>pushHistory();
  });
  // sticker feature removed for cleaner UI / better perf
  document.getElementById('undoBtn').onclick=()=>{
    if(EDIT.history.length<2) return;
    EDIT.redo.push(EDIT.history.pop());
    const s=JSON.parse(EDIT.history[EDIT.history.length-1]);
    Object.assign(EDIT,{filter:s.f,brightness:s.b,contrast:s.c,saturate:s.s,stickers:s.st});
    syncControls();render();
  };
  document.getElementById('redoBtn').onclick=()=>{
    if(!EDIT.redo.length) return;
    const item=EDIT.redo.pop();EDIT.history.push(item);
    const s=JSON.parse(item);
    Object.assign(EDIT,{filter:s.f,brightness:s.b,contrast:s.c,saturate:s.s,stickers:s.st});
    syncControls();render();
  };
  // INSTANT NAV: editor doesn't render HD; save page does it once
  document.getElementById('nextBtn').onclick=()=>{
    // persist edit state so save page renders with same look
    try{localStorage.setItem('raia.edit',JSON.stringify({f:EDIT.filter,b:EDIT.brightness,c:EDIT.contrast,s:EDIT.saturate}));}catch{}
    RAIA.state.final=''; // invalidate cache → save will render HD once
    RAIA.go('save.html');
  };
  document.getElementById('backBtn').onclick=()=>RAIA.go('camera.html');

  function syncControls(){
    document.getElementById('brightness').value=EDIT.brightness;
    document.getElementById('brightnessVal').textContent=EDIT.brightness+'%';
    document.getElementById('contrast').value=EDIT.contrast;
    document.getElementById('contrastVal').textContent=EDIT.contrast+'%';
    document.getElementById('saturate').value=EDIT.saturate;
    document.getElementById('saturateVal').textContent=EDIT.saturate+'%';
    filterRow.querySelectorAll('.filter-btn').forEach(x=>x.classList.toggle('active',x.dataset.k===EDIT.filter));
  }

  // rAF-debounced LIGHT render (capped width) — keeps editor smooth
  let _renderPending=false;
  async function render(){
    if(_renderPending) return;
    _renderPending=true;
    await new Promise(r=>requestAnimationFrame(r));
    _renderPending=false;
    await drawFrame(canvas,{maxW:900});
  }
  // Show editor UI immediately; preload + first light render happen in background
  pushHistory();
  setTimeout(()=>{
    RAIA.loader('Memuat preview...');
    Promise.all(RAIA.state.shots.filter(Boolean).map(s=>loadImg(s)))
      .then(()=>drawFrame(canvas,{maxW:900}))
      .then(()=>RAIA.loader(false))
      .catch(e=>{console.error(e);RAIA.loader(false);});
  },0);
}

function initSave(){
  const canvas=document.getElementById('finalCanvas');
  const finalImg=document.getElementById('finalImg');
  const shotsEl=document.getElementById('shotsList');

  // Show thumbnails + cached final immediately for instant page paint
  RAIA.state.shots.filter(Boolean).forEach((src,i)=>{
    const img=document.createElement('img');img.src=src;img.alt='shot '+(i+1);
    shotsEl.appendChild(img);
  });
  if(RAIA.state.final){
    finalImg.src=RAIA.state.final;
  } else {
    // Fallback: render in background without blocking page paint
    RAIA.loader('Menyiapkan hasil akhir...');
    setTimeout(()=>{
      Promise.all(RAIA.state.shots.filter(Boolean).map(s=>loadImg(s)))
        .then(()=>drawFrame(canvas))
        .then(()=>new Promise(res=>canvas.toBlob(b=>{
          const r=new FileReader();r.onload=()=>{RAIA.state.final=r.result;finalImg.src=r.result;res();};r.readAsDataURL(b);
        },'image/png')))
        .then(()=>RAIA.loader(false))
        .catch(e=>{console.error(e);RAIA.loader(false);});
    },0);
  }
  const ts=()=>new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);

  document.getElementById('saveBtn').onclick=()=>{
    const a=document.createElement('a');
    a.href=RAIA.state.final;a.download=`raia-photobooth-${ts()}.png`;a.click();
    RAIA.state.shots.filter(Boolean).forEach((src,i)=>{
      const a=document.createElement('a');a.href=src;a.download=`raia-shot-${i+1}-${ts()}.jpg`;
      setTimeout(()=>a.click(),300*(i+1));
    });
    RAIA.toast('Foto tersimpan ✿');
  };

  document.getElementById('gifBtn').onclick=async()=>{
    const shots=RAIA.state.shots.filter(Boolean);
    if(!shots.length) return;
    if(typeof GIF==='undefined'){RAIA.toast('Library GIF belum siap, coba lagi');return;}
    RAIA.loader('Membuat GIF... 0%', 0);
    try{
      // Use the first raw photo's native aspect ratio (e.g. 16:9)
      const first=await loadImg(shots[0]);
      const maxW=640;
      const w=Math.min(maxW, first.width);
      const h=Math.round(w*first.height/first.width);
      const gif=new GIF({workers:2,quality:10,width:w,height:h,workerScript:'/vendor/gif.worker.js'});
      for(let i=0;i<shots.length;i++){
        const img=await loadImg(shots[i]);
        const c=document.createElement('canvas');c.width=w;c.height=h;
        const cx=c.getContext('2d');
        cx.imageSmoothingEnabled=true;cx.imageSmoothingQuality='high';
        cx.fillStyle='#000';cx.fillRect(0,0,w,h);
        // contain — preserves raw aspect ratio
        const ar=img.width/img.height, sar=w/h;
        let dw,dh,dx,dy;
        if(ar>sar){dw=w;dh=w/ar;dx=0;dy=(h-dh)/2;}
        else{dh=h;dw=h*ar;dy=0;dx=(w-dw)/2;}
        cx.drawImage(img,dx,dy,dw,dh);
        gif.addFrame(c,{delay:700,copy:true});
      }
      gif.on('progress',p=>RAIA.loader('Membuat GIF... '+Math.round(p*100)+'%', p));
      gif.on('finished',blob=>{
        const gifBlob=blob.type==='image/gif'?blob:new Blob([blob],{type:'image/gif'});
        const url=URL.createObjectURL(gifBlob);
        const a=document.createElement('a');a.href=url;a.download=`raia-photobooth-${ts()}.gif`;
        document.body.appendChild(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),2000);
        RAIA.loader(false);
        RAIA.toast('GIF tersimpan ✿');
      });
      gif.on('abort',()=>{RAIA.loader(false);RAIA.toast('GIF dibatalkan');});
      gif.render();
    }catch(e){console.error(e);RAIA.loader(false);RAIA.toast('Gagal buat GIF: '+e.message);}
  };

  document.getElementById('againBtn').onclick=()=>{
    RAIA.state.shots=[];RAIA.state.final='';RAIA.go('welcome.html');
  };
}
