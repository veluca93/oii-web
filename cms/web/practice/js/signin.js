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

/* Signin page */

angular.module('pws.signin', [])
  .controller('SigninCtrl', ['$scope', '$window', '$http', 'notificationHub', function ($scope, $window, $http, hub) {
    $scope.user = {'username': '', 'password': ''};
    $scope.$window = $window;
    $scope.submit = function() {
        $http.post('login', $scope.user)
        .success(function(data, status, headers, config) {
          if (data.success == 1) {
            hub.notify_oneshot('success', 'Signed in');
            window.token = data.token;
          }
          else if(data.success == 0){
            hub.notify_oneshot('danger', 'Sign in error');
          }
        }).error(function(data, status, headers, config) {
          hub.notify_oneshot('danger', 'Errore interno ' +
            'in fase di login: assicurati che la tua connessione a internet sia ' +
            'funzionante e, se l\'errore dovesse ripetersi, contatta un amministratore.');
        });
    };
  }]);
