/* Contest Management System
 * Copyright © 2013 Luca Wehrstedt <luca.wehrstedt@gmail.com>
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

angular.module('aws.navigation', [])
    // FIXME We depend on questionWatcher just to have it loaded and started.
    .directive('navigation', ['$location', '$route', 'dataStore', 'navService', 'questionWatcher', function($location, $route, store, nav, watcher) {
        var directiveDefinitionObject = {
            restrict: 'E',
            scope: {},
            templateUrl: 'partials/navigation.html',
            replace: true,
            transclude: true,
            controller: ['$scope', '$element', '$attrs', '$transclude', function($scope, $element, $attrs, $transclude) {
                $scope.active_page = undefined;
                $scope.active_contest = undefined;
                $scope.active_subpage = undefined;

                $scope.unread_count = {};

                // TODO Manage contests that get deleted.
                $scope._load_contests = function() {
                    store.get_collection("Contest", {}).then(function(contests) {
                        $scope.contests = contests;
                        angular.forEach(contests, function(value, key) {
                            if (angular.isUndefined($scope.unread_count[key])) {
                                $scope.unread_count[key] = "";
                            }
                        });
                    });
                };
                $scope._load_contests();

                store._reinit_listeners.push(function() {
                    $scope._load_contests();
                });

                store._action_listeners.push(function(action, cls, ref) {
                    if (cls == "Contest") {
                        $scope._load_contests();
                    }
                });

                nav.active_change_listeners.push(function(contest_ref) {
                    $scope.active_contest_id = contest_ref;
                    $scope.update();
                });

                nav.unread_change_listeners.push(function(contest_ref, value) {
                    if (value == 0) {
                        $scope.unread_count[contest_ref] = "";
                    } else {
                        $scope.unread_count[contest_ref] = value.toFixed(0);
                    }
                });

                $scope.update = function() {
                    $scope.active_page = 0;
                    $scope.active_subpage = undefined;

                    if ($location.path() == "/overview") {
                        $scope.active_page = 1;
                    } else if ($location.path() == "/resources") {
                        $scope.active_page = 2;
                    } else if ($location.path() == "/contests/") {
                        $scope.active_page = 3;
                    } else {
                        var prefix = "/contests/" + $scope.active_contest_id;
                        if ($location.path() == prefix) {
                            $scope.active_subpage = "general";
                        } else if ($location.path().indexOf(prefix + "/") == 0) {
                            $scope.active_subpage = $location.path().substr(prefix.length + 1);
                        }
                    }
                }

                $scope.$on('$routeChangeSuccess', $scope.update);

                $scope.navigate = function() {
                    if ($scope.active_contest_id >= 0) {
                        $location.path("/contests/" + $scope.active_contest_id);
                    } else {
                        $scope.active_contest_id = -$scope.active_page;
                    }
                };

                $scope.isActivePage = function(page) {
                    return page == $scope.active_page;
                }

                $scope.isActiveSubpage = function(subpage) {
                    return subpage == $scope.active_subpage;
                }

                $scope.isActiveContest = function(contest) {
                    return contest._ref == $scope.active_contest_id;
                }

                $scope.update();
            }],
        };
        return directiveDefinitionObject;
    }]).
    factory('navService', ['$rootScope', function($rootScope) {
        var self = {};

        self.active_change_listeners = [];
        self.unread_change_listeners = [];

        self.set_active = function(contest_ref) {
            angular.forEach(self.active_change_listeners, function(callback) {
                //$rootScope.$evalAsync(function() {
                    callback(contest_ref);
                //});
            });
        };

        self.set_unread = function(contest_ref, value) {
            angular.forEach(self.unread_change_listeners, function(callback) {
                //$rootScope.$evalAsync(function() {
                    callback(contest_ref, value);
                //});
            });
        };

        return self;
    }]);
