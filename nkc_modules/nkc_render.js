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
    var XBBCODE = require(__projectroot+'external_pkgs/xbbcode/xbbcode');
  }


  var commonreader = new commonmark.Parser();
  var commonwriter = new commonmark.HtmlRenderer({
    sourcepos:true,
    safe:true, //ignore <tags>
  });

  render.plain_render = plain_escape;

  var getHTMLForResource = function(r){
    var rid = r._key
    var oname_safe = plain_escape(r.oname)
    var filesize = r.size

    var k = function(number){
      return number.toPrecision(3)
    }

    var fileSizeString = (filesize>1024)?((filesize>1048576)?k(filesize/1048576)+'M':k(filesize/1024)+'k'):k(filesize)+'b'

    var extension = r.ext

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
      return plain_escape('(附件:' + rid + ')')
    })
  }

  var pwbb_experimental = function(post){
    var content = post.c||''

    var html =
    XBBCODE.process({
      text:content,
    })
    .html
    .replace(/&#91;/g,'[')
    .replace(/&#93;/g,']')
    .replace(/\[[/]{0,1}backcolor[=#a-zA-Z0-9]{0,16}]/g,'')

    // for history reasons...

    .replace(/\n/g,'<br>')
    .replace(/\[attachment=([0-9]{1,16})\]/g,'{r=$1}')
    .replace(/\[\/?align=.*?]/g,'')
    .replace(/\[flash=[0-9]{1,4},[0-9]{1,4}[0-9,]{0,3}](.+.*?)\[\/flash]/gi,
    '<embed class="PostEmbedFlash" src="$1" allowFullScreen="true" quality="high" allowScriptAccess="always" type="application/x-shockwave-flash"></embed>')

    html = attachment_filter(html,post)

    return html
  }

  var markdown_experimental = function(post){
    var parsed = commonreader.parse(post.c);
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
      renderedHTML = pwbb_experimental(post)
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
