//api content request handlers
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var moment = require('moment')
var path = require('path')
var fs = require('fs.extra')
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();

var operationTable = {}

operationTable.modificationTable = { //table for modification operations.
  moveThread:{
    operation:function(params){
      //do something to move the thread
    },
    requiredParams:{
      tid:String,
      fid:String,
    },
    testPermission:function(params){
      //get original fid of given tid, and check if user is moderator to fid.
      //if(getThread(params.tid).owner.indexOf(params.user)<0) return Promise.reject('you cant move that')
      return Promise.resolve()
    },
  },
  removePost:{
    operation:function(params){
      //do something to remove the post, my friend
    },
    requiredParams:{
      pid:String,
    }
  }
}

module.exports = operationTable
