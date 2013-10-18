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
angular.module('pws', ['ui.bootstrap', 'pws.navbar', 'pws.taskbar', 'pws.tasks', 'pws.user', 'pws.footer', 'pws.notifications', 'pws.signup', 'pws.tests'])
  .config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
    $locationProvider.html5Mode(false);
    $locationProvider.hashPrefix('!');

    $routeProvider.when('/overview', {templateUrl: 'views/overview.html'});
    $routeProvider.when('/tasks/', {redirectTo: '/tasks/1'});
    $routeProvider.when('/tasks/:startIndex', {templateUrl: 'views/tasks.html', controller: 'TasksCtrl'});
    $routeProvider.when('/task/:taskName', {templateUrl: 'views/taskpage.html', controller: 'TaskpageCtrl'});
    $routeProvider.when('/tests', {templateUrl: 'views/tests.html', controller: 'TestCtrl'});
    $routeProvider.when('/test/:testName', {templateUrl: 'views/testpage.html', controller: 'TestpageCtrl'});
    $routeProvider.when('/submissions/:taskName', {templateUrl: 'views/submissions.html', controller: 'TaskpageCtrl'});
    $routeProvider.when('/stats/:taskName', {templateUrl: 'views/stats.html', controller: 'TaskpageCtrl'});
    $routeProvider.when('/signup', {templateUrl: 'views/signup.html', controller: 'SignupCtrl'});
    $routeProvider.otherwise({redirectTo: '/overview'});
  }])
  .filter('capitalize', function() {
    return function(input) {
      var arr = input.split(' '), ret = "";
      for (var i=0; i<arr.length; i++) {
        if (i > 0) ret += " ";
        ret += arr[i].charAt(0).toUpperCase() + arr[i].slice(1).toLowerCase();
      }
      return ret;
    }
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
      if(input == "Correct")
        return "sub-full";
      if(input == "Not correct")
        return "sub-zero";
      return "sub-partial";
    }
  })
  .filter('timeFmt', function() {
    return function(input) {
      return input.toFixed(3) + "s";
    }
  })
  .filter('memoryFmt', function() {
    return function(input) {
      if(input>1024*1024)
        return (input/(1024*1024)).toFixed(1) + " MiB";
      else if(input>1024)
        return (input/1024).toFixed(0) + " KiB";
      return input + " B";
    }
  });
