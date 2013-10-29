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

angular.module('pws.taskbar', [])
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
        "name": $stateParams.taskName,
        "username": userManager.getUsername(),
        "token": userManager.getToken(),
        "action": "get"
      })
      .success(function(data, status, headers, config) {
        $rootScope.task = data;
      }).error(function(data, status, headers, config) {
        notificationHub.createAlert('danger', 'Errore di connessione', 2);
    });
  });
