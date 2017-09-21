

var moment = require('moment');
require('./helper')()
var settings = {};

settings.server={
  name:"nkc Development Server",
  copyright:'(c)2016 Guangdong Aililun(LoveTheory) Technology Co Ltd',
  port: 1086,
  https_port:10443,
  github:'https://github.com/lovetheory/nkc2',

  use_https:false,
  //use_https:true,

  ACME_path:'F:/KC2016/.well-known',

  database_name:'rescue',  //数据库名称
};

settings.user = {
  vitalityArithmetic: function(lWThreadCount, lWPostCount, xsf) {
    var xsf = xsf || 0;
    var lWThreadCount = Number(lWThreadCount);
    var lWPostCount = Number(lWPostCount);
    var xsfResult = Math.round(Math.sqrt(Number(xsf + 1)));
    if(xsfResult > 2) {xsfResult = 2}
    return (lWThreadCount*3 + lWPostCount) * xsfResult;
  },
  scoreMap: {
    postToThread: {
      scoreChange: -20,
      attrChange: {
        name: 'postCount',
        change: 1
      }
    },
    postToForum: {
      scoreChange: 0,
      attrChange: {
        name: 'threadCount',
        change: 1
      }
    },
    disablePost: {
      scoreChange: -10,
      attrChange: {
        name: 'disabledPostCount',
        change: 1
      }
    },
    enablePost: {
      scoreChange: 0,
      attrChange: {
        name: 'disabledPostCount',
        change: -1
      }
    },
    moveToRecycle: {
      scoreChange: 0,
      attrChange: {
        name: 'disabledThreadCount',
        change: 1
      }
    },
    recommendPost: {
      scoreChange: 0,
      attrChange: {
        name: 'recCount',
        change: 1
      }
    },
    unrecommendPost: {
      scoreChange: 0,
      attrChange: {
        name: 'recCount',
        change: -1
      }
    },
    subscribeUser: {
      scoreChange: 0,
      attrChange: {
        name: 'subs',
        change: 1
      }
    },
    unsubscribeUser: {
      scoreChange: 0,
      attrChange: {
        name: 'subs',
        change: -1
      }
    },
    setDigest: {
      scoreChange: 100,
      attrChange: {
        name: 'digestThreadsCount',
        change: 1
      }
    },
    cancelDigest: {
      scoreChange: -100,
      attrChange: {
        name: 'digestThreadsCount',
        change: -1
      }


    },
    setTopped: {
      scoreChange: 0,
      attrChange: {
        name: 'toppedThreadsCount',
        change: 1
      }
    },
    cancelTopped: {
      scoreChange: 0,
      attrChange: {
        name: 'toppedThreadsCount',
        change: -1
      }
    },
    dailyLogin: {
      scoreChange: 1,
      attrChange: {
        name: 'loginDays',
        change: 1
      }
    }
  },
  scoreCoefficientMap: {
    xsf: 500,
    loginDays: 1,
    disabledPostCount: -20,
    disabledThreadCount: -10,
    postCount: 0,
    threadCount: 0,
    subs: 0,
    recCount: 0,
    digestThreadsCount: 100,
    toppedThreadsCount: 0
  },
  scoreArithmetic: function(user, coeMap) {
    let arr = [];
    for(let cal in coeMap) {
      if(coeMap.hasOwnProperty(cal)) {
        arr.push(Number(coeMap[cal]) * Number(user[cal]))
      }
    }
    return arr.reduce((last, current) => last + current, 0)
  }
};

report('database_name: '+settings.server.database_name)

