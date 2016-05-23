var replyTarget = ga('replytarget','value');

function reply(){
  alert(replyTarget);
}

function cartThread(tid){
  return nkcAPI('addThreadToCart',{tid})
  .then(()=>{
    alert('success '+tid)
  })
  .catch(jalert)
}

function cartPost(pid){
  return nkcAPI('addPostToCart',{pid})
  .then(()=>{
    alert('success '+pid)
  })
  .catch(jalert)
}
