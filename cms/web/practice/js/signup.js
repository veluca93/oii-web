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
    .controller('SignupCtrl', ['$scope', function ($scope) {
        $scope.fieldsets = [
            {description: "Dati di accesso al sito", fields: [
                {req: true, id: "username",  type: "text",     label: "Username"},
                {req: true, id: "password",  type: "password", label: "Password"},
                {req: true, id: "password2", type: "password", label: "Ripeti password"},
            ]},
            {description: "Dati personali", fields: [
                {req: true, id: "firstname", type: "text",  label: "Nome"},
                {req: true, id: "lastname",  type: "text",  label: "Cognome"},
                {req: true, id: "email",     type: "email", label: "Indirizzo email"},
                {req: true, id: "email2",    type: "email", label: "Ripeti indirizzo email"},
            ]},
        ];
        $scope.submit = function() {
            $scope.fieldsets[1].fields[1].model = "Ciao";
        };
    }]);
