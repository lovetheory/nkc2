var gallery = (function(){
  var gallery = {
    imageItem:geid('GalleryImage'),
    titleItem:geid('GalleryTitle'),
    authorItem:geid('GalleryAuthor'),
    forumName:geid('GalleryForumName'),
  }

  gallery.next = function(){
    var arr = gallery.arr
    var counter = gallery.counter
    var galleryItem = arr[counter]

    gallery.render(galleryItem)

    gallery.counter = (gallery.counter+1)%arr.length
  }

  gallery.click = function(){
    gallery.end()
    gallery.next()
    gallery.start()
  }

  gallery.start = function(){
    gallery.timer = setTimeout(function(){
      gallery.next()
      gallery.start()
    },6000)
  }

  gallery.end = function(){
    clearTimeout(gallery.timer)
  }

  gallery.render = function(galleryItem){

    var r = galleryItem.r
    var thread = galleryItem.thread
    var f = galleryItem.forum

    gallery.imageItem.src = '/r/'+ r._key

    gallery.titleItem.innerHTML = thread.oc.t.replace(/</g,'&lt;').replace(/>/g,'&gt;')
    gallery.titleItem.href = '/t/' + thread._key

    gallery.authorItem.innerHTML = thread.ocuser.username
    gallery.authorItem.href = '/user_profile/' + thread.ocuser._key

    gallery.forumName.innerHTML = f.display_name
    gallery.forumName.href = '/f/' + f._key
  }

  gallery.init = function(){
    gallery.imageItem.addEventListener('click',gallery.click)

    console.log('gallery init...');
    return nkcAPI('getGalleryRecent')
    .then(function(arr){
      gallery.arr = arr
      gallery.counter = Math.floor(Math.random()*arr.length)
    })
    .catch(jwarning)
  }

  return gallery
})()

gallery.init().then(function(){
  gallery.next()
  gallery.start()
})
