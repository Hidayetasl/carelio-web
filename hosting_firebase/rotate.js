(function(){
  var el=document.getElementById('rotateTarget'); if(!el) return;
  var words=["dijital asistanınıza","uzman doktorlara","akıllı teknolojiye","güvenli ellere"];
  var i=0;
  function swap(t){
    el.classList.add('rot-out');
    setTimeout(function(){
      el.textContent=t;
      el.classList.remove('rot-out'); el.classList.add('rot-in');
      setTimeout(function(){ el.classList.remove('rot-in'); }, 320);
    },200);
  }
  setInterval(function(){ i=(i+1)%words.length; swap(words[i]); }, 2200);
})();
