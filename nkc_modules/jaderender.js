module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var helper = require('helper');

var jade = require('jade');
var settings = require('server_settings.js');
var commonmark = require('commonmark');
var plain_escape = require('jade/plain_escaper');
var xbbcode = require('xbbcode/xbbcode');

function bbcodeconvert(input){
  return xbbcode.process({
    text:input,
  }).html;
}

var commonreader = new commonmark.Parser();
var commonwriter = new commonmark.HtmlRenderer();
var commonparser = (input)=>{return commonwriter.render(commonreader.parse(input));} // result is a String

jade.filters.markdown = commonparser;
jade.filters.bbcode = bbcodeconvert;
jade.filters.plain = plain_escape;

var jadeoptions = {
  markdown:commonparser,
  bbcode:bbcodeconvert,
  plain:plain_escape,
  'dateString':dateString,

};

Object.assign(jadeoptions,settings.jadeoptions); //apply settings from settings.js

function jaderender(filename,options){
  for(k in jadeoptions)
  {
    options[k] = jadeoptions[k];
  }

  return jade.renderFile(filename,options);
};

module.exports = jaderender;
