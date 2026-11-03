'use strict';
(() => {
  const data = window.BIRTHDAY_DATA;
  if (!data || !Array.isArray(data.albums)) {
    document.body.insertAdjacentHTML('afterbegin','<p style="padding:24px;background:#fff;color:#b22">Не удалось загрузить фотографии. Убедитесь, что файл content.js лежит рядом с index.html.</p>');
    return;
  }
  const $ = (s,scope=document) => scope.querySelector(s);
  const $$ = (s,scope=document) => [...scope.querySelectorAll(s)];
  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const A = data.albums;
  const byFolder = folder => A.find(a=>a.folder===folder);
  let filter = 'all', activeAlbum = null, lightboxPictures = [], lightboxIndex = 0, lastFocus = null;
  let favorites;
  try { favorites = new Set(JSON.parse(localStorage.getItem('m-k-favorite-chapters-v2')||'[]')); }
  catch { favorites = new Set(); }
  const saveFavorites=()=>{try{localStorage.setItem('m-k-favorite-chapters-v2',JSON.stringify([...favorites]));}catch{}};
  const imageMedia = album => album.media.filter(m=>m.type==='image');
  const coverOverrides = {
    '94_совместные_фото':7,
    '17_прогулка_на_теплоходе':6,
    '96_просто_немного_фото':4,
    '97_маленькая_ксюша':0,
    '95_замочек':0,
    '18_пионы_11_июня':0
  };
  function cover(album,large=false){
    const ind=coverOverrides[album.folder];
    const item=(ind!==undefined && album.media[ind])||album.media.find(m=>m.type==='image')||album.media[0];
    return item ? (large ? item.src : (item.thumb||item.src)) : '';
  }
  const countLabel = a => {
    const n=imageMedia(a).length, v=a.media.filter(m=>m.type==='video').length;
    return `${n} ${ruForm(n,['фотография','фотографии','фотографий'])}${v ? ` · ${v} видео` : ''}`;
  };
  function ruForm(n,forms){ const m=n%100;return m>=11&&m<=14?forms[2]:(n%10===1?forms[0]:n%10>=2&&n%10<=4?forms[1]:forms[2]); }

  // Hero star dust is generated locally; no external resources or tracking.
  const starRoot=$('#stars');
  for(let i=0;i<54;i++){
    const s=document.createElement('span');
    const x=((i*37.19+13.8)%100),y=((i*63.17+5.4)%100),size=(i%7===0?3:1.5);
    Object.assign(s.style,{position:'absolute',left:x+'%',top:y+'%',width:size+'px',height:size+'px',borderRadius:'50%',background:'#fbefd8',opacity:String(.2+(i%5)*.13),boxShadow:i%9===0?'0 0 9px #f5d3c7':''});
    starRoot.append(s);
  }
  const images=A.reduce((n,a)=>n+imageMedia(a).length,0),videos=A.reduce((n,a)=>n+a.media.filter(m=>m.type==='video').length,0);
  $('#metricChapters').textContent=A.length; $('#metricPhotos').textContent=images; $('#metricVideos').textContent=videos;
  $('#allCount').textContent=A.length;

  const featuredNames=['94_совместные_фото','17_прогулка_на_теплоходе','95_замочек','7_день_лего','97_маленькая_ксюша','18_пионы_11_июня'];
  $('#featuredGrid').innerHTML=featuredNames.map((folder,index)=>{
    const a=byFolder(folder);if(!a)return '';
    return `<button type="button" class="featured-card ${index===0?'big':''} reveal" data-album="${escapeHtml(folder)}" aria-label="Открыть: ${escapeHtml(a.title)}">
    <img src="${escapeHtml(cover(a))}" loading="lazy" alt="${escapeHtml(a.title)}"><span class="featured-text"><small>${escapeHtml(a.date)}</small><strong>${escapeHtml(a.title)}</strong><span class="arrow" aria-hidden="true">↗</span></span></button>`;
  }).join('');

  const filmSelection=[['94_совместные_фото',7],['17_прогулка_на_теплоходе',6],['94_совместные_фото',2],['96_просто_немного_фото',3],['94_совместные_фото',8],['94_совместные_фото',0],['96_просто_немного_фото',4],['17_прогулка_на_теплоходе',0],['94_совместные_фото',3],['97_маленькая_ксюша',0],['94_совместные_фото',1]];
  const labels=['наше счастье','вдвоём','тёплый вечер','мы такие мы','любимая история','ещё один момент','самые родные','семь месяцев','просто рядом','маленькая ты','наш мир'];
  $('#filmstrip').innerHTML=filmSelection.map(([folder,ix],i)=>{
    const a=byFolder(folder),m=a?.media[ix];if(!m)return '';
    return `<figure class="film-card" style="--rot:${[-3,2,-1,3,-4,2,0,-2,3,-1,2][i]}deg"><button type="button" data-album="${escapeHtml(folder)}" aria-label="Открыть альбом: ${escapeHtml(a.title)}"><img loading="lazy" src="${escapeHtml(m.thumb||m.src)}" alt="${escapeHtml(a.title)}"></button><figcaption>${escapeHtml(labels[i])} ♡</figcaption></figure>`;
  }).join('');

  function currentAlbums(){return A.filter(a=>filter==='all'||(filter==='favorites'?favorites.has(a.folder):a.category===filter));}
  function renderAlbums(){
    const picked=currentAlbums();
    $('#emptyState').hidden=picked.length!==0;
    $('#albumGrid').innerHTML=picked.map((a,i)=>`<article class="album-item reveal">
      <button type="button" data-album="${escapeHtml(a.folder)}" class="album-photo" aria-label="Открыть альбом ${escapeHtml(a.title)}"><img src="${escapeHtml(cover(a))}" alt="${escapeHtml(a.title)}" loading="lazy">${a.media.every(x=>x.type==='video')?'<span class="video-indicator">▶ ВИДЕО</span>':''}</button>
      <div class="album-meta"><span class="album-date">${escapeHtml(a.date)}</span><button class="favorite-btn ${favorites.has(a.folder)?'saved':''}" type="button" data-favorite="${escapeHtml(a.folder)}" aria-label="${favorites.has(a.folder)?'Удалить из любимого':'Добавить в любимое'}" aria-pressed="${favorites.has(a.folder)}">${favorites.has(a.folder)?'♥':'♡'}</button></div>
      <button class="album-title" type="button" data-album="${escapeHtml(a.folder)}">${escapeHtml(a.title)}</button><div class="album-count">${countLabel(a)}</div>
    </article>`).join('');
    observeReveals();
  }
  $$('.filter').forEach(b=>b.addEventListener('click',()=>{
    filter=b.dataset.filter;
    $$('.filter').forEach(x=>{const a=x===b;x.classList.toggle('active',a);x.setAttribute('aria-pressed',String(a));});
    renderAlbums();
  }));
  document.addEventListener('click',e=>{
    const fav=e.target.closest('[data-favorite]');
    if(fav){const name=fav.dataset.favorite;favorites.has(name)?favorites.delete(name):favorites.add(name);saveFavorites();renderAlbums();return;}
    const albumButton=e.target.closest('[data-album]');
    if(albumButton){openAlbum(albumButton.dataset.album);return;}
    const galleryButton=e.target.closest('[data-photo-index]');
    if(galleryButton){openLightbox(Number(galleryButton.dataset.photoIndex));return;}
    const close=e.target.closest('[data-close]');
    if(close){close.dataset.close==='album'?closeAlbum():closeLightbox();}
  });
  $('#randomMemory').addEventListener('click',()=>{
    const candidates=A.filter(a=>a.category==='story');
    openAlbum(candidates[Math.floor(Math.random()*candidates.length)].folder);
  });

  function openAlbum(folder){
    const a=byFolder(folder); if(!a)return;
    if(!activeAlbum)lastFocus=document.activeElement;
    activeAlbum=a;
    const index=A.indexOf(a)+1;
    const longText=(a.fullDescription||a.description||'').trim();
    const gallery=a.media.map((m,i)=>m.type==='video'
      ?`<div class="modal-video"><video controls playsinline preload="metadata" poster="${escapeHtml(m.thumb||'')}"><source src="${escapeHtml(m.src)}" type="video/mp4">Ваш браузер не поддерживает видео.</video></div>`
      :`<button type="button" data-photo-index="${i}" aria-label="Развернуть фото ${i+1}"><img loading="lazy" src="${escapeHtml(m.thumb||m.src)}" alt="Фото из альбома ${escapeHtml(a.title)}"></button>`).join('');
    $('#modalBody').innerHTML=`<section class="modal-hero"><div class="modal-cover"><img src="${escapeHtml(cover(a,true))}" alt="${escapeHtml(a.title)}"></div>
      <div class="modal-detail"><span class="modal-chapter-number">ГЛАВА ${String(index).padStart(2,'0')} / ${String(A.length).padStart(2,'0')}</span><h2 id="modalTitle">${escapeHtml(a.title)}</h2><div class="modal-date">${escapeHtml(a.date)}</div><p>${escapeHtml(a.description||'')}</p></div></section>
      <div class="modal-story">${longText?`<h3>А помнишь?..</h3><p>${escapeHtml(longText)}</p>`:''}${a.quote?`<blockquote style="border-left:2px solid #c795a2;padding-left:20px;margin:27px 0 0;font:italic 21px Georgia;color:#aa7385">«${escapeHtml(a.quote)}»</blockquote>`:''}</div>
      <div class="modal-photo-count">НАША ФОТОПЛЁНКА · ${countLabel(a)}</div><div class="modal-gallery">${gallery}</div>`;
    $('#modalBody').scrollTop=0;
    const pos=A.indexOf(a);$('#modalPrev').disabled=pos===0;$('#modalNext').disabled=pos===A.length-1;
    $('#albumModal').hidden=false;$('#albumModal').setAttribute('aria-hidden','false');document.body.classList.add('lock-scroll');
    $('.modal-bar .close-circle').focus();
  }
  function closeAlbum(){
    $$('#modalBody video').forEach(v=>v.pause());
    $('#albumModal').hidden=true;$('#albumModal').setAttribute('aria-hidden','true');activeAlbum=null;
    if($('#lightbox').hidden)document.body.classList.remove('lock-scroll');
    lastFocus?.focus?.();
  }
  $('#modalPrev').addEventListener('click',()=>{const i=A.indexOf(activeAlbum);if(i>0)openAlbum(A[i-1].folder);});
  $('#modalNext').addEventListener('click',()=>{const i=A.indexOf(activeAlbum);if(i>=0&&i<A.length-1)openAlbum(A[i+1].folder);});

  function openLightbox(mediaIndex){
    if(!activeAlbum)return;
    lightboxPictures=activeAlbum.media.filter(m=>m.type==='image');
    const selected=activeAlbum.media[mediaIndex];
    lightboxIndex=lightboxPictures.findIndex(m=>m.src===selected.src);
    if(lightboxIndex<0)return;
    $('#lightbox').hidden=false;$('#lightbox').setAttribute('aria-hidden','false');document.body.classList.add('lock-scroll');
    updateLightbox();$('.lightbox-close').focus();
  }
  function updateLightbox(){
    if(!lightboxPictures.length)return;
    const m=lightboxPictures[lightboxIndex];
    $('#lightboxImage').src=m.src;
    $('#lightboxImage').alt=`${activeAlbum?.title||'Наш момент'}, фото ${lightboxIndex+1}`;
    $('#lightboxCounter').textContent=`${lightboxIndex+1} / ${lightboxPictures.length}`;
  }
  function moveLightbox(d){lightboxIndex=(lightboxIndex+d+lightboxPictures.length)%lightboxPictures.length;updateLightbox();}
  function closeLightbox(){
    $('#lightbox').hidden=true;$('#lightbox').setAttribute('aria-hidden','true');$('#lightboxImage').removeAttribute('src');
    if(!activeAlbum)document.body.classList.remove('lock-scroll');
    $('.modal-bar .close-circle').focus();
  }
  $('#lightboxPrev').addEventListener('click',()=>moveLightbox(-1));
  $('#lightboxNext').addEventListener('click',()=>moveLightbox(1));
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(!$('#lightbox').hidden)closeLightbox();else if(!$('#albumModal').hidden)closeAlbum();}
    if(!$('#lightbox').hidden && e.key==='ArrowRight')moveLightbox(1);
    if(!$('#lightbox').hidden && e.key==='ArrowLeft')moveLightbox(-1);
  });

  // The five reasons are adapted from the personal notes in the original archive.
  const reasonTexts=[
    'За то, что ты умеешь быть настоящей. В тебе столько доброты и тепла — даже когда ты этого не замечаешь.',
    'За нашу совершенно особенную ерунду: «Единобожика», смешные идеи и моменты, которые поймём только мы.',
    'За твой смех и за то, что с тобой даже самый обычный день становится приключением.',
    'За твой ум, любопытство и упорство. Я верю в тебя даже тогда, когда ты сама сомневаешься.',
    'За твою улыбку, твои глаза и за то, что для меня ты самая красивая — всегда.'
  ];
  const headings=['За твою доброту','За твой особенный характер','За твой смех','За твой ум','За твою красоту'];
  $('#reasonsGrid').innerHTML=(data.reasons||[]).slice(0,5).map((r,i)=>`<button type="button" class="reason-card reveal" aria-expanded="false"><span class="reason-num">0${i+1}.</span><span class="reason-icon" aria-hidden="true">${escapeHtml(r.icon||'♡')}</span><span class="reason-title">${escapeHtml(headings[i]||r.title)}</span><span class="reason-body">${escapeHtml(reasonTexts[i]||r.text)}</span><span class="reason-more">НАЖМИ, ЧТОБЫ ПРОЧИТАТЬ ↗</span></button>`).join('');
  $$('.reason-card').forEach(card=>card.addEventListener('click',()=>{
    const opened=card.classList.toggle('open');card.setAttribute('aria-expanded',String(opened));
  }));

  const envelope=$('#envelope'),letter=$('#letterContent');
  function confetti(){
    const host=$('#confetti');host.innerHTML='';
    const colors=['#d6a5b1','#f6d6ab','#e9c0a4','#fbf1e3','#baa2cf'];
    for(let i=0;i<78;i++){
      const p=document.createElement('span');p.className='confetti-piece';
      p.style.setProperty('--piece',colors[i%colors.length]);p.style.setProperty('--left',((i*41+17)%100)+'%');
      p.style.setProperty('--delay',((i%12)*.09)+'s');p.style.setProperty('--duration',(3+(i%5)*.5)+'s');
      p.style.setProperty('--turn',((i*48)%360)+'deg');p.style.setProperty('--side',(((i*17)%140)-70)+'px');host.append(p);
    }
    setTimeout(()=>host.innerHTML='',6200);
  }
  envelope.addEventListener('click',()=>{
    const open=letter.hidden;
    envelope.classList.toggle('open',open);envelope.setAttribute('aria-expanded',String(open));
    letter.hidden=!open;
    if(open){confetti();setTimeout(()=>letter.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}),180);}
  });
  $('#letterAgain').addEventListener('click',()=>{
    envelope.classList.remove('open');envelope.setAttribute('aria-expanded','false');letter.hidden=true;
    envelope.scrollIntoView({behavior:'smooth',block:'center'});
  });
  function observeReveals(){
    const els=$$('.reveal:not(.visible)');
    if(!('IntersectionObserver' in window)){els.forEach(el=>el.classList.add('visible'));return;}
    els.forEach(el=>observer.observe(el));
  }
  const observer=('IntersectionObserver' in window)?new IntersectionObserver((entries,ob)=>entries.forEach(x=>{
    if(x.isIntersecting){x.target.classList.add('visible');ob.unobserve(x.target);}
  }),{rootMargin:'0px 0px -30px 0px',threshold:.08}):{observe:el=>el.classList.add('visible')};
  renderAlbums();
  observeReveals();
  function onScroll(){
    const max=document.documentElement.scrollHeight-window.innerHeight;
    $('#readingProgress').style.width=(max>0?Math.min(100,window.scrollY/max*100):0)+'%';
  }
  window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',onScroll,{passive:true});onScroll();
})();
