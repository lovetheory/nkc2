var replyTarget = ga('replytarget','value');

function reply(){
  alert(replyTarget);
}

var screenTopAlert = screenTopAlert

function cartThread(tid){
  nkcAPI('addThreadToCart',{tid:tid})
  .then(function(){
    return screenTopAlert(tid + ' added to cart')
  })
  .catch(jalert)
}

function cartPost(pid){
  nkcAPI('addPostToCart',{pid:pid})
  .then(function(){
    return screenTopAlert(pid + ' added to cart')
  })
  .catch(jalert)
}
