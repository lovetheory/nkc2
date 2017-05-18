//ImageMagick wrapper



const spawn = require('child_process').spawn; //introduce the spawn function
const exec = require('child_process').exec; //introduce the exec function

var im = {};
var settings = require('./server_settings');

function run_async(pathname,args,options){
  return new Promise((resolve,reject)=>{
    var starttime = Date.now();

    var child = args?spawn(pathname,args,options):exec(pathname,options,function(err,stdout,stderr){
      if(err){
        reject(err)
      }else{
        resolve({stderr,stdout})
      }
    })

    if(args){
      var errorstring = '';
      var stdout_str = '';

      child.stdout.on('data', (data) => {
        stdout_str += `${data}\n`;
      });

      child.stderr.on('data', (data) => {
        errorstring += `${data}\n`;
      });

      child.on('error',(err)=>{
        reject(err)
      });

      child.on('close', (code) => {

        console.log(
          `${pathname} exited with code ${code}`,
          'in',
          (Date.now()-starttime).toString().cyan,
          'ms'
        );

        if(code!=0){ //if code not 0, indicating error
          reject(errorstring);
        }
        else {
          resolve(stdout_str)
        }
      })
    }
  })
};

im.gitpull = function(){
  return run_async('git',[
    'pull',
  ],{
    cwd:__projectroot,
  })
}

im.npminstall = function(){
  return run_async('npm install',null,{
    cwd:__projectroot,
  })
}

//调整大小来产生矩形头像
im.avatarify = function(path,callback){
  //avatar square width
  const size = settings.avatar_size||192;
  return run_async('magick',[ //please make sure ImageMagick exists in PATH
    'convert',
    path,
    '-strip',
    '-thumbnail',
    `${size}x${size}^>`,
    '-gravity',
    'Center',
    '-quality',
    '90',
    '-crop',
    `${size}x${size}+0+0`,
    path,
  ])
};

//调整大小来产生更小的矩形头像
im.avatarify_small = function(path,callback){
  //avatar square width
  const size = settings.avatar_size_small||40;
  return run_async('magick',[ //please make sure ImageMagick exists in PATH
    'convert',
    path,
    '-strip',
    '-thumbnail',
    `${size}x${size}^>`,
    '-gravity',
    'Center',
    '-quality',
    '95',
    '-crop',
    `${size}x${size}+0+0`,
    path,
  ])
};

//调整过大的图片，并添加水印
im.attachify = function(path,callback){
  const maxwidth = settings.attachment_image_width||1920;  //最大的宽高限制
  const maxheight = settings.attachment_image_height||16384;

  return run_async('magick',[ //please make sure ImageMagick exists in PATH
    'convert',
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
    '-quality',
    '90',
    path,

  ])
}

//put watermark, only, no resize, please.
im.watermarkify = function(path,callback){
  //overlaying watermark.
  return run_async('magick',[ //please make sure ImageMagick exists in PATH
    'composite',
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
  return run_async('magick',[
    'identify',
    '-format',
    '%wx%h',//print (width)x(height)
    path,
  ])
  .catch(err=>{
    throw err
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
  return run_async('magick',[
    'convert',
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
