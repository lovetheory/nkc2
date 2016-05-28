module.paths.push('./nkc_modules'); //enable require-ment for this path

var operations = require('api_operations');
var table = operations.table;

var permissions = {};

//证书，每张证书将包含不同的权限
var certificates={
  dev:{
    permittedOperations:operations.listAll(), //grandmaster
  },

  editor:{
    inheritFrom:['moderator'],
    permittedOperations:{
      viewQuestions:true,
      viewClassifiedContent:true,
    }
  },

  moderator:{
    inheritFrom:['scholar'],

    permittedOperations:{
      addThreadToCart:true,
      addPostToCart:true,

      removePost:true,
      moveThread:true,


      viewClassifiedContent:true,
    }
  },

  scholar:{ //学者，1学分为限。
    inheritFrom:['default'],

    permittedOperations:{

      viewSensitiveContent:true,
    }
  },

  default:{
    inheritFrom:['visitor'],

    permittedOperations:{
      listCart:true,
      clearCart:true,
      postTo:true,
      getPost:true,

      viewExperimental:true,

      getResourceThumbnail:true,
      getResourceOfCurrentUser:true,
      getResource:true,
    },
  },

  visitor:{ //public
    permittedOperations:{
      viewThread:true,
      viewForum:true,
      viewHome:true,
      viewUserThreads:true,

      viewExam:true,
      submitExam:true,

      viewRegister:true,
      userRegister:true,

      userLogin:true,
      userLogout:true,
      viewLogout:true,
      viewLogin:true,
    }
  },

  banned:{
    inheritFrom:['visitor'],
    permittedOperations:{
      viewExam:false,
    }
  },
};

//certs is [] of certificate names
var getPermissionsFromCerts = (certsArray)=>{
  var permissionsOfCerts={};

  for(i in certsArray)
  {
    var certName = certsArray[i]
    var certificate = certificates[certName];

    if(!certificate)continue; //ignore undefined certificates

    //recursive inheritance.
    if(certificate.inheritFrom){
      Object.assign(permissionsOfCerts,getPermissionsFromCerts(certificate.inheritFrom))
    }

    Object.assign(permissionsOfCerts,certificate.permittedOperations)
  }
  return permissionsOfCerts
};

permissions.getPermissionsFromCerts = getPermissionsFromCerts

permissions.getPermissionListFromUser = function(user){
  if(!user)return getPermissionsFromCerts(['visitor'])
  if(!user.certs)return getPermissionsFromCerts(['default'])
  return getPermissionsFromCerts(user.certs)
}

permissions.listAllCertificates = ()=>{
  var all = []
  for(i in certificates){
    all.push(i)
  }
  return all;
}

module.exports = permissions;
