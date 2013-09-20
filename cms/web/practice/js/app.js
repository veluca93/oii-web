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
angular.module('pws', ['ui.bootstrap', 'pws.navbar', 'pws.overview', 'pws.tasks', 'pws.signup', 'pws.signin', 'pws.footer'])
  .config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
    $locationProvider.html5Mode(false);
    $locationProvider.hashPrefix('!');

    $routeProvider.when('/overview', {templateUrl: 'views/overview.html'});
    $routeProvider.when('/tasks', {templateUrl: 'views/tasks.html'});
    $routeProvider.when('/signup', {templateUrl: 'views/signup.html'});
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
  });