settings.site={
  name:"科创论坛",
  description:"科技爱好综合社区",
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

settings.couchdb={
  address:"127.0.0.1",
  port:5984
};

settings.static_settings = {
  maxAge:1000*86400, //cache everything for 1d
  setHeaders: headerController,
};

//http://localhost:1086/api/operation?&operation=viewUserThreads&uid=5097

function urlrewriteGen(pathname,opname){
  return {
    map: new RegExp(`^\\/${pathname}\\b\\??(.*)`),
    to: `/api/operation?&operation=${opname}&$1`
  }
}

settings.urlrewrite = [ //happens before serve_static
  // {map:'/',to:'/api'},//到时要删掉。
  // {map:'/nkc/*',to:'/$1'}, //记得删掉
  // {map:'/nkc',to:'/api'},//到时要删掉。

  {map:/^\/read\.php\?.*tid=([0-9]{1,10})/,to:'/redirect_t/$1'},
  {map:/^\/index\.php\?.*fid=([0-9]{1,10})/,to:'/redirect_f/$1'},
  //{map:/^read\.php\?tid=([0-9]{1,10}).*/,to:'t/$1'},
  {map: '/', to: '/api/operation?&operation=viewHome'},
  {map: /^\/\?(.*)/, to: '/home$1'},
  {map: /^\/home\??(.*)/, to: '/api/operation?&operation=viewHome$1'},
  {map: /^\/activities\/\??(.*)/, to: '/api/operation?&operation=viewPersonalActivities&uid=$1'},
  {map:'/index',to:'/'},
  {map: /\/configPersonalForum\??(.*)/,to: '/api/operation?operation=configPersonalForum$1'},
  {map: /^\/latest\??(.*)/, to: '/api/operation?&operation=viewLatest$1'},
  {map: /^\/behaviors\??(.*)/, to: '/api/operation?&operation=viewBehaviorLogs$1'},
  {map: /^\/newusers\??(.*)/, to: '/api/operation?&operation=viewNewUsers$1'},
  {map: /^\/subscribe\??(.*)/, to: '/api/operation?&operation=viewSubscribe$1'},
  {map: /^\/postsysinfo\??(.*)/, to: '/api/operation?&operation=postsysinfo$1'},
  //{map:'/me',to:'/interface/me'},

  //{map:/^\/exam\?{0,1}(.*)/,to:'/api/operation?&operation=viewExam&$1'},
  //{map:/^\/register\?{0,1}(.*)/,to:'/api/operation?&operation=viewRegister&$1'},
  //{map:/^\/home\?{0,1}(.*)/,to:'/api/operation?&operation=viewHome&$1'},

  //urlrewriteGen('home','viewHome'),
  //{map: /^\/\w*\??(.*)/, to: '/api/operation?&operation=viewHome&fid=$1&$2'},
  urlrewriteGen('register','viewRegister'),  //手机注册
  urlrewriteGen('register2','viewRegister2'),  //邮箱注册
  urlrewriteGen('activeEmail','viewActiveEmail'),  //邮箱激活
  urlrewriteGen('exam','viewExam'),
  urlrewriteGen('newsysteminfo', 'viewNewSysInfo'),
  urlrewriteGen('logout','viewLogout'),
  urlrewriteGen('login','viewLogin'),
  urlrewriteGen('experimental','viewExperimental'),
  urlrewriteGen('me','viewMe'),
  urlrewriteGen('editor','viewEditor'),
  urlrewriteGen('editor2','viewEditor2'),
  urlrewriteGen('danger','viewDanger'),
  urlrewriteGen('pano','viewPanorama'),
  //urlrewriteGen('sms','viewSMS'),
  urlrewriteGen('self','viewSelf'),
  urlrewriteGen('receiveMobileMessage','receiveMobileMessage'),

  urlrewriteGen('forgotPassword','viewForgotPassword'),   //邮箱找回密码
  urlrewriteGen('forgotPassword2','viewForgotPassword2'),  //手机找回密码

  // {map:/^\/logout\?{0,1}(.*)/,to:'/api/operation?&operation=viewLogout&$1'},
  // {map:/^\/login\?{0,1}(.*)/,to:'/api/operation?&operation=viewLogin&$1'},
  // {map:/^\/experimental\?{0,1}(.*)/,to:'/api/operation?&operation=viewExperimental&$1'},

  {map: /^\/sms\??(.*)/, to: '/api/operation?&operation=viewSMS$1'},
  {map:/^\/f\/([^\?]*)\??(.*)/,to:'/api/operation? &operation=viewForum&fid=$1&$2'},
  {map:/^\/t\/([^\?]*)\??(.*)/,to:'/api/operation? &operation=viewThread&tid=$1&$2'},

  {map:/^\/page\/([^\?]*)\??(.*)/,to:'/api/operation? &operation=viewPage&pagename=$1&$2'},

  {map:/^\/m\/([^\?]*)\??(.*)/,
    to:'/api/operation?&operation=viewPersonalForum&uid=$1&$2'
  },

  {map:/^\/user_collection\/([^\?]*)\??(.*)/,
    to:'/api/operation?&operation=viewCollectionOfUser&uid=$1&$2'
  },

  // {map:/^\/user_profile\/([^\?]*)\??(.*)/,
  //   to:'/api/operation?&operation=viewUser&uid=$1&$2'
  // },

  {map:/^\/user_activities_byname\/([^\?]*)\??(.*)/,
    to:'/api/operation?&operation=viewPersonalActivities&username=$1&$2'
  },

  {map:/^\/post_history\/([^\?]*)\??(.*)/,
    to:'/api/operation?&operation=viewPostHistory&pid=$1&$2'
  },

  //{map:'/e*',to:'/interface/editor$1'},

  {map:'/r/:rid',to:'/api/operation?&operation=getResource&rid=:rid'},
  //  {map:'/r/:rid',to:'/api/resources/get/:rid'},
  {map:'/rt/:rid',to:'/api/operation?&operation=getResourceThumbnail&rid=:rid'},

  {map:'/avatar/:uid',to:'/api/avatar/:uid.jpg'},
  {map:'/avatar_small/:uid',to:'/api/avatar_small/:uid.jpg'},
  {map: '/pfa/:uid', to: '/api/pf_avatars/:uid.jpg'},
  {map: '/pfb/:uid', to: '/api/pf_banners/:uid.jpg'},
  {map: '/ad/:tid', to: '/api/ad_posts/:tid.jpg'},
];

settings.seo_rewrite_mapping = {
  '/natrual':{to:'/f/96',display_name:'自然'},
  '/culture':{to:'/f/109',display_name:'人文'},

  '/electronic':{to:'/f/37',display_name:'EE'},
  '/hv':{to:'/f/139',display_name:'高压'},
  '/accelerator':{to:'/f/367',display_name:'电磁加速'},
  '/edge':{to:'/f/54',display_name:'极客科技'},

  '/diy':{to:'/f/164',display_name:'DIY'},
  '/invention':{to:'/f/32',display_name:'创意发明'},
  '/instrument':{to:'/f/175',display_name:'仪器仪表'},

  '/software':{to:'/f/134',display_name:'CS/SE'},

  '/chemistry': {to:'/f/83',display_name:'化学化工'},
  '/hedc':      {to:'/f/13',display_name:'HEDC'},

  '/rocketry':  {to:'/f/89',display_name:'火箭技术'},
  '/fuel':  {to:'/f/368',display_name:'燃料'},

  '/aviation':{to:'/f/165',display_name:'航空'},
  '/space':{to:'/f/366',display_name:'空间技术'},

  '/science':{to:'/f/106',display_name:'科学技术学'},
  '/kcfund':{to:'/f/166',display_name:'科创基金'},

  '/marketplace':{to:'/f/97',display_name:'自由市场'},
}

function headerController(res, path, stats) {
  res.setHeader('Last-Modified', stats.ctime.getTime())
}

//where to save avatars.
settings.avatar_path = __projectroot+'resources/newavatar/';
settings.avatar_path_small = __projectroot +'resources/newavatar_small/';
settings.personalForumAvatarPath = __projectroot + 'resources/pf_avatars/';
settings.personalForumBannerPath = __projectroot + 'resources/pf_banners/';
settings.ad_posts = __projectroot + 'resources/ad_posts/';
settings.root_serve_static =
[
  //clientside js file serving
  {map:'/attachment',to:'resources/upload'},
  {map:'/static',to:'static/'},
  {map:'/tool',to:'static/tools/'},
  {map:'/resources/default_things',to:'resources/default_things/'},
  {map:'/resources/site_specific',to:'resources/site_specific/'},
  {map:'/jquery',to:'external_pkgs/jquery'},
  {map:'/xbbcode',to:'node_modules/xbbcode-parser/'},
  {map:'/xss',to:'node_modules/xss/dist'},
  {map: '/twemoji', to: 'node_modules/twemoji'},
  {map: '/qrcode', to: 'node_modules/qrcode'},


  {map:'/external_pkgs',to:'external_pkgs/'},
  {to:'external_pkgs/react'},

  {map:'/promise',to:'external_pkgs/Promise'},
  {map:'/bootstrap',to:'external_pkgs/bootstrap-3.3.6-dist'},

  {map:'/commonmark',to:'node_modules/commonmark/dist'},
  {to:'nkc_modules/jade',st:{
    maxAge:1000*30, //browser should cache everything for 30s; lottachanges happening these days
    lastModified:true,
  }},

  {to:'nkc_modules/'},
  {map:'/node_modules',to:'node_modules/'},

  //{map:'/avatar',to:'resources/avatar'},
  {map:'/api/avatar/',to:settings.avatar_path, st: {setHeaders: headerController}},
  {map:'/api/avatar_small/',to:settings.avatar_path_small, st: {setHeaders: headerController}},
  {map: '/api/ad_posts/', to: settings.ad_posts},
  {map: '/api/pf_avatars/', to: settings.personalForumAvatarPath, st: {setHeaders: headerController}},
  {map: '/api/pf_banners/', to: settings.personalForumBannerPath, st: {setHeaders: headerController}}
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
    fileSize:1024*1024*60, //60MB
    files:1,//1 part/file a time please.
    headerPairs:20, //kv pairs in header
  }
};

