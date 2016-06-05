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
    if(p.t.length>30) throw 'title too long'
  }

  if(p.l!==null && p.l!==undefined){
    if((typeof p.l)!== 'string') throw 'wrong lang type, accept string'
  }

  return true;
};
