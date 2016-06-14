//query functions
//equivalent ORM-Layer
module.paths.push('./nkc_modules'); //enable require-ment for this path

var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var queryfunc = require('query_functions')
var db = require('arangojs')(settings.arango.address);
db.useDatabase(settings.server.database_name);
var AQL = queryfunc.AQL

module.exports = (function(){
  'use strict';

  class BaseDao{
    constructor(collection,key){
      this.collection = collection
      this.key = key
    }

    load(collection,key){
      var self = this
      this.collection = this.collection||collection
      this.key = this.key||key

      if(this.key&&this.collection){
        return db.collection(this.collection)
        .document(this.key)
        .then(doc=>{
          this.model = doc
          return this
        })
      }
      throw 'key/collection not specified before load'
    }

    save(doc){
      this.model = doc||this.model
      this.model._key = this.model._key||this.key

      return db.collection(this.collection)
      .save(this.model)
      .then(res=>{
        this.key = res._key
        return this
      })
    }

    update(doc){
      doc = doc||this.model
      this.key = doc._key||this.key
      //use model itself if doc not specified
      return db.collection(this.collection).update(this.key,doc)
      .then(res=>{
        Object.assign(this.model,res)
        return this
      })
    }

    replace(doc){
      doc._key = doc._key||this.key
      return db.collection(this.collection).replace(doc,doc)
      .then(res=>{
        this.model = doc
        return this
      })
    }

    remove(key){
      key = key||this.key
      return db.collection(this.collection).remove(key)
    }

    incrementProperty(propname){
      return AQL(`
        let d = document(${this.collection},@key)
        update d with {@propname:d.@propname+1} in ${this.collection}
        return NEW[@propname]
        `,{
          key:this.key,
          propname,
        }
      )
      .then(res=>{
        report(propname + ' +1 = ' + res[0].toString())
        return res[0]
      })
    }
  }

  return BaseDao
})()
