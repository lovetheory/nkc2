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

table.subscribeUser = {
  operation: params => {
    let user = params.user;
    let subUid = params.subUid;
    return db.collection('users').document(subUid)
      .then(() => {
        return db.query(aql`
          UPSERT {_key: ${user._key}}
          INSERT {
            _key: ${user._key},
            subUsers: [${subUid}]
          }
          UPDATE {subUsers: PUSH(OLD.subUsers, ${subUid}, true)}
          IN usersSubscribe
        `)
      })
      .catch(e => {throw `user ${user._key} does not exist.`})
  }
};

table.subscribeForum = {
  operation: params => {
    let user = params.user;
    let subFid = params.subFid;
    return db.collection('forums').document(subFid)
      .then(() => {
        return db.query(aql`
          UPSERT {_key: ${user._key}}
          INSERT {
            _key: ${user._key},
            subForums: [${subFid}]
          }
          UPDATE {subForums: PUSH(OLD.subForums, ${subFid}, true)}
          IN usersSubscribe
        `)
      })
      .catch(e => {throw `forum ${subFid} does not exist`})
  }
};

module.exports = table;

/**
 * Created by lzszo on 2017/4/17.
 */