//returns relative path for uploads.
settings.upload_path = __projectroot + 'resources/upload/';

settings.get_relative_path = function(){
  return moment().format('/YYYY/MM/'); //relative path for newattachments
  //into /YEAR/MONTH/ for ease of manangement
}

settings.attachment_image_width = 1920;  //附件宽度1920px
settings.attachment_image_height = 16384;

//where is default watermark
settings.default_watermark_path = __projectroot +'resources/default_things/default_watermark3.png';

settings.size_largeimage = 1024*512; //500kb max

//where to save thumbnails.
settings.thumbnails_path = __projectroot+'resources/thumbnails/';

//where is default thumbnail; use an URL redirection to allow caching
settings.default_thumbnail_url = '/default/default_thumbnail.png';

settings.default_thumbnail_path =  __projectroot + '/resources/default_things/default_thumbnail.png';

//---------------------------------------------


settings.avatar_size = 192
settings.avatar_size_small = 48;
settings.personalForumAvatarSize = 192;

//where is default avatar.
settings.default_avatar_path = __projectroot +'resources/default_avatar.jpg';
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
    fields:40, //max number of file fields
    fileSize:1024*1024*60, //3MB
    files:1,//1 part/file a time please.
    headerPairs:20, //kv pairs in header
  }
};

settings.uploadOptionsPersonalForumAvatar = {
  dest: __projectroot + 'tmp/',
  limits:
    {
      fields:40, //max number of file fields
      fileSize:1024*1024*60, //3MB
      files:1,//1 part/file a time please.
      headerPairs:20, //kv pairs in header
    }
};

