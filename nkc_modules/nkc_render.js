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
          '<a href="/r/$1" download><img src="/rt/$1"/><span>$2</span></a>'
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
    })
    .html
    .replace(/&#91;/g,'[')
    .replace(/&#93;/g,']')
    .replace(/\[[/]{0,1}backcolor[=#a-zA-Z0-9]{0,16}]/g,'')
  }

  render.plain_render = plain_escape;

  var getHTMLForResource = function(r){
    var rid = r._key
    var oname_safe = plain_escape(r.oname)
    var filesize = r.size

    var k = function(number){
      return number.toPrecision(3)
    }

    var fileSizeString = (filesize>1024)?((filesize>1024*1024)?k(filesize/1048576)+'M':k(filesize/1024)+'k'):k(filesize)+'b'

    var extension = r.oname.split('.').pop()

    var replaced = ''

    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'png':
      case 'svg':

      replaced =
      `<a href="/r/${rid}" target="_blank" title="${oname_safe}"><img class="PostContentImage" alt="${rid}" src="/r/${rid}" /></a><br/>`

      break;
      //audio section
      case 'mp3':
      case 'mid':
      case 'wma':
      case 'ogg':
      replaced =
      `<a href="/r/${rid}" download>${oname_safe}</a><br><audio src="/r/${rid}" controls preload="none">你的浏览器可能不支持audio标签播放音乐。升级吧。</audio>`

      break;

      case 'mp4'://these are standards
      case 'webm':
      case 'ogg':
      replaced =
      `<a href="/r/${rid}" download>${oname_safe}</a><br><video src="/r/${rid}" controls preload="none">你的浏览器可能不支持video标签播放视频。升级吧。</video>`

      break;

      default: replaced =
      `
      <div class="PostResourceDownload">
      <a class="PostResourceDownloadLink" href="/r/${rid}" download>
      <img class="PostResourceDownloadThumbnail" src="/default/default_thumbnail.png"/>${oname_safe}
      </a>
      <span class="PostResourceFileSize">${fileSizeString}</span>
      </div>
      `
    }

    return replaced
  }

  //replace attachment tags in text to their appropriate HTML representation
  var attachment_filter = function(stringToFilter,post){
    return stringToFilter.replace(/\{r=([0-9a-z]{1,16})\}/g,function(match,p1,offset,string){
      var rid = p1
      for(i in post.r){
        var r = post.r[i]
        if(r._key==rid){
          return getHTMLForResource(r)
        }
      }
      return '(查无附件:' + rid + ')'
    })
  }

  var bbcode_experimental = function(post){
    var content = post.c||''

    var html = render.bbcode_render(content)
    html = html.replace(/\n/g,'<br>').replace(/\[attachment=([0-9]{1,16})\]/g,'{r=$1}')
    html = attachment_filter(html,post)

    return html
  }

  var markdown_experimental = function(post){
    var parsed = commonreader.parse(input);
    var rendered = commonwriter.render(parsed)
    rendered = attachment_filter(rendered,post)

    return rendered;
  }

  render.experimental_render = function(post){
    var content = post.c||''
    var lang = post.l||''

    var renderedHTML = ''

    switch (lang) {
      case 'pwbb':
      renderedHTML = bbcode_experimental(post)
      break;
      case 'markdown':
      renderedHTML = markdown_experimental(post)
      break;
      default:
      renderedHTML = plain_escape(content)
    }

    return renderedHTML
  }

  return render;
}

var render = nkc_render();

if(in_browser){
}else{
  module.exports = render;
}
