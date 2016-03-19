var in_browser = (typeof document !== 'undefined');

//render source to HTML.
function nkc_render(options){
  var render = {};

  if(in_browser){
    //browser mode
    //inclusion here done by <script>
    var commonmark = window.commonmark;
    var plain_escape = window.plain_escape;
    var XBBCODE = window.XBBCODE;
    console.log('nkc_render.js running in browser.');
  }else{
    //nodejs
    module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

    var commonmark = require('commonmark');
    var plain_escape = require('jade/plain_escaper');
    var XBBCODE = require('xbbcode/xbbcode');
  }

  var replacement_rules = [
    // {
    //   regex:/\[r\=([0-9A-Za-z]*)]/g, //XSS proof
    //   new:
    //   '<a href="/r/$1" target="_blank"><img alt="$1" src="/r/$1" /></a><br/>'
    //   //'<img alt="$1" src="/r/$1" class="img-responsive"/>'
    // },
    // //image element when [r=1234]
    //
    // {
    //   regex:/\[rt\=([0-9A-Za-z]*)\]\[([^\/\\\:\*\?\"\<\>\|]*)\/]/g, //XSS proof: filenames overkilled
    //   new:'<a href="/r/$1" target="_blank"><img src="/rt/$1"/>$2</a>'
    //   // function(match,p1,p2){
    //   //   return '<a href="/r/$1" target="_blank"><img src="/rt/$1"/>$2</a>'.replace(/\$1/g,p1).replace(/\$2/g,render.plain_render(p2));
    //   // }
    // },
    // //thumbnail element when [rt=1s234][file.ext/]
    {
      regex:/\%{r=([a-zA-Z0-9]{1,})\\([^ \\\:\*\?\"\<\>\|\n]{2,})\\([^\/\\\:\*\?\"\<\>\|\n]*)\/}/g,
      //%{r=rid\mime/type\filename.ext/}

      new:
      function(match,rid,mime,filename){
        var replaced = '';
        console.log(rid,mime,filename)
        switch (mime) {
          //image section
          case 'image/jpeg':
          case 'image/gif':
          case 'image/png':
          case 'image/svg+xml':
          replaced =
          '<a href="/r/$1" target="_blank" title="$2"><img alt="$1" src="/r/$1" /></a><br/>'
          .replace(/\$1/g,rid)
          .replace(/\$2/g,filename)
          break;

          //audio section
          case 'audio/mpeg':
          case 'audio/mp3':
          case 'audio/mid':
          case 'audio/x-mpegurl':
          case 'audio/x-ms-wma':
          case 'audio/webm':
          case 'audio/ogg':
          replaced =
          '<a href="/r/$1" download>$2</a><br><audio src="/r/$1" controls preload="none">你的浏览器可能不支持audio标签播放音乐。升级吧。</audio>'
          .replace(/\$1/g,rid)
          .replace(/\$2/g,filename)
          break;

          //video section
          //case 'video/x-ms-wmv':
          replaced =
          '<embed src="/r/$1" style="max-width:100%;" type="video/x-ms-wmv" />'
          .replace(/\$1/g,rid)
          .replace(/\$2/g,filename)
          break;

          case 'video/mp4'://these are standards
          case 'video/webm':
          case 'video/ogg':
          replaced =
          '<a href="/r/$1" download>$2</a><br><video src="/r/$1" controls preload="none">你的浏览器可能不支持video标签播放视频。升级吧。</video>'
          .replace(/\$1/g,rid)
          .replace(/\$2/g,filename)
          break;

          default: replaced =
          '<a href="/r/$1" download><img src="/rt/$1"/>$2</a>'
          .replace(/\$1/g,rid)
          .replace(/\$2/g,filename)
        }

        return replaced;
      },
    },
  ];

  var commonreader = new commonmark.Parser();
  var commonwriter = new commonmark.HtmlRenderer({
    sourcepos:true,
    safe:true, //ignore <tags>
  });

  render.commonmark_render = function(input){
    var parsed = commonreader.parse(input);
    var rendered = commonwriter.render(parsed)

    for(i in replacement_rules) //post replacement
    {
      rendered = rendered.replace(replacement_rules[i].regex,replacement_rules[i].new);
    }
    return rendered;
  }

  render.bbcode_render = function(input){
    return XBBCODE.process({
      text:input,
    }).html;
  }

  render.plain_render = plain_escape;

  return render;
}

var render = nkc_render();

if(in_browser){
}else{
  module.exports = render;
}
