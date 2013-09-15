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

/* Directives */


angular.module('aws.communication', [])
    .directive('announcement', ['dataStore', function (store) {
        var directiveDefinitionObject = {
            restrict: 'E',
            scope: {
                announcement: "=data",
            },
            templateUrl: 'partials/announcement.html',
            replace: true,
            controller: ['$scope', '$element', '$attrs', '$transclude', function($scope, $element, $attrs, $transclude) {

                $scope.remove = function() {
                    store.delete("Announcement", $scope.announcement._ref).then(function() {
                        // FIXME Ugly?
                        $scope.$parent.load();
                    });
                };

            }],
        };
        return directiveDefinitionObject;
    }])
    .controller('AnnouncementListCtrl', ['$scope', '$routeParams', '$q', '$dialog', 'dataStore', 'navService', function($scope, $routeParams, $q, $dialog, store, nav) {

        nav.set_active($routeParams.contestId);

        store.get("Contest", $routeParams.contestId).then(function(contest) {
            $scope.contest = contest;
        });

        $scope.load = function() {
            store.get_collection("Announcement", {contest: $routeParams.contestId}).then(function(announcements) {
                $scope.announcements = announcements;
                $scope.announcement_list = [];
                angular.forEach($scope.announcements, function(announcement) {
                    $scope.announcement_list.push(announcement);
                });
            });
        };
        $scope.load();

        $scope.promptCreate = function() {
            $dialog.dialog({
                templateUrl: 'partials/announcement_create.html',
                controller: 'AnnouncementCreateCtrl',
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
            }).open().then(function(result) {
                if (result == "done") {
                    $scope.load();
                }
            });
        };

    }])
    .controller('AnnouncementCreateCtrl', ['$scope', 'dialog', 'dataStore', 'contest', function($scope, dialog, store, contest) {

        $scope.subject = "";
        $scope.text = "";

        $scope.close = function() {
            dialog.close();
        };

        $scope.create = function() {
            var obj = {contest: contest._ref, timestamp: (new Date()).getTime() / 1000, subject: $scope.subject, text: $scope.text};
            store.create("Announcement", obj).then(function(ref, obj) {
                dialog.close("done");
            });
        };

    }])
    .directive('message', ['dataStore', function (store) {
        var directiveDefinitionObject = {
            restrict: 'E',
            scope: {
                message: "=data",
                users: "=users",
            },
            templateUrl: 'partials/message.html',
            replace: true,
            controller: ['$scope', '$element', '$attrs', '$transclude', function($scope, $element, $attrs, $transclude) {

                $scope.remove = function() {
                    store.delete("Message", $scope.message._ref).then(function() {
                        // FIXME Ugly?
                        $scope.$parent.load();
                    });
                };

            }],
        };
        return directiveDefinitionObject;
    }])
    .controller('MessageListCtrl', ['$scope', '$routeParams', '$q', '$dialog', 'dataStore', 'navService', function($scope, $routeParams, $q, $dialog, store, nav) {

        nav.set_active($routeParams.contestId);

        store.get("Contest", $routeParams.contestId).then(function(contest) {
            $scope.contest = contest;
        });

        $scope.load = function() {
            store.get_collection("User", {contest: $routeParams.contestId}).then(function(users) {
                $scope.users = users;
                $scope.messages = {};
                var promises = [];
                angular.forEach(users, function(user, ref) {
                    $scope.users[ref] = user;
                    promises.push(store.get_collection("Message", {user: user._ref}).then(function(messages) {
                        angular.forEach(messages, function(message, ref) {
                            $scope.messages[ref] = message;
                        });
                    }));
                });
                $q.all(promises).then(function() {
                    $scope.message_list = [];
                    angular.forEach($scope.messages, function(message) {
                        $scope.message_list.push(message);
                    });
                });
            });
        };
        $scope.load();

        $scope.promptCreate = function() {
            $dialog.dialog({
                templateUrl: 'partials/message_create.html',
                controller: 'MessageCreateCtrl',
                dialogFade: true,
                backdropFade: true,
                keyboard: true,
                backdrop: true,
                backdropClick: true,
                resolve: {
                    users: function() {
                        return $q.when($scope.users);
                    },
                },
            }).open().then(function(result) {
                if (result == "done") {
                    $scope.load();
                }
            });
        };

    }])
    .controller('MessageCreateCtrl', ['$scope', '$filter', 'dialog', 'dataStore', 'users', function($scope, $filter, dialog, store, users) {

        $scope.subject = "";
        $scope.text = "";

        $scope.close = function() {
            dialog.close();
        };

        $scope.user_list = [];
        angular.forEach(users, function(value) {
            $scope.user_list.push(value);
        });
        $scope.user_list = $filter('orderBy')($scope.user_list, 'username');

        $scope.create = function() {
            var obj = {user: $scope.user, timestamp: (new Date()).getTime() / 1000, subject: $scope.subject, text: $scope.text};
            store.create("Message", obj).then(function(ref, obj) {
                dialog.close("done");
            });
        };

    }])
    .directive('question', ['dataStore', function (store) {
        var directiveDefinitionObject = {
            restrict: 'E',
            scope: {
                question: "=data",
                users: "=users",
            },
            templateUrl: 'partials/question.html',
            replace: true,
            controller: ['$scope', '$element', '$attrs', '$transclude', function($scope, $element, $attrs, $transclude) {

                $scope.isIgnored = function() {
                    return $scope.question.ignored;
                };

                $scope.isAnswered = function() {
                    return $scope.question.reply_timestamp !== null;
                };

                $scope.answering = false;

                $scope.startAnswering = function() {
                    $scope.answering = true;
                    $scope.reply_subject = $scope.question.reply_subject || "";
                    $scope.reply_text = $scope.question.reply_text || "";
                };

                $scope.answer = function(subject, text) {
                    var obj = angular.copy($scope.question);
                    obj.reply_timestamp = (new Date()).getTime() / 1000;
                    obj.reply_subject = subject;
                    obj.reply_text = text;
                    store.update("Question", $scope.question._ref, obj).then(function(obj) {
                        angular.copy(obj, $scope.question);
                        $scope.answering = false;
                    });
                };

                $scope.ignore = function() {
                    var obj = angular.copy($scope.question);
                    obj.ignored = true;
                    store.update("Question", $scope.question._ref, obj).then(function(obj) {
                        angular.copy(obj, $scope.question);
                    });
                };

                $scope.unignore = function() {
                    var obj = angular.copy($scope.question);
                    obj.ignored = false;
                    store.update("Question", $scope.question._ref, obj).then(function(obj) {
                        angular.copy(obj, $scope.question);
                    });
                };

            }],
        };
        return directiveDefinitionObject;
    }])
    .controller('QuestionListCtrl', ['$scope', '$routeParams', '$q', 'dataStore', 'navService', function($scope, $routeParams, $q, store, nav) {

        nav.set_active($routeParams.contestId);

        store.get("Contest", $routeParams.contestId).then(function(contest) {
            $scope.contest = contest;
        });

        $scope.load = function() {
            store.get_collection("User", {contest: $routeParams.contestId}).then(function(users) {
                $scope.users = users;
                $scope.questions = {};
                var promises = [];
                angular.forEach(users, function(user, ref) {
                    $scope.users[ref] = user;
                    promises.push(store.get_collection("Question", {user: user._ref}).then(function(questions) {
                        angular.forEach(questions, function(question, ref) {
                            $scope.questions[ref] = question;
                        });
                    }));
                });
                $q.all(promises).then(function() {
                    $scope.question_list = [];
                    angular.forEach($scope.questions, function(question) {
                        $scope.question_list.push(question);
                    });
                });
            });
        };
        $scope.load();

    }])
    .factory('questionWatcher', ['dataStore', 'navService', function(store, nav) {
        var self = {};

        self._count = function() {
            store.get_collection("Contest", {}).then(function(contests) {
                var unread_count = {};
                angular.forEach(contests, function(value, key) {
                    unread_count[key] = 0;
                });
                store.get_collection("User", {}).then(function(users) {
                    store.get_collection("Question", {}).then(function(questions) {
                        angular.forEach(questions, function(value, key) {
                            if (value.reply_timestamp === null && !value.ignored) {
                                unread_count[users[value.user].contest] += 1;
                            }
                        });
                        angular.forEach(unread_count, function(value, key) {
                            nav.set_unread(key, value);
                        });
                    });
                });
            });
        };
        //self._count();

        store._reinit_listeners.push(function() {
            self._count();
        });

        store._action_listeners.push(function(action, cls, ref) {
            if (cls == "Contest" || cls == "User" || cls == "Question") {
                self._count();
            }
        });

        return self;
    }]);
