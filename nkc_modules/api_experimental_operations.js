//api content request handlers
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var moment = require('moment')
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var queryfunc = require('query_functions')
var AQL = queryfunc.AQL

var operations = {}

var table = {} //table of operations.

//inclusion from other files
var externalTables = [
  require('api_experimental_operations/management'),
  require('api_experimental_operations/content'),
];

for(i in externalTables){
  for(k in externalTables[i]){
    table[k] = externalTables[i][k]
  }
}

//this is an example API
table.exampleOperation={
  operation:function(params){
    //what clientside receives:
    return {hello:'world',someParameter:params.someParameter} //you may return value or Promise here.
  },
  requiredParams:{
    someParameter:String,
  }
}

table.listAllOperations = {
  operation:operations.listAll,
}

operations.table = table

var ops = {}
for(i in operations.table){
  ops[i]=true;
}

operations.listAll = function(){
  return ops;
}

module.exports = operations
