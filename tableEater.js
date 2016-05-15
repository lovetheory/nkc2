//the epic conversion program

var timestamp = Date.now()
function stamp(){
  console.log((Date.now()-timestamp )/1000 +'s');
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
  .then()
  .catch(err=>{})
  .then(()=>{
    queryfunc.createCollection(name)
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
  stamp()
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
      return obj1
    })
  })
  .then(obj1=>{
    var rows = obj1.userbaseinfo.rows
    var scorearray = obj1.userscoreinfo.rows

    console.log(scorearray.length);

    var newuserset = []
    var prom = Promise.resolve()

    for(i in rows){
      var user = rows[i]
      var userscore = scorearray[i]
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
      }

      newuserset.push(newuser);
      if(i%10000==0){
        console.log(i);
      }
    }

    stamp()
    return queryfunc.importCollection(newuserset,'users')
  })
  .then(res=>{
    console.log(res);
    console.log('users import ended');
    stamp()
  })
}

importUsers()
.then(()=>{
  console.log('all done...');
  stamp()
})
.catch(err=>{
  console.log(err);

})
.then(()=>{
  console.log('ending sql connection...');
  connection.end()
})
