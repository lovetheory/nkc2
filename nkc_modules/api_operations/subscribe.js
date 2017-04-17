let moment = require('moment');
let settings = require('../server_settings');
let queryFunc = require('../query_functions');
let validation = require('../validation');
let apiFunc = require('../api_functions');
let permissions = require('../permissions');
let operations = require('../api_operations');
let arango = require('arangojs');
let aql = arango.aql;
let db = arango(settings.arango);

let table = {};

table.subscribeUser = uid => {
  let
}

table.subscribeForum = fid => {

}



/**
 * Created by lzszo on 2017/4/17.
 */
