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

table.disablePost = {
  operation:function(params){
    return queryfunc.doc_update(params.pid,'posts',{disabled:true})
  },
  requiredParams:{
    pid:String,
  },
  testPermission:function(params){
    return 0;
  },
}

table.addThreadToCart={
  operation:function(params){
    var uid = params.user._key
    var tid = params.tid.toString()
    return AQL(`
      let u = document(users,@uid)
      update u with { cart:SLICE(UNIQUE(PUSH(u.cart,@cid)),-30) } in users
      `,{
        uid:uid,
        cid:'threads/'+tid,
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
    var pid = params.pid.toString()
    return AQL(`
      let u = document(users,@uid)
      update u with { cart:SLICE(UNIQUE(PUSH(u.cart,@cid)),-30) } in users
      `,{
        uid:uid,
        cid:'posts/'+pid,
      }
    )
  },
  requiredParams:{
    pid:String,
  }
}

table.listCart={
  operation:function(params){
    var cart = params.user.cart?params.user.cart:[];
    return AQL(
      `
      for i in @cart
      let c = document(i)
      filter c != null
      let oc = document(posts,c.oc)
      return merge(c,{oc})
      `
      ,{
        cart,
      }
    )
  },
}

table.clearCart={
  operation:function(params){
    var uid = params.user._key
    return queryfunc.doc_update(uid,'users',{cart:[]})
  }
}

table.setDigest={
  operation:function(params){
    var tid = params.tid
    return queryfunc.doc_update(tid,'threads',{digest:true})
  },
  requiredParams:{
    tid:String,
  }
}
