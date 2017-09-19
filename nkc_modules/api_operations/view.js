var moment = require('moment')
var path = require('path')
var fs = require('fs.extra')
var settings = require('../server_settings.js');
var helper_mod = require('../helper.js')();
var queryfunc = require('../query_functions')
var validation = require('../validation')
var AQL = queryfunc.AQL
const layer = require('../layer');
var apifunc = require('../api_functions')
var svgCaptcha = require('svg-captcha');
const db = queryfunc.getDB();
const aql = queryfunc.getAql();
const tools = require('../tools');

var jadeDir = __projectroot + 'nkc_modules/jade/'

var table = {};
module.exports = table;

function defaultData(params) { //default data obj for views
  var user = params ? params.user : null
  return {
    site: settings.site,
    user,
    contentClasses: params.contentClasses,
    permittedOperations: params.permittedOperations,
    lastlogin: params._req.userinfo ? params._req.userinfo.lastlogin : undefined
  }
}

table.viewMe = {
  operation: function (params) {
    var data = defaultData(params)
    data.template = jadeDir + 'interface_me.jade'

    if (!params.user) throw 'must login to view this page'

    data.allCertificates = require('../permissions').listAllCertificates()

    data.certificateDefinitions = require('../permissions').certificates

    data.examinated = params.examinated
    data.replytarget = 'me';
    var psnl = new layer.Personal(params.user._key)
    return psnl.load()
      .then(psnl => {
        data.personal = psnl

        return getForumList(params)
      })
      .then(res => {
        data.forumlist = res
        return data
      })
  }
}

table.viewExam = {
  operation: function (params) {
    var data = defaultData(params)

    data.template = 'nkc_modules/jade/interface_exam.jade' //will render if property 'template' exists

    //if(params.user) throw ('to take exams, you must logout first.')

    if (params.result) {
      data.detail = params.detail
      data.result = params.result

      return data;
    }

    return apifunc.exam_gen({ip: params._req.iptrim, category: params.category})
      .then(function (back) {
        data.exam = back;
        data.category = params.category
        return data;
      })
  },

  requiredParams: {},
}

table.viewRegister = {
  operation: function (params) {
    var data = defaultData(params)
    //var captcha = svgCaptcha.create();  //创建验证码
   // params._req.session.icode = captcha.text;  //验证码text保存到session中
    //var road = path.resolve(__dirname, '../..')
    //fs.writeFile(road + '/static/captcha/captcha.svg', captcha.data, {'flag': 'w'});  //保存验证码图片
    //console.log(captcha.text);
    data.getcode = params.getcode
    data.regCode = params.code
    data.template = 'nkc_modules/jade/interface_user_register.jade'

    return data
  }
}


//邮箱注册
table.viewRegister2 = {
  operation: function (params) {
    var data = defaultData(params)
    //var captcha = svgCaptcha.create();  //创建验证码
    //params._req.session.icode = captcha.text;  //验证码text保存到session中
    //var road = path.resolve(__dirname, '../..')
    //fs.writeFile(road + '/static/captcha/captcha.svg', captcha.data, {'flag': 'w'}, function (e) {
      //if(e) console.error(e.stack)
    //});  //保存验证码图片
    //console.log(captcha.text);
    data.template = 'nkc_modules/jade/interface_user_register2.jade';
    data.regCode = params.code;

    return data
  }
}


//激活邮箱
table.viewActiveEmail = {
  operation: function (params) {
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
      `, {email: email, ecode: ecode, toc: Date.now() - 2 * 60 * 1000}
    )
      .then(res => {
        if (res.length > 0) {
          var user = {
            username: res[0].username,
            password: res[0].password,
            hashtype: res[0].hashtype,
            email: res[0].email,
            regPort: params._req.connection.remotePort,
            regIP: params._req.iptrim
          }
          return create_muser(user)
            .then(k => {
              console.log(k)
              return data.activeInfo1 = '邮箱注册成功，赶紧登录吧~'
            })
        } else {
          return data.activeInfo2 = '邮箱链接已失效，请重新注册！'
        }
      })
      .then(() => data)

  }
}


//点击刷新验证码图片(注册)
table.refreshicode = {
  operation: function (params) {
    var data = defaultData(params)
    var captcha = svgCaptcha.create();  //创建验证码
    params._req.session.icode = captcha.text;  //验证码text保存到session中
    var road = path.resolve(__dirname, '../..')
    fs.writeFile(road + '/static/captcha/captcha.svg', captcha.data, {'flag': 'w'}, function (e) {
      if(e) console.log(e.stack)
    });  //保存验证码图片
    return {'resCode': 0}
  }
}


//点击刷新验证码图片(手机找回密码)
table.refreshicode3 = {
  operation: function (params) {
    var data = defaultData(params)
    var captcha = svgCaptcha.create();  //创建验证码
    params._req.session.icode3 = captcha.text;  //验证码text保存到session中
    var road = path.resolve(__dirname, '../..')
    fs.writeFile(road + '/static/captcha/captcha3.svg', captcha.data, {'flag': 'w'});  //保存验证码图片
    return {'resCode': 0}
  }
}


function getForumList(params) {
  var contentClasses = params.contentClasses
  for (c in contentClasses) {
    if (!contentClasses[c]) {
      contentClasses[c] = undefined;
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
    `, {contentClasses: params.contentClasses}
  )
}


function getForumListKv(params) {
  return getForumList(params)
    .then(res => {
      var forumlist = res
      var kv = {}
      forumlist.map(group => {
        group.forumgroup.map(f => {
          var belong_forum = f
          var pf = group.parentforum
          kv[f._key] = {
            belong_forum,
            pf,
            color: (f ? f.color : null) || (pf ? pf.color : null) || '#aaa',
          }
        })
      })

      return kv
    })
}


