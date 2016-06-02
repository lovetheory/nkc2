module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var helper = require('helper');

var jade = require('jade');
var settings = require('server_settings.js');

var moment = require('moment');
moment.locale('zh-cn');//yo!

var render = require('nkc_render');

jade.filters.markdown = render.commonmark_render;
//jade.filters.bbcode = render.bbcode_render;
jade.filters.plain = render.plain_render;

jade.filters.experimental = render.experimental_render

function fromNow(time){
  return moment(time).fromNow();
}

function dateTimeString(t){
  return moment(t).format('YYYY-MM-DD hh:mm')
}


function getCertsInText(user){
  var perm = require('permissions')

  var certs =  perm.calculateThenConcatCerts(user)
  console.log(user.username,certs);

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
  markdown:render.commonmark_render,
  bbcode:render.bbcode_render,
  plain:render.plain_render,
  experimental_render:render.experimental_render,
  dateString:dateString,
  dateTimeString,
  fromNow:fromNow,
  
  getDisplayNameOfCert:function(cert){
    var perm = require('permissions')
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
      require('permissions').testModifyTimeLimit(params,ownership,toc)
    }catch(err){
      return false
    }
    return true
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
