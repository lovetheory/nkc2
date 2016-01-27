//validation module
module.paths.push('./nkc_modules'); //enable require-ment for this path

//decide whether a submitted post is legal
exports.validatePost = function(p){
  if(!p.content)return 'content nogood';
  return true;
};
