module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var moment = require('moment')
var path = require('path')
var fs = require('fs.extra')
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var queryfunc = require('query_functions')
var validation = require('validation')
var AQL = queryfunc.AQL
var apifunc = require('api_functions')
var svgCaptcha = require('svg-captcha');

var layer = require('layer')

var jadeDir = __projectroot + 'nkc_modules/jade/'

var table = {};
module.exports = table;

function defaultData(params){ //default data obj for views
  var user = params?params.user:null
  return {
    site:settings.site,
    user,
    contentClasses:params.contentClasses,
    permittedOperations:params.permittedOperations,
    lastlogin:params._req.userinfo?params._req.userinfo.lastlogin:undefined
  }
}

table.viewMe = {
  operation:function(params){
    var data = defaultData(params)
    data.template = jadeDir+ 'interface_me.jade'

    if(!params.user) throw 'must login to view this page'

    data.allCertificates =  require('permissions').listAllCertificates()

    data.certificateDefinitions = require('permissions').certificates

    data.examinated = params.examinated
    data.replytarget = 'me'
    return data
  }
}

table.viewExam = {
  operation:function(params){
    var data = defaultData(params)

    data.template = 'nkc_modules/jade/interface_exam.jade' //will render if property 'template' exists

    //if(params.user) throw ('to take exams, you must logout first.')

    if(params.result){
      data.detail = params.detail
      data.result = params.result

      return data;
    }

    return apifunc.exam_gen({ip:params._req.iptrim,category:params.category})
      .then(function(back){
        data.exam = back;
        data.category = params.category
        return data;
      })
  },

  requiredParams:{
  },
}

table.viewRegister = {
  operation:function(params){
    var data = defaultData(params)
    var captcha = svgCaptcha.create();  //创建验证码
    params._req.session.icode = captcha.text;  //验证码text保存到session中
    var road = path.resolve(__dirname, '../..')
    fs.writeFile(road +'/static/captcha/captcha.svg', captcha.data, { 'flag': 'w' });  //保存验证码图片
    //console.log(captcha.text);
    data.getcode = params.getcode
    data.code = params.code
    data.template = 'nkc_modules/jade/interface_user_register.jade'

    return data
  }
}


//邮箱注册
table.viewRegister2 = {
  operation:function(params){
    var data = defaultData(params)
    var captcha = svgCaptcha.create();  //创建验证码
    params._req.session.icode = captcha.text;  //验证码text保存到session中
    var road = path.resolve(__dirname, '../..')
    fs.writeFile(road +'/static/captcha/captcha.svg', captcha.data, { 'flag': 'w' });  //保存验证码图片
    //console.log(captcha.text);
    data.template = 'nkc_modules/jade/interface_user_register2.jade'

    return data
  }
}



//激活邮箱
table.viewActiveEmail = {
  operation:function(params){
    var email = params.email
    var ecode = params.ecode
    var data = defaultData(params)
    //data.template = 'nkc_modules/jade/viewActiveEmail.jade'
    data.template = 'nkc_modules/jade/interface_user_login.jade'

    return AQL(`
      for u in emailRegister
      filter u.email==@email && u.ecode==@ecode && u.toc > @toc
      limit 1
      return u
      `,{email:email, ecode:ecode, toc:Date.now()-2*60*1000}
    )
      .then(res=>{
        if(res.length > 0){
          var user = {
            username:res[0].username,
            password:res[0].passwd,
            email:res[0].email
          }
          create_muser(user)
            .then(k=>{
              //console.log(k)
            })
          data.activeInfo1 = '邮箱注册成功，赶紧登录吧~'
        }else{
          data.activeInfo2 = '邮箱链接已失效，请重新注册！'
        }
        return data
      })

  }
}


//点击刷新验证码图片(注册)
table.refreshicode = {
  operation:function(params){
    var data = defaultData(params)
    var captcha = svgCaptcha.create();  //创建验证码
    params._req.session.icode = captcha.text;  //验证码text保存到session中
    var road = path.resolve(__dirname, '../..')
    fs.writeFile(road +'/static/captcha/captcha.svg', captcha.data, { 'flag': 'w' });  //保存验证码图片
    return {'resCode':0}
  }
}


//点击刷新验证码图片(手机找回密码)
table.refreshicode3 = {
  operation:function(params){
    var data = defaultData(params)
    var captcha = svgCaptcha.create();  //创建验证码
    params._req.session.icode3 = captcha.text;  //验证码text保存到session中
    var road = path.resolve(__dirname, '../..')
    fs.writeFile(road +'/static/captcha/captcha3.svg', captcha.data, { 'flag': 'w' });  //保存验证码图片
    return {'resCode':0}
  }
}


