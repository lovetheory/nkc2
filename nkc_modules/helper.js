//helper module

//dependencies
var moment = require('moment');
var os = require('os');

module.exports = function(){

  //dashline generator
  this.dash=function(){
    console.log("-------------------------------------------------------");
  };

  //reformat a post after retrieval
  this.postRepack = function(p){
    delete p._rev;
    return p;
    return {
      pid:p._id,
      uid:p.uid,
      tid:p.tid,
      timecreated:p.toc,
      content:p.content
    };
  };

  //request logger
  this.requestLog = function (req){
    var d=new Date();
    dash();
    console.log(dateString(d),
    req.ip, req.method, req.originalUrl);
  };

  //error reporter
  this.report = function(description,error){
    if(error){
      console.log(dateString(),"err:",description);
      console.log(error);
      return({'error':description});
    }else{
      console.log(dateString(),"msg:",description);
      return({message:description});
    }
  };

  //datestring generator
  this.dateString = function(date){
    var dateformat="YYYY-MM-DD HH:mm:ss";

    if(date)//if input contains date
    {
      return moment(date).format(dateformat);
      return (date.toISOString().
      replace('T', ' ').      // replace T with a space
      substr(0,19));
    }
    else
    {
      return moment().format(dateformat);
      return (new Date().toISOString().
      replace('T', ' ').      // replace T with a space
      substr(0,19)); //delete trails
    }
  };

  ///----
  ///osinfo helper
  this.osinfo = function(){
    var kv={};
    Object.keys(os).map(function(method) {
      try{
        kv[method] = os[method]();
      }
      catch(err){
        report('err during \'os\' listing',err);
        kv[method] = os[method];
      }
    });
    return kv;
  };

  this.msgform = function(title,user,content,misc)
  {
    if(misc){
      return JSON.stringify({'title':title,'user':user,'content':content,'misc':misc});
    }
    return JSON.stringify({'title':title,'user':user,'content':content});
  };
}
