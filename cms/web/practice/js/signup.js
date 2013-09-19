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

/* Signup page */

angular.module('pws.signup', [])
  .controller('SignupCtrl', ['$scope', '$http', function ($scope, $http) {
    $scope.submit = function() {
      $http.post("register", $scope.user)
        .success(function(data, status, headers, config) {
          console.log("dati inviati correttamente");
        }).error(function(data, status, headers, config) {
          console.log("dati non inviati");
        });
    };
    $scope.checkExistence = function(type, value) {
      $http.post("check", {type: type, value: value})
        .success(function(data, status, headers, config) {
          console.log(data);
          return data.exists == "1";
        }).error(function(data, status, headers, config) {
          console.log("dati non ricevuti");
        });
      return false;
    }
  }]);
