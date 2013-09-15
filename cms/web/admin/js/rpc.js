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

angular.module('aws.rpc', []).factory('rpcRequest', ['$http', '$q', function($http, $q) {
    var self = {};

    self.request = function(service, shard, method, args) {
        var deferred = $q.defer();

        $http.post('rpc/' + service + '/' + shard + '/' + method, args).
            success(function(data) {
                if (data.error != null) {
                    deferred.reject(data.error);
                } else {
                    deferred.resolve(data.data);
                }
            }).
            error(function(data, status) {
                // TODO Append original reason.
                if (status == 400) {
                    deferred.reject("Status 400 (invalid JSON?)");
                } else if (status == 404) {
                    deferred.reject("Status 404 (service doesn't exist?)");
                } else if (status == 406) {
                    deferred.reject("Status 406 (we didn't accept JSON?");
                } else if (status == 415) {
                    deferred.reject("Status 415 (we didn't produce JSON?)");
                } else if (status == 503) {
                    deferred.reject("Status 503 (service not connected?)");
                } else {
                    deferred.reject("General error.");
                }
            });

        return deferred.promise;
    };

    return self;
}]);
