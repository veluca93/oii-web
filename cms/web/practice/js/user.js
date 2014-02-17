/* Contest Management System
 * Copyright © 2013 Luca Wehrstedt <luca.wehrstedt@gmail.com>
 * Copyright © 2013 William Di Luigi <williamdiluigi@gmail.com>
 * Copyright © 2014 Luca Chiodini <luca@chiodini.org>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';

/* Signin page */

angular.module('pws.user', [])
  .factory('userbarManager', function() {
    var activeTab = 0;
    return {
      isActiveTab: function(tab) {
        return tab == activeTab;
      },
      setActiveTab: function(tab) {
        activeTab = tab;
      }
    };
  })
  .controller('UserbarCtrl', function($scope, $stateParams, $http,
        $rootScope, userManager, notificationHub, userbarManager) {
    $scope.isActiveTab = userbarManager.isActiveTab;
    $scope.isLogged = userManager.isLogged;
    $scope.myName = userManager.getUsername;
    $scope.isMe = function() {
      return $stateParams.userId === userManager.getUsername();
    };
  })
  .factory('userManager', function($http, $sce, notificationHub) {
    return {
      isLogged: function() {
        return localStorage.getItem('token') !== null &&
               localStorage.getItem('username') !== null;
      },
      getUsername: function() {
        return localStorage.getItem('username');
      },
      getToken: function() {
        return localStorage.getItem('token');
      },
      getAccessLevel: function() {
        return localStorage.getItem('access_level');
      },
      getGravatar: function(size) {
        return $sce.trustAsUrl('http://gravatar.com/avatar/'+localStorage.getItem('mail_hash')+'?d=identicon&amp;s='+size);
      },
      getForumToolbar: function() {
        var al = localStorage.getItem('access_level');
        if (al === null) return [];
        var t1 = ['p','pre','quote'];
        if (al < 4) {
          t1.unshift('h3');
          t1.unshift('h2');
          t1.unshift('h1');
        }
        var t2 = ['bold','italics','underline','ul','ol','undo','redo','clear'];
        var t3 = ['justifyLeft','justifyCenter','justifyRight'];
        var t4 = ['html','insertImage','insertLink','unlink'];
        var ret = [];
        ret.push(t1);
        ret.push(t2);
        if (al < 4) {
          ret.push(t3); // FIXME: non lo mostro a tutti solo perche' sembra non funzionare :/
          ret.push(t4);
        }
        return ret;
      },
      signin: function(token, username, access_level, mail_hash) {
        localStorage.setItem('token', token);
        localStorage.setItem('username', username);
        localStorage.setItem('access_level', access_level);
        localStorage.setItem('mail_hash', mail_hash);
      },
      signout: function() {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('access_level');
        localStorage.removeItem('mail_hash');
      }
    };
  })
  .controller('SignCtrl', function($scope, $http, userManager,
        notificationHub, l10n) {
    $scope.user = {'username': '', 'password': ''};
    $scope.isLogged = userManager.isLogged;
    $scope.signin = function() {
      // temporary fix to get username & password
      $scope.user.username = $("#username").val();
      $scope.user.password = $("#password").val();
      $http.post('user', {
          'action':   'login',
          'username': $scope.user.username,
          'password': $scope.user.password,
        })
        .success(function(data, status, headers, config) {
          if (data.success == 1) {
            //~ console.log(JSON.stringify(data));
            userManager.signin(data.token, data.user.username,
                data.user.access_level, data.user.mail_hash);
            notificationHub.createAlert('success', l10n.get('Welcome back') +
                ', ' + userManager.getUsername(), 2);
          } else if (data.success == 0) {
            notificationHub.createAlert('danger', l10n.get('Sign in error'), 3);
          }
        }).error(function(data, status, headers, config) {
          notificationHub.createAlert('danger', l10n.get('Internal error ' +
            'during login: make sure your internet connection is working well' +
            ' and, if this error occurs again, contact an administrator.'), 5);
        });
    };
    $scope.signout = function() {
      userManager.signout();
      notificationHub.createAlert('success', l10n.get('Goodbye'), 1);
    };
  })
  .controller('UserpageCtrl', function($scope, $http, notificationHub,
      $stateParams, $location, $timeout, userbarManager, l10n) {
    userbarManager.setActiveTab(1);
    $timeout(function() {
      $('.my-tooltip').tooltip(); // enable tooltips
    });
    $http.post('user', {
      'action':   'get',
      'username': $stateParams.userId
    })
    .success(function(data, status, headers, config) {
      if (data.success === 1) {
        $scope.user = data;
      } else {
        notificationHub.createAlert('danger', l10n.get('User doesn\'t exist'), 3);
        $state.go('overview');
      }
    })
    .error(function(data, status, headers, config) {
      notificationHub.createAlert('danger', 'Server error: ' + status, 3);
    });
  })
  .controller('UsertalksCtrl', function($scope, $http, notificationHub,
      $stateParams, $location, $timeout, userbarManager, userManager) {
    userbarManager.setActiveTab(2);
    $http.post('talk', {
      'action':   'list',
      'username': userManager.getUsername(),
      'token':    userManager.getToken(),
      'first':    1,
      'last':     1000
    })
    .success(function(data, status, headers, config) {
      if (data.success === 1) {
        $scope.talks = data.talks;
      }
    });
    $scope.getRecipient = function(talk) {
      if (talk.sender.username == userManager.getUsername()) {
        return talk.receiver;
      } else {
        return talk.sender;
      }
    };
  })
  .controller('TalkRedirectCtrl', function($scope, $state, $stateParams,
      $http, userbarManager, userManager, notificationHub, l10n) {
    $http.post('talk', {
      'action':   'get',
      'username': userManager.getUsername(),
      'token':    userManager.getToken(),
      'other':    $stateParams.recipientName
    })
    .success(function(data, status, headers, config) {
      if (data.success === 1) {
        $state.go('talk', {'talkId': data.id});
      }
    });
  })
  .controller('TalkCtrl', function($scope, $state, $stateParams,
      $http, $window, $timeout, userbarManager, userManager,
      notificationHub, l10n) {
    userbarManager.setActiveTab(2);
    $scope.userToolbar = userManager.getForumToolbar();
    $scope.me = userManager;
    $scope.sendMessage = function() {
      //~ console.log($stateParams.talkId);
      $http.post('pm', {
        'action': 'new',
        'id': $stateParams.talkId,
        'username': userManager.getUsername(),
        'token':    userManager.getToken(),
        'text': $scope.newText
      })
      .success(function(data, status, headers, config) {
        //~ console.log(JSON.stringify(data));
        if (data.success === 1) {
          notificationHub.createAlert('success', l10n.get('Message sent'), 2);
          $scope.newText = '';
          $scope.checkNew();
        } else {
          notificationHub.createAlert('danger', l10n.get(data.error), 2);
        }
      });
    };
    var msgPerPage = 2;
    var lastLast, lastTot;
    $scope.downloadMore = function() {
      $http.post('pm', {
        'action':   'list',
        'id':       $stateParams.talkId,
        'username': userManager.getUsername(),
        'token':    userManager.getToken(),
        'first':    lastLast,
        'last':     msgPerPage + lastLast
      })
      .success(function(data, status, headers, config) {
        //~ console.log(JSON.stringify(data));
        if (data.success === 1) {
          lastLast += msgPerPage;
          $scope.pms = data.pms.concat($scope.pms);
          if ($scope.recipientName === undefined) {
            $scope.recipientName = (userManager.getUsername === data.sender)
                ? data.receiver : data.sender;
          }
          lastTot = data.num;
          if (lastLast < data.num) {
            $("#showMore").show();
          } else {
            lastLast = data.num;
            $("#showMore").hide();
          }
          console.log(lastLast + " " + data.num);
        }
      });
    };
    $scope.downloadMsg = function() {
      $http.post('pm', {
        'action':   'list',
        'id':       $stateParams.talkId,
        'username': userManager.getUsername(),
        'token':    userManager.getToken(),
        'first':    0,
        'last':     lastLast
      })
      .success(function(data, status, headers, config) {
        //~ console.log(JSON.stringify(data));
        if (data.success === 1) {
          $scope.pms = data.pms;
          if ($scope.recipientName === undefined) {
            $scope.recipientName = (userManager.getUsername() === data.sender)
                ? data.receiver : data.sender;
          }
          lastTot = data.num;
          if (data.pms.length != data.num) {
            $("#showMore").show();
          }
          $timeout(function() {
            $window.scrollTo(0, parseFloat($("html").css('height')));
          }, 100);
        }
      });
    };
    $scope.checkNew = function() {
      $http.post('pm', {
        'action':   'list',
        'id':       $stateParams.talkId,
        'username': userManager.getUsername(),
        'token':    userManager.getToken(),
        'first':    0,
        'last':     1
      })
      .success(function(data, status, headers, config) {
        //~ console.log(JSON.stringify(data));
        if (data.success === 1) {
          if (data.num == lastTot) {
            notificationHub.createAlert('info', l10n.get('No new messages'), 1);
          } else {
            console.log(data.num + ' ' + lastLast);
            $scope.downloadMsg();
          }
        }
      });
    };
    $("#showMore").hide();
    lastLast = msgPerPage;
    $scope.downloadMsg();
  })
  .controller('EdituserCtrl', function($scope, $state, $stateParams,
      $http, userbarManager, userManager, notificationHub, l10n) {
    if (userManager.getUsername() !== $stateParams.userId) {
      $state.go('overview');
    }
    userbarManager.setActiveTab(3);
    $scope.user = {
      password:  '',
      password2: '',
      password3: '',
      email:     '',
    };
    $scope.submit = function() {
      var data = {};
      data['action'] = 'update';
      data['username'] = userManager.getUsername();
      data['token'] = userManager.getToken();
      if ($scope.user.password2.length > 0) {
        if ($scope.user.password3 !== $scope.user.password2)
          return notificationHub.createAlert('danger', l10n.get('Passwords don\'t match'), 2);
        if ($scope.user.password.length < 1)
          return notificationHub.createAlert('danger', l10n.get('You must specify your password'), 2);
        data['old_password'] = $scope.user.password;
        data['password'] = $scope.user.password2;
      }
      data['email'] = $scope.user.email;
      $http.post('user', data)
        .success(function(data, status, headers, config) {
          if (data.success == 1) {
            if (data.hasOwnProperty('token'))
              localStorage.setItem('token', data['token']);
            notificationHub.createAlert('success', l10n.get('Changes recorded'), 2);
            $state.go('^.profile');
          } else if (data.success == 0) {
            if (data.error === undefined)
              notificationHub.createAlert('warning', l10n.get('No changes recorded'), 3);
            else
              notificationHub.createAlert('danger', l10n.get(data.error), 3);
          }
        }).error(function(data, status, headers, config) {
          notificationHub.createAlert('danger', l10n.get('Internal error. Make'+
            ' sure your internet connection is working well and, if this error'+
            ' occurs again, contact an administrator.'), 5);
        });
    };
  })
  .filter('levelClass', function() {
    return function(input) {
      switch (input) {
      case 0:
        return 'admin';
      case 1:
        return 'monica';
      case 2:
        return 'tutor';
      case 3:
        return 'teacher';
      case 4:
        return 'superuser';
      case 5:
        return 'user';
      case 6:
        return 'newbie';
      case 7:
        return 'guest';
      default:
        return 'unknown';
      }
    };
  });
