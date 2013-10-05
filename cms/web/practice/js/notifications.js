/* Contest Management System
 * Copyright © 2013 Luca Wehrstedt <luca.wehrstedt@gmail.com>
 * Copyright © 2013 William Di Luigi <williamdiluigi@gmail.com>
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

angular.module('pws.notifications', [])
  .factory('notificationHub', [function() {
    var handlers = new Array();
    return {
      register_handler: function(callback) {
        handlers.push(callback);
      },
      notify_oneshot: function(type, msg) {
        angular.forEach(handlers, function(item) {
          item.call(this, type, msg);
        });
      },
    };
  }])
  .directive('notifications', [function() {
    return {
      restrict: 'E',
      templateUrl: 'partials/notifications.html',
      controller: 'NotificationsCtrl',
    };
  }])
  .controller('NotificationsCtrl', ['$scope', 'notificationHub', function($scope, hub) {
    $scope.alerts = [];
    $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
    };
    hub.register_handler(function(type, msg) {
      $scope.alerts.push({'msg': msg, 'type': type});
    });
  }]);
