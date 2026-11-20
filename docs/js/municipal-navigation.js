document.addEventListener('DOMContentLoaded',function(){
const button=document.getElementById('mobile-menu-btn'),nav=document.querySelector('.main-nav');
if(!button||!nav)return;
function close(){nav.classList.remove('open');button.setAttribute('aria-expanded','false');}
button.addEventListener('click',function(){const open=nav.classList.toggle('open');button.setAttribute('aria-expanded',String(open));});
document.addEventListener('click',function(e){if(!nav.contains(e.target)&&!button.contains(e.target))close();document.querySelectorAll('.home-year-menu[open]').forEach(function(d){if(!d.contains(e.target))d.open=false;});});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){document.querySelectorAll('.home-year-menu[open]').forEach(function(d){d.open=false;d.querySelector('summary').focus();});if(nav.classList.contains('open')){close();button.focus();}}});
});