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
      signin: function(token, username) {
        localStorage.setItem('token', token);
        localStorage.setItem('username', username);
      },
      signout: function() {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
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
      var data = $scope.user;
      data['action'] = 'login';
      $http.post('user', data)
      .success(function(data, status, headers, config) {
        if (data.success == 1) {
          userManager.signin(data.token, $scope.user.username);
          notificationHub.createAlert('success', 'Bentornato, ' +
              userManager.getUsername(), 2);
        }
        else if (data.success == 0) {
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
  .filter('levelClass', function() {
    return function(input) {
      switch (input) {
      case 0:
        return "admin";
      case 1:
        return "asd";
      case 2:
        return "asd";
      case 3:
        return "asd";
      case 4:
        return "asd";
      case 5:
        return "asd";
      case 6:
        return "asd";
      case 7:
        return "guest";
      default:
        return "unknown";
      }
    };
  });
