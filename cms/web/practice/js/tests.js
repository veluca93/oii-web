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

/* Test handling page */

angular.module('pws.tests', [])
  .controller('TestCtrl', [
      '$scope', '$http', 'notificationHub',
      function($scope, $http, hub) {
    $http.post('tests', {})
      .success(function(data, status, headers, config) {
        $scope.tests = data["tests"];
      }).error(function(data, status, headers, config) {
        hub.createAlert('danger', 'Errore di connessione', 2);
      });
  }])
  .controller('TestpageCtrl', [
      '$scope', '$routeParams', '$http', 'userManager', 'notificationHub',
      function($scope, $routeParams, $http, user, hub) {
    $scope.score = function() {
      var data = [];
      for (var i in $scope.test["questions"]) {
        var q = $scope.test["questions"][i];
        if (q["type"] == "choice")
          data.push(+q.ans);
        else {
          var tmp = {};
          for (var a=0; a<q["Answers"].length; a++) {
            var ans = q["Answers"][a];
            tmp[ans.name] = [];
            for (var j in ans.input)
              tmp[ans.name].push(ans.input[j].ans);
          }
          data.push(tmp);
        }
      }
      $http.post('answer/' + $routeParams.testName, data)
        .success(function(data, status, headers, config) {
          var tot = 0;
          var maxtot = 0;
          for (var i=0; i<$scope.test["questions"].length; i++) {
            $scope.test["questions"][i]["score"] = data[i][0];
            $scope.test["questions"][i]["status"] = data[i][1];
            tot += data[i][0];
            maxtot += $scope.test["questions"][i]["max_score"];
          }
          $scope.test["max_score"] = maxtot;
          $scope.test["score"] = tot;
          if (2*tot<maxtot)
            $scope.test["status"] = "wrong";
          else if (4*tot<maxtot*3)
            $scope.test["status"] = "partial";
          else if (tot<maxtot)
            $scope.test["status"] = "empty";
          else
            $scope.test["status"] = "correct";
        }).error(function(data, status, headers, config) {
          hub.createAlert('danger', 'Errore di connessione', 2);
        });
    }
    $http.post('test/' + $routeParams.testName, {})
      .success(function(data, status, headers, config) {
        $scope.test = data;
        for (var i in data["questions"]) {
          if (data["questions"][i]["max_score"] == 1)
            data["questions"][i]["scorestring"] = "1 punto";
          else
            data["questions"][i]["scorestring"] = data["questions"][i]["max_score"] + " punti";
          data["questions"][i].name = "question" + i;
          if (data["questions"][i]["type"] != "choice") {
            var tmp = [];
            for (var a in data["questions"][i]["answers"]) {
              var ans = data["questions"][i]["answers"][a];
              var t = {};
              t.name = ans[0];
              t.input = [];
              for (var j=0; j<ans[1]; j++)
                t.input.push({
                  "name": data["questions"][i].name + ans[0] + j,
                });
              tmp.push(t);
            }
            data["questions"][i]["Answers"] = tmp;
          }
        }
        setTimeout("MathJax.Hub.Queue(['Typeset',MathJax.Hub])", 100);
      }).error(function(data, status, headers, config) {
        hub.createAlert('danger', 'Errore di connessione', 2);
      });
  }]);
