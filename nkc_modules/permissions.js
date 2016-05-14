module.paths.push('./nkc_modules'); //enable require-ment for this path

var operations = require('api_experimental_operations');
var table = operations.table;

var permissions = {};

//证书，每张证书将包含不同的权限
var certificates={
  dev:operations.listAll(), //grandmaster

  moderator:{
    post:true,
    move:true,
    modify:true,
    addThreadToCart:true,
    addPostToCart:true,
    removePost:true,
  },

  default:{ //by default given to every registered user
    post:true,
    self_modify:true,
    testList:true,
    listCart:true,
    clearCart:true,
    postTo:true,
  },

  specialist:{
    move:true,
  },

  visitor:{ //by default given to everyone
    viewThread:true,
    viewForum:true,
    viewHome:true,

    viewExam:true,
    submitExam:true,

    viewRegister:true,
    userRegister:true,
  }
};

//certs is [] of permission names
permissions.getPermissionsFromCerts = (certsArray)=>{
  var permissionsOfCerts={};

  for(i in certsArray)
  {
    var permissionsOfCert = certificates[certsArray[i]];
    Object.assign(permissionsOfCerts,permissionsOfCert)
  }
  return permissionsOfCerts
};

permissions.listAllCertificates = ()=>{
  var all = []
  for(i in certificates){
    all.push(i)
  }
  return all;
}

module.exports = permissions;
