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
  .factory('tasksDatabase', ['$http', 'notificationHub', function($http, hub) {
    var all = null;
    var allSize = 0;
    return {
      loadAll: function(callback) {
        $http.post('tasks', {})
          .success(function(data, status, headers, config) {
            //~ hub.notify_oneshot('success', 'Caricato tutto');
            all = data.tasks;
            for (var item in all)
              allSize ++;
            callback.call(this);
          }).error(function(data, status, headers, config) {
            hub.notify_oneshot('danger', 'Errore di connessione');
          });
      },
      isLoaded: function() {
        return all !== null;
      },
      totalTasks: function() {
        return allSize;
      },
      loadPage: function(from, to) {
        var page = new Array(), i=0;
        for (var task in all) {
          if (from <= i && i < to)
            page.push(all[task]);
          i++;
        }
        return page;
      },
      loadTask: function(task) {
        return all[task];
      },
    };
  }])
  .factory('subsDatabase', ['$http', 'notificationHub', function($http, hub) {
    var all = null;
    var allSize = 0;
    return {
      loadAll: function(callback) {
        $http.post('submissions', {})
          .success(function(data, status, headers, config) {
            //~ hub.notify_oneshot('success', 'Caricato tutto');
            //~ all = data.tasks;
            //~ for (var item in all)
              //~ allSize ++;
            callback.call(this);
          }).error(function(data, status, headers, config) {
            hub.notify_oneshot('danger', 'Errore di connessione');
          });
      },
      isLoaded: function() {
        //~ return all !== null;
      },
    };
  }])
  .controller('TasksController', ['$scope', '$routeParams', '$location', 'tasksDatabase', function($scope, $routeParams, $location, db) {
    $scope.startIndex = parseInt($routeParams.startIndex);
    var f = function() {
      $scope.totalTasks = db.totalTasks();
      $scope.tasks = db.loadPage(5 * $scope.startIndex, 5 * ($scope.startIndex + 1));
    };
    if (!db.isLoaded())
      db.loadAll(f);
    else
      f.call(this);
  }])
  .controller('TaskpageController', ['$scope', '$routeParams', 'tasksDatabase', function($scope, $routeParams, db) {
    var f = function() {
      $scope.task = db.loadTask($routeParams.taskName);
    };
    if (!db.isLoaded())
      db.loadAll(f);
    else
      f.call(this);
  }]);
