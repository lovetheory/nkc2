
//每个文档都有一个_key属性，即主键，可用于直接访问文档。

var user = {
  toc:Number, //创建时间
  tlv:Number, //最后访问（登陆）时间
  username:String, //用户名

  count_posts:5,
  count_threads:0,

  kcb:300,  //科创币
  xsf:1, //or null

  certs:['default','moderator'] //证书，即权限组
  cart:[ //管理车
    'threads/12313',
    'posts/534134',
  ]
}

var user_personal={
  email:String, //电子邮件地址
  regcode:String, //注册码

  hashtype:'pw9',

  //password:String, //密码（明文）
  password:{
    salt:'341424',
    hash:'424515245145145155145',
  }
}

var post={ //post 表示楼
  toc:Number, //创建时间
  tlm:Number, //最后修改时间

  tid:String, //所属的thread的_key属性

  // 以下两个属性是发帖时附上的
  uid:String, //发帖人user的_key

  r:['12313','565436'], //附件列表

  c:String, //楼的内容
  t:String, //楼的标题，可以为空字符串或null
  l:String, //语言，可能的值是 markdown 或 pwbb

  ipoc:'',//ip on created
  iplm:'',//ip last modified

  uidlm:'',//uid last modified
}
/*
关于histories
更新post后，原post会原样丢入histories集合
新post应具有新的tlm属性。
*/

var thread= //thread表示帖
{
  fid:String, //所属的forum的_key属性
  category:'94', //板块下帖子的分类

  //以下属性是发布时或者回帖时更新的。
  toc:Number, //创建日期
  tlm:Number, //最后修改

  digest:Boolean,

  hits:48,
  count:1,
  count_today:0,

  uid:'46528',

  //pid
  lm:'31241', //最后一个回帖
  oc:'24124', //楼主位
}

var forum= //版
{
  class:'regular',//内容控制级别

  type:'forum',//类型：真实板块
  // 'category' //类型：板块分类

  parentid:5, //从属分类

  order:2, //排序
  count_posts:999,
  count_threads:60,
  count_posts_today:6,
  moderators: Number,//版主

  display_name:"板块的显示名称",
  description:'简介',
  owners:String, //csv
  visibility: '(bool) is visible',
  isVisibleForNCC: '(bool) is visible for non-content class user'
}

var counter={ //计数器
  count:Number, // 该项计数值
}

var activeusers = {
  lWPostCount: 1, //last week post count
  lWThreadCount: 1, //thread count
  vitality: 4 //computed by settings.user.vitalityArithmetic
};

var personalForum = {
  uid: 123,
  tid: 123,
  type: 1, //1发帖 2回thread 3修改POST 4推荐 5收藏
  time: 123,// 触发时间
  pid: 123,//POSTid
  fid:123//板块ID
}
