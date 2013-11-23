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

/* Tasks page */

angular.module('pws.ranking', [])
  .controller('RankingCtrl', function($scope, $stateParams, $location,
        $http, $window, notificationHub, navbarManager, userManager) {
    if ($stateParams.startIndex === undefined)
      return;
    navbarManager.setActiveTab(4);
    $scope.startIndex = parseInt($stateParams.startIndex);
    $scope.usersPerPage = 20;
    $scope.$window = $window;
    $scope.updPage = function(newIndex) {
      $location.path("ranking/" + newIndex);
    };
    $scope.getUsers = function() {
      var data = {
        "first": $scope.usersPerPage * ($scope.startIndex-1),
        "last": $scope.usersPerPage * $scope.startIndex,
        "username": userManager.getUsername(),
        "token": userManager.getToken(),
        "action": "list"
      };
      $http.post('user', data)
        .success(function(data, status, headers, config) {
          $scope.users = data["users"];
          $scope.$window.totalUsers = data["num"];
        }).error(function(data, status, headers, config) {
          notificationHub.createAlert('danger', 'Errore di connessione', 2);
        });
    };
    $scope.getUsers();
  });
