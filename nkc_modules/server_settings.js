exports.server={
  name:"nkc Development Server",
  port:1086,
  https_port:10443,
  github:'https://github.com/ctmakro/nkc2',

  use_https:false,
  //use_https:true,
};

exports.cookie_secret='nkc';
exports.compression_level=2;

exports.https_options = function(){
  var fs = require('fs');
  return {
    key: fs.readFileSync('ssl/privatekey.pem'),
    cert: fs.readFileSync('ssl/certificate.pem')
  };
};

exports.jadeoptions= {
  pretty:true,
  cache:(development?false:true),
  //cache:true,pretty:false,
  //globals:[]
  server:exports.server,
  debug_output:(development?true:false),
};

exports.arango={
  address:'http://127.0.0.1:8529'
};

exports.couchdb={
  address:"127.0.0.1",
  port:5984
};

exports.root_serve_static =
[
  //clientside js file serving
  {to:'nkc_modules/chat'},
  {to:'nkc_modules/jquery'},
  {to:'nkc_modules/angular'},
  {to:'node_modules/marked/lib'},
  {to:'node_modules/commonmark/dist'},
  {to:'nkc_modules/vue'},
  {to:'nkc_modules/jade'},
  {to:'nkc_modules/xbbcode'},
  {to:'nkc_modules/'},
  {map:'/bootstrap',to:'bootstrap-3.3.6-dist'},
];

exports.urlrewrite = [
  {map:'/',to:'/forum/default'},
  {map:'/api',to:'/'},

  {map:'/logout*',to:'/interface/logout$1'},
  {map:'/me',to:'/interface/me'},
  {map:'/login*',to:'/interface/login$1'},
  {map:'/register*',to:'/interface/register$1'},

  {map:'/thread/:tid',to:'/interface/thread/:tid'},
  {map:'/read/:tid',to:'/interface/thread/:tid'},
  {map:'/forum/:fid',to:'/interface/forum/:fid'},
  {map:'/e*',to:'/interface/editor$1'},

  {map:'/r/:rid',to:'/api/resources/get/:rid'},
  {map:'/avatar/:uid',to:'/api/avatar/:uid'},
];

exports.resource_paths = [
  //well, in order to find file simutaneously in these places
  //trailing slash '/' is very important!!!
  __projectroot + 'tmp/',
  __projectroot + 'tmp2/',
  __projectroot + 'resources/',
  __projectroot + 'resources/avatar/',
];

//where resources are uploaded to
exports.upload_options = {
  dest: __projectroot + 'tmp/',
  limits:
  {
    fields:20, //max number of file fields
    fileSize:1048576, //1MB
    files:1,//1 part/file a time please.
    headerPairs:20, //kv pairs in header
  }
};

exports.avatar_path = 'resources/avatar/';
exports.default_avatar_path = 'resources/default_avatar.jpg';

//user avatar upload
exports.upload_options_avatar = {
  dest: __projectroot + 'tmp/',
  limits:
  {
    fields:20, //max number of file fields
    fileSize:1024*100, //100kb
    files:1,//1 part/file a time please.
    headerPairs:20, //kv pairs in header
  }
};
