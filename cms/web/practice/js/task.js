/* Contest Management System
 * Copyright © 2013 Luca Wehrstedt <luca.wehrstedt@gmail.com>
 * Copyright © 2013 Luca Versari <veluca93@gmail.com>
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

/* Task page */

angular.module('pws.task', [])
  .directive('taskbar', function() {
    return {
      restrict: 'E',
      templateUrl: 'partials/taskbar.html',
      replace: true,
      transclude: true,
      controller: 'TaskbarCtrl'
    };
  })
  .factory('taskbarManager', function() {
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
  .controller('TaskbarCtrl', function($scope, $stateParams, $http,
        $rootScope, userManager, notificationHub, taskbarManager) {
    $("#timeLimit, #memoLimit").popover();
    $scope.isActiveTab = taskbarManager.isActiveTab;
    $scope.isLogged = userManager.isLogged;
    $scope.taskName = $stateParams.taskName;
    $http.post('task', {
        'name': $stateParams.taskName,
        'username': userManager.getUsername(),
        'token': userManager.getToken(),
        'action': 'get'
      })
      .success(function(data, status, headers, config) {
        $rootScope.task = data;
      }).error(function(data, status, headers, config) {
        notificationHub.createAlert('danger', 'Errore di connessione', 2);
    });
  })
  .controller('StatementCtrl', function($scope, taskbarManager) {
    taskbarManager.setActiveTab(1);
    $scope.getPDFURL = function(hash) {
      return '../../assets/pdfjs/viewer.html?file=/files/' + hash + '/testo.pdf';
    };
  })
  .controller('AttachmentsCtrl', function(taskbarManager) {
    taskbarManager.setActiveTab(2);
  })
  .controller('StatsCtrl', function($scope, $stateParams, $http,
      notificationHub, userManager, taskbarManager) {
    taskbarManager.setActiveTab(3);
    $scope.getStats = function() {
      $http.post('task', {
        'name': $stateParams.taskName,
        'username': userManager.getUsername(),
        'token': userManager.getToken(),
        'action': 'stats'
      }).success(function(data, status, headers, config) {
        $scope.nsubs = data.nsubs;
        $scope.nusers = data.nusers;
        $scope.nsubscorrect = data.nsubscorrect;
        $scope.nuserscorrect = data.nuserscorrect;
        $scope.best = data.best;
      }).error(function(data, status, headers, config) {
        notificationHub.createAlert('danger', 'Errore di connessione', 2);
        console.log(status);
      });
    }
    $scope.getStats();
  })
  .controller('SubmissionsCtrl', function($scope, $stateParams, $location,
      $http, $window, userManager, notificationHub, subsDatabase,
      taskbarManager) {
    taskbarManager.setActiveTab(4);
    subsDatabase.load($stateParams.taskName);
    $scope.loadFiles = function() {
      var input = $("#submitform input");
      $window.files = {};
      var reader = new FileReader();
      function readFile(i) {
        if (i==input.length) {
          $scope.submitFiles()
          return;
        }
        if (input[i].files.length < 1) {
          readFile(i+1);
          return;
        }
        reader.readAsBinaryString(input[i].files[0]);
        reader.filename = input[i].files[0].name
        reader.inputname = input[i].name
        reader.onloadend = function(){
          $window.files[reader.inputname] = {
            'filename': reader.filename,
            'data': reader.result
          };
          console.log(reader.inputname)
          readFile(i+1);
        };
      }
      readFile(0);
    };
    $scope.submitFiles = function() {
      var data = {};
      data['username'] = userManager.getUsername();
      data['token'] = userManager.getToken();
      data['files'] = $window.files;
      data['action'] = 'new';
      data['task_name'] = $scope.taskName;
      delete $window.files;
      $http.post('submission', data)
        .success(function(data, status, headers, config) {
          if (data['success']) {
            subsDatabase.addSub($scope.taskName, data);
            $("#submitform").each(function() {
              this.reset();
            });
          }
          else
            notificationHub.createAlert('danger', data['error'], 2);
      }).error(function(data, status, headers, config) {
          notificationHub.createAlert('danger', 'Errore di connessione', 2);
          console.log(status)
      });
    };
    $scope.showDetails = function(id) {
      subsDatabase.subDetails(id);
    };
  });
