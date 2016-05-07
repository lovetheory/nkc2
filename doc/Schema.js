
//每个文档都有一个_key属性，即主键，可用于直接访问文档。

var user=
{
  toc:Number, //创建时间
  tlv:Number, //最后访问（登陆）时间
  username:String, //用户名
  password:String, //密码（明文）

  email:String, //电子邮件地址
  regcode:String, //注册码

  certs:[String,String] //证书，即权限组
  cart:[ //管理车
    {itemtype:'thread', id:'12'},
    {itemtype:'thread', id:'13'},
  ]
}

var post={ //post 表示楼
  toc:Number, //创建时间
  tlm:Number, //最后修改时间
  tid:String, //所属的thread的_key属性

  // 以下两个属性是发帖时附上的
  uid:String, //发帖人user的_key
  username:String, //发帖人user的username属性。根据情况可省略。

  c:String, //楼的内容
  t:String, //楼的标题，可以为空字符串
  l:String, //语言，可能的值是 markdown 或 bbcode
}
/*
关于histories
更新post后，原post会原样丢入histories集合
新post应具有新的tlm属性。
*/

var thread= //thread表示帖
{
  toc:Number,
  tlm:Number,
  fid:String, //所属的forum的_key属性

  //以下两个属性是发布时或者回帖时更新的。
  lm:post, //最后一个回帖
  oc:post, //楼主位
}

var forum= //版
{
  posts_today:2,
  posts_total:600,
  threads_total:63,
  display_name:"板块的显示名称",
  owners:[ //所有者，即：版主
    {
      uid:String,
      username:String,
    },
    {
      //可以有多个
    }
  ],
}

var counter={ //计数器
  count:Number, // 该项计数值
}
