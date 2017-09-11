//rename this file to private_settings.js and fill up correct params,put it in the same path
let settings = {};

settings.arango={
  url: 'http://username:password@arangodb_server_address:port',
  databaseName: 'db_name',    //数据库名称
  agentOptions: {
    maxSockets: 50,
    keepAlive: true,
    keepAliveMsecs: 1000
  },
  arangoVersion: 30000  //if u r using v2.8.x change it to 20800
};

module.exports = settings;