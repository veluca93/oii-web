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

angular.module('aws.ranking', [])
    .controller('RankingCtrl', ['$scope', '$routeParams', '$http', 'dataStore', 'navService', function($scope, $routeParams, $http, store, nav) {

        nav.set_active($routeParams.contestId);

        store.get("Contest", $routeParams.contestId).then(function(contest) {
            $scope.contest = contest;
        });
        store.get_collection("User", {contest: $routeParams.contestId}).then(function(users) {
            $scope.users = users;
            $scope.user_list = [];
            angular.forEach(users, function(value) {
                $scope.user_list.push(value);
            });
        });
        store.get_collection("Task", {contest: $routeParams.contestId}).then(function(tasks) {
            $scope.tasks = tasks;
            $scope.task_list = [];
            angular.forEach(tasks, function(value) {
                $scope.task_list.push(value);
            })
        });

        $scope.load = function() {
            $http.get('ranking/' + $routeParams.contestId + '/json').success(function(data) {
                $scope.data = data;
            });
        };
        $scope.load();

        $scope.active_key = "username";
        $scope.reversed = false;

        $scope.getActiveValue = function(user) {
            // TODO Add first_ and last_name.
            if ($scope.active_key == "contest") {
                // Negative because we want it to be in ascending order
                // of rank and therefore descending order of score.
                return -$scope.data[user._ref].score;
            } else if ($scope.active_key == "username") {
                return user.username;
            } else {
                // Negative because we want it to be in ascending order
                // of rank and therefore descending order of score.
                return -$scope.data[user._ref].tasks[$scope.active_key].score;
            }
        };

        $scope.getUsername = function(user) {
            return user.username;
        };

        $scope.setActiveKey = function(key, reversed) {
            $scope.active_key = key;
            $scope.reversed = reversed;
        };

        $scope.isActiveKey = function(key, reversed) {
            return key == $scope.active_key && reversed == $scope.reversed;
        };

        $scope.getContestScore = function(user) {
            if (angular.isUndefined($scope.data)) {
                return 0;
            }
            return $scope.data[user._ref].score;
        };

        $scope.getTaskScore = function(user, task) {
            if (angular.isUndefined($scope.data)) {
                return 0;
            }
            return $scope.data[user._ref].tasks[task._ref].score;
        };

        $scope.isContestPartial = function(user) {
            if (angular.isUndefined($scope.data)) {
                return false;
            }
            return $scope.data[user._ref].partial;
        };

        $scope.isTaskPartial = function(user, task) {
            if (angular.isUndefined($scope.data)) {
                return false;
            }
            return $scope.data[user._ref].tasks[task._ref].partial;
        };

    }]);
