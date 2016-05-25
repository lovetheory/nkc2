var table = {};
module.exports = table;

module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path
var moment = require('moment') //packages you may need
var fs = require('fs.extra')
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var queryfunc = require('query_functions')
var AQL = queryfunc.AQL

table.getResource={
  operation:function(params){

    var rid = params.rid;
    //load from db
    return queryfunc.doc_load(rid,'resources')
    .then(function(robject){
      var destination_path = settings.upload_path;
      var destination_plus_relative = destination_path + '/'+robject.rpath+'/';

      var destFile = destination_path + '/' + robject.path

      params._res.setHeader('Content-disposition', 'inline; filename=' + robject.oname);
      //res.setHeader('Content-type', robject.mime);

      params._res.sendFile(destFile)

      //var filestream = fs.createReadStream(best_filepathname);
      report(destFile);

      return {responseSent:true}
    })
  },
  requiredParams:{
    rid:String,
  },
}
