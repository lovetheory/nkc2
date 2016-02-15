//证书，每张证书将包含不同的权限
exports.certifications={
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
exports.getpermissions = (certs)=>{
  var perm={};
  for(s in certs)
  {
    var cert = exports.certifications[certs[s]];
    for (var key in cert) {
      perm[key]=(perm[key]?perm[key]||cert[key]:cert[key]);
    }
  }
  return perm;
};
