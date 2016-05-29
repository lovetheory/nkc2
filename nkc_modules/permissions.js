module.paths.push('./nkc_modules'); //enable require-ment for this path

var operations = require('api_operations');
var table = operations.table;

var permissions = {};

//证书，每张证书将包含不同的权限
var certificates={
  dev:{
    display_name:'运维',
    inheritFrom:['moderator'],

    permittedOperations:operations.listAll(), //grandmaster
  },

  editor:{
    display_name:'编辑',
    inheritFrom:['moderator'],

    content_class:{
      administrative:true,
    },

    permittedOperations:{
      viewQuestions:true,
    }
  },

  moderator:{
    display_name:'版主',
    inheritFrom:['scholar'],

    content_class:{
      classified:true,
    },

    permittedOperations:{
      addThreadToCart:true,
      addPostToCart:true,

      removePost:true,
      moveThread:true,
    }
  },

  scholar:{ //学者，1学分为限。
    display_name:'学者',
    inheritFrom:['default'],

    content_class:{
      sensitive:true,
    },

    permittedOperations:{
    }
  },

  default:{
    display_name:'学生',
    inheritFrom:['visitor'],

    content_class:{
      regular:true,
    },
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
    content_class:{
      null:true,
    },
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
    display_name:'封禁',

    inheritFrom:['visitor'],
    permittedOperations:{
      viewExam:false,
    },
  },
};

//certs is [] of certificate names
var getPermissionsFromCerts = (certsArray)=>{
  var permittedOperations={};
  var content_class={};

  for(i in certsArray)
  {
    var certName = certsArray[i]
    var certificate = certificates[certName];

    if(!certificate)continue; //ignore undefined certificates

    //recursive inheritance.
    if(certificate.inheritFrom){
      var c = getPermissionsFromCerts(certificate.inheritFrom)

      Object.assign(permittedOperations,c.permittedOperations)
      Object.assign(content_class,c.content_class)
    }

    Object.assign(permittedOperations,certificate.permittedOperations)
    Object.assign(content_class,certificate.content_class)
  }
  return {
    permittedOperations,
    content_class,
  }
};

permissions.getPermissionsFromCerts = getPermissionsFromCerts

permissions.getPermissionsFromUser = function(user){
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
