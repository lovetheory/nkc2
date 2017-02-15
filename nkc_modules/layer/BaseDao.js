//query functions
//equivalent ORM-Layer
module.paths.push('./nkc_modules'); //enable require-ment for this path
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var queryfunc = require('query_functions');
var db = require('arangojs')(settings.arango.address);
db.useDatabase(settings.server.database_name);
var AQL = queryfunc.AQL;
module.exports = (function () {
    var BaseDao = (function () {
        function BaseDao(collection, key) {
            this.collection = collection;
            this.key = key;
        }
        BaseDao.prototype.load = function (collection, key) {
            var _this = this;
            this.collection = this.collection || collection;
            this.key = this.key || key;
            if (this.key && this.collection) {
                return db.collection(this.collection)
                    .document(this.key)
                    .then(function (doc) {
                    _this.model = doc;
                    return _this;
                });
            }
            throw 'key/collection not specified before load';
        };
        BaseDao.prototype.save = function (doc) {
            var _this = this;
            this.model = doc || this.model;
            this.model._key = this.model._key || this.key;
            return db.collection(this.collection)
                .save(this.model)
                .then(function (res) {
                _this.key = res._key;
                return _this;
            });
        };
        BaseDao.prototype.update = function (doc) {
            var _this = this;
            doc = doc || this.model;
            this.key = doc._key || this.key;
            //use model itself if doc not specified
            return db.collection(this.collection).update(this.key, doc)
                .then(function (res) {
                _this.model = Object.assign(_this.model || {}, doc);
                return _this;
            });
        };
        BaseDao.prototype.replace = function (doc) {
            var _this = this;
            doc._key = doc._key || this.key;
            return db.collection(this.collection).replace(doc, doc)
                .then(function (res) {
                _this.model = doc;
                return _this;
            });
        };
        BaseDao.prototype.remove = function (key) {
            key = key || this.key;
            return db.collection(this.collection).remove(key);
        };
        BaseDao.prototype.incrementProperty = function (propname) {
            return AQL("\n        let d = document(" + this.collection + ",@key)\n        update d with {@propname:d.@propname+1} in " + this.collection + "\n        return NEW[@propname]\n        ", {
                key: this.key,
                propname: propname,
            })
                .then(function (res) {
                report(propname + ' +1 = ' + res[0].toString());
                return res[0];
            });
        };
        return BaseDao;
    }());
    return BaseDao;
})();