function getForumList(params) {
  var contentClasses = params.contentClasses
  for(c in contentClasses){
    if(!contentClasses[c]){
      contentClasses[c]=undefined;
    }
  }

  return AQL(`
    for f in forums
    filter f.type == 'forum' && f.parentid !=null

    let class = f.class
    filter has(@contentClasses,TO_STRING(class)) /*content ctrl*/

    let nf = f

    collect parent = nf.parentid into forumgroup = nf
    let parentforum = document(forums,parent)
    filter parentforum

    let class = parentforum.class

    filter has(@contentClasses,TO_STRING(class)) /*content ctrl*/

    let group =  {parentforum,forumgroup}
    sort group.parentforum.order asc
    return group
    `,{contentClasses:params.contentClasses}
  )
}


function getForumListKv(params){
  return getForumList(params)
    .then(res=>{
      var forumlist = res
      var kv = {}
      forumlist.map(group=>{
        group.forumgroup.map(f=>{
          var belong_forum = f
          var pf = group.parentforum
          kv[f._key] = {
            belong_forum,
            pf,
            color:(f?f.color:null)||(pf?pf.color:null)||'#aaa',
          }
        })
      })

      return kv
    })
}


table.viewPanorama = {
  init:function(){
    queryfunc.createIndex('threads',{
      fields:['digest'],
      type:'hash',
      unique:'false',
      sparse:'true',
    })
    queryfunc.createIndex('threads',{
      fields:['disabled','toc'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })

    queryfunc.createIndex('threads',{
      fields:['digest','toc'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })

    queryfunc.createIndex('users',{
      fields:['tlv'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
  },
  operation:params=>{
    var data= defaultData(params)
    data.template = jadeDir + 'interface_panorama.jade'
    data.navbar={highlight:'pano'}
    return AQL(`
      for t in threads
      filter t.digest==true
      collect with count into k
      return k
      `
    )
      .then(count_digests=>{
        count_digests = count_digests[0]
        var count = 6

        var randomarray=[]
        for(i=0;i<count;i++){
          randomarray.push(
            Math.floor(Math.random()*count_digests-0.0001)
          )
        }

        var promarr = []
        var tharr = []
        for(i in randomarray){
          promarr.push(AQL(`
          for t in threads
          filter t.digest == true
          limit @i,1

          let p = document(posts,t.oc)
          let u = document(users,p.uid)

          return merge(t,{oc:p,ocuser:u})
          `,{
              i:randomarray[i],
            }
          ).then(res=>{
            tharr.push(res[0])
          }))
        }

        return Promise.all(promarr)
          .then(()=>{
            return tharr
          })
      })
      .then(res=>{
        data.digestThreads = res

        //latestThreads
        return AQL(`
        for t in threads
        sort t.disabled desc, t.tlm desc
        filter t.disabled==null
        limit 60

        let parentforum = document(forums,t.fid)
        let class = parentforum.class

        filter has(@contentClasses,TO_STRING(class)) /*content ctrl*/

        let oc = document(posts,t.oc)
        let lm = document(posts,t.lm)
        let forum = document(forums,t.fid)
        let ocuser = document(users,t.uid)

        limit 10
        return merge(t,{oc:oc,lm:lm,forum,ocuser})
        `,{contentClasses:Object.assign(params.contentClasses,{sensitive:true,non_broadcast:undefined})}
        )
      })
      .then(res=>{
        data.latestThreads = res
        return AQL(`
        for t in threads
        sort t.disabled desc, t.toc desc
        filter t.disabled==null
        limit 60

        let parentforum = document(forums,t.fid)
        let class = parentforum.class

        filter has(@contentClasses,TO_STRING(class)) /*content ctrl*/

        limit 10
        let oc = document(posts,t.oc)
        let lm = document(posts,t.lm)
        let forum = document(forums,t.fid)
        let ocuser = document(users,oc.uid)

        return merge(t,{oc,lm,forum,ocuser})

        `,{contentClasses:Object.assign(params.contentClasses,{sensitive:true,non_broadcast:undefined})}
        )
      })
      .then(res=>{
        data.newestThreads = res

        return AQL(`
        for t in threads
        filter t.digest == true
        sort t.digest desc, t.toc desc

        limit 10
        let oc = document(posts,t.oc)
        let lm = document(posts,t.lm)
        let forum = document(forums,t.fid)
        let ocuser = document(users,t.uid)

        return merge(t,{oc:oc,lm:lm,forum,ocuser})
        `
        )
      })
      .then(res=>{
        data.newestDigestThreads = res

        return AQL(`
        for u in users
        //filter u.tlv!=null
        sort u.tlv desc
        limit 30
        return u
        `
        )
      })
      .then(res=>{
        data.latestVisitUsers = res

        return null

        return AQL(`
        for t in threads
        sort t.disabled desc, t.toc desc
        filter t.disabled==null
        limit 60

        let parentforum = document(forums,t.fid)
        let class = parentforum.class

        filter has(@contentClasses,TO_STRING(class)) /*content ctrl*/


        let oc = document(posts,t.oc)
        let lm = document(posts,t.lm)
        filter lm.disabled!=true
        limit 10
        let forum = document(forums,t.fid)
        let ocuser = document(users,oc.uid)
        let lmuser = document(users,lm.uid)

        let resources_declared = (
          let p = lm
          filter is_array(p.r)
          for r in p.r
          let rd = document(resources,r)
          filter rd!=null
          return rd
        )

        //return merge(t,{oc,lm,forum,ocuser})
        return merge(lm,{r:resources_declared,user:lmuser,thread:merge(t,{oc,ocuser})})
        `,{contentClasses:Object.assign(params.contentClasses,{sensitive:true,non_broadcast:undefined})}
        )
      })
      .then(res=>{
        //data.galleryItems = galleryItems

        data.latestReplies2 = res
        return data
      })
  }
}

table.viewHome = {
  init:function(){
    queryfunc.createIndex('threads',{
      fields:['digest'],
      type:'hash',
      unique:'false',
      sparse:'true',
    })
    queryfunc.createIndex('threads',{
      fields:['disabled','toc'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })

    queryfunc.createIndex('threads',{
      fields:['digest','toc'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })

    queryfunc.createIndex('activeusers',{
      fields:['vitality'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
  },
  operation:params=>{
    var data = defaultData(params);
    var contentClasses = {};
    data.template = jadeDir+ 'interface_home__new.jade';
    data.navbar = {highlight: 'home'};
    for(var param in params.contentClasses) {
      if(params.contentClasses[param] == true) {
        contentClasses[param] = true;
      }
    }
    return AQL(`
    for t in threads
    LET f = DOCUMENT(forums, t.fid)
    FILTER t.disabled != true && t.fid != '97'
    && t.fid != 'recycle' && f.visibility == true
    sort t.toc desc
    
    limit 10
    let oc = document(posts,t.oc)
    let lm = document(posts,t.lm)
    let forum = document(forums,t.fid)
    let ocuser = document(users,t.uid)

    return merge(t,{oc:oc,lm:lm,forum,ocuser})
    `)
      .then(res=>{
        data.newestDigestThreads = res

        //add homepage posts      17-03-13  lzszone
        if(params.digest) {
          return AQL(`
          FOR t IN threads
            FILTER t.disabled == null && t.fid != 'recycle' && t.digest == true
            LET forum = DOCUMENT(forums, t.fid)
            FILTER (HAS(@contentClasses, forum.class) || forum.isVisibleForNCC == true) && forum.visibility == true
            COLLECT WITH COUNT INTO length
            RETURN length
        `, {contentClasses: params.contentClasses})
        }
        return AQL(`
          FOR t IN threads
            FILTER t.disabled == null && t.fid != 'recycle'
            LET forum = DOCUMENT(forums, t.fid)
            FILTER (HAS(@contentClasses, forum.class) || forum.isVisibleForNCC == true) && forum.visibility == true
            COLLECT WITH COUNT INTO length
            RETURN length - 250 //估计帖子有坏数据,筛选有空白页
        `, {contentClasses: params.contentClasses})
      })
      .then(length => {
        var paging = new layer.Paging(params.page).getPagingParams(length);
        data.paging = paging
        if(params.digest){;
          data.digest = true;
        }
        data.sortby = params.sortby;
        return queryfunc.getIndexThreads(params, paging)
      })
      .then(res => {
        data.indexThreads = res._result;
        return queryfunc.getActiveUsers();
      })
      .then(res => {
        data.activeUsers = res._result;
        return queryfunc.getIndexForumList(contentClasses);
      })
      .then(res => {
        data.indexForumList = res._result;
      })
      .then(() => data)
      .catch(e => console.log(e))
  }
};

var xsflimit = require('../misc/xsflimit')

table.viewForum = {
  init:function(){
    return layer.Forum.buildIndex()
      .then(()=>{
        queryfunc.createIndex('threads',{
          fields:['topped','fid','toc'],
          type:'skiplist',
          unique:'false',
          sparse:'true',
        })

        queryfunc.createIndex('threads',{
          fields:['fid','cid','toc'],
          type:'skiplist',
          unique:'false',
          sparse:'true',
        })

        queryfunc.createIndex('threads',{
          fields:['fid','cid','tlm'],
          type:'skiplist',
          unique:'false',
          sparse:'true',
        })
      })
  },
  operation:params=>{
    var data = defaultData(params)
    data.template = jadeDir+ 'interface_forum.jade'
    if(params.digest){
      data.digest = true
    }
    data.cat = params.cat
    data.sortby = params.sortby

    var fid = params.fid;
    var forum = new layer.Forum(fid)

    return forum.load()
      .then(forum=>{
        return forum.inheritPropertyFromParent()
          .then(res=>{
            return forum.testView(params.contentClasses)
          })
      })
      .then(()=>{
        data.forum = forum.model
      })
      .then(()=>{

        return forum.listThreadsOfPage(params)
      })
      .then(result=>{
        //if nothing went wrong
        data.threads = result
        data.paging = result.paging

        return getForumList(params)
      })
      .then(forumlist=>{
        data.forumlist = forumlist
        data.replytarget = 'f/' + fid;

        if(data.paging.page==0){
          return AQL(`
          for t in threads
          filter t.topped==true && t.fid == @fid
          sort t.topped, t.fid, t.toc

          let oc = document(posts,t.oc)
          let lm = document(posts,t.lm)
          let ocuser = document(users,oc.uid)
          let lmuser = document(users,lm.uid)

          return merge(t,{oc,lm,ocuser,lmuser})
          `,{fid}
          )
        }
        else{
          return null
        }
      })
      .then(res=>{
        data.toppedThreads = res

        return AQL(`
        for f in forums
        filter f.parentid==@parentid
        sort f.order

        let class = f.class
        let display_name = f.display_name
        let moderators = f.moderators

        filter has(@contentClasses,TO_STRING(class)) /*content ctrl*/

        let threads =
        (
          for t in threads

          filter t.fid == f._key && t.disabled==null
          sort t.fid desc,t.disabled desc, t.tlm desc
          limit 5

          let oc = document(posts,t.oc)
          let ocuser = document(users,t.uid)
          let lm = document(posts,t.lm)
          let lmuser = document(users,lm.uid)

          return merge(t,{oc,ocuser,lm,lmuser})
        )
        let nf = merge(f,{threads, display_name, moderators})

        return nf
        `,{parentid:data.forum._key||999,contentClasses:params.contentClasses}
        )
      })
      .then(res=>{
        data.forums = res
        //return data

        return getThreadTypes(fid)
      })
      .then(res=>{
        data.threadtypes = res.tt
        data.forumthreadtypes = res.ftt

      })
      .then(res=>{

        return data
      })
  },
  requiredParams:{
    fid:String,
  }
}

function getThreadTypes(fid){
  return AQL(`
    let tt = (for i in threadtypes return i)
    let ftt = (for i in threadtypes filter i.fid==@fid sort i.order return i)
    return {tt,ftt}
    `,{fid:fid||null}
  )
    .then(res=>{
      return res[0]
    })
}

function getOneThreadTypes(fid){
  return AQL(`
    for i in threadtypes filter i.fid==@fid
    return i
    `,{fid:fid||null}
  )
}

table.viewThread = {
  init:function(){
    return layer.Thread.buildIndex()
  },
  operation:function(params){
    var data = defaultData(params)
    data.template = jadeDir + 'interface_thread.jade'
    var tid = params.tid

    var thread = new layer.Thread(tid)
    return thread.load()
      .then(res=>{
        return thread.loadForum()
      })
      .then(forum=>{
        return forum.testView(params.contentClasses)// test if have permission to view.
      })
      .then(forum=>{
        data.forum = forum.model

        return thread.mergeOc()
          .then(res=>{
            var ocuser = new layer.User(thread.model.oc.uid)
            return ocuser.load()
              .then(ocuser=>{
                data.ocuser = ocuser.model


                data.paging = thread.getPagingParams(params.page)
                return thread.listPostsOfPage(params.page)
              })
          })
      })
      .then(posts=>{

        //xsf limiting on post content
        for(i in posts){
          posts[i]=xsflimit(posts[i],params)
        }

        if (!posts.length) {
          params._res.redirect('/t/'+params.tid)
          params._res.sent = true
          //if no posts exist on that page, goto 1th page
        }

        data.posts = posts
        data.thread = thread.model
      })
      .then(result=>{
        return getForumList(params)
      })
      .then(forumlist=>{

        data.forumlist = forumlist
        data.replytarget = 't/' + tid

        return thread.accumulateCountHit()
          .then(res=>{
            return data
          })
      })
  },
  requiredParams:{
    tid:String,
  }
}

table.viewUserThreads = {
  requiredParams:{
    uid:String,
  },
  init:function(){
    queryfunc.createIndex('threads',{
      fields:['uid','disabled','tlm'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
  },
  operation:function(params){
    var data=defaultData(params)
    data.template = jadeDir + 'interface_forum.jade'
    data.operation='viewUserThreads'

    var uid = params.uid

    data.sortby = params.sortby
    data.digest = params.digest

    var filter = `
    filter
    t.uid == @uid
    ${params.digest?'&& t.digest==true':''}

    sort
    ${params.sortby?'t.toc':'t.tlm'} desc

    `

    var userclass = new layer.User(uid)
    return userclass.load()
      .then(()=>{
        return AQL(`
        for t in threads ${filter} collect with count into k return k
        `,{uid}
        )
      })
      .then(res=>{
        totalcount = res[0]

        var paging = new layer.Paging(params.page)
        data.paging = paging.getPagingParams(totalcount)

        var user = userclass.model

        data.forum = {
          display_name:user.username+' 的主题',
          description:user.post_sign||'',
          count_threads:user.count_threads||null,
          count_posts:user.count_posts||null,
          color:user.color||'#bbb'
        }

        var uid = user._key
        return AQL(`
        for t in threads

        ${filter}

        limit @start,@count

        let oc = document(posts,t.oc)
        let lm = document(posts,t.lm)
        let ocuser = document(users,oc.uid)
        let lmuser = document(users,lm.uid)

        return merge(t,{oc,ocuser,lmuser})
        `,
          {
            uid,
            start:data.paging.start,
            count:data.paging.count,
          }
        )
      })
      .then(threads=>{
        //if nothing went wrong
        data.threads = threads
        //return apifunc.get_all_forums()

        return getForumList(params)
      })
      .then(forumlist=>{
        data.forumlist = forumlist
        return data
      })
  }
}

table.viewLogout = {
  operation:function(params){
    var data=defaultData(params)
    data.template = jadeDir+'interface_user_logout.jade'

    data.user = undefined

    //gotta avoid CSRF here
    var ihash = params.hash

    if(params._req.userinfo){
      if(Number(ihash)!==params._req.userinfo.lastlogin){
        throw 'potential CSRF'
      }
    }

    params._res.cookie('userinfo',{info:'nkc_logged_out'},{
      signed:true,
      expires:(new Date(Date.now()-86400000)),
    });

    var signed_cookie = params._res.get('set-cookie');

    //put the signed cookie in response, also
    // Object.assign(data, {'cookie':signed_cookie,'instructions':
    // 'you have logged out. you may replace existing cookie with this one'})

    return data;
  },
}

table.viewLogin = {
  operation:params=>{
    var data = defaultData(params)
    data.template = jadeDir+'interface_user_login.jade'
    return data
  }
}

table.viewExperimental = {
  operation:params=>{
    var data = defaultData(params)
    var contentClasses = {};
    data.template = jadeDir+'interface_experimental.jade'
    for(var param in params.contentClasses) {
      if(params.contentClasses[param] === true) {
        contentClasses[param] = true;
      }
    }
    return getForumList(params)
      .then(forumlist=>{

        data.forumlist=forumlist
      })
      .then(() => queryfunc.getForumList(contentClasses))
      .then(res => data.forumTree = res._result)
      .then(() => data)
  }
}


table.viewEditor = {
  operation:params=>{
    var data = defaultData(params)
    data.template = jadeDir + 'interface_editor.jade'

    var target = params.target||"";

    data.replytarget = target;
    data.navbar = {}
    data.navbar.highlight = 'editor'; //navbar highlight

    if(target.indexOf('post/')==0){
      //if user appears trying to edit a post
      var pid = target.slice(5);
      report(pid);
      //load from db
      return apifunc.get_a_post(pid)
        .then(function(back){
          data.original_post = back;
          return data;
        })
    }

    data.original_post = {
      c:params.content?decodeURI(params.content):'',
      //l:'pwbb',
    }

    var a = target.split('/')[1];  //版块号
    return getOneThreadTypes(a)
      .then(res=>{
        if(res.length != 0){
          res.splice(0, 0, {"_key":'0',"name":"--默认无分类--"});  //添加到第一个位置
        }
        data.threadtypes = res;
        return data;
      })

    return data;
  }
}



table.viewDanger = {
  operation:params=>{
    var data = defaultData(params)
    data.template = jadeDir + 'interface_danger.jade'

    var doc_id = params.id
    var username = params.username

    return Promise.resolve()
      .then(()=>{
        if(doc_id){
          var p = doc_id.split('/')
          var collname = p[0]
          var doc_key = p[1]

          var doc = new layer.BaseDao(collname,doc_key)

          return doc.load()
            .then(m=>{
              data.doc = doc.model
            })
            .catch(err=>{
              //ignore
              report('no doc to load/bad id')
            })
            .then(()=>{
              return data
            })
        }

        if(username){
          var user = new layer.User()
          return user.loadByName(username)
            .then(u=>{
              data.doc = u.model
              return data
            })
            .catch(err=>{
              return data
            })
        }

        return data
      })
      .then(data=>{
        return getForumList(params)
      })
      .then(fl=>{
        data.forumlist = fl
        return data
      })

  }
}

table.dangerouslyReplaceDoc = {
  operation:params=>{
    var doc = params.doc
    return queryfunc.doc_replace(doc,doc)
  },
  requiredParams:{
    doc:Object,
  }
}

table.viewQuestions = {
  init:function(){
    queryfunc.createIndex('questions',{
      fields:['toc'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
    queryfunc.createIndex('questions',{
      fields:['category','toc'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
    queryfunc.createIndex('questions',{
      fields:['uid','toc'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
  },
  operation:params=>{
    var data = defaultData(params)
    data.template = jadeDir + 'questions_edit.jade'

    return Promise.resolve()
      .then(()=>{
        var showcount = params.permittedOperations.listAllQuestions?null:5;

        if(params.category){
          return layer.Question.listAllQuestionsOfCategory(params.category,showcount)
        }
        else{
          return layer.Question.listAllQuestions(null,showcount)
        }
      })
      .then(function(back){
        data.questions_all = back

        return layer.Question.listAllQuestions(params.user._key)
      })
      .then(function(back){
        data.questions = back;

        return AQL(`
        let byuser = (
          for q in questions
          collect username = (q.username||document(users,q.uid).username) with count into number
          sort number desc
          return {username,number}
        )

        let bycategory = (
          for q in questions
          collect category = q.category with count into number
          sort number desc
          return {category,number}
        )

        return {byuser,bycategory}
        `
        )
      })
      .then(back=>{
        data.byuser = back[0].byuser
        data.bycategory = back[0].bycategory

        return data
      })
  }
}

table.viewSMS = {
  init:function(){
    queryfunc.createIndex('sms',{
      fields:['s','toc'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
    queryfunc.createIndex('sms',{
      fields:['r','toc'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
  },
  operation:params=>{
    var data = defaultData(params)
    data.template = jadeDir + 'interface_messages.jade'
    var uid = params.user._key

    data.receiver = params.receiver //optional param
    return AQL(`
      FOR s IN sms
        FILTER s.s == @uid || s.r == @uid
        COLLECT WITH COUNT INTO length
        RETURN length
    `, {uid})
      .then(length => {
        var paging = new layer.Paging(params.page).getPagingParams(length);
        data.paging = paging;

        return AQL(`
          FOR s IN sms
            FILTER s.s == @uid || s.r == @uid
            SORT s.s DESC, s.toc DESC
            LIMIT @start, @count
            LET us = DOCUMENT(users, s.s)
            LET ur = DOCUMENT(users, s.r)
            RETURN MERGE(s, {us, ur})
        `,{uid: uid, start: paging.start, count: paging.count})
      })
      .then(sarr=>{
        data.smslist = sarr

        return AQL(`
        for r in replies
        filter r.touid == @uid
        sort r.touid desc, r.toc desc
        limit 40
        let frompost = document(posts,r.frompid)
        let fromuser = document(users,frompost.uid)
        let touser = document(users,r.touid)
        let topost = document(posts,r.topid)

        filter !frompost.disabled

        limit 30
        return merge(r,{fromuser,frompost,topost,touser})
        `,{uid}
        )
      })
      .then(arr=>{
        data.replylist = arr;
        var psnl = new layer.Personal(uid)
        return psnl.load()
          .then(psnl=>{
            data.lastVisitTimestamp = psnl.model.message_lastvisit||0
            return psnl.update({new_message:0,message_lastvisit:Date.now()})
          })
          .then(psnl=>{
            return data
          })
      })
  }
}

table.viewPersonal = {
  operation:function(params){
    var data = defaultData(params)
    data.template = jadeDir + 'interface_personal.jade'
    var psnl = new layer.Personal(params.user._key)
    return psnl.load()
      .then(psnl=>{
        data.personal = psnl

        return getForumList(params)
      })
      .then(res=>{
        data.forumlist = res
        return data
      })
  }
}

table.viewSelf = {
  operation:function(params){
    params.uid = params.user._key
    return table.viewUser.operation(params)
      .then(data=>{
        data.navbar_highlight = 'self'
        return data
      })
  },
}

table.viewUser = {
  operation:function(params){
    var data = defaultData(params)
    data.template = jadeDir +'interface_profile.jade'

    var uid = params.uid
    var uname = params.username

    return Promise.resolve()
      .then(()=>{
        var thatuser
        if(uid){
          thatuser = new layer.User(uid.toString())
          return thatuser.load()
        }else if(uname){
          thatuser = new layer.User()
          return thatuser.loadByName(uname.toString())
        }else{
          throw 'please specify uid or username'
        }
      })
      .then(thatuser=>{
        data.thatuser = thatuser.model
        uid = thatuser.model._key
        //1. list posts replied by this user
        return AQL(`
        for p in posts
        filter p.uid == @uid
        sort p.tlm desc
        limit 20

        let thread = document(threads,p.tid)

        filter !p.disabled
        filter thread.oc != p._key

        let oc = document(posts,thread.oc)

        limit 10
        return merge(p,{thread:merge(thread,{oc})})

        `,{uid}
        )
      })
      .then(recentposts=>{
        data.recentReplies = recentposts

        return AQL(`
        for p in posts
        filter p.uid == @uid
        sort p.toc desc
        limit 40

        filter !p.disabled

        let thread = document(threads,p.tid)
        filter thread
        filter thread.lm != p._key

        let lm = document(posts,thread.lm)
        filter !lm.disabled
        let oc = document(posts,thread.oc)

        let lmuser = document(users,lm.uid)

        return merge(p,{thread:merge(thread,{oc,lm,lmuser})})

        `,{uid}
        )
      })
      .then(res=>{

        //filtering:
        // remove duplicate threads in result
        var resfiltered = [];var cache={}
        for(p in res){
          if(cache[res[p].tid]){

          }else{
            cache[res[p].tid]=true;
            resfiltered.push(res[p])
          }
        }
        data.recentInvolvedThreadResponses = resfiltered.sort(function(a,b){
          return b.thread.tlm - a.thread.tlm
        }).slice(0,10)

        return data
      })
  }
}

table.viewPostHistory = {
  operation:function(params){
    var data = defaultData(params)
    data.template = jadeDir + 'interface_post_history.jade'

    var pid = params.pid

    var p = new layer.Post(pid)
    return p.load()
      .then(p=>{
        return p.testView(params.contentClasses)
      })
      .then(p=>{

        data.post = p.model
        return AQL(
          `
        for p in histories
        filter p.pid == @pid
        sort p.pid desc, p.tlm desc
        return p
        `,{pid}
        )
      })
      .then(posts=>{
        data.histories = posts
        return data
      })
  },
  requiredParams:{
    pid:String,
  }
}

table.viewPage = {
  operation:function(params){
    var data = defaultData(params)
    data.template = jadeDir + 'interface_page.jade'

    var pagenames = {'faq':'822194'}
    var pid = pagenames[params.pagename]||params.pagename
    var post = new layer.Post(pid)
    return post.load()
      .then(p=>{
        return p.mergeResources()
      })
      .then(p=>{
        data.post = p.model
        return data
      })
  },
  requiredParams:{
    pagename:String,
  }
}

table.viewTemplate = {
  operation:function(params){
    var data = defaultData(params)
    data.template = jadeDir+params.template
    return data
  },
  requiredParams:{
    template:String,
  }
}

table.viewCollectionOfUser = {
  operation:function(params){
    var operations = require('api_operations')

    var data = defaultData(params)
    data.template = jadeDir + 'interface_collections.jade'

    var uid = params.uid||params.user._key
    params.uid = uid
    var u = new layer.User(uid)
    return u.load()
      .then(u=>{
        data.thisuser = u.model

        return operations.table.listMyCategories.operation(params)
      })
      .then(arr=>{
        data.categoryNames = arr
        if(arr.indexOf(params.category||null)<0){
          //if specified category not exist
          params.category = arr[0]
        }

        return operations.table.listMyCollectionOfCategory.operation(params)
      })
      .then(arr=>{
        data.categoryThreads = arr
        data.category = params.category

        return getForumList(params)
          .then(res=>{
            data.forumlist = res
            data.forum = {}
            return data
          })
      })
  }
}

table.viewForgotPassword={
  operation:function(params){
    var data = defaultData(params)
    data.template = jadeDir + 'interface_viewForgotPassword.jade'

    data.token = params.token
    data.sent = params.sent
    //console.log(data)
    return data
  }
}


//手机找回密码
table.viewForgotPassword2 = {
  operation:function(params){
    var data = defaultData(params)
    var captcha = svgCaptcha.create();  //创建验证码
    params._req.session.icode3 = captcha.text;  //验证码text保存到session中
    var road = path.resolve(__dirname, '../..')
    fs.writeFile(road +'/static/captcha/captcha3.svg', captcha.data, { 'flag': 'w' });  //保存验证码图片
    data.template = jadeDir + 'interface_viewForgotPassword2.jade'

    data.username = params.username  //url后面的参数
    data.phone = params.phone
    data.mcode = params.mcode

    if(data.phone != undefined && data.mcode != undefined){
      return AQL(`
        for u in mobilecodes
        filter u.mobile == @mobile
        return u
        `,{mobile:data.phone}
      )
        .then(a=>{
          //console.log(a)
          return AQL(`
          for u in users
          filter u._key == @userid
          return u
          `,{userid:a[0].uid}
          )
        })
        .then(b=>{
          //console.log(b)
          return data
        })

    }



    return data
  }
}


table.viewLocalSearch = {
  operation:function(params) {
    var data = defaultData(params)
    data.template = jadeDir + 'interface_localSearch.jade'

    params.start = Number(params.start)||0
    params.count = Number(params.count)||30

    var operations = require('api_operations')
    return operations.table.localSearch.operation(params)
      .then(res=>{
        //console.log(res)
        data.match_one_user = res.match_one_user  //完全匹配的某个用户
        data.match_users = res.match_users  //完全匹配的某个用户
        data.searchresult = res.result  //搜索帖子的结果
        data.start = params.start
        data.count = params.count
        data.users_start = params.users_start
        data.users_count = params.users_count

        data.searchstring = params.searchstring

        return AQL(`
        for h in @hits
        let t = document(threads,h._source.tid)
        let oc = document(posts,t.oc)
        let ocuser = document(users,oc.uid)
        let lm = document(posts,t.lm)
        let lmuser = document(users,lm.uid)
        return merge(t,{oc,lm,ocuser,lmuser})
        `,{hits:res.result.hits.hits}
        )
      })
      .then(res=>{
        data.threads = res
        return getForumListKv(params)
      })
      .then(res=>{
        data.forumlistkv = res
        return getThreadTypes()
      })
      .then(res=>{
        data.threadtypes = res.tt
        data.forumthreadtypes = res.ftt

        return data
      })
  },
}



function sha256HMAC(password,salt){
  const crypto = require('crypto')
  var hmac = crypto.createHmac('sha256',salt)
  hmac.update(password)
  return hmac.digest('hex')
}


function create_muser(user){
  return apifunc.get_new_uid()
    .then((newuid)=>{
      var timestamp = Date.now();

      var newuser = {
        _key:newuid,
        username:user.username,
        username_lowercase:user.username.toLowerCase(),
        toc:timestamp,
        tlv:timestamp,
        certs:['mobile'],
      }

      var salt = Math.floor((Math.random()*65536)).toString(16)
      var hash = sha256HMAC(user.password,salt)

      var newuser_personal = {
        _key:newuid,
        email:user.email,
        hashtype:'sha256HMAC',
        password:{
          hash:hash,
          salt:salt,
        },
      }
      return queryfunc.doc_save(newuser,'users')
        .then(()=>{
          return queryfunc.doc_save(newuser_personal,'users_personal')
        })
        .then(res=>{
          return res
        })
    })
}
