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

/* Tasks page */

angular.module('pws.tasks', [])
  .controller('TasksCtrl',
    ['$scope', '$routeParams', '$location', '$http', '$window', 'notificationHub',
    function($scope, $routeParams, $location, $http, $window, hub) {
    $scope.startIndex = parseInt($routeParams.startIndex);
    $scope.tasksPerPage = 5
    $scope.$window = $window
    $scope.updPage = function(newIndex) {
      $location.path("tasks/" + newIndex);
    };
    $http.post('tasks',
      {"first": $scope.tasksPerPage*($scope.startIndex-1),
      "last": $scope.tasksPerPage*$scope.startIndex})
      .success(function(data, status, headers, config) {
        $scope.tasks = data["tasks"];
        $scope.$window.totalTasks = data["num"];
      }).error(function(data, status, headers, config) {
        hub.createAlert('danger', 'Errore di connessione', 2);
    });
  }])
  .controller('TaskpageCtrl',
    ['$scope', '$routeParams', '$location', '$http', '$window', 'userManager', 'notificationHub',
    function($scope, $routeParams, $location, $http, $window, user, hub) {
    $scope.isLogged = user.isLogged;
    $scope.setActiveTab = function(tab) {
        $location.path("/" + tab + "/" + $routeParams.taskName);
    };
    $scope.isActiveTab = function(tab) {
      return $location.path().indexOf(tab) == 1;
    };
    $scope.$window = $window
    $http.post('task/' + $routeParams.taskName, {})
      .success(function(data, status, headers, config) {
        $scope.$window.task = data;
      }).error(function(data, status, headers, config) {
        hub.createAlert('danger', 'Errore di connessione', 2);
    });
    if(user.isLogged() && $scope.isActiveTab("submissions")){
      $http.post('submissions/' + $routeParams.taskName,
        {"username": user.getUsername(), "token": user.getToken()})
        .success(function(data, status, headers, config) {
          $scope.submissions = data["submissions"];
          for(var i=0; i<$scope.submissions.length; i++){
            $scope.submissions[i].cl = "sub-notdone"
            var date = new Date($scope.submissions[i].timestamp*1000);
            $scope.submissions[i].time = date.toLocaleString();
            if($scope.submissions[i].compilation_outcome == null)
              $scope.submissions[i].status = "Compilazione in corso...";
            else if($scope.submissions[i].compilation_outcome == "fail"){
              $scope.submissions[i].cl = "sub-zero";
              $scope.submissions[i].status = "Compilazione fallita";
            }
            else if($scope.submissions[i].evaluation_outcome == null)
              $scope.submissions[i].status = "Valutazione in corso...";
            else if($scope.submissions[i].evaluation_outcome == "fail"){ // ???
              $scope.submissions[i].cl = "sub-zero";
              $scope.submissions[i].status = "Valutazione fallita";
            }
            else if($scope.submissions[i].score == null)
              $scope.submissions[i].status = "Assegnazione del punteggio"
            else{
              var score = $scope.submissions[i].score;
              if(100-score < 0.01) $scope.submissions[i].cl = "sub-full";
              else if(score < 0.01) $scope.submissions[i].cl = "sub-zero";
              else $scope.submissions[i].cl = "sub-partial";
              $scope.submissions[i].status = score + "/100";
            }
          }
        }).error(function(data, status, headers, config) {
          hub.createAlert('danger', 'Errore di connessione', 2);
      });
    }
  }]);
