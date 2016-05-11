var table = {};
module.exports = table;

module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path
var moment = require('moment') //packages you may need
var fs = require('fs.extra')
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var queryfunc = require('query_functions')
var AQL = queryfunc.AQL

//this is an example API
table.exampleOperation={
  operation:function(params){
    var user = params.user
    var someParameter = params.someParameter
    return {hello:'world',someParameter} //you may return immediate value or Promise here.
  },
  requiredParams:{
    someParameter:String, //declare parameters that are required for this operation
  },
  testPermission:function(params){ //optional method for extra permission tests. executed before operation
    var user = params.user //might be undefined, if accessible by visitors
    var someParameter = params.someParameter
    if(user._key.length>3)throw 'user id too long' //rejection
    return //return anything = acceptance
    //you may return immediate value or Promise here.
  }
}
