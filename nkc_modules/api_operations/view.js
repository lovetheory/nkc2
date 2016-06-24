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
      return data;
    })
  },

  requiredParams:{
  },
}

table.viewRegister = {
  operation:function(params){
    var data = defaultData(params)

    data.getcode = params.getcode
    data.code = params.code
    data.template = 'nkc_modules/jade/interface_user_register.jade'

    return data
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

    let class = parentforum.class

    filter has(@contentClasses,TO_STRING(class)) /*content ctrl*/

    let group =  {parentforum,forumgroup}
    sort group.parentforum.order asc
    return group
    `,{contentClasses:params.contentClasses}
  )
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
    data.template = jadeDir + 'interface_view_panorama.jade'
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
      var count = 15

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

        limit 10
        return merge(t,{oc:oc,lm:lm})
        `,{contentClasses:params.contentClasses}
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

        return merge(t,{oc:oc,lm:lm})

        `,{contentClasses:params.contentClasses}
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

        return merge(t,{oc:oc,lm:lm})
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

      return data
    })
  }
}

table.viewHome = {
  init:function(){
    queryfunc.createIndex('threads',{
      fields:['fid','disabled'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })

    queryfunc.createIndex('threads',{
      fields:['disabled','tlm'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
  },
  operation:params=>{
    var data = defaultData(params)
    data.template = jadeDir+ 'interface_home.jade'

    var contentClasses = params.contentClasses
    for(c in contentClasses){
      if(!contentClasses[c]){
        contentClasses[c]=undefined;
      }
    }
    var threadPerForum = 3

    return AQL(`
      for f in forums

      let class = f.class

      filter has(@contentClasses,TO_STRING(class)) /*content ctrl*/

      filter f.type == 'forum' && f.parentid !=null
      let threads =
      (
        for t in threads

        filter t.fid == f._key && t.disabled==null
        sort t.fid desc,t.disabled desc, t.tlm desc
        limit ${threadPerForum}

        let oc = document(posts,t.oc)
        return merge(t,{oc})
      )
      let nf = merge(f,{threads})

      collect parent = nf.parentid into forumgroup = nf
      let parentforum = document(forums,parent)

      let class = parentforum.class

      filter has(@contentClasses,TO_STRING(class)) /*content ctrl*/

      let group =  {parentforum,forumgroup}
      sort group.parentforum.order asc
      return group
      `,
      {
        contentClasses,
      }
    )
    .then(grouparray=>{
      data.grouparray = grouparray;
      //data.forums = forums;
      return AQL(`
        for a in answersheets collect with count into k return k
        `
      )
    })
    .then(karr=>{
      var na = karr[0]
      data.answersheet_count = na;
      //data.forums = forums;

      return {} //ignore following
    })
    .then(res=>{
      data.latestThreads = res

      data.seo_arr = settings.seo_rewrite_mapping
      return data
    })
  }
}

function get_all_forums(){
  return AQL
  (
    `for f in forums
    return f
    `
  )
}

function getPaging(params){
  var pagestr = params.page

  if(pagestr){
    var page = parseInt(pagestr)
    if(page===NaN)page = 0
  }else{
    var page = 0
  }

  var perpage = 30
  var start = page* perpage
  var count = perpage

  var paging = {
    page,
    perpage,
    start,
    count,
  }

  return paging
}

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
    })
  },
  operation:params=>{
    var data = defaultData(params)
    data.template = jadeDir+ 'interface_forum.jade'
    if(params.digest){
      data.digest = true
    }

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

          return merge(t,{oc,ocuser,lmuser})
          `,{fid}
        )
      }
      else{
        return null
      }
    })
    .then(res=>{
      data.toppedThreads = res
      return data
    })
  },
  requiredParams:{
    fid:String,
  }
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
        var p = posts[i]

        p.c =
        p.c.replace(/\[hide=([0-9]{1,3}).*?]([^]*?)\[\/hide]/gm, //multiline match
        function(match,p1,p2,offset,string){
          var specified_xsf = parseInt(p1)
          var hidden_content = p2

          var xsf = params.user?params.user.xsf||0:0
          var canShowHiddenContent = (xsf >= specified_xsf)||params.contentClasses['classified']

          if(!canShowHiddenContent){
            hidden_content = ''
          }
          return '[hide='+specified_xsf+']'+hidden_content+'[/hide]'
        })
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

    var uid = params.uid

    if(params.digest){
      var filter = `
      sort t.uid desc,t.disabled desc,t.tlm desc
      filter t.uid == @uid && t.digest==true
      `
      data.digest = true
    }else{
      var filter = `
      sort t.uid desc,t.disabled desc,t.tlm desc
      filter t.uid == @uid && t.disabled==null
      `
    }

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
    params._res.cookie('userinfo',{info:'nkc_logged_out'},{
      signed:true,
      expires:(new Date(Date.now()-86400000)),
    });

    var signed_cookie = params._res.get('set-cookie');

    //put the signed cookie in response, also
    Object.assign(data, {'cookie':signed_cookie,'instructions':
    'you have logged out. you may replace existing cookie with this one'})

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
    data.template = jadeDir+'interface_experimental.jade'

    return getForumList(params)
    .then(forumlist=>{

      data.forumlist=forumlist
      return data
    })
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

    if(target.indexOf('post/')==0)
    {
      //if user appears trying to edit a post
      var pid = target.slice(5);
      report(pid);
      //load from db
      return apifunc.get_a_post(pid)
      .then(function(back){
        data.original_post = back;

        return data
      })
    }
    return data
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
      if(params.category){
        return layer.Question.listAllQuestionsOfCategory(params.category)
      }
      else{
        return layer.Question.listAllQuestions(null)
      }
    })
    .then(function(back){
      data.questions_all = back;
      return layer.Question.listAllQuestions(params.user._key)
    })
    .then(function(back){
      data.questions = back;
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
      let s1=(
        for s in sms
        filter s.s == @uid
        sort s.s desc, s.toc desc
        limit 100
        return s
      )

      let s2=(
        for s in sms
        filter s.r == @uid
        sort s.r desc, s.toc desc
        limit 100
        return s
      )

      let s3 = union(s1,s2)

      for s in s3
      sort s.toc desc

      limit 100

      let us = document(users,s.s)
      let ur = document(users,s.r)

      return merge(s,{us,ur})

      `,{uid}
    )
    .then(sarr=>{
      data.smslist = sarr

      var psnl = new layer.Personal(uid)
      return psnl.update({new_message:0})
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
        thatuser = new layer.User(uid)
        return thatuser.load()
      }else if(uname){
        thatuser = new layer.User()
        return thatuser.loadByName(uname)
      }else{
        throw 'please specify uid or username'
      }
    })
    .then(thatuser=>{
      data.thatuser = thatuser.model
      return data
    })
  }
}
