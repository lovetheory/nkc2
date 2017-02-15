//api content request handlers
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var moment = require('moment')
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var queryfunc = require('query_functions')
var AQL = queryfunc.AQL

var operations = {}

var table = {} //table of operations.
operations.table = table

var normalizedPath = __projectroot+'nkc_modules/api_operations/'

//inclusion from other files
var externalTables = [];

require("fs").readdirSync(normalizedPath).forEach(function(file) {
  if(file.toString().split('.').pop().toLowerCase()=='js'){
    externalTables.push(require("./api_operations/" + file));
    report('loaded from ' + file.toString())
  }
});

for(i in externalTables){
  for(k in externalTables[i]){
    table[k] = externalTables[i][k]
    if(table[k].init){
      table[k].init()
    }
  }
}

table.listAllOperations = {
  operation:operations.listAll,
}

var ops = {}
for(i in table){
  ops[i]=true;
}
operations.listAll = function(){
  return ops;
}

require('permissions').certificates.dev.permittedOperations = Object.assign(
  require('permissions').certificates.dev.permittedOperations,
  operations.listAll()
) //grandmaster

module.exports = operations
