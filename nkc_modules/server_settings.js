module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var moment = require('moment');
require('helper')()
var settings = {};

settings.server={
  name:"nkc Development Server",
  copyright:'(c)2016 Guangdong Aililun(LoveTheory) Technology Co Ltd',
  port:1086,
  https_port:10443,
  github:'https://github.com/ctmakro/nkc2',

  use_https:false,
  //use_https:true,
};

settings.site={
  name:"科创论坛",
  description:"科技爱好者综合社区",
  copyright:"科创研究院 (c)2005-2016",
};

function get_secret(path)
{
  var fs = require('fs');
  var secret = '';
  try{
    secret = fs.readFileSync(path,'utf8');
  }
  catch(err){
    secret =
    //Math.random().toString();
    require('crypto').randomBytes(128).toString('hex');
    //1024 bit! try crack with anything.

    fs.writeFileSync(path,secret,'utf8');
  }
  return secret;
}

settings.cookie_secret = get_secret('secret.txt');
settings.cookie_life=86400*30*1000; //30d
settings.compression_level=2;

settings.https_options = function(){
  var fs = require('fs');
  return {
    key: fs.readFileSync('ssl/privatekey.pem'),
    cert: fs.readFileSync('ssl/certificate.pem')
  };
};

settings.jadeoptions= {
  pretty:true,
  cache:(development?false:true),
  //cache:true,pretty:false,
  //globals:[]
  server:settings.server,
  debug_output:(development?true:false),
};

settings.arango={
  address:'http://127.0.0.1:8529'
};

settings.couchdb={
  address:"127.0.0.1",
  port:5984
};

settings.static_settings = {
  maxAge:1000*10, //cache everything for 30s
};

settings.urlrewrite = [ //happens before serve_static
  // {map:'/',to:'/api'},//到时要删掉。
  // {map:'/nkc/*',to:'/$1'}, //记得删掉
  // {map:'/nkc',to:'/api'},//到时要删掉。

  {map:'/',to:'/interface/home'},
  {map:'/index',to:'/'},

  {map:'/logout*',to:'/interface/logout$1'},
  {map:'/me',to:'/interface/me'},
  {map:'/login*',to:'/interface/login$1'},
  {map:'/register*',to:'/interface/register$1'},

  {map:'/thread/:tid',to:'/interface/thread/:tid'},
  {map:'/read/:tid',to:'/interface/thread/:tid'},
  {map:'/forum/:fid',to:'/interface/forum/:fid'},
  {map:'/e*',to:'/interface/editor$1'},

  {map:'/r/:rid',to:'/api/resources/get/:rid'},
  {map:'/rt/:rid',to:'/api/resources/thumb/:rid'},
  {map:'/avatar/:uid',to:'/api/avatar/:uid.jpg'},
];

settings.root_serve_static =
[
  //clientside js file serving
  {to:'nkc_modules/chat'},
  {to:'nkc_modules/jquery'},
  {to:'nkc_modules/react'},
  {to:'node_modules/marked/lib'},
  {to:'node_modules/commonmark/dist'},
  {to:'nkc_modules/vue'},
  {to:'nkc_modules/jade'},
  {to:'nkc_modules/xbbcode'},
  {to:'nkc_modules/'},
  {map:'/bootstrap',to:'bootstrap-3.3.6-dist'},
  //{map:'/avatar',to:'resources/avatar'},
  {map:'/default',to:'resources/'},
  {map:'/api/avatar/',to:'resources/avatar'},
];

settings.resource_paths = [
  //well, in order to find file simutaneously in these places
  //trailing slash '/' is very important!!!
  __projectroot + 'tmp/',
  __projectroot + 'tmp2/',
  __projectroot + 'resources/',
  __projectroot + 'resources/upload/'
];

//where resources are uploaded to
settings.upload_options = {
  dest: __projectroot + 'tmp/',
  limits:
  {
    fields:20, //max number of file fields
    fileSize:1024*1024*30, //30MB
    files:1,//1 part/file a time please.
    headerPairs:20, //kv pairs in header
  }
};

//returns relative path for uploads.
settings.upload_path = __projectroot + 'resources/upload/';

settings.get_relative_path = function(){
  return moment().format('/YYYY/MM/'); //relative path for new attachments
  //into /YEAR/MONTH/ for ease of manangement
}

settings.attachment_image_width = 960;
settings.attachment_image_height = 16384;

//where is default watermark
settings.default_watermark_path = __projectroot+'resources/default_watermark3.png';

settings.size_largeimage = 1024*512; //500kb max

//where to save thumbnails.
settings.thumbnails_path = __projectroot+'resources/thumbnails/';

//where is default thumbnail; use an URL redirection to allow caching
settings.default_thumbnail_url = '/default/default_thumbnail.png';

//---------------------------------------------

//where to save avatars.
settings.avatar_path = __projectroot+'resources/avatar/';

//where is default avatar.
settings.default_avatar_path = __projectroot+'resources/default_avatar.jpg';
//where is default avatar; use an URL redirection to allow caching
settings.default_avatar_url = '/default/default_avatar.jpg';


//where to find avatars.
settings.avatar_paths=[
  //well, in order to find file simutaneously in these places
  //trailing slash '/' is very important!!!
  settings.avatar_path,

];

//user avatar upload
settings.upload_options_avatar = {
  dest: __projectroot + 'tmp/',
  limits:
  {
    fields:20, //max number of file fields
    fileSize:1024*1024*3, //3MB
    files:1,//1 part/file a time please.
    headerPairs:20, //kv pairs in header
  }
};

settings.exam = {
  refresh_period:(900*1000), //15min
  //change questions every

  time_limit:(1800*1000*2),
  //should finish within

  succeed_interval:3600*1000*12, //12h
  //dont try within given amount of time after succeeded once.

  pass_score:6,
  number_of_questions:10,

  time_before_register:3600*1000*1, //1h
}

module.exports = settings;
