//validation module
module.paths.push('./nkc_modules'); //enable require-ment for this path

//decide whether a submitted post is legal
exports.validatePost = function(p){
  if(!p.c)return 'content not exist';
  if(p.c.length<6)return 'content too short, 6 chars min';
  return true;
};
