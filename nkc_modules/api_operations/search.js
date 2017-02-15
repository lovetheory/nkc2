var table = {};
module.exports = table;

module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path
var moment = require('moment') //packages you may need
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var queryfunc = require('query_functions')
var AQL = queryfunc.AQL

//this is an example API
table.useSearch = {   //写log
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

var elastic = require('../../elastic.js')

table.localSearch = {  //头部的搜索API
  operation:params=>{
    params.start = Number(params.start)||0
    params.count = Math.min(100,Number(params.count)||10) //shall not exceed 100, for performance considerations
    params.users_start = Number(params.users_start)||0
    params.users_count = Number(params.users_count)||10

    var ss = params.searchstring

    if(ss.trim().length<1){
      throw '输入不能为空'
    }

    var sss = '%'+ss+'%'
    var data = {}

    return elastic.searchAdvanced(ss,params.start,params.count)
     .then(res=>{
       data.result = res
       return get_user(ss)
     })
     .then(res=>{
       data.match_one_user = res
       return get_match_users(sss, ss, params.users_start, params.users_count)
     })
     .then(res=>{
       data.match_users = res
       return data
     })
  },
  requiredParams:{
    searchstring:String,
  }
}



function get_user(un){
  return AQL
  (
    `for u in users
     filter u.username == @un
     return u
    `,
    {un:un}
  )
}


function get_match_users(un1,un2,start,count){
  return AQL
  (
    `for u in users
     filter u.username like @un1 && u.username != @un2
     limit @start , @count
     return u
    `,
    {un1:un1,un2:un2,start:start,count:count}
  )
}
