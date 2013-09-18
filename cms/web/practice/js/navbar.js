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

angular.module('pws.navbar', [])
    .directive('navbar', ['$location', '$route', function($location, $route) {
        return {
            restrict: 'E',
            scope: {},
            templateUrl: 'partials/navbar.html',
            replace: true,
            transclude: true,
            controller: ['$scope', '$route', '$element', '$attrs', '$transclude', function($scope, $route, $element, $attrs, $transclude) {
                $scope.active_page = undefined;

                //~ nav.active_change_listeners.push(function(contest_ref) {
                    //~ $scope.active_contest_id = contest_ref;
                    //~ $scope.update();
                //~ });

                //~ nav.unread_change_listeners.push(function(contest_ref, value) {
                    //~ if (value == 0) {
                        //~ $scope.unread_count[contest_ref] = "";
                    //~ } else {
                        //~ $scope.unread_count[contest_ref] = value.toFixed(0);
                    //~ }
                //~ });

                $scope.update = function() {
                    $scope.active_page = 0;
                    //~ $scope.active_subpage = undefined;

                    //~ console.log($location.path());
                    if ($location.path() == "/overview") {
                        $scope.active_page = 1;
                    } else if ($location.path() == "/signup") {
                        $scope.active_page = 2;
                    } else if ($location.path().indexOf("/tasks") == 0) {
                        $scope.active_page = 3;
                    }
                }

                $scope.$on('$routeChangeSuccess', $scope.update);

                //~ $scope.navigate = function() {
                    //~ if ($scope.active_contest_id >= 0) {
                        //~ $location.path("/contests/" + $scope.active_contest_id);
                    //~ } else {
                        //~ $scope.active_contest_id = -$scope.active_page;
                    //~ }
                //~ };

                $scope.isActivePage = function(page) {
                    return page == $scope.active_page;
                }

                //~ $scope.isActiveSubpage = function(subpage) {
                    //~ return subpage == $scope.active_subpage;
                //~ }

                $scope.update();
            }],
        };
    }]);
