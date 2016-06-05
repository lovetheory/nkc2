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

    return apifunc.exam_gen({ip:params._req.iptrim})
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
      return data;
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
    return queryfunc.createIndex('threads',{
      fields:['fid','disabled','tlm'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
  },
  operation:params=>{
    var data = defaultData(params)
    data.template = jadeDir+ 'interface_forum.jade'
    var fid = params.fid;

    if(params.digest){
      var filter = `
      filter t.fid == forum._key && t.digest == true
      sort t.fid desc, t.digest desc, t.tlm desc
      `
      data.digest = true
    }else{
      var filter = `
      filter t.fid == forum._key && t.disabled==null
      sort t.fid desc, t.disabled desc, t.tlm desc
      `
    }

    var paging = getPaging(params)
    data.paging = paging

    return AQL(`return document(forums,@fid)`,{fid})
    .then(res=>{
      var forum = res[0]
      testForumClass(params,forum)

      if(forum.parentid){
        return AQL(`return document(forums,@fid)`,{fid:forum.parentid})
        .catch(err=>{

        })
        .then(res=>{
          if(res){
            testForumClass(params,res[0])
          }
        })
      }

    })
    .then(()=>{
      return AQL(`
        let forum = document(forums,@fid)
        let threads = (
          for t in threads
          ${filter}
          limit @start,@count

          let oc = document(posts,t.oc)
          let lm = document(posts,t.lm)
          let ocuser = document(users,oc.uid)
          let lmuser = document(users,lm.uid)

          return merge(t,{oc,ocuser,lmuser})
        )
        return {forum,threads}

        `,
        {
          fid,
          start:paging.start,
          count:paging.count,
        }
      )
    })
    .then((result)=>{
      //if nothing went wrong
      Object.assign(data,result[0])

      if(data.paging){
        data.paging.pagecount = data.forum.count_threads?Math.floor(data.forum.count_threads / paging.perpage) + 1:null
      }
      //return apifunc.get_all_forums()
      return getForumList(params)
    })
    .then(forumlist=>{
      data.forumlist = forumlist
      data.replytarget = 'f/' + fid;
      return data
    })
  },
  requiredParams:{
    fid:String,
  }
}

function testForumClass(params,forum){
  if(!forum)return;
  if(!forum.class)return;
  if(params.contentClasses[forum.class]){ // if user have enough class
    return;
  }else{
    throw 'no enough permission. you need a content-class named ['+ forum.class +']'
  }
}

table.viewThread = {
  init:function(){
    return queryfunc.createIndex('posts',{
      fields:['tid','toc'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
    .then(()=>{
      return queryfunc.createIndex('resources',{
        fields:['pid'],
        type:'hash',
        unique:'false',
        sparse:'false',
      })
    })
  },
  operation:function(params){
    var data = defaultData(params)
    data.template = jadeDir + 'interface_thread.jade'
    var tid = params.tid

    var paging = getPaging(params)

    return AQL(`return document(forums,document(threads,@tid).fid)`,{tid})
    .then(res=>{
      forum = res[0];
      return testForumClass(params,forum)
    })
    .then(()=>{
      return AQL(
        `
        let thread = document(threads,@tid)

        let forum = document(forums,thread.fid)
        let oc = document(posts,thread.oc)

        let posts = (
          for p in posts
          sort p.tid asc, p.toc asc
          filter p.tid == thread._key

          limit @start,@count

          let user = document(users,p.uid)

          let resources_declared = (
            filter is_array(p.r)
            for r in p.r
            let rd = document(resources,r)
            filter rd!=null
            return rd
          )

          let resources_assigned = (
            for r in resources
            filter r.pid == p._key
            return r
          )

          return merge(p,{
            user,
            r:union_distinct(resources_declared,resources_assigned)
          })
        )
        return {
          thread,oc,forum,posts
        }
        `,
        {
          tid,
          start:paging.start,
          count:paging.count,
        }
      )
    })
    .then(result=>{
      Object.assign(data,result[0]);

      if(!data.thread)throw 'thread not exist'

      var thread = data.thread
      paging.pagecount = thread.count?Math.floor(thread.count / paging.perpage) + 1:null

      data.paging = paging
    })
    .then(result=>{
      return getForumList(params)
    })
    .then(forumlist=>{
      data.forumlist = forumlist
      data.replytarget = 't/' + tid

      accumulateCountHit(tid,'threads')

      return data
    })
  },
  requiredParams:{
    tid:String,
  }
}

function accumulateCountHit(id,collname){
  return AQL(`
    let t = document(${collname},@id)
    update t with {hits:t.hits+1} in threads
    return NEW.hits
    `,{id}
  )
  .then(res=>{
    report('hits +1 = ' + res[0].toString())
    return res[0]
  })
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

    return queryfunc.doc_load(uid,'users')
    .then(user=>{
      data.forum = {
        display_name:user.username,
        description:user.post_sign||'',
        count_threads:user.count_threads||null,
        count_posts:user.count_posts||null,
      }

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

      var paging = getPaging(params)
      paging.pagecount = data.forum.count_threads/paging.perpage
      data.paging = paging

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
          start:paging.start,
          count:paging.count,
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
    return data
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

    if(doc_id){
      var p = doc_id.split('/')
      var collname = p[0]
      var doc_key = p[1]

      return queryfunc.doc_load(doc_key,collname)
      .then(res=>{
        data.doc = res
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
      return apifunc.get_user_by_name(username)
      .then(reslist=>{
        if(reslist[0])

        data.doc = reslist[0]

        return data
      })
    }

    return data
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

table.viewQuestions={
  operation:params=>{
    var data = defaultData(params)
    data.template = jadeDir + 'questions_edit.jade'

    return apifunc.get_questions(null)
    .then(function(back){
      data.questions_all = back;
      return apifunc.get_questions(params.user._key)
    })
    .then(function(back){
      data.questions = back;
      return data
    })
  }
}
