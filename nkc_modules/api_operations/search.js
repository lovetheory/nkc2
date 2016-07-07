var table = {};
module.exports = table;

module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path
var moment = require('moment') //packages you may need
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var queryfunc = require('query_functions')
var AQL = queryfunc.AQL

//this is an example API
table.useSearch = {
  init:function(){
    return queryfunc.createIndex('logs',{
      fields:['searchstring'],
      type:'skiplist',
      unique:'false',
      sparse:'true',
    })
  },
  operation:function(params){
    var user = params.user
    var searchstring = params.searchstring

    return queryfunc.doc_save({
      uid:user?user._key:null,
      searchstring,
      search:1,
      t0:Date.now(),
    },'logs')
  },
  requiredParams:{
    searchstring:String, //declare parameters that are required for this operation
  },
  testPermission:function(params){ //optional method for extra permission tests. executed before operation

  }
}
