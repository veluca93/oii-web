/* Contest Management System
 * Copyright © 2013 Luca Wehrstedt <luca.wehrstedt@gmail.com>
 * Copyright © 2013 William Di Luigi <williamdiluigi@gmail.com>
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
  .directive('userbar', function() {
    return {
      restrict: 'E',
      templateUrl: 'partials/userbar.html',
      replace: true,
      transclude: true,
      controller: 'UserbarCtrl'
    };
  })
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
    $scope.isMe = function() {
      return $stateParams.userId === userManager.getUsername();
    };
  })
  .factory('userManager', function($http, notificationHub) {
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
      getForumToolbar: function() {
        var al = localStorage.getItem('access_level');
        if (al === null) return;
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
      signin: function(token, username, access_level) {
        localStorage.setItem('token', token);
        localStorage.setItem('username', username);
        localStorage.setItem('access_level', access_level);
      },
      signout: function() {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('access_level');
      }
    };
  })
  .controller('SignCtrl', function($scope, $http, userManager,
        notificationHub) {
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
            userManager.signin(data.token, $scope.user.username, data.access_level);
            notificationHub.createAlert('success', 'Bentornato, ' +
              userManager.getUsername(), 2);
          } else if (data.success == 0) {
            notificationHub.createAlert('danger', 'Sign in error', 3);
          }
        }).error(function(data, status, headers, config) {
          notificationHub.createAlert('danger', 'Errore interno in fase' +
            ' di login: assicurati che la tua connessione a internet sia'+
            ' funzionante e, se l\'errore dovesse ripetersi, contatta un'+
            ' amministratore.', 5);
        });
    };
    $scope.signout = function() {
      userManager.signout();
      notificationHub.createAlert('success', 'Arrivederci', 1);
    };
  })
  .controller('UserpageCtrl', function($scope, $http, notificationHub,
      $stateParams, $location, userbarManager) {
    userbarManager.setActiveTab(1);
    $http.post('user', {
      'action':   'get',
      'username': $stateParams.userId
    }).success(function(data, status, headers, config) {
        $scope.user = data;
      }).error(function(data, status, headers, config) {
        notificationHub.createAlert('danger', 'Utente non esistente', 3);
        $location.path('overview'); // FIXME: torna a home?
      });
  })
  .controller('EdituserCtrl', function($scope, $state, $stateParams,
      $http, userbarManager, userManager, notificationHub, l10n) {
    if (userManager.getUsername() !== $stateParams.userId)
      $state.go('overview');
    userbarManager.setActiveTab(2);
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
          return notificationHub.createAlert('danger', l10n.get('signup.errors.password2'), 2);
        if ($scope.user.password.length < 1)
          return notificationHub.createAlert('danger', l10n.get('signup.errors.mustPassword'), 2);
        data['old_password'] = $scope.user.password;
        data['password'] = $scope.user.password2;
      }
      data['email'] = $scope.user.email;
      $http.post('user', data)
        .success(function(data, status, headers, config) {
          if (data.success == 1) {
            if (data.hasOwnProperty('token'))
              localStorage.setItem('token', data['token']);
            notificationHub.createAlert('success', l10n.get('user.edit.changed'), 2);
            $state.go('^.profile');
          } else if (data.success == 0) {
            if (data.error === undefined)
              notificationHub.createAlert('warning', l10n.get('user.edit.unchanged'), 3);
            else
              notificationHub.createAlert('danger', l10n.get(data.error), 3);
          }
        }).error(function(data, status, headers, config) {
          notificationHub.createAlert('danger', 'Errore interno.' +
            ' Assicurati che la tua connessione a internet sia'+
            ' funzionante e, se l\'errore dovesse ripetersi, contatta un'+
            ' amministratore.', 5);
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
