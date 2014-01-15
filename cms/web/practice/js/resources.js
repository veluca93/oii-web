/* Contest Management System
 * Copyright © 2013 Luca Wehrstedt <luca.wehrstedt@gmail.com>
 * Copyright © 2013 Luca Versari <veluca93@gmail.com>
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

/* Resources page */

angular.module('pws.resources', [])
  .controller('ResourcesCtrl', function($scope, navbarManager) {
    navbarManager.setActiveTab(0);
  })
  .controller('VideoPas', function($scope, $sce, navbarManager) {
    navbarManager.setActiveTab(0);
    $scope.videolezioni = [
      {
        title: 'Introduzione all\'ambiente di programmazione Web e scrittura del primo programma in Pascal',
        youtube: 'DYy2IbteC2U',
        files: ['lez1.pas']
      },
      {
        title: 'Utilizzo di variabili',
        youtube: 'YZKX5n3Qz-g',
        files: ['somma.pas']
      },
      {
        title: 'Generazione di numeri casuali',
        youtube: '2-xkcCs7-3M',
        files: ['dado.pas']
      },
      {
        title: 'Introduzione alle istruzioni di controllo condizionate',
        youtube: 'S9RjxdKbWF0',
        files: ['moneta.pas']
      },
      {
        title: 'Introduzione ai cicli definiti',
        youtube: 'wxf2tOPLZxo',
        files: []
      },
      {
        title: 'Cicli a conteggio',
        youtube: 'xCpl-Er4gEU',
        files: ['stream_di_int.pas']
      },
      {
        title: 'Introduzione ai vettori di variabili (array)',
        youtube: 'O4PNXMLpiBE',
        files: []
      },
      {
        title: 'Esercitazione sull\'uso di vettori di variabili',
        youtube: '41nWMbLKmAE',
        files: ['verifyCoin.pas']
      },
    ];
    for (var i in $scope.videolezioni) {
      $scope.videolezioni[i].youtube = $sce.trustAsResourceUrl('//www.youtube.com/embed/' + $scope.videolezioni[i].youtube);
      for (var j in $scope.videolezioni[i].files) {
        $scope.videolezioni[i].files[j] = {'title': $scope.videolezioni[i].files[j]};
        $scope.videolezioni[i].files[j].url = $sce.trustAsUrl('resources/' + $scope.videolezioni[i].files[j].title);
      }
    }
  });
