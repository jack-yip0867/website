/* app.js - Scroll reveal + nav effects */
(function(){
  'use strict';

  /* ---- Scroll Reveal (IntersectionObserver) ---- */
  var reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals=document.querySelectorAll('.reveal');

  if(!reducedMotion&&reveals.length){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    },{threshold:0.08,rootMargin:'0px 0px -30px 0px'});

    reveals.forEach(function(el){io.observe(el)});
  }else{
    reveals.forEach(function(el){el.classList.add('visible')});
  }

  /* ---- Nav shadow on scroll ---- */
  var nav=document.getElementById('site-nav');
  if(nav){
    window.addEventListener('scroll',function(){
      if(window.scrollY>8){nav.classList.add('scrolled')}
      else{nav.classList.remove('scrolled')}
    },{passive:true});
  }
})();
