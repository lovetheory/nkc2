function enterManagementMode(){
  $('.ThreadCheckboxes').show()
  $('.ForumManagement').show()
}

function applyAll(f){
  return common.mapWithPromise(extractCidArray(),f)
}

function moveThread(tid,fid){
  return nkcAPI('moveThread',{
    tid:tid,
    fid:fid,
  })
  .then(function(){
    screenTopAlert(tid + ' 已送 ' + fid)
  })
  .catch(function(){
    screenTopWarning(tid+ ' 无法送 ' + fid)
  })
}

function recyclebtn(){
  if(moveThreadToForum('recycle'))geid('recyclebtn').disabled = true
}

function addColl(tid){
  return nkcAPI('addThreadToCollection',{tid:tid})
  .then(function(res){
    screenTopAlert('已收藏 '+tid)
  })
  .catch(jwarning)
}

function extractfid(){
  var targetforum = gv('TargetForum').trim().split(':')
  if(targetforum.length!==2)return screenTopWarning('请选择一个目标')
  targetforum = targetforum[0]
  return targetforum
}

function moveThreadTo(){
  var fid = extractfid()
  if(moveThreadToForum(fid))geid('moveThreadTo').disabled=true
}

function moveThreadToForum(fid){

  applyAll(function(tid){
    return moveThread(tid,fid)
  })
  .then(function(){
    window.location.reload()
  })
  .catch(jwarning)

  return true
}

function addSelectedToMyCollection(){
  geid('addSelectedToMyCollection').disabled = true

  applyAll(function(item){
    return addColl(item)
  })
  .then(function(){
    geid('addSelectedToMyCollection').disabled = false
  })
  .catch(jwarning)
}
