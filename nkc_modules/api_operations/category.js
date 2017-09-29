

var moment = require('moment')
var path = require('path')
var fs = require('fs.extra')
var settings = require('../server_settings.js');
var helper_mod = require('../helper.js')();
var queryfunc = require('../query_functions')
var validation = require('../validation')
var AQL = queryfunc.AQL
var apifunc = require('../api_functions')

var layer = require('../layer')

var permissions = require('../permissions')

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

table.modifyThreadType = {
  operation:function(params){

    var op = params.op
    var cid = params.cid
    var fid = params.fid
    var name = params.name

    var selector = `let t = document(threadtypes,@cid)`

    switch (op) {
      case 'rename':
      return AQL(`${selector} update t with {name:@name} in threadtypes`,{cid,name})

      case 'remove':
      return AQL(`${selector} remove t in threadtypes`,{cid})

      case 'add':
      return queryfunc.incr_counter('threadtypes')
      .then(newcid=>{
        return AQL(`insert {_key:@cid, fid:@fid, name:@name} in threadtypes`,{fid, cid:newcid,name})
      })

      default:
      throw 'please specify valid option for `op`.'
    }

  },
  requiredParams:{
    //cid:String,
    op:String,
  }
}
