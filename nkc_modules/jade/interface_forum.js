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

function moveThreadToForum(fid){
  if(!confirm('确定要把 选中帖子 移动到 '+fid+' 吗？'))return false;
  geid('moveThreadToForum').disabled=true

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
