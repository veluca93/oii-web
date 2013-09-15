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

angular.module('aws.notifications', [])
    .factory('notificationHub', [function() {
        var handlers = new Array();

        var service = {
            register_handler: function(callback) {
                handlers.push(callback);
            },

            notify_oneshot: function(level, head, body) {
                angular.forEach(handlers, function(item) {
                    item.call(this, level, head, body);
                });
            },
        };
        return service;
    }])
    .directive('notificationBox', ['notificationHub', function(hub) {
        var directiveDefinitionObject = {
            restrict: 'E',
            scope: {},
            template: '<div>\
<div ng-repeat="n in notifications" ng-class="getClass(n.level)">\
<button type="button" class="close" ng-click="close($index)">&times;</button> <strong>{{n.head}}</strong> {{n.body}} \
</div>\
</div>',
            controller: ['$scope', '$element', '$attrs', '$transclude', function($scope, $element, $attrs, $transclude) {
                $scope.notifications = new Array();

                $scope.getClass = function(level) {
                    if (level == "error") {
                        return "alert alert-danger";
                    } else if (level == "warning") {
                        return "alert";
                    } else if (level == "success") {
                        return "alert alert-success";
                    } else if (level == "info") {
                        return "alert alert-info";
                    }
                }

                hub.register_handler(function(level, head, body) {
                    $scope.notifications.push({level: level, head: head, body: body});
                });

                $scope.close = function(idx) {
                    $scope.notifications.splice(idx, 1);
                };
            }],
        };
        return directiveDefinitionObject;
    }]);
