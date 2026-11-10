/* ===== insight.js v2 — tambahan dashboard (Paket 1 & 2 + revisi). File BARU. =====
   Dipakai oleh tiktok.html, shopee.html, overview.html. Membaca data_insight.json (angka tren/retensi/jaringan)
   dan data yang sudah ada. Tidak mengubah fungsi lama; hanya "membungkus" renderAll (TikTok),
   renderShopeeOverview (Shopee), renderSHTable (tabel Shopee) dan renderCombined (Overview). */
(function(){
'use strict';
var IX=null, LINKS={};
var ST={netMode:0,shLimit:50,shTab:'ringkasan',gmvMode:'day'};
var fmtR=function(v){return 'Rp '+Math.round(v).toLocaleString('id-ID')};
var fmtN=function(v){v=Math.abs(v)<1?0:v;if(Math.abs(v)>=1e9)return(v/1e9).toFixed(2)+' M';if(Math.abs(v)>=1e6)return(v/1e6).toFixed(1)+' jt';if(Math.abs(v)>=1e3)return(v/1e3).toFixed(0)+' rb';return String(Math.round(v))};
var pc=function(a,b){return b?(a-b)/b*100:null};
var pcTxt=function(p,invert){if(p===null||isNaN(p))return '';var up=p>=0,good=invert?!up:up;return '<span class="'+(good?'ix-up':'ix-dn')+'">'+(up?'▲ ':'▼ ')+Math.abs(p).toFixed(1)+'%</span>'};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var med=function(a){if(!a.length)return 0;var s=a.slice().sort(function(x,y){return x-y}),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2};
var quant=function(a,q){var s=a.slice().sort(function(x,y){return x-y}),p=(s.length-1)*q,lo=Math.floor(p),hi=Math.ceil(p);return s[lo]+(s[hi]-s[lo])*(p-lo)};
var C={g:'#2D6A4F',g2:'#52b788',blue:'#3a7bd5',amber:'#f4a425',red:'#e63946',purple:'#7c3aed',gray:'#9ca3af',gray2:'#d1d5db'};

/* ---------- tooltip (muncul saat kursor di atas bar/titik/kolom; di HP: ketuk) ---------- */
var tipEl=null;
function initTip(){
  if(tipEl)return;tipEl=document.createElement('div');tipEl.id='ix-tip';document.body.appendChild(tipEl);
  var show=function(t,x,y){
    var el=t.closest&&t.closest('[data-tip]');if(!el){tipEl.style.display='none';return}
    tipEl.innerHTML=esc(el.getAttribute('data-tip')).replace(/\n/g,'<br>').replace(/\[b\](.*?)\[\/b\]/g,'<b>$1</b>');tipEl.style.display='block';
    var w=tipEl.offsetWidth,h=tipEl.offsetHeight,nx=x+14,ny=y+14;
    if(nx+w>window.innerWidth-8)nx=Math.max(8,x-w-14);if(ny+h>window.innerHeight-8)ny=Math.max(8,y-h-14);
    tipEl.style.left=nx+'px';tipEl.style.top=ny+'px';
  };
  document.addEventListener('mousemove',function(e){show(e.target,e.clientX,e.clientY)});
  document.addEventListener('mouseleave',function(){tipEl.style.display='none'});
  document.addEventListener('touchstart',function(e){var t=e.touches[0];show(document.elementFromPoint(t.clientX,t.clientY)||e.target,t.clientX,t.clientY)},{passive:true});
  document.addEventListener('scroll',function(){tipEl.style.display='none'},{passive:true,capture:true});
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-ixseg]');if(!b)return;var p=b.getAttribute('data-ixseg').split(':');segClick(p[0],p[1])});
}

/* ---------- chart helpers (SVG murni) ---------- */
function niceMax(m){if(m<=0)return 1;var p=Math.pow(10,Math.floor(Math.log10(m))),f=m/p;return (f<=1?1:f<=2?2:f<=5?5:10)*p}
function chartWrap(svg){var m=/viewBox="0 0 (\d+)/.exec(svg);return '<div class="ix-chart">'+svg.replace('<svg ','<svg style="min-width:'+(m?Math.min(+m[1],720):620)+'px" ')+'</div>'}
function hit(x,y,w,h,tip){return '<rect class="ix-hit" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="rgba(120,120,120,0)" data-tip="'+esc(tip)+'"></rect>'}
function xlab(x,H,B,lb){return '<text x="'+x+'" y="'+(H-B+13)+'" font-size="8.5" fill="#6b7280" text-anchor="middle" transform="rotate(-40 '+x+' '+(H-B+13)+')">'+esc(lb)+'</text>'}
function bars(labels,vals,o){
  o=o||{};var ST_=o.step||34,H=o.h||190,L=46,B=34,T=14,W=L+labels.length*ST_+8,pw=H-B-T,mx=niceMax(Math.max.apply(null,vals.concat(o.line||[0])));
  var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(o.title||'grafik')+'">';
  for(var g=0;g<=4;g++){var y=T+pw-pw*g/4;s+='<line x1="'+L+'" x2="'+(W-4)+'" y1="'+y+'" y2="'+y+'" stroke="#eef0f2"/><text x="'+(L-5)+'" y="'+(y+3)+'" font-size="9" fill="#9ca3af" text-anchor="end">'+(o.fmt||fmtN)(mx*g/4)+'</text>'}
  labels.forEach(function(lb,i){
    var bw=o.bw||22,h=pw*vals[i]/mx,x=L+i*ST_+(ST_-bw)/2,y=T+pw-h,col=(o.colors&&o.colors[i])||C.g2;
    s+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+Math.max(h,0)+'" rx="3" fill="'+col+'"'+(o.hl===i?' stroke="#0d2b1a" stroke-width="1.5"':'')+'></rect>';
    s+=xlab(x+bw/2,H,B,lb);
  });
  if(o.line){var pts=o.line.map(function(v,i){return (L+i*ST_+ST_/2)+','+(T+pw-pw*v/mx)}).join(' ');s+='<polyline points="'+pts+'" fill="none" stroke="'+C.amber+'" stroke-width="2"/>';o.line.forEach(function(v,i){s+='<circle cx="'+(L+i*ST_+ST_/2)+'" cy="'+(T+pw-pw*v/mx)+'" r="2.5" fill="'+C.amber+'"/>'})}
  labels.forEach(function(lb,i){s+=hit(L+i*ST_,T,ST_,pw+B-8,o.tips?o.tips[i]:lb+'\n'+(o.fmtFull||fmtR)(vals[i]))});
  return chartWrap(s+'</svg>');
}
function lineChart(labels,vals,o){
  o=o||{};var ST_=o.step||34,H=o.h||150,L=46,B=34,T=14,W=L+labels.length*ST_+8,pw=H-B-T,mn=o.min!=null?o.min:0,mx=o.max!=null?o.max:niceMax(Math.max.apply(null,vals));
  var Y=function(v){return T+pw-pw*(v-mn)/(mx-mn)},X=function(i){return L+i*ST_+ST_/2};
  var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(o.title||'grafik')+'">';
  for(var g=0;g<=4;g++){var y=T+pw-pw*g/4;s+='<line x1="'+L+'" x2="'+(W-4)+'" y1="'+y+'" y2="'+y+'" stroke="#eef0f2"/><text x="'+(L-5)+'" y="'+(y+3)+'" font-size="9" fill="#9ca3af" text-anchor="end">'+(o.fmt||fmtN)(mn+(mx-mn)*g/4)+'</text>'}
  (o.ref||[]).forEach(function(r,ri){var y=Y(r.v),ly=ri%2?y+11:y-3;s+='<line x1="'+L+'" x2="'+(W-4)+'" y1="'+y+'" y2="'+y+'" stroke="'+(r.color||C.gray)+'" stroke-dasharray="4 3"/><text x="'+(W-6)+'" y="'+ly+'" font-size="8.5" fill="'+(r.color||C.gray)+'" text-anchor="end">'+esc(r.label)+'</text>'});
  var seg=[];vals.forEach(function(v,i){if(!(o.hollow&&o.hollow[i]))seg.push(X(i)+','+Y(v))});
  s+='<polyline points="'+seg.join(' ')+'" fill="none" stroke="'+(o.color||C.g)+'" stroke-width="2.2"/>';
  vals.forEach(function(v,i){var hol=o.hollow&&o.hollow[i];s+='<circle cx="'+X(i)+'" cy="'+Y(v)+'" r="3.2" fill="'+(hol?'#fff':(o.hl===i?'#0d2b1a':(o.color||C.g)))+'" stroke="'+(hol?C.gray:(o.color||C.g))+'" stroke-width="'+(hol?1.8:0)+'"/>';s+=xlab(X(i),H,B,labels[i])});
  vals.forEach(function(v,i){s+=hit(L+i*ST_,T,ST_,pw+B-8,o.tips?o.tips[i]:labels[i]+'\n'+(o.fmtFull||fmtN)(v))});
  return chartWrap(s+'</svg>');
}
function stack100(labels,segs,o){
  o=o||{};var ST_=o.step||34,H=o.h||190,L=40,B=34,T=10,W=L+labels.length*ST_+8,pw=H-B-T,fv=o.fmtVal||fmtR;
  var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(o.title||'grafik')+'">';
  for(var g=0;g<=4;g++){var y=T+pw-pw*g/4;s+='<line x1="'+L+'" x2="'+(W-4)+'" y1="'+y+'" y2="'+y+'" stroke="#eef0f2"/><text x="'+(L-5)+'" y="'+(y+3)+'" font-size="9" fill="#9ca3af" text-anchor="end">'+(g*25)+'%</text>'}
  labels.forEach(function(lb,i){
    var tot=segs.reduce(function(a,sg){return a+(sg.vals[i]||0)},0),x=L+i*ST_+(ST_-22)/2,yc=T+pw,tip=lb+(o.tipHead&&o.tipHead[i]?' · '+o.tipHead[i]:'');
    if(tot>0)segs.slice().forEach(function(sg){var v=sg.vals[i]||0,h=pw*v/tot;yc-=h;s+='<rect x="'+x+'" y="'+yc+'" width="22" height="'+h+'" fill="'+sg.color+'"></rect>'});
    else s+='<text x="'+(x+11)+'" y="'+(T+pw/2)+'" font-size="8" fill="#9ca3af" text-anchor="middle">n/a</text>';
    segs.slice().reverse().forEach(function(sg){var v=sg.vals[i]||0;tip+='\n'+sg.name+': '+(tot?(v/tot*100).toFixed(1):'0')+'% ('+fv(v)+')'});
    s+=xlab(x+11,H,B,lb)+hit(L+i*ST_,T,ST_,pw+B-8,tip);
  });
  return chartWrap(s+'</svg>');
}
function legend(items){return '<div class="ix-leg">'+items.map(function(i){return '<span><i style="background:'+i[1]+'"></i>'+esc(i[0])+'</span>'}).join('')+'</div>'}
function seg(id,opts,cur){return '<div class="ix-seg" role="group">'+opts.map(function(o){return '<button type="button" class="'+(o[0]===cur?'on':'')+'" data-ixseg="'+id+':'+o[0]+'">'+esc(o[1])+'</button>'}).join('')+'</div>'}
function box(title,inner,tag,isNew,id){return '<div class="ix-box"'+(id?' id="'+id+'"':'')+'><div class="ix-h">'+(isNew?'<span class="ix-new">BARU</span>':'')+title+(tag?'<span class="ix-tag">'+tag+'</span>':'')+'</div>'+inner+'</div>'}
function ensure(id,ref){var el=document.getElementById(id);if(!el){el=document.createElement('div');el.id=id;if(ref&&ref.parentNode)ref.parentNode.insertBefore(el,ref.nextSibling)}return el}
function colList(cls,title,sub,items,fmt){
  return '<div class="ix-col '+cls+'"><h4><span>'+title+'</span><span>'+items.total+'</span></h4><div class="sub">'+sub+'</div>'+
    (items.list.length?items.list.map(function(c){return '<div class="ix-it"><b title="'+esc(c.name)+'">'+(c.url?'<a class="ix-a" href="'+esc(c.url)+'" target="_blank" rel="noopener noreferrer">'+esc(c.name)+'</a>':esc(c.name))+'</b><span>'+fmt(c)+'</span></div>'}).join(''):'<div class="ix-empty">Tidak ada.</div>')+'</div>'}
function selectTop(arr,sortKey,n){arr=arr.slice().sort(sortKey);return {total:arr.length,list:arr.slice(0,n)}}
var rp=function(v){return fmtN(v)};
var ttUrl=function(u){return u?'https://www.tiktok.com/@'+encodeURIComponent(u):''};

/* ======================= TIKTOK ======================= */
function ttSummary(cfg,o,bench){
  var out=[],days=o.days,gd=o.total_gmv/days;
  if(bench.available&&bench.overview){
    var b=bench.overview,bd=b.total_gmv/(b.days||days),d=pc(gd,bd);
    out.push('GMV <b>'+fmtR(o.total_gmv)+'</b> ('+days+' hari, <b>'+fmtR(gd)+'/hari</b>) '+(d>=0?'naik ':'turun ')+Math.abs(d).toFixed(1)+'% per hari dibanding '+esc(bench.label)+(b.days!==days?' (total GMV tidak sebanding karena jumlah hari berbeda: '+days+' vs '+b.days+' hari)':'')+'.');
    out.push('GMV bersih setelah refund <b>'+fmtR(o.total_gmv-o.refunded)+'</b> (refund '+o.refund_rate+'%, sebelumnya '+b.refund_rate+'%); creator aktif '+o.active_creators+' (sebelumnya '+b.active_creators+').');
    var v=pc(o.total_videos/days,b.total_videos/(b.days||days)),l=pc(o.total_lives/days,b.total_lives/(b.days||days));
    out.push('Aktivitas per hari: video '+o.total_videos+' ('+(v>=0?'+':'')+v.toFixed(0)+'%), sesi LIVE '+o.total_lives+' ('+(l>=0?'+':'')+l.toFixed(0)+'%). AOV '+fmtR(o.avg_aov)+' ('+(pc(o.avg_aov,b.avg_aov)>=0?'+':'')+pc(o.avg_aov,b.avg_aov).toFixed(1)+'%).');
  } else {
    out.push('GMV <b>'+fmtR(o.total_gmv)+'</b> ('+days+' hari, '+fmtR(gd)+'/hari); GMV bersih setelah refund '+fmtR(o.total_gmv-o.refunded)+' (refund '+o.refund_rate+'%); '+o.active_creators+' creator aktif. Periode ini tidak punya pembanding.');
  }
  return out;
}
function ttAct(){
  var cmp=getComparisonData();
  if(!cmp)return '<div class="ix-empty">Periode ini tidak punya pembanding, jadi daftar tindakan tidak bisa dihitung.</div>';
  var A=cmp.filter(function(c){return c.status==='retained'}),
  drop=selectTop(A.filter(function(c){return c.gmv_a>=1e6&&c.gmv_b<=c.gmv_a*0.6}).map(function(c){return {name:c.display||c.username,url:ttUrl(c.username),a:c.gmv_a,b:c.gmv_b,d:c.gmv_b-c.gmv_a}}),function(x,y){return x.d-y.d},8),
  stop=selectTop(A.filter(function(c){return c.videos_a>=2&&c.videos_b===0&&c.gmv_a>=1e6}).map(function(c){return {name:c.display||c.username,url:ttUrl(c.username),a:c.videos_a,g:c.gmv_a,gb:c.gmv_b}}),function(x,y){return y.g-x.g},8),
  neu=selectTop(cmp.filter(function(c){return c.status==='new'&&c.gmv_b>=5e5}).map(function(c){return {name:c.display||c.username,url:ttUrl(c.username),g:c.gmv_b}}),function(x,y){return y.g-x.g},8),
  chn=selectTop(cmp.filter(function(c){return c.status==='churn'&&c.gmv_a>=5e6}).map(function(c){return {name:c.display||c.username,url:ttUrl(c.username),g:c.gmv_a}}),function(x,y){return y.g-x.g},8);
  return '<div class="ix-grid4">'+
   colList('red','🔻 Turun tajam','Retained, GMV sebelumnya ≥ Rp1 jt dan turun ≥ 40%',drop,function(c){return rp(c.a)+' → '+rp(c.b)})+
   colList('amber','⏸️ Berhenti upload video','Sebelumnya ≥2 video, sekarang 0 video (bisa jadi pindah ke LIVE), GMV lalu ≥ Rp1 jt',stop,function(c){return c.a+' video → 0 · '+rp(c.g)+'→'+rp(c.gb)})+
   colList('green','🌱 Baru muncul','Tidak ada GMV di periode pembanding, GMV sekarang ≥ Rp500 rb',neu,function(c){return rp(c.g)})+
   colList('blue','🚪 Creator besar hilang','Ada GMV ≥ Rp5 jt di periode pembanding, nol/tidak aktif sekarang',chn,function(c){return 'sebelumnya '+rp(c.g)})+
  '</div><div class="ix-warn">Ambang batas (Rp1 jt, 40%, Rp500 rb, Rp5 jt) adalah tebakan awal saya, bukan aturan resmi. "Baru muncul" artinya baru ada GMV ≥ Rp100 rb di periode ini, belum tentu baru gabung. Daftar ikut berubah saat kamu ganti Week/Month/MTD.</div>';
}
function ttLinks(){
  if(typeof D==='undefined'||!D)return;
  if(!ttLinks.map){var m={},dup={};Object.keys(D).forEach(function(k){var t=D[k]&&D[k].top;if(!Array.isArray(t))return;t.forEach(function(c){if(c&&c.display&&c.username){if(m[c.display]&&m[c.display]!==c.username)dup[c.display]=1;m[c.display]=c.username}})});Object.keys(dup).forEach(function(k){delete m[k]});ttLinks.map=m}
  document.querySelectorAll('.cc-name').forEach(function(el){
    if(el.getAttribute('data-ixl')||el.children.length)return;var u=ttLinks.map[el.textContent.trim()];if(!u)return;
    el.setAttribute('data-ixl','1');el.innerHTML='<a class="ix-a" href="'+esc(ttUrl(u))+'" target="_blank" rel="noopener noreferrer" title="Buka akun TikTok @'+esc(u)+'">'+esc(el.textContent)+' <span class="ix-ext">↗</span></a>';
  });
}
function ttWeeks(){return IX.tt.filter(function(r){return r.kind!=='month'})}
function ttTrendChart(){
  var T=ttWeeks(),lbl=T.map(function(r){return r.label}),last=T.length-1;
  var day=ST.gmvMode==='day';
  var vals=T.map(function(r){return day?r.gmv_day:r.gmv}),net=T.map(function(r){return day?r.net_day:r.net_gmv});
  var tips=T.map(function(r){return '[b]'+r.label+'[/b] ('+r.days+' hari)\nGMV total: '+fmtR(r.gmv)+'\nGMV per hari: '+fmtR(r.gmv_day)+'\nGMV bersih (setelah refund): '+fmtR(r.net_gmv)+'\nBersih per hari: '+fmtR(r.net_day)+'\nRefund: '+r.refund_rate+'%'});
  return bars(lbl,vals,{hl:last,line:net,tips:tips,title:'GMV TikTok mingguan',fmt:fmtN})+legend([[day?'GMV per hari (batang)':'GMV total periode (batang)',C.g2],[day?'GMV bersih per hari (garis)':'GMV bersih total (garis)',C.amber]]);
}
function ttMonthChart(){
  var T=IX.ttm,lbl=T.map(function(r){return r.label}),last=T.length-1;
  var day=ST.gmvMode==='day';
  var vals=T.map(function(r){return day?r.gmv_day:r.gmv}),net=T.map(function(r){return day?r.net_day:r.net_gmv});
  var tips=T.map(function(r){return '[b]'+r.label+'[/b] (bulan penuh, '+r.days+' hari)\nGMV total: '+fmtR(r.gmv)+'\nGMV per hari: '+fmtR(r.gmv_day)+'\nGMV bersih (setelah refund): '+fmtR(r.net_gmv)+'\nBersih per hari: '+fmtR(r.net_day)+'\nRefund: '+r.refund_rate+'%'});
  return bars(lbl,vals,{step:64,bw:34,hl:last,line:net,tips:tips,title:'GMV TikTok bulanan',fmt:fmtN})+legend([[day?'GMV per hari (batang)':'GMV total bulan (batang)',C.g2],[day?'GMV bersih per hari (garis)':'GMV bersih total (garis)',C.amber]]);
}
function ttRender(){
  if(typeof D==='undefined'||!D||!document.getElementById('page-overview'))return;
  initTip();tipEl.style.display='none';
  var cfg=currentPeriodConfig(),o=periodData(P).overview,bench=getBenchmark(),hero=document.getElementById('hero-strip');
  var sum=ttSummary(cfg,o,bench);
  ensure('ix-tt-sum',hero).innerHTML=box('📝 Ringkasan otomatis — '+esc(cfg.label),'<div class="ix-sum" style="border:none;padding:0;box-shadow:none">'+sum.map(function(t){return '<p>'+t+'</p>'}).join('')+'</div><div style="font-size:10px;color:var(--gray500);margin-top:6px">Disusun otomatis dari angka dashboard (aturan tetap, bukan analisis penyebab). Penyebab naik/turun perlu kamu cek manual.</div>','',true);
  var net=o.total_gmv-o.refunded,nd=net/o.days,b=bench.available&&bench.overview?bench.overview:null,bn=b?(b.total_gmv-b.refunded)/(b.days||o.days):null;
  ensure('ix-tt-net',document.getElementById('ix-tt-sum')).innerHTML='<div class="ix-two">'+
   '<div class="ix-kpi"><div class="l">GMV bersih (setelah refund) <span class="ix-new">BARU</span></div><div class="v">'+fmtR(net)+'</div><div class="s">= GMV '+fmtR(o.total_gmv)+' − refund '+fmtR(o.refunded)+' ('+o.refund_rate+'%)</div></div>'+
   '<div class="ix-kpi"><div class="l">GMV bersih per hari <span class="ix-new">BARU</span></div><div class="v">'+fmtR(nd)+'</div><div class="s">'+(bn?pcTxt(pc(nd,bn))+' vs '+esc(bench.label)+' ('+fmtR(bn)+'/hari)':'tanpa pembanding')+'</div></div></div>';
  ensure('ix-tt-act',document.getElementById('ix-tt-net')).innerHTML=box('🚨 Perlu ditindak — '+esc(cfg.label),ttAct(),'dibanding '+esc(bench.available?bench.label:'-'),true);
  var sn=document.querySelector('.sb-note');if(sn&&D.modes&&D.modes.week)sn.innerHTML=sn.innerHTML.replace(/Update:[^<]*/,'Data sampai: '+esc(D.modes.week.periods[0].label));
  ttPages();ttLinks();
}
function retStats(){
  var rs=IX.lifetime.ret_series,hist=rs.slice(0,-1),cur=rs[rs.length-1],rates=hist.map(function(r){return r.rate}),gr=hist.map(function(r){return r.gmv_rate});
  var same=hist.filter(function(r){return (r.prev_days>cur.days)===(cur.prev_days>cur.days)}).map(function(r){return r.rate});
  return {cur:cur,med:med(rates),q1:quant(rates,.25),q3:quant(rates,.75),min:Math.min.apply(null,rates),max:Math.max.apply(null,rates),gmed:med(gr),same:same,smed:med(same),n:hist.length};
}
function retInsight(s){
  var c=s.cur,cls=c.rate>=s.q3?'tinggi':c.rate<=s.q1?'rendah':'normal',gd=c.gmv_rate-s.gmed,gcls=gd<=-2?'rendah':gd>=2?'tinggi':'normal',netn=c.new-c.churn,out=[];
  var verdict={tinggi:'Retensi jumlah creator TINGGI',normal:'Retensi jumlah creator NORMAL',rendah:'Retensi jumlah creator RENDAH'}[cls];
  out.push('<b>'+verdict+':</b> '+c.rate+'% creator periode lalu masih aktif di '+esc(c.label)+' (riwayatmu '+s.n+' periode: median '+s.med.toFixed(1)+'%, rentang '+s.min.toFixed(1)+'–'+s.max.toFixed(1)+'%; 25% terbawah ≤ '+s.q1.toFixed(1)+'%, 25% teratas ≥ '+s.q3.toFixed(1)+'%).');
  if(c.prev_days>c.days)out.push('Catatan pembanding: periode ini ('+c.days+' hari) mengikuti periode '+c.prev_days+' hari, dan transisi seperti ini memang cenderung lebih rendah. Pembanding yang lebih adil: median transisi sejenis = '+s.smed.toFixed(1)+'% (n='+s.same.length+'), nilai terendahnya '+Math.min.apply(null,s.same).toFixed(1)+'%.');
  out.push('<b>Retensi GMV '+gcls.toUpperCase()+':</b> creator yang bertahan memegang '+c.gmv_rate+'% GMV periode lalu (median '+s.gmed.toFixed(1)+'%). Creator baru '+c.new+' vs hilang '+c.churn+' (selisih '+(netn>=0?'+':'')+netn+').');
  var act;
  if(cls==='rendah'&&gcls!=='rendah')act='Yang hilang kebanyakan creator kecil, GMV-nya nyaris tidak terpengaruh. Jangan panik. Prioritas: aktifkan ulang long-tail yang pernah jual (kirim sampel/brief), dan cek apakah rekrutmen minggu ini cukup menutup yang hilang.';
  else if(cls==='rendah')act='Creator dan GMV sama-sama bocor. Cek daftar "Creator besar hilang" di Overview, hubungi T2/T3 yang berhenti, dan cari penyebab bersama (komisi, stok, produk, perubahan algoritma).';
  else if(cls==='tinggi'&&gcls!=='rendah')act='Basis creator stabil. Fokus pada pertumbuhan: naikkan creator T1 ke T2 lewat target collaboration dan brief produk yang jelas.';
  else if(cls==='tinggi')act='Creator bertahan tapi GMV-nya turun. Masalahnya di produktivitas, bukan kehadiran: periksa konten, produk, harga, dan komisi.';
  else act='Kondisi dalam kisaran biasa. Tidak ada tindakan khusus dari angka ini; lihat panel "Perlu ditindak" untuk nama-nama spesifik.';
  out.push('<b>Artinya / tindakan:</b> '+act);
  return {cls:cls,html:out.map(function(t){return '<p>'+t+'</p>'}).join('')};
}
function ttPages(){
  if(!IX)return;
  var TA=IX.tt,T=ttWeeks(),M=IX.ttm,lbl=T.map(function(r){return r.label}),mlbl=M.map(function(r){return r.label}),last=T.length-1;
  var pageT=document.getElementById('page-trend');
  if(pageT&&!pageT.dataset.done){
    pageT.dataset.done='1';
    var mixT=function(r){var m=r.mix;return m.live+m.video+m.card},colT=function(r){var c=r.collab;return c.target+c.open};
    var rows=TA.map(function(r,i){var m=r.mix,cb=r.collab,tot=mixT(r),ct=colT(r);
      return '<tr'+(i===TA.length-1?' class="cur"':'')+'><td>'+esc(r.label)+(r.kind==='month'?'*':'')+'</td><td>'+r.days+'</td><td>'+fmtN(r.gmv)+'</td><td>'+fmtN(r.gmv_day)+'</td><td>'+fmtN(r.net_day)+'</td><td>'+r.active+(r.kind==='month'?'*':'')+'</td><td>'+r.refund_rate+'%</td><td>'+(m.live/tot*100).toFixed(1)+'%</td><td>'+(m.video/tot*100).toFixed(1)+'%</td><td>'+(m.card/tot*100).toFixed(1)+'%</td><td>'+(cb.target/ct*100).toFixed(1)+'%</td><td>'+(cb.open/ct*100).toFixed(1)+'%</td></tr>'}).join('');
    var mixTip=T.map(function(r){return r.days+' hari'});
    pageT.innerHTML='<div class="ix-pgtitle">📉 Tren Jangka Panjang <span class="ix-new">BARU</span></div><div class="ix-pgsub">TikTok Shop, Mei → November W1 2026. Arahkan kursor (di HP: ketuk) ke batang, titik, atau kolom untuk melihat nilai pastinya. Data Mei–Oktober tersedia sebagai bulan penuh, sehingga ditampilkan di grafik bulanan terpisah. Grafik mingguan mulai Juli W1 (7 hari; W4 Juli/Agustus/Oktober = 10 hari, Sep W4 = 9 hari).</div>'+
     box('GMV TikTok mingguan (Jul W1 → sekarang)','<div class="ix-ctl">'+seg('gmvMode',[['day','Per hari (rata-rata)'],['total','Total periode']],ST.gmvMode)+'</div><div id="ix-tt-gmvchart">'+ttTrendChart()+'</div><div class="ix-warn"><b>Cara hitung "per hari":</b> GMV total periode ÷ jumlah hari periode. Ini rata-rata harian dari total; kita tidak punya data harian, jadi variasi antar hari tidak terlihat. Mode "Total periode" menyesatkan untuk membandingkan minggu: W4 Juli, Agustus, dan Oktober berisi 10 hari sehingga batangnya tampak melonjak padahal harian relatif sama.</div>','Rp',false)+
     box('GMV TikTok bulanan (Mei → Oktober)','<div id="ix-tt-gmvmonth">'+ttMonthChart()+'</div><div class="ix-warn">Mengikuti pilihan "Per hari / Total periode" di atas. Data Mei dan Juni hanya tersedia sebagai total bulan, jadi dipisah dari grafik mingguan. Jul–Okt di sini adalah penjumlahan bulan penuh dan bisa dibandingkan dengan Mei–Jun. Hitung "per hari" = total bulan ÷ 30/31 hari.</div>','Rp',false)+
     '<div class="ix-two">'+box('Creator aktif — mingguan',lineChart(lbl,T.map(function(r){return r.active}),{step:18,hl:last,color:C.blue,fmt:function(v){return Math.round(v)},fmtFull:function(v){return v+' creator'},tips:T.map(function(r){return '[b]'+r.label+'[/b] ('+r.days+' hari)\nCreator aktif: '+r.active+' creator'})}),'GMV ≥ Rp100 rb')+
     box('Creator aktif — bulanan',bars(mlbl,M.map(function(r){return r.active}),{step:40,bw:24,h:150,hl:M.length-1,fmt:function(v){return Math.round(v)},fmtFull:function(v){return v+' creator'},tips:M.map(function(r){return '[b]'+r.label+'[/b] (bulan penuh)\nCreator aktif: '+r.active+' creator'}),title:'Creator aktif bulanan'}),'GMV ≥ Rp100 rb')+'</div>'+
     '<div class="ix-warn" style="margin-top:-6px;margin-bottom:18px"><b>Creator aktif mingguan dan bulanan tidak boleh dibandingkan.</b> Ini hitungan creator unik, bukan angka yang bisa dirata-rata. Creator unik sebulan (776 di Mei) pasti lebih banyak dari creator unik seminggu (277 di Jul W1). Membaginya dengan 4 merusak data (creator yang aktif 3 minggu terhitung 3×). Bandingkan bulan dengan bulan, minggu dengan minggu.</div>'+
     '<div class="ix-two">'+box('Refund rate — mingguan',lineChart(lbl,T.map(function(r){return r.refund_rate}),{step:18,hl:last,color:C.red,min:0,max:16,fmt:function(v){return v.toFixed(0)+'%'},fmtFull:function(v){return v+'%'},tips:T.map(function(r){return '[b]'+r.label+'[/b]\nRefund rate: '+r.refund_rate+'%\nRefund: '+fmtR(r.refunded)+'\nGMV: '+fmtR(r.gmv)})}),'% dari GMV')+
     box('Refund rate — bulanan',lineChart(mlbl,M.map(function(r){return r.refund_rate}),{step:40,hl:M.length-1,color:C.red,min:0,max:16,fmt:function(v){return v.toFixed(0)+'%'},fmtFull:function(v){return v+'%'},tips:M.map(function(r){return '[b]'+r.label+'[/b] (bulan penuh)\nRefund rate: '+r.refund_rate+'%\nRefund: '+fmtR(r.refunded)+'\nGMV: '+fmtR(r.gmv)})}),'% dari GMV; rasio aman dibandingkan lintas periode')+'</div>'+
     box('Campuran sumber GMV: video vs LIVE vs product card (mingguan)',stack100(lbl,[{name:'LIVE',color:C.purple,vals:T.map(function(r){return r.mix.live})},{name:'Video',color:C.blue,vals:T.map(function(r){return r.mix.video})},{name:'Product card',color:C.amber,vals:T.map(function(r){return r.mix.card})}],{title:'mix',tipHead:mixTip})+legend([['LIVE',C.purple],['Video (shoppable)',C.blue],['Product card',C.amber]])+'<div class="ix-warn">Dihitung dari file mentah tiap periode dan dicocokkan dengan total GMV dashboard. Persentase aman dibandingkan lintas panjang periode. Mei dan Juni ada di tabel data di bawah.</div>','% dari GMV',true)+
     box('Kolaborasi Target vs Open',stack100(lbl,[{name:'Target',color:C.g,vals:T.map(function(r){return r.collab.target})},{name:'Open',color:C.g2,vals:T.map(function(r){return r.collab.open})}],{title:'collab',tipHead:mixTip})+legend([['Target collaboration (creator yang kamu tunjuk)',C.g],['Open collaboration (creator mana saja)',C.g2]])+'<div class="ix-warn">Target + Open berselisih &lt; 0,2% dari total GMV (sisanya tidak terklasifikasi oleh TikTok). Ini kolom GMV, bukan jumlah creator.</div>','% dari GMV',true)+
     box('Tabel data (untuk dicek)','<div class="ix-scroll"><table class="ix-tbl"><thead><tr><th>Periode</th><th>Hari</th><th>GMV</th><th>GMV/hari</th><th>Bersih/hari</th><th>Aktif</th><th>Refund</th><th>LIVE</th><th>Video</th><th>Card</th><th>Target</th><th>Open</th></tr></thead><tbody>'+rows+'</tbody></table></div>','');
  }
  var pageR=document.getElementById('page-retensi');
  if(pageR&&!pageR.dataset.done){
    pageR.dataset.done='1';var L=IX.lifetime,c=L.current,v=L.validated_13w,mxh=Math.max.apply(null,L.hist.map(function(h){return h.count})),gs=L.gmv_share,rs=L.ret_series,st=retStats(),ins=retInsight(st);
    var hist=L.hist.map(function(h){return '<div class="ix-bar"><div class="n">'+esc(h.label)+'</div><div class="t"><i style="width:'+(h.count/mxh*100)+'%"></i></div><div class="c">'+h.count+' creator ('+(h.count/c.unique*100).toFixed(1)+'%)</div></div>'}).join('');
    var coh=L.cohorts.map(function(k){return '<tr><td>'+esc(k.label)+'</td><td>'+k.new+'</td><td>'+k.still_active+'</td><td>'+(k.new?(k.still_active/k.new*100).toFixed(0)+'%':'—')+'</td></tr>'}).join('');
    var rl=rs.map(function(r){return r.label}),badge={tinggi:'ix-up',normal:'',rendah:'ix-dn'}[ins.cls];
    var rtip=rs.map(function(r){return '[b]'+r.label+'[/b] ('+r.days+' hari, setelah periode '+r.prev_days+' hari)\nRetensi creator: '+r.rate+'% (dari '+r.prev_active+' creator)\nRetensi GMV: '+r.gmv_rate+'%\nCreator baru: '+r.new+' · hilang: '+r.churn});
    pageR.innerHTML='<div class="ix-pgtitle">🔁 Retensi — Umur Hidup Creator <span class="ix-new">BARU</span></div><div class="ix-pgsub">Berapa lama creator bertahan aktif (GMV ≥ Rp100 rb per periode laporan). Dihitung dari '+c.weeks+' periode mingguan: '+esc(L.periods[0])+' → '+esc(L.periods[L.periods.length-1])+'. "Minggu" di sini = periode laporan (ada yang 9–10 hari).</div>'+
     '<div class="ix-tiles"><div class="ix-kpi"><div class="l">Creator unik pernah aktif</div><div class="v">'+c.unique.toLocaleString('id-ID')+'</div><div class="s">sejak '+esc(L.periods[0])+'</div></div>'+
     '<div class="ix-kpi"><div class="l">Aktif di periode terakhir</div><div class="v">'+c.active_last+'</div><div class="s">'+(c.active_last/c.unique*100).toFixed(1)+'% dari semua yang pernah aktif</div></div>'+
     '<div class="ix-kpi"><div class="l">Hanya 1 minggu lalu hilang</div><div class="v">'+c.one_week_pct+'%</div><div class="s">'+c.one_week+' creator · median umur = '+c.median+' minggu</div></div></div>'+
     box('Retensi minggu ke minggu: '+esc(rs[rs.length-1].label)+' <span class="'+badge+'" style="font-size:12px">('+ins.cls+')</span>',lineChart(rl,rs.map(function(r){return r.rate}),{step:34,hl:rs.length-1,color:C.blue,min:40,max:80,fmt:function(v){return v.toFixed(0)+'%'},fmtFull:function(v){return v+'%'},tips:rtip,ref:[{v:st.med,label:'median '+st.med.toFixed(1)+'%',color:C.amber},{v:st.q1,label:'batas bawah '+st.q1.toFixed(1)+'%',color:C.red}]})+'<div class="ix-sum" style="padding:0;border:none;box-shadow:none;margin-top:8px">'+ins.html+'</div>','% creator periode lalu yang masih aktif',true)+
     box('Acuan: baseline internal dan eksternal','<p style="font-size:12.5px"><b>Baseline yang bisa dipercaya adalah riwayatmu sendiri</b> (garis putus-putus di grafik): median '+st.med.toFixed(1)+'% per periode, retensi GMV median '+st.gmed.toFixed(1)+'%. Status "tinggi/normal/rendah" dihitung dari kuartil riwayat itu (≥ '+st.q3.toFixed(1)+'% tinggi, ≤ '+st.q1.toFixed(1)+'% rendah). Ini ambang yang saya turunkan dari datamu, bukan standar industri.</p>'+
     '<p style="font-size:12.5px"><b>Acuan eksternal terbatas dan lemah (menebak sebagai patokan).</b> Saya tidak menemukan benchmark retensi creator khusus TikTok Shop, Shopee, atau kategori kebun/pertanian. Yang ada hanya blog vendor program afiliasi umum: <a class="ix-a" href="https://refgrow.com/blog/affiliate-program-benchmarks-2026" target="_blank" rel="noopener noreferrer">Refgrow</a> menyebut rata-rata afiliasi yang masih aktif setelah 6 bulan 20–30% (program terbaik 40–55%) dan 30–50% afiliasi tidak pernah menghasilkan; <a class="ix-a" href="https://growsurf.com/statistics/affiliate-program-benchmarks/" target="_blank" rel="noopener noreferrer">GrowSurf</a> mengutip Forrester: churn afiliasi rata-rata 30% per tahun (tanpa penjelasan vertikal). Sumbernya tidak spesifik dan definisinya beda dengan milikmu.</p>'+
     '<p style="font-size:12.5px">Perbandingan kasar: dari '+L.cohorts[0].new+' creator yang sudah aktif di '+esc(L.cohorts[0].label)+', '+L.cohorts[0].still_active+' ('+(L.cohorts[0].still_active/L.cohorts[0].new*100).toFixed(0)+'%) masih aktif ~4 bulan kemudian. Itu tampak sejajar atau lebih baik dari rata-rata umum, tetapi tidak apple-to-apple: kelompok kamu hanya creator yang sudah menghasilkan ≥ Rp100 rb, sedangkan angka vendor menghitung semua yang mendaftar.</p>','',false)+
     box('Sebaran umur hidup',hist,'jumlah creator')+
     box('Siapa penyumbang GMV? (berdasarkan umur hidup)','<div class="ix-bar"><div class="n">1 minggu</div><div class="t"><i style="width:'+gs.one_week+'%"></i></div><div class="c">'+gs.one_week+'% dari total GMV · rata-rata '+fmtN(gs.avg_week.one_week)+'/minggu aktif</div></div><div class="ix-bar"><div class="n">2–3 minggu</div><div class="t"><i style="width:'+gs.w2_3+'%"></i></div><div class="c">'+gs.w2_3+'% · '+fmtN(gs.avg_week.w2_3)+'/mgg</div></div><div class="ix-bar"><div class="n">4–7 minggu</div><div class="t"><i style="width:'+gs.w4_7+'%"></i></div><div class="c">'+gs.w4_7+'% · '+fmtN(gs.avg_week.w4_7)+'/mgg</div></div><div class="ix-bar"><div class="n">8+ minggu</div><div class="t"><i style="width:'+gs.w8p+'%"></i></div><div class="c">'+gs.w8p+'% · '+fmtN(gs.avg_week.w8p)+'/mgg</div></div><div class="ix-warn">'+c.ge8+' creator yang bertahan ≥8 periode ('+(c.ge8/c.unique*100).toFixed(0)+'% dari semua) menghasilkan ~'+gs.w8p+'% GMV. Hati-hati membacanya: sebagian angka ini mekanis, karena creator yang bertahan lama punya lebih banyak minggu untuk menjual. Pembanding yang lebih adil: rata-rata GMV per minggu aktif (angka kanan). Creator yang baru muncul di periode terakhir otomatis terhitung "1 minggu" dan belum tentu hilang.</div>','% dari total GMV Jul W1 → Nov W1',true)+
     box('Cohort: creator baru tiap periode & berapa yang masih aktif sekarang','<div class="ix-scroll"><table class="ix-tbl"><thead><tr><th>Pertama kali aktif</th><th>Creator baru</th><th>Masih aktif '+esc(L.periods[L.periods.length-1])+'</th><th>%</th></tr></thead><tbody>'+coh+'</tbody></table></div><div class="ix-warn">Baris Jul W1 = semua creator yang sudah aktif saat data mulai (bukan benar-benar baru).</div>','')+
     '<div class="ix-warn">Validasi: untuk 13 periode (Jul W1 → Okt W1) hasilnya <b>'+v.unique+'</b> creator unik, <b>'+v.active_last+'</b> aktif, <b>'+v.one_week_pct+'%</b> hanya 1 minggu, median '+v.median+' minggu, sama dengan analisis kamu. Selisih kecil: 1-minggu = '+v.one_week+' (angkamu 605). Versi di atas sudah ditambah Okt W2–Nov W1.</div>';
  }
}

/* ======================= SHOPEE ======================= */
function shObjs(k){var m={};shCreatorObjects(k).forEach(function(o){m[o.username]=o});return m}
function netMap(){var m={};((IX&&IX.net&&IX.net.accounts)||[]).forEach(function(a){m[a.username]=a});return m}
function isNet(o){if(o.is_network)return true;var a=netMap()[o.username];if(!a)return false;return (a.level==='likely'&&ST.netMode>=1)||(a.level==='guess'&&ST.netMode>=2)}
var SH_TABS=[['ringkasan','📊','Ringkasan'],['tindak','🚨','Perlu ditindak'],['creator','👤','Creator'],['channel','📡','Channel'],['jaringan','🕸️','Akun jaringan'],['tren','📉','Tren']];
function shTabOf(id){return {'sh-hero':'ringkasan','ix-sh-sum':'ringkasan','ix-sh-kpi':'ringkasan','sh-flags':'ringkasan','sh-trend-row':'ringkasan','ix-sh-act':'tindak','ix-sh-top':'creator','ix-sh-table':'creator','sh-channel-panel':'channel','ix-sh-net':'jaringan','ix-sh-trend':'tren'}[id]}
function shApplyTab(){
  var tb=document.querySelector('#sh-tbody'),tableRow=tb?tb.closest('.panel-row'):null;if(tableRow&&!tableRow.id)tableRow.id='ix-sh-table';
  ['sh-hero','ix-sh-sum','ix-sh-kpi','sh-flags','sh-trend-row','ix-sh-act','ix-sh-top','ix-sh-table','sh-channel-panel','ix-sh-net','ix-sh-trend'].forEach(function(id){var el=document.getElementById(id);if(!el)return;if(shTabOf(id)===ST.shTab){el.hidden=false;if(id==='sh-trend-row'&&el.style.display==='none')el.hidden=true}else el.hidden=true});
  document.querySelectorAll('.sb-nav .nav-btn[data-shtab]').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-shtab')===ST.shTab)});
}
function shNav(){
  var nav=document.querySelector('.sb-nav');if(!nav||nav.getAttribute('data-ix'))return;nav.setAttribute('data-ix','1');
  nav.innerHTML='<div class="sb-grp">Dashboard</div>'+SH_TABS.map(function(t){return '<button class="nav-btn" data-shtab="'+t[0]+'" onclick="ixShTab(\''+t[0]+'\')"><span class="nav-ic">'+t[1]+'</span>'+t[2]+'</button>'}).join('');
}
window.ixShTab=function(t){ST.shTab=t;shApplyTab();window.scrollTo(0,0)};
function shRender(){
  if(typeof SHD==='undefined'||!SHD)return;
  initTip();shNav();
  var cfg=shCurrentPeriodConfig(),Pd=SHD.periods[SHP],ov=Pd.overview,hero=document.getElementById('sh-hero'),bk=cfg.hasComparison?cfg.prevKey:null,B=bk?SHD.periods[bk]:null;
  var cur=shObjs(SHP),arr=Object.keys(cur).map(function(k){return cur[k]}).filter(function(o){return o.gmv>0});
  var gd=ov.total_gmv/ov.days,bd=B?B.overview.total_gmv/B.overview.days:null;
  var netw=arr.filter(isNet),ng=netw.reduce(function(a,o){return a+o.gmv},0),tg=arr.reduce(function(a,o){return a+o.gmv},0),real=tg-ng;
  var nb=arr.reduce(function(a,o){return a+(o.new_buyers||0)},0),tb=arr.reduce(function(a,o){return a+(o.buyers||0)},0);
  var bArr=B?shCreatorObjects(bk).filter(function(o){return o.gmv>0}):null,bng=bArr?bArr.filter(isNet).reduce(function(a,o){return a+o.gmv},0):0,btg=bArr?bArr.reduce(function(a,o){return a+o.gmv},0):0;
  var bnb=bArr?bArr.reduce(function(a,o){return a+(o.new_buyers||0)},0):0,btb=bArr?bArr.reduce(function(a,o){return a+(o.buyers||0)},0):0;
  var modeTxt=ST.netMode===0?'akun terkonfirmasi':ST.netMode===1?'terkonfirmasi + kemungkinan besar':'terkonfirmasi + kemungkinan besar + menebak';
  var s=[];
  s.push('GMV <b>'+fmtR(ov.total_gmv)+'</b> ('+ov.days+' hari, <b>'+fmtR(gd)+'/hari</b>)'+(bd?' '+(gd>=bd?'naik ':'turun ')+Math.abs(pc(gd,bd)).toFixed(1)+'% per hari dibanding '+esc(cfg.prevLabel):'')+'; creator aktif '+ov.active_creators+(B?' (sebelumnya '+B.overview.active_creators+')':'')+'.');
  s.push('Akun jaringan ('+modeTxt+') menyumbang <b>'+(tg?(ng/tg*100).toFixed(1):0)+'%</b> GMV ('+fmtR(ng)+'); GMV creator sebenarnya <b>'+fmtR(real)+'</b>.');
  s.push('Pembeli baru ≈ <b>'+(tb?(nb/tb*100).toFixed(1):0)+'%</b> dari total pembeli per creator'+(btb?' (sebelumnya '+(bnb/btb*100).toFixed(1)+'%)':'')+'. Perkiraan kasar: pembeli yang sama lewat dua creator terhitung dua kali.');
  ensure('ix-sh-sum',hero).innerHTML=box('📝 Ringkasan otomatis — '+esc(cfg.label),'<div style="padding:0">'+s.map(function(t){return '<p style="font-size:13px;line-height:1.65;margin:0 0 4px">'+t+'</p>'}).join('')+'</div><div style="font-size:10px;color:var(--gray500);margin-top:6px">Disusun otomatis dari angka dashboard (aturan tetap, bukan analisis penyebab).</div>','',true);
  ensure('ix-sh-kpi',document.getElementById('ix-sh-sum')).innerHTML='<div class="ix-two">'+
   '<div class="ix-kpi"><div class="l">GMV per hari <span class="ix-new">BARU</span></div><div class="v">'+fmtR(gd)+'</div><div class="s">'+(bd?pcTxt(pc(gd,bd))+' vs '+esc(cfg.prevLabel)+' ('+fmtR(bd)+'/hari)':'tanpa pembanding')+'</div></div>'+
   '<div class="ix-kpi na"><div class="l">GMV bersih (setelah refund)</div><div class="v">Tidak tersedia</div><div class="s">Laporan Shopee Affiliate tidak memuat data refund/pembatalan. Angka GMV Shopee = GMV kotor.</div></div></div>'+
   '<div class="ix-two"><div class="ix-kpi"><div class="l">GMV creator sebenarnya <span class="ix-new">BARU</span></div><div class="v">'+fmtR(real)+'</div><div class="s">Total '+fmtR(tg)+' − akun jaringan '+fmtR(ng)+' ('+(tg?(ng/tg*100).toFixed(1):0)+'%, '+modeTxt+'). Rincian dan pengaturan ada di menu <a href="#" class="ix-a" onclick="ixShTab(\'jaringan\');return false">Akun jaringan</a>.</div></div>'+
   '<div class="ix-kpi"><div class="l">Pembeli baru vs berulang <span class="ix-new">BARU</span></div><div class="v">'+(tb?(nb/tb*100).toFixed(1):0)+'% baru</div><div class="s">'+N(nb)+' baru dari '+N(tb)+' pembeli (jumlah per creator). Sisanya ('+(tb?((tb-nb)/tb*100).toFixed(1):0)+'%) pembeli lama. '+(btb?'Sebelumnya: '+(bnb/btb*100).toFixed(1)+'% baru.':'')+'</div></div></div>';
  var act='<div class="ix-empty">Periode ini tidak punya pembanding.</div>';
  if(B){
    var prev=shObjs(bk),pArr=Object.keys(prev).map(function(k){return prev[k]}).filter(function(o){return o.gmv>0&&!isNet(o)});
    var ret=arr.filter(function(o){return !isNet(o)&&prev[o.username]&&prev[o.username].gmv>0});
    var nm=function(o){return o.nickname||o.username};
    var drop=selectTop(ret.filter(function(o){var a=prev[o.username].gmv;return a>=1e6&&o.gmv<=a*0.6}).map(function(o){return {name:nm(o),a:prev[o.username].gmv,b:o.gmv,d:o.gmv-prev[o.username].gmv}}),function(x,y){return x.d-y.d},8);
    var up=selectTop(ret.filter(function(o){var a=prev[o.username].gmv;return a>=5e5&&o.gmv>=a*1.5}).map(function(o){return {name:nm(o),a:prev[o.username].gmv,b:o.gmv,d:o.gmv-prev[o.username].gmv}}),function(x,y){return y.d-x.d},8);
    var neu=selectTop(arr.filter(function(o){return !isNet(o)&&o.gmv>=5e5&&!(prev[o.username]&&prev[o.username].gmv>0)}).map(function(o){return {name:nm(o),g:o.gmv}}),function(x,y){return y.g-x.g},8);
    var chn=selectTop(pArr.filter(function(o){return o.gmv>=3e6&&!(cur[o.username]&&cur[o.username].gmv>0)}).map(function(o){return {name:nm(o),g:o.gmv}}),function(x,y){return y.g-x.g},8);
    act='<div class="ix-grid4">'+colList('red','🔻 Turun tajam','Retained, GMV sebelumnya ≥ Rp1 jt dan turun ≥ 40%',drop,function(c){return rp(c.a)+' → '+rp(c.b)})+
      colList('green','🚀 Naik kencang','Retained, GMV sebelumnya ≥ Rp500 rb dan naik ≥ 50%',up,function(c){return rp(c.a)+' → '+rp(c.b)})+
      colList('amber','🌱 Baru muncul','Tanpa GMV di periode pembanding, GMV sekarang ≥ Rp500 rb',neu,function(c){return rp(c.g)})+
      colList('blue','🚪 Creator besar hilang','GMV ≥ Rp3 jt di pembanding, nol sekarang',chn,function(c){return 'sebelumnya '+rp(c.g)})+'</div><div class="ix-warn">Akun jaringan tidak dihitung di daftar ini. Ambang batas adalah tebakan awal saya. Data Shopee tidak punya jumlah video/postingan, jadi "berhenti posting" tidak bisa dideteksi, dan tidak ada handle sosial media sehingga nama tidak bisa ditautkan ke akun.</div>';
  }
  ensure('ix-sh-act',document.getElementById('ix-sh-kpi')).innerHTML=box('🚨 Perlu ditindak & Watchlist — '+esc(cfg.label),act,'dibanding '+esc(cfg.hasComparison?cfg.prevLabel:'-'),true);
  var top=arr.filter(function(o){return !isNet(o)}).sort(function(a,b){return b.gmv-a.gmv}).slice(0,10);
  var topH='<div class="ix-scroll"><table class="ix-tbl"><thead><tr><th>#</th><th style="text-align:left">Creator</th><th>Tier</th><th>GMV</th><th>Orders</th><th>Komisi</th><th>ROI</th><th>Pembeli baru</th><th>Channel utama</th></tr></thead><tbody>'+top.map(function(o,i){return '<tr><td>'+(i+1)+'</td><td style="text-align:left">'+esc(o.nickname||o.username)+' '+shLinks(o)+'</td><td>'+esc(o.tier)+'</td><td>'+fmtN(o.gmv)+'</td><td>'+o.orders+'</td><td>'+fmtN(o.commission)+'</td><td>'+o.roi+'x</td><td>'+(o.buyers?Math.round((o.new_buyers||0)/o.buyers*100):0)+'%</td><td>'+esc(chName(o.channels&&o.channels[0]))+'</td></tr>'}).join('')+'</tbody></table></div>';
  ensure('ix-sh-top',document.getElementById('ix-sh-act')).innerHTML=box('🏅 Top 10 Creator (tanpa akun jaringan)',topH,'Shopee',true);
  shNet(arr,cur,ng,tg,bng,btg);
  shTrend();shApplyTab();shTablePass();
}
function shNet(arr,cur,ng,tg,bng,btg){
  var A=(IX&&IX.net&&IX.net.accounts)||[],lv={confirmed:'Terkonfirmasi (sudah ditandai)',likely:'Kemungkinan besar',guess:'Menebak'},cl={confirmed:'ix-lv-c',likely:'ix-lv-l',guess:'ix-lv-g'};
  var sum={conf:0,likely:0,guess:0};arr.forEach(function(o){var a=netMap()[o.username];if(o.is_network)sum.conf+=o.gmv;else if(a&&a.level==='likely')sum.likely+=o.gmv;else if(a&&a.level==='guess')sum.guess+=o.gmv});
  var pct=function(v){return tg?(v/tg*100).toFixed(1)+'%':'-'};
  var rows=A.map(function(a){var c=cur[a.username],g=c?c.gmv:0;return '<tr><td style="text-align:left"><b>'+esc(a.username)+'</b><br><span style="color:var(--gray500);font-size:11px">'+esc(a.nickname)+'</span></td><td style="text-align:left"><span class="ix-lv '+cl[a.level]+'">'+lv[a.level]+'</span></td><td>'+a.weeks+'/'+(IX.net.weeks_total)+'</td><td>'+fmtN(a.gmv_total)+'</td><td>'+(g?fmtN(g):'—')+'</td><td style="text-align:left;white-space:normal;min-width:240px">'+esc(a.reason)+'</td></tr>'}).join('');
  var body='<div class="ix-two"><div class="ix-kpi"><div class="l">Hanya terkonfirmasi</div><div class="v">'+pct(sum.conf)+'</div><div class="s">'+fmtR(sum.conf)+' · yang dipakai dashboard lama</div></div>'+
    '<div class="ix-kpi"><div class="l">+ Kemungkinan besar</div><div class="v">'+pct(sum.conf+sum.likely)+'</div><div class="s">+ '+fmtR(sum.likely)+' dari '+A.filter(function(a){return a.level==='likely'}).length+' akun</div></div></div>'+
    '<div class="ix-two"><div class="ix-kpi"><div class="l">+ Menebak</div><div class="v">'+pct(sum.conf+sum.likely+sum.guess)+'</div><div class="s">+ '+fmtR(sum.guess)+' dari '+A.filter(function(a){return a.level==='guess'}).length+' akun</div></div>'+
    '<div class="ix-kpi"><div class="l">Pengaturan perhitungan</div><div class="s" style="margin:6px 0">Pilih akun mana yang dibuang dari "GMV creator sebenarnya", Top 10, dan daftar Perlu ditindak:</div>'+seg('netMode',[['0','Terkonfirmasi'],['1','+ Kemungkinan besar'],['2','+ Menebak']],String(ST.netMode))+'</div></div>'+
    '<div class="ix-scroll"><table class="ix-tbl"><thead><tr><th style="text-align:left">Akun</th><th style="text-align:left">Status</th><th>Aktif (periode)</th><th>GMV total*</th><th>GMV periode ini</th><th style="text-align:left">Dasar penilaian</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<div class="ix-warn">*GMV total Jun W1 → Nov W1. <b>Cara saya menilai:</b> (1) mencari akun yang aktif hampir di semua periode dan namanya jelas perusahaan/jaringan iklan, bukan nama orang atau toko; (2) mencocokkan nama dengan pencarian web: Involve Asia terbukti jaringan afiliasi yang menjalankan program Shopee (<a class="ix-a" href="https://blog.involve.asia/affiliate-marketing/shopee-launches-affiliate-program-involveasia" target="_blank" rel="noopener noreferrer">blog Involve Asia</a>). Opera, Flat Ads, Interspace, inFlux, dan Baidu saya nilai dari nama akun dan pengetahuan umum saya tentang perusahaan itu (kemungkinan besar, belum diverifikasi dari sumber luar). Kelompok "Menebak" hanya berdasarkan pola. <b>Yang tidak bisa saya lakukan:</b> data Shopee kamu tidak memuat profil akun, dan saya tidak punya akses ke data toko lain, jadi pencocokan lintas toko/brand tidak mungkin dari sini. Cara paling pasti: buka profil akun di Shopee Affiliate dan lihat apakah itu perusahaan, lalu beri tahu saya mana yang benar.</div>';
  ensure('ix-sh-net',document.getElementById('ix-sh-top')).innerHTML=box('🕸️ Akun jaringan — validasi ulang',body,'Shopee',true);
}
function shLinks(o){
  var L=LINKS[o.username]||{},ch=o.channels||[],out=[],mk=function(ic,name,real,guess){return real?'<a class="ix-ln" href="'+esc(real)+'" target="_blank" rel="noopener noreferrer" title="'+name+' (tautan terverifikasi)" onclick="event.stopPropagation()">'+ic+'</a>':'<a class="ix-ln ix-guess" href="'+esc(guess)+'" target="_blank" rel="noopener noreferrer" title="'+name+': TEBAKAN dari username Shopee, belum tentu akun yang sama" onclick="event.stopPropagation()">'+ic+'</a>'};
  var u=encodeURIComponent(o.username);
  if(ch.indexOf('Instagram')>=0||L.instagram)out.push(mk('📷','Instagram',L.instagram,'https://www.instagram.com/'+u+'/'));
  if(ch.indexOf('TikTok')>=0||L.tiktok)out.push(mk('🎵','TikTok',L.tiktok,'https://www.tiktok.com/@'+u));
  if(ch.indexOf('Facebook')>=0||L.facebook)out.push(mk('📘','Facebook',L.facebook,'https://www.facebook.com/'+u));
  if(ch.indexOf('YouTube')>=0||L.youtube)out.push(mk('▶️','YouTube',L.youtube,'https://www.youtube.com/@'+u));
  return '<span class="ix-lns">'+out.join('')+'</span>';
}
function chName(c){if(!c)return '-';if(typeof c==='string')return c;if(Array.isArray(c))return String(c[0]);return c.name||c.channel||'-'}
function shTablePass(){
  var tb=document.getElementById('sh-tbody');if(!tb||typeof SHD==='undefined')return;
  var cur=shObjs(SHP),rows=tb.querySelectorAll('tr.sh-creator-row'),nm=netMap();
  rows.forEach(function(tr,i){
    var m=/toggleShChannelDetail\('((?:[^'\\]|\\.)*)'/.exec(tr.getAttribute('onclick')||''),u=m?m[1].replace(/\\'/g,"'"):null,o=u&&cur[u],name=tr.querySelector('.cc-name');
    if(o&&name){var a=nm[u];if(!name.getAttribute('data-ixl')){name.setAttribute('data-ixl','1');name.insertAdjacentHTML('beforeend',' '+shLinks(o))}
      if(!name.getAttribute('data-ixc')&&IX){name.setAttribute('data-ixc','1');if(a&&!o.is_network)name.insertAdjacentHTML('afterbegin','<span class="ix-cand" title="'+esc(a.reason)+'">🔍 '+(a.level==='likely'?'kemungkinan jaringan':'cek: jaringan?')+'</span> ')}}
    var hide=i>=ST.shLimit;tr.hidden=hide;
  });
  var more=document.getElementById('ix-sh-more'),tbl=tb.closest('table');
  if(!more){more=document.createElement('div');more.id='ix-sh-more';more.className='ix-more';tbl.parentNode.insertBefore(more,tbl.nextSibling)}
  var total=rows.length,shown=Math.min(total,ST.shLimit);
  more.innerHTML=total?'<span>Menampilkan '+shown+' dari '+total+' creator (urut sesuai pilihan sort)</span>'+(shown<total?' <button type="button" class="ix-btn" data-ixseg="more:50">Tampilkan 50 lagi</button> <button type="button" class="ix-btn" data-ixseg="more:all">Tampilkan semua</button>':' <button type="button" class="ix-btn" data-ixseg="more:reset">Ringkas</button>'):'';
}
function shTrend(){
  if(!IX)return;var S_=IX.sp,lbl=S_.map(function(r){return r.label}),curIdx=-1;S_.forEach(function(r,i){if(r.key===SHP)curIdx=i});
  var cols=S_.map(function(r,i){return i===curIdx?C.g:C.g2});
  var share=function(r){var g=r.net_conf+(ST.netMode>=1?r.net_likely:0)+(ST.netMode>=2?r.net_guess:0);return r.gmv?g/r.gmv*100:0};
  var tipsG=S_.map(function(r){return '[b]'+r.label+'[/b] ('+r.days+' hari)\nGMV: '+fmtR(r.gmv)+'\nGMV per hari: '+fmtR(r.gmv_day)+'\nCreator aktif: '+r.active});
  var rows=S_.map(function(r,i){return '<tr'+(i===curIdx?' class="cur"':'')+'><td>'+esc(r.label)+'</td><td>'+r.days+'</td><td>'+fmtN(r.gmv)+'</td><td>'+fmtN(r.gmv_day)+'</td><td>'+r.active+'</td><td>'+fmtN(r.gmv-(r.net_conf+(ST.netMode>=1?r.net_likely:0)+(ST.netMode>=2?r.net_guess:0)))+'</td><td>'+share(r).toFixed(1)+'%</td><td>'+r.new_share+'%</td></tr>'}).join('');
  var chs=['Others','Facebook','Instagram','Shopee Video','Shopee Live','TikTok','YouTube','Twitter'],cc={'Others':C.gray,'Facebook':C.blue,'Instagram':C.purple,'Shopee Video':C.g2,'Shopee Live':C.red,'TikTok':'#111827','YouTube':C.amber,'Twitter':'#38bdf8'};
  var shs=S_.map(share);
  ensure('ix-sh-trend',document.getElementById('ix-sh-net')).innerHTML=box('📉 Tren jangka panjang Shopee — Jun W1 → Nov W1',
    bars(lbl,S_.map(function(r){return r.gmv_day}),{colors:cols,hl:curIdx,title:'GMV per hari Shopee',tips:tipsG})+legend([['GMV per hari (rata-rata harian = GMV ÷ jumlah hari)',C.g2],['Periode yang dipilih (jika mingguan)',C.g]])+
    '<div class="ix-two" style="margin-top:12px">'+box('Porsi akun jaringan',lineChart(lbl,shs,{step:18,color:C.red,min:0,max:Math.max(20,Math.ceil(Math.max.apply(null,shs)/5)*5),fmt:function(v){return v.toFixed(0)+'%'},fmtFull:function(v){return v.toFixed(1)+'%'},hl:curIdx,tips:S_.map(function(r,i){return '[b]'+r.label+'[/b]\nJaringan: '+shs[i].toFixed(1)+'% dari GMV\nGMV total: '+fmtR(r.gmv)})}),'% dari GMV')+
    box('Porsi pembeli baru',lineChart(lbl,S_.map(function(r){return r.new_share}),{step:18,color:C.blue,min:0,max:100,fmt:function(v){return v.toFixed(0)+'%'},fmtFull:function(v){return v+'%'},hl:curIdx,tips:S_.map(function(r){return '[b]'+r.label+'[/b]\nPembeli baru: '+r.new_share+'%\nPembeli: '+r.buyers.toLocaleString('id-ID')+' (baru '+r.new_buyers.toLocaleString('id-ID')+')'})}),'perkiraan')+'</div>'+
    '<div style="font-size:12px;font-weight:600;margin:6px 0">Campuran channel</div>'+stack100(lbl,chs.map(function(c){return {name:c,color:cc[c],vals:S_.map(function(r){return (r.ch&&r.ch[c])||0})}}),{title:'channel',tipHead:S_.map(function(r){return r.days+' hari'})})+legend(chs.map(function(c){return [c,cc[c]]}))+
    '<div class="ix-scroll"><table class="ix-tbl" style="margin-top:8px"><thead><tr><th>Periode</th><th>Hari</th><th>GMV</th><th>GMV/hari</th><th>Aktif</th><th>GMV sebenarnya</th><th>% jaringan</th><th>% pembeli baru</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<div class="ix-warn">Tidak ada data refund di laporan Shopee, jadi tren refund/GMV bersih tidak bisa dibuat. Data Shopee yang tersimpan mulai Juni W1 (Mei tidak ada). Porsi jaringan mengikuti pengaturan di menu Akun jaringan.</div>','',true);
}
/* ======================= OVERVIEW GABUNGAN ======================= */
function ovRender(){
  if(typeof D==='undefined'||typeof SHD==='undefined'||!D||!SHD||!IX||!document.getElementById('combined-hero'))return;
  initTip();
  var tt=D[CP].overview,sh=SHD.periods[CP].overview,ttCfg=D.modes[CPM]&&D.modes[CPM].periods.find(function(p){return p.key===CP}),shCfg=SHD.modes[CPM]&&SHD.modes[CPM].periods.find(function(p){return p.key===CP});
  var gd=tt.total_gmv/tt.days+sh.total_gmv/sh.days,hero=document.getElementById('combined-hero'),notes=[];
  var ttd=tt.total_gmv/tt.days,shd=sh.total_gmv/sh.days,bg=null,bTT=null,bSH=null;
  if(ttCfg&&ttCfg.prevKey&&D[ttCfg.prevKey]&&shCfg&&shCfg.prevKey&&SHD.periods[shCfg.prevKey]){bTT=D[ttCfg.prevKey].overview;bSH=SHD.periods[shCfg.prevKey].overview;bg=bTT.total_gmv/bTT.days+bSH.total_gmv/bSH.days;
    if(bTT.days!==tt.days)notes.push('Periode ini '+tt.days+' hari sedangkan pembanding '+bTT.days+' hari: panah di kartu atas membandingkan <b>total</b>, jadi bisa menyesatkan. Pakai angka "per hari" di bawah.')}
  var netGmv=tt.total_gmv-tt.refunded,cs=IX.sp.filter(function(r){return r.key===CP})[0],conf=cs?cs.net_conf:0;
  var s=[];s.push('GMV gabungan <b>'+fmtR(tt.total_gmv+sh.total_gmv)+'</b>, rata-rata <b>'+fmtR(gd)+'/hari</b>'+(bg?', '+(gd>=bg?'naik ':'turun ')+Math.abs(pc(gd,bg)).toFixed(1)+'% per hari dibanding '+esc(ttCfg.prevLabel):'')+'.');
  s.push('TikTok '+fmtR(ttd)+'/hari'+(bTT?' ('+(pc(ttd,bTT.total_gmv/bTT.days)>=0?'+':'')+pc(ttd,bTT.total_gmv/bTT.days).toFixed(1)+'%)':'')+', Shopee '+fmtR(shd)+'/hari'+(bSH?' ('+(pc(shd,bSH.total_gmv/bSH.days)>=0?'+':'')+pc(shd,bSH.total_gmv/bSH.days).toFixed(1)+'%)':'')+'. TikTok refund '+tt.refund_rate+'% ('+fmtR(tt.refunded)+'); Shopee tidak punya data refund.');
  if(conf)s.push('Dari GMV Shopee, '+fmtR(conf)+' ('+(conf/sh.total_gmv*100).toFixed(1)+'%) berasal dari akun jaringan terkonfirmasi, bukan KOL individual.');
  ovNotes();
  var el=ensure('ix-ov',hero);
  var wk=IX.tt.filter(function(r){return r.kind==='week'}),spm={};IX.sp.forEach(function(r){spm[r.key]=r});
  var lbl=wk.map(function(r){return r.label}),tv=wk.map(function(r){return r.gmv_day}),sv=wk.map(function(r){return spm[r.key]?spm[r.key].gmv_day:0});
  var hl=-1;wk.forEach(function(r,i){if(r.key===CP)hl=i});
  var tips=wk.map(function(r,i){return '[b]'+r.label+'[/b] ('+r.days+' hari)\nTikTok: '+fmtR(tv[i])+'/hari\nShopee: '+fmtR(sv[i])+'/hari\nGabungan: '+fmtR(tv[i]+sv[i])+'/hari'});
  el.innerHTML=box('📝 Ringkasan otomatis — '+esc(cpLabelOf()),'<div>'+s.map(function(t){return '<p style="font-size:13px;line-height:1.65;margin:0 0 4px">'+t+'</p>'}).join('')+'</div>'+(notes.length?'<div class="ix-warn">'+notes.join('<br>')+'</div>':''),'',true)+
   '<div class="ix-two"><div class="ix-kpi"><div class="l">GMV gabungan per hari <span class="ix-new">BARU</span></div><div class="v">'+fmtR(gd)+'</div><div class="s">'+(bg?pcTxt(pc(gd,bg))+' vs '+esc(ttCfg.prevLabel):'tanpa pembanding')+'</div></div>'+
   '<div class="ix-kpi"><div class="l">GMV gabungan bersih sebagian <span class="ix-new">BARU</span></div><div class="v">'+fmtR(netGmv+sh.total_gmv-conf)+'</div><div class="s">TikTok setelah refund + Shopee tanpa akun jaringan terkonfirmasi. Refund Shopee tidak tersedia, jadi ini belum benar-benar "bersih".</div></div></div>'+
   box('Tren GMV mingguan (rata-rata per hari): TikTok + Shopee, Jul W1 → Nov W1',(function(){var T=wk.length;var mx=niceMax(Math.max.apply(null,tv.map(function(v,i){return v+sv[i]})));var H=200,L=46,B=34,T0=14,W=L+T*34+8,pw=H-B-T0;var s2='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Tren GMV per hari gabungan">';for(var g=0;g<=4;g++){var y=T0+pw-pw*g/4;s2+='<line x1="'+L+'" x2="'+(W-4)+'" y1="'+y+'" y2="'+y+'" stroke="#eef0f2"/><text x="'+(L-5)+'" y="'+(y+3)+'" font-size="9" fill="#9ca3af" text-anchor="end">'+fmtN(mx*g/4)+'</text>'}
     wk.forEach(function(r,i){var x=L+i*34+6,h1=pw*tv[i]/mx,h2=pw*sv[i]/mx;s2+='<rect x="'+x+'" y="'+(T0+pw-h1)+'" width="22" height="'+h1+'" fill="#111827"></rect><rect x="'+x+'" y="'+(T0+pw-h1-h2)+'" width="22" height="'+h2+'" fill="#EE4D2D"'+(hl===i?' stroke="#0d2b1a" stroke-width="1.5"':'')+'></rect>'+xlab(x+11,H,B,r.label)+hit(L+i*34,T0,34,pw+B-8,tips[i])});
     return chartWrap(s2+'</svg>')})()+legend([['TikTok','#111827'],['Shopee','#EE4D2D']])+'<div class="ix-warn">Per hari = GMV ÷ jumlah hari periode, supaya minggu 10 hari tidak tampak melonjak. GMV kotor kedua platform (TikTok belum dipotong refund).</div>','Rp / hari, per minggu',true);
}
function ovNotes(){var n=document.getElementById('combined-notes'),A=(IX.net&&IX.net.accounts)||[];if(!n||n.querySelector('.ix-extra'))return;var l=A.filter(function(a){return a.level==='likely'}).length,g=A.filter(function(a){return a.level==='guess'}).length;n.insertAdjacentHTML('beforeend','<div class="ix-extra ix-warn" style="margin-top:10px"><span class="ix-new">BARU</span> Selain itu ada '+l+' akun yang kemungkinan besar juga jaringan/adtech dan '+g+' yang perlu dicek (Opera, Flat Ads, Interspace, Involve Asia, dll). Detail dan pengaturannya di Shopee → Akun jaringan.</div>')}
function cpLabelOf(){return COMBINED_MODES[CPM].find(function(p){return p.key===CP}).label}

