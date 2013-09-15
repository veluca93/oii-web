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

/* Filters */

angular.module('aws.filters', []).
    filter('interpolate', ['version', function(version) {
        return function(text) {
            return String(text).replace(/\%VERSION\%/mg, version);
        }
    }]).
    filter('booleanYesNo', [function() {
        return function(value) {
            if (value === true) {
                return "Yes";
            } else if (value === false) {
                return "No";
            } else {
                return value;
            }
        };
    }]).
    filter('booleanTrueFalse', [function() {
        return function(value) {
            if (value === true) {
                return "True";
            } else if (value === false) {
                return "False";
            } else {
                return value;
            }
        };
    }]).
    filter('nullNotAvailable', [function() {
        return function(value) {
            if (value === null) {
                return "N/A";
            } else {
                return value;
            }
        };
    }]).
    filter('undefinedNotAvailable', [function() {
        return function(value) {
            if (angular.isUndefined(value)) {
                return "N/A";
            } else {
                return value;
            }
        };
    }]).
    filter('emptyNotAvailable', [function() {
        return function(value) {
            if (value === "") {
                return "N/A";
            } else {
                return value;
            }
        };
    }]).
    filter('booleanClass', [function() {
        return function(value, class1, class2) {
            if (value === true) {
                return class1 || "";
            } else if (value === false) {
                return class2 || "";
            } else {
                return value;
            }
        };
    }]);
