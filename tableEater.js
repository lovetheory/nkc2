//the epic conversion program

//convert old KC MySQL database tables to ArangoDB

var timestamp = Date.now()
function stamp(str){
  str = str||''
  console.log((Date.now()-timestamp )/1000 +'s ',str);
}

global.__projectroot = __dirname + '/';//create global variable for project root directory
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path
module.paths.push(__projectroot ); //enable require-ment for this path

//global.environment = process.env.NODE_ENV||'development';
global.environment = 'development'
global.development = environment !== 'production';
console.log('running in '+environment+' mode');

var settings = require('server_settings')
settings.server.database_name = 'test'

var apifunc = require('api_functions');
var queryfunc = require('query_functions');
var mysql = require('mysql')
var AQL = queryfunc.AQL

var nkcfs = require('nkc_fs')

function sqlquery(qstring,placeholders){
  if(!placeholders)placeholders = []

  qstring = qstring.replace(/test/g,require('tEaterSettings.js').sql.database)

  return new Promise(function(resolve,reject){
    var connection = mysql.createConnection(require('tEaterSettings.js').sql)
    connection.connect();
    stamp('query '+qstring+' start')
    connection.query(qstring,placeholders,function(err,rows,fields){
      if(err)return reject(err);
      stamp('query '+qstring+' done')
      resolve({
        rows,
        fields,
      });
    })
    connection.end();
  })
}

function recreateCollection(name){
  return queryfunc.dropCollection(name)
  .catch(err=>{})
  .then(()=>{
    return queryfunc.createCollection(name)
  })
  .then(()=>{
    stamp(name+' collection recreated')
  })
}

function getTableLength(tablename){
  return sqlquery('SELECT COUNT(*) FROM '+tablename)
  .then(res=>{
    var count = res.rows[0]['COUNT(*)']
    return count
  })
}

var usercounter = 0

function importUsers(){
  stamp('start user import, sql start')

  var obj1={}
  return recreateCollection('users')
  .then(()=>{
    return recreateCollection('users_personal')
  })
  .then(res=>{

    //get user
    return getTableLength('test.pw_windid_user')
    .then(length=>{
      console.log(length);
      return sqlquery(`SELECT * FROM test.pw_windid_user`
      )
    })
    .then(res=>{
      obj1.userbaseinfo = res;
      return sqlquery('SELECT * FROM test.pw_windid_user_data')
    })
    .then(res=>{
      obj1.userscoreinfo = res;
      //return sqlquery('SELECT * FROM test.pw_windid_user_info')
      return sqlquery(`SELECT * FROM test.pw_windid_user_info
        left join test.pw_user_info
        on test.pw_windid_user_info.uid=test.pw_user_info.uid`
      )
    })
    .then(res=>{
      obj1.userbdayinfo = res;

      return obj1
    })
  })
  .then(obj1=>{
    stamp('user sql ended')

    var rows = obj1.userbaseinfo.rows
    var scorearray = obj1.userscoreinfo.rows
    var bdayarray = obj1.userbdayinfo.rows


    console.log(scorearray.length);
    console.log(bdayarray.length);

    var newuserset = [],newuserset_personal=[]
    var prom = Promise.resolve()

    for(i in rows){
      var user = rows[i]
      var userscore = scorearray[i]
      var userbday = bdayarray[i]

      var pw_windid_user_data = userscore
      var pw_windid_user = user
      var pw_user = user

      var bdaynumber = userbday.byear>0?userbday.byear*10000 + userbday.bmonth*100 +userbday.bday:undefined;

      var newuser = {
        _key:user.uid.toString(),
        toc:user.regdate * 1000,
        username:user.username,

        xsf:userscore.credit1||undefined,
        kcb:userscore.credit2,
        bday:bdaynumber,

        intro_text:userbday.profile||undefined,
        post_sign:userbday.bbs_sign||undefined,

      }

      var newuser_personal = {
        _key:user.uid.toString(),

        email:user.email,
        password:{
          hash:user.password,
          salt:user.salt,
        },

        hashtype:'pw9',
        regip:user.regip||undefined,
      }

      usercounter = Math.max(usercounter,user.uid)

      newuserset_personal.push(newuser_personal);
      newuserset.push(newuser);
      if(i%10000==0){
        console.log(i);
      }
    }

    stamp('user convert ended, now inserting arango')
    return queryfunc.importCollection(newuserset,'users')
    .then(()=>{
      return queryfunc.importCollection(newuserset_personal,'users_personal')
    })

  })
  .then(res=>{
    console.log(res);
    stamp('users import ended')
  })
}

