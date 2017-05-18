//validation module


//decide whether a submitted post is legal
exports.validatePost = function(p){

  if(!p.c)throw 'content not exist';
  if((typeof p.c)!== 'string') throw '内容的类型错误，仅接收字符串';
  if(p.c.length<6)throw '内容太短了，至少6个字节哦';

  if(p.c.length>100000)throw '内容太长了';

  if(p.t!==null && p.t!==undefined){
    if((typeof p.t)!== 'string') throw '标题类型错误';
    if(p.t.length>40) throw '标题太长了';
  }

  if(p.l!==null && p.l!==undefined){
    if((typeof p.l)!== 'string') throw '类型错误，仅接收字符串';
  }

  return true;
};

exports.validateSMS = function(p){
  if(!p.c)throw '内容不存在';

  p.c = p.c.trim().replace(/\n|\r/g,'  ')

  if((typeof p.c)!== 'string') throw '内容的类型错误，仅接收字符串';
  if(p.c.length<1)throw '内容太短了，至少1个字节';

  if(p.c.length>2000)throw '内容太长了';

  return true
}
