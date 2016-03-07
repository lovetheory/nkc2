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
        alert('failure: '+back);
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

  //var commonmark = window.commonmark;
  var commonreader = new commonmark.Parser();
  var commonwriter = new commonmark.HtmlRenderer({ sourcepos: true });
  function commonmarkconvert(cont){
    var parsed = commonreader.parse(cont); // parsed is a 'Node' tree
    // transform parsed if you like...
    var result = commonwriter.render(parsed); // result is a String
    return result;
  }

  function bbcodeconvert(input){
    return XBBCODE.process({
      text:input,
    }).html;
  }

  editor.update = function(){
    var title = gv('title');
    hset('parsedtitle',title); //XSS prone.

    var content = gv('content');
    var parsedcontent = '';

    switch(gv('lang').toLowerCase()){
      case 'markdown':
      parsedcontent = commonmarkconvert(content);break;
      case 'bbcode':
      parsedcontent = bbcodeconvert(content);break;
      case 'plain':
      default:
      parsedcontent = plain_escape(content);break;
    };

    hset('parsedcontent',parsedcontent); //XSS prone
  }

  //enable click
  geid('title').addEventListener('keyup', editor.update);
  //enable click
  geid('content').addEventListener('keyup', editor.update);
  geid('post').addEventListener('click', editor.submit);

  return editor;
}

var editor = nkc_editor();

geid('content').update_view = editor.update;
