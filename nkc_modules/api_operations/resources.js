var table = {};
module.exports = table;

module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path
var moment = require('moment') //packages you may need
var fs = require('nkc_fs')
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var queryfunc = require('query_functions')
var im = require('im_functions')
var AQL = queryfunc.AQL

function sendFile(_res,destFile,opt){
  return new Promise((resolve,reject)=>{
    _res.sendFile(destFile,opt,err=>{
      if(err)return reject(err)
      resolve()
    })
  })
  .then(()=>{
    report(destFile);
    _res.sent = true
  })
}

function accumulateCountHit(id,collname){
  return AQL(`
    let t = document(${collname},@id)
    update t with {hits:t.hits+1} in threads
    return NEW.hits
    `,{id}
  )
  .then(res=>{
    report('hits +1 = ' + res[0].toString())
    return res[0]
  })
}

table.getResource={
  operation:function(params){

    var rid = params.rid;
    //load from db
    return queryfunc.doc_load(rid,'resources')
    .then(function(robject){
      var destination_path = settings.upload_path;
      var destFile = destination_path + '/' + robject.path

      return sendFile(params._res,destFile,{
        maxAge:1000*86400, //cache everything for 1d
        lastModified:true,
        headers:{'Content-Disposition':'inline; filename=' + encodeURI(robject.oname)},
      })
      .then(res=>{
        accumulateCountHit(rid,'resources')

        return res
      })
    })
  },
  requiredParams:{
    rid:String,
  },
  testPermission:function(params){
   var po = params.permittedOperations
   var cc = params.contentClasses

   return queryfunc.doc_load(params.rid,'resources')
   .then(function(robject){
     if(['jpg','jpeg','gif','png','svg'].indexOf(robject.ext)>=0){
       if(cc['images']){
         return
       }
     } //if image
     else{
      //if non_image
      if(cc['non_images']){
        return
      }
     }

     throw 401
   })
  }
}

function getThumbnailPathFor(robject){
  if(robject.tpath){ //if thumbnail generated before
    return Promise.resolve(settings.thumbnails_path + '/' + robject.tpath)
  }

  return createThumbnailGetPath(robject)
}

function createThumbnailGetPath(robject){
  var destFile = settings.upload_path + '/' + robject.path

  var filename = robject._key + '.jpg'

  var thumbnail_path_relative = settings.get_relative_path() // construct a path here
  var thumbnail_path_relative_with_filename = thumbnail_path_relative + filename
  var thumbnail_path_absolute = settings.thumbnails_path + thumbnail_path_relative;
  var thumbnail_path_absolute_with_filename = thumbnail_path_absolute + filename

  return fs.ensureDir(thumbnail_path_absolute)
  .then(()=>{
    //4. generate thumbnail for the file
    return im.thumbnailify(destFile,thumbnail_path_absolute_with_filename)
  })
  .then(function(back){
    report('thumbnail generated for '+robject._key)
    return queryfunc.doc_update(robject._key,'resources',{tpath:thumbnail_path_relative_with_filename})
  })
  .then(res=>{
    return thumbnail_path_absolute_with_filename
  })
}

table.getResourceThumbnail={
  operation:function(params){
    var rid = params.rid;
    //load from db
    return queryfunc.doc_load(rid,'resources')
    .then(robject=>{
      var destFile = settings.upload_path + '/' + robject.path

      var extension = robject.ext

      switch (extension) {
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'png':
        case 'svg':

        return getThumbnailPathFor(robject)
        .then(thumbnail_path_absolute=>{
          return sendFile(params._res,thumbnail_path_absolute,{maxAge:86400000})
        })
        break;

        default:
        return sendFile(params._res,settings.default_thumbnail_path,{maxAge:86400000})
      }
    })
  },
  requiredParams:{
    rid:String,
  }
}

table.getResourceOfCurrentUser={
  operation:function(params){
    if(!params.user)throw 'must login'
    var uid = params.user._key

    return AQL(
      `
      for r in resources
      filter r.uid == @uid && r.pid == null
      sort r.toc desc
      limit 20
      return r
      `,{
        uid,
      }
    )
  }
}
