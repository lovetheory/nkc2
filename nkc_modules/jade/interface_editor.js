function submit(){
  var body = {
    t:gv('title').trim(),
    c:gv('content').trim(),
    l:gv('lang').toLowerCase().trim(),
  };

  var target = gv('target').trim();

  post_api(target,body,function(err,back){
    if(err){
      alert('not 200 failure: '+back);
    }else{
      brrr=JSON.parse(back).redirect;
      if(brrr){
        redirect('/interface/'+brrr);
      }else {
        redirect('/interface/'+target);
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

function update(){
  hset('parsedtitle',gv('title'));

  switch(gv('lang').toLowerCase()){
    case 'markdown':
    hset('parsedcontent',commonmarkconvert(gv('content')));break;
    case 'bbcode':
    hset('parsedcontent',bbcodeconvert(gv('content')));break;
    case 'plain':
    default:
    hset('parsedcontent',plain_escape(gv('content')));break;
  };
}
