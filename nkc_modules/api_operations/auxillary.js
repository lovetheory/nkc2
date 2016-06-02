module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var moment = require('moment')
var path = require('path')
var fs = require('fs.extra')
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var queryfunc = require('query_functions')
var validation = require('validation')
var AQL = queryfunc.AQL
var apifunc = require('api_functions')

var permissions = require('permissions')

var table = {};
module.exports = table;

table.getPostContent = {
  operation:function(params){
    var pid = params.pid

    var j = require('jaderender')

    return queryfunc.doc_load(pid,'posts')
    .then(p=>{
      return queryfunc.doc_load(p.uid,'users')
      .then(u=>{
        return {
          username:u.username,
          _key:p._key,
          toc:p.toc,
          c:p.c,
        }
      })
    })
  },
  requiredParams:{
    pid:String,
  }
}
