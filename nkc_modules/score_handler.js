const scoreMap = require('./server_settings').user.scoreMap;
const queryFunc = require('./query_functions');
const db = queryFunc.getDB();
const aql = queryFunc.getAql();

/*
* @params: Object {
*   operation: String: which operation is user doing, should be one of scoreMap attribute
*   from: String: the one who is now operating
*   to: String: the one who is being operated
*   timeStamp: Date {}
*   parameters: Object: key params of the operation
* }
* */
const operationScoreHandler = params => {
  const operation = params.operation;
  const from = params.from;
  const to = params.to;
  const address = params.address;
  const port = params.port;
  const timeStamp = params.timeStamp;
  const parameters = params.parameters;
  const isManageOp = params.isManageOp || false;
  let scoreChange = 0;
  let attrChange;
  if(scoreMap.hasOwnProperty(operation)) {
    let attr = scoreMap[operation];
    scoreChange = attr.scoreChange;
    attrChange = attr.attrChange;
  }
  return db.collection('behaviorLogs').save({
    isManageOp,
    operation,
    from,
    to,
    address,
    port,
    scoreChange,
    attrChange,
    timeStamp,
    parameters
  })
    .then(() => {
      const name = attrChange.name;
      const change = attrChange.change;
      if (name && change !== 0) {
        return db.query(aql`
          let user = document(users, ${to})
          let score = user.score + ${scoreChange}
          update user with {
            score,
            ${name}: user.${name} + ${change}
          } in users
        `)
      }
      return
    })
    .catch(e => {
      throw e
    })
};

module.exports = {
  operationScoreHandler
};