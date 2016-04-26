//ImageMagick wrapper

module.paths.push('./nkc_modules'); //enable require-ment for this path

const spawn = require('child_process').spawn; //introduce the spawn function
var im = {};
var settings = require('server_settings');

function run_async_cb(pathname,options,callback){
  var starttime = Date.now();

  var child = spawn(pathname, options);
  var errorstring = '';
  var stdout_str = '';

  child.stdout.on('data', (data) => {
    stdout_str += `${data}\n`;
  });

  child.stderr.on('data', (data) => {
    errorstring += `${data}\n`;
  });

  child.on('close', (code) => {

    console.log(
      `${pathname} exited with code ${code}`,
      'in',
      (Date.now()-starttime).toString().cyan,
      'ms'
    );

    if(callback){
      if(code!=0){ //if code not 0, indicating error
        callback(errorstring);
      }
      else {
        callback(null,stdout_str)
      }
    }
  });
};

function run_async(pathname,options){
  return new Promise((resolve,reject)=>{
    run_async_cb(pathname,options,(err,back)=>{
      if(err)return reject(err);
      resolve(back);
    })
  })
}

//resize and crop to produce rectangular avatar.
im.avatarify = function(path,callback){
  //avatar square width
  const size = settings.avatar_size||192;
  return run_async('convert',[ //please make sure ImageMagick exists in PATH
    path,
    '-colorspace',
    'RGB',
    '-strip',
    '-thumbnail',
    `${size}x${size}^>`,
    '-gravity',
    'Center',
    '-crop',
    `${size}x${size}+0+0`,
    path,
  ])
};

//resize if image file too large, then watermark.
im.attachify = function(path,callback){

  const maxwidth = settings.attachment_image_width||1280;
  const maxheight = settings.attachment_image_height||16384;

  return run_async('convert',[ //please make sure ImageMagick exists in PATH
    path,
    //'-colorspace',
    //'RGB',
    '-gravity',
    'southeast',

    '-resize',
    `${maxwidth}x${maxheight}>`,

    settings.default_watermark_path,
    '-compose',
    'dissolve',
    '-define',
    'compose:args=50',
    '-composite',
    //'-quality',
    //'90',
    path,

  ])
}

//put watermark, only, no resize, please.
im.watermarkify = function(path,callback){
  //overlaying watermark.
  return run_async('composite',[ //please make sure ImageMagick exists in PATH
    '-dissolve',
    '50',
    '-gravity',
    'southeast',
    settings.default_watermark_path,
    path,
    path,
  ])
}

im.info = function(path,callback){
  return run_async('identify',[
    '-format',
    '%wx%h',//print (width)x(height)
    path,
  ])
  .catch(err=>{
    throw 'failed to identify. not even image'
  })
  .then(back=>{
    sizeinfo = back.trim().split(' ')[0]; //trim needed to remove \n
    if(sizeinfo.length<3)throw ('fucking parsing error when "identify"')
    sizeinfo = sizeinfo.match(/^(.*)x(.*)$/);

    var imagewidth = Number(sizeinfo[1]);
    var imageheight = Number(sizeinfo[2]);

    return {width:imagewidth,height:imageheight};
  })
}

im.thumbnailify = function(path,dest,callback){
  return run_async('convert',[
    path,
    //'-colorspace',
    //'RGB',
    '-thumbnail',
    '64x64',
    '-strip',
    '-background',
    'wheat',//yellowish
    '-alpha',
    'remove',
    dest,
  ]);
}

module.exports = im;
