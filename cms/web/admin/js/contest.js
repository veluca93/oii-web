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

angular.module('aws.contest', [])
    .controller('ContestListCtrl', ['$scope', '$location', '$dialog', 'dataStore', 'rpcRequest', 'notificationHub', function($scope, $location, $dialog, store, rpc, hub) {

        $scope.contests = store.get_collection("Contest", {});


        $scope.createContest = function() {
            $dialog.dialog({
                templateUrl: 'partials/contest_create.html',
                controller: 'ContestCreateCtrl',
                dialogFade: true,
                backdropFade: true,
                keyboard: true,
                backdrop: true,
                backdropClick: true,
            }).open();
        };


        $scope.recompile = function(contest_id) {
            // FIXME ES isn't contest-agnostic: we can just hope it has been started for the contest we're invalidating.
            rpc.request("EvaluationService", 0, "invalidate_submission", {level: "compilation"}).then(function(result) {
                // We expect result to be null.
                hub.notify_oneshot("success", "Recompilation queued");
                $location.url("/submissions/?contest_id=" + contest_id);
            }, function(reason) {
                hub.notify_oneshot("error", "Couldn't recompile", reason);
            });
        };

        $scope.reevaluate = function(contest_id) {
            // FIXME ES isn't contest-agnostic: we can just hope it has been started for the contest we're invalidating.
            rpc.request("EvaluationService", 0, "invalidate_submission", {level: "evaluation"}).then(function(result) {
                // We expect result to be null.
                hub.notify_oneshot("success", "Reevaluation queued");
                $location.url("/submissions/?contest_id=" + contest_id);
            }, function(reason) {
                hub.notify_oneshot("error", "Couldn't reevaluate", reason);
            });
        };

        $scope.rescore = function(contest_id) {
            rpc.request("ScoringService", 0, "invalidate_submission", {contest_id: contest_id}).then(function(result) {
                // We expect result to be null.
                hub.notify_oneshot("success", "Rescore queued");
                $location.url("/submissions/?contest_id=" + contest_id);
            }, function(reason) {
                hub.notify_oneshot("error", "Couldn't rescore", reason);
            });
        };

    }])
    .controller('ContestCreateCtrl', ['$scope', '$location', 'dialog', 'dataStore', function($scope, $location, dialog, store) {

        $scope.close = function() {
            dialog.close();
        };

        $scope.contest = {};

        $scope.create = function() {
            store.create("Contest", $scope.contest).then(function(ref, obj) {
                $location.url("/contests/" + ref);
                dialog.close();
            });
        };

    }])
    .controller('ContestCtrl', ['$scope', '$routeParams', 'dataStore', 'navService', function($scope, $routeParams, store, nav) {

        nav.set_active($routeParams.contestId);
        store.get("Contest", $routeParams.contestId).then(function(contest) {
            $scope.master = contest;
            $scope.resetContest();
        });

        $scope.resetContest = function () {
            $scope.contest = angular.copy($scope.master);
        };

        $scope.submitContest = function () {
            store.update("Contest", $scope.contest._ref, $scope.contest).then(function (obj) {
                $scope.master = angular.copy(obj);
            });
        };

        $scope.isUnchanged = function () {
            return angular.equals($scope.contest, $scope.master);
        };

    }]);