/* ======================= state toggles ======================= */
function segClick(id,val){
  if(id==='gmvMode'){ST.gmvMode=val;var c=document.getElementById('ix-tt-gmvchart');if(c)c.innerHTML=ttTrendChart();var c2=document.getElementById('ix-tt-gmvmonth');if(c2)c2.innerHTML=ttMonthChart();document.querySelectorAll('[data-ixseg^="gmvMode:"]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-ixseg')==='gmvMode:'+val)})}
  else if(id==='netMode'){ST.netMode=+val;if(typeof renderShopeeOverview==='function')renderShopeeOverview()}
  else if(id==='more'){ST.shLimit=val==='all'?99999:val==='reset'?50:ST.shLimit+50;shTablePass()}
}

/* ======================= init ======================= */
function wrap(name,fn){var orig=window[name];if(typeof orig!=='function')return false;window[name]=function(){var r=orig.apply(this,arguments);try{fn()}catch(e){console.error('[insight] '+name,e)}return r};return true}
function again(){
  try{if(typeof renderAll==='function'&&typeof D!=='undefined'&&D&&document.getElementById('page-overview'))ttRender()}catch(e){console.error('[insight]',e)}
  try{if(typeof renderShopeeOverview==='function'&&typeof SHD!=='undefined'&&SHD)shRender()}catch(e){console.error('[insight]',e)}
  try{if(typeof renderCombined==='function'&&typeof SHD!=='undefined'&&SHD&&typeof D!=='undefined'&&D)ovRender()}catch(e){console.error('[insight]',e)}
}
wrap('renderAll',ttRender);
wrap('renderShopeeOverview',shRender);
wrap('renderSHTable',shTablePass);
wrap('renderCombined',ovRender);
fetch('data_insight.json').then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(function(j){IX=j;again()}).catch(function(e){console.error('[insight] data_insight.json gagal dimuat',e)});
/* Opsional: creator_links.json = {"username":{"instagram":"https://...","tiktok":"https://..."}} untuk tautan Shopee yang pasti benar. */
fetch('creator_links.json').then(function(r){return r.ok?r.json():{}}).then(function(j){LINKS=j||{}}).catch(function(){});
window.__ix={again:again,state:ST};
})();
