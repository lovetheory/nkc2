

var fs = require('fs-extra')
var Promisify = require('./promisify')


var nkc_fs = {}

nkc_fs.ensureDir = Promisify(fs.ensureDir)
nkc_fs.move = Promisify(fs.move)
nkc_fs.copy = Promisify(fs.copy)

nkc_fs.getExtensionFromFileName = function(originalName){
  if(!originalName)return null
  return originalName.split('.').length!==1?originalName.split('.').pop().toLowerCase():null
}

module.exports = nkc_fs
