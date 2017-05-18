//the epic conversion program

//convert old KC MySQL database tables to ArangoDB

var timestamp = Date.now()
function stamp(str){
  str = str||''
  console.log((Date.now()-timestamp )/1000 +'s ',str);
}

global.__projectroot = __dirname + '/';//create global variable for project root directory

//global.environment = process.env.NODE_ENV||'development';
global.environment = 'development'
global.development = environment !== 'production';
console.log('running in '+environment+' mode');

var settings = require('./nkc_modules/server_settings')
settings.server.database_name = 'test'

var apifunc = require('./nkc_modules/api_functions');
var queryfunc = require('./nkc_modules/query_functions');
var mysql = require('mysql')
var AQL = queryfunc.AQL

var nkcfs = require('./nkc_modules/nkc_fs')

function sqlquery(qstring,placeholders){
  if(!placeholders)placeholders = []

  qstring = qstring.replace(/test/g,require('./tEaterSettings.js').sql.database)

  return new Promise(function(resolve,reject){
    var connection = mysql.createConnection(require('./tEaterSettings.js').sql)
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
