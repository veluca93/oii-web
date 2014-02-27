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

angular.module('pws.tasks', ['pws.pagination'])
  .service('subsDatabase', function($http, $rootScope, $timeout,
      notificationHub, userManager, l10n) {
    $rootScope.submissions = {};
    var updInterval = {};
    var updAttempts = {};
    var timeout;
    this.load = function(name) {
      $http.post('submission', {
        'username': userManager.getUser().username,
        'token': userManager.getUser().token,
        'action': 'list',
        'task_name': name
      })
      .success(function(data, status, headers, config) {
        $rootScope.submissions[name] = [];
        for (var i=data['submissions'].length; i>0; i--)
          addSub(name, data['submissions'][i-1]);
      })
      .error(function(data, status, headers, config) {
        notificationHub.serverError(status);
      });
      $timeout.cancel(timeout);
      updSubs();
    };
    function intervalFromAttempts(i) {
      if (i<10 || i==undefined)
        return 1;
      if (i<30)
        return 2;
      if (i<50)
        return 3;
      if (i<100)
        return 5;
      if (i<300)
        return 10;
      if (i<500)
        return 60;
      return i/4;
    }
    function extendSub(sub) {
      sub.cl = 'empty';
      var date = new Date(sub.timestamp * 1000);
      sub.time = date.toLocaleString();
      if (sub.compilation_outcome == null) {
        sub.status = 'Compilazione in corso...';
        updInterval[sub.id] = intervalFromAttempts(updAttempts[sub.id]);
      }
      else if (sub.compilation_outcome == 'fail') {
        sub.cl = 'wrong';
        sub.status = 'Compilazione fallita';
      }
      else if (sub.evaluation_outcome == null) {
        sub.status = 'Valutazione in corso...';
        updInterval[sub.id] = intervalFromAttempts(updAttempts[sub.id]);
      }
      else if (sub.evaluation_outcome == 'fail') { // ???
        sub.cl = 'wrong';
        sub.status = 'Valutazione fallita';
      }
      else if (sub.score == null) {
        sub.status = 'Assegnazione del punteggio';
        updInterval[sub.id] = intervalFromAttempts(updAttempts[sub.id]);
      }
      else {
        var score = sub.score;
        if (100-score < 0.01)
          sub.cl = 'correct';
        else if (score < 0.01)
          sub.cl = 'wrong';
        else
          sub.cl = 'partial';
        sub.status = score + ' / 100';
      }
      return sub;
    }
    function addSub(name, sub) {
      $rootScope.submissions[name].unshift(extendSub(sub));
    }
    function replaceSub(id, sub) {
      for (name in $rootScope.submissions)
        for (var i=0; i<$rootScope.submissions[name].length; i++)
          if ($rootScope.submissions[name][i]["id"] == id) {
              $rootScope.submissions[name][i] = extendSub(sub);
              return;
          }
    }
    function subDetails(id) {
      $http.post('submission', {
        "username": userManager.getUser().username,
        "token": userManager.getUser().token,
        "action": "details",
        "id": id
      })
      .success(function(data, status, headers, config) {
        replaceSub(id, data);
        $rootScope.curSub = id;
        $rootScope.actualCurSub = data;
      })
      .error(function(data, status, headers, config) {
        notificationHub.serverError(status);
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
            $http.post('submission', {
              'username': userManager.getUser().username,
              'token': userManager.getUser().token,
              'action': 'details',
              'id': i
            })
            .success(function(data, status, headers, config) {
              replaceSub(data["id"], data);
            })
            .error(function(data, status, headers, config) {
              notificationHub.serverError(status);
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
  })
  .controller('TasklistSkel', function($scope, $state, navbarManager) {
    navbarManager.setActiveTab(0);
    $scope.search = {tag: ''};
    $scope.pagination = {perPage: 15};
    $scope.goToTagged = function() {
      if ($scope.search.tag.length > 0) {
        $state.go('^.taggedpage', {'pageNum': 1, 'tagName': $scope.search.tag});
      } else {
        $state.go('^.page', {'pageNum': 1});
      }
    };
    $scope.getTasks = function() {
      // richiama getTasks() di TasklistPage
      $scope.$broadcast('getTasks');
    };
  })
  .controller('TasklistPage', function($scope, $stateParams, $state, $http,
      notificationHub, userManager, l10n) {
    $scope.pagination.current = +$stateParams.pageNum;
    $scope.getTasks = function() {
      var data = {
        'first':    $scope.pagination.perPage * ($scope.pagination.current-1),
        'last':     $scope.pagination.perPage * $scope.pagination.current,
        'username': userManager.getUser().username,
        'token':    userManager.getUser().token,
        'action':   'list'
      };
      if ($stateParams.tagName !== undefined) {
        data.tag = $scope.search.tag = $stateParams.tagName;
      }
      $http.post('task',
        data
      )
      .success(function(data, status, headers, config) {
        $scope.tasks = data['tasks'];
        $scope.pagination.total = Math.ceil(data['num'] / $scope.pagination.perPage);
      })
      .error(function(data, status, headers, config) {
        notificationHub.serverError(status);
      });
    };
    $scope.$on('getTasks', function(e) {
      $scope.getTasks();
    });
    $scope.getTasks();
  });
