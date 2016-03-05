//ImageMagick wrapper

module.paths.push('./nkc_modules'); //enable require-ment for this path

const spawn = require('child_process').spawn; //introduce the spawn function
var im = {};
var settings = require('server_settings');

function run_async(pathname,options,callback){
  var starttime = Date.now();

  var child = spawn(pathname, options);
  var errorstring = '';

  child.stdout.on('data', (data) => {
  });

  child.stderr.on('data', (data) => {
    errorstring += `${data}`;
  });

  child.on('close', (code) => {

    console.log(
      `${pathname} exited with code ${code}`,
      'in',
      (Date.now()-starttime).toString().cyan,
      'ms'
    );

    if(callback)
    callback(code,errorstring);
  });

};

//resize and crop to produce rectangular avatar.
im.avatarify = function(path,callback){
  //avatar square width
  const size = settings.avatar_size||192;
  run_async('convert',[ //please make sure ImageMagick exists in PATH
    path,
    '-strip',
    '-thumbnail',
    `${size}x${size}^>`,
    '-gravity',
    'Center',
    '-crop',
    `${size}x${size}+0+0`,
    path,
  ],(code,errorstring)=>{
    if(code==0){
      callback(null,0);
    }
    else {
      callback(path+' converting error: '+code.toString()+'\n'+
      errorstring
      ,code);
    }
  });
};

//resize if image too large.
im.attachify = function(path,callback){

  const maxwidth = settings.attachment_image_width||1280;
  const maxheight = settings.attachment_image_height||16384;

  run_async('convert',[ //please make sure ImageMagick exists in PATH
    path,
    '-resize',
    `${maxwidth}x${maxheight}>`,
    path,
  ],(code,errorstring)=>{
    if(code==0){
      callback(null,0);
    }
    else {
      callback(path+' converting error: '+code.toString()+'\n'+
      errorstring
      ,code);
    }
  });
}

module.exports = im;
