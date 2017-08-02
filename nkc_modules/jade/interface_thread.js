$(document).ready(function(){
  if($(window).width()<750){
    $('.ThreadTitleText').css('font-size','20px');
    $('.ThreadTitle1').css('width','80%');
    $('.ThreadTitle2').css('width','18%');
    $('#airnum1').css('font-size','16px');
    $('#airnum2').css('font-size','16px');
    $('#airnum3').css('font-size','10px');
  }
})


var replyTarget = ga('replytarget','value');
var screenTopAlert = screenTopAlert;


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

function assemblePostObject(){  //bbcode , markdown
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
    screenTopAlert(pid+' 已屏蔽，请刷新')
    //location.reload()
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
    redirect(redirectTarget?redirectTarget:'/'+target);
  })
  .catch(function(err){
    jwarning(err.detail);
    geid('ButtonReply').disabled=false;
  })
}

function quotePost(pid){
  nkcAPI('getPostContent',{pid:pid})
  .then(function(pc){
    length_limit = 100;
    var content = pc.c;
    var replaceArr = [
      {reg: /<[^>]*>/gm, rep: ''},
      {reg: /<\/[^>]*>/, rep: ' '}
    ];
    if(pc.l === 'html') {
      for(var i in replaceArr) {
        var obj = replaceArr[i];
        content = content.replace(obj.reg, obj.rep)
      }
    }

    var str = content.replace(/\[quote.*?][^]*?\[\/quote]/g,'').slice(0,length_limit).trim()
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

function extractfid(){
  var targetforum = gv('TargetForum').trim().split(':')
  if(targetforum.length!==2)return screenTopWarning('请选择一个目标')
  targetforum = targetforum[0]
  return targetforum
}

function moveThreadTo(tid){
  var fid = extractfid()
  askCategoryOfForum(fid)
  .then(function(cid){
    return moveThread(tid,fid,cid)
  })
  .then(function(){
    screenTopAlert('请刷新')
  })
  .catch(jwarning)
}

function askCategoryOfForum(fid){
  fid = fid.toString()
  return nkcAPI('getForumCategories',{fid:fid})
  .then(function(arr){
    if(!arr.length)return null
    return screenTopQuestion('请选择一个分类：',['0:（无分类）'].concat(arr.map(function(i){return i._key+':'+i.name})))
  })
  .then(function(str){
    //console.log('selected:',str.split(':')[0]);
    if(!str)return null
    return str.split(':')[0]
  })
}

function moveThread(tid,fid,cid){
  return nkcAPI('moveThread',{
    tid:tid,
    fid:fid,
    cid:cid,
  })
  .then(function(){
    screenTopAlert(tid + ' 已送 ' + fid + (cid?' 的 '+cid:''))
  })
  .catch(function(){
    screenTopWarning(tid+ ' 无法送 ' + fid+ (cid?' 的 '+cid:''))
  })
}

function recycleThread(tid){
  moveThread(tid,'recycle')
}

function widerArea(){
  var rc = geid('ReplyContent')
  rc.rows = 10
  rc.style.resize='vertical'
  geid('WiderArea').style.display = 'none'
}

window.onscroll = function () {
  var top =  $(this).scrollTop();
  if(top>700){
    $("#topB").css("display","block");
    $("#topB").css("position","fixed"); //固定div的位置
    $("#topB").css("top","40%");
  }else{
    //$("#topB").css("position","relative");
    $("#topB").css("display","none");
  }
}

function switchVInPersonalForum(tid, name, type) {
  var hidden;
  var visible;
  var target;
  if(!name) {
    hidden = '恢复专栏显示';
    visible = '在专栏隐藏';
    target = geid('visibility');
    nkcAPI('switchVInPersonalForum',{tid: tid})
      .then(function() {
        if(target.innerHTML === hidden) {
          target.innerHTML = visible;
          screenTopWarning('已恢复该帖在专栏的显示');
          return
        }
        target.innerHTML = hidden;
        screenTopWarning('已在专栏屏蔽该帖');
        return
      })
      .catch(function(e) {
        screenTopWarning(e)
      })
  }
  if(type === 'MF') {
    hidden = '在' + name + '显示';
    visible = '在' + name + '隐藏';
    target = geid('MFVisibility');
    nkcAPI('switchVInPersonalForum',{tid: tid})
      .then(function() {
        if(target.innerHTML === hidden) {
          target.innerHTML = visible;
          screenTopWarning('已恢复该帖在' + name + '的显示');
          return
        }
        target.innerHTML = hidden;
        screenTopWarning('已在' + name + '屏蔽该帖');
        return
      })
      .catch(function(e) {
        screenTopWarning(e)
      })
  }
  if(type === 'OF') {
    hidden = '在' + name + '显示';
    visible = '在' + name + '隐藏';
    target = geid('OFVisibility');
    nkcAPI('switchVInPersonalForum',{tid: tid})
      .then(function() {
        if(target.innerHTML === hidden) {
          target.innerHTML = visible;
          screenTopWarning('已恢复该帖在' + name + '的显示');
          return
        }
        target.innerHTML = hidden;
        screenTopWarning('已在' + name + '屏蔽该帖');
        return
      })
      .catch(function(e) {
        screenTopWarning(e)
      })
  }
}

function moveToPersonalForum(tid) {
  var target = geid('moveToPersonal')
  nkcAPI('moveToPersonalForum', {tid: tid})
    .then(function() {
      screenTopWarning('已将该帖送回个人专栏')
      target.innerHTML = '';
    })
      .catch(function(e) {
        screenTopWarning(e)
      })
}

function switchDInPersonalForum(tid, name, type) {
  var digest;
  var normal;
  var target;
  if(!name) {
    digest = '取消专栏加精';
    normal = '在专栏加精';
    target = geid('digest');
    nkcAPI('switchDInPersonalForum', {tid: tid})
      .then(function() {
        if(target.innerHTML === normal) {
          screenTopWarning('已将该帖在个人专栏加精');
          target.innerHTML = digest;
          return
        }
        screenTopWarning('已取消专栏加精');
        target.innerHTML = normal;
        return
      })
      .catch(function(e) {
        screenTopWarning(e.detail)
      })
  }
  if(type === 'MF') {
    digest = '在' + name + '取消加精';
    normal = '在' + name + '加精';
    target = geid('MFDigest');
    nkcAPI('switchDInPersonalForum', {tid: tid})
      .then(function() {
        if(target.innerHTML === normal) {
          screenTopWarning('已将该帖在' + name + '加精');
          target.innerHTML = digest;
          return
        }
        screenTopWarning('已取消在' + name + '的加精');
        target.innerHTML = normal;
        return
      })
      .catch(function(e) {
        screenTopWarning(e.detail)
      })
  }
  if(type === 'OF') {
    digest = '在' + name + '取消加精';
    normal = '在' + name + '加精';
    target = geid('OFDigest');
    nkcAPI('switchDInPersonalForum', {tid: tid})
      .then(function() {
        if(target.innerHTML === normal) {
          screenTopWarning('已将该帖在' + name + '加精');
          target.innerHTML = digest;
          return
        }
        screenTopWarning('已取消在' + name + '的加精');
        target.innerHTML = normal;
        return
      })
      .catch(function(e) {
        screenTopWarning(e.detail)
      })
  }
}

function switchTInPersonalForum(tid, name, type) {
  var topped;
  var normal;
  var target;
  if(!name) {
    topped = '取消专栏置顶';
    normal = '在专栏置顶';
    target = geid('topped');
    nkcAPI('switchTInPersonalForum', {tid: tid, type: type})
      .then(function() {
        if(target.innerHTML === normal) {
          screenTopWarning('已将该帖在个人专栏置顶');
          target.innerHTML = topped;
          return
        }
        screenTopWarning('已取消专栏置顶');
        target.innerHTML = normal;
        return
      })
      .catch(function(e) {
        screenTopWarning(e.detail)
      })
  }
  if(type === 'MF') {
    topped = '在' + name + '取消置顶';
    normal = '在' + name + '置顶';
    target = geid('MFTopped');
    nkcAPI('switchTInPersonalForum', {tid: tid, type: type})
      .then(function() {
        if(target.innerHTML === normal) {
          screenTopWarning('已将该帖在' + name + '置顶');
          target.innerHTML = topped;
          return
        }
        screenTopWarning('已取消该贴在' + name + '的置顶');
        target.innerHTML = normal;
        return
      })
      .catch(function(e) {
        screenTopWarning(e.detail)
      })
  }
  if(type === 'OF') {
    topped = '在' + name + '取消置顶';
    normal = '在' + name + '置顶';
    target = geid('OFTopped');
    nkcAPI('switchTInPersonalForum', {tid: tid, type: type})
      .then(function() {
        if(target.innerHTML === normal) {
          screenTopWarning('已将该帖在' + name + '置顶');
          target.innerHTML = topped;
          return
        }
        screenTopWarning('已取消该贴在' + name + '的置顶');
        target.innerHTML = normal;
        return
      })
      .catch(function(e) {
        screenTopWarning(e.detail)
      })
  }
}

function adSwitch(tid) {
  var btn = geid('adBtn');
  var nowIsAd = '取消首页置顶';
  var nowNormal = '首页置顶';
  nkcAPI('adSwitch', {tid: tid})
    .then(function() {
      if(btn.innerHTML === nowIsAd) {
        btn.innerHTML = nowNormal;
        return
      }
      btn.innerHTML = nowIsAd;
    })
    .catch(screenTopWarning)
}

