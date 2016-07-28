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
  .then(function(back){
    return screenTopAlert(tid+ back.message.toString())
  })
  .catch(jwarning)
}

function setTopped(tid){
  nkcAPI('setTopped',{tid:tid})
  .then(function(back){
    return screenTopAlert(tid+back.message.toString())
  })
  .catch(jwarning)
}

function assemblePostObject(){
  var post = {
    //t:gv('title').trim(),

    c:gv('ReplyContent').trim(),
    l:"pwbb",
  }

  if(geid('ParseURL').checked){
    if(post.l=='markdown'){
      post.c = common.URLifyMarkdown(post.c)
    }
    if(post.l=='pwbb'){
      post.c = common.URLifyBBcode(post.c)
    }
  }

  post.c = post.c.replace(/\[\/quote] *\n+/gi,'[/quote]')

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

    var str = pc.c.replace(/\[quote.*?][^]*?\[\/quote]/g,'').slice(0,length_limit).trim()
    if(str.length==length_limit)str+='……'

    str = '[quote='+pc.username+','+pc._key+']'+ str + '[/quote]'

    geid('ReplyContent').value += str
    window.location.href='#ReplyContent'
  })
}

function goEditor(){
  window.location = '/editor?target='+replyTarget.trim()+'&content='+encodeURI(assemblePostObject().c)
}

function addColl(tid){
  nkcAPI('addThreadToCollection',{tid:tid})
  .then(function(res){
    screenTopAlert('已收藏 '+tid)
  })
  .catch(jwarning)
}

function addCredit(pid){
  var cobj = promptCredit(pid)
  if(cobj){
    return nkcAPI('addCredit',cobj)
    .then(function(){
      window.location.reload()
    })
    .catch(jwarning)
  }
  else{
    screenTopWarning('取消评分。')
  }
}

function promptCredit(pid){
  var cobj = {pid:pid}

  var q = prompt('请输入学术分：','1')
  if(q&&Number(q)){
    cobj.q=Number(q)

    var reason = prompt('请输入评分理由：','')
    if(reason&&reason.length>1){
      cobj.reason = reason
      cobj.type = 'xsf'

      return cobj
    }
  }
  return null
}

function moveThreadToForum(tid,fid){
  if(!confirm('确定要把 '+tid+' 移动到 '+fid+' 吗？'))return;
  nkcAPI('moveThread',{tid:tid,fid:fid})
  .then(function(){
    screenTopAlert(tid+' moved to '+fid)
    window.location.reload()
  })
  .catch(jwarning)
}

function recycleThread(tid){
  moveThreadToForum(tid,'recycle')
}
