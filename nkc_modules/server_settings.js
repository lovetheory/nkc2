exports.server={
  name:"nkc Development Server",
  port:1086,
  address:'',
  github:'https://github.com/ctmakro/nkc2',
};

exports.jadeoptions= {
  pretty:true,
  cache:false,
  //cache:true,
  //globals:[]
  server:exports.server,
};

exports.arango={
  address:'http://127.0.0.1:8529'
};

exports.couchdb={
  address:"127.0.0.1",
  port:5984
};
