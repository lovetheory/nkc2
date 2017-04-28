window._nowAtPage = 1;
moment.locale('zh-cn');
function Activity(obj) {
  var activityContentText = document.createElement('div');
  activityContentText.innerHTML = obj.post.c;
  activityContentText.className = 'activity-content';
  var activityContent = document.createElement('a');
  activityContent.appendChild(activityContentText);
  activityContent.style = 'overflow: hidden;';
  activityContent.href = '/t/'+obj.tid+'#'+obj.pid;
  var activityTitleText = document.createElement('div');
  activityTitleText.innerHTML = obj.oc.t;
  activityTitleText.style = 'overflow: hidden;';
  var activityTitle = document.createElement('div');
  activityTitle.className = 'activity-title';
  var activityTitleA = document.createElement('a');
  activityTitleA.appendChild(activityTitleText);
  activityTitleA.href = '/t/'+obj.tid;
  var activityInfo = document.createElement('span');
  activityInfo.className = 'activity-info';
  if(obj.forum) {
    var color = obj.forum.color || 'orange';
    var forum = document.createElement('a');
    forum.href= '/f/'+obj.fid;
    var forumText = document.createElement('span');
    forumText.className = 'activity-title-forum';
    forumText.style = 'background-color: '+color;
    forumText.innerHTML = '&nbsp;'+obj.forum.abbr+'&nbsp;';
    forum.appendChild(forumText);
    activityTitle.appendChild(forum);
  }
  if(obj.toMyForum) {
    var color = obj.toMyForum.color || 'orange';
    var toMyForum = document.createElement('a');
    toMyForum.href= '/f/'+obj.toMyForum._key;
    var toMyForumText = document.createElement('span');
    toMyForumText.className = 'activity-title-forum';
    toMyForumText.style = 'background-color: '+color;
    toMyForumText.innerHTML = '&nbsp;'+obj.toMyForum.abbr+'&nbsp;';
    toMyForum.appendChild(toMyForumText);
    activityTitle.appendChild(toMyForum);
  }
  if(obj.myForum) {
    var color = obj.myForum.color || 'orange';
    var myForum = document.createElement('a');
    myForum.href= '/f/'+obj.myForum._key;
    var myForumText = document.createElement('span');
    myForumText.className = 'activity-title-forum';
    myForumText.style = 'background-color: '+color;
    myForumText.innerHTML = '&nbsp;'+obj.myForum.abbr+'&nbsp;';
    myForum.appendChild(myForumText);
    activityTitle.appendChild(myForum);
  }
  activityTitle.appendChild(activityTitleA);
  activityInfo.appendChild(activityTitle);
  activityInfo.appendChild(activityContent);
  var activityUser = document.createElement('div');
  activityUser.className = 'activity-user';
  activityUserA = document.createElement('a');
  activityUserA.href = '/activities/'+obj.uid;
  var activityUserAvatar = document.createElement('img');
  activityUserAvatar.className = 'activity-user-avatar';
  activityUserAvatar.src = '/avatar/'+ obj.uid;
  activityUserA.appendChild(activityUserAvatar);
  var username = document.createElement('a');
  username.href = '/activities/'+obj.uid;
  username.innerHTML = obj.user.username;
  activityUser.appendChild(activityUserA);
  activityUser.appendChild(username);
  var type;
  switch (obj.type) {
    case 1:
      type = 'Po';
      break;
    case 2:
      type = 'Re';
      break;
  }
  var activityType = document.createElement('div');
  activityType.className = 'activity-type';
  var activityTypeText = document.createElement('div');
  activityTypeText.className = 'activity-type-text';
  activityTypeText.innerHTML = type;
  var activityTypeDate = document.createElement('div');
  activityTypeDate.className = 'activity-type-date';
  activityTypeDate.innerHTML = moment(obj.time).fromNow();
  activityType.appendChild(activityTypeText);
  activityType.appendChild(activityTypeDate);
  var activity = document.createElement('div');
  activity.className = 'activity';
  activity.appendChild(activityType);
  activity.appendChild(activityUser);
  activity.appendChild(activityInfo);
  return activity;
}
function loadNextPage() {
  var path = location.pathname.match(/\/([^0~9&^\/]*)/);
  console.log(location.pathname)
  console.log(path);
  var operation;
  var parameter;
  if(path[1] === 'activities') {
    operation = 'viewPersonalActivities';
    parameter = location.pathname.match(/\/([^0~9&^\/]*)\/(\d*)/)[2];
  }
  else if(path[1] === 'self'){
    operation = 'viewSelf';
  }
  else {
    throw new Error('unknown operation type.')
  }

  nkcAPI(operation, {
    uid: parameter,
    page: _nowAtPage ++
  })
    .then(function(res) {
      var activities = geid('activities');
      var oldButton = geid('loadNextPage');
      oldButton.remove();
      for(var activity of res) {
        activities.append(Activity(activity));
      }
      var div = document.createElement('div');
      div.style = 'width: 100%; text-align: center';
      var lButton = document.createElement('a');
      lButton.href = 'javascript: loadNextPage();'
      lButton.className = 'btn btn-default';
      lButton.innerHTML = '加载更多';
      lButton.id = 'loadNextPage';
      lButton.style = 'margin-top: 5px;'
      div.appendChild(lButton);
      activities.appendChild(div);
    })
    .catch(function(e) {
      screenTopWarning(e);
    })
}


/**
 * Created by lzszo on 2017/4/27.
 */
