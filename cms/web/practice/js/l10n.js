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
  .constant('words', {
    overview: {
      jumbotron: {
        title: {
          en: 'Italian Olympiads in Informatics training website',
          it: 'Portale di allenamento delle Olimpiadi Italiane di \
               Informatica',
        },
        text: {
          en: 'Welcome to the official training website for OII! \
               here you will be able to try and solve programming \
               tasks by coding a solution in either C, C++ or Pascal.',
          it: 'Benvenuto nella piattaforma ufficiale di allenamento \
               per le OII! Qui avrai accesso a numerosi problemi ai \
               quali potrai inviare delle soluzioni scritte in C, \
               C++ o Pascal.',
        },
      },
      col1: {
        title: {
          en: 'Learn to code',
          it: 'Impara a programmare',
        },
        text: {
          en: '',
          it: 'La vasta scelta di problemi presenti nel sito ti \
               permette di partire da quelli più facili fino ad \
               arrivare a quelli più difficili: in questo modo \
               migliorerai sempre più le tue abilità di programmazione \
               e la tua capacità di analizzare ed affrontare problemi \
               computazionali!',
        },
        button: {
          en: 'Tasks archive',
          it: 'Archivio dei problemi',
        },
      },
      col2: {
        title: {
          en: 'Advance your ranking',
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
          en: 'See the rankings',
          it: 'Guarda la classifica',
        },
      },
      col3: {
        title: {
          en: 'Get to know other coders',
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
          en: 'Go to the forum',
          it: 'Visita il forum',
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
          en: 'Task & quiz archive',
          it: 'Archivio problemi e quiz',
        },
        allproblems: {
          en: 'All tasks',
          it: 'Tutti i problemi',
        },
        scolastiche: {
          en: 'Quizzes',
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
        en: 'My user profile',
        it: 'Il mio profilo utente',
      },
    },
    tasks: {
      tagsearch: {
        en: 'search',
        it: 'cerca',
      },
      searchbytag: {
        en: 'Search by tag',
        it: 'Ricerca per tag',
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
        mustPassword: {
          en: 'You must specify your password',
          it: 'Devi speficicare la tua password',
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
            en: 'Invalid e-mail',
            it: 'E-mail non valida',
          },
          used: {
            en: 'E-mail already used',
            it: 'E-mail già utilizzata',
          },
          match: {
            en: 'E-mails don\'t match',
            it: 'Gli indirizzi non combaciano',
          }
        },
        region: {
          en: 'You must specify a region',
          it: 'Devi specificare una regione',
        },
        province: {
          en: 'You must specify a province',
          it: 'Devi specificare una provincia',
        },
        city: {
          en: 'You must specify a city',
          it: 'Devi specificare una città',
        },
        institute: {
          en: 'You must specify an institute',
          it: 'Devi specificare un istituto',
        },
      },
    },
    forum: {
      breadcrumb: {
        forum: {
          en: 'Forum',
        },
      },
      list: {
        forums: {
          en: 'Forums',
          it: 'Forum',
        },
        topics: {
          full: {
            en: 'Topics',
            it: 'Argomenti',
          },
          abbr: {
            en: 'Top.',
            it: 'Arg.',
          },
        },
        posts: {
          en: 'Posts',
          it: 'Messaggi',
        },
        lastPost: {
          en: 'Last post',
          it: 'Ultimo messaggio',
        },
        by: {
          en: 'by',
          it: 'di',
        },
        noPosts: {
          en: 'No posts',
          it: 'Non ci sono messaggi',
        },
      },
      view: {
        createTopic: {
          en: 'Create new topic',
          it: 'Crea un nuovo argomento',
        },
        createPost: {
          en: 'Post to this topic',
          it: 'Scrivi una risposta',
        },
        answers: {
          full: {
            en: 'Answers',
            it: 'Risposte',
          },
          abbr: {
            en: 'Answ.',
            it: 'Risp.',
          },
        },
        clicks: {
          en: 'Clicks',
          it: 'Visite',
        },
        posts: {
          en: 'posts',
          it: 'messaggi',
        },
        score: {
          en: 'User\'s score',
          it: 'Punteggio dell\'utente',
        },
        signedUp: {
          en: 'signed up',
          it: 'iscrizione',
        },
        getPermalink: {
          en: 'Get permalink',
          it: 'Ottieni link permanente',
        },
        quote: {
          en: 'quote',
          it: 'cita',
        },
        edit: {
          en: 'edit',
          it: 'modifica',
        },
        delete: {
          en: 'delete',
          it: 'elimina',
        },
        confirmDelete: {
          en: 'Are you sure you want to delete this post?',
          it: 'Sei sicuro di voler eliminare questo post?',
        },
        lastAnswer: {
          en: 'Last answer',
          it: 'Ultima risposta',
        },
        noAnswers: {
          en: 'No answers',
          it: 'Non ci sono risposte',
        },
        goToPost: {
          en: 'Go to post',
          it: 'Vai al messaggio',
        },
      },
      newTopic: {
        title: {
          en: 'New topic',
          it: 'Nuovo argomento',
        },
        close: {
          en: 'Close',
          it: 'Chiudi',
        },
        enterTitle: {
          en: 'Enter topic title...',
          it: 'Scrivi un titolo...',
        },
        enterContent: {
          en: 'Enter topic content...',
          it: 'Scrivi il testo dell\'argomento...',
        },
        submit: {
          en: 'Submit',
          it: 'Invia',
        },
      },
      newPost: {
        title: {
          en: 'New post',
          it: 'Nuova risposta',
        },
        enterPost: {
          en: 'Write your answer...',
          it: 'Scrivi una risposta...',
        },
      },
      editPost: {
        title: {
          en: 'Edit this post',
          it: 'Modifica questa risposta',
        },
        submit: {
          en: 'Apply',
          it: 'Applica',
        },
      },
    },
    user: {
      bar: {
        profile: {
          en: 'Profile',
          it: 'Profilo',
        },
        edit: {
          en: 'Edit your data',
          it: 'Modifica i tuoi dati',
        },
      },
      profile: {
        //
      },
      edit: {
        oldPassword: {
          en: 'Old password',
          it: 'Vecchia password',
        },
        newPassword: {
          en: 'New password',
          it: 'Nuova password',
        },
        confirmPassword: {
          en: 'Confirm new password',
          it: 'Ripeti nuova password',
        },
        newEmail: {
          en: 'New e-mail',
          it: 'Nuovo indirizzo email',
        },
        changed: {
          en: 'Changes recorded',
          it: 'Modifiche registrate',
        },
        unchanged: {
          en: 'No changes recorded',
          it: 'Nessuna modifica registrata',
        },
        wrong: {
          en: 'Wrong password',
          it: 'Password errata',
        },
        submit: {
          en: 'Update',
          it: 'Aggiorna',
        },
      },
    },
  })
  .factory('l10n', function(words) {
    return {
      get: function(input) {
        if (input === undefined)
          return input;
        var x = input.split('.');
        var ret = words;
        for (var i in x)
          ret = ret[x[i]];
        if (ret.hasOwnProperty('it'))
          return ret['it'];
        else
          return ret['en'];
      },
    };
  })
  .filter('l10n', function(l10n) {
    return l10n.get;
  });
