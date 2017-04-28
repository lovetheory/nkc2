

var table = {};
module.exports = table;

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

table.addThreadToCollection = {
  operation:function(params){
    var c = new layer.Collection()
    return c.save({
      tid:params.tid,
      uid:params.user._key,
      toc:Date.now(),
    })
  },
  requiredParams:{
    tid:String,
  }
}

table.listMyCollectionOfCategory = {
  init:function(){
    return queryfunc.createIndex('collections',{
      fields:['uid','category'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
  },
  operation:function(params){
    var category = params.category||null
    var uid = params.uid||params.user._key

    return AQL(`
      for c in collections
      filter c.uid == @uid && c.category == @category

      let t = document(threads,c.tid)

      let oc = document(posts,t.oc)
      let lm = document(posts,t.lm)
      let ocuser = document(users,oc.uid)
      let lmuser = document(users,lm.uid)

      return merge(c,{thread:merge(t,{oc,lm,ocuser,lmuser})})

      `,{uid,category}
    )
  },
  requiredParams:{

  }
}

table.listMyCategories={
  operation:function(params){
    var uid = params.uid||params.user._key
    return AQL(`
      for c in collections
      filter c.uid == @uid
      collect cs = c.category
      return cs
      `,{uid}
    )
  }
}

table.removeCollectionItem = {
  operation:function(params){
    var c = new layer.Collection(params.cid)
    return c.remove()
  },
  requiredParams:{
    cid:String,
  }
}

table.moveCollectionItemToCategory = {
  operation:function(params){
    var c = new layer.Collection(params.cid)
    return c.update({category:params.category})
  },
  requiredParams:{
    cid:String,
    category:String,
  }
}
