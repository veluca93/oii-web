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

angular.module('aws.user', [])
    .controller('UserListCtrl', ['$scope', '$routeParams', '$location', '$q', '$dialog', 'dataStore', 'rpcRequest', 'notificationHub', 'navService', function($scope, $routeParams, $location, $q, $dialog, store, rpc, hub, nav) {

        nav.set_active($routeParams.contestId);
        store.get("Contest", $routeParams.contestId).then(function(contest) {
            $scope.contest = contest;
        });
        store.get_collection("User", {contest: $routeParams.contestId}).then(function(users) {
            $scope.users = [];
            angular.forEach(users, function(value) {
                $scope.users.push(value);
            });
        });


        $scope.createUser = function() {
            $dialog.dialog({
                templateUrl: 'partials/user_create.html',
                controller: 'UserCreateCtrl',
                dialogFade: true,
                backdropFade: true,
                keyboard: true,
                backdrop: true,
                backdropClick: true,
                resolve: {
                    contest: function() {
                        return $q.when($scope.contest);
                    },
                },
            }).open();
        };


        $scope.recompile = function(user_id) {
            rpc.request("EvaluationService", 0, "invalidate_submission", {user_id: user_id, level: "compilation"}).then(function(result) {
                // We expect result to be null.
                hub.notify_oneshot("success", "Recompilation queued");
                $location.url("/submissions/?user_id=" + user_id);
            }, function(reason) {
                hub.notify_oneshot("error", "Couldn't recompile", reason);
            });
        };

        $scope.reevaluate = function(user_id) {
            rpc.request("EvaluationService", 0, "invalidate_submission", {user_id: user_id, level: "evaluation"}).then(function(result) {
                // We expect result to be null.
                hub.notify_oneshot("success", "Reevaluation queued");
                $location.url("/submissions/?user_id=" + user_id);
            }, function(reason) {
                hub.notify_oneshot("error", "Couldn't reevaluate", reason);
            });
        };

        $scope.rescore = function(user_id) {
            rpc.request("ScoringService", 0, "invalidate_submission", {user_id: user_id}).then(function(result) {
                // We expect result to be null.
                hub.notify_oneshot("success", "Rescore queued");
                $location.url("/submissions/?user_id=" + user_id);
            }, function(reason) {
                hub.notify_oneshot("error", "Couldn't rescore", reason);
            });
        };

        $scope.sort_key = "username";

        $scope.isSortKey = function(key) {
            return key == $scope.sort_key ? "active-sort-key" : "";
        };

        $scope.setSortKey = function(key) {
            $scope.sort_key = key;
        };

    }])
    .controller('UserCreateCtrl', ['$scope', '$location', 'dialog', 'dataStore', 'contest', function($scope, $location, dialog, store, contest) {

        $scope.close = function() {
            dialog.close();
        };

        $scope.user = {contest: contest._ref};

        $scope.create = function() {
            store.create("User", $scope.user).then(function(ref, obj) {
                $location.url("/users/" + ref);
                dialog.close();
            });
        };

    }])
    .controller('UserCtrl', ['$scope', '$routeParams', 'dataStore', 'navService', function($scope, $routeParams, store, nav) {

        store.get("User", $routeParams.userId).then(function(user) {
            nav.set_active(user.contest);
            $scope.master = user;
            $scope.resetUser();
            $scope.contest = store.get("Contest", user.contest);
        });

        $scope.resetUser = function () {
            $scope.user = angular.copy($scope.master);
        };

        $scope.submitUser = function () {
            store.update("User", $scope.user._ref, $scope.user).then(function (obj) {
                $scope.master = angular.copy(obj);
            });
        };

        $scope.isUnchanged = function () {
            return angular.equals($scope.user, $scope.master);
        };

    }]);
