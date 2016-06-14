//validation module
module.paths.push('./nkc_modules'); //enable require-ment for this path

//decide whether a submitted post is legal
exports.validatePost = function(p){

  if(!p.c)throw 'content not exist';
  if((typeof p.c)!== 'string') throw 'wrong content type, accept string'
  if(p.c.length<6)throw 'content too short, 6 chars min';

  if(p.c.length>100000)throw 'content too long.'

  if(p.t!==null && p.t!==undefined){
    if((typeof p.t)!== 'string') throw 'title wrong type'
    if(p.t.length>60) throw 'title too long'
  }

  if(p.l!==null && p.l!==undefined){
    if((typeof p.l)!== 'string') throw 'wrong lang type, accept string'
  }

  return true;
};

exports.validateSMS = function(p){
  if(!p.c)throw 'content not exist';

  p.c = p.c.trim().replace(/\n|\r/g,'  ')

  if((typeof p.c)!== 'string') throw 'wrong content type, accept string'
  if(p.c.length<1)throw 'content too short, 1 char min';

  if(p.c.length>2000)throw 'content too long.'

  return true
}
