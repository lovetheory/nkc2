$(function() {
  var easyPost = new EasyPost();
  easyPost.init();
});

var EasyPost = function() {
  this.parents = geid('parents');
  this.children = geid('children');
  this.post = geid('post');
  this.title = geid('title');
  this.content = geid('content');
  this.onlyM = geid('onlyM');
  this.postController = geid('postController');
  this.easyPost = geid('easyPost');
};
EasyPost.prototype.init = function() {
  var self = this;
  var path = window.location.pathname.match(/^\/(.)\/([0-9]+)/);
  if(path && path[1] === 'm') {
    this.parents.style.display = 'none';
    this.children.style.display = 'none';
    this.type = 'm';
    this.id = path[2];
  }
  else {
    nkcAPI('getForumsList', {})
      .then(function(result) {
        self.uid = result.uid;
        self.type = 'f';
        if(path && path[1] === 'f') {
          self.id = path[2];
        }
        return groupingForums(result.forumsList, self);
      })
      .then(function() {
        var parents = self.parents;
        var forumsList = self.forumsList;
        for(var i in forumsList) {
          parents.appendChild(createOption(forumsList[i].display_name));
        }
        for(var i in forumsList) {
          for(var j in forumsList[i].children) {
            if(forumsList[i].children[j]._key === self.id) {
              parents.value = forumsList[i].display_name;
              parentsOnChange(self)();
              return forumsList[i].children[j].display_name
            }
          }
        }
      })
      .then(function(value) {
        self.children.value = value;
        childrenOnChange(self)();
      })
  }
  geid('onlyM').onchange = onlyMOnChange(self);
  parents.onchange = parentsOnChange(self);
  children.onchange = childrenOnChange(self);
  post.onclick = onPost(self);
  title.focusin = titleFocusIn(self);
  easyPost.addEventListener('focusout', easyPostFocusOut(self));
  $('#postController').hide();
};

var titleFocusIn = function(that) {
  return function() {
    $('#postController').show('fast');
    that.title.placeholder = '标题';
  }
};

var easyPostFocusIn = function(that) {
  
}

var easyPostFocusOut = function(that) {
  return function() {
    console.log('triggered')
    $('#postController').hide('fast');
    that.title.placeholder = '发一个新帖吧';
  }
};

var childrenOnChange = function(that) {
  return function() {
    var result;
    var forumsList = that.forumsList;
    var chosenParent = that.parents.value;
    var chosenChild = that.children.value;
    for(var i in forumsList) {
      if(forumsList[i].display_name === chosenParent) {
        var parent = forumsList[i];
        for(var j in parent.children) {
          if(parent.children[j].display_name === chosenChild) result = parent.children[j]._key;
        }
      }
    }
    if(!result) screenTopWarning('在当前学院下未找到所选专业,请重新选择.');
    else that.id = result;
  }
};

var parentsOnChange = function(that) {
  return function() {
    var value = that.parents.value;
    var forumsList = that.forumsList;
    var children = that.children;
    for(var i in forumsList) {
      if(forumsList[i].display_name === value) {
        var childNodes = children.childNodes;
        //remove all childNodes except the first one '请选择一个专业'
        for(; childNodes.length > 3;) { //node.childNodes is a live collection.
          //keep the first two & last one elements
          //console.log('del -> ' + childNodes.length +
          children.removeChild(childNodes[childNodes.length - 2])
          //.innerHTML);
        }
        //append new
        var last = children.lastChild;
        for(var j in forumsList[i].children) {
          //console.log('add -> ' +
          children.insertBefore(createOption(forumsList[i].children[j].display_name), last)
          //.innerHTML);
        }
      }
    }
  }
};

var onlyMOnChange = function(that) {
  return function() {
    if(this.checked) {
      that.parents.setAttribute('disabled', 'disabled');
      that.children.setAttribute('disabled', 'disabled');
    }
    else {
      that.parents.removeAttribute('disabled');
      that.children.removeAttribute('disabled');
    }
  }
}

var onPost = function(that) {
  return function() {
    var content = that.content.value.trim();
    var title = that.title.value.trim();
    var target = that.type + '/' + that.id;
    var language = gv('lang').toLowerCase().trim();
    var onlyM = that.onlyM.checked;
    var postObj;
    if (content === '') {
      screenTopWarning('请填写内容。');
      return;
    }
    if (title === '') {
      screenTopWarning('请填写标题。');
      return;
    }
    if (geid('parseURL').checked) {
      if (language === 'markdown') {
        content = common.URLifyMarkdown(content);
      }
      if (language === 'bbcode' || language === 'pwbb') {
        content = common.URLifyBBcode(content);
      }
    }
    var post = {
      t: title,
      c: content,
      l: language
    };
    if(onlyM) {
      postObj = {
        post,
        target: 'm/' + that.uid
      }
    }
    else {
      if (target === 'f/undefined') {
        screenTopWarning('未指定正确的发送目标, 请选择正确的学院 -> 专业');
        return;
      }
      postObj = {
        target,
        post
      }
    }
    that.post.className = 'btn btn-primary disabled';
    return nkcAPI('postTo', postObj)
      .then(function (result) {
        var redirectTarget = result.redirect;
        redirect(redirectTarget ? redirectTarget : '/' + target);
      })
      .catch(function (err) {
        jwarning(err.detail);
        that.post.className = 'btn btn-primary';
      })
  }
};

var groupingForums = function(forumsList, that) {
  var group1;
  var group2;
  for(var index in forumsList) {
    var group = forumsList[index];
    if(group.parent == null) {
      group1 = group.group;
    }
    if(group.parent === '0') {
      group2 = group.group;
    }
  }
  that.forumsList = group1.concat(group2);
  for(var index in forumsList) {
    for(var i in that.forumsList) {
      if(forumsList[index].parent === that.forumsList[i]._key) {
        that.forumsList[i].children = forumsList[index].group;
      }
    }
  }
};

var createOption = function(text) {
  var textNode = document.createTextNode(text);
  var option = document.createElement('option');
  option.appendChild(textNode);
  return option;
};


/**
 * Created by lzszo on 2017/5/11.
 */
