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

angular.module('pws.tasks', [])
  .service('subsDatabase', [
      '$http', '$rootScope', '$timeout', 'notificationHub', 'userManager',
      function($http, $rootScope, $timeout, hub, user) {
    $rootScope.submissions = {};
    var updInterval = {};
    var updAttempts = {};
    var timeout;
    this.load = function(name) {
      $http.post('submissions/' + name, {
          "username": user.getUsername(),
          "token": user.getToken(),
        })
        .success(function(data, status, headers, config) {
          $rootScope.submissions[name] = [];
          for (var i=data["submissions"].length; i>0; i--)
            addSub(name, data["submissions"][i-1]);
        }).error(function(data, status, headers, config) {
          hub.createAlert('danger', 'Errore di connessione', 2);
      });
      $timeout.cancel(timeout);
      updSubs();
    }
    function intervalFromAttempts(i) {
        if(i<10 || i==undefined)
          return 1;
        if(i<30)
          return 2;
        if(i<50)
          return 3;
        if(i<100)
          return 5;
        if(i<300)
          return 10;
        if(i<500)
          return 60;
        return i/4;
    }
    function extendSub(sub) {
      sub.cl = "sub-notdone";
      var date = new Date(sub.timestamp * 1000);
      sub.time = date.toLocaleString();
      if (sub.compilation_outcome == null) {
        sub.status = "Compilazione in corso...";
        updInterval[sub.id] = intervalFromAttempts(updAttempts[sub.id]);
      }
      else if (sub.compilation_outcome == "fail") {
        sub.cl = "sub-zero";
        sub.status = "Compilazione fallita";
      }
      else if (sub.evaluation_outcome == null) {
        sub.status = "Valutazione in corso...";
        updInterval[sub.id] = intervalFromAttempts(updAttempts[sub.id]);
      }
      else if (sub.evaluation_outcome == "fail") { // ???
        sub.cl = "sub-zero";
        sub.status = "Valutazione fallita";
      }
      else if (sub.score == null) {
        sub.status = "Assegnazione del punteggio";
        updInterval[sub.id] = intervalFromAttempts(updAttempts[sub.id]);
      }
      else {
        var score = sub.score;
        if (100-score < 0.01)
          sub.cl = "sub-full";
        else if (score < 0.01)
          sub.cl = "sub-zero";
        else
          sub.cl = "sub-partial";
        sub.status = score + "/100";
      }
      return sub;
    }
    function addSub(name, sub) {
      $rootScope.submissions[name].unshift(extendSub(sub));
    }
    function replaceSub(id, sub) {
      for(name in $rootScope.submissions)
        for(var i=0; i<$rootScope.submissions[name].length; i++)
          if($rootScope.submissions[name][i]["id"] == id){
              $rootScope.submissions[name][i] = extendSub(sub);
              return;
          }
    }
    function subDetails(id) {
      $http.post('submission/' + id, {
        "username": user.getUsername(),
        "token": user.getToken(),
      })
      .success(function(data, status, headers, config) {
        replaceSub(id, data);
        $rootScope.curSub = id;
      }).error(function(data, status, headers, config) {
        hub.createAlert('danger', 'Errore di connessione', 2);
      });
    }
    function updSubs() {
      timeout = $timeout(function() {
        for (var i in updInterval) {
          updInterval[i]--;
          if (updInterval[i] == 0) {
            if (updAttempts[i] == undefined)
              updAttempts[i] = -1;
            updAttempts[i]++;
            delete updInterval[i];
            $http.post('submission/' + i, {
              "username": user.getUsername(),
              "token": user.getToken(),
            })
            .success(function(data, status, headers, config) {
              replaceSub(i, data);
            }).error(function(data, status, headers, config) {
              hub.createAlert('danger', 'Errore di connessione', 2);
            });
          }
        }
        updSubs();
      }, 1000);
    }
    this.addSub = addSub;
    this.extendSub = extendSub;
    this.replaceSub = replaceSub;
    this.subDetails = subDetails;
    return this;
  }])
  .controller('TasksCtrl', [
      '$scope', '$routeParams', '$location', '$http', '$window', 'notificationHub',
      function($scope, $routeParams, $location, $http, $window, hub) {
    $scope.startIndex = parseInt($routeParams.startIndex);
    $scope.tasksPerPage = 5;
    $scope.$window = $window;
    $scope.updPage = function(newIndex) {
      $location.path("tasks/" + newIndex);
    };
    $http.post('tasks', {
        "first": $scope.tasksPerPage * ($scope.startIndex-1),
        "last": $scope.tasksPerPage * $scope.startIndex,
      })
      .success(function(data, status, headers, config) {
        $scope.tasks = data["tasks"];
        $scope.$window.totalTasks = data["num"];
      }).error(function(data, status, headers, config) {
        hub.createAlert('danger', 'Errore di connessione', 2);
    });
  }])
  .controller('TaskpageCtrl', [
      '$scope', '$routeParams', '$location', '$http', '$window', '$rootScope', 'userManager', 'notificationHub', 'subsDatabase',
      function($scope, $routeParams, $location, $http, $window, $rootScope, user, hub, subs) {
    $("#timeLimit").popover();
    $("#memoLimit").popover();
    $scope.isLogged = user.isLogged;
    $scope.taskName = $routeParams.taskName;
    $scope.setActiveTab = function(tab) {
        $location.path("/" + tab + "/" + $scope.taskName);
    };
    $scope.isActiveTab = function(tab) {
      return $location.path().indexOf(tab) == 1;
    };
    $scope.$window = $window;
    $http.post('task/' + $scope.taskName, {})
      .success(function(data, status, headers, config) {
        $scope.$window.task = data;
      }).error(function(data, status, headers, config) {
        hub.createAlert('danger', 'Errore di connessione', 2);
    });
    if (user.isLogged() && $scope.isActiveTab("submissions")) {
      subs.load($scope.taskName);
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
              subs.addSub($scope.taskName, data);
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
          subs.subDetails(id);
      }
    }
  }]);