table.viewPanorama = {
  init: function () {
    queryfunc.createIndex('threads', {
      fields: ['digest'],
      type: 'hash',
      unique: 'false',
      sparse: 'true',
    })
    queryfunc.createIndex('threads', {
      fields: ['disabled', 'toc'],
      type: 'skiplist',
      unique: 'false',
      sparse: 'false',
    })

    queryfunc.createIndex('threads', {
      fields: ['digest', 'toc'],
      type: 'skiplist',
      unique: 'false',
      sparse: 'false',
    })

    queryfunc.createIndex('users', {
      fields: ['tlv'],
      type: 'skiplist',
      unique: 'false',
      sparse: 'false',
    })
  },
  operation: params => {
    var data = defaultData(params)
    data.template = jadeDir + 'interface_panorama.jade'
    data.navbar = {highlight: 'pano'}
    return AQL(`
      for t in threads
      filter t.digest==true
      collect with count into k
      return k
      `
    )
      .then(count_digests => {
        count_digests = count_digests[0]
        var count = 6

        var randomarray = []
        for (i = 0; i < count; i++) {
          randomarray.push(
            Math.floor(Math.random() * count_digests - 0.0001)
          )
        }

        var promarr = []
        var tharr = []
        for (i in randomarray) {
          promarr.push(AQL(`
          for t in threads
          filter t.digest == true
          limit @i,1

          let p = document(posts,t.oc)
          let u = document(users,p.uid)

          return merge(t,{oc:p,ocuser:u})
          `, {
              i: randomarray[i],
            }
          ).then(res => {
            tharr.push(res[0])
          }))
        }

        return Promise.all(promarr)
          .then(() => {
            return tharr
          })
      })
      .then(res => {
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
        `, {contentClasses: Object.assign(params.contentClasses, {sensitive: true, non_broadcast: undefined})}
        )
      })
      .then(res => {
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

        `, {contentClasses: Object.assign(params.contentClasses, {sensitive: true, non_broadcast: undefined})}
        )
      })
      .then(res => {
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
      .then(res => {
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
      .then(res => {
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
        `, {contentClasses: Object.assign(params.contentClasses, {sensitive: true, non_broadcast: undefined})}
        )
      })
      .then(res => {
        //data.galleryItems = galleryItems

        data.latestReplies2 = res
        return data
      })
  }
}

table.viewLatest = {
  init: function () {
    queryfunc.createIndex('threads', {
      fields: ['digest'],
      type: 'hash',
      unique: 'false',
      sparse: 'true',
    })
    queryfunc.createIndex('threads', {
      fields: ['disabled', 'toc'],
      type: 'skiplist',
      unique: 'false',
      sparse: 'false',
    })

    queryfunc.createIndex('threads', {
      fields: ['digest', 'toc'],
      type: 'skiplist',
      unique: 'false',
      sparse: 'false',
    })

    queryfunc.createIndex('threads', {
      fields: ['disabled', 'fid', 'tlm'],
      type: 'skiplist',
      unique: 'false',
      sparse: 'false'
    })

  },
  operation: params => {
    var data = defaultData(params);
    var contentClasses = {};
    let count;
    data.template = jadeDir + 'interface_latest_threads.jade';
    data.navbar = {highlight: 'home'};
    for (let param in params.contentClasses) {
      if (params.contentClasses[param] === true) {
        contentClasses[param] = true;
      }
    }
    let content = params.content || 'all';
    data.content = content;
        //add homepage posts      17-03-13  lzszone
    return Promise.resolve(
      params.digest ?
        global.personalThreadsCount.digest :
        global.personalThreadsCount.normal
      )
      .then(length => {
        count = length;
        return queryfunc.getVisibleChildForums(params)
      })
      .then(arr => {
        let forumArr = Array.from(arr); //deep copy from all the forum that can be visited
        arr.push(null); //push null to origin arr for personal forum
        data.digest = params.digest;
        data.sortby = params.sortby;
        if(params.content === 'personal') {
          let paging = new layer.Paging(params.page).getPagingParams(count);
          data.paging = paging;
          return db.query(aql`
            FOR t IN threads
              SORT t.${params.sortby? 'toc' : 'tlm'} DESC
              FILTER t.${params.digest? 'digest' :'disabled'} == ${params.digest? true : null} &&
              t.fid == null
              limit ${paging.start}, ${paging.perpage}
              LET oc = DOCUMENT(posts, t.oc)
              LET ocuser = DOCUMENT(users, oc.uid)
              LET lm = DOCUMENT(posts, t.lm)
              LET lmuser = DOCUMENT(users, lm.uid)
              RETURN MERGE(t, {
                oc,
                ocuser,
                lm,
                lmuser
              })
          `)
        }
        if(params.content === 'forum') {
          return db.query(aql`
            FOR fid IN ${forumArr}
              LET forum = DOCUMENT(forums, fid)
              RETURN forum.tCount.${params.digest? 'digest' : 'normal'}
          `)
          .then(arr => {
            let temp = 0;
            for(let ele of arr._result) {
              temp += ele;
            }
            return temp
          })
          .then(length => {
            let paging = new layer.Paging(params.page).getPagingParams(length);
            data.paging = paging;
            return db.query(aql`
              FOR t IN threads
              SORT t.${params.sortby ? 'toc' : 'tlm'} DESC
                FILTER t.${params.digest ? 'digest' : 'disabled'} == ${params.digest ? true : null} &&
                POSITION(${forumArr}, t.fid)
                limit ${paging.start}, ${paging.perpage}
                LET forum = DOCUMENT(forums, t.fid)
                LET oc = DOCUMENT(posts, t.oc)
                LET ocuser = DOCUMENT(users, oc.uid)
                LET lm = DOCUMENT(posts, t.lm)
                LET lmuser = DOCUMENT(users, lm.uid)
                RETURN MERGE(t, {
                  forum,
                  oc,
                  ocuser,
                  lm,
                  lmuser
                })
            `)
          })
        }
        return db.query(aql`
          FOR fid IN ${forumArr}
            LET forum = DOCUMENT(forums, fid)
            RETURN forum.tCount.${params.digest? 'digest' : 'normal'}
        `)
          .then(arr => {
            let temp = 0;
            for(let ele of arr._result) {
              temp += ele;
            }
            return temp
          })
          .then(length => {
            let paging = new layer.Paging(params.page).getPagingParams(count + length);
            data.paging = paging;
            return db.query(aql`
              FOR t IN threads
                SORT t.${params.sortby ? 'toc' : 'tlm'} DESC
                FILTER t.${params.digest ? 'digest' : 'disabled'} == ${params.digest ? true : null} &&
                POSITION(${arr}, t.fid)
                limit ${paging.start}, ${paging.perpage}
                LET forum = DOCUMENT(forums, t.fid)
                LET oc = DOCUMENT(posts, t.oc)
                LET ocuser = DOCUMENT(users, oc.uid)
                LET lm = DOCUMENT(posts, t.lm)
                LET lmuser = DOCUMENT(users, lm.uid)
                RETURN MERGE(t, {
                  forum,
                  oc,
                  ocuser,
                  lm,
                  lmuser
                })
            `)
          })
      })
      .then(res => {
        data.indexThreads = res._result;
        return queryfunc.getIndexForumList(contentClasses);
      })
      .then(res => {
        data.indexForumList = res._result;
      })
      .then(() => {
        if(params.user)
          return queryfunc.getUsersThreads(params.user._key);
        return [];
      })
      .then(ts => data.userThreads = ts)
      .then(() => data)
  }
};

table.viewHome = {
  init: function () {
    queryfunc.createIndex('threads', {
      fields: ['digest'],
      type: 'hash',
      unique: 'false',
      sparse: 'true',
    })
    queryfunc.createIndex('threads', {
      fields: ['disabled', 'toc'],
      type: 'skiplist',
      unique: 'false',
      sparse: 'false',
    })

    queryfunc.createIndex('threads', {
      fields: ['digest', 'toc'],
      type: 'skiplist',
      unique: 'false',
      sparse: 'false',
    })

    queryfunc.createIndex('threads', {
      fields: ['disabled', 'fid', 'tlm'],
      type: 'skiplist',
      unique: 'false',
      sparse: 'false'
    })

  },
  operation: params => {
    let data = defaultData(params);
    let contentClasses = {};
    let serverSettings;
    data.template = jadeDir + 'interface_home.jade';
    data.navbar = {highlight: 'home'};
    for (let param in params.contentClasses) {
      if(params.contentClasses.hasOwnProperty(param)) {
        if (params.contentClasses[param] === true) {
          contentClasses[param] = true;
        }
      }
    }
    data.content = params.content || 'all';
    return db.query(aql`
      FOR t IN threads
        LET f = DOCUMENT(forums, t.fid)
        FILTER t.disabled == null && t.digest == true && t.fid != '97' && f.visibility == true
        && t.fid != 'recycle'
        sort t.toc desc
        let forum = document(forums,t.fid)
        FILTER HAS(${contentClasses}, forum.class)
        let oc = document(posts,t.oc)
        LET rs = oc.r || []
        LET resources = (FOR r IN rs
          LET resource = DOCUMENT(resources, r)
          FILTER POSITION(['jpg', 'png', 'svg', 'jpeg'], resource.ext, false)
          RETURN resource
        )
        FILTER LENGTH(resources) > 0
        LIMIT 200
        let lm = document(posts,t.lm)
        let ocuser = document(users,t.uid)
        return merge(t,{oc:oc,lm:lm,forum,ocuser, src: resources[0]._key})
    `)
      .then(cursor => cursor.all())
      .then(res => {
        let temp = [];
        for (let i = 0; i < 6; i++) {
          let j = 200 - i;
          let index = Math.floor(Math.random() * j);
          temp.push(res[index]);
          res.splice(index, 1);
        }
        data.newestDigestThreads = temp;
        return db.query(aql`
          FOR t IN threads
            SORT t.tlm DESC
            FILTER t.fid == null
            limit 10
            LET oc = DOCUMENT(posts, t.oc)
            LET ocuser = DOCUMENT(users, oc.uid)
            LET lm = DOCUMENT(posts, t.lm)
            LET lmuser = DOCUMENT(users, lm.uid)
            RETURN MERGE(t, {
              oc,
              ocuser,
              lm,
              lmuser
            })
        `)
      })
      .then(cursor => cursor.all())
      .then(ts => {
        data.latestPFThreads = ts;
        return queryfunc.getVisibleChildForums(params)
      })
      .then(arr => {
        return db.query(aql`
          FOR t IN threads
          SORT t.tlm DESC
            FILTER POSITION(${arr}, t.fid)
            limit ${settings.indexLatestThreadsLength}
            LET forum = DOCUMENT(forums, t.fid)
            LET oc = DOCUMENT(posts, t.oc)
            LET ocuser = DOCUMENT(users, oc.uid)
            LET lm = DOCUMENT(posts, t.lm)
            LET lmuser = DOCUMENT(users, lm.uid)
            RETURN MERGE(t, {
              forum,
              oc,
              ocuser,
              lm,
              lmuser
            })
        `)
      })
      .then(res => {
        data.latestThreads = res._result;
        return queryfunc.getActiveUsers();
      })
      .then(res => {
        data.twemoji = settings.editor.twemoji;
        data.activeUsers = res._result;
        return queryfunc.getIndexForumList(contentClasses);
      })
      .then(res => {
        data.indexForumList = res._result;
        data.fTarget = 'home';
        return db.query(aql`
          RETURN DOCUMENT(settings, 'system')
        `)
      })
      .then(cursor => cursor.next())
      .then(doc => {
        if(!doc) {
          return db.collection('settings').save({
            ads: [],
            popPersonalForums: [],
            _key: 'system'
          })
            .then(() => db.collection('settings').document('system'))
        }
        return doc
      })
      .then(sts => {
        serverSettings = sts;
        return db.query(aql`
          FOR key IN ${serverSettings.ads}
            LET thread = DOCUMENT(threads, key)
            LET post = DOCUMENT(posts, thread.oc)
            RETURN MERGE(thread, {post})
        `)
      })
      .then(cursor => cursor.all())
      .then(ads => {
        data.ads = ads;
        return db.query(aql`
          FOR key IN ${serverSettings.popPersonalForums}
            LET pf = DOCUMENT(personalForums, key)
            RETURN pf
        `)
      })
      .then(cursor => cursor.all())
      .then(pfs => data.popPersonalForums = pfs)
      .then(() => {
        if(params.user)
         return queryfunc.getUsersThreads(params.user._key);
        return [];
      })
      .then(ts => data.userThreads = ts)
      .then(() => data)
  }
};

var xsflimit = require('../misc/xsflimit')

table.viewForum = {
  init: function () {
    return layer.Forum.buildIndex()
      .then(() => {
        queryfunc.createIndex('threads', {
          fields: ['topped', 'fid', 'toc'],
          type: 'skiplist',
          unique: 'false',
          sparse: 'true',
        })

        queryfunc.createIndex('threads', {
          fields: ['fid', 'cid', 'toc'],
          type: 'skiplist',
          unique: 'false',
          sparse: 'true',
        })

        queryfunc.createIndex('threads', {
          fields: ['fid', 'cid', 'tlm'],
          type: 'skiplist',
          unique: 'false',
          sparse: 'true',
        })
      })
  },
  operation: params => {
    var data = defaultData(params)
    data.template = jadeDir + 'interface_forum.jade'
    if (params.digest) {
      data.digest = true
    }
    data.cat = params.cat
    data.sortby = params.sortby

    var fid = params.fid;
    var forum = new layer.Forum(fid)

    return forum.load()
      .then(forum => {
        return forum.inheritPropertyFromParent()
          .then(res => {
            return forum.testView(params.contentClasses)
          })
      })
      .then(() => {
        data.forum = forum.model
      })
      .then(() => forum.listThreadsOfPage(params))
      .then(result => {
        //if nothing went wrong
        data.cat = params.cat;
        data.threads = result;
        data.twemoji = settings.editor.twemoji;
        data.paging = params.paging || 0;

        return getForumList(params)
      })
      .then(forumlist => {
        data.forumlist = forumlist
        data.replytarget = 'f/' + fid;

        if (data.paging.page == 0 && data.forum.type == 'forum') {
          return AQL(`
          for t in threads
          filter t.topped==true && t.fid == @fid
          sort t.topped, t.fid, t.toc

          let oc = document(posts,t.oc)
          let lm = document(posts,t.lm)
          let ocuser = document(users,oc.uid)
          let lmuser = document(users,lm.uid)

          return merge(t,{oc,lm,ocuser,lmuser})
          `, {fid}
          )
        }
        else {
          return null
        }
      })
      .then(res => {
        data.toppedThreads = res

        return AQL(`
        for f in forums
        filter f.parentid==@parentid
        sort f.order

        let class = f.class
        let display_name = f.display_name
        let moderators = f.moderators

        filter has(@contentClasses,TO_STRING(class)) /*content ctrl*/

        let nf = merge(f,{display_name, moderators})

        return nf
        `, {parentid: data.forum._key || 999, contentClasses: params.contentClasses}
        )
      })
      .then(res => {
        data.forums = res
        //return data

        return getThreadTypes(fid)
      })
      .then(res => {
        data.threadtypes = res.tt
        data.forumthreadtypes = res.ftt;
        //console.log(params.fid);
        data.fTarget = params.fid;
        return AQL(`
          FOR t IN threads
          SORT t.digest DESC, t.toc DESC
          FILTER t.disabled == null && t.fid == 81
          LIMIT 10
          LET oc = document(posts,t.oc)
          LET lm = document(posts,t.lm)
          LET forum = document(forums,t.fid)
          LET ocuser = document(users,t.uid)
      
          RETURN MERGE(t,{oc:oc,lm:lm,forum,ocuser})
        `)
      })
      .then(res => {
        data.newestDigestThreads = res;
      })
      .then(() => {
        if(params.user)
          return queryfunc.getUsersThreads(params.user._key);
        return [];
      })
      .then(ts => data.userThreads = ts)
      .then(() => db.query(aql`
        FOR uid IN ${forum.model.moderators}
          LET m = DOCUMENT(users, uid)
          RETURN m
      `))
      .then(cursor => cursor.all())
      .then(ms => data.moderators = ms)
      .then(() => data)
  },
  requiredParams: {
    fid: String,
  }
}

function getThreadTypes(fid) {
  return AQL(`
    let tt = (for i in threadtypes return i)
    let ftt = (for i in threadtypes filter i.fid==@fid sort i.order return i)
    return {tt,ftt}
    `, {fid: fid || null}
  )
    .then(res => {
      return res[0]
    })
}

function getOneThreadTypes(fid) {
  return AQL(`
    for i in threadtypes filter i.fid==@fid
    return i
    `, {fid: fid || null}
  )
}

table.viewThread = {
  init: function () {
    return layer.Thread.buildIndex()
  },
  operation: function (params) {
    var data = defaultData(params);
    data.template = jadeDir + 'interface_thread.jade';
    var tid = params.tid

    var thread = new layer.Thread(tid)
    return thread.load()
      .then(res => {
        if (thread.model.fid) {
          return thread.loadForum()
        }
        if (thread.model.toMid) {
          return thread.loadOthersForum()
        }
        if (thread.model.mid) {
          return thread.loadMyForum()
        }
      })
      .then(forum => {
        return forum.testView(params.contentClasses)// test if have permission to view.
      })
      .then(forum => {
        data.forum = forum.model
        return thread.mergeOc()
          .then(res => {
            var ocuser = new layer.User(thread.model.oc.uid)
            return ocuser.load()
              .then(ocuser => {
                data.ocuser = ocuser.model


                data.paging = thread.getPagingParams(params.page)
                return thread.listPostsOfPage(params.page)
              })
          })
      })
      .then(posts => {

        //xsf limiting on post content
        for (i in posts) {
          posts[i] = xsflimit(posts[i], params)
        }

        if (!posts.length) {
          params._res.redirect('/t/' + params.tid)
          params._res.sent = true
          //if no posts exist on that page, goto 1th page
        }

        data.posts = posts;
        data.thread = thread.model
      })
      .then(result => {
        if (thread.model.toMid) {
          return db.collection('personalForums').document(thread.model.toMid)
        }
      })
      .then(pf => {
        data.othersForum = pf;
        if (thread.model.mid) {
          return db.collection('personalForums').document(thread.model.mid)
        }
      })
      .then(pf => data.myForum = pf)
      .then(() => getForumList(params))
      .then(forumlist => {
        data.twemoji = settings.editor.twemoji;
        data.forumlist = forumlist
        data.replytarget = 't/' + tid

        return thread.accumulateCountHit()
      })
      .then(() => db.collection('settings').document('system'))
      .then(settings => {
        data.ads = settings.ads;
      })
      .then(() => {
        if(params.user)
          return queryfunc.getUsersThreads(params.user._key);
        return [];
      })
      .then(ts => data.userThreads = ts)
      .then(() => data)
  },
  requiredParams: {
    tid: String,
  }
}

table.viewPersonalForum = {
  requiredParams: {
    uid: String,
  },
  init: function () {
    queryfunc.createIndex('threads', {
      fields: ['uid', 'disabled', 'tlm'],
      type: 'skiplist',
      unique: 'false',
      sparse: 'false',
    })
  },
  operation: function (params) {
    var data = defaultData(params);
    var uid = params.uid;
    const user = params.user;
    const po = params.permittedOperations;
    let targetUser;
    data.tab = params.tab || 'own';
    data.template = jadeDir + 'interface_personal_forum.jade';
    data.operation = 'viewUserThreads';
    data.replytarget = 'm/' + params.uid;
    data.sortby = params.sortby;
    data.digest = params.digest;
    let forumObj;

    var userclass = new layer.User(uid);
    return userclass.load()
      .then(() => {
        data.targetUser = userclass.model;
        targetUser = userclass.model;
        return db.query(aql`
          LET pf = DOCUMENT(personalForums, ${uid})
          LET moderators = pf.moderators
          LET ms = (FOR moderator IN moderators
            RETURN DOCUMENT(users, moderator)
          )
          RETURN MERGE(pf, {ms})
        `)
      })
      .then(cursor => cursor.next())
      .then(forum => {
        data.forum = forum;
        data.twemoji = settings.editor.twemoji;
        forumObj = forum;
        return queryfunc.getVisibleChildForums(params)
      })
      .then(arr => {
        let forumArr = Array.from(arr); //deep copy from all the forum that can be visited
        arr.push(null); //push null to origin arr for personal forum
        if(data.tab === 'reply') {
          return db.query(aql`
            LET p1 = (
              FOR p IN posts
                SORT p.tlm DESC
                FILTER p.uid == ${uid}
                RETURN p
            )
            LET tAll = (
              FOR p IN p1
                COLLECT tid = p.tid INTO group = p
                RETURN {
                  tid,
                  group
                }
            )
            LET threadsAll = (
              FOR t IN tAll
                RETURN MERGE(DOCUMENT(threads, t.tid), {lastPid: t.group[0]._key})
            )
            LET result = (
              FOR t IN threadsAll
                SORT t.${params.sortby ? 'toc' : 'tlm'} DESC
                FILTER t.${params.digest ? 'digest' : 'disabled'} == ${params.digest ? true : null}
                && POSITION(${arr}, t.fid)
                LET oc = DOCUMENT(posts, t.oc)
                LET ocuser = DOCUMENT(users, oc.uid)
                LET lm = DOCUMENT(posts, t.lm)
                LET lmuser = DOCUMENT(users, lm.uid)
                FILTER t.uid != ${uid}
                RETURN MERGE(t, {
                  oc,
                  ocuser,
                  lm,
                  lmuser
                })
              )
            RETURN {
              threads: SLICE(result, ${params.page * settings.paging.perpage}, ${settings.paging.perpage}),
              length: LENGTH(result)
            }
        `)
        }
        else if(data.tab === 'own') {
          if(user && forumObj.moderators.indexOf(user._key) > -1 || 'moveAllThreads' in po) {
            return db.query(aql`
              LET p1 = (
                FOR p IN posts
                  SORT p.tlm DESC
                  FILTER p.uid == ${uid}
                  RETURN p
              )
              LET tAll = (
                FOR p IN p1
                  COLLECT tid = p.tid INTO group = p
                  RETURN {
                    tid,
                    group
                  }
              )
              LET threadsAll = (
                FOR t IN tAll
                  RETURN MERGE(DOCUMENT(threads, t.tid), {lastPid: t.group[0]._key})
              )
              LET result = (
                FOR t IN threadsAll
                  SORT t.${params.sortby ? 'toc' : 'tlm'} DESC
                  FILTER t.${params.digest ? 'digest' : 'disabled'} == ${params.digest ? true : null}
                  && POSITION(${arr}, t.fid)
                  LET oc = DOCUMENT(posts, t.oc)
                  LET ocuser = DOCUMENT(users, oc.uid)
                  LET lm = DOCUMENT(posts, t.lm)
                  LET lmuser = DOCUMENT(users, lm.uid)
                  FILTER t.uid == ${uid}
                  RETURN MERGE(t, {
                    oc,
                    ocuser,
                    lm,
                    lmuser
                  })
                )
              RETURN {
                threads: SLICE(result, ${params.page * settings.paging.perpage}, ${settings.paging.perpage}),
                length: LENGTH(result)
              }
            `)
          }
          return db.query(aql`
            LET p1 = (
              FOR p IN posts
                SORT p.tlm DESC
                FILTER p.uid == ${uid}
                RETURN p
            )
            LET tAll = (
              FOR p IN p1
                COLLECT tid = p.tid INTO group = p
                RETURN {
                  tid,
                  group
                }
            )
            LET threadsAll = (
              FOR t IN tAll
                RETURN MERGE(DOCUMENT(threads, t.tid), {lastPid: t.group[0]._key})
            )
            LET result = (
              FOR t IN threadsAll
                SORT t.${params.sortby ? 'toc' : 'tlm'} DESC
                FILTER t.${params.digest ? 'digest' : 'disabled'} == ${params.digest ? true : null}
                && POSITION(${arr}, t.fid) && t.hideInMid != true
                LET oc = DOCUMENT(posts, t.oc)
                LET ocuser = DOCUMENT(users, oc.uid)
                LET lm = DOCUMENT(posts, t.lm)
                LET lmuser = DOCUMENT(users, lm.uid)
                FILTER t.uid == ${uid}
                RETURN MERGE(t, {
                  oc,
                  ocuser,
                  lm,
                  lmuser
                })
              )
            RETURN {
              threads: SLICE(result, ${params.page * settings.paging.perpage}, ${settings.paging.perpage}),
              length: LENGTH(result)
          }
        `)
        }
        else if(data.tab === 'recommend') {
          return db.query(aql`
            LET p3 = (
              FOR pid IN DOCUMENT(personalForums, ${uid}).recPosts
                RETURN DOCUMENT(posts, pid)
            )
            LET tAll = (
              FOR p IN p3
                COLLECT tid = p.tid INTO group = p
                RETURN {
                  tid,
                  group
                }
            )
            LET threadsAll = (
              FOR t IN tAll
                RETURN MERGE(DOCUMENT(threads, t.tid), {lastPid: t.group[0]._key})
            )
            LET result = (
              FOR t IN threadsAll
                SORT t.${params.sortby ? 'toc' : 'tlm'} DESC
                FILTER t.${params.digest ? 'digest' : 'disabled'} == ${params.digest ? true : null}
                && POSITION(${arr}, t.fid)
                LET oc = DOCUMENT(posts, t.oc)
                LET ocuser = DOCUMENT(users, oc.uid)
                LET lm = DOCUMENT(posts, t.lm)
                LET lmuser = DOCUMENT(users, lm.uid)
                RETURN MERGE(t, {
                  oc,
                  ocuser,
                  lm,
                  lmuser
                })
              )
            RETURN {
              threads: SLICE(result, ${params.page * settings.paging.perpage}, ${settings.paging.perpage}),
              length: LENGTH(result)
          }
        `)
        }
        else if(data.tab === 'discuss') {
          if (user && forumObj.moderators.indexOf(user.username) > -1 || 'moveAllThreads' in po) {
            return db.query(aql`
              LET result = (FOR t IN threads
                SORT t.${params.sortby ? 'toc' : 'tlm'} DESC
                FILTER t.toMid == ${uid}
                LET oc = DOCUMENT(posts, t.oc)
                LET ocuser = DOCUMENT(users, oc.uid)
                LET lm = DOCUMENT(posts, t.lm)
                LET lmuser = DOCUMENT(users, lm.uid)
                RETURN MERGE(t, {
                  oc,
                  ocuser,
                  lm,
                  lmuser
                })
              )
              RETURN {
                threads: SLICE(result, ${params.page * settings.paging.perpage}, ${settings.paging.perpage}),
                length: LENGTH(result)
              }
            `)
          }
          return db.query(aql`
            LET result = (FOR t IN threads
              SORT t.${params.sortby ? 'toc' : 'tlm'} DESC
              FILTER t.toMid == ${uid} && t.hideInToMid != true
              LET oc = DOCUMENT(posts, t.oc)
              LET ocuser = DOCUMENT(users, oc.uid)
              LET lm = DOCUMENT(posts, t.lm)
              LET lmuser = DOCUMENT(users, lm.uid)
              RETURN MERGE(t, {
                oc,
                ocuser,
                lm,
                lmuser
              })
            )
            RETURN {
              threads: SLICE(result, ${params.page * settings.paging.perpage}, ${settings.paging.perpage}),
              length: LENGTH(result)
            }
          `)
        }
        else if(data.tab === 'subscribe') {
          let contentClasses = params.contentClasses;
          return db.query(aql`
            LET subU = DOCUMENT(usersSubscribe, ${uid}).subscribeUsers
            LET tAll = (FOR t IN threads
              SORT t.${params.sortby? 'toc' : 'tlm'} DESC
              FILTER t.${params.digest? 'digest' : 'disabled'} == ${params.digest? true : null} &&
              POSITION(subU, t.uid)
              && POSITION(${arr}, t.fid)
              LET forum = DOCUMENT(forums, t.fid)
              FILTER HAS(${contentClasses}, forum.class)
              RETURN t)
            LET selected = SLICE(tAll, ${(params.page || 0) * settings.paging.perpage}, ${settings.paging.perpage})
            LET length = LENGTH(tAll)
            LET result = (
              FOR t IN selected
                LET oc = DOCUMENT(posts, t.oc)
                LET ocuser = DOCUMENT(users, oc.uid)
                LET lm = DOCUMENT(posts, t.lm)
                LET lmuser = DOCUMENT(users, lm.uid)
              RETURN MERGE(t, {
                oc,
                ocuser,
                lm,
                lmuser
              })
            )
            RETURN {
              threads: result,
              length
            }
          `)
        }
        return db.query(aql`
          LET p1 = (
            FOR p IN posts
              SORT p.tlm DESC
              FILTER p.uid == ${uid} && p.disabled == null
              RETURN p
          )
          LET p2 = (
            FOR o IN usersBehavior
              FILTER o.toMid == ${uid} && o.type == 1
              RETURN DOCUMENT(posts, o.pid)
          )
          LET p3 = (
            FOR pid IN DOCUMENT(personalForums, ${uid}).recPosts
              RETURN DOCUMENT(posts, pid)
          )
          LET pAll = UNION(p1, p2, p3)
          LET tAll = (
            FOR p IN pAll
              COLLECT tid = p.tid INTO group = p
              RETURN {
                tid,
                group
              }
          )
          LET threadsAll = (
            FOR t IN tAll
              RETURN MERGE(DOCUMENT(threads, t.tid), {lastPid: t.group[0]._key})
          )
          LET result = (
            FOR t IN threadsAll
              SORT t.${params.sortby ? 'toc' : 'tlm'} DESC
              FILTER t.${params.digest ? 'digest' : 'disabled'} == ${params.digest ? true : null}
              && POSITION(${arr}, t.fid)
              LET oc = DOCUMENT(posts, t.oc)
              LET ocuser = DOCUMENT(users, oc.uid)
              LET lm = DOCUMENT(posts, t.lm)
              LET lmuser = DOCUMENT(users, lm.uid)
              RETURN MERGE(t, {
                oc,
                ocuser,
                lm,
                lmuser
              })
            )
          RETURN {
            threads: SLICE(result, ${params.page * settings.paging.perpage}, ${settings.paging.perpage}),
            length: LENGTH(result)
          }
        `)
      })
      .then(res => res._result[0])
      .then(res => {
        let paging = new layer.Paging(params.page);
        data.paging = paging.getPagingParams(res.length);
        if((data.tab === 'own' || data.tab === 'discuss' || data.tab === 'all') && forumObj.toppedThreads && forumObj.toppedThreads.length > 0) {
          const threads = res.threads.filter(element => !forumObj.toppedThreads.includes(element._key));
          data.threads = threads;
          return db.query(aql`
            FOR tid IN ${forumObj.toppedThreads}
              LET thread = DOCUMENT(threads, tid)
              LET oc = DOCUMENT(posts, thread.oc)
              LET ocuser = DOCUMENT(users, thread.ocuser)
              LET lm = DOCUMENT(posts, thread.lm)
              LET lmuser = DOCUMENT(users, lm.uid)
            RETURN MERGE(thread, {
              oc,
              ocuser,
              lm,
              lmuser
            })
          `)
            .then(cursor => cursor.all())
            .then(toppedThreads => {
              data.toppedThreads = toppedThreads;
              return getForumList(params)
            })
        }
        data.threads = res.threads;
        return getForumList(params)
      })
      .then(forumlist => {
        data.forumlist = forumlist;
        return db.collection('settings').document('system')
      })
      .then(settings => {
        data.popPersonalForums = settings.popPersonalForums;
        return true
      })
      .then(() => {
        if(params.user)
          return queryfunc.getUsersThreads(params.user._key);
        return [];
      })
      .then(ts => data.userThreads = ts)
      .then(() => data)
  }
};

table.viewLogout = {
  operation: function (params) {
    var data = defaultData(params)
    data.template = jadeDir + 'interface_user_logout.jade'

    data.user = undefined

    //gotta avoid CSRF here
    var ihash = params.hash

    if (params._req.userinfo) {
      if (Number(ihash) !== params._req.userinfo.lastlogin) {
        throw 'potential CSRF'
      }
    }

    params._res.cookie('userinfo', {info: 'nkc_logged_out'}, {
      signed: true,
      expires: (new Date(Date.now() - 86400000)),
    });

    var signed_cookie = params._res.get('set-cookie');

    //put the signed cookie in response, also
    // Object.assign(data, {'cookie':signed_cookie,'instructions':
    // 'you have logged out. you may replace existing cookie with this one'})

    return data;
  },
}

table.viewLogin = {
  operation: params => {
    var data = defaultData(params)
    data.template = jadeDir + 'interface_user_login.jade'
    return data
  }
}

table.viewExperimental = {
  operation: params => {
    var data = defaultData(params)
    var contentClasses = {};
    data.template = jadeDir + 'interface_experimental.jade'
    for (var param in params.contentClasses) {
      if (params.contentClasses[param] === true) {
        contentClasses[param] = true;
      }
    }
    return getForumList(params)
      .then(forumlist => {

        data.forumlist = forumlist
      })
      .then(() => queryfunc.getForumList(contentClasses))
      .then(res => data.forumTree = res._result)
      .then(() => data)
  }
};


table.viewEditor = {
  operation: params => {
    var data = defaultData(params)
    data.template = jadeDir + 'interface_editor.jade'

    var target = params.target || "";

    data.replytarget = target;
    data.navbar = {}
    data.navbar.highlight = 'editor'; //navbar highlight

    if (target.indexOf('post/') == 0) {
      //if user appears trying to edit a post
      var pid = target.slice(5);
      report(pid);
      //load from db
      return apifunc.get_a_post(pid)
        .then(function (back) {
          data.original_post = back;
          return data;
        })
    }
    data.twemoji = settings.editor.twemoji;
    data.original_post = {
      c: params.content ? decodeURI(params.content) : '',
      //l:'pwbb',
    }

    var a = target.split('/')[1];  //版块号
    return getOneThreadTypes(a)
      .then(res => {
        if (res.length != 0) {
          res.splice(0, 0, {"_key": '0', "name": "--默认无分类--"});  //添加到第一个位置
        }
        data.threadtypes = res;
        return data;
      })

    return data;
  }
}

/*table.viewEditor2 = {
  operation: params => {
    const data = defaultData(params);
    data.template = jadeDir + 'interface_editor2.jade';

    const target = params.target || "";

    data.replytarget = target;
    data.navbar = {};
    data.navbar.highlight = 'editor'; //navbar highlight

    if (target.indexOf('post/') === 0) {
      const pid = target.slice(5);
      return apifunc.get_a_post(pid)
        .then(back => {
          data.original_post = back;
          return data;
        })
    }

    data.original_post = {
      c: params.content ? decodeURI(params.content) : '',
      //l:'pwbb',
    };

    const a = target.split('/')[1];  //版块号
    return getOneThreadTypes(a)
      .then(res => {
        if (res.length !== 0) {
          res.splice(0, 0, {"_key": '0', "name": "--默认无分类--", "order": -1});  //添加到第一个位置
        }
        data.threadtypes = res;
        return data;
      });
  }
};*/

table.viewDanger = {
  operation: params => {
    var data = defaultData(params)
    data.template = jadeDir + 'interface_danger.jade'

    var doc_id = params.id
    var username = params.username;
    const info = params.info;

    return Promise.resolve()
      .then(() => {
        if (doc_id) {
          var p = doc_id.split('/')
          var collname = p[0]
          var doc_key = p[1]

          var doc = new layer.BaseDao(collname, doc_key)

          return doc.load()
            .then(m => {
              data.doc = doc.model
            })
            .catch(err => {
              //ignore
              report('no doc to load/bad id')
            })
            .then(() => {
              return data
            })
        }

        if (username) {
          var user = new layer.User()
          return user.loadByName(username)
            .then(u => {
              data.doc = u.model
              return data
            })
            .catch(err => {
              return data
            })
        }

        if(info) {
          const p = info.split('/');
          if(p.length === 2) {
            const collection = p[0];
            const key = p[1];
            const doc = new layer.BaseDao(collection, key);
            return db.query(aql`
              FOR obj IN mobilecodes
                FILTER obj.uid == ${key}
                RETURN obj
            `)
              .then(cursor => cursor.next())
              .then(doc => {
                data.doc = doc;
                return data
              })
              .catch(err => report('no doc to load/bad id'))
          }
          else {
            const user = new layer.User();
            return user.loadByName(info)
              .then(u => {
                const key = u.model._key;
                return db.query(aql`
                  FOR obj IN mobilecodes
                  FILTER obj.uid == ${key}
                  RETURN obj
                `)
              })
              .then(cursor => cursor.next())
              .then(doc => {
                data.doc = doc;
                return data
              })
          }
        }

        return data
      })
      .then(data => {
        return getForumList(params)
      })
      .then(fl => {
        data.forumlist = fl
        return data
      })

  }
}

table.dangerouslyReplaceDoc = {
  operation: params => {
    var doc = params.doc
    return queryfunc.doc_replace(doc, doc)
  },
  requiredParams: {
    doc: Object,
  }
}

table.viewQuestions = {
  init: function () {
    queryfunc.createIndex('questions', {
      fields: ['toc'],
      type: 'skiplist',
      unique: 'false',
      sparse: 'false',
    })
    queryfunc.createIndex('questions', {
      fields: ['category', 'toc'],
      type: 'skiplist',
      unique: 'false',
      sparse: 'false',
    })
    queryfunc.createIndex('questions', {
      fields: ['uid', 'toc'],
      type: 'skiplist',
      unique: 'false',
      sparse: 'false',
    })
  },
  operation: params => {
    var data = defaultData(params)
    data.template = jadeDir + 'questions_edit.jade'

    return Promise.resolve()
      .then(() => {
        var showcount = params.permittedOperations.listAllQuestions ? null : 5;

        if (params.category) {
          return layer.Question.listAllQuestionsOfCategory(params.category, showcount)
        }
        else {
          return layer.Question.listAllQuestions(null, showcount)
        }
      })
      .then(function (back) {
        data.questions_all = back

        return layer.Question.listAllQuestions(params.user._key)
      })
      .then(function (back) {
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
      .then(back => {
        data.byuser = back[0].byuser
        data.bycategory = back[0].bycategory

        return data
      })
  }
}

table.viewSMS = {
  init: function () {
    queryfunc.createIndex('sms', {
      fields: ['s', 'toc'],
      type: 'skiplist',
      unique: 'false',
      sparse: 'false',
    })
    queryfunc.createIndex('sms', {
      fields: ['r', 'toc'],
      type: 'skiplist',
      unique: 'false',
      sparse: 'false',
    })
  },
  operation: params => {
    var data = defaultData(params)
    data.template = jadeDir + 'interface_messages.jade'
    var uid = params.user._key
    data.receiver = params.receiver //optional param
    const page = params.page || 0;
    const tab = params.tab || 'replies';
    const user = params.user;
    return Promise.resolve()
      .then(() => {
        if (tab === 'replies') {
          return queryfunc.decrementPsnl(user._key, 'replies')
            .then(() => db.query(aql`
              LET replies = (FOR r IN replies
                FILTER r.touid == ${uid}
                SORT r.toc DESC
                LET fromPost = DOCUMENT(posts, r.frompid)
                LET fromUser = DOCUMENT(users, r.fromPost.uid)
                LET toUser = DOCUMENT(users, ${uid})
                LET toPost = DOCUMENT(posts, r.topid)
                FILTER !fromPost.disabled
                RETURN {
                  r,
                  fromPost,
                  toUser,
                  toPost
                })
              RETURN {
                length: LENGTH(replies),
                docs: replies
              }
            `))
            .then(cursor => cursor.next())
        }
        if (tab === 'at') {
          return queryfunc.decrementPsnl(user._key, 'at')
            .then(() => db.query(aql`
              LET ats = (
                FOR i IN invites
                  FILTER i.invitee == ${uid}
                  SORT i.toc DESC
                  LET post = DOCUMENT(posts, i.pid)
                  LET user = DOCUMENT(users, i.inviter)
                  LET thread = DOCUMENT(threads, post.tid)
                  LET oc = DOCUMENT(posts, thread.oc)
                RETURN {
                  i,
                  post,
                  user,
                  thread,
                  oc
                }
              )
              RETURN {
                length: LENGTH(ats),
                docs: ats
              }
            `))
            .then(cursor => cursor.next())
        }
        if (tab === 'messages') {
          const conversation = params.conversation;
          if(conversation) {
            let doc;
            return db.collection('users').document(conversation)
              .then(u => {
                data.targetUser = u;
                return db.query(aql`
                  LET messages = (FOR s IN sms
                    FILTER s.r == ${uid} && s.s == ${conversation} || 
                    s.s == ${uid} && s.r == ${conversation}
                    SORT s.toc DESC
                    LET sender = DOCUMENT(users, s.s)
                    LET receiver = DOCUMENT(users, s.r)
                    RETURN MERGE(s, {s: sender, r: receiver}))
                  RETURN {
                    docs: messages,
                    length: LENGTH(messages)
                  }
                `)
              })
              .then(cursor => cursor.next())
              .then(d => {
                doc = d;
                return db.query(aql`
                  FOR s IN sms
                  FILTER s.s == ${conversation} && s.r == ${user._key}
                  FILTER s.viewed == false
                  UPDATE s WITH {viewed: true} IN sms
                  COLLECT WITH COUNT INTO length
                  RETURN length
                `)
              })
              .then(cursor => cursor.next())
              .then(length => {
                return db.query(aql`
                  LET u = DOCUMENT(users_personal, ${user._key})
                  LET msg = u.new_message
                  UPDATE u WITH {new_message: {
                    messages: msg.messages - ${length},
                    at: msg.at,
                    replies: msg.replies,
                    system: msg.system
                  }} IN users_personal
                `)
              })
              .then(() => doc)
          }
          return db.query(aql`
            LET messages = (
              LET ms = (FOR s IN sms
                FILTER s.r == ${uid} || s.s == ${uid}
                SORT s.toc DESC
                RETURN MERGE(s, {conversation: s.r == ${uid}? s.s : s.r})
              )
              FOR s IN ms
                COLLECT conversation = s.conversation INTO group = s
                SORT group[0].toc DESC
              RETURN {
                conversation: DOCUMENT(users, conversation),
                group
              })
            RETURN {
              docs: messages,
              length: LENGTH(messages)
            }
          `)
            .then(cursor => cursor.next())
        }
        if(params.key) {
          let doc;
          return db.collection('sms').document(params.key)
            .then(d => {
              doc = d;
              if(doc.viewed.indexOf(user._key) > -1)
                return;
              return db.query(aql`
                LET u = DOCUMENT(users_personal, ${user._key})
                LET msg = u.new_message
                UPDATE u WITH {new_message: {
                  messages: msg.messages,
                  system: msg.system - 1,
                  at: msg.at,
                  replies: msg.replies
                }} IN users_personal
                `)
                .then(() => {
                  doc.viewed.push(user._key);
                  db.collection('sms').update(doc, {viewed: doc.viewed})
                })
            })
            .then(() => doc)
        }
        return db.query(aql`
          let sysInfos = (
            for s in sms
              filter s.s == 'system' && s.toc > ${user.toc}
              sort s.toc desc
            return s
          )
          return {
            docs: sysInfos,
            length: LENGTH(sysInfos)
          }
        `).then(cursor => cursor.next())
      })
      .then(doc => {
        if(doc.length > -1) {
          const paging = new layer.Paging(page).getPagingParams(doc.length);
          data.paging = paging;
          data.docs = doc.docs.slice(paging.start, paging.start + paging.count);
        } else {
          data.docs = doc
        }
        data.tab = tab;
        data.conversation = params.conversation;
        return data
      })
  }
};

table.viewPersonal = {
  operation: function (params) {
    var data = defaultData(params)
    data.template = jadeDir + 'interface_personal.jade'
    var psnl = new layer.Personal(params.user._key)
    return psnl.load()
      .then(psnl => {
        data.personal = psnl

        return getForumList(params)
      })
      .then(res => {
        data.forumlist = res
        return data
      })
  }
};

table.postNewMessage = {
  operation: params => {
    const conversation = params.conversation;
    const username = params.username;
    const content = params.content;
    const user = params.user;
    const toc = Date.now();
    const ip = params._req.iptrim;
    let rUser;
    return Promise.resolve()
      .then(() => {
        if(conversation)
          return db.collection('sms').save({
            s: user._key,
            r: conversation,
            c: content,
            viewed: false,
            toc,
            ip
          });
        return apifunc.get_user_by_name(username)
          .then(receiveUser => {
            rUser = receiveUser[0];
            return db.collection('sms').save({
              s: user._key,
              r: rUser._key,
              c: content,
              viewed: false,
              toc,
              ip
            })
          })
      })
      .then(() => queryfunc.incrementPsnl((rUser? rUser._key: conversation), 'messages'))
  }
};

table.viewSelf = {
  init: () => Promise.all([
    queryfunc.createIndex('usersBehavior', {
      type: 'skiplist',
      fields: ['time']
    }),
    queryfunc.createIndex('usersBehavior', {
      type: 'skiplist',
      fields: ['uid'],
    }),
    queryfunc.createIndex('usersBehavior', {
      type: 'skiplist',
      fields: ['pid'],
    }),
    queryfunc.createIndex('usersBehavior', {
      type: 'skiplist',
      fields: ['tid'],
    }),
    queryfunc.createIndex('usersBehavior', {
      type: 'skiplist',
      fields: ['fid'],
    }),
    queryfunc.createIndex('usersBehavior', {
      type: 'skiplist',
      fields: ['mid', 'toMid']
    }),
    queryfunc.createIndex('usersBehavior', {
      type: 'skiplist',
      fields: ['toMid', 'type']
    })
  ]),
  operation: params => {
    let data = defaultData(params);
    let uid = params.user._key;
    data.template = jadeDir + 'self.jade';
    let page = params.page || 0;
    if(page === 0) {
      return db.collection('users').document(uid)
        .then(doc => {
          let lastTime = doc.lastVisitSelf || Date.now();
          return db.query(aql`
            LET usersSub = document(usersSubscribe, ${uid})
            LET sUs = usersSub.subscribeUsers
            LET sFs = usersSub.subscribeForums
            LET BHV = (FOR o IN usersBehavior
              SORT o.time DESC
              FILTER o.uid == ${uid} || POSITION(sUs, o.uid) || o.mid == ${uid} || o.toMid == ${uid}
              LIMIT 30
              RETURN o
            )
            LET subForumBHV = (
            FOR o IN usersBehavior
              FILTER o.time > ${lastTime} && position(sFs, o.fid)
              RETURN o)
            LET FBHV = (
              FOR o IN subForumBHV
              COLLECT tid = o.tid INTO groups = o
              FILTER LENGTH(groups[*]) > 6
              RETURN {
                tid,
                threadsInGroup: groups
              }
            )
            LET FBHL = (
              FOR forumB IN FBHV
              RETURN MERGE(LAST(forumB.threadsInGroup), {actInThread: LENGTH(forumB.threadsInGroup)})
            )
            LET res = UNION(FBHL, BHV)
              FOR action IN res
              SORT action.time DESC
              LET thread = DOCUMENT(threads, action.tid)
              LET oc = DOCUMENT(posts, thread.oc)
              LET post = DOCUMENT(posts, action.pid)
              LET forum = DOCUMENT(forums, action.fid)
              LET myForum = DOCUMENT(personalForums, action.mid)
              LET toMyForum = DOCUMENT(personalForums, action.toMid)
              LET user = DOCUMENT(users, action.uid)
              RETURN MERGE(action, {
                thread,
                oc,
                post,
                forum,
                myForum,
                toMyForum,
                user
              })
          `)
        })
        .then(res => {
          data.activities = res._result.map(obj => {
            obj.post.c = tools.contentFilter(obj.post.c);
            return obj
          });
          return db.collection('users').update(uid, {lastVisitSelf: Date.now()})
        })
        .then(() => data)
    }
    else return db.query(aql`
      LET usersSub = document(usersSubscribe, ${uid})
      LET sUs = usersSub.subscribeUsers
      LET sFs = usersSub.subscribeForums
      LET BHV = (FOR o IN usersBehavior
        SORT o.time DESC
        FILTER o.uid == ${uid} || POSITION(sUs, o.uid) || o.mid == ${uid} || o.toMid == ${uid}
        LIMIT ${page * 30}, 30
        RETURN o
      )
        FOR action IN BHV
        SORT action.time DESC
        LET thread = DOCUMENT(threads, action.tid)
        LET oc = DOCUMENT(posts, thread.oc)
        LET post = DOCUMENT(posts, action.pid)
        LET forum = DOCUMENT(forums, action.fid)
        LET myForum = DOCUMENT(personalForums, action.mid)
        LET toMyForum = DOCUMENT(personalForums, action.toMid)
        LET user = DOCUMENT(users, action.uid)
        RETURN MERGE(action, {
          thread,
          oc,
          post,
          forum,
          myForum,
          toMyForum,
          user
        })
    `)
    /*console.log(Date.now())
     return db.query(aql`
     LET usersSub = DOCUMENT(usersSubscribe, ${uid})
     LET sUs = usersSub.subscribeUsers
     LET sFs = usersSub.subscribeForums
     FOR post IN posts
     SORT post.tlm DESC
     SORT post.tlm DESC
     LET thread = DOCUMENT(threads, post.tid)
     FILTER POSITION(sUs, TO_NUMBER(post.uid)) || POSITION(sFs, TO_NUMBER(thread.fid))
     LIMIT 65
     LET forum = DOCUMENT(forums, thread.fid)
     LET oc = DOCUMENT(posts, thread.oc)
     LET myForum = DOCUMENT(personalForums, thread.mid)
     LET toMyForum = DOCUMENT(personalForums, thread.toMid)
     LET user = DOCUMENT(users, ${uid})
     RETURN MERGE({} ,{
     thread,
     oc,
     post,
     forum,
     myForum,
     toMyForum,
     user,
     tid: thread._key,
     fid: forum._key,
     pid: post._key,
     time: post.tlm,
     uid: user._key,
     mid: thread.mid,
     toMid: thread.toMid
     })
     `)*/
      .then(res => {
        let result = res._result;
        for (obj of result) {
          if (!obj.user) {
            console.log(obj);
          }
        }
        data.activities = res._result.map(obj => {
          obj.post.c = tools.contentFilter(obj.post.c);
          return obj
        });
        if (params.page) return res._result;
        return data
      })
      .catch(e => console.log(e))
  },
};

table.viewPersonalActivities = {
  operation: params => {
    let data = defaultData(params);
    data.template = jadeDir + 'interface_activities_personal.jade';
    let uid = params.uid;
    let username = params.username;
    let targetUser;
    let page = params.page;
    return Promise.resolve()
      .then(() => {
        if (uid) {
          targetUser = new layer.User(uid.toString())
          return targetUser.load()
        } else if (username) {
          targetUser = new layer.User();
          return targetUser.loadByName(username.toString())
        } else {
          throw 'please specify uid or username'
        }
      })
      .then(user => {
        uid = user.model._key;
        data.targetUser = targetUser.model;
        return db.collection('personalForums').document(uid)
      })
      .then(forum => {
        data.forum = forum;
        return queryfunc.getVisibleChildForums(params)
      })
      .then(arr => {
        let forumArr = Array.from(arr); //deep copy from all the forum that can be visited
        arr.push(null); //push null to origin arr for personal forum
        return db.query(aql`
          FOR o IN usersBehavior
            SORT o.time DESC
            FILTER o.uid == ${uid} && POSITION(${arr}, o.fid)
            LIMIT ${page ? page * 30 : 0}, 30
            LET thread = DOCUMENT(threads, o.tid)
            LET forum = DOCUMENT(forums, thread.fid)
            FILTER HAS(${params.contentClasses}, forum.class)
            LET oc = DOCUMENT(posts, thread.oc)
            LET post = DOCUMENT(posts, o.pid)
            LET myForum = DOCUMENT(personalForums, o.mid)
            LET toMyForum = DOCUMENT(personalForums, o.toMid)
            LET user = DOCUMENT(users, o.uid)
            RETURN MERGE(o,{
            thread,
            oc,
            post,
            forum,
            myForum,
            toMyForum,
            user
          })
        `)
      })
      .then(res => {
        data.activities = res._result.map(obj => {
          obj.post.c = tools.contentFilter(obj.post.c);
          return obj
        });
        if (page) return res._result;
        return data;
      })
      .catch(e => {
        throw e
      })
  }
};

table.viewUser = {
  operation: function (params) {
    var data = defaultData(params)
    data.template = jadeDir + 'interface_profile.jade'

    var uid = params.uid
    var uname = params.username

    return Promise.resolve()
      .then(() => {
        var thatuser
        if (uid) {
          thatuser = new layer.User(uid.toString())
          return thatuser.load()
        } else if (uname) {
          thatuser = new layer.User()
          return thatuser.loadByName(uname.toString())
        } else {
          throw 'please specify uid or username'
        }
      })
      .then(thatuser => {
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

        `, {uid}
        )
      })
      .then(recentposts => {
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

        `, {uid}
        )
      })
      .then(res => {

        //filtering:
        // remove duplicate threads in result
        var resfiltered = [];
        var cache = {}
        for (p in res) {
          if (cache[res[p].tid]) {

          } else {
            cache[res[p].tid] = true;
            resfiltered.push(res[p])
          }
        }
        data.recentInvolvedThreadResponses = resfiltered.sort(function (a, b) {
          return b.thread.tlm - a.thread.tlm
        }).slice(0, 10)

        return data
      })
  }
}

table.viewPostHistory = {
  operation: function (params) {
    var data = defaultData(params)
    data.template = jadeDir + 'interface_post_history.jade'

    var pid = params.pid
    var p = new layer.Post(pid)
    return p.load()
      .then(p => {
        return p.testView(params.contentClasses)
      })
      .then(p => {

        data.post = p.model
        return AQL(
          `
        for p in histories
        filter p.pid == @pid
        sort p.pid desc, p.tlm desc
        return p
        `, {pid}
        )
      })
      .then(posts => {
        data.histories = posts
        return data
      })
  },
  requiredParams: {
    pid: String,
  }
}

table.viewPage = {
  operation: function (params) {
    var data = defaultData(params)
    data.template = jadeDir + 'interface_page.jade'

    var pagenames = {'faq': '822194'}
    var pid = pagenames[params.pagename] || params.pagename
    var post = new layer.Post(pid)
    return post.load()
      .then(p => {
        return p.mergeResources()
      })
      .then(p => {
        data.post = p.model
        return data
      })
  },
  requiredParams: {
    pagename: String,
  }
}

table.viewTemplate = {
  operation: function (params) {
    var data = defaultData(params)
    data.template = jadeDir + params.template
    return data
  },
  requiredParams: {
    template: String,
  }
}

table.viewCollectionOfUser = {
  operation: function (params) {
    var operations = require('../api_operations.js')

    var data = defaultData(params)
    data.template = jadeDir + 'interface_collections.jade'

    var uid = params.uid || params.user._key
    params.uid = uid
    var u = new layer.User(uid)
    return u.load()
      .then(u => {
        data.thisuser = u.model

        return operations.table.listMyCategories.operation(params)
      })
      .then(arr => {
        data.categoryNames = arr
        if (arr.indexOf(params.category || null) < 0) {
          //if specified category not exist
          params.category = arr[0]
        }

        return operations.table.listMyCollectionOfCategory.operation(params)
      })
      .then(arr => {
        data.categoryThreads = arr
        data.category = params.category

        return getForumList(params)
          .then(res => {
            data.forumlist = res
            data.forum = {}
            return data
          })
      })
  }
}

table.viewForgotPassword = {
  operation: function (params) {
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
  operation: function (params) {
    var data = defaultData(params)
    //var captcha = svgCaptcha.create();  //创建验证码
    //params._req.session.icode3 = captcha.text;  //验证码text保存到session中
    //var road = path.resolve(__dirname, '../..')
    //fs.writeFile(road + '/static/captcha/captcha3.svg', captcha.data, {'flag': 'w'});  //保存验证码图片
    data.template = jadeDir + 'interface_viewForgotPassword2.jade'

    data.username = params.username  //url后面的参数
    data.phone = params.phone
    data.mcode = params.mcode
    if (data.phone != undefined && data.mcode != undefined) {
      return AQL(`
        for u in mobilecodes
        filter u.mobile == @mobile
        return u
        `, {mobile: data.phone}
      )
        .then(a => {
          //console.log(a)
          return AQL(`
          for u in users
          filter u._key == @userid
          return u
          `, {userid: a[0].uid}
          )
        })
        .then(b => {
          //console.log(b)
          return data
        })

    }


    return data
  }
}


table.viewLocalSearch = {
  operation: function (params) {
    var data = defaultData(params)
    data.template = jadeDir + 'interface_localSearch.jade'

    params.start = Number(params.start) || 0
    params.count = Number(params.count) || 30

    var operations = require('../api_operations.js')
    return operations.table.localSearch.operation(params)
      .then(res => {
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
        `, {hits: res.result.hits.hits}
        )
      })
      .then(res => {
        data.threads = res
        return getForumListKv(params)
      })
      .then(res => {
        data.forumlistkv = res
        return getThreadTypes()
      })
      .then(res => {
        data.threadtypes = res.tt
        data.forumthreadtypes = res.ftt

        return data
      })
  },
};

table.viewBehaviorLogs = {
  init: () => Promise.all([
    queryfunc.createIndex('behaviorLogs', {
      fields: ['from'],
      type: 'skiplist',
    }),
    queryfunc.createIndex('behaviorLogs', {
      fields: ['to'],
      type: 'skiplist',
    }),
    queryfunc.createIndex('behaviorLogs', {
      fields: ['isManageOp'],
      type: 'skiplist',
    }),
    queryfunc.createIndex('behaviorLogs', {
      fields: ['timeStamp'],
      type: 'skiplist',
    }),
    queryfunc.createIndex('creditlogs', {
      fields: ['type', 'source'],
      type: 'skiplist'
    })
  ]),
  operation: params => {
    const data = defaultData(params);
    data.template = jadeDir + '/interface_behavior_log.jade';
    const page = params.page - 1 || 0;
    const type = params.type || 'all';
    const perPage = settings.paging.perpage;
    const filterTypes = {
      all: 'all',
      management: true,
      normal: false
    };
    const filter = (filterTypes[type] === 'all' ? null : 'isManageOp');
    const from = params.from;
    const to = params.to;
    const address = params.ip;
    const sort = params.sort || 'desc';
    return db.query(aql`
      LET logs1 = (FOR log IN behaviorLogs
        FILTER log.${from? 'from': to? 'to' : 'non'} == ${from? from: to? to: null} && 
        log.${filter? filter : 'non'} == ${filter? filterTypes[type] : null} &&
        log.${address? 'address' : 'non'} == ${address? address : null}
        LET from = DOCUMENT(users, log.from)
        LET to = DOCUMENT(users, log.to)
        RETURN MERGE(log, {from, to}))
      LET logs2 = (FOR log IN creditlogs
        FILTER log.type == 'xsf' && log.source == 'nkc' && log.address > null &&
        log.${from? 'from': to? 'to' : 'non'} == ${from? from: to? to: null} && 
        log.${filter? filter : 'non'} == ${filter? filterTypes[type] : null} &&
        log.${address? 'address' : 'non'} == ${address? address : null}
        LET p = DOCUMENT(posts, log.pid)
        LET from = DOCUMENT(users, log.uid)
        LET to = DOCUMENT(users, log.touid)
        RETURN {
          timeStamp: log.toc,
          reason: log.reason,
          from,
          to,
          port: log.port,
          address: log.address,
          operation: 'changeXSF',
          number: log.q,
          parameters: {
            targetKey: '/t/' + p.tid,
            pid: log.pid
          } 
        }
      )
      LET logs = (FOR log IN UNION(logs1, logs2)
        SORT log.timeStamp ${sort}
        return log)
      LET length = LENGTH(logs)
      LET result = SLICE(logs, ${page * perPage}, ${perPage})
      RETURN {
        logs: result,
        length
      }
    `)
      .then(cursor => cursor.next())
      .then(result => {
        data.behaviorLogs = result.logs;
        let newPage = new layer.Paging(page).getPagingParams(result.length);
        newPage.page = params.page || 1;
        data.page = newPage;
        data.type = type;
        data.from = from;
        data.ip = params.ip;
        data.to = to;
        data.sort = params.sort;
        return data
      })
  }
};

table.viewNewUsers = {
  operation: params => {
    const data = defaultData(params);
    const page = params.page || 0;
    const perPage = settings.paging.perpage;
    data.template = jadeDir + '/interface_new_users.jade';
    return db.query(aql`
      LET users = (FOR u IN users
        SORT u.toc DESC
        return u)
      LET length = LENGTH(users)
      LET result = SLICE(users, ${page * perPage}, ${perPage})
      RETURN {
        users: result,
        length
      }
    `)
      .then(cursor => cursor.next())
      .then(res => {
        data.users = res.users;
        let newPage = new layer.Paging(page).getPagingParams(res.length);
        newPage.page = params.page || 1;
        data.page = newPage;
        return data
      })
  }
};
//查看订阅和被订阅页面
table.viewSubscribe = {
  operation: params => {
    const data = defaultData(params);
    const page = params.page || 1;
    const list = params.list || 'subscribers';
    const uid = params.uid;
    const perPage = settings.paging.perpage;
    data.template = jadeDir + '/interface_subscribe.jade';
    return db.query(aql`
      LET targetUser = DOCUMENT(users, ${uid})
      LET us = DOCUMENT(usersSubscribe, ${uid})
      LET uss = us? us.${list} : []
      LET length = LENGTH(uss)
      LET result = SLICE(uss, ${(page-1) * perPage}, ${perPage}) || []
      LET d = (
        FOR uid in result
        RETURN DOCUMENT(users, uid)
      )
      return {
        userslist: d,
        length: length,
        targetUser: targetUser
      }
    `)
      .then(cursor => cursor.next())
      .then(res => {
        data.users = {};
        data.users.userslist = res.userslist;
        data.users.page = {
          page: page,
          pagecount: Math.ceil(res.length/perPage)
        };
        data.users.list = params.list || '';
        data.targetUser = res.targetUser;
        return data;
      })
  }
};

function sha256HMAC(password, salt) {
  const crypto = require('crypto')
  var hmac = crypto.createHmac('sha256', salt)
  hmac.update(password)
  return hmac.digest('hex')
}


function create_muser(user) {
  let uid;
  return apifunc.get_new_uid()
    .then((newuid) => {
      uid = newuid;
      var timestamp = Date.now();

      var newuser = {
        _key: uid,
        username: user.username,
        username_lowercase: user.username.toLowerCase(),
        toc: timestamp,
        tlv: timestamp,
        regIP: user.regIP,
        regPort: user.regPort,
        certs: ['mail', 'examinated'],
      }

      var newuser_personal = {
        _key: uid,
        email: user.email,
        hashtype: user.hashtype,
        password: user.password,
        new_message: {
          messages: 0,
          at: 0,
          replied: 0,
          system: 0
        },
      };
      return db.query(aql`
        for u in users
          filter u.username_lowercase == ${user.username.toLowerCase()}
        return u
      `)
        .then(cursor => cursor.all())
        .then(users => {
          if (users.length > 0)
            throw `此用户名已经被注册,请重新注册`;
          return queryfunc.doc_save(newuser, 'users')
        })
        .then(() => {
          return queryfunc.doc_save(newuser_personal, 'users_personal')
        })
        .then(res => {
          return db.query(aql`
            INSERT {
              _key: ${uid},
              type: 'forum',
              abbr: SUBSTRING(${user.username}, 0, 6),
              display_name: CONCAT(${user.username}, '的专栏'),
              description: CONCAT(${user.username}, '的专栏'),
              moderators: [${user.username}],
              recPosts: []
            } INTO personalForums
          `)
        })
        .catch((err) => {
          let errInsert = err;
          return Promise.resolve()
            .then(deleteErrDoc(uid, 'users'))
            .then(deleteErrDoc(uid, 'users_personal'))
            .then(deleteErrDoc(uid, 'personalForums'))
            .then(() => {
              throw `创建用户数据表出错：${err}`;
            })
            .catch((err) => {
              throw `创建用户数据表出错:${errInsert}；${err}`;
            })
        })
    })
}

table.viewNewSysInfo = {
  operation: params => {
    const data = defaultData(params);
    data.template = jadeDir + '/interface_new_sysinfo.jade';
    data.twemoji = settings.editor.twemoji;
    return data
  }
};

table.postsysinfo = {
  operation: params => {
    if(params.title === '') throw '标题必填';
    if(params.content.length < 6) throw '内容太短';
    const sms = {
      c: {
        title: params.title,
        content: params.content
      },
      toc: Date.now(),
      ip: params._req.iptrim,
      s: 'system',
      viewed: [],
    };
    return db.collection('sms').save(sms)
      .then(() => {
        params._res.sent = true;
        params._res.redirect('/experimental');
        return queryfunc.incrementPsnl('all', 'system')
      })
  }
}
function deleteErrDoc(uid, collection) {
  return db.query(aql`
		FOR u IN ${collection}
		FILTER u._key = ${uid}
		REMOVE u IN ${collection}
	`).catch((uid, collection, err) => {
    throw `删除${collection}中_key=${uid}出错：${err}`;
  });
}