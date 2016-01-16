//chat request handlers
module.paths.push('./nkc_modules'); //enable require-ment for this path

var moment = require('moment');

var settings = require('server_settings.js');
var helper_mod = require('helper.js')();

var nano = require('nano')('http://'+settings.couchdb.address+':'+settings.couchdb.port.toString());
var posts = nano.use("posts");
var chat = nano.use('chat');
var users = nano.use("users");
var counters = nano.use('counters');
var request = require('request');

var express = require('express');
var route_handler = express.Router();

///------------
///logger, to be executed before all handlers below
route_handler.use(function(req,res,next){
  requestLog(req);
  next();
});

//chatroom HTML serving
route_handler.get('/',function(req,res){
  res.sendFile(__dirname + '/chat/chat.html');
});

//chatroom HTML serving
route_handler.get('/jquery-1.11.1.js',function(req,res){
  res.sendFile(__dirname + '/jquery/jquery-1.11.1.js');
});

exports.route_handler = route_handler;

///-----------------------------------------
///socket.io.chat section
exports.socket_handler = function(chat_io){
  chat_io.usercount=0;
  chat_io.on('connection',function(socket){
    var dstr = dateString();
    var addr = socket.request.connection.remoteAddress;
    chat_io.usercount++;
    report('chat_io.total_users:'+chat_io.usercount.toString()+" "+addr.toString());//new socket connected

    //tell client this is a reconnection
    socket.emit('reconnection','');

    socket.on('disconnect',function(){
      chat_io.usercount--;
      report('chat.user.disconn '+addr.toString());
    });

    //load chat history from database
    chat.view('history','history',{descending:true,limit:128},
    function(err,body){
      if(!err){
        //  send them back to user
        var i = body.rows.length;
        while(i--)
        {
          var doc = body.rows[i].value;
          socket.emit('msg',msgform(dateString(doc.t),doc.u,doc.c,doc.m));
        }
      }
      //show welcome messages after loading db
      //io.emit('msg',msgform(dstr,'#',addr.toString()+' 已连接 - 已有'+usercount.toString()+'用户'));
      socket.emit('msg',msgform(dstr,'#','欢迎访问KC聊天室[施工中]\n\
      本聊天室保存所有历史记录，刷新载入最近128条\n\
      右下角填写论坛id可显示头像\n\
      科创论坛互联网中心期待您的加入，我们准备好了工资福利，有意请联系论坛novakon同学\n\
      您可以使用配对的[tex]标签包含以LaTeX表示的数学公式，以及用配对的[smi]标签包含以SMILES表示的化学结构式，以及[cas]包含CAS编号……'));
    });

    //on incoming message
    socket.on('msg',function(msg)
    {
      var datenow = Date.now();
      var dstr=dateString(datenow);
      var msgobj={};
      try{
        msgobj = JSON.parse(msg);
      }
      catch(err){
        report('err parsing json[from socket]',err);
        return;
      }

      var content = msgobj.content;
      var sender = msgobj.user;

      if(content == '/info'){
        socket.emit('msg',msgform(dstr,'#',content));
        socket.emit('msg',msgform(dstr,'#',JSON.stringify(osinfo(),null,'\t')));
        return;
      }

      if(content=='/stat'){
        socket.emit('msg',msgform(dstr,'#',content));
        var stat='';
        stat+='目前共有'+usercount.toString()+'用户';
        socket.emit('msg',msgform(dstr,'#',stat));
        return;
      }

      if(content.trim()=="" || sender.trim()=="" || sender.trim()=="#"){
        return;
      }
      //here now we can make sure this message is valid.

      //check if user exists in KC database, if so obtain its uid
      //http://127.0.0.1:5984/users/_design/username/_view/username?key=%22@@%22
      users.view('username','username',{key:sender},
      function(err,body){
        var userid = null;
        if(!err){
          var i = body.rows.length;
          if(i==1)
          {
            userid = body.rows[0].value._id;
            console.log(userid);
          }
        }

        //form the msg object to send to client
        var jsonmsg;
        if(userid){
          jsonmsg = msgform(dstr,sender,content,{"userid":userid});
          console.log(jsonmsg);
        }
        else {
          jsonmsg = msgform(dstr,sender,content,{});
        }

        //send event 'msg' to every 'socket' within 'io'
        chat_io.emit('msg',jsonmsg);
        report('chat->'+msg);

        //build a doc describing a chat message
        var chatdoc={t:datenow,u:sender,c:content,ad:addr,m:{"userid":userid}};

        //log into db
        chat.insert(chatdoc,function(err,body){
          if(!err)
          {  //unlikely
          }
        });
      });
    });
  });
};
