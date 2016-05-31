module.paths.push('./nkc_modules'); //enable require-ment for this path

var operations = require('api_operations');
var table = operations.table;

var permissions = {};

//证书，每张证书将包含不同的权限
var certificates={
  dev:{
    display_name:'运维',
    inheritFrom:['moderator'],

    // see end of api_operations.js
  },

  editor:{
    display_name:'编辑',
    inheritFrom:['moderator'],

    contentClasses:{
      administrative:true,
    },

    permittedOperations:{
      viewQuestions:true,

      elseModifyTimeLimit:86400000*365*20, //20y
      selfModifyTimeLimit:86400000*365*20, //20y
    }
  },

  moderator:{
    display_name:'版主',
    inheritFrom:['scholar','examinated'],

    contentClasses:{
      classified:true,
    },

    permittedOperations:{
      addThreadToCart:true,
      addPostToCart:true,
      selfModifyTimeLimit:86400000*365*2, //3y
      elseModifyTimeLimit:86400000*365, //1y

      removePost:true,
      moveThread:true,
    }
  },

  scholar:{ //学者，1学分为限。
    display_name:'学者',
    inheritFrom:['examinated'],

    contentClasses:{
      sensitive:true,
    },

    permittedOperations:{
      selfModifyTimeLimit:60000*60*24,//24h
    }
  },

  examinated:{
    display_name:'状元',
    inheritFrom:['default'],
    contentClasses:{

    },
    permittedOperations:{
      postTo:true,
      testExaminated:true,
      selfModifyTimeLimit:60*60000, //1h
    }
  },

  default:{ //default cert every user share
    display_name:'学生',
    inheritFrom:['visitor'],

    contentClasses:{
      images:true,
      non_images:true,
      non_public:true,
    },
    permittedOperations:{

      listCart:true,
      clearCart:true,

      postTo:true, //////////////////////////////////// may cancel in the future
      viewEditor:true,
      selfModifyTimeLimit:30*60000, //30min

      getPost:true,

      viewExperimental:true,
      viewMe:true,

      userLogout:true,
      viewLogout:true,

      userRegister:false,

      getResourceOfCurrentUser:true,
    },
  },

  visitor:{ //public
    contentClasses:{
      null:true,
      images:true,
      non_images:false,
      non_public:false,
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
      viewLogin:true,

      getResourceThumbnail:true,
      getResource:true,
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
  var contentClasses={};

  for(i in certsArray)
  {
    var certName = certsArray[i]
    var certificate = certificates[certName];

    if(!certificate)continue; //ignore undefined certificates

    //recursive inheritance.
    if(certificate.inheritFrom){
      var c = getPermissionsFromCerts(certificate.inheritFrom)

      Object.assign(permittedOperations,c.permittedOperations)
      Object.assign(contentClasses,c.contentClasses)
    }

    Object.assign(permittedOperations,certificate.permittedOperations)
    Object.assign(contentClasses,certificate.contentClasses)
  }
  return {
    permittedOperations,
    contentClasses,
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

permissions.testModifyTimeLimit = function(params,ownership,toc){
  //--test ownership--
  if(ownership){
    // if he own the post
    if(Date.now() < toc + params.permittedOperations.selfModifyTimeLimit||0){
      //not exceeding
    }else{
      throw('You can only modify your post within '+ (params.permittedOperations.selfModifyTimeLimit/1000/60).toFixed(2) + ' hour(s)')
    }
  }else{
    if(Date.now() < toc + params.permittedOperations.elseModifyTimeLimit||0){
      //not exceeding
    }else{
      throw('You can only modify others\' post within '+ (params.permittedOperations.elseModifyTimeLimit/1000/60).toFixed(2) + ' hour(s)')
    }
  }
}

permissions.certificates = certificates
module.exports = permissions;
