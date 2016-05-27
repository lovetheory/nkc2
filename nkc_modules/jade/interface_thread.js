var replyTarget = ga('replytarget','value');

function reply(){
  alert(replyTarget);
}

function cartThread(tid){
  nkcAPI('addThreadToCart',{tid:tid})
  .then(function(){
    alert('success '+tid)
  })
  .catch(jalert)
}

function cartPost(pid){
  nkcAPI('addPostToCart',{pid:pid})
  .then(function(){
    alert('success '+pid)
  })
  .catch(jalert)
}
