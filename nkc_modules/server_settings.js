exports.server={
  name:"nkc Development Server",
  port:1080,
  address:''
};

exports.jadeoptions= {
  pretty:true,
  cache:false,
  //globals:[]
  servername:exports.server.name
};

exports.arango={
  address:'http://127.0.0.1:8529'
};

exports.couchdb={
  address:"127.0.0.1",
  port:5984
};
