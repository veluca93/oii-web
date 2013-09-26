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

/* Signup page */

angular.module('pws.signup', [])
  .controller('SignupCtrl', ['$scope', '$http', '$location', 'notificationHub', function ($scope, $http, $location, hub) {
    $scope.isBad = {'username': true, 'email': true, 'password': true, 'password2': true, 'email2': true};
    $scope.user = {'username': '', 'email': '', 'email2': '', 'password': '', 'password2': ''};
    $scope.errorMsg = {'password': 'Password troppo corta', 'password2': 'Non combacia', 'email2': 'Non combacia'};
    $scope.submit = function() {
      $scope.checkUsername();
      $scope.checkEmail();
      $scope.checkPassword();
      if ($scope.isBad['username']) {
        $scope.signupform.username.$dirty = true;
        $("#username").focus(); return;
      } else if ($scope.isBad['password']) {
        $scope.signupform.password.$dirty = true;
        $("#password").focus(); return;
      } else if ($scope.isBad['password2']) {
        $scope.signupform.password2.$dirty = true;
        $("#password2").focus(); return;
      } else if ($scope.isBad['email']) {
        $scope.signupform.email.$dirty = true;
        $("#email").focus(); return;
      } else if ($scope.isBad['email2']) {
        $scope.signupform.email2.$dirty = true;
        $("#email2").focus(); return;
      }
      $http.post('register', $scope.user)
        .success(function(data, status, headers, config) {
          if (data.success == 1) {
            hub.notify_oneshot('success', 'Complimenti, ' +
              'la registrazione è andata a buon fine, adesso puoi accedere con le credenziali ' +
              'del tuo nuovo account usando il modulo in alto a destra. Una volta entrato ' +
              'nel sistema avrai la possibilità di sottoporre le soluzioni ai task presenti ' +
              'in questa pagina. Buon allenamento.');
            $location.path("tasks");
          }
        }).error(function(data, status, headers, config) {
          hub.notify_oneshot('danger', 'Errore interno ' +
            'in fase di registrazione: assicurati che la tua connessione a internet sia ' +
            'funzionante e, se l\'errore dovesse ripetersi, contatta un amministratore.');
        });
    };
    $scope.askServer = function(type, value) {
      $http.post('check', {'type': type, 'value': value})
        .success(function(data, status, headers, config) {
          console.log(data);
          $scope.isBad[type] = (data.success == 0);
          $scope.errorMsg[type] = data.error;
        }).error(function(data, status, headers, config) {
          console.log('dati non ricevuti');
        });
    };
    $scope.checkUsername = function() {
      $scope.askServer('username', $scope.user.username);
    };
    $scope.checkEmail = function() {
      $scope.askServer('email', $scope.user.email);
    };
    $scope.checkPassword = function() {
      $scope.isBad['password'] = ($scope.user.password.length < 5);
    };
    $scope.matchPassword = function() {
      $scope.isBad['password2'] = ($scope.user.password !== $scope.user.password2);
    };
    $scope.matchEmail = function() {
      $scope.isBad['email2'] = ($scope.user.email !== $scope.user.email2);
    };
  }]);
