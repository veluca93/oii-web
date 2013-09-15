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

angular.module('aws.dataset', [])
    .controller('DatasetListCtrl', ['$scope', '$routeParams', '$location', '$q', '$http', '$dialog', 'dataStore', 'rpcRequest', 'notificationHub', 'navService', function($scope, $routeParams, $location, $q, $http, $dialog, store, rpc, hub, nav) {

        $scope.load = function() {
            store.get("Task", $routeParams.taskId).then(function(task) {
                $scope.task = task;
                nav.set_active(task.contest);
                store.get("Contest", task.contest).then(function(contest) {
                    $scope.contest = contest;
                });
            });
            store.get_collection("Dataset", {task: $routeParams.taskId}).then(function(datasets) {
                $scope.datasets = datasets;
                $scope.dataset_list = [];
                angular.forEach(datasets, function(value) {
                    $scope.dataset_list.push(value);
                });
            });
        };
        $scope.load();


        $scope.promptCreateDataset = function() {
            $dialog.dialog({
                templateUrl: 'partials/dataset_create.html',
                controller: 'DatasetCreateCtrl',
                dialogFade: true,
                backdropFade: true,
                keyboard: true,
                backdrop: true,
                backdropClick: true,
                resolve: {
                    task: function() {
                        return $q.when($scope.task);
                    },
                },
            }).open();
        };

        $scope.promptCloneDataset = function(dataset) {
            $dialog.dialog({
                templateUrl: 'partials/dataset_clone.html',
                controller: 'DatasetCloneCtrl',
                dialogFade: true,
                backdropFade: true,
                keyboard: true,
                backdrop: true,
                backdropClick: true,
                resolve: {
                    dataset: function() {
                        return $q.when(dataset);
                    },
                },
            }).open();
        };

        $scope.promptDeleteDataset = function(dataset) {
            $dialog.dialog({
                templateUrl: 'partials/dataset_delete.html',
                controller: 'DatasetDeleteCtrl',
                dialogFade: true,
                backdropFade: true,
                keyboard: true,
                backdrop: true,
                backdropClick: true,
                resolve: {
                    dataset: function() {
                        return $q.when(dataset);
                    },
                },
            }).open().then(function(result) {
                if (result == "done") {
                    $scope.load();
                }
            });
        };


        $scope.recompileDataset = function(dataset) {
            rpc.request("EvaluationService", 0, "invalidate_submission", {dataset_id: dataset._ref, level: "compilation"}).then(function(result) {
                // We expect result to be null.
                hub.notify_oneshot("success", "Recompilation queued");
                $location.url("/submissions/?task_id=" + $scope.task._ref + "&dataset_id=" + dataset._ref);
            }, function(reason) {
                hub.notify_oneshot("error", "Couldn't recompile", reason);
            });
        };

        $scope.reevaluateDataset = function(dataset) {
            rpc.request("EvaluationService", 0, "invalidate_submission", {dataset_id: dataset._ref, level: "evaluation"}).then(function(result) {
                // We expect result to be null.
                hub.notify_oneshot("success", "Reevaluation queued");
                $location.url("/submissions/?task_id=" + $scope.task._ref + "&dataset_id=" + dataset._ref);
            }, function(reason) {
                hub.notify_oneshot("error", "Couldn't reevaluate", reason);
            });
        };

        $scope.rescoreDataset = function(dataset) {
            rpc.request("ScoringService", 0, "invalidate_submission", {dataset_id: dataset._ref}).then(function(result) {
                // We expect result to be null.
                hub.notify_oneshot("success", "Rescore queued");
                $location.url("/submissions/?task_id=" + $scope.task._ref + "&dataset_id=" + dataset._ref);
            }, function(reason) {
                hub.notify_oneshot("error", "Couldn't rescore", reason);
            });
        };

        $scope.enableDataset = function(dataset) {
            $http.put("datasets/" + dataset._ref + "/enable", "").then(function() {
                dataset.autojudge = true;
            });
        };

        $scope.disableDataset = function(dataset) {
            $http.put("datasets/" + dataset._ref + "/disable", "").then(function() {
                dataset.autojudge = false;
            });
        };

    }])
    .controller('DatasetCreateCtrl', ['$scope', '$location', 'dialog', 'dataStore', 'task', function($scope, $location, dialog, store, task) {

        $scope.close = function() {
            dialog.close();
        };

        $scope.dataset = {task: task._ref};

        $scope.create = function() {
            store.create("Dataset", $scope.dataset).then(function(ref, obj) {
                $location.url("/datasets/" + ref);
                dialog.close("done");
            });
        };

    }])
    .controller('DatasetCloneCtrl', ['$scope', '$location', 'dialog', '$http', 'dataset', function($scope, $location, dialog, $http, dataset) {

        $scope.close = function() {
            dialog.close();
        };

        $scope.dataset = dataset;
        $scope.description = "Copy of " + dataset.description;
        $scope.clone_results = false;

        $scope.clone = function() {
            var options = {description: $scope.description, clone_results: $scope.clone_results};
            $http.post("datasets/" + dataset._ref + "/clone", options).then(function(response) {
                var ref = response.headers('Location').split('/').pop();
                $location.url("/datasets/" + ref);
                dialog.close("done");
            });
        };

    }])
    .controller('DatasetDeleteCtrl', ['$scope', '$location', 'dialog', 'dataStore', 'dataset', function($scope, $location, dialog, store, dataset) {

        $scope.close = function() {
            dialog.close();
        };

        $scope.dataset = dataset;

        $scope.delete = function() {
            store.delete("Dataset", dataset._ref).then(function() {
                dialog.close("done");
            });
        };

    }])
    .controller('DatasetActivateCtrl', ['$scope', '$routeParams', '$location', '$http', '$dialog', 'dataStore', 'navService', function($scope, $routeParams, $location, $http, $dialog, store, nav) {

        $scope.close = function() {
            dialog.close();
        };

        $scope.load = function() {
            store.get("Dataset", $routeParams.datasetId).then(function(new_dataset) {
                $scope.new_dataset = new_dataset;
                store.get("Task", new_dataset.task).then(function(task) {
                    $scope.task = task;
                    nav.set_active(task.contest);
                    store.get("Contest", task.contest).then(function(contest) {
                        $scope.contest = contest;
                    });
                    store.get("Dataset", task.active_dataset).then(function(old_dataset) {
                        $scope.old_dataset = old_dataset;
                        $http.get("datasets/" + old_dataset._ref + "/diff/" + new_dataset._ref).success(function(data) {
                            $scope.submission_list = data;
                        });
                    });
                });
            });
            store.get_collection("User", {}).then(function(users) {
                $scope.users = users;
                $scope.user_list = [];
                angular.forEach(users, function(value) {
                    $scope.user_list.push(value);
                });
            });
        };
        $scope.load();

        $scope.getUsername = function(submission) {
            return $scope.users[submission.user].username;
        };

        $scope.showDetails = function(submission, dataset) {
            $dialog.dialog({
                templateUrl: 'partials/submission.html',
                controller: 'SubmissionDetailsCtrl',
                dialogFade: true,
                backdropFade: true,
                keyboard: true,
                backdrop: true,
                backdropClick: true,
                resolve: {
                    submission: function() {
                        return $http.get("submissions/" + submission._ref, {params: {dataset_id: dataset._ref}}).then(function(response) {return response.data;});
                    },
                },
            }).open();
        };

    }])
    .controller('DatasetCtrl', ['$scope', '$routeParams', '$dialog', 'dataStore', 'navService', '$q', function($scope, $routeParams, $dialog, store, nav, $q) {

        store.get("Dataset", $routeParams.datasetId).then(function(dataset) {
            $scope.master = dataset;
            $scope.resetDataset();
            store.get("Task", dataset.task).then(function(task) {
                nav.set_active(task.contest);
                $scope.task = task;
                store.get("Contest", task.contest).then(function(contest) {
                    $scope.contest = contest;
                });
            });
        });

        $scope.resetDataset = function () {
            $scope.dataset = angular.copy($scope.master);
        };

        $scope.submitDataset = function () {
            store.update("Dataset", $scope.dataset._ref, $scope.dataset).then(function (obj) {
                $scope.master = angular.copy(obj);
            });
        };

        $scope.isUnchanged = function () {
            return angular.equals($scope.task, $scope.master);
        };

    }]);
