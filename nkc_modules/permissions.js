var permissions = {};

//证书，每张证书将包含不同的权限
permissions.certificates={
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

  'default':{
    post:true,
    self_modify:true,
  },

  specialist:{
    move:true,
  },

};

//certs is [] of permission names
permissions.getpermissions = (certs)=>{
  var perm={};
  for(s in certs)
  {
    var cert = exports.certificates[certs[s]];
    for (key in cert) {
      perm[key]=(perm[key]?perm[key]||cert[key]:cert[key]);
    }
  }
  return perm;
};

module.exports = permissions;
