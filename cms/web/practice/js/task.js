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
  .controller('StatementCtrl', function(taskbarManager) {
    taskbarManager.setActiveTab(1);
  })
  .controller('AttachmentsCtrl', function(taskbarManager) {
    taskbarManager.setActiveTab(2);
  })
  .controller('StatsCtrl', function(taskbarManager) {
    taskbarManager.setActiveTab(3);
  })
  .controller('SubmissionsCtrl', function($scope, $stateParams, $location,
        $http, $window, $rootScope, userManager, notificationHub,
        subsDatabase, taskbarManager) {
    taskbarManager.setActiveTab(4);
    subsDatabase.load($scope.taskName);
    $scope.loadFiles = function() {
      var input = $("#submitform input");
      $window.loadCount = input.length;
      $window.files = {};
      for (var i=0; i<input.length; i++) {
        if (input[i].files.length < 1) {
          hub.createAlert('danger', 'Files mancanti!', 2);
          break;
        }
        var reader = new FileReader();
        reader.readAsBinaryString(input[i].files[0]);
        reader.filename = input[i].files[0].name
        reader.inputname = input[i].name
        reader.onloadend = function(){
          $window.loadCount -= 1;
          $window.files[reader.inputname] = {
              "filename": reader.filename,
              "data": reader.result,
          };
          if ($window.loadCount == 0)
            $scope.submitFiles();
        }
      }
      $("#submitform").each(function() {
        this.reset();
      });
    }
    $scope.submitFiles = function() {
      var data = {};
      data["username"] = user.getUsername();
      data["token"] = user.getToken();
      data["files"] = $window.files;
      delete $window.files;
      delete $window.loadCount;
      $http.post('submit/' + $scope.taskName, data)
        .success(function(data, status, headers, config) {
          if (data["success"])
            subsDatabase.addSub($scope.taskName, data);
          else
            hub.createAlert('danger', data["error"], 2);
      }).error(function(data, status, headers, config) {
          hub.createAlert('danger', 'Errore di connessione', 2);
      });
    }
    $scope.showDetails = function(id) {
      if ($rootScope.curSub == id)
        $rootScope.curSub = 0;
      else
        subsDatabase.subDetails(id);
    }
  });
