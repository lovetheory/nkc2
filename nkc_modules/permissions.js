var permissions = {};

//证书，每张证书将包含不同的权限
var certificates={
  god:{//cert name
    post:true,//perm name
    move:true,
    issue:true,
    modify:true,
  },

  moderator:{
    post:true,
    move:true,
    modify:true,
  },

  default:{ //by default given to every registered user
    post:true,
    self_modify:true,
    moveThread:true,
    removePost:true,
    testList:true,
  },

  specialist:{
    move:true,
  },

  visitor:{ //by default given to everybody
    viewThread:true,
    viewForum:true,
    viewHome:true,

  }

};

//certs is [] of permission names
permissions.getPermissionsFromCerts = (certsArray)=>{
  var permissionsOfCerts={};

  for(s in certsArray)
  {
    var permissionsOfCert = certificates[certsArray[s]];
    Object.assign(permissionsOfCerts,permissionsOfCert)
  }
  return permissionsOfCerts
};

module.exports = permissions;
