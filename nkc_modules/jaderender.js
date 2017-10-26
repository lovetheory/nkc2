

var helper = require('./helper');

var jade = require('jade');
var settings = require('./server_settings.js');

var moment = require('moment');
moment.locale('zh-cn');//yo!

var render = require('./nkc_render');

jade.filters.markdown = render.commonmark_render;
jade.filters.markdown_safe = render.commonmark_safe;
//jade.filters.bbcode = render.bbcode_render;
jade.filters.plain = render.plain_render;
jade.filters.thru = function(k){return k}
jade.filters.experimental = render.experimental_render

var jsdiff = require('diff')

function htmlDiff(earlier,later){
  var diff = jsdiff.diffChars(earlier,later)
  var outputHTML = ''

  diff.forEach(function(part){
    var stylestr = part.added?'DiffAdded':part.removed?'DiffRemoved':null
    part.value = render.plain_render(part.value)
    outputHTML += (stylestr?`<span class="${stylestr}">${part.value}</span>`:part.value)
  })

  return outputHTML
}

function fromNow(time){
  return moment(time).fromNow();
}

function dateTimeString(t){
  return moment(t).format('YYYY-MM-DD HH:mm')
}

function shortDateTimeString(t){
  var past = Date.now()-t
  if(past<18*3600000){
    return moment(t).format('HH:mm')
  }//12h
  else{
    return moment(t).format('M-D HH:mm')
  }
}

function getCertsInText(user){
  var perm = require('./permissions.js')

  var certs =  perm.calculateThenConcatCerts(user)

  var s = ''
  for(i in certs){
    var cname = perm.getDisplayNameOfCert(certs[i])
    s+=cname+' '
  }
  return s
}


function getUserDescription(user){
  return `${user.username}\n`+
    `学术分 ${user.xsf||0}\n`+
    `科创币 ${user.kcb||0}\n`+
    `${getCertsInText(user)}`
}
var jadeoptions = {
  seo_rewrite_mapping:settings.seo_rewrite_mapping,
  seo_reverse_rewrite:function(url){
    for(i in settings.seo_rewrite_mapping)
    {
      var map = i
      var to = settings.seo_rewrite_mapping[i].to

      url = url.replace(new RegExp(`^${to}((?:$|[^0-9]).*)`),map+'$1')
    }
    return url
  },
  markdown:render.commonmark_render,
  markdown_safe:render.commonmark_safe,
  bbcode:render.bbcode_render,
  plain:render.plain_render,
  experimental_render:render.experimental_render,
  dateString:dateString,
  shortDateTimeString,
  dateTimeString,
  fromNow:fromNow,
  htmlDiff,
  fromNowAbbr:function(t){
    return fromNow(t)
    .replace(/ 秒前/,'s')
    .replace(/ 小时前/,'h')
    .replace(/ 天前/,'d')
    .replace(/ 分钟前/,'m')
    .replace(/ 个月前/,'mo')
    .replace(/ 年前/,'y')
  },
  creditString:function(t){
    switch (t) {
      case 'xsf':
      return '学术分'
      break;
      case 'kcb':
      return '科创币'
      break;
      default:
      return '[未定义积分]'
    }
  },

  getDisplayNameOfCert:function(cert){
    var perm = require('./permissions.js')
    return perm.getDisplayNameOfCert(cert)
  },

  getUserDescription,

  toQueryString:function(object){
    var qs = ''
    for(key in object){
      var value = object[key]
      if(value){
        qs+= '&'+key.toString()+'='+ value.toString()
      }
    }
    return '?'+qs
  },

  testModifyTimeLimit:function(params,ownership,toc){
    try{
      require('./permissions.js').testModifyTimeLimit(params,ownership,toc)
    }catch(err){
      return false
    }
    return true
  },

  de_hide:function(str){
    return str.replace(/\[hide.*?].*?\[\/hide]/g,'')
  },

  digestText:function(str,length){
    length = length||100
    return jadeoptions.de_hide(str).replace(/\n|  |\[.+]|\<.+>/g,' ').slice(0,length).trim()
  },
};

Object.assign(jadeoptions,settings.jadeoptions); //apply settings from settings.js

function jaderender(filename,data){

  // for(k in jadeoptions)
  // {
  //   options[k] = jadeoptions[k];
  // }
  var options = jadeoptions;
  options.data = data;

  return jade.renderFile(filename,options);
};


module.exports = jaderender;

