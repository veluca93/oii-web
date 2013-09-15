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

/* Controllers */

angular.module('aws.overview', [])
    .controller('OverviewCtrl', ['$scope', function ($scope) {

    }]).
    directive('rpcPoll', ['$timeout', 'rpcRequest', function ($timeout, rpc) {
        var directiveDefinitionObject = {
            restrict: 'A',
            scope: {
                timeout: "@rpcPoll",
                service: "@rpcService",
                shard: "@rpcShard",
                method: "@rpcMethod",
                args: "@rpcArgs",
                result: "=data",
                error: "=error",
            },
            link: function($scope) {
                var last_check = null;
                var timeout_id = null;

                // An RPC will be fired after the previous one returned, but no sooner than `timeout' seconds after the previous one started.
                // That is, RPC will start at least `timeout' second apart, and there'll never be two of them running at the same time.
                var poll = function() {
                    last_check = Date.now();

                    rpc.request($scope.service, $scope.shard, $scope.method, angular.fromJson($scope.args)).then(function(data) {
                        $scope.result = data;
                        timeout_id = $timeout(poll, Math.max(0, last_check + parseInt($scope.timeout) * 1000 - Date.now()));
                    }, function(reason) {
                        $scope.error = reason;
                    });
                };

                $scope.$evalAsync(poll);
                $scope.$on("$destroy", function() {
                    $timeout.cancel(timeout_id);
                });
            },
        };
        return directiveDefinitionObject;
    }]).
    directive('submissionStatus', [function () {
        var directiveDefinitionObject = {
            restrict: 'E',
            scope: {
                stats: "=data",
            },
            templateUrl: 'partials/submission_status.html',
            replace: true,
            link: function($scope) {
                if (angular.isUndefined($scope.stats)) {
                    $scope.stats = {
                        scored: 0,
                        evaluated: 0,
                        compilation_fail: 0,
                        compiling: 0,
                        evaluating: 0,
                        max_compilations: 0,
                        max_evaluations: 0,
                        invalid: 0
                    };
                }

                $scope.isNotZero = function(category) {
                    return $scope.stats[category] != 0;
                };
            },
        };
        return directiveDefinitionObject;
    }]).
    directive('queueStatus', [function () {
        var directiveDefinitionObject = {
            restrict: 'E',
            scope: {
                queue: "=data",
            },
            templateUrl: 'partials/queue_status.html',
            replace: true,
            link: function($scope) {
                if (angular.isUndefined($scope.queue)) {
                    $scope.queue = [];
                }

                $scope.isQueueEmpty = function() {
                    return $scope.queue.length == 0;
                };
            },
        };
        return directiveDefinitionObject;
    }]).
    directive('workersStatus', [function () {
        var directiveDefinitionObject = {
            restrict: 'E',
            scope: {
                workers: "=data",
            },
            templateUrl: 'partials/workers_status.html',
            replace: true,
            link: function($scope) {
                if (angular.isUndefined($scope.workers)) {
                    $scope.workers = {};
                }

                $scope.areWorkersAvailable = function() {
                    return Object.keys($scope.workers).length > 0;
                };
            },
        };
        return directiveDefinitionObject;
    }]).
    directive('recentLogs', [function () {
        var directiveDefinitionObject = {
            restrict: 'E',
            scope: {
                logs: "=data",
            },
            templateUrl: 'partials/recent_logs.html',
            replace: true,
            link: function($scope) {
                if (angular.isUndefined($scope.logs)) {
                    $scope.logs = [];
                }

                $scope.areLogsAvailable = function() {
                    return $scope.logs.length > 0;
                };
            },
        };
        return directiveDefinitionObject;
    }]).
    filter('jobPriority', [function() {
        return function(value) {
            switch (value) {
                case 0:
                    return "Extra high";
                case 1:
                    return "High";
                case 2:
                    return "Medium";
                case 3:
                    return "Low";
                case 4:
                    return "Extra low";
                default:
                    return value;
            }
        };
    }]).
    filter('jobDescription', [function() {
        return function(value) {
            if (!(angular.isArray(value) && value.length == 3 && angular.isString(value[0]) && angular.isNumber(value[1]) && angular.isNumber(value[2]))) {
                return value;
            }

            var job_type = "";
            var object_type = "";

            if (value[0] == 'compile') {
                job_type = 'Compiling';
                object_type = 'submission';
            } else if (value[0] == 'evaluate') {
                job_type = 'Evaluating';
                object_type = 'submission';
            } else if (value[0] == 'compile_test') {
                job_type = 'Compiling';
                object_type = 'user_test';
            } else if (value[0] == 'evaluate_test') {
                job_type = 'Evaluating';
                object_type = 'user_test';
            } else {
                return value;
            }

            return job_type + ' the result of ' + object_type + ' ' + value[1] + ' on dataset ' + value[2];
        };
    }]).
    filter('logSeverity', [function() {
        return function(value) {
            switch (value) {
                case "CRITICAL":
                    return "Critical";
                case "ERROR":
                    return "Error";
                case "WARNING":
                    return "Warning";
                default:
                    return value;
            }
        };
    }]);
