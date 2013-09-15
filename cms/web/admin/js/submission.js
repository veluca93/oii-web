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

angular.module('aws.submission', [])
    .controller('SubmissionListCtrl', ['$http', '$scope', '$routeParams', '$location', '$dialog', 'dataStore', 'rpcRequest', 'notificationHub', 'navService', function($http, $scope, $routeParams, $location, $dialog, store, rpc, hub, nav) {

        $scope.pages_total = 1;
        $scope.pages_current = 1;

        $scope.load = function() {
            $http.get("submissions/", {params: $routeParams}).success(function(data) {
                $scope.submissions = data;
                $scope.pages_total = Math.max(1, Math.ceil(data.length / 20));
            });
        };
        $scope.load();

        $scope.fetch_contest = function() {
            nav.set_active($scope.contest_id);
            store.get("Contest", $scope.contest_id).then(function(contest) {
                $scope.contest = contest;
                $scope.loadUsers();
                $scope.loadTasks();
            });
        };

        if ("contest_id" in $routeParams) {
            $scope.contest_id = $routeParams.contest_id;
            $scope.fetch_contest();
        }
        if ("user_id" in $routeParams) {
            store.get("User", $routeParams.user_id).then(function(user) {
                $scope.user = user;
                if (angular.isUndefined($scope.contest_id)) {
                    $scope.contest_id = user.contest;
                    $scope.fetch_contest();
                }
            });
        }
        if ("task_id" in $routeParams) {
            store.get("Task", $routeParams.task_id).then(function(task) {
                $scope.task = task;
                if (angular.isUndefined($scope.contest_id)) {
                    $scope.contest_id = task.contest;
                    $scope.fetch_contest();
                }
            });
            store.get_collection("Dataset", {task: $routeParams.task_id}).then(function(datasets) {
                $scope.datasets = datasets;
                $scope.dataset_list = [];
                angular.forEach(datasets, function(value) {
                    $scope.dataset_list.push(value);
                });
            });
        }

        $scope.isUserGiven = function() {
            return "user_id" in $routeParams;
        };

        $scope.isTaskGiven = function() {
            return "task_id" in $routeParams;
        };

        $scope.loadUsers = function() {
            store.get_collection("User", {contest: $scope.contest._ref}).then(function(users) {
                $scope.users = users;
                $scope.user_list = [];
                angular.forEach(users, function(value) {
                    $scope.user_list.push(value);
                });
            });
        };

        $scope.loadTasks = function() {
            store.get_collection("Task", {contest: $scope.contest._ref}).then(function(tasks) {
                $scope.tasks = tasks;
                $scope.task_list = [];
                angular.forEach(tasks, function(value) {
                    $scope.task_list.push(value);
                });
            });
        };

        $scope.hasScore = function(submission) {
            return angular.isNumber(submission.score);
        };

        $scope.getScoreClass = function(submission) {
            if (submission.score <= 0) {
                return "danger";
            } else if (submission.score >= submission.max_score) {
                return "success";
            } else {
                return "warning";
            }
        };

        $scope.getColspan = function(submission) {
            return $scope.hasScore(submission) ? "1" : "2";
        };

        $scope.getStatus = function(submission) {
            var result = "";
            if (submission.compilation_outcome == null) {
                result = "Compiling...";
                if (submission.compilation_tries > 0) {
                    result += " (" + submission.compilation_tries + " attempts failed)";
                }
            } else if (submission.compilation_outcome == false) {
                if (submission.score == null) {
                    result = "Scoring...";
                } else {
                    result = "Compilation failed";
                }
            } else {
                if (submission.evaluation_outcome == null) {
                    result = "Evaluating...";
                    if (submission.evaluation_tries > 0) {
                        result += " (" + submission.evaluation_tries + " attempts failed)";
                    }
                } else {
                    if (submission.score == null) {
                        result = "Scoring...";
                    } else {
                        result = "Evaluation done";
                    }
                }
            }
            return result;
        };

        $scope.isNoTaskInUrl = function() {
            return angular.isUndefined($routeParams.task_id) ? "disabled" : "";
        };

        $scope.isTaskInUrl = function(task_ref) {
            return task_ref == $routeParams.task_id ? "disabled" : "";
        };

        $scope.removeTasksFromUrl = function() {
            var url = $location.url();
            var part = new RegExp("[?&]task_id=[0-9]+(?=&|$)", "g");
            return url.replace(part, "");
        };

        $scope.removeDatasetsFromUrl = function() {
            var url = $location.url();
            var part = new RegExp("[?&]dataset_id=[0-9]+(?=&|$)", "g");
            return url.replace(part, "");
        };

        $scope.removeTasksAndDatasetsFromUrl = function() {
            var url = $location.url();
            var part1 = new RegExp("[?&]task_id=[0-9]+(?=&|$)", "g");
            var part2 = new RegExp("[?&]dataset_id=[0-9]+(?=&|$)", "g");
            return url.replace(part1, "").replace(part2, "");
        };

        $scope.addTaskToUrl = function(task_ref) {
            if ($scope.isTaskInUrl(task_ref)) {
                return $location.url();
            }
            var url = $scope.removeTasksAndDatasetsFromUrl();
            var part = "task_id=" + task_ref;
            if (url.indexOf("?") != -1) {
                return url + "&" + part;
            } else {
                return url + "?" + part;
            }
        };

        $scope.addDatasetToUrl = function(dataset_ref) {
            var url = $scope.removeDatasetsFromUrl();
            if ($scope.task.active_dataset == dataset_ref) {
                return url;
            }
            var part = "dataset_id=" + dataset_ref;
            if (url.indexOf("?") != -1) {
                return url + "&" + part;
            } else {
                return url + "?" + part;
            }
        };

        $scope.datasetClass = function(dataset_ref) {
            var result = "";
            if (angular.isUndefined($routeParams.dataset_id)) {
                if (dataset_ref == $scope.task.active_dataset) {
                    result += "disabled";
                }
            } else {
                if (dataset_ref == $routeParams.dataset_id) {
                    result += "disabled";
                }
            }
            if ($scope.task.active_dataset == dataset_ref) {
                result += " active-dataset";
            }
            return result;
        };

        $scope.recompile = function(submission_id) {
            rpc.request("EvaluationService", 0, "invalidate_submission", {submission_id: submission_id, level: "compilation"}).then(function(result) {
                // We expect result to be null.
                hub.notify_oneshot("success", "Recompilation queued");
                $scope.load();
            }, function(reason) {
                hub.notify_oneshot("error", "Couldn't recompile", reason);
            });
        };

        $scope.reevaluate = function(submission_id) {
            rpc.request("EvaluationService", 0, "invalidate_submission", {submission_id: submission_id, level: "evaluation"}).then(function(result) {
                // We expect result to be null.
                hub.notify_oneshot("success", "Reevaluation queued");
                $scope.load();
            }, function(reason) {
                hub.notify_oneshot("error", "Couldn't reevaluate", reason);
            });
        };

        $scope.rescore = function(submission_id) {
            rpc.request("ScoringService", 0, "invalidate_submission", {submission_id: submission_id}).then(function(result) {
                // We expect result to be null.
                hub.notify_oneshot("success", "Rescore queued");
                $scope.load();
            }, function(reason) {
                hub.notify_oneshot("error", "Couldn't rescore", reason);
            });
        };

        $scope.showDetails = function(submission_id, dataset_id) {
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
                        return $http.get("submissions/" + submission_id, {params: {dataset_id: dataset_id}}).then(function(response) {return response.data;});
                    },
                },
            }).open();
        };

    }])
    .controller('SubmissionDetailsCtrl', ['$http', '$scope', '$routeParams', 'dialog', 'submission', function($http, $scope, $routeParams, dialog, submission) {

        $scope.submission = submission;

        $scope.close = function() {
            dialog.close();
        };

        $scope.isScored = function() {
            return $scope.submission.score !== null;
        };

        $scope.isEvaluated = function() {
            return $scope.submission.evaluation_outcome !== null;
        };

        $scope.isCompiled = function() {
            return $scope.submission.compilation_outcome !== null;
        };

        $scope.getScoreLabelClass = function() {
            if ($scope.submission.score <= 0) {
                return "label-danger";
            } else if ($scope.submission.score >= $scope.submission.max_score) {
                return "label-success";
            } else {
                return "label-warning";
            }
        };

    }])
    .directive('pimpedUpScoreDetails', [function() {
        var directiveDefinitionObject = {
            restrict: 'E',
            scope: {
                data: "=data",
            },
            template: '<div class="score-details-sandbox" ng-bind-html-unsafe="data"></div>',
            replace: true,
            link: function($scope, elem) {
                $scope.$watch("data", function() {
                    $scope.$evalAsync(function () {
                        elem.find(".subtask .subtask-head").each(function () {
                            $(this).prepend("<span class=\"glyphicon glyphicon-chevron-right\"></span>");
                        });
                        elem.find(".subtask .subtask-head").click(function () {
                            $(this).parent().toggleClass("open");
                            $(this).children(".glyphicon").toggleClass("glyphicon-chevron-down glyphicon-chevron-right");
                        });
                        elem.find("table.testcase-list").addClass("table table-bordered table-striped");
                        elem.find("table.testcase-list tbody tr:not(.undefined) td:nth-child(1)").each(function () {
                            $(this).html("<span class=\"outcome\">" + $(this).text() + "</span>");
                        });
                    });
                });
            },
        };
        return directiveDefinitionObject;
    }]).
    filter('roundToStr', [function() {
        return function(value, precision) {
            if (angular.isNumber(value)) {
                if (precision == 0) {
                    return value.toFixed(precision);
                } else {
                    return value.toFixed(precision).replace(/\.?0+$/, "");
                }
            } else {
                return value;
            }
        };
    }]).
    filter('executionTime', [function() {
        return function(value) {
            if (angular.isNumber(value)) {
                // Round to 3 fractional digits.
                return value.toFixed(3) + " s";
            } else {
                return value;
            }
        };
    }]).
    filter('memoryUsed', [function() {
        var units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

        return function(value) {
            if (angular.isNumber(value)) {
                value = Math.round(value);

                if (value == 0) {
                    return "0 B";
                }

                var idx = 0;
                for (var i = 0; i < units.length; i += 1) {
                    if (value < 1024) {
                        break;
                    } else {
                        value /= 1024;
                        idx += 1;
                    }
                }

                // Round to 3 significant digits, except [1000, 1023).
                // Strip off trailing zeros and add unit.
                if (value < 10) {
                    return value.toFixed(2).replace(/\.?0+$/, "") + " " + units[idx];
                } else if (value < 100) {
                    return value.toFixed(1).replace(/\.?0+$/, "") + " " + units[idx];
                } else {
                    return value.toFixed(0) + " " + units[idx];
                }
            } else {
                return value;
            }
        };
    }]).
    filter('booleanSuccessFailure', [function() {
        return function(value) {
            if (value === true) {
                return "Success";
            } else if (value === false) {
                return "Failure";
            } else {
                return value;
            }
        };
    }]).
    filter('contestTime', [function() {
        return function(value, contest_start) {
            if (angular.isNumber(value) && angular.isNumber(contest_start)) {
                value -= contest_start;
                // We need to handle contests longer than 24 hours.
                var h = Math.floor(value / 3600);
                var m = Math.floor((value % 3600) / 60);
                var s = Math.floor(value % 60);
                h = "" + h;
                m = m < 10 ? "0" + m : "" + m;
                s = s < 10 ? "0" + s : "" + s;
                return (h + ":" + m + ":" + s);
            } else {
                return value;
            }
        };
    }]).
    filter('paginate', [function() {
        return function(value, page, items_per_page) {
            if (angular.isArray(value)) {
                return value.slice((page-1)*items_per_page, page*items_per_page);
            } else {
                return value;
            }
        };
    }]).
    filter('languageWildcard', [function() {
        return function(filename, language) {
            if (angular.isString(filename)) {
                return filename.replace(/\.%l$/, "." + language);
            } else {
                return filename;
            }
        };
    }]);
