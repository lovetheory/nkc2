let ipTries = {};

const incIpTry = ip => {
  if(ip in ipTries) {
    if(ipTries[ip] === 5) {
      throw `今天已经尝试5次，请明天再试`
    }
    ipTries[ip] ++;
    setTimeout(function(ip) {
      return function() {
        this.ipTries[ip] --;
      }
    }(ip), 86400000)
  }
  else {
    ipTries[ip] = 1
  }
};

module.exports = incIpTry;