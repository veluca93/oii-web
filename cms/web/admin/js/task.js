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

angular.module('aws.task', [])
    .controller('TaskListCtrl', ['$scope', '$routeParams', '$location', '$q', '$dialog', 'dataStore', 'rpcRequest', 'notificationHub', 'navService', function($scope, $routeParams, $location, $q, $dialog, store, rpc, hub, nav) {

        nav.set_active($routeParams.contestId);
        store.get("Contest", $routeParams.contestId).then(function(contest) {
            $scope.contest = contest;
        });
        store.get_collection("Task", {contest: $routeParams.contestId}).then(function(tasks) {
            $scope.tasks = [];
            angular.forEach(tasks, function(value) {
                $scope.tasks.push(value);
            });
        });


        $scope.createTask = function() {
            $dialog.dialog({
                templateUrl: 'partials/task_create.html',
                controller: 'TaskCreateCtrl',
                dialogFade: true,
                backdropFade: true,
                keyboard: true,
                backdrop: true,
                backdropClick: true,
                resolve: {
                    contest: function() {
                        return $q.when($scope.contest);
                    },
                    num: function() {
                        var max_num = -1;
                        angular.forEach($scope.tasks, function(task) {
                            max_num = Math.max(max_num, task.num);
                        });
                        return $q.when(max_num + 1);
                    },
                },
            }).open();
        };


        $scope.recompile = function(task_id) {
            rpc.request("EvaluationService", 0, "invalidate_submission", {task_id: task_id, level: "compilation"}).then(function(result) {
                // We expect result to be null.
                hub.notify_oneshot("success", "Recompilation queued");
                $location.url("/submissions/?task_id=" + task_id);
            }, function(reason) {
                hub.notify_oneshot("error", "Couldn't recompile", reason);
            });
        };

        $scope.reevaluate = function(task_id) {
            rpc.request("EvaluationService", 0, "invalidate_submission", {task_id: task_id, level: "evaluation"}).then(function(result) {
                // We expect result to be null.
                hub.notify_oneshot("success", "Reevaluation queued");
                $location.url("/submissions/?task_id=" + task_id);
            }, function(reason) {
                hub.notify_oneshot("error", "Couldn't reevaluate", reason);
            });
        };

        $scope.rescore = function(task_id) {
            rpc.request("ScoringService", 0, "invalidate_submission", {task_id: task_id}).then(function(result) {
                // We expect result to be null.
                hub.notify_oneshot("success", "Rescore queued");
                $location.url("/submissions/?task_id=" + task_id);
            }, function(reason) {
                hub.notify_oneshot("error", "Couldn't rescore", reason);
            });
        };

        $scope.moveUpClass = function(first) {
            return first ? 'disabled' : '';
        };

        $scope.moveDownClass = function(last) {
            return last ? 'disabled' : '';
        };

    }])
    .controller('TaskCreateCtrl', ['$scope', '$location', 'dialog', 'dataStore', 'contest', 'num', function($scope, $location, dialog, store, contest, num) {

        $scope.close = function() {
            dialog.close();
        };

        $scope.task = {contest: contest._ref, num: num};

        $scope.create = function() {
            store.create("Task", $scope.task).then(function(ref, obj) {
                $location.url("/tasks/" + ref);
                dialog.close();
            });
        };

    }])
    .controller('TaskCtrl', ['$scope', '$routeParams', '$dialog', 'dataStore', 'navService', '$q', function($scope, $routeParams, $dialog, store, nav, $q) {

        store.get("Task", $routeParams.taskId).then(function(task) {
            nav.set_active(task.contest);
            $scope.master = task;
            store.get("Contest", task.contest).then(function(contest) {
                $scope.contest = contest;
            });
            store.get_collection("SubmissionFormatElement", {task: task._ref}).then(function(submission_format) {
                $scope.submission_format = {};
                $scope.master.submission_format = [];
                angular.forEach(submission_format, function(value) {
                    $scope.submission_format[value.filename] = value;
                    $scope.master.submission_format.push(value.filename);
                });
                $scope.master.submission_format.sort();
                $scope.resetTask();
            });
        });

        $scope.resetTask = function () {
            $scope.task = angular.copy($scope.master);
        };

        $scope.submitTask = function () {
            var promises = [];
            angular.forEach($scope.task.submission_format, function(item) {
                if (!item in $scope.submission_format) {
                    promises.push(store.create("SubmissionFormatElement", {filename: item}).then(function(key, obj) {
                        $scope.submission_format[item] = obj;
                    }));
                }
            });
            angular.forEach($scope.submission_format, function (value, key) {
                if ($scope.task.submission_format.indexOf(key) == -1) {
                    promises.push(store.create("SubmissionFormatElement", value._ref).then(function() {
                        delete $scope.submission_format[key];
                    }));
                }
            });
            $q.all(promises).then(function() {
                store.update("Task", $scope.task._ref, $scope.task).then(function (obj) {
                    $scope.master = angular.copy(obj);
                    $scope.master.submission_format = angular.copy($scope.task.submission_format);
                });
            });
        };

        $scope.isUnchanged = function () {
            return angular.equals($scope.task, $scope.master);
        };

        $scope.manageStatements = function() {
            $dialog.dialog({
                templateUrl: 'partials/task_statements.html',
                controller: 'TaskStatementsCtrl',
                dialogFade: true,
                backdropFade: true,
                keyboard: true,
                backdrop: true,
                backdropClick: true,
                resolve: {
                    task: function() {
                        return $q.when($scope.master);
                    },
                },
            }).open();
        };

        $scope.manageAttachments = function() {
            $dialog.dialog({
                templateUrl: 'partials/task_attachments.html',
                controller: 'TaskAttachmentsCtrl',
                dialogFade: true,
                backdropFade: true,
                keyboard: true,
                backdrop: true,
                backdropClick: true,
                resolve: {
                    task: function() {
                        return $q.when($scope.master);
                    },
                },
            }).open();
        };

    }])
    .controller('TaskStatementsCtrl', ['$scope', 'dataStore', 'fileManager', 'notificationHub', 'dialog', 'task', function ($scope, store, fileManager, notificationHub, dialog, task) {

        $scope.close = function() {
            dialog.close();
        };

        $scope.load = function() {
            store.get_collection("Statement", {task: task._ref}).then(function(statements) {
                $scope.statements = statements;
                $scope.statement_list = [];
                angular.forEach(statements, function(value) {
                    $scope.statement_list.push(value);
                });
            });
        };
        $scope.load();

        $scope.download = function(statement) {
            fileManager.download(task.name + " (" + statement.language + ").pdf", "application/pdf", statement.digest);
        };

        $scope.delete = function(statement) {
            store.delete("Statement", statement._ref).then(function() {
                $scope.load();
            });
        };

        $scope.create = function() {
            // XXX We have also access to the fileblob's filename, size and last modification date.
            fileManager.upload("XXX", $scope.new_fileblob.type, $scope.new_fileblob, function() {}, function(digest) {
                var statement = {};
                statement.language = $scope.new_language;
                statement.digest = digest;
                statement.task = task._ref;
                store.create("Statement", statement).then(function (ref, obj) {
                    $scope.new_language = null;
                    $scope.new_fileblob = null;
                    $scope.load();
                });
            });
        };

    }])
    .controller('TaskAttachmentsCtrl', ['$scope', 'dataStore', 'fileManager', 'notificationHub', 'dialog', 'task', function ($scope, store, fileManager, notificationHub, dialog, task) {

        $scope.close = function() {
            dialog.close();
        };

        $scope.load = function() {
            store.get_collection("Attachment", {task: task._ref}).then(function(attachments) {
                $scope.attachments = attachments;
                $scope.attachment_list = [];
                angular.forEach(attachments, function(value) {
                    $scope.attachment_list.push(value);
                });
            });
        };
        $scope.load();

        $scope.download = function(attachment) {
            fileManager.download(attachment.filename, "application/pdf", attachment.digest);
        };

        $scope.delete = function(attachment) {
            store.delete("Attachment", attachment._ref).then(function() {
                $scope.load();
            });
        };

        $scope.create = function() {
            // XXX We have also access to the fileblob's filename, size and last modification date.
            fileManager.upload("XXX", $scope.new_fileblob.type, $scope.new_fileblob, function() {}, function(digest) {
                var attachment = {};
                attachment.filename = $scope.new_filename;
                attachment.digest = digest;
                attachment.task = task._ref;
                store.create("Attachment", attachment).then(function (ref, obj) {
                    $scope.new_filename = null;
                    $scope.new_fileblob = null;
                    $scope.load();
                });
            });
        };

    }]);
