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


// Declare app level module which depends on filters, and services
angular.module('pws', [
    'ui.router', 'ui.bootstrap', 'pws.navbar', 'pws.taskbar', 'pws.tasks',
    'pws.task', 'pws.user', 'pws.footer', 'pws.notifications', 'pws.signup',
    'pws.tests'
  ])
  .config(function($locationProvider, $stateProvider, $urlRouterProvider) {
    $locationProvider.html5Mode(false).hashPrefix('!');
    $urlRouterProvider
      .when('/tasks/', '/tasks/1')
      .when('/task/{taskName}', '/task/{taskName}/statement')
      .otherwise('/overview');
    $stateProvider
      .state('overview', {
        url: '/overview',
        templateUrl: 'views/overview.html'
      })
      .state('tasks', {
        url: '/tasks/{startIndex}',
        templateUrl: 'views/tasks.html',
        controller: 'TasksCtrl'
      })
      .state('task', {
        url: '/task/{taskName}',
        templateUrl: 'views/task.html',
        controller: 'TaskpageCtrl'
      })
      .state('task.statement', {
        url: '/statement',
        templateUrl: 'views/task.statement.html',
        controller: 'TaskpageCtrl'
      })
      .state('task.submissions', {
        url: '/submissions',
        templateUrl: 'views/task.submissions.html',
        controller: 'TaskpageCtrl'
      })
      .state('task.attachments', {
        url: '/attachments',
        templateUrl: 'views/task.attachments.html',
        controller: 'TaskpageCtrl'
      })
      .state('task.stats', {
        url: '/stats',
        templateUrl: 'views/task.stats.html',
        controller: 'TaskpageCtrl'
      })
      .state('signup', {
        url: '/signup',
        templateUrl: 'views/signup.html',
        controller: 'SignupCtrl'
      })
      .state('tests', {
        url: '/tests',
        templateUrl: 'views/tests.html',
        controller: 'TestCtrl'
      })
      .state('test', {
        url: '/test/{testName}',
        templateUrl: 'views/testpage.html',
        controller: 'TestpageCtrl'
      });
  })
  .filter('range', function() {
    return function(input, min, max) {
      for (var i=min; i<max; i++)
        input.push(i);
      return input;
    }
  })
  .filter('repext', function() {
    return function(input) {
      return input.replace(/.%l$/, ".(cpp|c|pas)")
    }
  })
  .filter('outcomeToClass', function() {
    return function(input) {
      if (input == "Correct")
        return "sub-full";
      if (input == "Not correct")
        return "sub-zero";
      return "sub-partial";
    }
  })
  .filter('timeFmt', function() {
    return function(input) {
      if (input == undefined)
        return "N/A";
      return input.toFixed(3) + "s";
    }
  })
  .filter('memoryFmt', function() {
    return function(input) {
      if (input == undefined)
        return "N/A";
      if (input>1024*1024)
        return (input/(1024*1024)).toFixed(1) + " MiB";
      else if (input>1024)
        return (input/1024).toFixed(0) + " KiB";
      return input + " B";
    }
  });
