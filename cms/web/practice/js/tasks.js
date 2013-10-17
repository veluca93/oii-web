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
          $scope.submissions = [];
          for(var i=0; i<data["submissions"].length; i++)
            $scope.submissions.push($scope.parseSub(data["submissions"][i]));
        }).error(function(data, status, headers, config) {
          hub.createAlert('danger', 'Errore di connessione', 2);
      });
      $scope.parseSub = function(sub){
        sub.cl = "sub-notdone"
        var date = new Date(sub.timestamp*1000);
        sub.time = date.toLocaleString();
        if(sub.compilation_outcome == null)
          sub.status = "Compilazione in corso...";
        else if(sub.compilation_outcome == "fail"){
          sub.cl = "sub-zero";
          sub.status = "Compilazione fallita";
        }
        else if(sub.evaluation_outcome == null)
          sub.status = "Valutazione in corso...";
        else if(sub.evaluation_outcome == "fail"){ // ???
          sub.cl = "sub-zero";
          sub.status = "Valutazione fallita";
        }
        else if(sub.score == null)
          sub.status = "Assegnazione del punteggio"
        else{
          var score = sub.score;
          if(100-score < 0.01) sub.cl = "sub-full";
          else if(score < 0.01) sub.cl = "sub-zero";
          else sub.cl = "sub-partial";
          sub.status = score + "/100";
        }
        return sub;
      }
      $scope.loadFiles = function(){
        var input = $("#submitform input");
        $window.loadCount = input.length;
        $window.files = {};
        for(var i=0; i<input.length; i++){
          if(input[i].files.length < 1){
            hub.createAlert('danger', 'Files mancanti!', 2);
            break;
          }
          var reader = FileReader();
          reader.readAsBinaryString(input[i].files[0]);
          reader.filename = input[i].files[0].name
          reader.inputname = input[i].name
          reader.onloadend = function(){
            $window.loadCount -= 1;
            $window.files[reader.inputname] = {
                "filename": reader.filename,
                "data": reader.result
            }
            if($window.loadCount == 0)
              $scope.submitFiles()
          }
        }
        $("#submitform").each(function(){this.reset();});
      }
      $scope.submitFiles = function(){
        var data = {};
        data["username"] = user.getUsername();
        data["token"] = user.getToken();
        data["files"] = $window.files;
        delete $window.files;
        delete $window.loadCount;
        $http.post('submit/' + $routeParams.taskName, data)
          .success(function(data, status, headers, config) {
            if(data["success"])
              $scope.submissions.unshift($scope.parseSub(data));
            else
              hub.createAlert('danger', data["error"], 2);
        }).error(function(data, status, headers, config) {
            hub.createAlert('danger', 'Errore di connessione', 2);
        });
      }
    }
  }]);
