var context = require('./elastic.js')

var repl = require('repl')
var r = repl.start('ed> ')
r.context = Object.assign(r.context,context)
