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
      for p in posts
      sort p.toc desc
      filter p.r
      filter length(p.r)

      let parr = (
        for r in p.r
        let res = document(resources,r)
        filter position(['jpg','png','svg','jpeg'],res.ext,false)
        return res
      )
      filter length(parr)

      let thread = document(threads,p.tid)
      let oc = document(posts,thread.oc)
      let ocuser = document(users,oc.uid)
      let forum = document(forums,thread.fid)

      limit 30

      return {r:parr[rand()*length(parr)],forum,thread:merge(thread,{oc,ocuser})}
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
          return t.testView(Object.assign(params.contentClasses,{sensitive:true}))
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
      console.log(arr);
      return arr
    })
  }
}
