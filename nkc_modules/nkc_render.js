//render source to HTML.
function nkc_render(options){
  var in_browser = (typeof document !== 'undefined');
  var render = {};

  if(in_browser){
    //browser mode
    //inclusion here done by <script>
    var commonmark = window.commonmark;
    var plain_escape = window.plain_escape;
    var XBBCODE = window.XBBCODE;
    console.log('in browser.');
  }else{
    //nodejs
    module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

    var commonmark = require('commonmark');
    var plain_escape = require('jade/plain_escaper');
    var XBBCODE = require('xbbcode/xbbcode');
  }

  var replacement_rules = [
    {
      regex:/\[r\=([0-9A-Za-z]*)]/g, //XSS proof
      new:'<a href="/r/$1" target="_blank"><img alt="$1" src="/r/$1" style="max-width:100%;"/></a>'
    },
    //image element when [r=1234]

    {
      regex:/\[rt\=([0-9A-Za-z]*)]\[([^\/\\\:\*\?\"\<\>\|]*)\/]/g, //XSS proof: filenames overkilled
      new:'<a href="/r/$1" target="_blank"><img src="/rt/$1"/>$2</a>'
      // function(match,p1,p2){
      //   return '<a href="/r/$1" target="_blank"><img src="/rt/$1"/>$2</a>'.replace(/\$1/g,p1).replace(/\$2/g,render.plain_render(p2));
      // }
    },
    //thumbnail element when [rt=1234][file.ext/]
  ];

  var commonreader = new commonmark.Parser();
  var commonwriter = new commonmark.HtmlRenderer({
    sourcepos:true,
    safe:true, //ignore <tags>
  });

  render.commonmark_render = (input)=>{
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

  if(in_browser){
  }else{
    module.exports = render;
  }

  return render;
}

var render = nkc_render();
