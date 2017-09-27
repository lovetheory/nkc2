const permissions = require('../permissions');
const queryFunc = require('../query_functions');
const aql = queryFunc.getAql();
const db = queryFunc.getDB();
const operationScoreHandler = require('../score_handler').operationScoreHandler;

let table = {};

table.subscribeUser = {
  operation: params => {
    let user = params.user;
    let subUid = params.targetUid;
    console.log(params._req.connection.remoteAddress + ':' + params._req.connection.remotePort)
    return db.collection('users').document(subUid)
      .then(() => {
        return db.query(aql`
          UPSERT {_key: ${user._key}}
          INSERT {
            _key: ${user._key},
            subscribeUsers: [${subUid}]
          }
          UPDATE {subscribeUsers: PUSH(OLD.subscribeUsers, ${subUid}, true)}
          IN usersSubscribe
        `)
      })
      .then(() => db.query(aql`
        UPSERT {_key: ${subUid}}
        INSERT {
          _key: ${subUid},
          subscribers: [${user._key}]
        }
        UPDATE {subscribers: PUSH(OLD.subscribers || [], ${user._key}, true)}
        IN usersSubscribe
      `))
      .then(() => operationScoreHandler({
        address: params._req.iptrim,
        port: params._req.connection.remotePort,
        operation: 'subscribeUser',
        from: user._key,
        to: subUid,
        timeStamp: Date.now(),
        parameters: {
          targetKey: 'm/' + user._key
        }
      }))
      .catch(e => {throw `user ${user._key} does not exist.`})
  }
};

table.unsubscribeUser = {
  operation: params => {
    let user = params.user;
    let unSubUid = params.targetUid;
    return db.query(aql`
      LET o = DOCUMENT(usersSubscribe, ${user._key})
        UPDATE o WITH {
          subscribeUsers: REMOVE_VALUE(o.subscribeUsers, ${unSubUid})
        } IN usersSubscribe
    `)
      .then(() => db.query(aql`
        LET o = DOCUMENT(usersSubscribe, ${unSubUid})
        UPDATE o WITH {
          subscribers: REMOVE_VALUE(o.subscribers, ${user._key})
        } IN usersSubscribe
      `))
      .then(() => operationScoreHandler({
        address: params._req.iptrim,
        port: params._req.connection.remotePort,
        operation: 'unsubscribeUser',
        from: user._key,
        to: unSubUid,
        timeStamp: Date.now(),
        parameters: {
          targetKey: 'm/' + user._key
        }
      }))
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

table.unsubscribeForum = {
  operation: params => {
    let user = params.user;
    let unSubFid = params.unSubFid;
    return db.query(aql`
      UPDATE DOCUMENT(usersSubscribe, ${user._key}) WITH {
        subForums: REMOVE_VALUE(OLD.subForums, ${unSubFid})
      }
    `)
  }
};

module.exports = table;

/**
 * Created by lzszo on 2017/4/17.
 */
