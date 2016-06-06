var nkc_editor = function(){
  var editor = {};

  editor.assemblePostObject = function(){
    var post = {
      t:gv('title').trim(),
      c:gv('content').trim(),
      l:gv('lang').toLowerCase().trim(),
    }

    if(post.t=='')post.t=undefined

    return post
  }

  editor.submit = function(){
    var post = editor.assemblePostObject()

    var target = gv('target').trim();

    if(post.c==''){screenTopWarning('请填写内容。');return;}
    if(target==''){screenTopWarning('请填写发表至的目标。');return;}

    return nkcAPI('postTo',{
      target:target,
      post:post,
    })
    .then(function(result){
      var redirectTarget = result.redirect;
      redirect(redirectTarget?redirectTarget:'/'+target)
    })
    .catch(jwarning)
  }

  var debounce=false;
  editor.update = function(e){
    //console.log(debounce,e);
    if(!debounce)
    {
      var post = editor.assemblePostObject()
      var title = post.t||""
      hset('parsedtitle',title); //XSS prone.

      var content = post.c
      var parsedcontent = '';

      parsedcontent = render.experimental_render(post)

      hset('parsedcontent',parsedcontent); //XSS prone

      ReHighlightEverything() //interface_common code highlight

      if(e==='reenter'){
        //enough!
        debounce=false;
      }
      else{
        debounce = true;
        setTimeout(function(){
          debounce=false;
          editor.update('reenter');
        },500);
      }
    }
  }

  //enable click
  geid('title').addEventListener('keyup', editor.update);
  //enable click
  geid('content').addEventListener('keyup', editor.update);

  geid('post').addEventListener('click', editor.submit);
  geid('lang').addEventListener('change',editor.update);

  return editor;
}

var editor = nkc_editor();

editor.update();
