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

/* Ranking page */

angular.module('pws.ranking', ['pws.pagination'])
  .controller('RankingCtrl', function($scope, $stateParams, $state,
        $http, $window, notificationHub, navbarManager, userManager) {
    navbarManager.setActiveTab(4);
    $scope.currentPage = parseInt($stateParams.pageNum);
    $scope.usersPerPage = 20;
    $scope.updPage = function(newPage) {
      $state.go('ranking', {'pageNum': newPage});
    };
    $scope.getUsers = function() {
      var data = {
        'first':    $scope.usersPerPage * ($scope.currentPage-1),
        'last':     $scope.usersPerPage * $scope.currentPage,
        'username': userManager.getUsername(),
        'token':    userManager.getToken(),
        'action':   'list'
      };
      $http.post('user', data)
        .success(function(data, status, headers, config) {
          $scope.users = data['users'];
          $scope.totalUsers = data['num'];
          $scope.totalPages = Math.ceil(data['num'] / $scope.usersPerPage);
        }).error(function(data, status, headers, config) {
          notificationHub.createAlert('danger', 'Errore di connessione', 2);
        });
    };
    $scope.getUsers();
  });
