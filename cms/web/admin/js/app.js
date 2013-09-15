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


// Declare app level module which depends on filters, and services
angular.module('aws', ['aws.filters', 'aws.directives', 'aws.controllers', 'aws.navigation', 'aws.parameter_types', 'aws.notifications', 'aws.files', 'aws.data', 'aws.contest', 'aws.task', 'aws.user', 'aws.ranking', 'aws.submission', 'aws.rpc', 'aws.overview', 'aws.communication', 'ui.bootstrap', 'aws.dataset']).
  config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
    $locationProvider.html5Mode(false);
    $locationProvider.hashPrefix('!');

    $routeProvider.when('/overview', {templateUrl: 'views/overview.html', controller: 'OverviewCtrl'});
    $routeProvider.when('/resources', {templateUrl: 'views/resources.html', controller: 'ResourcesCtrl'});
    $routeProvider.when('/contests/create', {templateUrl: 'views/contest.html', controller: 'ContestCreateCtrl'});
    $routeProvider.when('/contests/', {templateUrl: 'views/contest_list.html', controller: 'ContestListCtrl'});
    $routeProvider.when('/contests/:contestId', {templateUrl: 'views/contest.html', controller: 'ContestCtrl'});
    $routeProvider.when('/contests/:contestId/ranking', {templateUrl: 'views/ranking.html', controller: 'RankingCtrl'});
    $routeProvider.when('/contests/:contestId/users', {templateUrl: 'views/user_list.html', controller: 'UserListCtrl'});
    $routeProvider.when('/contests/:contestId/tasks', {templateUrl: 'views/task_list.html', controller: 'TaskListCtrl'});
    $routeProvider.when('/contests/:contestId/announcements', {templateUrl: 'views/announcement_list.html', controller: 'AnnouncementListCtrl'});
    $routeProvider.when('/contests/:contestId/messages', {templateUrl: 'views/message_list.html', controller: 'MessageListCtrl'});
    $routeProvider.when('/contests/:contestId/questions', {templateUrl: 'views/question_list.html', controller: 'QuestionListCtrl'});
    $routeProvider.when('/users/:userId', {templateUrl: 'views/user.html', controller: 'UserCtrl'});
    $routeProvider.when('/tasks/:taskId', {templateUrl: 'views/task.html', controller: 'TaskCtrl'});
    $routeProvider.when('/tasks/:taskId/datasets', {templateUrl: 'views/dataset_list.html', controller: 'DatasetListCtrl'});
    $routeProvider.when('/datasets/:datasetId', {templateUrl: 'views/dataset.html', controller: 'DatasetCtrl'});
    $routeProvider.when('/datasets/:datasetId/activate', {templateUrl: 'views/dataset_activate.html', controller: 'DatasetActivateCtrl'});
    $routeProvider.when('/submissions/', {templateUrl: 'views/submission_list.html', controller: 'SubmissionListCtrl'});
    $routeProvider.otherwise({redirectTo: '/overview'});
  }]);

