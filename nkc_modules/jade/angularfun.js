//angularfun.js

var myapp = angular.module('myapp',[]);
//define a module named myapp

//add one controller named myctrl
myapp.controller('myctrl',function($scope){
  //initiate a variable named yourname
  $scope.yourname = 'bien';
});
