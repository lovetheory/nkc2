var replyTarget = ga('replytarget','value');

var screenTopAlert = screenTopAlert

function cartThread(tid){
  nkcAPI('addThreadToCart',{tid:tid})
  .then(function(){
    return screenTopAlert(tid + ' added to cart')
  })
  .catch(jwarning)
}

function cartPost(pid){
  nkcAPI('addPostToCart',{pid:pid})
  .then(function(){
    return screenTopAlert(pid + ' added to cart')
  })
  .catch(jwarning)
}

function setDigest(tid){
  nkcAPI('setDigest',{tid:tid})
  .then(function(){
    return screenTopAlert(tid+' 设为精华')
  })
}

function assemblePostObject(){
  var post = {
    //t:gv('title').trim(),

    c:gv('ReplyContent').trim(),
    l:"markdown",
  }
  return post
}

function disablePost(pid){
  nkcAPI('disablePost',{pid:pid})
  .then(function(res){
    location.reload()
  })
  .catch(jwarning)
}

function enablePost(pid){
  nkcAPI('enablePost',{pid:pid})
  .then(function(res){
    location.reload()
  })
  .catch(jwarning)
}

function submit(){

  var post = assemblePostObject()
  var target = replyTarget.trim();

  if(post.c==''){screenTopWarning('请填写内容。');return;}
  if(target==''){screenTopWarning('请填写发表至的目标。');return;}

  geid('ButtonReply').disabled=true
  return nkcAPI('postTo',{
    target:target,
    post:post,
  })
  .then(function(result){
    var redirectTarget = result.redirect;
    redirect(redirectTarget?redirectTarget:'/'+target)
  })
  .catch(function(err){
    jwarning(err)
    geid('ButtonReply').disabled=false
  })
}

function quotePost(pid){
  nkcAPI('getPostContent',{pid:pid})
  .then(function(pc){
    length_limit = 100

    var str = pc.c.slice(0,length_limit)
    if(str.length==length_limit)str+='……'

    str = '引用 '+pc.username+' : ' + str

    str = str.split('\n').map(function(s){return ('> '+s)}).join('\n')

    str+='\n\n'

    geid('ReplyContent').value += str
    window.location.href='#ReplyContent'
  })

}
