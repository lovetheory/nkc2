var replyTarget = ga('replytarget','value');

function reply(){
  alert(replyTarget);
}

function cartThread(tid){
  return nkcAPI('addThreadToCart',{tid})
  .then(()=>{
    alert('success '+tid)
  })
  .catch(alert)
}
