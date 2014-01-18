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
        $rootScope, $timeout, userManager, notificationHub, taskbarManager) {
    $timeout(function() {
      $(".my-popover").popover(); // enable popovers
    });
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
  .controller('StatementCtrl', function($scope, $window, taskbarManager) {
    taskbarManager.setActiveTab(1);
    $scope.goodBrowser = !!$window.Worker;
    $scope.getPDFURL = function(hash) {
      return 'assets/pdfjs/viewer.html?file=../../files/' + hash + '/testo.pdf';
    };
    $scope.getPDFURLforIE8 = function(hash) {
      return 'files/' + hash + '/testo.pdf';
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
      });
    }
    $scope.getStats();
  })
  .controller('SubmissionsCtrl', function($scope, $stateParams, $location,
      $http, $timeout, $rootScope, userManager, notificationHub,
      subsDatabase, taskbarManager) {
    taskbarManager.setActiveTab(4);
    subsDatabase.load($stateParams.taskName);
    $scope.areThereSubs = function(name) {
      return $rootScope.submissions[name] !== undefined
          && $rootScope.submissions[name].length > 0;
    };
    $scope.prepareInput = function() {
      if(!$scope.task) {
        $timeout($scope.prepareInput, 200);
        return;
      }
      $scope.fileInputs = [];
      for(var idx in $scope.task.submission_format) {
        var fname = $scope.task.submission_format[idx];
        var finput = new mOxie.FileInput(fname);
        finput.name = fname;
        finput.container = document.getElementById(fname).parentNode;
        finput.onchange = function(e) {
          this.container.children[0].innerHTML = this.files[0].name;
        };
        finput.init();
        $scope.fileInputs.push(finput);
      }
    }
    $scope.loadFiles = function() {
      $scope.files = {};
      var reader = new mOxie.FileReader();
      function readFile(i) {
        if (i==$scope.fileInputs.length) {
          $scope.submitFiles();
          return;
        }
        if ($scope.fileInputs[i].files == null) {
          readFile(i+1);
          return;
        }
        reader.filename = $scope.fileInputs[i].files[0].name;
        reader.inputname = $scope.fileInputs[i].name;
        reader.number = i;
        reader.already_done = false;
        reader.onloadend = function(){
          if(reader.already_done) {
            return;
          }
          reader.already_done = true;
          $scope.files[reader.inputname] = {
            'filename': reader.filename,
            'data': reader.result
          };
          readFile(reader.number+1);
        };
        reader.readAsBinaryString($scope.fileInputs[i].files[0]);
      }
      readFile(0);
    };
    $scope.submitFiles = function() {
      var data = {};
      data['username'] = userManager.getUsername();
      data['token'] = userManager.getToken();
      data['files'] = $scope.files;
      data['action'] = 'new';
      data['task_name'] = $scope.taskName;
      delete $scope.files;
      $http.post('submission', data)
        .success(function(data, status, headers, config) {
          if (data['success']) {
            subsDatabase.addSub($scope.taskName, data);
            for(var i in $scope.fileInputs) {
              $scope.fileInputs[i].container.children[0].innerHTML = '';
            }
          }
          else
            notificationHub.createAlert('danger', data['error'], 2);
      }).error(function(data, status, headers, config) {
          notificationHub.createAlert('danger', 'Errore di connessione', 2);
      });
    };
    $scope.showDetails = function(id) {
      subsDatabase.subDetails(id);
    };
    $timeout($scope.prepareInput, 200);
  });
