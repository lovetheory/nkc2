

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

var api = (apiName,op,rp)=>{
  table[apiName] = {
    operation:op,
    requiredParams:rp
  }
}

var getCountFromDayRanges = function(dayranges){
  return AQL(`
    for r in @dayranges
    let count = (
      for p in posts
      filter p.toc>r.start && p.toc<r.end
      collect with count into k return k
    )[0]

    let count_disabled = (
      for p in posts
      filter p.toc>r.start && p.toc<r.end && p.disabled
      collect with count into k return k
    )[0]

    let user_registered = (
      for u in users
      filter u.toc>r.start && u.toc<r.end
      collect with count into k return k
    )[0]

    return {start:r.start,user_registered,count,count_disabled}

    `,{dayranges}
  )
}

var getRangesFromTimeStamps = (timestamps)=>{
  var dayranges = []
  for(i=0;i<timestamps.length-1;i++){
    dayranges.push({
      start:timestamps[i],
      end:timestamps[i+1]
    })
  }
  return dayranges
}

var getCountFromTimeStamps = (timestamps)=>{
  return getCountFromDayRanges(getRangesFromTimeStamps(timestamps.sort((i1,i2)=>i1-i2)))
}

queryfunc.createIndex('users',{
  fields:['toc'],
  type:'skiplist',
  unique:'false',
  sparse:'false',
})

var tlv = 0
var buffer = []
api('getStatDaily',params=>{
  var daystamps = []
  var today = Date.now()
  daystamps.push(today)

  today = today - today%86400000 //zero moment of today
  for(i=0;i<240;i++){
    daystamps.push(today-i*86400000)
  }

  if(tlv>Date.now()-10000)//within 10s
  {
    return buffer
  }
  else{
    return getCountFromTimeStamps(daystamps)
    .then(res=>{
      buffer=res
      tlv=Date.now()
      return res
    })
  }

})

var xsflimit = require('../misc/xsflimit')

var getRateLimiter = function(milliseconds){
  var hashtable = {}

  function testLimit(entryKey){
    var dn = Date.now()
    var tooFrequent = hashtable[entryKey]>dn-milliseconds
    hashtable[entryKey] = dn

    if(tooFrequent){
      //too frequent
      throw 'requesting too frequent'
    }
  }

  return testLimit
}

var checklimit = getRateLimiter(3000)

api('getLatestPosts',params=>{
  checklimit(params.user._key)

  return AQL(`
    for p in posts
    sort p.toc desc
    let u = document(users,p.uid)
    let t = document(threads,p.tid)
    filter t
    let f = document(forums,t.fid)
    filter f
    let class = f.class
    filter has(@contentClasses,TO_STRING(class)) /*content ctrl*/

    limit 30
    return {post:p,thread:t,forum:f,user:u}
    `,{contentClasses:params.contentClasses}
  )
  .then(res=>{
    for(var i in res){
      var doc = res[i]
      doc.post.ipoc = undefined
      doc.post.iplm = undefined
      xsflimit(doc.post,params)
    }
    return res
  })
})
