//ImageMagick wrapper
var im = {};

const spawn = require('child_process').spawn; //introduce the spawn function
module.paths.push('./nkc_modules'); //enable require-ment for this path

function run_async(pathname,options,callback){
  var starttime = Date.now();

  var child = spawn(pathname, options);

  child.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  child.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });

  child.on('close', (code) => {

    console.log(
      `${pathname} exited with code ${code}`,
      'in',
      (Date.now()-starttime).toString().cyan,
      'ms'
    );

    if(callback)
    callback(code);
  });

};

im.avatarify = function(path,callback){
  run_async('convert',[ //please make sure ImageMagick exists in PATH
    path,
    '-strip',
    '-thumbnail',
    '128x128^>',
    '-gravity',
    'Center',
    '-crop',
    '128x128+0+0',
    path,
  ],(code)=>{
    if(code==0){
      callback(null,0);
    }
    else {
      callback(path+' converting error: '+code.toString(),code);
    }
  });
};

module.exports = im;
