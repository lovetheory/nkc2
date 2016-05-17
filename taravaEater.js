global.__projectroot = __dirname + '/';//create global variable for project root directory
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path
var fs = require('fs-extra')
var dir = require('node-dir');

var fpath = 'D:/kc2014/avatar/000'

var dpath = __projectroot + 'resources/newavatar'
var spath = __projectroot + 'resources/newavatar_small'

fs.ensureDirSync(dpath);
fs.ensureDirSync(spath);

dir.files(fpath,function(err,files){
  console.log(files[0]);

  files.forEach(function(path){
    var filename =
    path.replace(/.*[\\\/]([0-9_a-z]*\.[a-z]{0,5})/,'$1')

    if(/^[0-9]*\.jpg$/.test(filename)){
      fs.copy(path,dpath+'/'+filename,function(err){
        if(err)return console.error(err);
        console.log('success: '+filename);
      })
    }

  })
})
