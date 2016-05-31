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

var jadeoptions = {
  markdown:render.commonmark_render,
  bbcode:render.bbcode_render,
  plain:render.plain_render,
  experimental_render:render.experimental_render,
  dateString:dateString,
  fromNow:fromNow,

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
