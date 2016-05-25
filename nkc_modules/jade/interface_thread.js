var replyTarget = ga('replytarget','value');

function reply(){
  alert(replyTarget);
}

function cartThread(tid){
  return nkcAPI('addThreadToCart',{tid})
  .then(function(){
    alert('success '+tid)
  })
  .catch(jalert)
}

function cartPost(pid){
  return nkcAPI('addPostToCart',{pid})
  .then(function(){
    alert('success '+pid)
  })
  .catch(jalert)
}
