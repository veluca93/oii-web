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

angular.module('aws.data', []).value('dataModel', {
    // contest
    Contest: {
        tablename: "contests",
        parents: [],
        children: ["announcements", "tasks", "users"],
        relationships: {
            announcements: "Announcement",
            tasks: "Task",
            users: "User",
        },
    },
    Announcement: {
        tablename: "announcements",
        parents: ["contest"],
        children: [],
        relationships: {
            contest: "Contest",
        },
    },
    // user
    User: {
        tablename: "users",
        parents: ["contest"],
        children: ["messages", "questions", "submissions", "user_tests"],
        relationships: {
            contest: "Contest",
            messages: "Message",
            questions: "Question",
            submissions: "Submission",
            user_tests: "UserTest",
        },
    },
    Message: {
        tablename: "messages",
        parents: ["user"],
        children: [],
        relationships: {
            user: "User",
        },
    },
    Question: {
        tablename: "questions",
        parents: ["user"],
        children: [],
        relationships: {
            user: "User",
        },
    },
    // task
    Task: {
        tablename: "tasks",
        parents: ["contest"],
        children: ["attachments", "datasets", "statements", "submission_format", "submissions", "user_tests"],
        relationships: {
            active_dataset: "Dataset",
            attachments: "Attachment",
            contest: "Contest",
            datasets: "Dataset",
            statements: "Statement",
            submission_format: "SubmissionFormatElement",
            submissions: "Submission",
            user_tests: "UserTest",
        },
    },
    Statement: {
        tablename: "statements",
        parents: ["task"],
        children: [],
        relationships: {
            task: "Task",
        },
    },
    Attachment: {
        tablename: "attachments",
        parents: ["task"],
        children: [],
        relationships: {
            task: "Task",
        },
    },
    SubmissionFormatElement: {
        tablename: "submission_format_elements",
        parents: ["task"],
        children: [],
        relationships: {
            task: "Task",
        },
    },
    Dataset: {
        tablename: "datasets",
        parents: ["task"],
        children: ["managers", "testcases"],
        relationships: {
            managers: "Manager",
            task: "Task",
            testcases: "Testcase",
        },
    },
    Manager: {
        tablename: "managers",
        parents: ["dataset"],
        children: [],
        relationships: {
            dataset: "Dataset",
        },
    },
    Testcase: {
        tablename: "testcases",
        parents: ["dataset"],
        children: [],
        relationships: {
            dataset: "Dataset",
        },
    },
    // submission
    Submission: {
        tablename: "submissions",
        parents: ["task", "user"],
        children: ["files", "results", "token"],
        relationships: {
            files: "File",
            results: "SubmissionResult",
            token: "Token",
        },
    },
    File: {
        tablename: "files",
        parents: ["submission"],
        children: [],
        relationships: {
            submission: "Submission",
        },
    },
    Token: {
        tablename: "tokens",
        parents: ["submission"],
        children: [],
        relationships: {
            submission: "Submission",
        },
    },
    SubmissionResult: {
        tablename: "submission_results",
        parents: ["dataset", "submission"],
        children: ["evaluations", "executables"],
        relationships: {
            dataset: "Dataset",
            evaluations: "Evaluation",
            executables: "Executable",
            submission: "Submission",
        },
    },
    Executable: {
        tablename: "executables",
        parents: ["submission_result"],
        children: [],
        relationships: {
            dataset: "Dataset",
            submission: "Submission",
            submission_result: "SubmissionResult",
        },
    },
    Evaluation: {
        tablename: "evaluations",
        parents: ["submission_result", "testcase"],
        children: [],
        relationships: {
            dataset: "Dataset",
            submission: "Submission",
            submission_result: "SubmissionResult",
            testcase: "Testcase",
        },
    },
    // usertest
    UserTest: {
        tablename: "user_tests",
        parents: ["task", "user"],
        children: ["files", "managers", "results"],
        relationships: {
            files: "UserTestFile",
            managers: "UserTestManager",
            results: "UserTestResult",
        },
    },
    UserTestFile: {
        tablename: "user_test_files",
        parents: ["user_test"],
        children: [],
        relationships: {
            submission: "UserTest",
        },
    },
    UserTestManager: {
        tablename: "user_test_managers",
        parents: ["user_test"],
        children: [],
        relationships: {
            submission: "UserTest",
        },
    },
    UserTestResult: {
        tablename: "user_test_results",
        parents: ["dataset", "user_test"],
        children: ["executables"],
        relationships: {
            dataset: "Dataset",
            executables: "UserTestExecutable",
            submission: "Submission",
        },
    },
    UserTestExecutable: {
        tablename: "user_test_executables",
        parents: ["user_test_result"],
        children: [],
        relationships: {
            dataset: "Dataset",
            user_test: "UserTest",
            user_test_result: "UserTestResult",
        },
    },
}).factory('dataStore', ['$http', '$q', '$rootScope', 'dataModel', function($http, $q, $rootScope, model) {
    var self = {};

    //
    // WATCHER
    //

    // The currently active EventSource instance.
    self._event_source = undefined;
    // The ID of the last received event (if any).
    self._last_event_id = null;

    self._reset_es = function() {
        if (angular.isDefined(self._event_source)) {
            self._event_source.close();
            delete self._event_source;
        }

        self._event_source = new EventSource("notify/events"); // XXX last_event_id!

        self._event_source.addEventListener("open", self._open_handler, false);
        self._event_source.addEventListener("error", self._error_handler, false);

        self._event_source.addEventListener("reinit", self._reinit_handler, false);

        self._event_source.addEventListener("message", function (event) {
            self._last_event_id = event.lastEventId;
            var tokens = event.data.split(' ');

            $rootScope.$apply(function() {
                self._on_action(tokens[0], tokens[1], tokens[2]);
            });
        }, false);
    };

    self._open_handler = function () {
        if (self._event_source.readyState == self._event_source.OPEN) {
            console.info("EventSource connected");
            // FIXME Remove (sticky) notification?

            $rootScope.$apply(function() {
                self._reinit();
            });
        } else {
            console.error("EventSource shouldn't be in state " + self._event_source.readyState + " during an 'open' event!");
        }
    };

    self._error_handler = function (e) {
        if (self._event_source.readyState == self._event_source.CONNECTING) {
            console.info("EventSource reconnecting");
            // FIXME Show (sticky?) notification?
        } else if (self._event_source.readyState == self._event_source.CLOSED) {
            console.info("EventSource disconnected");
            // TODO Show one-shot notification!
            // FIXME Provide way to manually reset.
        } else {
            console.error("EventSource shouldn't be in state " + self._event_source.readyState + " during an 'error' event!");
        }
    };

    self._reinit_handler = function () {
        if (self._event_source.readyState == self._event_source.OPEN) {
            console.info("Received a 'reinit' event");
            self._reset_es();
        } else {
            console.error("EventSource shouldn't be in state " + self._event_source.readyState + " during a 'reinit' event!");
        }
    };

    //
    // RETRIEVE
    //

    self.retrieve_query = function(cls) {
        var deferred = $q.defer();

        $http.get('api/' + model[cls].tablename + '/').then(function(response) {
            deferred.resolve(response.data);
        }, function(reason) {
            deferred.reject(reason);
        });

        return deferred.promise;
    }

    self.retrieve = function(cls, ref) {
        var deferred = $q.defer();

        $http.get('api/' + model[cls].tablename + '/' + ref).then(function(response) {
            deferred.resolve(response.data);
        }, function(reason) {
            deferred.reject(reason);
        });

        return deferred.promise;
    };

    self.retrieve_subquery = function(cls, ref, prp) {
        var deferred = $q.defer();

        $http.get('api/' + model[cls].tablename + '/' + ref + '/' + prp).then(function(response) {
            deferred.resolve(response.data);
        }, function(reason) {
            deferred.reject(reason);
        });

        return deferred.promise;
    };

    //
    // STORE
    //

    self._store = undefined;

    // Set to a $q promise when there's some operation that is trying
    // to change the data in the store.
    self._work_pending = undefined;

    self.get = function(cls, ref) {
        var deferred = $q.defer();

        self._work_pending.then(function() {
            //deferred.resolve(angular.copy(self._store[cls][ref]));
            deferred.resolve(self._store[cls][ref]);
        }, function(reason) {
            deferred.reject(reason);
        });

        return deferred.promise;
    };

    self.get_collection = function(cls, filter) {
        var deferred = $q.defer();

        self._work_pending.then(function() {
            var result = {};

            angular.forEach(self._store[cls], function(value, key) {
                var matches = true;
                angular.forEach(filter, function(wanted_value, wanted_prop) {
                    if (value[wanted_prop] != wanted_value) {
                        matches = false;
                    }
                });
                if (matches) {
                    //result[key] = angular.copy(value);
                    result[key] = value;
                }
            });

            deferred.resolve(result);
        }, function(reason) {
            deferred.reject(reason);
        });

        return deferred.promise;
    };

    //
    // INITIALIZATION
    //

    var AUTO_FETCH = [
        "Contest", "Announcement",
        "User", "Message", "Question",
        "Task", "Statement", "Attachment", "SubmissionFormatElement", "Dataset", "Manager", "Testcase"];

    // TODO We probably need a system to "queue" creates, updates and
    // deletes received by the watcher. A reinit should abort all the
    // jobs that are running (i.e. previous reinits or jobs from the
    // queue), clear the queue and then run itself. If too many jobs
    // stall up in the queue, they should all be dropped and a reinit
    // fired instead.

    self._reinit_listeners = [];

    self._reinit = function() {
        self._store = {};

        var deferred = $q.defer();
        self._work_pending = deferred.promise;

        angular.forEach(self._reinit_listeners, function(callback) {
            // XXX $evalAsync?
            callback();
        });

        var promises = [];
        angular.forEach(AUTO_FETCH, function(cls) {
            self._store[cls] = {};
            promises.push(self.retrieve_query(cls).then(function(data) {
                angular.forEach(data, function(item) {
                    self._store[cls][item._ref] = item;
                });
            }));
        });

        $q.all(promises).then(function() {
            deferred.resolve();
        }, function(reason) {
            deferred.reject(reason);
        });
    };

    self._action_listeners = [];

    self._on_action = function(action, cls, ref) {
        // If it's for a class we don't manage, forget it.
        if (AUTO_FETCH.indexOf(cls) == -1) {
            return;
        }

        if (action == "create") {
            console.log("Creating %s/%s", cls, ref);
            self._on_create(cls, ref);
        } else if (action == "update") {
            console.log("Updating %s/%s", cls, ref);
            self._on_update(cls, ref);
        } else if (action == "delete") {
            console.log("Deleting %s/%s", cls, ref);
            self._on_delete(cls, ref);
        } else {
            console.error("Unknown action: " + action);
        }
    };

    self._on_create = function(cls, ref) {
        // If it's already present we probably just created it.
        if (angular.isDefined(self._store[cls][ref])) {
            return;
        }

        var deferred = $q.defer();
        self._work_pending = deferred.promise;

        angular.forEach(self._action_listeners, function(callback) {
            // XXX $evalAsync?
            callback("create", cls, ref);
        });

        self.retrieve(cls, ref).then(function(obj) {
            self._store[cls][ref] = obj;
            deferred.resolve();
        }, function(reason) {
            deferred.reject(reason);
        });
    };

    self._on_update = function(cls, ref) {
        var deferred = $q.defer();
        self._work_pending = deferred.promise;

        angular.forEach(self._action_listeners, function(callback) {
            // XXX $evalAsync?
            callback("update", cls, ref);
        });

        self.retrieve(cls, ref).then(function(obj) {
            self._store[cls][ref] = obj;
            deferred.resolve();
        }, function(reason) {
            deferred.reject(reason);
        });
    };

    self._on_delete = function(cls, ref) {
        var deferred = $q.defer();
        self._work_pending = deferred.promise;

        angular.forEach(self._action_listeners, function(callback) {
            // XXX $evalAsync?
            callback("delete", cls, ref);
        });

        // FIXME May already be deleted (if we triggered it).
        delete self._store[cls][ref];
        deferred.resolve();
    };

    //
    // EDIT
    //

    self.create = function(cls, data) {
        var deferred_f = $q.defer();
        var deferred = $q.defer();
        self._work_pending = deferred.promise;

        $http.post('api/' + model[cls].tablename + '/', data).then(function(response) {
            var ref = response.headers('Location').split('/').pop();

            angular.forEach(self._action_listeners, function(callback) {
                // XXX $evalAsync?
                callback("create", cls, ref);
            });

            $http.get('api/' + model[cls].tablename + '/' + ref).then(function(response) {
                var obj = response.data;
                self._store[cls][ref] = obj;
                deferred.resolve();
                deferred_f.resolve(ref, obj);
            }, function(reason) {
                deferred.reject(reason);
                deferred_f.reject(reason);
            });
        }, function(reason) {
            deferred.reject(reason);
            deferred_f.reject(reason);
        });

        return deferred_f.promise;
    };

    self.update = function(cls, ref, data) {
        // FIXME This will result in a double fetch.
        var deferred_f = $q.defer();
        var deferred = $q.defer();
        self._work_pending = deferred.promise;

        $http.put('api/' + model[cls].tablename + '/' + ref, data).then(function(response) {

            angular.forEach(self._action_listeners, function(callback) {
                // XXX $evalAsync?
                callback("update", cls, ref);
            });

            $http.get('api/' + model[cls].tablename + '/' + ref).then(function(response) {
                var obj = response.data;
                self._store[cls][ref] = obj;
                deferred.resolve();
                deferred_f.resolve(obj);
            }, function(reason) {
                deferred.reject(reason);
                deferred_f.reject(reason);
            });
        }, function(reason) {
            deferred.reject(reason);
            deferred_f.reject(reason);
        });

        return deferred_f.promise;
    };

    self.delete = function(cls, ref) {
        var deferred_f = $q.defer();
        var deferred = $q.defer();
        self._work_pending = deferred.promise;

        $http.delete('api/' + model[cls].tablename + '/' + ref).then(function(response) {

            angular.forEach(self._action_listeners, function(callback) {
                // XXX $evalAsync?
                callback("update", cls, ref);
            });

            delete self._store[cls][ref];
            deferred.resolve();
            deferred_f.resolve();
        }, function(reason) {
            deferred.reject(reason);
            deferred_f.reject(reason);
        });

        return deferred_f.promise;
    };


    // This starts everything!
    self._reset_es();

    return self;
}]);
