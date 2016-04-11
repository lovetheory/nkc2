var nkc_editor = function(){
  var editor = {};

  editor.submit = function(){
    var body = {
      t:gv('title').trim(),
      c:gv('content').trim(),
      l:gv('lang').toLowerCase().trim(),
    };

    var target = gv('target').trim();

    if(body.c==''){alert('请填写内容。');return;}
    if(target==''){alert('请填写发表至的目标。');return;}


    post_api(target,body,function(err,back){
      if(err){
        alert(err);
      }else{
        brrr=JSON.parse(back).redirect;
        if(brrr){
          redirect('/'+brrr);
        }else {
          redirect('/'+target);
        }
      }
    });
  }

  var debounce=false;
  editor.update = function(e){
    //console.log(debounce,e);
    if(!debounce)
    {
      var title = gv('title');
      hset('parsedtitle',title); //XSS prone.

      var content = gv('content');
      var parsedcontent = '';

      switch(gv('lang').toLowerCase()){
        case 'markdown':
        parsedcontent = render.commonmark_render(content);break;
        case 'bbcode':
        parsedcontent = render.bbcode_render(content);break;
        case 'plain':
        default:
        parsedcontent = render.plain_render(content);break;
      };

      hset('parsedcontent',parsedcontent); //XSS prone

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
