global.__projectroot = __dirname + '/';//create global variable for project root directory
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path
module.paths.push(__projectroot ); //enable require-ment for this path

var fs = require('fs-extra')
var dir = require('node-dir');

var fpath = require('tEaterSettings.js').avatar_root

var dpath = __projectroot + 'resources/newavatar'
var spath = __projectroot + 'resources/newavatar_small'

fs.ensureDirSync(dpath);
fs.ensureDirSync(spath);

var successcount = 0;
function success(){
  successcount++;
  if(successcount%1000==0){
    console.log('succeed:' ,successcount);
  }
}

dir.files(fpath,function(err,files){
  if(err)return console.log(err);

  console.log('total:',files.length);

  for(f in files){

    var path = files[f]
    var filename =
    path.replace(/.*[\\\/]([0-9_a-z]*\.[a-z]{0,5})/,'$1')

    if(/^[0-9]*\.jpg$/.test(filename)){
      fs.copy(path,dpath+'/'+filename,function(err){
        if(err)return console.error(err);
        //console.log('success: '+filename);
        success()
      })
    }else if (/^[0-9]*_small\.jpg$/.test(filename)) {
      var newfilename = filename.split('_')[0] + '.jpg'
      fs.copy(path,spath+'/'+newfilename,function(err){
        if(err) return console.error(err);
        success()
      })
    }
  }

})
