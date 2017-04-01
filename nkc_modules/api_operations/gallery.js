var table = {};
module.exports = table;

module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path
var moment = require('moment') //packages you may need
var fs = require('fs.extra')
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var queryfunc = require('query_functions')
var AQL = queryfunc.AQL

var layer = require('../layer')


table.getGalleryRecent = {
  operation:function(params){
    return AQL(`
      FOR t IN threads
        FILTER t.fid != 'recycle' && t.fid != '97' && t.disable != true
        SORT t.toc DESC
        LET p = DOCUMENT(posts, t.oc)
        FILTER p.r && LENGTH(p.r)
        LET parr = (
          FOR r IN p.r
            LET res = DOCUMENT(resources, r)
            FILTER POSITION(['jpg','png','svg','jpeg'], res.ext, false)
            RETURN res
        )
        FILTER LENGTH(parr)
        LET user = DOCUMENT(users, t.uid)
        LET forum = DOCUMENT(forums, t.fid)
        FILTER forum.visibility == true
        LIMIT 6
        RETURN {
          r: parr[RAND() * LENGTH(parr)],
          forum,
          thread: MERGE(t, {oc: p, ocuser: user})
        }
        
      // filter p.r
      // filter length(p.r)
      // filter !p.disabled
      //
      // let parr = (
      //   for r in p.r
      //   let res = document(resources,r)
      //   filter position(['jpg','png','svg','jpeg'],res.ext,false)
      //   return res
      // )
      // filter length(parr)
      //
      // let thread = document(threads,p.tid)
      // let oc = document(posts,thread.oc)
      // let ocuser = document(users,oc.uid)
      // let forum = document(forums,thread.fid)
      // filter forum.visibility == true && forum._key != '97'//去掉自由市场
      //
      // limit 6
      //
      // return {r:parr[rand()*length(parr)],forum,thread:merge(thread,{oc,ocuser})}
      `
    )
    .then(arr=>{
      var promarr = []
      var resarr=[]

      for(i of arr){

        var t = new layer.Thread(i.thread._key)
        t.model = i.thread
        t.i = i

        var prom = t.load()
        .then(t=>{
          return t.testView(Object.assign(params.contentClasses,{sensitive:true,non_broadcast:undefined}))
        })
        .then(t=>{
          resarr.push(t.i)
        })
        .catch(err=>{

        })
        promarr.push(prom)
      }

      return Promise.all(promarr)
      .then(()=>{
        return resarr
      })
    })
    .then(arr=>{
      //console.log(arr);
      return arr
    })
  }
}
