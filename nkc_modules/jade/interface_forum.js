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
  geid('recyclebtn').disabled = true
  applyAll(function(item){
    return moveThread(item,'recycle')
  })
  .then(function(){
    window.location.reload()
  })
  .catch(jwarning)
}

function addColl(tid){
  return nkcAPI('addThreadToCollection',{tid:tid})
  .then(function(res){
    screenTopAlert('已收藏 '+tid)
  })
  .catch(jwarning)
}

function moveThreadToForum(fid){
  geid('moveThreadToForum').disabled=true
  applyAll(function(tid){
    return moveThread(tid,fid)
  })
  .then(function(){
    window.location.reload()
  })
  .catch(jwarning)
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
