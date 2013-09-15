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

angular.module('aws.files', [])
    .factory('fileManager', [function() {
        var iframe = angular.element(document.getElementById("fileDownload"));

        var service = {
            upload: function(filename, mimetype, blob, progressHandler, successHandler) {
                var xhr = new XMLHttpRequest();
                xhr.open('POST', 'files/', true);

                xhr.onload = function(e) {
                    //$scope.$apply(function() {
                        successHandler(xhr.getResponseHeader("Location").split('/').pop());
                    //});
                };

                xhr.upload.onprogress = function(e) {
                    if (e.lengthComputable) {
                        //$scope.$apply(function() {
                            progressHandler(e.loaded, e.total);
                        //});
                    }
                };

                xhr.send(blob);
            },

            download: function(filename, mimetype, digest) {
                iframe.attr("src", "files/" + digest + "?filename=" + encodeURIComponent(filename) + "&mimetype=" + encodeURIComponent(mimetype));
            },
        };
        return service;
    }]);
