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

    permittedOperations:{
      deleteElseQuestions:true,
    },
    // see end of api_operations.js
  },

  editor:{
    display_name:'编辑',
    inheritFrom:['senior_moderator'],

    contentClasses:{
      administrative:true,
    },

    permittedOperations:{

      viewQuestions:true,
      addQuestion:true,
      deleteQuestion:true,
      getQuestion:true,

      listAllQuestions:true, //important, with this you can modify categories of questions

      elseModifyTimeLimit:timeYear*20, //20y
      selfModifyTimeLimit:timeYear*20, //20y

      toggleDigestAllThreads:true,
      toggleToppedAllThreads:true,
      kamikaze:true,
    }
  },

  qc:{
    display_name:'题委',

    permittedOperations:{
      viewQuestions:true,

      addQuestion:true,

      getQuestion:true,
    }
  },

  senior_moderator:{
    display_name:'责任版主',
    inheritFrom:['moderator'],

    permittedOperations:{
      moveAllThreads:true,
      toggleAllPosts:true,
    }
  },

  moderator:{
    display_name:'版主',
    inheritFrom:['scholar'],

    contentClasses:{
      classified:true,
    },

    permittedOperations:{
      addThreadToCart:true,
      addPostToCart:true,
      setDigest:true,

      selfModifyTimeLimit:timeYear*20, //3y
      elseModifyTimeLimit:timeYear*20, //1y

      viewExperimental:true,

      disablePost:true,
      enablePost:true,

      toggleOwnedPosts:true,
      toggleDigestOwnedThreads:true,
      toggleToppedOwnedThreads:true,

      moveThread:true,
      moveOwnedThreads:true,


      pullNewPosts24h:true,
      setTopped:true
    }
  },

  scholar:{ //学者，1学分为限。
    display_name:'学者',
    inheritFrom:['examinated','qc'],

    contentClasses:{
      sensitive:true,
    },

    permittedOperations:{
      selfModifyTimeLimit:timeHour*24,//24h

      viewPostHistory:true,
    }
  },

  examinated:{
    display_name:'状元',
    inheritFrom:['default'],
    contentClasses:{
      sensitive:true,
    },
    permittedOperations:{
      postTo:true,
      getPostContent:true,
      testExaminated:true,
      selfModifyTimeLimit:timeHour*3, //1h
    }
  },

  default:{ //default cert every user share
    display_name:'会员',
    inheritFrom:['visitor'],

    contentClasses:{
      images:true,
      non_images:true,
      non_public:true,
    },
    permittedOperations:{

      viewSMS:true,
      sendShortMessageByUsername:true,

      listCart:true,
      clearCart:true,

      //postTo:true, //////////////////////////////////// may cancel in the future
      //getPostContent:true,/////////////////////////////

      selfModifyTimeLimit:timeHour*0.5, //30min

      getPost:true,

      viewMe:true,

      userLogout:true,
      viewLogout:true,

      userRegister:false,

      getResourceOfCurrentUser:true,

      changePassword:true,
      viewPersonal:true,

      submitPersonalSetting:true,

      viewSelf:true,

      addThreadToCollection:true,
      listMyCollectionOfCategory:true,
      listMyCategories:true,
      removeCollectionItem:true,
      moveCollectionItemToCategory:true,
    },
  },

  visitor:{ //public
    display_name:'陆游',
    contentClasses:{
      null:true,
      images:true,
      non_images:false,
      non_public:false,
    },
    permittedOperations:{
      viewEditor:true,
      viewThread:true,
      viewForum:true,
      viewHome:true,
      viewUser:true,
      viewUserThreads:true, ////////////////these are for test purpose only
      //move to visitor afterwards

      useSearch:true,

      viewExam:true,
      submitExam:true,

      viewRegister:true,
      userRegister:true,

      userLogin:true,
      viewLogin:true,

      viewPanorama:true,
      viewCollectionOfUser:true,

      getResourceThumbnail:true,
      getResource:true,

      exampleOperation:true,

      getGalleryRecent:true,

      viewPage:true,
    }
  },

  banned:{
    display_name:'作死',
    inheritFrom:['visitor'],

    contentClasses:{
      non_public:false,
      non_images:false,
      non_public:false,
    },
    submitPersonalSetting:false,
    permittedOperations:{
      postTo:false,
      viewExam:false,
      submitExam:false,
      viewMe:true,
    },
  },
};

function getDisplayNameOfCert(cert){
  return (certificates[cert]?certificates[cert].display_name:'')
}
permissions.getDisplayNameOfCert = getDisplayNameOfCert

//certs is [] of certificate names
var getPermissionsFromCerts = (certsArray)=>{
  var permittedOperations={};
  var contentClasses={};

  if(certsArray.indexOf('banned')>=0){
    certsArray = ['banned'];
  }

  for(i in certsArray)
  {
    var certName = certsArray[i]
    //local ver of permittedOperations and contentClasses
    var lpo = {}
    var lcc = {}

    var certificate = certificates[certName];

    if(!certificate)continue; //ignore undefined certificates

    //recursive inheritance.
    if(certificate.inheritFrom){
      var c = getPermissionsFromCerts(certificate.inheritFrom)

      Object.assign(lpo,c.permittedOperations)
      Object.assign(lcc,c.contentClasses)
    }

    Object.assign(lpo,certificate.permittedOperations)
    Object.assign(lcc,certificate.contentClasses)

    //obj assign equivalent
    for(name in lpo){
      if((typeof permittedOperations[name]) == 'number'){

        permittedOperations[name] =
        Math.max(permittedOperations[name] ,lpo[name])

        //obtain max of numbers, if is number.
      }
      else{
        permittedOperations[name] = lpo[name]
      }
    }

    Object.assign(contentClasses,lcc)
  }

  if(contentClasses['null']){
    contentClasses['']=true
  }
  return {
    permittedOperations,
    contentClasses,
  }
};

permissions.getPermissionsFromCerts = getPermissionsFromCerts

permissions.getPermissionsFromUser = function(user){
  var certs = calculateThenConcatCerts(user)
  return getPermissionsFromCerts(certs)
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

var calculateThenConcatCerts = function(user){
  if(!user)return ['visitor']

  if(!user.certs){
    user.certs =  ['default']
  }

  var certs = [].concat(user.certs)
  //-----------------------below are calculated permissions
  if(user.xsf > 0){
    certs.push('scholar')
  }

  return certs
}

permissions.calculateThenConcatCerts = calculateThenConcatCerts

permissions.certificates = certificates
module.exports = permissions;
