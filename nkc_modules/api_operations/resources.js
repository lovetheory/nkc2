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

    return 'sent'
  })
  .catch(err=>{
    console.log(err);
    throw err
  })
}

function accumulateCountHit(id,collname){
  return AQL(`
    let t = document(${collname},@id)
    update t with {hits:t.hits+1} in ${collname}
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

      throw '只有登录用户可以下载附件，请先登录或者注册。'
    })
    .then(()=>{
      var rid = params.rid;
      //load from db
      return queryfunc.doc_load(rid,'resources')
    })

    .then(function(robject){
      var destination_path = settings.upload_path;
      var destFile = destination_path + '/' + robject.path

      function encodeRFC5987ValueChars (str) {
        return encodeURIComponent(str).
        // 注意，仅管 RFC3986 保留 "!"，但 RFC5987 并没有
        // 所以我们并不需要过滤它
        replace(/['()]/g, escape). // i.e., %27 %28 %29
        replace(/\*/g, '%2A').
        // 下面的并不是 RFC5987 中 URI 编码必须的
        // 所以对于 |`^ 这3个字符我们可以稍稍提高一点可读性
        replace(/%(?:7C|60|5E)/g, unescape);
      }

      if(['jpg','jpeg','gif','png','svg'].indexOf(robject.ext)>=0){
        return sendFile(params._res,destFile,{
          maxAge:1000*86400, //cache everything for 1d
          lastModified:true,
          headers:{'Content-Disposition':`inline; filename=${encodeRFC5987ValueChars(robject.oname)}; filename*=utf-8''${encodeRFC5987ValueChars(robject.oname)}`},
        })

        .then(res=>{
          return accumulateCountHit(params.rid,'resources')
          .then(res=>{
            return 'success'
          })
        })
      }
      else{
        return sendFile(params._res, destFile, {
          maxAge: 1000 * 86400, //cache everything for 1d
          lastModified: true,
          headers: {'Content-Disposition': `attachment; filename=${encodeRFC5987ValueChars(robject.oname)}; filename*=utf-8''${encodeRFC5987ValueChars(robject.oname)}`},
        })
        .then(res => {
          return accumulateCountHit(params.rid, 'resources')
          .then(res => {
            return 'success'
          })
        })
      }
    })
  },
  requiredParams:{
    rid:String,
  },
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

    var quota = Number(params.quota||30)

    return AQL(
      `
      for r in resources
      filter r.uid == @uid && r.pid == null
      sort r.toc desc
      limit @quota
      return r
      `,{
        uid,quota,
      }
    )
  }
}
