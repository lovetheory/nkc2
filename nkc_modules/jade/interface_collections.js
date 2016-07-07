var cidbox = geid('cid')
var categorybox = geid('category')

function select(cid){
  cidbox.value = cidbox.value+cid+','
}

function extractCidArray(){
  return cidbox.value.split(',').filter(function(item){return item.length>1})
}

function applyAsyncFunc(arr,func,k){
  k = k||0
  return Promise.resolve()
  .then(function(){
    if(!arr.length||k==arr.length){
      throw 1
    }
    return func(arr[k])
  })
  .then(function(){
    return applyAsyncFunc(arr,func,k+1)
  })
  .catch(function(err){
    return err
  })
}

var movebutton = geid('movebtn')

function movebtn(){
  var targetCategory = categorybox.value.trim()
  if(targetCategory.length==0){
    screenTopWarning('请填写分类')
    return
  }

  movebutton.disabled = true

  applyAsyncFunc(extractCidArray(),function(item){
    return nkcAPI('moveCollectionItemToCategory',{cid:item,category:targetCategory})
    .then(function(){
      screenTopAlert(item + '移动到' +targetCategory)
    })
    .catch(function(){
      screenTopWarning(item+ '移动失败')
    })
  })
  .then(function(){
    window.location.reload()
  })
}

function moveTo(targetCategory){
  categorybox.value=targetCategory
  movebtn()
}

function deletebtn(){
  geid('deletebutton').disabled = true
  applyAsyncFunc(extractCidArray(),function(item){
    
    return nkcAPI('removeCollectionItem',{
      cid:item
    })
    .then(function(){
      screenTopAlert(item + '已删除')
    })
    .catch(function(){
      screenTopWarning(item+ '删除失败')
    })
  })
  .then(function(){
    window.location.reload()
  })
}
