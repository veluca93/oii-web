/* Contest Management System
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

angular.module('pws.l10n', [])
  .filter('l10n', function() {
    var _ = {
      overview: {
        jumbotron: {
          title: {
            en: '',
            it: 'Portale di allenamento delle Olimpiadi Italiane di \
                 Informatica',
          },
          text: {
            en: '',
            it: 'Benvenuto nella piattaforma ufficiale di allenamento \
                 per le OII! Qui avrai accesso a numerosi problemi ai \
                 quali potrai inviare delle soluzioni scritte in C,   \
                 C++ o Pascal.',
          },
        },
        col1: {
          title: {
            en: '',
            it: 'Impara a programmare',
          },
          text: {
            en: '',
            it: 'La vasta scelta di problemi presenti nel sito ti \
                 permette di partire da quelli più facili fino ad \
                 arrivare a quelli più difficili: in questo modo  \
                 migliorerai sempre più le tue abilità di programmazione \
                 e la tua capacità di analizzare ed affrontare problemi \
                 computazionali!',
          },
          button: {
            en: '',
            it: 'Archivio dei problemi',
          },
        },
        col2: {
          title: {
            en: '',
            it: 'Scala la classifica',
          },
          text: {
            en: '',
            it: 'Man mano che risolverai i problemi presenti sulla \
                 piattaforma guadagnerai dei punti che si sommeranno al \
                 tuo punteggio totale. Competi con tutti gli altri \
                 studenti e studentesse d\'Italia per il traguardo del \
                 primo posto della classifica!',
          },
          button: {
            en: '',
            it: 'Visita il forum',
          },
        },
        col3: {
          title: {
            en: '',
            it: 'Partecipa alla community',
          },
          text: {
            en: '',
            it: 'Presentati agli altri aspiranti olimpici nel forum \
                 della piattaforma, discuti dei problemi, risolvi tutti \
                 i tuoi dubbi su: costrutti di base del tuo linguaggio \
                 di programmazione, algoritmi e strutture dati di \
                 libreria, tecniche algoritmiche, e tanto altro!',
          },
          button: {
            en: '',
            it: 'Archivio dei problemi',
          },
        },
      },
      navbar: {
        home: {
          en: 'Homepage',
          it: 'Pagina iniziale',
        },
        archive: {
          title: {
            en: '',
            it: 'Archivio problemi e test',
          },
          allproblems: {
            en: '',
            it: 'Tutti i problemi',
          },
          scolastiche: {
            en: '',
            it: 'Selezioni scolastiche',
          },
        },
        ranking: {
          en: 'Ranking',
          it: 'Classifica',
        },
        forum: {
          en: 'Forum',
        },
        signup: {
          en: 'Sign up',
          it: 'Registrati',
        },
        signin: {
          en: 'Sign in',
          it: 'Entra',
        },
        signout: {
          en: 'Sign out',
          it: 'Esci',
        },
        myprofile: {
          en: '',
          it: 'Il mio profilo utente',
        },
      },
      signup: {
        ui: {
          loginData: {
            title: {
              en: 'Login data',
              it: 'Dati di accesso al sito',
            },
            username: {
              en: 'Username',
            },
            password: {
              en: 'Password',
            },
            password2: {
              en: 'Confirm password',
              it: 'Ripeti password',
            },
          },
          personalData: {
            title: {
              en: 'Personal data',
              it: 'Dati personali',
            },
            firstname: {
              en: 'First name',
              it: 'Nome',
            },
            lastname: {
              en: 'Last name',
              it: 'Cognome',
            },
            email: {
              en: 'E-mail address',
              it: 'Indirizzo e-mail',
            },
            email2: {
              en: 'Confirm e-mail',
              it: 'Ripeti e-mail',
            },
          },
          instituteData: {
            title: {
              en: 'Institute data',
              it: 'Dati della scuola di provenienza',
            },
            region: {
              en: 'Region',
              it: 'Regione',
            },
            province: {
              en: 'Province',
              it: 'Provincia',
            },
            city: {
              en: 'City',
              it: 'Città',
            },
            institute: {
              en: 'Institute',
              it: 'Istituto',
            },
          },
          userPreview: {
            title: {
              en: 'User profile preview',
              it: 'Anteprima del profilo utente',
            },
          },
          buttons: {
            register: {
              en: 'Sign up',
              it: 'Registrati',
            },
          },
        },
        errors: {
          username: {
            short: {
              en: 'Username is too short',
              it: 'Username troppo corto',
            },
            invalid: {
              en: 'Username is invalid',
              it: 'Username non valido',
            },
            used: {
              en: 'This username is not available',
              it: 'Questo username non è disponibile',
            },
          },
          password: {
            en: 'Password\'s too short',
            it: 'Password troppo corta',
          },
          password2: {
            en: 'Passwords don\'t match',
            it: 'Le password non combaciano',
          },
          email: {
            invalid: {
              en: '',
              it: 'E-mail non valida',
            },
            used: {
              en: '',
              it: 'E-mail già utilizzata',
            },
            match: {
              en: '',
              it: 'Gli indirizzi non combaciano',
            }
          },
          region: {
            en: '',
            it: 'Devi specificare una regione',
          },
          province: {
            en: '',
            it: 'Devi specificare una provincia',
          },
          city: {
            en: '',
            it: 'Devi specificare una città',
          },
          institute: {
            en: '',
            it: 'Devi specificare un istituto',
          },
        },
        asd: {
          en: 'dsa!!',
          it: 'dsa!!!',
        },
      },
    };
    return function(input) {
      if (input === undefined)
        return input;
      var x = input.split('.');
      var ret = _;
      for (var i in x)
        ret = ret[x[i]];
      if (ret.hasOwnProperty('it'))
        return ret['it'];
      else
        return ret['en'];
    };
  });
