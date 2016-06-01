module.paths.push('./nkc_modules'); //enable require-ment for this path

var operations = require('api_operations');
var table = operations.table;

var permissions = {};

var timeHour = 3600*1000;
var timeDay = timeHour*24;
var timeMonth = timeDay*30;
var timeYear = timeDay*365

//证书，每张证书将包含不同的权限
var certificates={
  dev:{
    display_name:'运维',
    inheritFrom:['editor'],

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

      elseModifyTimeLimit:timeYear*20, //20y
      selfModifyTimeLimit:timeYear*20, //20y
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
      setDigest:true,

      selfModifyTimeLimit:timeYear*3, //3y
      elseModifyTimeLimit:timeYear*1, //1y

      viewExperimental:true,

      disablePost:true,
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
      selfModifyTimeLimit:timeHour*24,//24h
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
      selfModifyTimeLimit:timeHour*1, //1h
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

      selfModifyTimeLimit:timeHour*0.5, //30min

      getPost:true,

      viewMe:true,

      userLogout:true,
      viewLogout:true,

      userRegister:false,

      getResourceOfCurrentUser:true,

      viewEditor:true,
      viewThread:true,
      viewForum:true,
      viewHome:true,
      viewUserThreads:true, ////////////////these are for test purpose only
      //move to visitor afterwards



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

      useSearch:true,

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

    contentClasses:{
      non_public:false,
      non_images:false,
      non_public:false,
    },

    permittedOperations:{
      postTo:false,
      viewExam:false,
      submitExam:false,
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

  if(!user.certs){
    user.certs =  ['default']
  }

  user.certs = calculateThenConcatCerts(user)
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

  var smtl = params.permittedOperations.selfModifyTimeLimit
  var emtl = params.permittedOperations.elseModifyTimeLimit

  smtl = smtl||0
  emtl = emtl||0

  // if you can modify others in 1y,
  // you should be able to do that to yourself,
  // regardless of settings.
  if(smtl<emtl){
    smtl = emtl
  }

  //--test ownership--
  if(ownership){
    // if he own the post
    if(Date.now() < toc + smtl){
      //not exceeding
    }else{
      throw('You can only modify your post within '+ (smtl/1000/60).toFixed(2) + ' hour(s)')
    }
  }else{
    if(Date.now() < toc + emtl){
      //not exceeding
    }else{
      throw('You can only modify others\' post within '+ (emtl/1000/60).toFixed(2) + ' hour(s)')
    }
  }
}

var calculateThenConcatCerts = function(userobj){
  var u = userobj
  var certs = u.certs||['default']

  if(u.xsf > 0){
    certs = ['scholar'].concat(certs)
    //so that assigned certs can override calculated certs.
  }

  return certs
}

permissions.calculateThenConcatCerts = calculateThenConcatCerts

permissions.certificates = certificates
module.exports = permissions;
