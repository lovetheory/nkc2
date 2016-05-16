//the epic conversion program

var timestamp = Date.now()
function stamp(str){
  str = str||''
  console.log((Date.now()-timestamp )/1000 +'s ',str);
}

global.__projectroot = __dirname + '/';//create global variable for project root directory
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

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

var connection = mysql.createConnection({
  host:'127.0.0.1',
  port:'3306',
  user:'root',
  password:'qaz123',
  database:'test',
})

console.log('beginning sql connection...');
connection.connect();

function sqlquery(qstring,placeholders){
  if(!placeholders)placeholders = []

  return new Promise(function(resolve,reject){
    connection.query(qstring,placeholders,function(err,rows,fields){
      if(err)return reject(err);
      resolve({
        rows,
        fields,
      });
    })
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

function importUsers(){
  stamp('start user import, sql start')
  return recreateCollection('users')
  .then(res=>{

    var obj1 ={}
    //get user
    return getTableLength('test.pw_windid_user')
    .then(length=>{
      console.log(length);
      return sqlquery('SELECT * FROM test.pw_windid_user')
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
    stamp('sql ended')

    var rows = obj1.userbaseinfo.rows
    var scorearray = obj1.userscoreinfo.rows
    var bdayarray = obj1.userbdayinfo.rows

    console.log(scorearray.length);
    console.log(bdayarray.length);

    var newuserset = []
    var prom = Promise.resolve()

    for(i in rows){
      var user = rows[i]
      var userscore = scorearray[i]
      var userbday = bdayarray[i]

      var bdaynumber = userbday.byear>0?userbday.byear*10000 + userbday.bmonth*100 +userbday.bday:undefined;

      var newuser = {
        _key:user.uid.toString(),
        toc:user.regdate * 1000,
        username:user.username,
        email:user.email,
        password:{
          hash:user.password,
          salt:user.salt,
        },
        hashtype:'pw9',
        regip:user.regip||undefined,

        xsf:userscore.credit1||undefined,
        kcb:userscore.credit2,
        bday:bdaynumber,

        intro_text:userbday.profile||undefined,
        post_sign:userbday.bbs_sign||undefined,
      }

      newuserset.push(newuser);
      if(i%10000==0){
        console.log(i);
      }
    }

    stamp('user convert ended, now inserting arango')
    return queryfunc.importCollection(newuserset,'users')
  })
  .then(res=>{
    console.log(res);
    stamp('users import ended')
  })
}

function importForums(){
  stamp('start forum import')
  return recreateCollection('forums')
  .then(()=>{
    return sqlquery('SELECT * FROM test.pw_bbs_forum')
  })
  .then(res=>{
    var bbsrows = res.rows
    var forums = []

    for(i in bbsrows){
      var forum = bbsrows[i]

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
  .then(()=>{
    return importPostsOneBatch(0)
  })
}

var postcounter = 0
function importPostsOneBatch(start){
  stamp('sqlstart')
  var length

  return sqlquery('SELECT * FROM test.pw_bbs_posts limit ?,100000',[start])

  .then(res=>{
    stamp('sqlended')
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
    }

    stamp('end converting now inserting arango')
    length = newposts.length
    return queryfunc.importCollection(newposts,'posts')
  })
  .then(res=>{
    stamp('arango insert ended')
    console.log(length);

    if(length<90000){
      console.log('end of posts');
      return
    }
    else {
      postcounter+=length
      console.log('pc',postcounter);
      return importPostsOneBatch(postcounter)
    }
  })
}

Promise.resolve()
.then(importUsers)
.then(importForums)
.then(importPostsAll)
.then(()=>{
  stamp('all done')
})
.catch(err=>{
  console.log(err);
})
.then(()=>{
  console.log('ending sql connection...');
  connection.end()
})
