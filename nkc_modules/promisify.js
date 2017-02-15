module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

function promisify(func){
  return function(){
    var k = arguments;
    return new Promise(function(resolve,reject){
      callback_handler = function(err,back){
        if(err)return reject(err);
        resolve();
      }
      k[k.length.toString()] = callback_handler;
      k.length++;
      func.apply(this,k)
    })
  }
} //turn callback suffixed functions into Promise returning ones.

module.exports = promisify
