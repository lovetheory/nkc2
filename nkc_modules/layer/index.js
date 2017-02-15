var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
//query functions
//equivalent ORM-Layer
module.paths.push('./nkc_modules'); //enable require-ment for this path
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var queryfunc = require('query_functions');
var apifunc = require('api_functions');
var validation = require('validation');
var rs = require('random-seed');
var AQL = queryfunc.AQL;
var db = require('arangojs')(settings.arango.address);
db.useDatabase(settings.server.database_name);
var permission = require('permissions');
var crypto = require('crypto');
var BaseDao = require('./BaseDao');


var layer = (function () {
    var layer = {};
    var ShortMessage = (function (_super) {
        __extends(ShortMessage, _super);
        function ShortMessage(key) {
            _super.call(this, 'sms', key);
        }
        ShortMessage.prototype.send = function (msgbody) {
            var msg = {
                s: msgbody.sender,
                r: msgbody.receiver,
                c: msgbody.content,
                ip: msgbody.ip,
                toc: Date.now(),
            };
            return this.save(msg);
        };
        return ShortMessage;
    }(BaseDao));

    var Personal = (function (_super) {
        __extends(Personal, _super);
        function Personal(key) {
            _super.call(this, 'users_personal', key);
        }
        return Personal;
    }(BaseDao));

    var User = (function (_super) {
        __extends(User, _super);
        function User(key) {
            _super.call(this, 'users', key);
        }
        User.prototype.loadByName = function (username) {
            var _this = this;
            return apifunc.get_user_by_name(username)
                .then(function (reslist) {
                if (reslist.length == 0)
                    throw '没有找到用户名';
                _this.model = reslist[0];
                //console.log(_this.model)
                return _this;
            });
        };
        User.prototype.getPermissions = function () {
            if (!this.permissions) {
                this.permissions = permission.getPermissionsFromUser(this.model);
            }
            return this.permissions;
        };
        User.prototype.listForums = function () {
            var perm = this.getPermissions();
            var contentClasses = perm.contentClasses;
            return AQL("\n        for f in forums\n        filter f.type == 'forum' && f.parentid !=null\n\n        let class = f.class\n        filter has(@contentClasses,TO_STRING(class)) /*content ctrl*/\n\n        let nf = f\n\n        collect parent = nf.parentid into forumgroup = nf\n        let parentforum = document(forums,parent)\n\n        let class = parentforum.class\n\n        filter has(@contentClasses,TO_STRING(class)) /*content ctrl*/\n\n        let group =  {parentforum,forumgroup}\n        sort group.parentforum.order asc\n        return group\n        ", { contentClasses: contentClasses });
        };
        return User;
    }(BaseDao));
    var Forum = (function (_super) {
        __extends(Forum, _super);
        function Forum(key) {
            _super.call(this, 'forums', key);
        }
        Forum.buildIndex = function () {
            return queryfunc.createIndex('threads', {
                fields: ['fid', 'disabled', 'tlm'],
                type: 'skiplist',
                unique: 'false',
                sparse: 'false',
            });
        };
        Forum.prototype.inheritPropertyFromParent = function () {
            var _this = this;
            var p = this.model;
            var parent;
            return Promise.resolve()
                .then(function () {
                if (!p.parentid || p.parentid == '0')
                    throw 'parent not exist';
                parent = new Forum(p.parentid);
                return parent.load();
            })
                .then(function (parent) {
                return parent.inheritPropertyFromParent(); //recursive inheritance
            })
                .then(function (parent) {
                var parent = parent.model;
                p.class = p.class || parent.class;
                p.color = p.color || parent.color;
                p.moderators = parent.moderators.concat(p.moderators || []);
                return _this;
            })
                .catch(function (err) {
                if (development) {
                    if (err !== 'parent not exist') {
                        report('parent load failed on ' + p._key, err);
                    }
                }
                //if no parent or parent not found
                p.class = p.class || null;
                p.color = p.color || '#bbb';
                p.moderators = p.moderators || [];
                return _this;
            });
        };
        Forum.prototype.testModerator = function (username) {
            var forum = this.model;
            if (!forum.moderators || forum.moderators.length == 0)
                throw '此版似乎未设定版主';
            if (forum.moderators.indexOf(username) >= 0) {
                //if user exists as moderator for the forum
                return true;
            }
            throw '你不是该版版主。';
        };
        Forum.prototype.testView = function (contentClasses) {
            var forum = this.model;
            if (!forum.class)
                return this;
            if (contentClasses[forum.class]) {
                return this;
            }
            else {
                throw "\u6D4F\u89C8\u6743\u9650\u4E0D\u8DB3. \u8981\u6D4F\u89C8\u8FD9\u90E8\u5206\u5185\u5BB9 (\u4F4D\u4E8E\uFF1A" + forum.display_name + ")\uFF0C\u4F60\u9700\u8981\u4E00\u4E2A\u53EB\u505A [" + forum.class + "] \u7684\u6743\u9650\u7EA7\u522B. \u53EF\u5C1D\u8BD5\u767B\u9646\u6216\u8005\u6CE8\u518C\u4E00\u4E2A\u8D26\u53F7. \u76EE\u524D\u4F60\u62E5\u6709[" + Object.keys(contentClasses).filter(function (i) { return contentClasses[i]; }).join(',') + "]\u6743\u9650\u7EA7\u522B\u3002";
            }
        };
        Forum.prototype.listThreadsOfPage = function (params) {
            var _this = this;
            if (params.digest) {
                var filter = "\n        filter t.fid == @fid && t.digest == true\n        sort t.fid desc, t.digest desc, t.tlm desc\n        ";
            }
            else {
                var filter = "\n        filter t.fid == @fid && t.disabled==null\n        sort t.fid desc, t.disabled desc, t.tlm desc\n        ";
            }
            var sortbywhattime = params.sortby ? 'toc' : 'tlm';
            var filter = "\n      filter t.fid == @fid\n\n      " + (params.cat ? '&& t.cid == @cat' : '') + "\n      " + (params.digest ? '&& t.digest==true' : '') + "\n\n      sort\n      t.fid desc,\n\n      " + (params.digest ? 't.digest desc,' : '') + "\n      t." + sortbywhattime + " desc\n      ";
            var count_result;
            return AQL("\n        for t in threads\n        " + filter + "\n        collect with count into k\n        return k\n        ", {
                fid: this.key,
                cat: params.cat || undefined,
            })
                .then(function (res) {
                count_result = res[0];
                var p = new Paging(params.page);
                var paging = p.getPagingParams(count_result);
                return AQL("\n          for t in threads\n          " + filter + "\n          limit @start,@count\n\n          let oc = document(posts,t.oc)\n          let lm = document(posts,t.lm)\n          let ocuser = document(users,oc.uid)\n          let lmuser = document(users,lm.uid)\n\n          return merge(t,{oc,ocuser,lmuser})\n\n          ", {
                    fid: _this.key,
                    start: paging.start,
                    count: paging.count,
                    cat: params.cat || undefined,
                })
                    .then(function (threads) {
                    threads.count = count_result;
                    threads.paging = paging;
                    return threads;
                });
            });
        };
        return Forum;
    }(BaseDao));
    var Paging = (function () {
        function Paging(pagestr) {
            function getPageFromString(pagestr) {
                if (pagestr) {
                    var page = parseInt(pagestr);
                    if (page === NaN)
                        page = 0;
                }
                else {
                    var page = 0;
                }
                return page;
            }
            this.page = getPageFromString(pagestr);
        }
        Paging.prototype.getPagingParams = function (total_items) {
            var page = this.page;
            var perpage = settings.paging.perpage;
            var start = page * perpage;
            var count = perpage;
            var pagecount = total_items ? Math.floor((total_items - 1) / perpage) + 1 : null;
            var paging = {
                page: page,
                perpage: perpage,
                start: start,
                count: count,
                pagecount: pagecount,
            };
            return paging;
        };
        return Paging;
    }());
    var Thread = (function (_super) {
        __extends(Thread, _super);
        function Thread(key) {
            _super.call(this, 'threads', key);
        }
        Thread.buildIndex = function () {
            return queryfunc.createIndex('posts', {
                fields: ['tid', 'toc'],
                type: 'skiplist',
                unique: 'false',
                sparse: 'false',
            })
                .then(function () {
                return queryfunc.createIndex('resources', {
                    fields: ['pid'],
                    type: 'hash',
                    unique: 'false',
                    sparse: 'false',
                });
            });
        };
        Thread.prototype.loadForum = function () {
            var t = this.model;
            var f = new Forum(t.fid);
            return f.load()
                .then(function (res) {
                return f.inheritPropertyFromParent();
            });
        };
        Thread.prototype.getPagingParams = function (pagestr) {
            var p = new Paging(pagestr);
            var t = this.model;
            return p.getPagingParams(t.count);
        };
        Thread.prototype.listPostsOfPage = function (pagestr) {
            var pp = this.getPagingParams(pagestr);
            var start = pp.start;
            var count = pp.count;
            var tid = this.key;
            return AQL("\n        for p in posts\n        sort p.tid asc, p.toc asc\n        filter p.tid == @tid\n\n        limit @start,@count\n\n        let user = document(users,p.uid)\n\n        let resources_declared = (\n          filter is_array(p.r)\n          for r in p.r\n          let rd = document(resources,r)\n          filter rd!=null\n          return rd\n        )\n\n        let resources_assigned = (\n          for r in resources\n          filter r.pid == p._key\n          return r\n        )\n\n        return merge(p,{\n          user,\n          r:union_distinct(resources_declared,resources_assigned)\n        })\n\n        ", {
                tid: this.key,
                start: start,
                count: count,
            });
        };
        Thread.prototype.testView = function (contentClasses) {
            var _this = this;
            var f = new Forum(this.model.fid);
            return f.load()
                .then(function (f) {
                return f.testView(contentClasses);
            })
                .then(function (f) {
                return _this;
            });
        };
        Thread.prototype.mergeOc = function () {
            var _this = this;
            var t = this.model;
            var oc = new Post(t.oc);
            return oc.load()
                .then(function (p) {
                t.oc = p.model;
                return _this;
            });
        };
        Thread.prototype.accumulateCountHit = function () {
            return this.incrementProperty('hits');
        };
        return Thread;
    }(BaseDao));
    var Post = (function (_super) {
        __extends(Post, _super);
        function Post(key) {
            _super.call(this, 'posts', key);
        }
        Post.prototype.mergeUsername = function () {
            var _this = this;
            var u = new User(this.model.uid);
            return u.load()
                .then(function (u) {
                _this.model.username = u.model.username;
                return _this;
            });
        };
        Post.prototype.loadThread = function () {
            var p = this.model;
            var t = new Thread(p.tid);
            return t.load();
        };
        Post.prototype.testView = function (contentClasses) {
            var _this = this;
            var tid = this.model.tid;
            var t = new Thread(tid);
            return t.load()
                .then(function (t) {
                return t.testView(contentClasses);
            })
                .then(function (t) {
                return _this;
            });
        };
        Post.prototype.loadForum = function () {
            return this.loadThread()
                .then(function (thread) {
                return thread.loadForum();
            });
        };
        Post.prototype.mergeResources = function () {
            var _this = this;
            return AQL("\n        let p = document(posts,@pid)\n\n        let user = document(users,p.uid)\n\n        let resources_declared = (\n          filter is_array(p.r)\n          for r in p.r\n          let rd = document(resources,r)\n          filter rd!=null\n          return rd\n        )\n\n        let resources_assigned = (\n          for r in resources\n          filter r.pid == p._key\n          return r\n        )\n\n        return merge(p,{user,\n          r:union_distinct(resources_declared,resources_assigned)\n        })\n        ", { pid: this.key })
                .then(function (res) {
                _this.model = res[0];
                return _this;
            });
        };
        return Post;
    }(BaseDao));
    var Question = (function (_super) {
        __extends(Question, _super);
        function Question(key) {
            _super.call(this, 'questions', key);
        }
        Question.create = function (qobject) {
            var q = new Question();
            q.model = qobject;
            return q;
        };
        Question.listAllQuestions = function (uid, showcount) {
            if (uid) {
                return AQL("\n          for q in questions filter q.uid==@uid sort q.toc desc let user = document(users,q.uid)\n          " + (showcount ? 'limit ' + showcount : '') + "\n          return merge(q,{user})\n          ", { uid: uid });
            }
            else {
                //if uid === null
                return AQL("\n          for q in questions sort q.toc desc let user = document(users,q.uid)\n          " + (showcount ? 'limit ' + showcount : '') + "\n          return merge(q,{user})\n          ");
            }
        };
        Question.listAllQuestionsOfCategory = function (catstr, showcount) {
            return AQL("\n        for q in questions filter q.category == @catstr\n        sort q.toc desc let user = document(users,q.uid)\n\n        " + (showcount ? 'limit ' + showcount : '') + "\n        return merge(q,{user})\n        ", { catstr: catstr });
        };
        Question.getQuestionCount = function () {
            return AQL("for q in questions collect with count into k return k")
                .then(function (res) {
                return res[0];
            });
        };
        Question.randomlyListQuestionsOfCategory = function (category, count, seed) {
            category = category || null;
            //1. get totalcount of questions
            return AQL("for q in questions filter q.category == @cat collect with count into k return k", { cat: category })
                .then(function (res) {
                var totalcount = res[0];
                if (totalcount < count)
                    throw 'not enough questions within this category';
                var rand = rs.create(seed);
                var rarr = [];
                for (var i = 0; i < count; i++) {
                    while (1) {
                        var r = Math.floor(rand.random() * totalcount); //random int btween 0 and qlen
                        if (rarr.indexOf(r) < 0) {
                            rarr.push(r);
                            break;
                        }
                    }
                }
                var qarr = [];
                var parr = [];
                for (i in rarr) {
                    var number = rarr[i];
                    parr.push(AQL("for q in questions filter q.category == @cat limit @number,1 return q", { cat: category, number: number }).then(function (res) {
                        var q = res[0];
                        qarr.push(q);
                    }));
                }
                return Promise.all(parr)
                    .then(function () {
                    return qarr;
                });
            });
        };
        return Question;
    }(BaseDao));
    var RegCode = (function () {
        function RegCode() {
        }
        RegCode.generate = function () {
            return new Promise(function (resolve, reject) {
                crypto.randomBytes(16, function (err, buffer) {
                    if (err)
                        return reject(err);
                    resolve(buffer);
                });
            })
                .then(function (buffer) {
                return buffer.toString('hex');
            });
        };
        return RegCode;
    }());
    var Collection = (function (_super) {
        __extends(Collection, _super);
        function Collection(key) {
            _super.call(this, 'collections', key);
        }
        return Collection;
    }(BaseDao));
    layer.Collection = Collection;
    layer.RegCode = RegCode;
    layer.Post = Post;
    layer.User = User;
    layer.Personal = Personal;
    layer.Forum = Forum;
    layer.Thread = Thread;
    layer.BaseDao = BaseDao;
    layer.ShortMessage = ShortMessage;
    layer.Paging = Paging;
    layer.Question = Question;
    return layer;
})();
module.exports = layer;