function updateBanned(){
  stamp('lets ban sum bad guyz')
  return sqlquery(`SELECT * FROM test.pw_user where groupid=6`
  ).then(res=>{
    console.log(res.rows[0]);

    stamp(res.rows.length)

    var arr = []
    for(i in res.rows){
      var doc = res.rows[i]

      arr.push({uid:doc.uid.toString(),certs:['banned']})
    }

    return AQL(
      `for u in @arr let user = document(users,u.uid)
      update user with {certs:u.certs} in users
      `,{arr}
    )

  })
  .then(res=>{
    stamp('banned success');
  })
}

function importForums(){
  stamp('start forum import sql')
  return recreateCollection('forums')
  .then(()=>{
    return sqlquery('SELECT * FROM test.pw_bbs_forum')
  })
  .then(res=>{

    stamp('got forum tables')
    var bbsrows = res.rows
    var forums = []

    for(i in bbsrows){
      var forum = bbsrows[i]

      if(forum.type=='sub'){
        forum.type='forum'
      }

      forums.push({
        _key:forum.fid.toString(),
        parentid:forum.parentid.toString(),
        display_name:forum.name,
        description:forum.descrip,
        order:forum.vieworder,
        type:forum.type,
      })
    }

    return queryfunc.importCollection(forums,'forums')
  })
  .then(res=>{
    console.log(res);
    stamp('forums import ended')
  })
}

function importPostsAll(){

  return recreateCollection('posts')
  .then(res=>{
    return getTableLength('test.pw_bbs_posts')
  })
  .then(len=>{
    var k = 200000
    var batches = Math.floor(len/k)+1

    var arr=[]
    for(var i =0;i<batches;i++){
      arr.push(importPostsOneBatch(i*k,k))
    }
    return Promise.all(arr)
    //return importPostsOneBatch(0)
  })
}

var postcounter = 0
function importPostsOneBatch(start,lofq){
  var length
  stamp('starting from post '+start.toString())
  return sqlquery('SELECT * FROM test.pw_bbs_posts limit ?,?',[start,lofq])

  .then(res=>{
    stamp('sql for posts ended')
    var parr = res.rows

    var newposts = []

    for(i in parr){
      var post = parr[i]

      newposts.push({
        _key:post.pid.toString(),
        tid:post.tid.toString(),
        l:post.useubb?'pwbb':undefined,
        rpid:post.rpid?post.rpid.toString():undefined,
        t:post.subject.length>0?post.subject:undefined,
        c:post.content,
        uid:post.created_userid.toString(),
        ipoc:post.created_ip||undefined,
        toc:post.created_time*1000,

        tlm:post.modified_time*1000||post.created_time*1000,
        uidlm:post.modified_userid||undefined,

        disabled:post.disabled?true:undefined,
      })

      postcounter = Math.max(postcounter,post.pid)
    }

    stamp('end converting now inserting arango')
    length = newposts.length
    return queryfunc.importCollection(newposts,'posts')
  })
  .then(res=>{
    stamp('arango insert ended')
    stamp(length.toString()+ " posts inserted")
    return
  })
}

var threadcounter = 0
function importThreads(){
  return recreateCollection('threads')
  .then(()=>{
    stamp('start importing threads from sql')
    return sqlquery(
      `SELECT * FROM test.pw_bbs_threads join test.pw_bbs_threads_content
      on test.pw_bbs_threads_content.tid=test.pw_bbs_threads.tid ;`
    )
  })
  .then(res=>{
    var threads = res.rows
    stamp('got threads: '+threads.length)
    var newthreads = []
    var newposts = []

    for(i in threads){
      var t = threads[i]

      newthreads.push({
        _key:t.tid.toString(),
        fid:t.fid.toString(),
        category:t.topic_type.toString(),
        count_hit:t.hits,
        disabled:t.disabled?true:undefined,
        digest:t.digest?true:undefined,
      })

      threadcounter = Math.max(threadcounter,t.tid)

      newposts.push({
        _key:'t' + t.tid.toString(),
        tid:t.tid.toString(),

        uid:t.created_userid.toString(),
        ipoc:t.created_ip||undefined,

        toc:t.created_time*1000,
        tlm:(t.modified_time||t.created_time)*1000,

        uidlm:t.modified_userid||undefined,
        iplm:t.modified_ip||undefined,

        t:t.subject,
        c:t.content,
        l:'pwbb',
      })
    }

    stamp('threads: pushing to arango')
    return AQL(`
      for i in @newthreads
      insert i in threads
      `,{newthreads}
    ).then(()=>{
      return AQL(`
        for i in @newposts
        insert i in posts
        `,{newposts}
      )
    })
    .then(()=>{
      stamp('threads done')
    })
  })
}

