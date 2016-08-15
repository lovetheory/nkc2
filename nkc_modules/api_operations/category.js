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

var layer = require('layer')

var permissions = require('permissions')

var table = {};
module.exports = table;

table.getForumCategories = {
  operation:function(params){
    return AQL(`for t in threadtypes filter t.fid == @fid sort t.order return t`,{fid:params.fid})
  },
  requiredParams:{
    fid:String,
  }
}