settings.uploadOptionsPersonalForumBanner = {
  dest: __projectroot + 'tmp/',
  limits:
    {
      fields:40, //max number of file fields
      fileSize:1024*1024*60, //3MB
      files:1,//1 part/file a time please.
      headerPairs:20, //kv pairs in header
    }
};

settings.exam = {
  refresh_period:(1000*60*10), //10 min
  //change questions every

  time_limit:(60*1000*45), //45 min
  //should finish within

  succeed_interval:3600*1000*12, //12h
  //dont try within given amount of time after succeeded once.

  pass_score:6,  //10道测试题合格的条数设置
  number_of_questions:10,

  number_of_questions_subjective:8,
  number_of_questions_common:2,

  time_before_register:3600*1000*1, //1h
}

settings.indexLatestThreadsLength = 20; //首页最新内容帖数

settings.paging={
  perpage:65,
}

settings.editor = {
  twemoji: [
    "1f600", "1f601", "1f602", "1f603", "1f604", "1f605",
    "1f606", "1f607", "1f608", "1f609", "1f60a", "1f60b",
    "1f60c", "1f60d", "1f60e", "1f60f", "1f610", "1f611",
    "1f612", "1f613", "1f614", "1f615", "1f616", "1f617",
    "1f618", "1f619", "1f61a", "1f61b", "1f61c", "1f61d",
    "1f61e", "1f61f", "1f620", "1f621", "1f622", "1f623",
    "1f624", "1f625", "1f626", "1f627", "1f628", "1f629",
    "1f62a", "1f62b", "1f62c", "1f62d", "1f62e", "1f62f",
    "1f630", "1f631", "1f632", "1f633", "1f634", "1f635",
    "1f636", "1f637", "1f641", "1f642", "1f643", "1f644",
    "1f923", "1f928", "1f929", "1f92a", "1f92c", "1f92d",
    "1f92e", "2620" , "2622" , "2623" , "26a0" , "1f47f",
    "1f480", "1f47d", "1f47b",
  ]
};

settings.updateActiveUsersCronStr = '0 0 4 * * *'; //定时更新活跃用户的cron表达式，现在是4:00每天
settings.truncateUsersLoggedToday = '0 0 0 * * *'; //每天12点清除当天登陆过的用户--登陆奖励
module.exports = settings;