function insertAdmin(){
  var adminuser = {
    _key:'-1',
    username:'nkc',
    email:'nkc@kc.ac.cn',
    certs:['dev'],
    toc:Date.now(),
  }

  var adminuser_personal = {
    _key:'-1',
    password:'123456',
  }

  return AQL(`insert @adminuser in users`,{adminuser})
  .then(()=>{
    return AQL(`insert @adminuser_personal in users_personal`,{adminuser_personal})
  })
}

function insertForums(){
  var f = []
  f.push({
    _key:'recycle',
    description:'发帖一时爽 全家火葬场',
    display_name:'回收站',
    order:99,
    type:'forum',
  })

  f.push({
    _key:'draft',
    description:'未发布/撤回修改',
    display_name:'草稿箱',
    order:99,
    type:'forum',
  })

  return AQL(`for k in @f insert k in forums`,{f})
}

function importQuestions(){
  stamp('importing questions')
  return recreateCollection('questions')
  .then(()=>{
    var exq = require(__projectroot +　'exampleQuestions.json')

    return queryfunc.importCollection(exq,'questions')
  })
  .then(res=>{
    console.log(res);
    stamp('questions imported')
  })
}

var resourcecounter = 0
function importResources(){
  return recreateCollection('resources')
  .then(()=>{
    return sqlquery('SELECT * FROM test.pw_attachs_thread')
  })
  .then(res=>{
    var resources = res.rows
    var newresources = []

    for(i in resources){
      var r = resources[i]

      var filename = r.path.split('/').pop()
      var extension = nkcfs.getExtensionFromFileName(filename)

      newresources.push({
        _key:r.aid.toString(),
        pid:(r.pid!=0?r.pid.toString():'t' + r.tid.toString()),
        oname:r.name,
        path:r.path,
        size:r.size*1024,
        uid:r.created_userid.toString(),
        toc:r.created_time*1000,
        ext:extension,
      })

      resourcecounter = Math.max(resourcecounter,r.aid)
    }

    stamp('importing resources to arango...')
    return queryfunc.importCollection(newresources,'resources')
  })
  .then(res=>{
    console.log(res);
    stamp('resources imported')
  })
}

var updateCounters = ()=>{
  return recreateCollection('counters')
  .then(()=>{
    stamp('counters coll created')
    var counterdocs = [
      {count:usercounter+100, _key:'users'},
      {count:postcounter+100, _key:'posts'},
      {count:threadcounter+100, _key:'threads'},
      {count:resourcecounter+100, _key:'resources'},
    ]

    return AQL(`for i in @counterdocs insert i in counters return NEW`,{counterdocs})
  })
  .then(res=>{
    console.log(res);
    stamp('counters updated')
  })
}

importPostsAll()
.then(()=>{
  return Promise.all([
    importUsers().then(insertAdmin).then(updateBanned),
    importForums().then(insertForums),

    importQuestions(),
    importThreads(),
  ])
})
.then(()=>{
  return importResources()
  .then(()=>{
    return updateCounters()
  })
})
.then(()=>{
})
.then(()=>{
  stamp('import all done. now create index')
  var operations = require('api_operations')

  //wait 15s to allow arango indexing
  return new Promise(function(resolve,reject){
    setTimeout(resolve,15000)
  })
})
.then(()=>{
  stamp('updating all threads...')
  var operations = require('api_operations')
  return operations.table.updateAllThreads.operation()
})
.then(()=>{
  stamp('threads updated')
  var operations = require('api_operations')
  return operations.table.updateAllForums.operation()
})
.then(()=>{
  stamp('forums updated')
  var operations = require('api_operations')
  return operations.table.updateAllUsers.operation()
})
.catch(err=>{
  console.log(err);
})
.then(()=>{
  stamp('user updated')
  stamp('everything ended')
})
