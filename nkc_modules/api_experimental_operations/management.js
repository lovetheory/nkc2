module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var moment = require('moment')
var path = require('path')
var fs = require('fs.extra')
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var queryfunc = require('query_functions')
var AQL = queryfunc.AQL

var table = {};
module.exports = table;

table.moveThread = {
  operation:function(params){
    //check if fid exists
    return queryfunc.doc_load(params.fid,'forums')
    .then(doc=>{
      //do something to move the thread
      return queryfunc.doc_update(params.tid,'threads',{fid:params.fid})
    })
  },
  requiredParams:{
    tid:String,
    fid:String,
  },
  testPermission:function(params){
    //get original fid of given tid, and check if user is moderator to fid.
    //if(getThread(params.tid).owner.indexOf(params.user)<0) return Promise.reject('you cant move that')

    return 0;
  },
}

table.addThreadToCart={
  operation:function(params){
    var uid = params.user._key
    var tid = params.tid
    return AQL(`
      for u in users
      filter u._key == @uid
      update u with { cart:SLICE(UNIQUE(PUSH(u.cart,@obj)),-30) } in users
      `,{
        uid,
        obj:{
          itemtype:'thread',
          id:tid
        },
      }
    )
  },
  requiredParams:{
    tid:String,
  }
}

table.addPostToCart={
  operation:function(params){
    var uid = params.user._key
    var pid = params.pid
    return AQL(`
      for u in users
      filter u._key == @uid
      update u with { cart:SLICE(UNIQUE(PUSH(u.cart,@obj)),-30) } in users
      `,{
        uid:uid,
        obj:{
          itemtype:'post',
          id:pid
        },
      }
    )
  },
  requiredParams:{
    pid:String,
  }
}

table.listCart={
  operation:function(params){
    var uid=params.user._key
    return AQL(
      `
      for u in users filter u._key == @uid

      let threads=(
        for i in u.cart
        filter i.itemtype == 'thread'
        for t in threads
        filter t._key == i.id
        return t
      )

      let posts=(
        for i in u.cart
        filter i.itemtype == 'post'
        for t in posts
        filter t._key == i.id
        return t
      )

      return UNION(threads,posts)
      `
      ,{
        uid:uid,
      }
    )
    .then(res=>{
      return res[0];
    })
  },
}

table.clearCart={
  operation:function(params){
    var uid = params.user._key
    return queryfunc.doc_update(uid,'users',{cart:[]})
    return AQL(`
      for u in users
      filter u._key == @uid
      update u with { cart:[] } in users
      `,{
        uid:uid,
      }
    )
  }
}
