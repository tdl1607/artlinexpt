(function(){
  'use strict';
  var $=function(s,r){return (r||document).querySelector(s);};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
  var calm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer=window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var lenis=null;

  /* ---------- Меню ---------- */
  var burger=$('#burger'),menu=$('#menu');
  burger.addEventListener('click',function(){
    var open=menu.classList.toggle('open');
    burger.setAttribute('aria-expanded',open);
  });
  $$('a',menu).forEach(function(a){a.addEventListener('click',function(){menu.classList.remove('open');burger.setAttribute('aria-expanded','false');});});

  /* ---------- Окно доверенности ---------- */
  var dovOv=$('#dovOverlay'),dovOpen=$('#dovBtn'),dovCheck=$('#dovAgree'),dovDownload=$('#dovDownload'),dovCancel=$('#dovCancel'),dovClose=$('#dovClose');
  function openDov(){
    dovCheck.checked=false;dovDownload.disabled=true;dovOv.classList.add('open');document.body.style.overflow='hidden';
    if(lenis)lenis.stop();
    if(window.gsap&&!calm){
      gsap.fromTo(dovOv,{opacity:0},{opacity:1,duration:.25});
      gsap.fromTo('.modal',{y:36,scale:.97,opacity:0},{y:0,scale:1,opacity:1,duration:.5,ease:'expo.out'});
    }
    dovClose.focus();
  }
  function closeDov(){
    dovOv.classList.remove('open');document.body.style.overflow='';
    if(lenis)lenis.start();
    dovOpen.focus();
  }
  dovOpen.addEventListener('click',openDov);
  dovCancel.addEventListener('click',closeDov);
  dovClose.addEventListener('click',closeDov);
  dovOv.addEventListener('click',function(e){if(e.target===dovOv)closeDov();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&dovOv.classList.contains('open'))closeDov();});
  dovCheck.addEventListener('change',function(){dovDownload.disabled=!dovCheck.checked;});
  dovDownload.addEventListener('click',function(){
    if(!dovCheck.checked)return;
    var a=document.createElement('a');a.href='/docs/doverennost.pdf';a.download='doverennost.pdf';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    closeDov();
  });

  /* ---------- Статус офиса по графику, время Владивостока (UTC+10) ---------- */
  var DAY_NAMES=['вс','пн','вт','ср','чт','пт','сб'];
  function fmt(m){var h=Math.floor(m/60),n=m%60;return h+':'+(n<10?'0':'')+n;}
  function dayHours(sched,d){return sched.days[d]||null;}
  function officeStatus(sched){
    var now=new Date(Date.now()+10*3600*1000);
    var d=now.getUTCDay(),m=now.getUTCHours()*60+now.getUTCMinutes();
    var h=dayHours(sched,d);
    if(h&&m>=h[0]&&m<h[1]){
      if(m>=sched.lunch[0]&&m<sched.lunch[1])return {cls:'lunch',text:'По графику обед до '+fmt(sched.lunch[1])};
      return {cls:'open',text:'По графику открыто до '+fmt(h[1])};
    }
    if(h&&m<h[0])return {cls:'',text:'По графику закрыто, откроется в '+fmt(h[0])};
    for(var i=1;i<=7;i++){
      var nd=(d+i)%7,nh=dayHours(sched,nd);
      if(nh)return {cls:'',text:'По графику закрыто, откроется '+(i===1?'завтра':DAY_NAMES[nd])+' в '+fmt(nh[0])};
    }
    return {cls:'',text:'По графику закрыто'};
  }
  var SCHEDULES={
    vl:{days:{1:[600,1035],2:[600,1035],3:[600,1035],4:[600,1035],5:[600,990]},lunch:[780,810]},
    std:{days:{1:[600,1080],2:[600,1080],3:[600,1080],4:[600,1080],5:[600,1080]},lunch:[780,840]}
  };
  function paintStatus(){
    $$('[data-schedule]').forEach(function(el){
      var s=officeStatus(SCHEDULES[el.dataset.schedule]);
      el.textContent=s.text;el.className='status'+(s.cls?' '+s.cls:'');el.hidden=false;
    });
  }
  paintStatus();setInterval(paintStatus,60000);

  /* ---------- WebGL: фирменные полосы логотипа ---------- */
  function startGl(){
    var cv=$('#heroGl');if(!cv)return;
    var gl=cv.getContext('webgl',{antialias:false,alpha:false,powerPreference:'low-power'});
    if(!gl){cv.remove();return;}
    var vs='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
    var fs=[
      'precision mediump float;uniform vec2 r;uniform float t;uniform vec2 m;uniform float k;',
      'float cap(vec2 p,float h,float rad){p.y-=clamp(p.y,-h,h);return length(p)-rad;}',
      'float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
      'void main(){',
      ' vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;float a=r.x/r.y;',
      ' bool wide=a>1.15;',
      ' float na=min(a,.6);vec2 c=wide?vec2(a*.34,.02):vec2(a*.16,.5-.56*na);float s=wide?.0043:na*.0041;',
      ' vec2 p=(uv-c-m*.018)/s;',
      ' float cs=.891,sn=.454;vec2 q=vec2(cs*p.x-sn*p.y,sn*p.x+cs*p.y);',
      ' float y=gl_FragCoord.y/r.y;',
      ' vec3 col=mix(vec3(.027,.075,.122),vec3(.043,.118,.2),y);',
      ' col+=vec3(.03,.07,.12)*exp(-length(uv-c)*2.4);',
      ' float X[4];X[0]=-73.5;X[1]=-24.5;X[2]=24.5;X[3]=73.5;',
      ' float H[4];H[0]=46.8;H[1]=78.;H[2]=62.4;H[3]=35.9;',
      ' for(int i=0;i<4;i++){',
      '  float fi=float(i);',
      '  float b=H[i]*k*(1.+.11*sin(t*.55+fi*1.9)+.06*sin(t*.23+fi*4.1)+m.y*.05*(fi-1.5));',
      '  vec2 o=q-vec2(X[i],.14*(m.x*6.)*(fi-1.5));',
      '  float d=cap(o,b,15.5);',
      '  float fill=smoothstep(.7,-.7,d);',
      '  float grad=.5+.5*clamp(o.y/(b+15.5),-1.,1.);',
      '  float edge=exp(-abs(d)*.32);',
      '  float glow=exp(-max(d,0.)*.03);',
      '  if(i==1){',
      '   vec3 am=mix(vec3(.86,.47,.11),vec3(1.,.77,.42),grad);',
      '   col=mix(col,am,fill);col+=vec3(.96,.62,.2)*(glow*.17+edge*.12*(1.-fill));',
      '  }else{',
      '   vec3 gl=mix(vec3(.13,.24,.36),vec3(.42,.58,.75),grad);',
      '   col=mix(col,gl,fill*.62);col+=vec3(.55,.74,.95)*(edge*.2+glow*.035);',
      '  }',
      ' }',
      ' col+=(hash(gl_FragCoord.xy+t)-.5)/110.;',
      ' gl_FragColor=vec4(col,1.);',
      '}'
    ].join('\n');
    function sh(type,src){var o=gl.createShader(type);gl.shaderSource(o,src);gl.compileShader(o);return o;}
    var pr=gl.createProgram();
    gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){cv.remove();return;}
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    var loc=gl.getAttribLocation(pr,'a');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    var uR=gl.getUniformLocation(pr,'r'),uT=gl.getUniformLocation(pr,'t'),uM=gl.getUniformLocation(pr,'m'),uK=gl.getUniformLocation(pr,'k');
    var tx=0,ty=0,mx=0,my=0,visible=true,t0=performance.now(),raf=0;
    function size(){
      var dpr=Math.min(window.devicePixelRatio||1,1.5);
      var w=Math.round(cv.clientWidth*dpr),h=Math.round(cv.clientHeight*dpr);
      if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;gl.viewport(0,0,w,h);}
    }
    function draw(now){
      size();
      var e=(now-t0)/1000;
      var intro=calm?1:Math.min(1,e/1.8);intro=1-Math.pow(1-intro,3);
      mx+=(tx-mx)*.05;my+=(ty-my)*.05;
      gl.uniform2f(uR,cv.width,cv.height);gl.uniform1f(uT,calm?4:e);gl.uniform2f(uM,mx,my);gl.uniform1f(uK,intro);
      gl.drawArrays(gl.TRIANGLES,0,3);
    }
    function loop(now){draw(now);raf=visible&&!document.hidden?requestAnimationFrame(loop):0;}
    function wake(){if(!calm&&!raf&&visible&&!document.hidden)raf=requestAnimationFrame(loop);}
    window.addEventListener('resize',function(){draw(performance.now());});
    if(calm){draw(performance.now());return;}
    if(finePointer)window.addEventListener('pointermove',function(e){tx=e.clientX/innerWidth*2-1;ty=1-e.clientY/innerHeight*2;},{passive:true});
    new IntersectionObserver(function(en){visible=en[0].isIntersecting;wake();}).observe(cv);
    document.addEventListener('visibilitychange',wake);
    wake();
  }
  startGl();

  if(calm||!window.gsap||!window.ScrollTrigger)return;

  /* ---------- Движение ---------- */
  document.documentElement.classList.add('js-motion');
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ease:'power3.out'});

  if(window.Lenis){
    lenis=new Lenis({lerp:.11,wheelMultiplier:1});
    lenis.on('scroll',ScrollTrigger.update);
    gsap.ticker.add(function(t){lenis.raf(t*1000);});
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        var h=a.getAttribute('href');
        var el=h.length>1?$(h):null;
        if(!el)return;
        e.preventDefault();
        lenis.scrollTo(h==='#top'?0:el,{offset:h==='#process'?0:-90,duration:1.25});
      });
    });
  }

  gsap.to('.progress',{scaleX:1,ease:'none',scrollTrigger:{start:0,end:'max',scrub:.2}});
  ScrollTrigger.create({start:80,end:'max',toggleClass:{targets:'.nav',className:'solid'}});

  /* Заголовок первого экрана: слова выезжают из-под маски */
  var h1=$('.hero h1');
  function splitWords(node){
    Array.prototype.slice.call(node.childNodes).forEach(function(n){
      if(n.nodeType===3){
        var f=document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function(part){
          if(!part)return;
          if(/^\s+$/.test(part)){f.appendChild(document.createTextNode(' '));return;}
          var w=document.createElement('span');w.className='w';
          var i=document.createElement('i');i.textContent=part;w.appendChild(i);f.appendChild(w);
        });
        node.replaceChild(f,n);
      }else if(n.nodeType===1)splitWords(n);
    });
  }
  splitWords(h1);
  gsap.timeline()
    .from('.header-wrap',{y:-30,autoAlpha:0,duration:.9})
    .from('.kicker',{y:14,autoAlpha:0,duration:.7},.1)
    .from('.hero h1 .w>i',{yPercent:112,duration:1.05,stagger:.055,ease:'expo.out'},.15)
    .from('.lead',{y:22,autoAlpha:0,duration:.8},.65)
    .from('.hero-cta>*',{y:20,autoAlpha:0,duration:.7,stagger:.08},.75)
    .from('.partner-badge',{y:20,autoAlpha:0,duration:.7},1);

  gsap.to('.hero-inner',{yPercent:-7,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});

  /* Появление блоков */
  $$('.title,.subtitle').forEach(function(el){
    if(el.closest('.proc'))return;
    gsap.from(el,{y:30,autoAlpha:0,duration:.95,scrollTrigger:{trigger:el,start:'top 90%',once:true}});
  });
  ScrollTrigger.batch('[data-rv]',{start:'top 91%',once:true,onEnter:function(b){gsap.to(b,{y:0,autoAlpha:1,duration:.9,stagger:.09,overwrite:true});}});
  gsap.set('[data-rv]',{y:42,autoAlpha:0});

  /* Счётчики */
  $$('[data-count]').forEach(function(el){
    var end=+el.dataset.count,o={v:0};
    ScrollTrigger.create({trigger:el,start:'top 94%',once:true,onEnter:function(){
      gsap.to(o,{v:end,duration:1.5,ease:'power2.out',onUpdate:function(){el.textContent=Math.round(o.v);}});
    }});
  });

  /* Полосы в блоке анкеты */
  $$('.anketa-bars rect').forEach(function(r,i){
    gsap.from(r,{yPercent:(i%2?1:-1)*38,ease:'none',transformOrigin:'50% 50%',scrollTrigger:{trigger:'.anketa',start:'top bottom',end:'bottom top',scrub:.6}});
  });

  /* Эффекты указателя только для мыши */
  if(finePointer){
    $$('.svc').forEach(function(c){
      var rx=gsap.quickTo(c,'rotationX',{duration:.6}),ry=gsap.quickTo(c,'rotationY',{duration:.6});
      c.addEventListener('pointermove',function(e){
        var b=c.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;
        c.style.setProperty('--mx',x+'px');c.style.setProperty('--my',y+'px');
        ry((x/b.width-.5)*5);rx((.5-y/b.height)*5);
      });
      c.addEventListener('pointerleave',function(){rx(0);ry(0);});
    });
    $$('.magnet').forEach(function(b){
      var qx=gsap.quickTo(b,'x',{duration:.5}),qy=gsap.quickTo(b,'y',{duration:.5});
      b.addEventListener('pointermove',function(e){
        var r=b.getBoundingClientRect();
        qx((e.clientX-r.left-r.width/2)*.2);qy((e.clientY-r.top-r.height/2)*.28);
      });
      b.addEventListener('pointerleave',function(){qx(0);qy(0);});
    });
  }

  /* Главная сцена: осмотр проходит по шагам вместе с прокруткой */
  var steps=$$('.flow .step');
  function setStep(i){
    steps.forEach(function(s,n){s.classList.toggle('on',n===i);s.classList.toggle('done',n<i);});
  }
  setStep(0);
  function buildStage(st){
    var tl=gsap.timeline({defaults:{ease:'none'},scrollTrigger:Object.assign({scrub:.5,onUpdate:function(self){
      setStep(Math.min(steps.length-1,Math.floor(self.progress*steps.length)));
    }},st)});
    tl.fromTo('.draw',{strokeDashoffset:1},{strokeDashoffset:0,duration:.9,stagger:.012},0)
      .fromTo('.st-s1',{autoAlpha:0},{autoAlpha:1,duration:.3},.5)
      .fromTo('.scan',{x:0,autoAlpha:0},{x:720,autoAlpha:1,duration:.95},1)
      .to('.scan',{autoAlpha:0,duration:.08},1.9)
      .fromTo('.st-s2',{autoAlpha:0},{autoAlpha:1,duration:.35},1.15)
      .fromTo('.st-mark',{autoAlpha:0,scale:1.35,transformOrigin:'50% 50%'},{autoAlpha:1,scale:1,duration:.3,stagger:.3,ease:'back.out(2)'},2)
      .fromTo('.st-row',{autoAlpha:0},{autoAlpha:1,duration:.2,stagger:.3},3)
      .fromTo('.st-fill',{scaleX:0,transformOrigin:'0 50%'},{scaleX:1,duration:.3,stagger:.3},3.03)
      .fromTo('.st-stamp-g',{autoAlpha:0,scale:1.7,rotation:-30,transformOrigin:'50% 50%'},{autoAlpha:1,scale:1,rotation:-8,duration:.45,ease:'back.out(2.2)'},4)
      .to({},{duration:.55},4.45);
    return tl;
  }
  ScrollTrigger.matchMedia({
    '(min-width: 901px)':function(){
      buildStage({trigger:'.proc-pin',start:'top top',end:'+=260%',pin:true,anticipatePin:1});
    },
    '(max-width: 900px)':function(){
      buildStage({trigger:'.flow',start:'top 46%',end:'bottom 62%'});
    }
  });

  window.addEventListener('load',function(){ScrollTrigger.refresh();});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){ScrollTrigger.refresh();});
})();
