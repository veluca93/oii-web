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


angular.module('aws.directives', [])
    .directive('ngDatetime', [function () {
        var directiveDefinitionObject = {
            require: 'ngModel',
            link: function(scope, elem, attr, ctrl) {
                var format = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:.\d{1,6})?Z$/;

                ctrl.$parsers.push(function(viewValue) {
                    if (viewValue === "") {
                        ctrl.$setValidity('datetime', true);
                        return null;
                    }

                    if (!format.test(viewValue)) {
                        ctrl.$setValidity('datetime', false);
                        return undefined;
                    }

                    var value = (new Date(viewValue)).getTime() / 1000;

                    if (value == NaN) {
                        ctrl.$setValidity('datetime', false);
                        return undefined;
                    }

                    ctrl.$setValidity('datetime', true);
                    return value;
                });

                ctrl.$formatters.push(function(value) {
                    if (value === null || value === undefined) {
                        ctrl.$setValidity('datetime', true);
                        return "";
                    }

                    if (angular.isNumber(value)) {
                        ctrl.$setValidity('datetime', true);
                        return (new Date(value * 1000)).toISOString();
                    }

                    ctrl.$setValidity('datetime', false);
                    return "";
                });
            },
        };
        return directiveDefinitionObject;
    }])
    .directive('file', function() {
        var directiveDefinitionObject = {
            restrict: 'E',
            template: '<input type="file" />',
            replace: true,
            require: 'ngModel',
            link: function(scope, elem, attr, ctrl) {
                var listener = function() {
                    scope.$apply(function() {
                        attr.multiple ? ctrl.$setViewValue(elem[0].files) : ctrl.$setViewValue(elem[0].files[0]);
                    });
                }
                elem.bind('change', listener);

                ctrl.$render = function() {
                    elem[0].files = ctrl.$viewValue;
                };
            },
        };
        return directiveDefinitionObject;
    });
