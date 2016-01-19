//angularfun.js

var myapp = angular.module('myapp',['be_included']);
//define a module named myapp

//add one controller named myctrl
myapp.controller('myctrl',['myfac',function(myfac){
  //initiate a variable named yourname
  this.yourname = 'somename';

  var counter =1;
  this.bclick = function(){
    counter = myfac.by2(counter);
    this.nicelist.push(
      counter.toString()
      +' japanese'
    );
  };

  this.reverse=function(){
    this.nicelist.reverse();
  }

  this.sort=()=>{
    this.nicelist.sort();
  }

  //remove from array at index
  this.kill = function(index){
    this.nicelist.splice(index,1);
  }

  //append
  this.append = (row)=>{
    counter = myfac.by2(counter);
    this.nicelist.push(
      counter.toString()+" "+row);
  }

  this.nicelist=['italian'];
  this.nicelist.push('german');
  this.nicelist.push('chinese');
}]);
